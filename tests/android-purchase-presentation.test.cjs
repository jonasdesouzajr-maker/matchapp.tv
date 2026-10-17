const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const pricing=read('pricing.js');
const adapter=pricing.slice(0,pricing.indexOf('function purchaseStyles()'));
const i18n=read('i18n.js');
const dictionaryStart=i18n.indexOf('const I18N =');
const dictionaryEnd=i18n.indexOf('\n};',dictionaryStart)+3;
const translations=vm.runInNewContext(i18n.slice(dictionaryStart,dictionaryEnd)+';I18N');
const unavailable=lang=>translations[lang]['billing.androidUnavailable'];
const desktopUA='Mozilla/5.0 Chrome/141.0.0.0 Safari/537.36';
const androidBrowserUA='Mozilla/5.0 (Linux; Android 14) Chrome/141.0.0.0 Mobile Safari/537.36';
const appUA=androidBrowserUA+' MatchAppTVAndroid/1.1.55 MatchAppAiAndroid/1.1.55';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const settle=async()=>{await tick();await tick();await tick();};

function page(html,{ua=desktopUA,flag=false,classes='',url='https://matchapp.tv/pricing/pricing.html'}={}){
  const w=new JSDOM(html,{url,runScripts:'outside-only',pretendToBeVisual:true}).window;
  Object.defineProperty(w.navigator,'userAgent',{configurable:true,value:ua});
  w.MATCHAPP_ANDROID=flag;
  w.document.documentElement.className=classes;
  w.console.log=()=>{};
  w.matchMedia=()=>({matches:true});
  w.Element.prototype.scrollIntoView=function(){};
  return w;
}

function controls(){
  return '<body><button id="btn-ad_free" onclick="processCheckout(\'ad_free\')" data-i18n="pricing.adfree.cta">Get Ad-Free Pass ($1.99)</button>'+
    ['credits_25','credits_75','credits_200','credits_500'].map(key=>'<button data-credit-pack="'+key+'" onclick="buyCredits(\''+key+'\')">Buy Credits</button>').join('')+
    '<button data-pack="credits_25">Buy 25 Ask AI credits</button><button data-pack="credits_unknown">Other item</button>'+
    '<button data-kids-credit-pack="kids_credits_25">Buy for Kids</button><button data-pack="kids_credits_25">Kids fallback</button>'+
    '<button id="btn-vip_monthly">VIP</button><button id="pro-action">Pro</button><a id="donate" href="/support.html">Donate</a></body>';
}

test('native presentation uses established app signals and leaves ordinary web controls untouched',()=>{
  for(const options of [
    {},{ua:androidBrowserUA},{ua:androidBrowserUA,url:'https://matchapp.tv/pricing/pricing.html?utm_source=android_app'},
    {ua:appUA},{flag:true},{classes:'matchapp-android'},{classes:'matchapp-ai-android'}
  ]){
    const w=page(controls(),options),before=w.document.body.innerHTML;
    const native=options.ua===appUA||options.flag===true||!!options.classes;
    try{
      w.MATCHAPP_IS_AD_FREE=true;
      w.navigator.standalone=true;
      w.eval(adapter);
      assert.equal(w.MatchBillingPresentation.isAndroidApp(),native);
      if(!native){
        assert.equal(w.document.body.innerHTML,before,'Android Chrome, PWA and acquisition links keep web purchases');
        w.MatchBillingPresentation.refresh();
        assert.equal(w.document.body.innerHTML,before);
      }else{
        assert.equal(w.document.getElementById('btn-ad_free').textContent,unavailable('en'));
        assert.equal(w.document.querySelector('[data-credit-pack]').disabled,true);
      }
    }finally{w.close();}
  }
});

test('only unsupported adult Android purchase buttons are disabled without replacing their handlers or account data',()=>{
  const w=page(controls(),{ua:appUA});
  const targets=Array.from(w.document.querySelectorAll('#btn-ad_free,[data-credit-pack],[data-pack="credits_25"]'));
  const untouched=Array.from(w.document.querySelectorAll('[data-pack="credits_unknown"],[data-kids-credit-pack],[data-pack="kids_credits_25"],#btn-vip_monthly,#pro-action,#donate'));
  const original=untouched.map(node=>node.outerHTML);
  const handlers=targets.map(()=>()=>{throw Error('disabled Android purchase must not fire');});
  targets.forEach((button,i)=>{button.onclick=handlers[i];});
  let captures=0;
  const nativeGuard=()=>{captures++;};
  w.document.addEventListener('click',nativeGuard,true);
  w.localStorage.setItem('preserved-account-balance','75');
  w.sessionStorage.setItem('preserved-receipt','existing');
  const calls=[];
  w.supabaseClient={rpc:()=>{calls.push('rpc');},from:()=>{calls.push('profile');}};
  try{
    w.eval(adapter);
    for(const [index,button] of targets.entries()){
      assert.equal(button.onclick,handlers[index]);
      assert.equal(button.disabled,true);
      assert.equal(button.getAttribute('aria-disabled'),'true');
      assert.equal(button.dataset.androidPurchaseUnavailable,'true');
      assert.equal(button.textContent,unavailable('en'));
      button.click();
    }
    assert.equal(captures,0,'disabled controls do not reach the unchanged native purchase capture guard');
    assert.deepEqual(untouched.map(node=>node.outerHTML),original);
    w.document.getElementById('pro-action').click();
    assert.equal(captures,1,'the existing document capture listener remains attached');
    assert.deepEqual(calls,[],'presentation performs no new account, policy or provider request');
    assert.equal(w.localStorage.getItem('preserved-account-balance'),'75');
    assert.equal(w.sessionStorage.getItem('preserved-receipt'),'existing');
  }finally{w.close();}
});

test('the actual hub and language engine retain truthful Android controls in all 14 languages',async()=>{
  const w=page(read('pricing/pricing.html'),{ua:appUA});
  try{
    w.eval(i18n);w.eval(pricing);w.eval(read('pricing-locale.js'));w.eval(read('credits-ui.js'));
    await settle();
    assert.equal(Object.keys(translations).length,14);
    const pass=w.document.getElementById('btn-ad_free');
    const credits=Array.from(w.document.querySelectorAll('#purchase-hub [data-credit-pack]'));
    assert.equal(credits.length,4);
    const price=credits[0].closest('.purchase-pack').querySelector('b').textContent;
    for(const lang of Object.keys(translations)){
      assert.ok(unavailable(lang)?.trim(),lang+' has an authored unavailable message');
      if(lang!=='en')assert.notEqual(unavailable(lang),unavailable('en'));
      w.setLanguage(lang);
      for(const button of [pass,...credits]){
        assert.equal(button.textContent,unavailable(lang),lang+' after all language listeners');
        assert.equal(button.disabled,true);
      }
      assert.equal(pass.getAttribute('onclick'),"processCheckout('ad_free')");
      assert.equal(credits[0].getAttribute('onclick'),"buyCredits('credits_25')");
      assert.equal(credits[0].closest('.purchase-pack').querySelector('b').textContent,price);
      assert.equal(w.document.querySelector('[data-kids-credit-pack]').disabled,false);
    }
  }finally{w.close();}
});

test('verified ownership takes priority and account changes keep Android purchases unavailable without changing benefits',async()=>{
  const w=page(controls(),{ua:appUA});
  const owner={id:'123e4567-e89b-42d3-a456-426614174001'};
  let session={user:owner,access_token:'owned-test-session'};
  const profile={ad_free_purchased:true,purchased_matches:9,credits:75};
  const reads=[],observers=new Set();
  w.supabaseClient={auth:{
    getSession:async()=>({data:{session}}),getUser:async()=>({data:{user:session?.user}}),
    onAuthStateChange(fn){observers.add(fn);return {data:{subscription:{unsubscribe:()=>observers.delete(fn)}}};}
  },from(table){
    assert.equal(table,'profiles');
    return {select(fields){assert.equal(fields,'ad_free_purchased');return {eq(field,id){
      assert.equal(field,'id');assert.equal(id,owner.id);
      return {maybeSingle:async()=>{reads.push(id);return {data:{ad_free_purchased:profile.ad_free_purchased}};}};
    }};}};
  }};
  try{
    w.eval(i18n);w.eval(pricing);await settle();
    const button=w.document.getElementById('btn-ad_free');
    assert.equal(button.dataset.adFreeOwned,'true');
    assert.equal(button.dataset.androidPurchaseUnavailable,undefined);
    for(const lang of Object.keys(translations)){
      w.setLanguage(lang);
      assert.equal(button.textContent,translations[lang]['billing.alreadyOwned']);
      assert.equal(button.disabled,true);
      assert.equal(w.document.querySelector('[data-credit-pack]').textContent,unavailable(lang));
    }
    assert.equal(reads.length,1,'only the existing owned-product read is used');
    session=null;
    w.document.dispatchEvent(new w.Event('matchapp:authchange'));await settle();
    assert.equal(button.dataset.adFreeOwned,undefined);
    assert.equal(button.dataset.androidPurchaseUnavailable,'true');
    assert.equal(button.textContent,unavailable('zh'));
    assert.equal(button.disabled,true);
    assert.deepEqual(profile,{ad_free_purchased:true,purchased_matches:9,credits:75});
    assert.equal(observers.size,0);
  }finally{w.close();}
});

test('the fallback credit renderer applies the native state synchronously after every dynamic language render',async()=>{
  const html='<body><section><div id="credits-grid"></div></section><div id="credit-balance-line"><span id="credit-balance-value"></span></div></body>';
  const w=page(html,{ua:appUA});
  w.MatchAppTokens={retireLegacyPromotions:true};
  try{
    w.eval(i18n);w.eval(adapter);
    let purchases=0;w.buyCredits=()=>{purchases++;};
    w.eval(read('credits-ui.js'));await settle();
    w.renderCreditBadge(75);
    let previous=w.document.querySelector('[data-pack]');
    for(const lang of Object.keys(translations)){
      w.setLanguage(lang);
      const current=w.document.querySelector('[data-pack]');
      assert.notEqual(current,previous,'the original dynamic renderer actually replaced its cards');
      previous=current;
      for(const button of w.document.querySelectorAll('[data-pack]')){
        assert.equal(button.textContent,unavailable(lang));assert.equal(button.disabled,true);button.click();
      }
      assert.equal(w.document.querySelectorAll('[data-pack]').length,4);
      assert.equal(w.document.getElementById('credit-balance-value').textContent,'75');
      assert.equal(w.document.getElementById('match-packs-section'),null);
    }
    assert.equal(purchases,0);
    assert.equal(typeof w.document.getElementById('credits-grid').onclick,'function');
  }finally{w.close();}
});

test('the same fallback renderer still purchases Ask credits in a regular Android browser',async()=>{
  const w=page('<body><section><div id="credits-grid"></div></section></body>',{ua:androidBrowserUA});
  w.MatchAppTokens={retireLegacyPromotions:true};
  try{
    w.eval(adapter);let purchased='';w.buyCredits=key=>{purchased=key;};
    w.eval(read('credits-ui.js'));await settle();
    const button=w.document.querySelector('[data-pack="credits_25"]');
    assert.equal(button.textContent,'Buy 25 Ask AI credits');assert.equal(button.disabled,false);
    button.click();assert.equal(purchased,'credits_25');
  }finally{w.close();}
});

test('Brazil keeps verified prices and its original web Pix hint while omitting only the native hint',async()=>{
  for(const options of [
    {ua:androidBrowserUA,native:false,shared:true},
    {ua:appUA,native:true,shared:true},
    {ua:appUA,native:true,shared:false},
    {flag:true,native:true,shared:false}
  ]){
    const w=page('<body><section id="purchase-hub"><h2>Purchases</h2><p>Existing copy</p><article class="purchase-pack"><b>$2.99</b><button data-credit-pack="credits_25">Buy Credits</button></article></section></body>',options);
    const calls=[],scheduled=[];
    w.setTimeout=fn=>{scheduled.push(fn);return scheduled.length;};
    w.fetch=async(url,args)=>{calls.push({type:'country',url,args});return {ok:true,text:async()=>'fl=123\nloc=BR\n'};};
    w.supabaseClient={functions:{invoke:async(name,{body})=>{
      calls.push({type:'availability',name,body});
      return {data:{products:Object.fromEntries(body.products.map(key=>[key,true]))},error:null};
    }}};
    try{
      if(options.shared)w.eval(adapter);
      else w.CREDIT_PACKS=[{key:'credits_25',credits:25,price:'$2.99'}];
      w.eval(read('brl-pricing.js'));await w.MatchBillingMarket.ready;
      for(const callback of scheduled)callback();
      const note=w.document.querySelector('.brl-pix-note');
      if(options.native)assert.equal(note,null);
      else assert.equal(note.textContent,'🇧🇷 Preços em BRL · PIX aparece no Checkout quando elegível');
      assert.equal(w.CREDIT_PACKS[0].price,'R$ 4,90');
      assert.equal(w.document.querySelector('.purchase-pack b').textContent,'R$ 4,90');
      assert.equal(w.MatchBillingMarket.market,'BR');
      assert.equal(w.MatchBillingMarket.activeProducts.length,17);
      assert.equal(calls.length,2,'the existing regional and provider availability reads remain the only calls');
      assert.equal(calls[0].url,'/cdn-cgi/trace');
      assert.equal(calls[1].name,'stripe-checkout');assert.equal(calls[1].body.action,'availability');
    }finally{w.close();}
  }
});
