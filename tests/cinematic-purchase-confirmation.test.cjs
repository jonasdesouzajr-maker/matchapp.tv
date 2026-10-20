const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const pro=require('../pro-plan.js');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const proSource=read('pro-plan.js');
const purchaseSource=read('purchase.js');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const settle=async()=>{await tick();await tick();await tick();};
const plain=value=>JSON.parse(JSON.stringify(value));
const session=id=>({user:{id},access_token:'local-test-token'});
const free={ok:true,entitled:false,provider:null,expiresAt:null,cancelAtPeriodEnd:false,canManage:false,retentionEligible:false};
const entitled=provider=>({...free,entitled:true,provider,expiresAt:Date.now()+86400000,canManage:true});
const catalog={ok:true,enabled:true,offer:{priceId:'price_live123',currency:'usd',amount:499,fractionDigits:2,interval:'month',intervalCount:1,country:'US'},availableCountries:['US']};
const nativeOffer={offerKey:'e73f7ec4-bbd6-49cc-923b-006891e82f2f',basePlanId:'monthly',offerId:'',pricingPhases:[{formattedPrice:'$4.99',priceAmountMicros:4990000,currencyCode:'USD',billingPeriod:'P1M',billingCycleCount:0,recurrenceMode:1}]};

async function purchaseFixture({reply={data:{delivered:true,plan:'ad_free'}},signedIn=true,receipt='cs_live_receipt123',feedbackThrows=false}={}){
  const w=new JSDOM('<main><section class="premium-card"><h1>Purchase</h1><div id="purchase-status"></div><button id="purchase-retry">Retry</button><a id="purchase-signin" hidden>Sign in</a><a id="purchase-continue" hidden>Continue</a></section></main>',{url:'https://matchapp.tv/purchase.html'+(receipt===null?'':'?session_id='+encodeURIComponent(receipt)),runScripts:'outside-only'}).window;
  const calls=[],sounds=[];
  // Advance the existing finite retry loop without executing automatic navigation.
  w.setTimeout=(fn,ms)=>{if(ms<5000)queueMicrotask(fn);return 1;};
  w.supabaseClient={auth:{getSession:async()=>({data:{session:signedIn?session('account-one'):null}})},functions:{invoke:async(name,args)=>{calls.push({name,body:plain(args.body)});return typeof reply==='function'?reply():reply;}},rpc:async()=>({data:{}})};
  w.MatchAppFeedback={purchaseConfirmed:evidence=>{sounds.push(plain(evidence));if(feedbackThrows)throw Error('presentation unavailable');}};
  w.eval(purchaseSource);await settle();
  return {w,calls,sounds};
}

async function proFixture({native=false,url='https://matchapp.tv/',signedIn=true,invoke}={}){
  const w=new JSDOM('<html lang="en"><body><main><div data-matchapp-pro-entry></div></main></body></html>',{url,runScripts:'outside-only',pretendToBeVisual:true}).window;
  w.MATCH_LANG='en';w.matchMedia=()=>({matches:false});
  const calls=[],messages=[],sounds=[],handlers=new WeakMap();
  const add=w.EventTarget.prototype.addEventListener;
  w.EventTarget.prototype.addEventListener=function(type,handler,...rest){if(type==='click'){const entries=handlers.get(this)||[];entries.push(handler);handlers.set(this,entries);}return add.call(this,type,handler,...rest);};
  let auth=signedIn?session('account-one'):null;
  w.supabaseClient={auth:{getSession:async()=>({data:{session:auth}})},functions:{invoke:async(name,args)=>{calls.push({name,body:plain(args.body)});return invoke?invoke(name,args):{data:args.body.action==='catalog'?catalog:free};}}};
  w.MatchAppFeedback={purchaseConfirmed:evidence=>sounds.push(plain(evidence))};
  if(native)w.MatchAppNativeBilling={postMessage:value=>messages.push(JSON.parse(value))};
  w.eval(proSource);await settle();
  return {w,calls,messages,sounds,setSession:value=>{auth=value;},
    button:key=>[...w.document.querySelectorAll('.ma-pro-actions button,.ma-pro-management-escape button')].find(button=>button.textContent===pro.text('en',key)),
    activate:async button=>{assert.ok(button,'expected existing control');for(const handler of handlers.get(button)||[])handler({isTrusted:true});await settle();},
    event:async detail=>{w.dispatchEvent(new w.CustomEvent('matchapp:billing',{detail}));await settle();}};
}

async function nativeLaunch(f){
  f.w.MatchAppPro.open();await settle();
  const prepared=f.messages.findLast(message=>message.type==='prepare');assert.ok(prepared,'existing native preparation');
  await f.event({requestId:prepared.requestId,status:'ready',serverVerified:false,offers:[nativeOffer]});
  assert.deepEqual(f.sounds,[],'quotes have no purchase sound');
  await f.activate(f.button('checkout'));
  assert.equal(f.messages.findLast(message=>message.type==='launch')?.requestId,prepared.requestId);
  assert.deepEqual(f.sounds,[],'Buy/launch has no purchase sound');
  return prepared.requestId;
}

test('ordinary checkout sounds only after strict signed-in server delivery; sound failure cannot block confirmation',async()=>{
  for(const feedbackThrows of [false,true]){
    const f=await purchaseFixture({feedbackThrows});
    try{
      assert.deepEqual(f.sounds,[{provider:'stripe',reference:'cs_live_receipt123',delivered:true}]);
      assert.equal(f.calls.length,1);assert.equal(f.calls[0].name,'stripe-checkout');
      assert.deepEqual(f.calls[0].body,{action:'status',session_id:'cs_live_receipt123'});
      assert.equal(f.w.document.querySelector('h1').textContent,'Purchase complete');
      assert.equal(f.w.document.getElementById('purchase-continue').hidden,false);
    }finally{f.w.close();}
  }
});

test('ordinary checkout redirect, signed-out, pending, failure and non-Boolean delivery remain silent',async()=>{
  const cases=[
    {name:'missing receipt',receipt:null},
    {name:'invalid receipt',receipt:'not-a-checkout'},
    {name:'signed out',signedIn:false},
    {name:'pending',reply:{data:{delivered:false,state:'pending'}}},
    {name:'failed',reply:{data:{delivered:false,state:'failed'}}},
    {name:'non-Boolean delivery',reply:{data:{delivered:'true'}}},
    {name:'invoke error wins over payload',reply:{data:{delivered:true},error:{message:'unverified'}}},
    {name:'network error',reply:()=>{throw Error('offline');}}
  ];
  for(const config of cases){
    const f=await purchaseFixture(config);
    try{
      assert.deepEqual(f.sounds,[],config.name);
      assert.equal(f.w.document.getElementById('purchase-continue').hidden,true,config.name);
      if(config.receipt===null||config.receipt==='not-a-checkout'||config.signedIn===false)assert.equal(f.calls.length,0,config.name);
      else assert.ok(f.calls.length<=6,'existing finite retry budget');
    }finally{f.w.close();}
  }
});

test('web Pro sounds once for a validated receipt plus strict delivered Stripe entitlement',async()=>{
  const f=await proFixture({url:'https://matchapp.tv/pricing/pricing.html?pro_return=1&session_id=cs_live_pro123&lang=en',invoke:async(name,{body})=>({data:body.action==='catalog'?catalog:{...entitled('stripe'),checkoutDelivered:true}})});
  try{
    assert.equal(f.w.location.search,'?lang=en','receipt is removed from the displayed return URL');
    assert.deepEqual(f.sounds,[{provider:'stripe',reference:'cs_live_pro123',delivered:true}]);
    assert.equal(f.calls.find(call=>call.body.action==='status').body.sessionId,'cs_live_pro123');
    await f.w.MatchAppPro.refresh({prepare:false});await settle();
    assert.equal(f.sounds.length,1,'ordinary active-entitlement refresh is silent');
    assert.equal(f.calls.filter(call=>call.body.action==='status').at(-1).body.sessionId,undefined,'receipt is consumed');
  }finally{f.w.close();}
});

test('web Pro never infers purchase from generic active status, pending, provider mismatch or failed verification',async()=>{
  const returnUrl='https://matchapp.tv/pricing/pricing.html?pro_return=1&session_id=cs_live_pro123';
  const cases=[
    {name:'active without receipt',url:'https://matchapp.tv/',data:{...entitled('stripe'),checkoutDelivered:true},open:true},
    {name:'active without delivery field',data:entitled('stripe')},
    {name:'pending checkout',data:{...entitled('stripe'),checkoutDelivered:false}},
    {name:'delivery string',data:{...entitled('stripe'),checkoutDelivered:'true'}},
    {name:'unentitled',data:{...free,checkoutDelivered:true}},
    {name:'wrong provider',data:{...entitled('play'),checkoutDelivered:true}},
    {name:'expired',data:{...entitled('stripe'),expiresAt:Date.now()-1,checkoutDelivered:true}},
    {name:'status error',data:{...entitled('stripe'),checkoutDelivered:true},error:{message:'failed verification'}},
    {name:'signed out',signedIn:false,data:{...entitled('stripe'),checkoutDelivered:true}},
    {name:'invalid receipt',url:'https://matchapp.tv/pricing/pricing.html?pro_return=1&session_id=invalid',data:{...entitled('stripe'),checkoutDelivered:true}}
  ];
  for(const config of cases){
    const f=await proFixture({url:config.url||returnUrl,signedIn:config.signedIn,invoke:async(name,{body})=>body.action==='catalog'?{data:catalog}:{data:config.data,error:config.error}});
    try{if(config.open){f.w.MatchAppPro.open();await settle();}assert.deepEqual(f.sounds,[],config.name);}finally{f.w.close();}
  }
});

test('web Pro ignores a receipt result invalidated by an account change',async()=>{
  let resolveStatus,first=true;
  const f=await proFixture({url:'https://matchapp.tv/pricing/pricing.html?pro_return=1&session_id=cs_live_pro123',invoke:async(name,{body})=>{
    if(body.action==='catalog')return {data:catalog};
    if(first){first=false;return new Promise(resolve=>{resolveStatus=resolve;});}
    return {data:entitled('stripe')};
  }});
  try{
    assert.equal(typeof resolveStatus,'function');
    f.setSession(session('account-two'));
    f.w.document.dispatchEvent(new f.w.CustomEvent('matchapp:authchange',{detail:{signedIn:true}}));
    await new Promise(resolve=>f.w.setTimeout(resolve,0));await settle();
    resolveStatus({data:{...entitled('stripe'),checkoutDelivered:true}});await settle();
    assert.deepEqual(f.sounds,[],'old-account checkout result cannot cue for the new account');
  }finally{f.w.close();}
});

test('web Pro rechecks local session identity even when account change emits no event',async()=>{
  let resolveStatus;
  const f=await proFixture({url:'https://matchapp.tv/pricing/pricing.html?pro_return=1&session_id=cs_live_pro123',invoke:async(name,{body})=>{
    if(body.action==='catalog')return {data:catalog};
    return new Promise(resolve=>{resolveStatus=resolve;});
  }});
  try{
    assert.equal(typeof resolveStatus,'function');
    f.setSession(session('account-two'));
    resolveStatus({data:{...entitled('stripe'),checkoutDelivered:true}});await settle();
    assert.deepEqual(f.sounds,[],'the latest local identity must still match the receipt account');
    assert.equal(f.calls.filter(call=>call.body.action==='status').length,1,'presentation identity recheck adds no billing call');
  }finally{f.w.close();}
});

test('native Pro sounds once after trusted correlated launch, verified callback and refreshed Play entitlement',async()=>{
  let backend=free;
  const f=await proFixture({native:true,invoke:async()=>({data:backend})});
  try{
    const requestId=await nativeLaunch(f);backend=entitled('play');
    await f.event({requestId,status:'verified',serverVerified:true});
    assert.deepEqual(f.sounds,[{provider:'play',reference:requestId,delivered:true}]);
    await f.event({requestId,status:'verified',serverVerified:true});
    await f.w.MatchAppPro.refresh({prepare:false});
    assert.equal(f.sounds.length,1,'replayed delivery and active refresh have no extra sound');
  }finally{f.w.close();}
});

test('native Pro requires every launch, callback and refreshed-entitlement condition',async()=>{
  const cases=[
    {name:'unlaunched verified callback',launch:false,status:'verified',serverVerified:true,backend:entitled('play')},
    {name:'uncorrelated callback',requestId:'00000000-0000-4000-8000-000000000000',status:'verified',serverVerified:true,backend:entitled('play')},
    {name:'unverified callback',status:'verified',serverVerified:false,backend:entitled('play')},
    {name:'non-Boolean verification',status:'verified',serverVerified:'true',backend:entitled('play')},
    {name:'already entitled',status:'already_entitled',serverVerified:true,backend:entitled('play')},
    {name:'pending',status:'pending',serverVerified:true,backend:entitled('play')},
    {name:'cancelled',status:'cancelled',serverVerified:true,backend:entitled('play')},
    {name:'no backend entitlement',status:'verified',serverVerified:true,backend:free},
    {name:'wrong entitlement provider',status:'verified',serverVerified:true,backend:entitled('stripe')},
    {name:'expired entitlement',status:'verified',serverVerified:true,backend:{...entitled('play'),expiresAt:Date.now()-1}},
    {name:'backend failure',status:'verified',serverVerified:true,error:true}
  ];
  for(const config of cases){
    let backend=free,error=false;
    const f=await proFixture({native:true,invoke:async()=>error?{error:{message:'status unavailable'}}:{data:backend}});
    try{
      let requestId;
      if(config.launch===false){f.w.MatchAppPro.open();await settle();requestId=f.messages.findLast(message=>message.type==='prepare').requestId;}
      else requestId=await nativeLaunch(f);
      backend=config.backend;error=!!config.error;
      await f.event({requestId:config.requestId||requestId,status:config.status,serverVerified:config.serverVerified});
      assert.deepEqual(f.sounds,[],config.name);
    }finally{f.w.close();}
  }
});

test('native Pro restore and stale account callbacks remain silent',async()=>{
  for(const mode of ['restore','account-change']){
    let backend=free;
    const f=await proFixture({native:true,invoke:async()=>({data:backend})});
    try{
      let requestId=await nativeLaunch(f);
      if(mode==='restore'){
        await f.event({requestId:'native-resume',status:'restore_required'});
        requestId=f.messages.findLast(message=>message.type==='restore').requestId;
      }else{
        f.setSession(session('account-two'));
        f.w.document.dispatchEvent(new f.w.CustomEvent('matchapp:authchange',{detail:{signedIn:true}}));
        await new Promise(resolve=>f.w.setTimeout(resolve,0));await settle();
      }
      backend=entitled('play');await f.event({requestId,status:'verified',serverVerified:true});
      assert.deepEqual(f.sounds,[],mode);
    }finally{f.w.close();}
  }
});

test('native Pro rechecks local session identity after status even without an auth event',async()=>{
  let resolveStatus,statusPending=false;
  const f=await proFixture({native:true,invoke:async()=>statusPending?new Promise(resolve=>{resolveStatus=resolve;}):{data:free}});
  try{
    const requestId=await nativeLaunch(f);statusPending=true;
    await f.event({requestId,status:'verified',serverVerified:true});
    assert.equal(typeof resolveStatus,'function');
    f.setSession(session('account-two'));
    resolveStatus({data:entitled('play')});await settle();
    assert.deepEqual(f.sounds,[],'verified callback cannot announce an old-account purchase');
    assert.equal(f.calls.filter(call=>call.body.action==='status').length,2,'only initial and existing post-verification status reads run');
  }finally{f.w.close();}
});

test('native Pro terminal cancellation invalidates later verified callbacks for that launch',async()=>{
  let backend=free;
  const f=await proFixture({native:true,invoke:async()=>({data:backend})});
  try{
    const requestId=await nativeLaunch(f);
    await f.event({requestId,status:'cancelled',serverVerified:false});
    backend=entitled('play');await f.event({requestId,status:'verified',serverVerified:true});
    assert.deepEqual(f.sounds,[],'a terminally cancelled launch cannot later authorize a cash cue');
  }finally{f.w.close();}
});

test('native Pro retention confirmation does not claim a new purchase',async()=>{
  const f=await proFixture({native:true,invoke:async()=>({data:entitled('play')})});
  try{
    f.w.MatchAppPro.open();await settle();await f.activate(f.button('cancel'));
    const prepared=f.messages.findLast(message=>message.type==='prepare_retention');assert.ok(prepared);
    const discounted={...nativeOffer,offerId:'retention-offer',pricingPhases:[{...nativeOffer.pricingPhases[0],formattedPrice:'$2.49',priceAmountMicros:2490000,billingCycleCount:3,recurrenceMode:2},nativeOffer.pricingPhases[0]]};
    await f.event({requestId:prepared.requestId,status:'ready',purpose:'retention',chargeAt:Date.now()+86400000,offers:[discounted]});
    await f.activate(f.button('nativeRetentionConfirm'));
    assert.equal(f.messages.findLast(message=>message.type==='launch')?.requestId,prepared.requestId);
    await f.event({requestId:prepared.requestId,status:'verified',serverVerified:true});
    assert.deepEqual(f.sounds,[],'a retention offer does not establish a new payment');
  }finally{f.w.close();}
});

// Execute the actual status branch with local collaborators: this checks the
// additive presentation contract without invoking Stripe, Supabase or fulfillment.
const backendSource=read('supabase/functions/pro-billing/index.ts');
const statusStart=backendSource.indexOf("    if(action==='status'){");
const statusEnd=backendSource.indexOf("    if(action==='checkout'){",statusStart);
assert.ok(statusStart>=0&&statusEnd>statusStart,'existing status and checkout branches');
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const executeStatus=new AsyncFunction('body','db','stripe','user','proBillingState','confirmProCheckout','publicProBillingState','latestStripe','syncProSubscription','reply',"let state=await proBillingState(db,user.id);const legacy={hasLegacySubscription:false};const action='status';\n"+backendSource.slice(statusStart,statusEnd));
async function statusFixture(options={}){
  const {receipt=true,retention=false,confirmError=false}=options;
  const delivered=Object.hasOwn(options,'delivered')?options.delivered:true;
  const calls={confirm:[],sync:[],reads:0};
  const result=await executeStatus(receipt?{sessionId:'cs_live_backend123'}:{},{}, {},{id:'account-one'},
    async()=>{calls.reads++;return entitled('stripe');},
    async(...args)=>{calls.confirm.push(args);if(confirmError)throw Error('verification failed');return {delivered};},
    state=>state,
    ()=>retention?{external_id:'sub_existing'}:null,
    async(...args)=>{calls.sync.push(args);return {retentionEligible:true};},
    value=>value);
  return {result,calls};
}

test('Pro status presentation field is strict, receipt-scoped, and reuses exactly one existing confirmation',async()=>{
  for(const delivered of [true,false,'true',undefined]){
    const {result,calls}=await statusFixture({delivered});
    assert.equal(result.checkoutDelivered,delivered===true);
    assert.equal(calls.confirm.length,1,'no added verification/fulfillment calls');
    assert.equal(calls.confirm[0][2],'cs_live_backend123');assert.equal(calls.confirm[0][3],'account-one');
    assert.equal(calls.reads,2,'existing state refresh is preserved');
  }
  const {result,calls}=await statusFixture({receipt:false});
  assert.equal(Object.hasOwn(result,'checkoutDelivered'),false,'existing entitlement alone carries no purchase proof');
  assert.equal(calls.confirm.length,0);assert.equal(calls.reads,1);
  await assert.rejects(statusFixture({confirmError:true}),/verification failed/,'failed verification cannot produce delivery evidence');
});

test('Pro status retains strict delivery presentation through existing Stripe synchronization and retention reply',async()=>{
  for(const delivered of [true,false]){
    const {result,calls}=await statusFixture({retention:true,delivered});
    assert.equal(result.checkoutDelivered,delivered);assert.equal(result.retentionEligible,true);
    assert.deepEqual(result.retentionOffer,{percentOff:50,months:3});
    assert.equal(calls.confirm.length,1);assert.equal(calls.sync.length,1);assert.equal(calls.reads,3);
  }
  const {result,calls}=await statusFixture({receipt:false,retention:true});
  assert.equal(Object.hasOwn(result,'checkoutDelivered'),false);assert.equal(calls.confirm.length,0);
});
