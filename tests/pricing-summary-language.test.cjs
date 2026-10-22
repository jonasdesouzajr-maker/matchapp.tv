const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const owner=read('matchapp-ia.js'),html=read('pricing/pricing.html');
const i18n=read('i18n.js'),billing=read('pricing.js'),shell=read('page-shell.js');
const baseStyle=read('style.css'),summaryStyle=read('matchapp-ia.css');
const cssStart='/* ---------- Pricing first screen ---------- */',cssEnd='/* ---------- cookies / ads ---------- */';
assert.equal(summaryStyle.split(cssStart).length,2);assert.equal(summaryStyle.split(cssEnd).length,2);
const pricingStyle=summaryStyle.split(cssStart)[1].split(cssEnd)[0];
const languages=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
const checkoutIds=['btn-vip_monthly','btn-vip_annual','btn-ad_free','btn-business'];
const captionSelector='header.app-header.mh-topbox .mh-head > .mh-tagline';
const settle=()=>new Promise(resolve=>setTimeout(resolve,0));

function dictionary(name){
  const start=owner.indexOf('const '+name+'='),end=owner.indexOf('\n};',start);
  assert.ok(start>=0&&end>start,name+' is the actual authored owner catalog');
  return vm.runInNewContext(owner.slice(start,end+3)+';'+name);
}
function stored(storage){
  return Object.fromEntries(Array.from({length:storage.length},(_,i)=>storage.key(i)).sort()
    .filter(key=>key!=='match_lang').map(key=>[key,storage.getItem(key)]));
}
function states(buttons){
  return buttons.map(button=>({id:button.id,disabled:button.disabled,hidden:button.hidden,
    ariaDisabled:button.getAttribute('aria-disabled'),busy:button.getAttribute('aria-busy'),
    handler:button.onclick,onclick:button.getAttribute('onclick'),data:{...button.dataset}}));
}
async function page({lang='pt-BR',native=false,withShell=true,url='https://matchapp.tv/pricing/pricing.html'}={}){
  const w=new JSDOM(html,{url,runScripts:'outside-only',pretendToBeVisual:true}).window;
  const calls=[];
  // Exercise the actual shared button styles and the complete owned Pricing CSS block.
  const style=w.document.createElement('style');style.textContent=baseStyle+'\n'+pricingStyle;w.document.head.appendChild(style);
  w.console.log=()=>{};
  w.matchMedia=()=>({matches:true});
  w.Element.prototype.scrollIntoView=function(){};
  w.MATCHAPP_ANDROID=native;
  w.localStorage.setItem('match_lang',lang);
  w.localStorage.setItem('match_user_country','BR');
  w.localStorage.setItem('preserved-account-balance','75');
  w.sessionStorage.setItem('preserved-receipt','existing');
  const forbidden=kind=>(...args)=>{calls.push(kind);throw Error('Unexpected '+kind+' in copy fixture');};
  w.fetch=forbidden('network');
  w.XMLHttpRequest.prototype.open=forbidden('xhr');
  w.supabaseClient={rpc:forbidden('rpc'),from:forbidden('account'),functions:{invoke:forbidden('provider')}};
  // Let parsing finish; the real deferred scripts are then evaluated in order.
  await new Promise(resolve=>{
    if(w.document.readyState==='loading')w.document.addEventListener('DOMContentLoaded',resolve,{once:true});
    else resolve();
  });
  w.eval(i18n);
  w.eval(billing);
  const controls=checkoutIds.map(id=>w.document.getElementById(id));
  const clicks=[];
  controls.forEach(button=>{button.onclick=()=>{clicks.push(button.id);};});
  const originalHandlers=controls.map(button=>button.onclick);
  w.eval(owner);
  if(withShell)w.eval(shell);
  return {w,calls,clicks,controls,originalHandlers};
}
function homeState(w){
  const link=w.document.getElementById('mh-home-btn'),label=link?.querySelector('.mh-home-label'),svg=link?.querySelector('svg');
  assert.ok(link&&label&&svg,'the real page shell creates the same icon and Home label');
  return {link,label,svg,href:link.getAttribute('href'),handler:link.onclick,svgMarkup:svg.outerHTML};
}
function expectHome(w,lang,original){
  const current=homeState(w),text=w.t('nav.home').replace(/^🏠\uFE0F?\s*/,'').trim();
  assert.notEqual(text,'nav.home');assert.ok(text);
  assert.equal(current.label.textContent,text);assert.equal(current.link.title,text);assert.equal(current.link.getAttribute('aria-label'),text);
  assert.equal(current.label.lang,lang);assert.equal(current.label.dir,lang==='ar'?'rtl':'ltr');
  if(original)assert.deepEqual(current,original,'Home label, icon, link destination and handler retain identity');
  return current;
}
function expectCheckoutVisibility(w,active){
  for(const id of ['btn-vip_monthly','btn-vip_annual']){
    const node=w.document.getElementById(id),selected=id===active;
    assert.equal(node.hidden,!selected,id+' retains the billing owner hidden state');
    assert.equal(w.getComputedStyle(node).display==='none',!selected,id+' CSS obeys the real hidden attribute');
  }
}
function bindingRows(w){
  const wrap=w.document.querySelector('.ma-pricing-first');
  const rows=[],add=(selector,key,prefix='')=>rows.push([wrap.querySelector(selector),key,prefix]);
  add('.ma-pricing-copy h1','pricingTitle');add('.ma-pricing-copy p','pricingSub');
  const plans=[
    ['noAccount','freePlan',3,['dailyAction','countryGuide','firstMatch']],
    ['freeProfile','account',5,['saveHistory','privateTaste','togetherFeatures']],
    ['fewerLimits','vip',10,['includedActions','vipAdFree','billingOptions']]
  ];
  plans.forEach(([kicker,name,count,items],index)=>{
    const base='.ma-plan:nth-child('+(index+1)+')';
    add(base+' > .ma-plan-kicker',kicker);add(base+' > h2',name);add(base+' > .ma-plan-big','daily',count+' ');
    items.forEach((key,i)=>add(base+' > ul > li:nth-child('+(i+1)+')',key));
  });
  add('.ma-plan:first-child .ma-plan-cta','start');add('.is-account .ma-plan-cta','join');
  add('.ma-billing-toggle button:first-child','monthly');add('.ma-billing-toggle button:last-child','annual');
  add('.ma-pricing-note','note');
  ['adFree','extraMatches','extraAsk','business'].forEach((key,i)=>{
    const base='.ma-secondary-product:nth-child('+(i+1)+')';
    add(base+' > strong',key);add(base+' > small',key+'Desc');
  });
  add('.ma-secondary-product:nth-child(2) > a','viewOptions');
  add('.ma-secondary-product:nth-child(3) > a','viewOptions');
  rows.push([w.document.querySelector(captionSelector),'pageLabel','']);
  rows.forEach(([node,key])=>assert.ok(node,'actual rendered node exists: '+key));
  return {wrap,rows};
}

test('actual Pricing owner translates the tablet summary and primary plans on a saved Portuguese load',async()=>{
  const {w,controls,originalHandlers,calls}=await page();
  try{
    await settle();
    assert.equal(w.document.querySelector('.ma-pricing-note').textContent,
      'Uma ação diária é um Match ou uma pergunta à IA. Matches extras não compram perguntas à IA, e créditos extras de IA não compram Matches.');
    assert.deepEqual(Array.from(w.document.querySelectorAll('.ma-secondary-product > strong'),node=>node.textContent),
      ['Sem anúncios','Matches extras','Créditos extras de IA','Empresarial']);
    assert.deepEqual(Array.from(w.document.querySelectorAll('.ma-plan-kicker'),node=>node.textContent),
      ['Sem conta','Perfil gratuito','Menos limites']);
    assert.deepEqual(Array.from(w.document.querySelectorAll('.ma-plan > .ma-plan-big:first-of-type'),node=>node.textContent),
      ['3 ações de IA incluídas por dia','5 ações de IA incluídas por dia','10 ações de IA incluídas por dia']);
    assert.equal(w.document.querySelector(captionSelector).textContent,'Preços do MatchApp Ai');
    expectHome(w,'pt-BR');assert.equal(w.document.querySelector('#mh-home-btn .mh-home-label').textContent,'Início');
    expectCheckoutVisibility(w,'btn-vip_annual');
    assert.equal(w.getComputedStyle(w.document.querySelector('.ma-pricing-first')).textAlign,'start');
    assert.equal(w.getComputedStyle(w.document.querySelector('.ma-pricing-first')).getPropertyValue('--ma-gold-soft').trim(),'#fff0ba');
    assert.equal(w.document.querySelector('.ma-brand-lockup').getAttribute('aria-label'),'MatchApp Ai');
    assert.equal(w.document.querySelector('.ma-plan:first-child .ma-plan-cta').getAttribute('href'),'/#ma-concierge');
    assert.ok(Array.from(w.document.querySelectorAll('.ma-secondary-product > a')).every(node=>node.textContent==='Ver opções'&&node.getAttribute('href')==='#credits'));
    controls.forEach((button,i)=>{
      assert.equal(w.document.getElementById(button.id),button);
      assert.equal(button.onclick,originalHandlers[i]);
    });
    assert.deepEqual(calls,[]);
  }finally{w.close();}
});

test('all 14 real language events repaint existing summary nodes without resetting billing choice, focus, prices or handlers',async()=>{
  const {w,controls,calls,clicks}=await page({lang:'en'});
  try{
    await settle();
    w.setLanguage('pt-BR');await settle();
    assert.equal(w.document.querySelector('.ma-pricing-copy h1').textContent,'Assista com menos limites.',
      'the already mounted English plan heading follows the actual language event');
    w.setLanguage('en');await settle();
    const copy=dictionary('PRICING_COPY'),common=dictionary('COPY');
    assert.deepEqual(Object.keys(copy),languages);
    assert.equal(Object.keys(copy.en).length,23);
    const {wrap,rows}=bindingRows(w),nodes=rows.map(row=>row[0]),home=homeState(w);
    const [monthly,annual]=controls;
    const toggles=Array.from(wrap.querySelectorAll('.ma-billing-toggle button'));
    toggles[0].click();toggles[0].focus();
    assert.equal(monthly.hidden,false);assert.equal(annual.hidden,true);
    expectCheckoutVisibility(w,'btn-vip_monthly');
    const price=wrap.querySelectorAll('.is-vip > .ma-plan-big')[1];
    assert.ok(price,'the separate selected-plan price exists');
    price.textContent='R$\u00a029,90 / mês';
    w.sessionStorage.setItem('match_pending_checkout','vip_monthly');
    const before={controls:states(controls),local:stored(w.localStorage),session:stored(w.sessionStorage),price:price.textContent};
    for(const lang of languages){
      assert.deepEqual(Object.keys(copy[lang]),Object.keys(copy.en));
      for(const value of Object.values(copy[lang]))assert.ok(typeof value==='string'&&value.trim(),lang+' has authored copy');
      if(lang!=='en')assert.notEqual(copy[lang].note,copy.en.note,lang+' has its own daily-action explanation');
      w.setLanguage(lang);await settle();
      assert.equal(w.document.querySelectorAll('.ma-pricing-first').length,1);
      assert.equal(w.document.querySelector('.ma-pricing-first'),wrap);
      assert.deepEqual(bindingRows(w).rows.map(row=>row[0]),nodes,lang+' retains every text-node owner');
      for(const [node,key,prefix] of rows){
        assert.equal(node.textContent,prefix+(copy[lang][key]??common[lang][key]),lang+': '+key);
      }
      assert.equal(wrap.lang,lang);assert.equal(wrap.dir,lang==='ar'?'rtl':'ltr');
      expectHome(w,lang,home);expectCheckoutVisibility(w,'btn-vip_monthly');
      assert.equal(w.document.querySelector(captionSelector).dir,wrap.dir);
      assert.equal(w.document.activeElement,toggles[0]);
      assert.equal(toggles[0].getAttribute('aria-pressed'),'true');assert.equal(toggles[1].getAttribute('aria-pressed'),'false');
      assert.equal(price.textContent,before.price);
      assert.deepEqual(states(controls),before.controls);
      assert.deepEqual(stored(w.localStorage),before.local);assert.deepEqual(stored(w.sessionStorage),before.session);
    }
    monthly.click();assert.deepEqual(clicks,['btn-vip_monthly'],'the same checkout handler still fires exactly once');
    toggles[1].click();expectCheckoutVisibility(w,'btn-vip_annual');
    assert.equal(w.document.getElementById(annual.id),annual);assert.equal(w.document.getElementById(monthly.id),monthly);
    let authOpens=0;w.openAuthModal=()=>{authOpens++;};
    wrap.querySelector('.is-account .ma-plan-cta').click();assert.equal(authOpens,1);
    assert.deepEqual(calls,[],'display-language changes perform no account, credit or provider requests');
  }finally{w.close();}
});

test('the summary repaint leaves native unavailable, owned and pending purchase states with their real billing owner',async()=>{
  for(const owned of [false,true]){
    const {w,controls,calls}=await page({lang:'en',native:true});
    try{
      await settle();
      const pass=w.document.getElementById('btn-ad_free'),business=w.document.getElementById('btn-business');
      if(owned)pass.dataset.adFreeOwned='true';
      w.MatchBillingPresentation.refresh();
      business.disabled=true;business.setAttribute('aria-disabled','true');business.setAttribute('aria-busy','true');
      business.dataset.providerRequest='pending-existing';
      const before=states(controls);
      for(const lang of languages){
        w.setLanguage(lang);await settle();
        assert.equal(pass.textContent,w.t(owned?'billing.alreadyOwned':'billing.androidUnavailable'));
        assert.equal(pass.disabled,true);
        assert.equal(pass.dataset.adFreeOwned,owned?'true':undefined);
        assert.equal(pass.dataset.androidPurchaseUnavailable,owned?undefined:'true');
        assert.deepEqual(states(controls),before,lang+' retains original purchase-state attributes and functions');
        controls.forEach(button=>assert.equal(w.document.getElementById(button.id),button));
      }
      assert.deepEqual(calls,[]);
    }finally{w.close();}
  }
});

test('the later real page shell uses the latest language and regional aliases without remounting Pricing',async()=>{
  const {w,calls}=await page({lang:'pt-BR',withShell:false});
  try{
    const wrap=w.document.querySelector('.ma-pricing-first');
    assert.equal(w.document.querySelector(captionSelector),null);
    w.setLanguage('ar-SA');
    w.eval(shell);await settle();
    const home=expectHome(w,'ar');home.link.focus();
    const caption=w.document.querySelector(captionSelector);
    assert.ok(caption,'the actual deferred shell creates its caption');
    w.setLanguage('pt-PT');await settle();
    assert.equal(caption.textContent,'Preços do MatchApp Ai');assert.equal(caption.dir,'ltr');
    expectHome(w,'pt-BR',home);assert.equal(w.document.activeElement,home.link);
    assert.equal(w.localStorage.getItem('match_lang'),'pt-BR');
    w.localStorage.setItem('match_lang','ar');
    w.dispatchEvent(new w.StorageEvent('storage',{key:'match_lang',newValue:'ar',storageArea:w.localStorage}));
    await settle();
    assert.equal(caption.textContent,dictionary('PRICING_COPY').ar.pageLabel);assert.equal(caption.dir,'rtl');
    expectHome(w,'ar',home);assert.equal(w.document.activeElement,home.link);
    assert.equal(w.document.querySelector('.ma-pricing-first'),wrap);assert.equal(w.document.querySelector(captionSelector),caption);
    assert.deepEqual(calls,[]);
  }finally{w.close();}
});

test('the Pricing caption binding stays out of other routes and both actual Pricing owner URLs retain their prior query values',async()=>{
  const {w,calls}=await page({url:'https://matchapp.tv/legal.html',withShell:false});
  try{
    w.eval(shell);
    const caption=w.document.querySelector(captionSelector),original=caption.textContent,home=homeState(w),homeOriginal={text:home.label.textContent,title:home.link.title,aria:home.link.getAttribute('aria-label')};
    w.setLanguage('ar');await settle();
    assert.equal(caption.textContent,original);assert.equal(w.document.querySelector('.ma-pricing-first'),null);
    assert.deepEqual(homeState(w),home);assert.deepEqual({text:home.label.textContent,title:home.link.title,aria:home.link.getAttribute('aria-label')},homeOriginal);
    assert.deepEqual(calls,[]);
    const scripts=Array.from(w.document.querySelectorAll('script[src]'),node=>new URL(node.src));
    const entry=scripts.filter(url=>url.pathname==='/matchapp-ia.js');
    const overlay=scripts.filter(url=>url.pathname==='/pricing-locale.js');
    assert.equal(entry.length,1);assert.equal(overlay.length,1);
    const styles=Array.from(w.document.querySelectorAll('link[rel="stylesheet"][href]'),node=>new URL(node.href)).filter(url=>url.pathname==='/matchapp-ia.css');
    assert.equal(styles.length,1);assert.deepEqual(Array.from(styles[0].searchParams),[['v','20260924-ads1'],['pricinglayout','20261019-1']]);
    assert.deepEqual(Array.from(entry[0].searchParams),[
      ['v','20260926-brandai1'],['fastlang','20261014-2'],['approvedlogo','20261014'],['pricingcopy','20261019-1'],['menulocale','20261019-1'],['accountphoto','20261020-1'],['androidqa','20261021-1']]);
    assert.deepEqual(Array.from(overlay[0].searchParams),[
      ['v','20261001-pt1'],['android','20261017-1'],['pricingcopy','20261019-1']]);
  }finally{w.close();}
});
