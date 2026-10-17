const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..');
const pricing=fs.readFileSync(path.join(root,'pricing.js'),'utf8');
const adapter=pricing.slice(0,pricing.indexOf('function purchaseStyles()'));
const policy=enabled=>({ok:true,authenticated:true,enabled,policy_version:'match-tokens-v1'});
const conflicts=['vip_monthly','vip_annual','business','matches_5','matches_25','matches_50'];
const independent=['credits_25','credits_75','credits_200','credits_500','kids_matches_5','kids_matches_25','kids_matches_50','kids_credits_25','kids_credits_75','kids_credits_200'];
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const settle=async()=>{await tick();await tick();await tick();};

function fixture({enabled,reply={data:null,error:Error('provider unavailable')},wallet=policy(false),profile={ad_free_purchased:false},shortTimeout=false}={}){
  const dom=new JSDOM('<body><button id="test-button">Original purchase</button><button id="btn-ad_free">Get Ad-Free Pass ($1.99)</button></body>',{url:'https://matchapp.tv/pricing/pricing.html'});
  const user={id:'123e4567-e89b-42d3-a456-426614174001',email:'buyer@example.invalid'};
  let session={user,access_token:'owned-token-one'};
  const listeners=new Set(),calls=[],redirects=[],notices=[];
  const button=dom.window.document.getElementById('test-button');
  const sb={auth:{
    getSession:async()=>({data:{session}}),
    getUser:async token=>{calls.push({type:'getUser',token});return {data:{user:session?.user}};},
    onAuthStateChange(fn){listeners.add(fn);return {data:{subscription:{unsubscribe:()=>listeners.delete(fn)}}};}
  },rpc:async name=>{calls.push({type:'rpc',name});return typeof wallet==='function'?wallet():{data:wallet};},
  from(name){
    assert.equal(name,'profiles');
    return {select(fields){
      assert.equal(fields,'ad_free_purchased');
      return {eq(field,id){
        assert.equal(field,'id');assert.equal(id,user.id);
        return {maybeSingle:async()=>{calls.push({type:'profile',id});return typeof profile==='function'?profile():{data:profile};}};
      }};
    }};
  },
  functions:{invoke:async(name,args)=>{calls.push({type:'invoke',name,body:args.body});return typeof reply==='function'?reply():reply;}}};
  const w={document:dom.window.document,supabaseClient:sb,MatchAppTokens:enabled===undefined?undefined:{retireLegacyPromotions:enabled},location:{assign:url=>redirects.push(url)},
    setTimeout:(fn,ms)=>setTimeout(fn,shortTimeout&&ms===12000?0:ms),clearTimeout,showToast:(...args)=>notices.push(args)};
  const context=vm.createContext({window:w,document:w.document,URL,console:{log(){}},alert(){},sessionStorage:dom.window.sessionStorage});
  vm.runInContext(adapter,context);
  return {dom,w,sb,context,user,button,calls,redirects,notices,listeners,
    async checkout(key='matches_5'){await w.startVerifiedCheckout(key,button);},
    changeAccount(id='123e4567-e89b-42d3-a456-426614174002'){
      session=id?{user:{id,email:'next@example.invalid'},access_token:'token-'+id}:null;
      for(const listener of listeners)listener(id?'SIGNED_IN':'SIGNED_OUT',session);
    },
    close(){dom.window.close();}
  };
}

test('actual checkout mapping retires only six Match products and preserves independent purchases',async()=>{
  const f=fixture({enabled:true});
  try{
    for(const key of conflicts)await f.checkout(key);
    assert.equal(f.calls.length,0);assert.deepEqual(f.redirects,[]);
    for(const key of independent)await f.checkout(key);
    assert.equal(f.redirects.length,independent.length);
    assert.equal(f.calls.filter(c=>c.type==='rpc'||c.type==='profile').length,0,'separate credits never depend on Match policy');
    await f.checkout('ad_free');assert.equal(f.redirects.length,independent.length+1);
    assert.equal(f.calls.filter(c=>c.type==='profile').length,1);
    assert.equal(f.listeners.size,0);
  }finally{f.close();}
});

test('fresh authenticated OFF policy preserves the original Match Payment Link and receipt owner metadata',async()=>{
  const f=fixture();
  try{
    await f.checkout();assert.equal(f.redirects.length,1);
    const url=new URL(f.redirects[0]);assert.equal(url.origin,'https://buy.stripe.com');
    assert.equal(url.pathname,'/eVq6oH2FX6hg1BIbolcfK0g');
    assert.equal(url.searchParams.get('client_reference_id'),f.user.id);assert.equal(url.searchParams.get('prefilled_email'),f.user.email);
    assert.deepEqual(f.calls.filter(c=>c.type==='rpc').map(c=>c.name),['match_token_status']);
    assert.equal(f.calls.find(c=>c.type==='getUser').token,'owned-token-one');assert.equal(f.listeners.size,0);
  }finally{f.close();}
});

test('the verified primary Checkout route works while local policy is still unknown',async()=>{
  const f=fixture({reply:{data:{url:'https://checkout.stripe.com/c/pay/real-provider-session'},error:null}});
  try{await f.checkout();assert.deepEqual(f.redirects,['https://checkout.stripe.com/c/pay/real-provider-session']);assert.ok(!f.calls.some(c=>c.type==='rpc'));assert.equal(f.listeners.size,0);}finally{f.close();}
});

test('explicit server retirement and policy denials never fall through, including FunctionsHttpError bodies',async()=>{
  for(const code of ['adult_product_retired','purchase_policy_unavailable','purchase_ownership_unavailable']){
    for(const shape of ['data','context','thrown']){
      const response=new Response(JSON.stringify({code}),{status:code==='adult_product_retired'?409:503});
      const error={context:response};
      const reply=shape==='data'?{data:{code,url:'https://checkout.stripe.com/c/pay/should-not-open'},error:null}:shape==='thrown'?async()=>{throw error;}: {data:null,error};
      const f=fixture({reply});
      try{await f.checkout();assert.deepEqual(f.redirects,[],code+' '+shape);assert.ok(!f.calls.some(c=>c.type==='rpc'));assert.equal(f.button.disabled,false);assert.equal(f.button.textContent,'Original purchase');assert.equal(f.listeners.size,0);}finally{f.close();}
    }
  }
});

test('authentication and rate-limit rejections are terminal even for an independent Ask credit purchase',async()=>{
  for(const status of [400,401,403,409,429]){
    const f=fixture({reply:{error:{context:new Response('{}',{status})},data:null}});
    try{await f.checkout('credits_25');assert.deepEqual(f.redirects,[]);assert.equal(f.button.disabled,false);assert.equal(f.listeners.size,0);}finally{f.close();}
  }
});

test('unknown, malformed, anonymous and effective ON wallet states never authorize old Match fallback',async()=>{
  for(const wallet of [null,{},policy(true),{...policy(false),authenticated:false},{...policy(false),enabled:'false'},{...policy(false),policy_version:'future'},{...policy(false),ok:false},async()=>{throw Error('wallet offline');}]){
    const f=fixture({wallet});
    try{await f.checkout();assert.deepEqual(f.redirects,[]);assert.equal(f.button.disabled,false);assert.equal(f.listeners.size,0);}finally{f.close();}
  }
});

test('server user verification failure and a bounded unreadable wallet fail closed without a hanging control',async()=>{
  const f=fixture();
  try{f.sb.auth.getUser=async()=>({error:Error('expired'),data:{user:null}});await f.checkout();assert.deepEqual(f.redirects,[]);assert.ok(!f.calls.some(c=>c.type==='rpc'));assert.equal(f.listeners.size,0);}finally{f.close();}
  const slow=fixture({shortTimeout:true,wallet:()=>new Promise(()=>{})});
  try{await slow.checkout();assert.deepEqual(slow.redirects,[]);assert.equal(slow.button.disabled,false);assert.equal(slow.listeners.size,0);}finally{slow.close();}
});

test('switching accounts during the policy read, even switching back, cannot authorize a fallback',async()=>{
  let finish;const f=fixture({wallet:()=>new Promise(resolve=>{finish=resolve;})});
  try{
    const pending=f.checkout();await settle();assert.equal(typeof finish,'function');
    f.changeAccount();f.changeAccount(f.user.id);finish({data:policy(false)});await pending;
    assert.deepEqual(f.redirects,[]);assert.equal(f.button.disabled,false);assert.equal(f.listeners.size,0);
  }finally{f.close();}
});

test('an account change at the settled permission handoff cannot redirect or paint an old owner',async()=>{
  for(const example of [
    {key:'matches_5',setup:{},expected:'allowed',read:'rpc'},
    {key:'ad_free',setup:{profile:{ad_free_purchased:false}},expected:'allowed',read:'profile'},
    {key:'ad_free',setup:{profile:{ad_free_purchased:true}},expected:'owned',read:'profile'}
  ]){
    for(const returnToOriginal of [false,true]){
      const f=fixture(example.setup),realPermission=f.context.freshOwnedPurchaseState;
      try{
        f.context.freshOwnedPurchaseState=async(...args)=>{
          const decision=await realPermission(...args);
          assert.equal(decision,example.expected,'the real owned read finishes before the auth event');
          f.changeAccount();if(returnToOriginal)f.changeAccount(f.user.id);
          return decision;
        };
        await f.checkout(example.key);
        assert.equal(f.calls.filter(c=>c.type==='getUser').length,1,'server identity was actually verified');
        assert.equal(f.calls.filter(c=>c.type===example.read).length,1,'the real wallet/profile permission read ran');
        assert.deepEqual(f.redirects,[],example.key+' after permission settlement');
        assert.equal(f.button.dataset.adFreeOwned,undefined,'previous-account ownership cannot paint the new account');
        assert.equal(f.button.disabled,false);assert.equal(f.button.textContent,'Original purchase');
        assert.equal(f.listeners.size,0);
      }finally{f.close();}
    }
  }
});

test('settled identity checks cannot proceed after an auth event queued before their caller resumes',async()=>{
  for(const example of [
    {read:2,reply:{data:{url:'https://checkout.stripe.com/c/pay/owned-session'},error:null},invokes:0},
    {read:3,reply:{data:{url:'https://checkout.stripe.com/c/pay/owned-session'},error:null},invokes:1},
    {read:4,reply:{data:{code:'product_already_owned'},error:null},invokes:1}
  ]){
    const f=fixture({reply:example.reply}),realSession=f.sb.auth.getSession;let reads=0,changed=false;
    try{
      f.sb.auth.getSession=()=>{
        if(++reads!==example.read)return realSession();
        // Resolve the real session first. Its awaiting helper completes before
        // this auth microtask, while the checkout caller resumes afterward.
        return {then(resolve,reject){realSession().then(value=>{
          resolve(value);queueMicrotask(()=>{changed=true;f.changeAccount();});
        },reject);}};
      };
      await f.checkout('ad_free');
      assert.equal(changed,true);assert.equal(f.calls.filter(c=>c.type==='invoke').length,example.invokes);
      assert.deepEqual(f.redirects,[]);assert.equal(f.button.dataset.adFreeOwned,undefined);
      assert.equal(f.button.disabled,false);assert.equal(f.listeners.size,0);
    }finally{f.close();}
  }
});

test('a delayed owned-pass denial or checkout URL from the previous account cannot paint or redirect the new account',async()=>{
  for(const result of [{data:{code:'product_already_owned'},error:null},{data:{url:'https://checkout.stripe.com/c/pay/previous-account'},error:null}]){
    let finish;const f=fixture({reply:()=>new Promise(resolve=>{finish=resolve;})});
    try{
      const pending=f.checkout('ad_free');await settle();assert.equal(typeof finish,'function');f.changeAccount();
      finish(result);await pending;assert.deepEqual(f.redirects,[]);assert.equal(f.button.dataset.adFreeOwned,undefined);assert.equal(f.button.disabled,false);assert.equal(f.listeners.size,0);
    }finally{f.close();}
  }
  let finish;const f=fixture({reply:()=>new Promise(resolve=>{finish=resolve;})});
  try{
    const pending=f.checkout('ad_free');await settle();f.changeAccount();
    f.context.markAdFreeOwned(f.button); // A fresh owned-account read has already painted account B.
    finish({data:{url:'https://checkout.stripe.com/c/pay/previous-account'},error:null});await pending;
    assert.deepEqual(f.redirects,[]);assert.equal(f.button.disabled,true);assert.equal(f.button.textContent,'Already purchased for this account');assert.equal(f.listeners.size,0);
  }finally{f.close();}
});

test('a permanently owned ad-free pass is not sold again through either server or Payment Link fallback',async()=>{
  for(const setup of [{reply:{data:{code:'product_already_owned'},error:null}},{profile:{ad_free_purchased:true}}]){
    const f=fixture(setup);
    try{await f.checkout('ad_free');assert.deepEqual(f.redirects,[]);assert.equal(f.button.disabled,true);assert.equal(f.button.dataset.adFreeOwned,'true');assert.equal(f.button.textContent,'Already purchased for this account');assert.equal(f.listeners.size,0);}finally{f.close();}
  }
  const unknown=fixture({profile:{is_ad_free:true}});
  try{await unknown.checkout('ad_free');assert.deepEqual(unknown.redirects,[]);assert.equal(unknown.button.disabled,false);}finally{unknown.close();}
});

test('temporary VIP/Business/Pro ad-free access does not prevent a distinct unowned permanent pass',async()=>{
  const f=fixture({enabled:true,profile:{ad_free_purchased:false,is_ad_free:true,is_vip:true,is_business:true,pro_active:true}});
  try{await f.checkout('ad_free');assert.equal(f.redirects.length,1);assert.equal(new URL(f.redirects[0]).pathname,'/dRmeVd4O58po8068c9cfK0j');assert.ok(!f.calls.some(c=>c.type==='rpc'));}finally{f.close();}
});

test('pricing ownership presentation follows the current account and does not alter receipt state',async()=>{
  const f=fixture({profile:{ad_free_purchased:true}});
  try{
    await f.context.refreshAdFreePurchase();const button=f.dom.window.document.getElementById('btn-ad_free');
    assert.equal(button.disabled,true);assert.equal(button.dataset.adFreeOwned,'true');
    f.changeAccount(null);await f.context.refreshAdFreePurchase();assert.equal(button.disabled,false);assert.equal(button.dataset.adFreeOwned,undefined);
    assert.ok(f.calls.every(c=>['getUser','profile'].includes(c.type)));assert.equal(f.listeners.size,0);
  }finally{f.close();}
});

test('actual pricing shell keeps ad-free and Ask/Kids controls usable while hiding only superseded Match purchases',async()=>{
  const html=fs.readFileSync(path.join(root,'pricing/pricing.html'),'utf8');
  const w=new JSDOM(html,{url:'https://matchapp.tv/pricing/pricing.html',runScripts:'outside-only',pretendToBeVisual:true}).window;
  let enabled=true;
  w.console.log=()=>{};w.matchMedia=()=>({matches:true});w.Element.prototype.scrollIntoView=function(){};
  w.supabaseClient={auth:{getSession:async()=>({data:{session:null}})},rpc:async()=>({data:{...policy(enabled),authenticated:false}})};
  const style=w.document.createElement('style');style.textContent=fs.readFileSync(path.join(root,'match-tokens.css'),'utf8');w.document.head.appendChild(style);
  try{
    w.eval(fs.readFileSync(path.join(root,'match-tokens.js'),'utf8'));await settle();w.eval(pricing);await settle();
    const d=w.document,credits=d.getElementById('purchase-tab-credits'),kids=d.getElementById('purchase-tab-kids'),matches=d.getElementById('purchase-tab-matches');
    const visible=element=>{for(let node=element;node instanceof w.Element;node=node.parentElement)if(w.getComputedStyle(node).display==='none')return false;return true;};
    assert.equal(visible(d.getElementById('btn-ad_free')),true);
    assert.equal(visible(d.querySelector('[data-credit-pack="credits_25"]')),true);
    assert.equal(visible(d.querySelector('[data-kids-match-pack="kids_matches_5"]')),true);
    for(const key of ['vip_monthly','vip_annual','business'])assert.equal(visible(d.getElementById('btn-'+key)),false,key);
    assert.equal(visible(matches),false);assert.equal(visible(d.getElementById('match-packs-section')),false);
    assert.equal(credits.getAttribute('aria-selected'),'true');assert.equal(credits.tabIndex,0);assert.equal(kids.tabIndex,-1);
    credits.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.equal(d.activeElement,kids);assert.equal(kids.tabIndex,0);
    w.MatchAppTokens.renderCorner();assert.equal(kids.tabIndex,0,'balance paint preserves a selected visible tab');
    kids.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.equal(d.activeElement,credits);assert.equal(matches.tabIndex,-1);
    enabled=false;await w.MatchAppTokens.refresh();assert.equal(visible(matches),true);assert.equal(visible(d.getElementById('btn-vip_monthly')),true);
    credits.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));assert.equal(d.activeElement,matches,'legacy three-tab navigation returns while policy is off');
  }finally{w.close();}
});

test('the legacy credit renderer still provides Ask packs without creating a Match upsell when policy is enabled',async()=>{
  const w=new JSDOM('<body><section><div id="credits-grid"></div></section><div id="quota-message"></div></body>',{url:'https://matchapp.tv/pricing/pricing.html',runScripts:'outside-only'}).window;
  let purchase='';w.MatchAppTokens={retireLegacyPromotions:true};w.CREDIT_PACKS=[{key:'credits_25',credits:25,price:'$2.99'}];w.MATCH_PACKS=[{key:'matches_5',matches:5,price:'$0.99'}];w.buyCredits=key=>{purchase=key;};
  try{w.eval(fs.readFileSync(path.join(root,'credits-ui.js'),'utf8'));await settle();const button=w.document.querySelector('[data-pack="credits_25"]');assert.ok(button);button.click();assert.equal(purchase,'credits_25');assert.equal(w.document.getElementById('match-packs-section'),null);w.injectCreditsCTA();assert.equal(w.document.querySelector('.credits-inline-cta'),null);}finally{w.close();}
});

test('all 14 authored ad-free descriptions disclose the Android scope and remove unsupported speed/profile claims',()=>{
  const source=fs.readFileSync(path.join(root,'i18n.js'),'utf8'),start=source.indexOf('const I18N ='),end=source.indexOf('\n};',start)+3;
  const translations=vm.runInNewContext(source.slice(start,end)+';I18N');
  assert.equal(Object.keys(translations).length,14);
  for(const [lang,strings] of Object.entries(translations)){
    for(const key of ['pricing.adfree.f1','pricing.adfree.f2','pricing.adfree.f3','billing.alreadyOwned'])assert.ok(strings[key]?.trim(),lang+' '+key);
    assert.match(strings['pricing.adfree.f1'],/Android/);assert.ok(!/4\s*s|4秒|4초|4[- ]second|fast.track|profile unlock/i.test(strings['pricing.adfree.f2']+' '+strings['pricing.adfree.f3']));
    if(lang!=='en')assert.notEqual(strings['pricing.adfree.f2'],translations.en['pricing.adfree.f2']);
  }
  const html=fs.readFileSync(path.join(root,'pricing/pricing.html'),'utf8'),d=new JSDOM(html).window.document;
  try{for(const key of ['pricing.adfree.f1','pricing.adfree.f2','pricing.adfree.f3'])assert.equal(d.querySelector('[data-i18n="'+key+'"]').textContent,translations.en[key]);assert.equal(d.getElementById('btn-ad_free').getAttribute('onclick'),"processCheckout('ad_free')");}finally{d.defaultView.close();}
});
