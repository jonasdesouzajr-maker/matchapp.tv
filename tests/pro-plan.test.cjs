const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const api=require('../pro-plan.js');
const source=fs.readFileSync(path.join(__dirname,'../pro-plan.js'),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const plain=value=>JSON.parse(JSON.stringify(value));
const offer=(currency='usd',amount=499,country='US')=>({ok:true,enabled:true,offer:{priceId:'price_live123',currency,amount,fractionDigits:2,interval:'month',intervalCount:1,country},availableCountries:['US','BR','IN','MX','CO']});
const free={ok:true,entitled:false,provider:null,expiresAt:null,cancelAtPeriodEnd:false,canManage:false,retentionEligible:false};
const phase=(formattedPrice,recurrenceMode,billingCycleCount=0)=>({formattedPrice,priceAmountMicros:formattedPrice==='R$ 2,50'?2500000:9900000,currencyCode:'BRL',billingPeriod:'P1M',billingCycleCount,recurrenceMode});
const nativeOffer={offerKey:'e73f7ec4-bbd6-49cc-923b-006891e82f2f',basePlanId:'monthly',offerId:'returning',pricingPhases:[phase('R$ 2,50',2,3),phase('R$ 9,90',1)]};
const nativeRetentionOffer={...nativeOffer,offerId:'retention-offer-from-sdk',pricingPhases:[{...phase('R$ 4,95',2,3),priceAmountMicros:4950000},phase('R$ 9,90',1)]};

async function fixture({native=false,lang='en',signedIn=true,invoke,url='https://matchapp.tv/',markup,tokenEnabled}={}){
  const w=new JSDOM(markup||'<html lang="'+lang+'"><body><main><a id="provider" href="https://www.netflix.com/title/123">Existing result</a><div id="locked-ad"><ins data-ad-slot="2595698117"></ins></div><div data-matchapp-pro-entry></div></main></body></html>',{url,runScripts:'outside-only',pretendToBeVisual:true}).window;
  w.MATCH_LANG=lang;w.matchMedia=()=>({matches:false});
  if(tokenEnabled!==undefined)w.MatchAppTokens={enabled:tokenEnabled};
  const calls=[],messages=[],clickHandlers=new WeakMap();
  const add=w.EventTarget.prototype.addEventListener;
  w.EventTarget.prototype.addEventListener=function(type,handler,...rest){if(type==='click'){const entries=clickHandlers.get(this)||[];entries.push(handler);clickHandlers.set(this,entries);}return add.call(this,type,handler,...rest);};
  let currentSession=signedIn?{user:{id:'account-one'},access_token:'test-auth-token'}:null;
  w.supabaseClient={auth:{getSession:async()=>({data:{session:currentSession}})},functions:{invoke:async(name,args)=>{calls.push({name,body:args.body});return invoke?invoke(name,args):{data:args.body.action==='status'?free:offer()};}}};
  w.localStorage.setItem('match_isVIP','true');w.localStorage.setItem('match_guestBonusMatches','7');
  if(native)w.MatchAppNativeBilling={postMessage:message=>messages.push(JSON.parse(message))};
  let providerClicks=0;const provider=w.document.getElementById('provider');const handler=event=>{event.preventDefault();providerClicks++;};if(provider)provider.onclick=handler;
  const originalAd=w.document.getElementById('locked-ad')?.outerHTML;
  w.eval(source);await tick();
  return {w,calls,messages,provider,handler,originalAd,providerClicks:()=>providerClicks,setSession:value=>{currentSession=value;},
    button:key=>[...w.document.querySelectorAll('.ma-pro-actions button,.ma-pro-management-escape button')].find(button=>button.textContent===api.text(lang,key)),
    activate:async element=>{assert.ok(element);for(const handler of clickHandlers.get(element)||[])handler({isTrusted:true});await tick();await tick();}};
}

test('server prices use explicit minor-unit scale and never substitute a regional price',()=>{
  for(const [currency,amount,country,lang,value] of [['usd',499,'US','en',4.99],['brl',990,'BR','pt-BR',9.9],['inr',9900,'IN','hi',99],['mxn',4900,'MX','es',49],['cop',990000,'CO','es',9900]]){
    const actual=api.catalogOffer(offer(currency,amount,country));assert.ok(actual);
    assert.equal(api.price(actual,lang),new Intl.NumberFormat(lang,{style:'currency',currency:currency.toUpperCase()}).format(value));
    assert.equal(actual.country,country);
  }
  for(const bad of [{...offer(),enabled:'true'},{...offer(),enabled:false},offer('usd',-499),offer('usd',4.99),{...offer(),offer:{...offer().offer,interval:'year'}},{...offer(),offer:{...offer().offer,fractionDigits:undefined}},{...offer(),offer:{...offer().offer,priceId:'javascript:alert(1)'}}])assert.equal(api.catalogOffer(bad),null);
});

test('payment destinations are strict provider origins with no credential or redirect lookalikes',()=>{
  assert.equal(api.billingUrl('https://checkout.stripe.com/c/pay/cs_live_123#fid_123','checkout'),'https://checkout.stripe.com/c/pay/cs_live_123#fid_123');
  assert.ok(api.billingUrl('https://billing.stripe.com/p/session/live_123','manage'));
  assert.ok(api.billingUrl('https://play.google.com/store/account/subscriptions?package=com.jonas.papercup&sku=matchapp_pro','manage'));
  for(const url of ['http://checkout.stripe.com/c/pay/x','https://checkout.stripe.com.evil.example/c/pay/x','https://checkout.stripe.com@evil.example/c/pay/x','https://user:pass@checkout.stripe.com/c/pay/x','https://evil.example/c/pay/x','javascript:alert(1)','https://checkout.stripe.com:8443/c/pay/x','https://billing.stripe.com/p/session/a'])assert.equal(api.billingUrl(url,'checkout'),'');
  assert.equal(api.billingUrl('https://play.google.com/store/account/subscriptions?package=other.app','manage'),'');
  assert.equal(api.billingUrl('https://play.google.com/store/account/subscriptions?next=https://evil.example','manage'),'');
});

test('every supported language has authored plan, renewal, cancellation, pending and offer-phase copy',()=>{
  assert.equal(api.languages.length,14);
  for(const language of api.languages){
    assert.equal(api.rows[language].length,api.keys.length,language);
    assert.ok(api.rows[language].every(value=>typeof value==='string'&&value.trim()));
    assert.ok(api.text(language,'summary').includes('MatchApp Ai'));
    assert.ok(!api.text(language,'limited',{price:'PRICE',period:'PERIOD',count:3}).includes('{'));
    assert.ok(api.phaseText(nativeOffer.pricingPhases[0],language).includes('R$ 2,50'));
    assert.ok(api.phaseText(nativeOffer.pricingPhases[1],language).includes('R$ 9,90'));
    if(language!=='en')assert.notEqual(api.text(language,'terms'),api.text('en','terms'));
  }
});

test('native offers retain all real phases and reject incomplete recurring terms',()=>{
  assert.deepEqual(plain(api.playOffers([nativeOffer])),[nativeOffer]);
  for(const bad of [{...nativeOffer,pricingPhases:[]},{...nativeOffer,pricingPhases:[phase('R$ 2,50',2,0)]},{...nativeOffer,pricingPhases:[{...phase('R$ 9,90',1),billingPeriod:'P1Y'}]},{...nativeOffer,pricingPhases:[{...phase('R$ 9,90',1),formattedPrice:''}]}])assert.deepEqual(api.playOffers([bad]),[]);
  assert.equal(api.entitlement({is_vip:true,entitled:true}),false);
  assert.equal(api.entitlement({...free,entitled:true,provider:'play',expiresAt:Date.now()-1}),false);
  assert.equal(api.entitlement({...free,entitled:true,provider:'play',expiresAt:Date.now()+60000}),true);
});

test('boot makes no purchase request; explicit plan opening preserves existing source and balances',async()=>{
  const f=await fixture();
  try{
    assert.deepEqual(f.calls,[]);
    f.w.MatchAppPro.open();await tick();await tick();
    assert.deepEqual(f.calls.map(c=>c.body.action),['status','catalog']);
    assert.equal(f.w.MatchAppPro.isEntitled(),false);
    assert.equal(f.provider.onclick,f.handler);assert.equal(f.provider.href,'https://www.netflix.com/title/123');
    f.provider.click();assert.equal(f.providerClicks(),1);
    assert.equal(f.w.document.getElementById('locked-ad').outerHTML,f.originalAd);
    assert.equal(f.w.localStorage.getItem('match_guestBonusMatches'),'7');
    const subscribe=[...f.w.document.querySelectorAll('.ma-pro-actions button')].find(b=>b.textContent.includes('$4.99'));
    assert.ok(subscribe);subscribe.click();await tick();
    assert.equal(f.calls.some(c=>c.body.action==='checkout'),false,'synthetic clicks cannot begin checkout');
    const countries=f.w.document.querySelector('.ma-pro-country select');assert.equal(countries.value,'US');
    assert.ok(f.w.document.querySelector('.ma-pro-market').textContent.includes('United States'));
  }finally{f.w.close();}
});

test('Android uses only Play quotes and a second trusted action; stale events cannot affect a new account',async()=>{
  const f=await fixture({native:true,lang:'pt-BR'});
  try{
    f.w.MatchAppPro.open();await tick();await tick();
    assert.deepEqual(f.calls.map(c=>c.body.action),['status']);
    const prepare=f.messages.find(m=>m.type==='prepare');assert.ok(prepare);assert.ok(prepare.requestId.length>=32);
    f.w.dispatchEvent(new f.w.CustomEvent('matchapp:billing',{detail:{requestId:prepare.requestId,status:'ready',serverVerified:false,offers:[nativeOffer]}}));
    assert.ok(f.w.document.querySelector('.ma-pro-offers').textContent.includes('R$ 2,50'));
    assert.ok(f.w.document.querySelector('.ma-pro-offers').textContent.includes('R$ 9,90'));
    const checkout=[...f.w.document.querySelectorAll('.ma-pro-actions button')].find(b=>b.textContent===api.text('pt-BR','checkout'));checkout.click();await tick();
    assert.equal(f.messages.some(m=>m.type==='launch'),false);
    f.w.dispatchEvent(new f.w.CustomEvent('matchapp:billing',{detail:{requestId:prepare.requestId,status:'ready',reason:'user_gesture_required',serverVerified:false}}));
    assert.ok(f.w.document.querySelector('.ma-pro-offers').textContent.includes('R$ 9,90'),'current gesture-retry event keeps the same unexpired quote');
    f.setSession({user:{id:'account-two'},access_token:'new-auth-token'});
    f.w.document.dispatchEvent(new f.w.CustomEvent('matchapp:authchange',{detail:{signedIn:true}}));await new Promise(resolve=>f.w.setTimeout(resolve,0));await tick();await tick();
    assert.ok(f.messages.some(m=>m.type==='clear'));
    const nextPrepare=f.messages.filter(m=>m.type==='prepare').at(-1);assert.notEqual(nextPrepare.requestId,prepare.requestId);
    f.w.dispatchEvent(new f.w.CustomEvent('matchapp:billing',{detail:{requestId:prepare.requestId,status:'ready',serverVerified:false,offers:[nativeOffer]}}));
    assert.equal(f.w.document.querySelector('.ma-pro-offers').textContent,'');
    assert.equal(f.calls.some(c=>['catalog','checkout'].includes(c.body.action)),false);
  }finally{f.w.close();}
});

test('native payment callbacks never establish entitlement without current-account server status',async()=>{
  let backend=free;
  const f=await fixture({native:true,invoke:async()=>({data:backend})});
  try{
    f.w.MatchAppPro.open();await tick();await tick();
    const prepare=f.messages.find(m=>m.type==='prepare');
    for(const status of ['pending','verification_pending','verified']){
      f.w.dispatchEvent(new f.w.CustomEvent('matchapp:billing',{detail:{requestId:prepare.requestId,status,serverVerified:status==='verified'}}));await tick();await tick();
      assert.equal(f.w.MatchAppPro.isEntitled(),false,status);
    }
    backend={...free,entitled:true,provider:'play',expiresAt:Date.now()+86400000,canManage:true};
    await f.w.MatchAppPro.refresh({prepare:false});
    assert.equal(f.w.MatchAppPro.isEntitled(),true);
    assert.ok([...f.w.document.querySelectorAll('.ma-pro-actions button')].some(b=>b.textContent===api.text('en','cancel')));
    assert.equal(f.w.localStorage.getItem('match_isVIP'),'true','legacy flag was neither consumed as Pro nor rewritten');
  }finally{f.w.close();}
});

test('Kids never boots Pro and the owned overlay remains inside the shared gold boundary',async()=>{
  const f=await fixture({url:'https://matchapp.tv/kids/'});
  try{assert.equal(f.w.MatchAppPro,undefined);assert.deepEqual(f.calls,[]);}finally{f.w.close();}
  const css=fs.readFileSync(path.join(__dirname,'../pro-plan.css'),'utf8');
  assert.match(css,/\.ma-pro-scrim[^}]+inset: 5px/);
  assert.match(css,/border-radius: 24px/);
  assert.match(css,/min-height: 6rem/);
  assert.match(css,/prefers-reduced-motion: reduce/);
  assert.ok(!source.includes('showModal('),'a browser top-layer backdrop would obscure the permanent gold frame');
});

test('receipt query is captured once and removed synchronously, including invalid and duplicate values',()=>{
  for(const [query,expected] of [
    ['?lang=fr&pro_return=1&session_id=cs_live_abc123&keep=1',{mode:'1',sessionId:'cs_live_abc123'}],
    ['?pro_return=1&session_id=javascript%3Aalert(1)',{mode:'1',sessionId:''}],
    ['?pro_return=1&session_id=cs_live_first&session_id=cs_live_second',{mode:'1',sessionId:''}],
    ['?pro_return=cancelled',{mode:'cancelled',sessionId:''}],
    ['?pro_return=managed',{mode:'managed',sessionId:''}],
    ['?pro_return=unknown&session_id=cs_live_invalid',null]
  ]){
    const w=new JSDOM('',{url:'https://matchapp.tv/pricing/pricing.html'+query+'#section'}).window;
    try{
      w.history.replaceState({keep:'existing-state'},'',w.location.href);
      assert.deepEqual(api.takeBillingReturn(w),expected);
      assert.ok(!w.location.search.includes('session_id'));assert.ok(!w.location.search.includes('pro_return'));
      assert.equal(w.location.hash,'#section');assert.equal(w.history.state.keep,'existing-state');
      if(query.includes('keep=1'))assert.equal(new URL(w.location.href).searchParams.get('keep'),'1');
      assert.equal(api.takeBillingReturn(w),null);
    }finally{w.close();}
  }
  const legacy=new JSDOM('',{url:'https://matchapp.tv/purchase.html?session_id=cs_live_legacy&lang=pt-BR'}).window;
  try{assert.equal(api.takeBillingReturn(legacy),null);assert.equal(new URL(legacy.location.href).searchParams.get('session_id'),'cs_live_legacy');}finally{legacy.close();}
});

test('checkout return verifies the current account on the server and never infers Pro from its URL',async()=>{
  let active=false;
  const f=await fixture({url:'https://matchapp.tv/pricing/pricing.html?pro_return=1&session_id=cs_live_receipt123&lang=en',invoke:async(name,{body})=>({data:body.action==='catalog'?offer():active?{...free,entitled:true,provider:'stripe',expiresAt:Date.now()+86400000,canManage:true}:free})});
  try{
    await tick();assert.equal(f.w.location.search,'?lang=en');
    assert.equal(f.w.MatchAppPro.isEntitled(),false);assert.equal(f.w.document.querySelector('.ma-pro-scrim').hidden,false);
    assert.equal(f.calls.find(c=>c.body.action==='status').body.sessionId,'cs_live_receipt123');
    assert.ok(!f.calls.some(c=>['checkout','retain','manage'].includes(c.body.action)));
    assert.equal([...f.w.document.querySelectorAll('.ma-pro-actions button')].some(b=>b.textContent.includes('$4.99')),false,'unconfirmed return never suggests another checkout');
    assert.ok([...Object.keys(f.w.localStorage)].every(key=>!String(f.w.localStorage.getItem(key)).includes('cs_live_receipt123')));
    active=true;await f.w.MatchAppPro.refresh({prepare:false});assert.equal(f.w.MatchAppPro.isEntitled(),true);
    await f.w.MatchAppPro.refresh({prepare:false});assert.equal(f.calls.filter(c=>c.body.action==='status').at(-1).body.sessionId,undefined,'confirmed receipt is discarded');
  }finally{f.w.close();}
});

test('verified Stripe retention is an explicit choice and never obscures cancellation',async()=>{
  let retained=false;
  const active=()=>({...free,entitled:true,provider:'stripe',expiresAt:Date.now()+86400000,canManage:true,retentionEligible:!retained,retentionOffer:retained?undefined:{percentOff:50,months:3}});
  const f=await fixture({invoke:async(name,{body})=>{
    if(body.action==='retain'){retained=true;return {data:{ok:true,applied:true,percentOff:50,months:3}};}
    if(body.action==='manage')return {data:{ok:true,url:'https://invalid.example/'}};
    return {data:body.action==='catalog'?offer():active()};
  }});
  try{
    f.w.MatchAppPro.open();await tick();await tick();
    f.button('cancel').click();await tick();assert.equal(f.button('retain'),undefined,'synthetic click cannot select a retention path');
    await f.activate(f.button('cancel'));
    assert.ok(f.button('retain'));assert.ok(f.button('continueCancel'));assert.ok(f.w.document.querySelector('.ma-pro-terms').textContent.includes('regular subscription price'));
    assert.ok(!f.calls.some(c=>['manage','retain'].includes(c.body.action)));
    await f.activate(f.button('retain'));assert.equal(f.calls.filter(c=>c.body.action==='retain').length,1);
    assert.ok(f.w.document.querySelector('.ma-pro-state').textContent.includes(api.text('en','retained')));
    assert.ok(f.button('cancel'),'ordinary cancellation remains available after acceptance');
    await f.activate(f.button('cancel'));assert.equal(f.calls.filter(c=>c.body.action==='manage').at(-1).body.intent,'cancel');
  }finally{f.w.close();}
});

test('Play does not display the Stripe retention promise, even with malformed mixed provider fields',async()=>{
  const active={...free,entitled:true,provider:'play',expiresAt:Date.now()+86400000,canManage:true,retentionEligible:true,retentionOffer:{percentOff:50,months:3}};
  assert.equal(api.retentionEligible(active),false);
  const f=await fixture({native:true,invoke:async()=>({data:active})});
  try{
    f.w.MatchAppPro.open();await tick();await tick();await f.activate(f.button('cancel'));
    assert.equal(f.button('retain'),undefined);assert.ok(f.messages.some(m=>m.type==='prepare_retention'));assert.ok(f.button('continueCancel'));
    assert.ok(!f.w.document.querySelector('.ma-pro-dialog').textContent.includes('50%'));
    await f.activate(f.button('continueCancel'));assert.ok(f.messages.some(m=>m.type==='manage'));
    assert.ok(!f.calls.some(c=>['retain','manage','checkout','catalog'].includes(c.body.action)));
  }finally{f.w.close();}
});

test('native retention requires a real paid monthly discount and ongoing renewal phase',()=>{
  assert.equal(api.playRetentionOffers([nativeRetentionOffer]).length,1);
  const first=nativeRetentionOffer.pricingPhases[0],last=nativeRetentionOffer.pricingPhases[1];
  for(const bad of [
    {...nativeRetentionOffer,offerId:null},{...nativeRetentionOffer,offerId:'invented?id'},{...nativeRetentionOffer,basePlanId:''},
    {...nativeRetentionOffer,pricingPhases:[first]},{...nativeRetentionOffer,pricingPhases:[{...first,priceAmountMicros:0},last]},
    {...nativeRetentionOffer,pricingPhases:[{...first,priceAmountMicros:last.priceAmountMicros},last]},
    {...nativeRetentionOffer,pricingPhases:[{...first,currencyCode:'USD'},last]},
    {...nativeRetentionOffer,pricingPhases:[{...first,billingPeriod:'P1Y'},last]},
    {...nativeRetentionOffer,pricingPhases:[{...first,recurrenceMode:1},last]}
  ])assert.deepEqual(api.playRetentionOffers([bad]),[]);
  assert.equal(api.playOffers([{...nativeOffer,offerId:null,pricingPhases:[last]}]).length,1,'ordinary base-plan quotes remain valid');
});

test('all fourteen native cancellation panels wait for the exact Play quote and a separate trusted acceptance',async()=>{
  const active={...free,entitled:true,provider:'play',expiresAt:Date.now()+86400000,canManage:true};
  for(const lang of api.languages){
    const f=await fixture({native:true,lang,invoke:async()=>({data:active})});
    try{
      f.w.MatchAppPro.open();await tick();await tick();assert.equal(f.messages.filter(m=>m.type==='prepare_retention').length,0);
      f.button('cancel').click();await tick();assert.equal(f.messages.filter(m=>m.type==='prepare_retention').length,0,'synthetic cancellation cannot request an offer');
      await f.activate(f.button('cancel'));const request=f.messages.find(m=>m.type==='prepare_retention');assert.ok(request);assert.equal(request.accessToken,'test-auth-token');
      const cancel=f.button('continueCancel'),quote=f.w.document.querySelector('.ma-pro-offers');assert.ok(cancel);assert.ok(cancel.compareDocumentPosition(quote)&f.w.Node.DOCUMENT_POSITION_FOLLOWING,'management precedes the quote reservation');
      assert.equal(f.button('nativeRetentionConfirm'),undefined);assert.equal(f.w.document.querySelectorAll('.ma-pro-offer').length,0);assert.ok(!f.w.document.querySelector('.ma-pro-dialog').textContent.includes('50%'));
      const chargeAt=Date.now()+86400000,send=detail=>f.w.dispatchEvent(new f.w.CustomEvent('matchapp:billing',{detail:{requestId:request.requestId,status:'ready',purpose:'retention',chargeAt,offers:[nativeRetentionOffer],serverVerified:false,...detail}}));
      send({requestId:'old-document'});assert.equal(f.button('nativeRetentionConfirm'),undefined);
      send({});const dialog=f.w.document.querySelector('.ma-pro-dialog');assert.equal(dialog.lang,lang);assert.equal(dialog.dir,lang==='ar'?'rtl':'ltr');
      assert.ok(dialog.textContent.includes('R$ 4,95'));assert.ok(dialog.textContent.includes('R$ 9,90'));assert.ok(dialog.textContent.includes(api.phaseText(nativeRetentionOffer.pricingPhases[0],lang)));assert.ok(dialog.textContent.includes(api.phaseText(nativeRetentionOffer.pricingPhases[1],lang)));
      const date=new Intl.DateTimeFormat(lang,{dateStyle:'medium'}).format(chargeAt);assert.ok(dialog.textContent.includes(api.text(lang,'nativeRetentionDate',{date})));
      assert.equal(f.messages.filter(m=>m.type==='launch').length,0);f.button('nativeRetentionConfirm').click();await tick();assert.equal(f.messages.filter(m=>m.type==='launch').length,0);
      await f.activate(f.button('nativeRetentionConfirm'));assert.equal(f.messages.filter(m=>m.type==='launch').length,1);assert.equal(f.messages.find(m=>m.type==='launch').offerKey,nativeRetentionOffer.offerKey);assert.ok(f.button('continueCancel'));
      assert.equal(f.provider.onclick,f.handler);assert.equal(f.w.document.getElementById('locked-ad').outerHTML,f.originalAd);assert.ok(!f.calls.some(c=>['retain','manage','checkout','catalog'].includes(c.body.action)));
    }finally{f.w.close();}
  }
});

test('native cancellation can bypass an in-flight offer lookup without reopening or accepting it',async()=>{
  const active={...free,entitled:true,provider:'play',expiresAt:Date.now()+86400000,canManage:true};
  const f=await fixture({native:true,invoke:async()=>({data:active})});let resolveSession;
  try{
    f.w.MatchAppPro.open();await tick();await tick();
    f.w.supabaseClient.auth.getSession=()=>new Promise(resolve=>{resolveSession=resolve;});
    await f.activate(f.button('cancel'));assert.ok(f.button('continueCancel'));assert.equal(f.messages.filter(m=>m.type==='prepare_retention').length,0);
    await f.activate(f.button('continueCancel'));assert.equal(f.messages.filter(m=>m.type==='manage').length,1);
    resolveSession({data:{session:{user:{id:'account-one'},access_token:'test-auth-token'}}});await tick();await tick();
    assert.equal(f.messages.filter(m=>m.type==='prepare_retention').length,0);assert.equal(f.messages.filter(m=>m.type==='launch').length,0);assert.equal(f.w.document.querySelector('.ma-pro-native-retention'),null);
  }finally{f.w.close();}
});

test('native retention rejects wrong-purpose, expired or malformed quotes and never retries checkout automatically',async()=>{
  const active={...free,entitled:true,provider:'play',expiresAt:Date.now()+86400000,canManage:true};
  for(const invalid of ['purpose','date','prices']){
    const f=await fixture({native:true,invoke:async()=>({data:active})});
    try{
      f.w.MatchAppPro.open();await tick();await tick();await f.activate(f.button('cancel'));const request=f.messages.find(m=>m.type==='prepare_retention');
      const detail={requestId:request.requestId,status:'ready',purpose:'retention',chargeAt:Date.now()+86400000,offers:[nativeRetentionOffer]};
      if(invalid==='purpose')delete detail.purpose;if(invalid==='date')detail.chargeAt=Date.now()-1;if(invalid==='prices')detail.offers=[{...nativeRetentionOffer,offerId:null}];
      f.w.dispatchEvent(new f.w.CustomEvent('matchapp:billing',{detail}));assert.equal(f.button('nativeRetentionConfirm'),undefined);assert.ok(f.button('continueCancel'));assert.ok(f.w.document.querySelector('.ma-pro-state').textContent.includes(api.text('en','nativeRetentionUnavailable')));
      assert.equal(f.messages.filter(m=>m.type==='launch').length,0);assert.equal(f.messages.filter(m=>m.type==='prepare_retention').length,1);
    }finally{f.w.close();}
  }
  const f=await fixture({native:true,invoke:async()=>({data:active})});
  try{
    f.w.MatchAppPro.open();await tick();await tick();await f.activate(f.button('cancel'));const request=f.messages.find(m=>m.type==='prepare_retention'),chargeAt=Date.now()+86400000;
    const emit=detail=>f.w.dispatchEvent(new f.w.CustomEvent('matchapp:billing',{detail:{requestId:request.requestId,...detail}}));
    emit({status:'ready',purpose:'retention',chargeAt,offers:[nativeRetentionOffer]});emit({status:'ready',reason:'user_gesture_required'});assert.ok(f.button('nativeRetentionConfirm'),'a matching live quote survives the gesture reminder');
    const now=f.w.Date.now();f.w.Date.now=()=>now+56000;await f.activate(f.button('nativeRetentionConfirm'));assert.equal(f.messages.filter(m=>m.type==='launch').length,0);assert.equal(f.button('nativeRetentionConfirm'),undefined);assert.ok(f.button('continueCancel'));
    emit({status:'unavailable',reason:'offer_refresh_required'});assert.equal(f.messages.filter(m=>m.type==='prepare_retention').length,1);assert.ok(f.button('refresh'));
  }finally{f.w.close();}
});

test('a web-purchased Pro subscription in Android keeps web management guidance and never opens Play cancellation',async()=>{
  const active={...free,entitled:true,provider:'stripe',expiresAt:Date.now()+86400000,canManage:true};
  for(const lang of api.languages){const f=await fixture({native:true,lang,invoke:async()=>({data:active})});
    try{
      f.w.MatchAppPro.open();await tick();await tick();assert.ok(f.w.document.querySelector('.ma-pro-state').textContent.includes(api.text(lang,'legacyWebNote')));assert.equal(f.button('cancel'),undefined);assert.equal(f.button('manage'),undefined);assert.ok(f.button('restore'));
      assert.ok(!f.messages.some(m=>['prepare_retention','manage','launch'].includes(m.type)));assert.equal(f.w.MatchAppPro.isEntitled(),true);
    }finally{f.w.close();}
  }
});

test('pending retention never confirms a discount and stale-account callbacks cannot restore the old quote',async()=>{
  const active={...free,entitled:true,provider:'play',expiresAt:Date.now()+86400000,canManage:true};
  const f=await fixture({native:true,invoke:async()=>({data:active})});
  try{
    f.w.MatchAppPro.open();await tick();await tick();await f.activate(f.button('cancel'));const request=f.messages.find(m=>m.type==='prepare_retention');
    const emit=detail=>f.w.dispatchEvent(new f.w.CustomEvent('matchapp:billing',{detail:{requestId:request.requestId,...detail}}));
    emit({status:'ready',purpose:'retention',chargeAt:Date.now()+86400000,offers:[nativeRetentionOffer]});await f.activate(f.button('nativeRetentionConfirm'));
    const reads=f.calls.filter(c=>c.body.action==='status').length;
    for(const detail of [{status:'pending',serverVerified:false},{status:'verified',serverVerified:false}]){
      emit(detail);await tick();assert.ok(f.button('continueCancel'));assert.equal(f.calls.filter(c=>c.body.action==='status').length,reads);assert.ok(!f.w.document.querySelector('.ma-pro-state').textContent.includes(api.text('en','retained')));assert.equal(f.w.MatchAppPro.isEntitled(),true,'the pre-existing plan remains active; no new benefit is granted');
    }
    emit({status:'verified',serverVerified:true});await tick();await tick();assert.equal(f.calls.filter(c=>c.body.action==='status').length,reads+1);assert.equal(f.w.document.querySelector('.ma-pro-native-retention'),null);assert.ok(!f.w.document.querySelector('.ma-pro-state').textContent.includes(api.text('en','retained')),'active Pro status alone does not confirm a retention discount');
    f.setSession(null);f.w.document.dispatchEvent(new f.w.CustomEvent('matchapp:authchange'));await tick();await tick();
    emit({status:'ready',purpose:'retention',chargeAt:Date.now()+86400000,offers:[nativeRetentionOffer]});emit({status:'verified',serverVerified:true});await tick();
    assert.equal(f.w.MatchAppPro.isEntitled(),false);assert.equal(f.button('nativeRetentionConfirm'),undefined);assert.equal(f.w.document.querySelector('.ma-pro-native-retention'),null);assert.ok(f.messages.some(m=>m.type==='clear'));
  }finally{f.w.close();}
});

test('verified existing recurring plans block new Pro and retain web management in all fourteen languages',async()=>{
  const legacy={...free,hasLegacySubscription:true,provider:'stripe',canManage:true};
  assert.equal(api.legacySubscription(legacy),true);
  for(const bad of [{...legacy,ok:false},{...legacy,hasLegacySubscription:'true'},{...legacy,canManage:false},{...legacy,provider:'play'}])assert.equal(api.legacySubscription(bad),false);
  assert.equal(api.retentionEligible({...legacy,entitled:true,expiresAt:Date.now()+60000,retentionEligible:true,retentionOffer:{percentOff:50,months:3}}),false);
  for(const lang of api.languages){
    const f=await fixture({lang,invoke:async(name,{body})=>({data:body.action==='catalog'?offer():body.action==='manage'?{ok:false}:legacy})});
    try{
      f.w.MatchAppPro.open();await tick();await tick();
      assert.equal(f.w.MatchAppPro.isEntitled(),false);
      assert.ok(f.w.document.querySelector('.ma-pro-state').textContent.includes(api.text(lang,'legacyPlan')),lang);
      assert.equal(f.w.document.querySelector('.ma-pro-price'),null);
      assert.ok(f.button('manageExisting'));assert.ok(f.button('cancel'));
      assert.ok(![...f.w.document.querySelectorAll('.ma-pro-actions button')].some(b=>b.textContent.includes(api.price(api.catalogOffer(offer()),lang))));
      await f.activate(f.button('manageExisting'));
      assert.deepEqual(plain(f.calls.find(c=>c.body.action==='manage').body),{action:'manage',intent:'manage',lang});
      assert.ok(!f.calls.some(c=>['checkout','retain'].includes(c.body.action)));
      assert.equal(f.w.localStorage.getItem('match_isVIP'),'true');assert.equal(f.w.localStorage.getItem('match_guestBonusMatches'),'7');
      assert.equal(f.provider.onclick,f.handler);
    }finally{f.w.close();}
  }
});

test('an existing web subscriber in Android is not offered duplicate Play billing or sent to the wrong management provider',async()=>{
  for(const lang of api.languages){
    const f=await fixture({native:true,lang,invoke:async()=>({data:{...free,hasLegacySubscription:true,provider:'stripe',canManage:true}})});
    try{
      f.w.MatchAppPro.open();await tick();await tick();
      assert.ok(f.w.document.querySelector('.ma-pro-state').textContent.includes(api.text(lang,'legacyWebNote')),lang);
      assert.equal(f.messages.some(m=>['prepare','launch','manage'].includes(m.type)),false);
      assert.equal(f.button('manage'),undefined);assert.equal(f.button('manageExisting'),undefined);assert.equal(f.button('cancel'),undefined);
      assert.ok(f.button('restore'));await f.activate(f.button('restore'));
      assert.equal(f.messages.filter(m=>m.type==='restore').length,1);
      assert.ok(!f.calls.some(c=>['catalog','checkout','manage','retain'].includes(c.body.action)));
      assert.equal(f.w.MatchAppPro.isEntitled(),false);
    }finally{f.w.close();}
  }
});

test('a legacy plan activated after the quote is reconciled after checkout rejection without trusting its error payload',async()=>{
  let legacy=false;
  const f=await fixture({invoke:async(name,{body})=>{
    if(body.action==='checkout'){legacy=true;return {data:{ok:false,error:'legacy_subscription_active',hasLegacySubscription:true,canManage:true,provider:'stripe'}};}
    return {data:body.action==='catalog'?offer():legacy?{...free,hasLegacySubscription:true,provider:'stripe',canManage:true}:free};
  }});
  try{
    f.w.MatchAppPro.open();await tick();await tick();
    const subscribe=[...f.w.document.querySelectorAll('.ma-pro-actions button')].find(b=>b.textContent.includes('$4.99'));await f.activate(subscribe);await tick();
    assert.equal(f.calls.filter(c=>c.body.action==='checkout').length,1);assert.equal(f.calls.filter(c=>c.body.action==='status').length,2);
    assert.ok(f.w.document.querySelector('.ma-pro-state').textContent.includes(api.text('en','legacyPlan')));
    assert.ok(f.button('manageExisting'));assert.equal(f.w.MatchAppPro.isEntitled(),false);
    assert.equal(f.w.document.querySelector('.ma-pro-price'),null);
  }finally{f.w.close();}
});

test('enabled pricing publishes the same localized market price as its structured offer and clears both on disable',async()=>{
  const markup=fs.readFileSync(path.join(__dirname,'../pricing/pricing.html'),'utf8');
  const build=fs.readFileSync(path.join(__dirname,'../build-meta.js'),'utf8');
  for(const lang of api.languages){
    const f=await fixture({lang,markup,tokenEnabled:false,url:'https://matchapp.tv/pricing/pricing.html',invoke:async()=>({data:offer('brl',990,'BR')})});
    try{
      assert.deepEqual(f.calls,[]);assert.equal(f.w.document.querySelector('[data-pro-pricing]').hidden,true);
      f.w.eval(build);
      const legacyTitle=f.w.document.title;
      f.w.MatchAppTokens.enabled=true;f.w.document.dispatchEvent(new f.w.CustomEvent('matchapp:tokenpolicy'));await tick();await tick();
      assert.equal(f.calls.length,1);assert.equal(f.calls[0].body.action,'catalog');
      assert.equal(f.w.document.querySelector('[data-pro-pricing]').hidden,false);
      assert.equal(f.w.document.title,api.text(lang,'pricingTitle'));assert.equal(f.w.document.querySelector('meta[name="description"]').content,api.text(lang,'pricingDescription'));
      assert.ok(f.w.document.querySelector('.ma-pro-pricing-price').textContent.includes(api.price(api.catalogOffer(offer('brl',990,'BR')),lang)));
      assert.ok(f.w.document.querySelector('.ma-pro-pricing-market').textContent.trim());
      const catalog=JSON.parse(f.w.document.getElementById('matchapp-pricing-offers').textContent);
      assert.equal(catalog.itemListElement.length,1);assert.equal(catalog.itemListElement[0].price,'9.90');assert.equal(catalog.itemListElement[0].priceCurrency,'BRL');assert.equal(catalog.itemListElement[0].eligibleRegion.name,'BR');
      assert.equal(catalog.itemListElement[0].description,api.text(lang,'summary'));
      assert.equal(f.w.document.querySelector('.ma-pro-scrim'),null,'visiting pricing does not open a paywall');
      f.w.eval(build);assert.equal(f.w.document.title,api.text(lang,'pricingTitle'),'later metadata normalization does not restore a retired offer');
      f.w.MatchAppTokens.enabled=false;f.w.document.dispatchEvent(new f.w.CustomEvent('matchapp:tokenpolicy'));
      assert.equal(f.w.document.querySelector('[data-pro-pricing]').hidden,true);assert.deepEqual(JSON.parse(f.w.document.getElementById('matchapp-pricing-offers').textContent).itemListElement,[]);
      assert.equal(f.w.document.title,legacyTitle);assert.equal(JSON.parse(f.w.document.getElementById('matchapp-pricing-service').textContent).name,'MatchApp Ai');
    }finally{f.w.close();}
  }
});

test('pricing never advertises a disabled server quote or web prices inside Android',async()=>{
  const markup=fs.readFileSync(path.join(__dirname,'../pricing/pricing.html'),'utf8');
  for(const native of [false,true]){
    const f=await fixture({native,markup,tokenEnabled:true,url:'https://matchapp.tv/pricing/pricing.html',invoke:async()=>({data:{...offer(),enabled:false}})});
    try{
      await tick();assert.equal(f.w.document.querySelector('[data-pro-pricing]').hidden,false);
      assert.deepEqual(JSON.parse(f.w.document.getElementById('matchapp-pricing-offers').textContent).itemListElement,[]);
      assert.ok(!f.w.document.querySelector('.ma-pro-pricing-price').textContent.includes('$'));
      assert.equal(f.messages.length,0,'pricing never prepares native checkout without an explicit plan action');
      assert.equal(f.calls.length,native?0:1);
    }finally{f.w.close();}
  }
});
