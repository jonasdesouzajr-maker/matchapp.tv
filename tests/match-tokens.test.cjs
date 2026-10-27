const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const api=require('../match-tokens.js');
const source=fs.readFileSync(path.join(__dirname,'../match-tokens.js'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const settle=async()=>{await tick();await tick();await tick();};
const publicPolicy={ok:true,enabled:true,policy_version:'match-tokens-v1',authenticated:false};
const wallet=(daily=3,extras=0,first=true,bonus=0)=>({...publicPolicy,authenticated:true,daily_limit:3,daily_remaining:daily,bonus_tokens:bonus,purchased_matches:extras,remaining:daily+bonus,available_total:daily+bonus+extras,unlimited:false,first_match_pending:first,next_reset_at:new Date(Date.now()+86400000).toISOString(),ad_free:false,pro_active:false,rewarded_available:true});

async function fixture({signedIn=true,initial=wallet(),native=false,url='https://matchapp.tv/',rpc,reward}={}){
  const w=new JSDOM('<html lang="en"><body><button id="original">Existing control</button><a id="quota-badge"></a><main id="result-box"><div class="match-result-toolbar"><div id="result-quota-corner"></div><button id="share">Share</button></div><a id="provider" href="https://www.netflix.com/title/123">Original streaming CTA</a></main><div id="locked-ad"><ins data-ad-slot="2595698117"></ins></div><article><button id="btn-vip_monthly"></button></article></body></html>',{url,runScripts:'outside-only',pretendToBeVisual:true}).window;
  const calls=[],messages=[],toasts=[],handlers=new WeakMap();
  const originalAdd=w.EventTarget.prototype.addEventListener;
  w.EventTarget.prototype.addEventListener=function(type,fn,...rest){
    if(type==='click'){const list=handlers.get(this)||[];list.push(fn);handlers.set(this,list);}
    return originalAdd.call(this,type,fn,...rest);
  };
  let currentSession=signedIn?{user:{id:'account-one'},access_token:'test-session-token'}:null;
  let backend=initial;
  w.__matchappMatchRunId=1;w.MATCH_LANG='en';w.showToast=(...args)=>toasts.push(args);
  w.supabaseClient={auth:{getSession:async()=>({data:{session:currentSession}})},rpc:async(name,args)=>{
    calls.push({name,args});if(rpc)return rpc(name,args,{get backend(){return backend;},set backend(value){backend=value;}});
    return {data:backend};
  },functions:{invoke:async(name,args)=>{calls.push({name,body:args.body});return reward?reward(args.body):{data:{ok:false}};}}};
  if(native)w.MatchAppNativeRewards={postMessage:raw=>messages.push(JSON.parse(raw))};
  const provider=w.document.getElementById('provider');let clicks=0;const originalHandler=e=>{e.preventDefault();clicks++;};provider.onclick=originalHandler;
  const oldAd=w.document.getElementById('locked-ad').outerHTML;
  w.eval(source);await settle();
  return {w,calls,messages,toasts,provider,originalHandler,oldAd,clicks:()=>clicks,
    setWallet:value=>{backend=value;},setSession:value=>{currentSession=value;},
    button:key=>[...w.document.querySelectorAll('.ma-token-actions button')].find(button=>button.textContent===api.text(w.MATCH_LANG,key)),
    activate:async element=>{assert.ok(element,'owned control exists');for(const handler of handlers.get(element)||[])handler({isTrusted:true});await settle();},
    emit:(status,extra={})=>w.dispatchEvent(new w.CustomEvent('matchapp:rewarded',{detail:{requestId:messages.find(m=>m.type==='prepare')?.requestId,status,rewardEarned:false,serverVerified:false,...extra}}))};
}

test('strict public policy and wallet validation cannot promote legacy balances to Pro',()=>{
  assert.equal(api.policy(publicPolicy),true);
  for(const bad of [{...publicPolicy,enabled:'true'},{...publicPolicy,policy_version:'future'},{...publicPolicy,ok:false}])assert.equal(api.policy(bad),false);
  assert.ok(api.wallet(wallet(0,7,false,3)));
  for(const bad of [{...wallet(),available_total:999},{...wallet(),daily_remaining:-1},{...wallet(),remaining:9},{...wallet(),first_match_pending:undefined},{...wallet(),next_reset_at:'tomorrow'},{...wallet(),unlimited:true,available_total:null,is_vip:true}])assert.equal(api.wallet(bad),null);
  assert.ok(api.wallet({...wallet(),unlimited:true,pro_active:true,available_total:null}));
  assert.equal(api.wallet(publicPolicy),null,'public anonymous policy contains no server wallet');
});

test('all 14 languages author every token, consent, pending and separate Ask AI message',()=>{
  assert.equal(api.languages.length,14);
  for(const lang of api.languages){
    assert.equal(api.rows[lang].length,api.keys.length,lang);assert.ok(api.rows[lang].every(v=>typeof v==='string'&&v.trim()));
    assert.ok(api.text(lang,'askLimit').includes('Ask AI'));
    assert.ok(!api.text(lang,'daily',{remaining:2,limit:3}).includes('{'));
    if(lang!=='en')assert.notEqual(api.text(lang,'rewardNote'),api.text('en','rewardNote'));
  }
});

test('disabled server flag leaves the original quota path and controls authoritative',async()=>{
  const f=await fixture({initial:{...publicPolicy,enabled:false}});
  try{
    assert.equal(f.w.MatchAppTokens.enabled,false);
    assert.equal(await f.w.MatchAppTokens.beforeLookup(),null);assert.equal(await f.w.MatchAppTokens.consume(),null);
    assert.equal(f.w.MatchAppTokens.handleLimit('anon',{}),false);
    assert.equal(f.w.document.documentElement.hasAttribute('data-match-token-policy'),false);
    assert.equal(f.w.document.querySelector('.ma-token-corner'),null);
    assert.equal(f.provider.onclick,f.originalHandler);f.provider.click();assert.equal(f.clicks(),1);
    assert.equal(f.w.document.getElementById('locked-ad').outerHTML,f.oldAd);
    assert.ok(f.calls.every(c=>c.name==='match_token_status'));
  }finally{f.w.close();}
});

test('first usable result reveals only a quiet balance, with one debit and no panel or ad',async()=>{
  let spent=0;
  const f=await fixture({native:true,rpc:async(name,args,state)=>{
    if(name==='consume_match_token'){spent++;state.backend=wallet(2,0,false);return {data:{...state.backend,allowed:true,consumed:true,request_id:args.p_request_id}};}
    return {data:state.backend};
  }});
  try{
    f.provider.focus();assert.equal(await f.w.MatchAppTokens.beforeLookup(),true);assert.equal(spent,0);
    assert.equal(f.w.MatchAppTokens.hasValue,false);assert.equal(f.w.document.querySelector('.ma-token-scrim'),null);
    assert.equal(await f.w.MatchAppTokens.consume('match',{runId:1}),true);assert.equal(spent,1);
    await f.w.MatchAppTokens.refresh();assert.equal(f.w.MatchAppTokens.hasValue,false,'wallet refresh during render cannot unlock pre-value ads');
    f.w.MatchAppTokens.confirmResult('one_match',null,1);
    assert.equal(f.w.MatchAppTokens.hasValue,true);
    const balance=f.w.document.querySelector('[data-match-token-balance]');assert.equal(balance.hidden,false);assert.equal(balance.textContent,'2 Match tokens');
    assert.equal(f.w.document.querySelector('.ma-token-scrim'),null);assert.deepEqual(f.messages,[]);
    assert.equal(f.w.document.activeElement,f.provider);assert.equal(f.provider.onclick,f.originalHandler);assert.equal(f.provider.href,'https://www.netflix.com/title/123');
    assert.equal(f.w.document.getElementById('locked-ad').outerHTML,f.oldAd);
    assert.equal(f.calls.filter(c=>c.name==='consume_ai_action').length,0);
    await f.activate(balance);assert.equal(f.w.document.querySelector('.ma-token-scrim').hidden,false);
    assert.equal(f.button('reward'),undefined,'available tokens cannot present an ad choice');
  }finally{f.w.close();}
});

test('guest daily and previously earned balances still debit through the original guest mechanism',async()=>{
  const f=await fixture({signedIn:false,initial:publicPolicy});
  try{
    f.w.localStorage.setItem('match_lastDate',new Date().toLocaleDateString());f.w.localStorage.setItem('match_dailyCount','3');f.w.localStorage.setItem('match_guestBonusMatches','4');f.w.localStorage.setItem('match_token_first_value_v1','1');
    await f.w.MatchAppTokens.refresh();
    f.w.isUserLoggedIn=false;f.w.tSafe=(key,fallback)=>fallback;f.w.eval(app.slice(app.indexOf('let lastQuotaStatus = null;'),app.indexOf('// Pull status without consuming')));
    const check=f.w.checkDailyLimit;
    assert.equal(await check('match'),true);assert.equal(f.w.localStorage.getItem('match_guestBonusMatches'),'3');assert.equal(f.w.localStorage.getItem('match_dailyCount'),'3');
    assert.equal(f.w.checkDailyLimit,check);assert.ok(f.calls.every(c=>c.name==='match_token_status'));
    f.w.MatchAppTokens.confirmResult();
    assert.equal(f.w.document.querySelector('[data-match-token-balance]').textContent,'3 Match tokens');
    assert.equal(f.w.MatchAppTokens.retireLegacyPromotions,true);
  }finally{f.w.close();}
});

test('signed-in available earned and purchased tokens prevent a gate; Ask AI remains separate',async()=>{
  const f=await fixture({initial:wallet(0,7,false,3),native:true});
  try{
    assert.equal(await f.w.MatchAppTokens.beforeLookup(),true);
    assert.equal(await f.w.MatchAppTokens.beforeLookup('ask_ai'),null);
    assert.equal(await f.w.MatchAppTokens.consume('ask_ai'),null);
    f.w.MatchAppTokens.open();assert.equal(f.button('reward'),undefined);
    assert.equal(f.w.document.querySelector('.ma-token-ledger').textContent.includes('10'),true);
    assert.deepEqual(f.messages,[]);assert.ok(f.calls.every(c=>c.name==='match_token_status'));
  }finally{f.w.close();}
});

test('lost debit responses retry the same UUID; failed reveal only reads the wallet and never grants a refund',async()=>{
  const ids=[];let transport=0;
  const f=await fixture({rpc:async(name,args,state)=>{
    if(name==='consume_match_token'){
      ids.push(args.p_request_id);state.backend=wallet(2,0,false);
      if(++transport===1)throw Error('response lost after commit');
      return {data:{...state.backend,allowed:true,consumed:true,request_id:args.p_request_id}};
    }
    return {data:state.backend};
  }});
  try{
    assert.equal(await f.w.MatchAppTokens.consume('match',{runId:1}),true);assert.equal(ids.length,2);assert.equal(ids[0],ids[1]);
    const before=f.calls.length;await f.w.MatchAppTokens.noteUnconfirmed('one_match',1);
    assert.ok(f.calls.slice(before).every(c=>c.name==='match_token_status'));assert.equal(f.w.MatchAppTokens.hasValue,false);
    assert.equal(f.w.MatchAppTokens.open(),false);assert.equal(f.w.localStorage.getItem('match_guestBonusMatches'),null);
    assert.equal(f.w.document.querySelector('.ma-token-scrim'),null);
    assert.ok(!source.includes("rpc('refund_match_token'"));assert.ok(f.toasts.every(args=>!String(args[0]).includes('restored')));
  }finally{f.w.close();}
});

test('stale run check occurs after session restoration and before any debit',async()=>{
  const f=await fixture();
  try{
    let resolveSession;f.w.supabaseClient.auth.getSession=()=>new Promise(resolve=>{resolveSession=resolve;});
    const pending=f.w.MatchAppTokens.consume('match',{runId:1});await tick();
    f.w.__matchappMatchRunId=2;resolveSession({data:{session:{user:{id:'account-one'},access_token:'same-account'}}});
    assert.equal(await pending,false);assert.ok(!f.calls.some(c=>c.name==='consume_match_token'));
  }finally{f.w.close();}
});

// Reading request identity and first-value/exhaustion behavior are exercised
// against the actual SQL migrations in match-token-ebook-integration.test.cjs.

test('reward preparation and showing require separate trusted actions; only SSV status grants the balance',async()=>{
  const nonce='a'.repeat(64);let credited=false;let f;
  f=await fixture({initial:wallet(0,0,false),native:true,reward:async body=>{
    if(body.action==='create')return {data:{ok:true,claimNonce:nonce,expiresAt:Date.now()+600000,rewardAmount:3,wallet:wallet(0,0,false)}};
    if(body.action==='status')return {data:{ok:true,claimNonce:nonce,status:credited?'credited':'prepared',credited,wallet:wallet(0,0,false,credited?3:0)}};
    return {data:{ok:true}};
  }});
  try{
    assert.equal(await f.w.MatchAppTokens.beforeLookup(),false);assert.deepEqual(f.messages,[]);
    f.button('reward').click();await settle();assert.ok(!f.calls.some(c=>c.body?.action==='create'));
    await f.activate(f.button('reward'));
    const prepare=f.messages.find(m=>m.type==='prepare');assert.ok(prepare);assert.equal(prepare.claimNonce,nonce);assert.equal(prepare.accessToken,'test-session-token');assert.ok(!f.messages.some(m=>m.type==='show'));
    f.emit('ready');assert.ok(f.button('watch'));assert.ok(!f.messages.some(m=>m.type==='show'));
    f.button('watch').click();await settle();assert.ok(!f.messages.some(m=>m.type==='show'));
    await f.activate(f.button('watch'));assert.equal(f.messages.filter(m=>m.type==='show').length,1);
    f.emit('showing');f.emit('earned',{rewardEarned:true});await settle();
    assert.equal(f.w.document.querySelector('[data-match-token-balance]').textContent,'0 Match tokens','SDK earned event does not mint tokens');
    assert.equal(f.button('reward').disabled,true,'another reward cannot start while the issued claim is unconfirmed');
    credited=true;f.emit('dismissed',{rewardEarned:false});await settle();
    assert.equal(f.w.document.querySelector('[data-match-token-balance]').textContent,'3 Match tokens');
    assert.equal(f.w.localStorage.getItem('match_guestBonusMatches'),null);
    assert.ok(!f.calls.some(c=>c.name==='consume_match_token'),'reward completion cannot generate or consume automatically');
  }finally{f.w.close();}
});

test('closing preparation while the claim request is in flight cancels its late result without loading an ad',async()=>{
  let finishCreate;
  const f=await fixture({initial:wallet(0,0,false),native:true,reward:body=>body.action==='create'?new Promise(resolve=>{finishCreate=resolve;}):Promise.resolve({data:{ok:true}})});
  try{
    f.w.MatchAppTokens.open();await f.activate(f.button('reward'));assert.equal(typeof finishCreate,'function');
    f.w.MatchAppTokens.close();finishCreate({data:{ok:true,claimNonce:'c'.repeat(64),expiresAt:Date.now()+600000,rewardAmount:3,wallet:wallet(0,0,false)}});await settle();
    assert.equal(f.messages.length,0);assert.ok(f.calls.some(c=>c.body?.action==='cancel'));
    assert.equal(f.w.document.querySelector('.ma-token-scrim').hidden,true);
  }finally{f.w.close();}
});

test('closing a shown ad retains its claim, and auth changes discard stale SDK callbacks',async()=>{
  const nonce='b'.repeat(64);
  const f=await fixture({initial:wallet(0,0,false),native:true,reward:async body=>({data:body.action==='create'?{ok:true,claimNonce:nonce,expiresAt:Date.now()+600000,rewardAmount:3,wallet:wallet(0,0,false)}:{ok:true,claimNonce:nonce,status:'prepared',credited:false,wallet:wallet(0,0,false)}})});
  try{
    f.w.MatchAppTokens.open();await f.activate(f.button('reward'));f.emit('ready');await f.activate(f.button('watch'));f.emit('showing');
    f.w.MatchAppTokens.close();await settle();assert.ok(!f.calls.some(c=>c.body?.action==='cancel'));
    f.setWallet(wallet());f.setSession({user:{id:'account-two'},access_token:'new-session'});f.w.document.dispatchEvent(new f.w.CustomEvent('matchapp:authchange'));await new Promise(resolve=>f.w.setTimeout(resolve,0));await settle();
    const before=f.calls.length;f.emit('earned',{rewardEarned:true});await settle();assert.equal(f.calls.length,before);
    assert.equal(f.w.MatchAppTokens.hasValue,false);assert.equal(f.w.document.querySelector('[data-match-token-balance]').hidden,true);
  }finally{f.w.close();}
});

test('Kids stays isolated and optional result presentation failures cannot break confirmation',async()=>{
  const kids=await fixture({url:'https://matchapp.tv/kids/'});
  try{assert.equal(kids.w.MatchAppTokens,undefined);assert.deepEqual(kids.calls,[]);}finally{kids.w.close();}
  const f=await fixture();
  try{
    const original=f.w.document.querySelectorAll;
    f.w.document.querySelectorAll=()=>{throw Error('optional surface unavailable');};
    assert.doesNotThrow(()=>f.w.MatchAppTokens.confirmResult());assert.equal(f.w.MatchAppTokens.hasValue,true);
    f.w.document.querySelectorAll=original;
    const css=fs.readFileSync(path.join(__dirname,'../match-tokens.css'),'utf8');
    assert.match(css,/inset: 5px/);assert.match(css,/min-height: 72px/);assert.match(css,/prefers-reduced-motion: reduce/);
  }finally{f.w.close();}
});

test('enabled retirement stops new guest/member/signup awards and leaves ordinary share and saved credit intact',async()=>{
  const f=await fixture({signedIn:false,initial:publicPolicy});
  try{
    const w=f.w;let ordinary=0;Object.defineProperty(w.navigator,'share',{value:async()=>{ordinary++;},configurable:true});
    w.localStorage.setItem('match_guestBonusMatches','7');w.localStorage.setItem('match_guestBonusAiPrompts_v1','4');
    w.eval(fs.readFileSync(path.join(__dirname,'../guest-share-rewards.js'),'utf8'));
    w.eval(fs.readFileSync(path.join(__dirname,'../verified-public-guest-share.js'),'utf8'));
    await w.MatchAppGuestShare.open({kind:'match',title:'Existing title',url:'https://matchapp.tv/'});
    await w.MatchAppVerifiedGuestPublicShare.open({kind:'match',title:'Existing title',url:'https://matchapp.tv/'});
    assert.equal(ordinary,2);assert.equal(w.document.getElementById('ma-official-social-proof'),null);
    assert.equal(w.MatchAppGuestShare.finalizeVerified({kind:'match',title:'Existing title',token:'t',proof:{verified:true,kind:'match',platform:'tiktok',proof_id:'123e4567-e89b-42d3-a456-426614174000'}}),false);
    const shareSource=fs.readFileSync(path.join(__dirname,'../share.js'),'utf8');w.eval(shareSource.slice(0,shareSource.indexOf('/* ---------- Share card renderer')));
    w.isUserLoggedIn=true;assert.equal((await w.grantShareReward('Existing title')).reason,'retired');
    w.eval('var supabaseClient=window.supabaseClient;');const start=app.indexOf('// Separate non-expiring welcome balances');w.eval(app.slice(start,app.indexOf('let profileAuthEvent = 0;',start)));
    await w.claimRegistrationWelcomeBonus({id:'account-one'});
    assert.ok(!f.calls.some(c=>['claim_match_result_share','claim_registration_welcome_bonus','guest-social-proof'].includes(c.name)));
    assert.equal(w.localStorage.getItem('match_guestBonusMatches'),'7');assert.equal(w.localStorage.getItem('match_guestBonusAiPrompts_v1'),'4');
  }finally{f.w.close();}
});

test('only overlapping Match checkout entry points retire; ad-free, Ask AI and Kids retain their original sign-in flow',async()=>{
  const f=await fixture({signedIn:false,initial:publicPolicy});
  try{
    const w=f.w;let authPrompts=0;w.openAuthModal=()=>{authPrompts++;};
    w.eval(fs.readFileSync(path.join(__dirname,'../pricing.js'),'utf8'));await settle();
    const checkout=w.startVerifiedCheckout,kids=w.buyKidsMatches;
    for(const key of ['vip_monthly','vip_annual','business','matches_5','matches_25','matches_50'])await checkout(key);
    assert.equal(authPrompts,0);assert.equal(w.sessionStorage.getItem('match_pending_checkout'),null);
    for(const key of ['ad_free','credits_25','credits_75','credits_200','credits_500']){await checkout(key);assert.equal(w.sessionStorage.getItem('match_pending_checkout'),key);}
    await kids('kids_matches_5');assert.equal(authPrompts,6);assert.equal(w.sessionStorage.getItem('match_pending_checkout'),'kids_matches_5');
    assert.equal(w.startVerifiedCheckout,checkout);assert.equal(w.buyKidsMatches,kids);
    assert.ok(!f.calls.some(c=>c.name==='stripe-checkout'));
  }finally{f.w.close();}
});

test('HTML includes use early private-return capture, before-app token hooks and preserve prior cache pins',()=>{
  for(const file of ['index.html','ebooks/index.html','pricing/pricing.html','profile/profile.html','discover.html']){
    const html=fs.readFileSync(path.join(__dirname,'..',file),'utf8');const d=new JSDOM(html).window.document;
    const scripts=[...d.querySelectorAll('script')],pro=scripts.find(s=>s.src.includes('/pro-plan.js?')),tokens=scripts.find(s=>s.src.includes('/match-tokens.js?')),legacy=scripts.find(s=>s.src.includes('/app.js?'));
    assert.ok(pro&&tokens&&legacy,file);assert.equal(pro.hasAttribute('defer'),false);assert.equal(pro.hasAttribute('async'),false);
    assert.ok(scripts.indexOf(pro)<scripts.findIndex(s=>s.textContent.includes('gtm.start')),file+' captures private receipt before analytics');
    assert.ok(scripts.indexOf(tokens)<scripts.indexOf(legacy));assert.ok(legacy.src.endsWith('&regional=20261016-1&reliability=20261018-1&lifetime=20261019-1&art=20261020-source1&dialogs=20261020-1&accountphoto=20261020-1&polish=20261020-ui1&androidqa=20261021-1&readiness=20261022-1&repair=20261023-1&delivery=20261023-2'+(file==='index.html'?'&matchingfix=20261026-1&recoveryfix=20261026-1':'')+'&sourcewire=20261026-1&errors=20261027-1'));
    assert.ok(d.querySelector('link[href^="/match-tokens.css?"]'));assert.ok(d.querySelector('link[href^="/pro-plan.css?"]'));
    d.defaultView.close();
  }
  const home=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');assert.ok(home.includes('/sponsored-match.js?v=20261017-1'));assert.ok(home.includes('/sponsored-match.css?v=20261017-1'));
  const kids=fs.readFileSync(path.join(__dirname,'../kids/index.html'),'utf8');assert.ok(!/\/(?:match-tokens|pro-plan|sponsored-match)\.(?:js|css)/.test(kids));
});
