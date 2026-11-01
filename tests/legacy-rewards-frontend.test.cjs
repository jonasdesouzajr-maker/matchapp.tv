'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const api=require('../match-tokens.js');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const source=read('match-tokens.js'),app=read('app.js');
const settle=async()=>{for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));};
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};
const master={ok:true,enabled:false,policy_version:'match-tokens-v1',authenticated:false};
const legacy=(changes={})=>({ok:true,enabled:true,policy_version:'legacy-rewards-v1',credit_target:'extra_matches',authenticated:true,
  daily_limit:5,daily_remaining:0,bonus_tokens:0,purchased_matches:0,remaining:0,available_total:0,
  unlimited:false,pro_active:false,ad_free:false,first_match_pending:false,next_reset_at:'2026-11-02T00:00:00.000Z',rewarded_available:true,...changes});
const token=(changes={})=>({...legacy(),policy_version:'match-tokens-v1',credit_target:undefined,...changes});

async function fixture({signedIn=true,native=true,url='https://matchapp.tv/',initial=legacy(),policy=master,lang='en',reward,rpc}={}){
  const home=new JSDOM(read('index.html')).window.document.getElementById('out-of-matches-modal').outerHTML;
  const w=new JSDOM('<html><body><a id="quota-badge"></a><main id="result-box"><div class="match-result-toolbar"></div><a id="provider" href="https://www.netflix.com/title/123">Stream original result</a></main>'+home+
    '<div id="ebook-matcher-root"><div class="ebook-match-row"><button id="original-ebook">Find a book</button></div></div><article><button id="btn-vip_monthly">VIP</button></article><div id="locked-ad"><ins data-ad-slot="2595698117"></ins></div></body></html>',
    {url,runScripts:'outside-only',pretendToBeVisual:true}).window;
  const handlers=new WeakMap(),calls=[],messages=[],quotaReads=[],toasts=[];
  const add=w.EventTarget.prototype.addEventListener;
  w.EventTarget.prototype.addEventListener=function(type,listener,...rest){if(type==='click'){const list=handlers.get(this)||[];list.push(listener);handlers.set(this,list);}return add.call(this,type,listener,...rest);};
  let session=signedIn?{user:{id:'account-one'},access_token:'test-only-account-session'}:null,balance=initial,masterPolicy=policy;
  let respond=rpc,respondReward=reward||((body)=>({data:body.action==='create'
    ?{ok:true,claimNonce:'a'.repeat(64),expiresAt:Date.now()+600000,rewardAmount:3,creditTarget:'extra_matches',claimStatus:'created',wallet:balance}
    :{ok:true,claimNonce:'a'.repeat(64),status:'prepared',claimStatus:'prepared',credited:false,creditTarget:'extra_matches',wallet:balance}}));
  w.MATCH_LANG=lang;w.showToast=(...values)=>toasts.push(values);w.__matchappMatchRunId=1;
  w.supabaseClient={auth:{getSession:async()=>({data:{session}})},rpc:async(name,args)=>{calls.push({name,args});if(respond)return respond(name,args);return {data:name==='match_token_status'?masterPolicy:balance};},functions:{invoke:async(name,args)=>{calls.push({name,body:args.body});return respondReward(args.body);}}};
  if(native)w.MatchAppNativeRewards={postMessage:raw=>messages.push(JSON.parse(raw))};
  w.refreshQuotaStatus=async()=>{quotaReads.push('match_status');};w.closeOutOfMatches=()=>{w.document.getElementById('out-of-matches-modal').style.display='none';};
  let originalClicks=0;const paid=w.document.getElementById('oom-vip'),paidHandler=()=>originalClicks++;paid.addEventListener('click',event=>{event.preventDefault();paidHandler();});
  const locked=w.document.getElementById('locked-ad').outerHTML,ebook=w.document.getElementById('original-ebook');
  w.eval(source);await settle();
  const entry=()=>w.document.querySelector('[data-legacy-reward-entry]');
  const button=(key,target='extra_matches')=>[...w.document.querySelectorAll('.ma-token-actions button')].find(el=>el.textContent===(target==='extra_matches'?api.legacyText:api.text)(w.MATCH_LANG,key));
  const activate=async el=>{assert.ok(el,'owned control exists');assert.equal(el.disabled,false);for(const handler of handlers.get(el)||[])handler({isTrusted:true});await settle();};
  return {w,calls,messages,quotaReads,toasts,entry,button,activate,paid,paidHandler,ebook,locked,originalClicks:()=>originalClicks,
    setWallet:value=>{balance=value;},setPolicy:value=>{masterPolicy=value;},setSession:value=>{session=value;},
    setRpc:value=>{respond=value;},setReward:value=>{respondReward=value;},
    open:async()=>activate(entry()?.querySelector('button')),
    emit:(status,extra={})=>w.dispatchEvent(new w.CustomEvent('matchapp:rewarded',{detail:{requestId:messages.find(m=>m.type==='prepare')?.requestId,status,rewardEarned:false,serverVerified:false,...extra}}))};
}

test('strict legacy wallet validation preserves real allowances and accepts disabled promise balances',()=>{
  for(const limit of [3,5,10,50])assert.ok(api.legacyWallet(legacy({daily_limit:limit})));
  assert.ok(api.legacyWallet(legacy({enabled:false,rewarded_available:false,pro_active:true,ad_free:true,purchased_matches:3,available_total:3})));
  for(const changes of [{credit_target:'match_tokens'},{policy_version:'future'},{authenticated:false},{enabled:'true'},{daily_limit:99},{daily_limit:0,daily_remaining:1},{bonus_tokens:3},{available_total:3},{purchased_matches:-1},{remaining:1},{first_match_pending:true},{pro_active:true},{ad_free:true},{enabled:false},{unlimited:true},{next_reset_at:'tomorrow'}])assert.equal(api.legacyWallet(legacy(changes)),null,JSON.stringify(changes));
});

test('all fourteen languages author the Extra Matches reward contract without token reset copy',async()=>{
  for(const lang of api.languages){
    assert.deepEqual(Object.keys(api.legacyRows[lang]),api.legacyKeys);
    for(const key of api.legacyKeys){const value=api.legacyText(lang,key,{count:3,remaining:0,limit:5});assert.ok(value.trim(),lang+':'+key);assert.ok(!value.includes('{'),lang+':'+key);if(lang!=='en')assert.notEqual(value,api.legacyText('en',key,{count:3,remaining:0,limit:5}),lang+':'+key);}
    const f=await fixture({lang});try{await f.open();assert.equal(f.w.document.querySelector('.ma-token-dialog').dir,lang==='ar'?'rtl':'ltr');assert.equal(f.w.document.querySelector('.ma-token-footnote').textContent,api.legacyText(lang,'refreshNote'));assert.equal(f.w.document.querySelector('.ma-token-dialog').lang,lang);}finally{f.w.close();}
  }
});

test('independent rewards leave original allowances, paid choices, Pro and promotions authoritative',async()=>{
  const f=await fixture();try{
    const api=f.w.MatchAppTokens;
    assert.equal(api.enabled,false);assert.equal(api.retireLegacyPromotions,false);assert.equal(api.isPro(),false);assert.equal(api.isAdFree(),false);
    assert.equal(await api.beforeLookup('match'),null);assert.equal(await api.consume('match'),null);assert.equal(await api.consume('ask_ai'),null);assert.equal(api.handleLimit('registered',{},'match'),false);
    assert.equal(f.w.document.documentElement.hasAttribute('data-match-token-policy'),false);assert.equal(f.w.document.querySelector('.ma-token-corner'),null);
    assert.equal(f.paid.href,'https://matchapp.tv/pricing/pricing.html');f.paid.click();assert.equal(f.originalClicks(),1);
    assert.equal(f.w.document.getElementById('locked-ad').outerHTML,f.locked);assert.equal(f.w.document.getElementById('original-ebook'),f.ebook);
    await f.open();assert.equal(f.button('pro'),undefined);assert.equal(f.button('checkin'),undefined);assert.ok(f.button('reward'));
    assert.ok(f.calls.every(call=>['match_token_status','legacy_reward_status'].includes(call.name)));assert.deepEqual(f.messages,[]);
  }finally{f.w.close();}
});

test('the actual legacy checkDailyLimit still calls only consume_ai_action for each Match and Ask AI spend',async()=>{
  const f=await fixture();try{
    f.w.eval('var supabaseClient=window.supabaseClient; var isUserLoggedIn=true;');f.w.tSafe=(key,fallback)=>fallback;
    f.w.eval(app.slice(app.indexOf('let lastQuotaStatus = null;'),app.indexOf('// Pull status without consuming')));
    const check=f.w.checkDailyLimit,quotaRequests=[];
    f.setRpc(async(name,args)=>{if(name==='consume_ai_action'){quotaRequests.push(args.p_reason);return {data:{allowed:true,limit:5,remaining:4,purchased_matches:7,credits:11}};}return {data:name==='match_token_status'?master:legacy()};});
    assert.equal(await check('match'),true);assert.equal(await check('ask_ai'),true);assert.deepEqual(quotaRequests,['match','ask_ai']);assert.equal(f.w.checkDailyLimit,check);
    assert.equal(f.calls.filter(c=>c.name==='consume_match_token').length,0);assert.equal(f.w.document.getElementById('quota-badge').dataset.remaining,'11');assert.equal(f.w.localStorage.getItem('match_guestBonusMatches'),null);
  }finally{f.w.close();}
});

test('only authenticated eligible native Home and ebook surfaces append the optional offer',async t=>{
  for(const url of ['https://matchapp.tv/','https://matchapp.tv/index.html','https://matchapp.tv/ebooks/','https://matchapp.tv/ebooks/index.html'])await t.test(url,async()=>{const f=await fixture({url});try{assert.ok(f.entry());assert.equal(f.entry().parentElement.matches(url.includes('/ebooks/')?'.ebook-match-row':'.oom-sheet'),true);}finally{f.w.close();}});
  for(const options of [{signedIn:false},{native:false},{url:'https://matchapp.tv/kids/'},{url:'https://matchapp.tv/news/'},{url:'https://matchapp.tv/discover.html'},
    {initial:legacy({first_match_pending:true,rewarded_available:false})},{initial:legacy({ad_free:true,rewarded_available:false})},{initial:legacy({daily_remaining:1,remaining:1,available_total:1,rewarded_available:false})},{initial:legacy({purchased_matches:7,available_total:7,rewarded_available:false})},{initial:legacy({enabled:false,rewarded_available:false})}])await t.test(JSON.stringify(options),async()=>{const f=await fixture(options);try{assert.equal(f.entry(),null);assert.deepEqual(f.messages,[]);if(options.native===false||options.signedIn===false||options.url?.includes('news'))assert.equal(f.calls.filter(c=>c.name==='legacy_reward_status').length,0);}finally{f.w.close();}});
});

test('two trusted reward gestures are required and SDK earned never credits Extra Matches',async()=>{
  const f=await fixture();try{
    f.w.localStorage.setItem('match_guestBonusMatches','7');f.w.localStorage.setItem('match_guestBonusAiPrompts_v1','11');
    await f.open();f.button('reward').click();await settle();assert.equal(f.messages.length,0);
    await f.activate(f.button('reward'));const prepare=f.messages[0];assert.equal(prepare.type,'prepare');assert.equal(prepare.accessToken,'test-only-account-session');assert.equal(f.calls.find(c=>c.body?.action==='create').body.creditTarget,undefined);
    f.emit('ready');assert.ok(f.button('watch'));assert.equal(f.messages.filter(m=>m.type==='show').length,0);
    f.button('watch').click();await settle();assert.equal(f.messages.filter(m=>m.type==='show').length,0);
    await f.activate(f.button('watch'));assert.equal(f.messages.filter(m=>m.type==='show').length,1);
    f.emit('showing');f.emit('earned',{rewardEarned:true,serverVerified:true});await settle();
    assert.ok(f.w.document.querySelector('.ma-token-ledger').textContent.startsWith('0 matches available'));assert.deepEqual(f.quotaReads,[]);assert.equal(f.w.MatchAppTokens.enabled,false);
    f.emit('ready');f.emit('loading');assert.equal(f.button('watch'),undefined,'late load callbacks cannot restore a used show gesture');
    f.setReward(async()=>({data:{ok:true,claimNonce:prepare.claimNonce,creditTarget:'extra_matches',status:'credited',claimStatus:'credited',credited:true,wallet:legacy({purchased_matches:3,available_total:3,rewarded_available:false})}}));
    f.emit('dismissed');await settle();assert.equal(f.w.document.querySelector('.ma-token-notice').textContent,api.legacyText('en','credited'));assert.ok(f.w.document.querySelector('.ma-token-ledger').textContent.startsWith('3 matches available'));
    assert.deepEqual(f.quotaReads,['match_status']);assert.equal(f.w.MatchAppTokens.enabled,false);assert.equal(f.w.MatchAppTokens.retireLegacyPromotions,false);
    assert.equal(f.w.localStorage.getItem('match_guestBonusMatches'),'7');assert.equal(f.w.localStorage.getItem('match_guestBonusAiPrompts_v1'),'11');assert.ok(!f.calls.some(c=>c.name==='consume_match_token'||c.name==='consume_ai_action'));
  }finally{f.w.close();}
});

test('a recovered prepared promise reconciles after pause without another prepare or show',async()=>{
  const nonce='b'.repeat(64);let statuses=0;
  const f=await fixture({reward:async body=>({data:body.action==='create'
    ?{ok:true,claimNonce:nonce,expiresAt:Date.now()+1000,rewardAmount:3,creditTarget:'extra_matches',claimStatus:'prepared',wallet:legacy({enabled:false,rewarded_available:false})}
    :{ok:true,claimNonce:nonce,status:'credited',claimStatus:'credited',credited:true,creditTarget:'extra_matches',wallet:legacy({enabled:false,rewarded_available:false,purchased_matches:3,available_total:3})}})});
  try{await f.open();await f.activate(f.button('reward'));assert.deepEqual(f.messages,[]);statuses=f.calls.filter(c=>c.body?.action==='status').length;assert.equal(statuses,1);assert.equal(f.w.document.querySelector('.ma-token-notice').textContent,api.legacyText('en','credited'));assert.equal(f.w.MatchAppTokens.enabled,false);assert.equal(f.entry().hidden,true);}finally{f.w.close();}
});

test('legacy presentation can reconcile an older token promise after pause without relabeling or enabling it',async()=>{
  const nonce='e'.repeat(64);const paused=token({enabled:false,rewarded_available:false});
  const f=await fixture({reward:async body=>({data:body.action==='create'
    ?{ok:true,claimNonce:nonce,expiresAt:Date.now()+1000,rewardAmount:3,creditTarget:'match_tokens',claimStatus:'prepared',wallet:paused}
    :{ok:true,claimNonce:nonce,creditTarget:'match_tokens',status:'credited',claimStatus:'credited',credited:true,wallet:{...paused,purchased_matches:3,available_total:3}}})});
  try{await f.open();await f.activate(f.button('reward'));assert.deepEqual(f.messages,[]);assert.equal(f.w.document.querySelector('.ma-token-notice').textContent,api.text('en','credited'));assert.ok(f.w.document.querySelector('.ma-token-ledger').textContent.startsWith('3 Match tokens'));assert.equal(f.w.MatchAppTokens.enabled,false);assert.equal(f.w.MatchAppTokens.retireLegacyPromotions,false);assert.deepEqual(f.quotaReads,[]);}finally{f.w.close();}
});

test('a ready current-document ad survives a status refresh while retaining the second trusted gesture',async()=>{
  const f=await fixture();try{await f.open();await f.activate(f.button('reward'));f.emit('ready');await f.activate(f.button('refresh'));assert.ok(f.button('watch'));assert.equal(f.w.document.querySelector('.ma-token-notice').textContent,api.text('en','ready'));assert.equal(f.messages.filter(m=>m.type==='show').length,0);await f.activate(f.button('watch'));assert.equal(f.messages.filter(m=>m.type==='show').length,1);}finally{f.w.close();}
});

test('pending server verification schedules four bounded polls then remains manually retryable',async()=>{
  const f=await fixture();try{
    const pending=new Map();let timerId=10000;const set=f.w.setTimeout,clear=f.w.clearTimeout;
    f.w.setTimeout=(handler,delay,...args)=>[1500,4500,10000,20000].includes(delay)?(pending.set(++timerId,{handler,delay}),timerId):set(handler,delay,...args);
    f.w.clearTimeout=id=>{if(pending.has(id))pending.delete(id);else clear(id);};
    await f.open();await f.activate(f.button('reward'));f.emit('ready');await f.activate(f.button('watch'));f.emit('earned');await settle();
    const delays=[];for(let i=0;i<4;i++){assert.equal(pending.size,1);const [id,{handler,delay}]=[...pending][0];pending.delete(id);delays.push(delay);handler();await settle();}
    assert.deepEqual(delays,[1500,4500,10000,20000]);assert.equal(pending.size,0);assert.equal(f.calls.filter(c=>c.body?.action==='status').length,5);assert.ok(f.button('refresh'));assert.equal(f.button('refresh').disabled,false);assert.deepEqual(f.quotaReads,[]);
  }finally{f.w.close();}
});

test('native load timeout cancels preparation, ignores late ready, and leaves controls usable',async()=>{
  const f=await fixture();try{
    let expire;const set=f.w.setTimeout,clear=f.w.clearTimeout;
    f.w.setTimeout=(handler,delay,...args)=>delay===22000?(expire=handler,-1):set(handler,delay,...args);f.w.clearTimeout=id=>{if(id!==-1)clear(id);};
    await f.open();await f.activate(f.button('reward'));assert.equal(typeof expire,'function');expire();await settle();f.emit('ready');assert.equal(f.button('watch'),undefined);assert.equal(f.messages.filter(m=>m.type==='show').length,0);assert.ok(f.messages.some(m=>m.type==='cancel'));assert.equal(f.button('refresh').disabled,false);assert.equal(f.w.document.querySelector('.ma-token-notice').textContent,api.text('en','unavailable'));
  }finally{f.w.close();}
});

test('terminal create recoveries reconcile only, while target swaps cannot grant or activate token mode',async t=>{
  for(const claimStatus of ['credited','cancelled','expired'])await t.test(claimStatus,async()=>{
    const f=await fixture({reward:async body=>({data:body.action==='create'
      ?{ok:true,claimNonce:'c'.repeat(64),expiresAt:Date.now()-1000,rewardAmount:3,creditTarget:'extra_matches',claimStatus,wallet:legacy()}
      :{ok:true,claimNonce:'c'.repeat(64),creditTarget:'extra_matches',status:claimStatus,claimStatus,credited:claimStatus==='credited',wallet:legacy({purchased_matches:claimStatus==='credited'?3:0,available_total:claimStatus==='credited'?3:0,rewarded_available:false})}})});
    try{await f.open();await f.activate(f.button('reward'));assert.deepEqual(f.messages,[]);assert.equal(f.calls.filter(c=>c.body?.action==='status').length,1);assert.equal(f.w.MatchAppTokens.enabled,false);}finally{f.w.close();}
  });
  const f=await fixture();try{await f.open();await f.activate(f.button('reward'));f.setReward(async()=>({data:{ok:true,claimNonce:'a'.repeat(64),creditTarget:'match_tokens',status:'credited',credited:true,wallet:token({available_total:3,bonus_tokens:3,remaining:3})}}));f.emit('earned');await settle();assert.equal(f.w.document.querySelector('.ma-token-notice').textContent,api.legacyText('en','verifying'));assert.equal(f.w.MatchAppTokens.enabled,false);assert.deepEqual(f.quotaReads,[]);}finally{f.w.close();}
});

test('closing before create settles cancels only a newly created promise, without native load',async t=>{
  for(const claimStatus of ['created','prepared'])await t.test(claimStatus,async()=>{
    const wait=deferred();const f=await fixture({reward:body=>body.action==='create'?wait.promise:Promise.resolve({data:{ok:true}})});
    try{await f.open();await f.activate(f.button('reward'));f.w.MatchAppTokens.close();wait.resolve({data:{ok:true,claimNonce:'d'.repeat(64),expiresAt:Date.now()+600000,rewardAmount:3,creditTarget:'extra_matches',claimStatus,wallet:legacy()}});await settle();assert.deepEqual(f.messages,[]);assert.equal(f.calls.filter(c=>c.body?.action==='cancel').length,claimStatus==='created'?1:0);assert.equal(f.w.document.querySelector('.ma-token-scrim').hidden,true);}finally{f.w.close();}
  });
});

test('account changes clear eligibility and reject old callbacks and pending status responses',async()=>{
  const f=await fixture();try{
    await f.open();await f.activate(f.button('reward'));const wait=deferred();f.setReward(()=>wait.promise);f.emit('earned');await settle();
    f.setSession({user:{id:'account-two'},access_token:'new-account-session'});f.setWallet(legacy({first_match_pending:true,rewarded_available:false}));f.w.document.dispatchEvent(new f.w.CustomEvent('matchapp:authchange'));await new Promise(resolve=>f.w.setTimeout(resolve,0));await settle();
    const before=f.calls.length;f.emit('ready');f.emit('earned');wait.resolve({data:{ok:true,claimNonce:'a'.repeat(64),creditTarget:'extra_matches',status:'credited',credited:true,wallet:legacy({purchased_matches:3,available_total:3,rewarded_available:false})}});await settle();
    assert.equal(f.calls.length,before);assert.deepEqual(f.quotaReads,[]);assert.equal(f.entry().hidden,true);assert.equal(f.w.document.querySelector('.ma-token-scrim').hidden,true);assert.equal(f.w.MatchAppTokens.open(),false);
  }finally{f.w.close();}
});

test('document unmount cancels preparation and late document callbacks cannot show or grant',async()=>{
  const f=await fixture();try{
    await f.open();await f.activate(f.button('reward'));const prepare=f.messages[0];f.emit('ready');f.w.dispatchEvent(new f.w.PageTransitionEvent('pagehide'));await settle();
    assert.ok(f.messages.some(m=>m.type==='cancel'&&m.requestId===prepare.requestId));const before=f.calls.length;f.emit('ready');f.emit('earned',{serverVerified:true,rewardEarned:true});await settle();assert.equal(f.calls.length,before);assert.equal(f.messages.filter(m=>m.type==='show').length,0);assert.deepEqual(f.quotaReads,[]);assert.equal(f.w.document.querySelector('.ma-token-scrim').hidden,true);
  }finally{f.w.close();}
});

test('a restored different session invalidates a claim even before the auth event arrives',async()=>{
  const f=await fixture();try{
    await f.open();await f.activate(f.button('reward'));f.emit('ready');f.setSession({user:{id:'account-two'},access_token:'new-account-session'});f.setWallet(legacy({first_match_pending:true,rewarded_available:false}));await f.w.MatchAppTokens.refresh();
    const before=f.calls.length;f.emit('earned',{rewardEarned:true,serverVerified:true});await settle();assert.equal(f.calls.length,before);assert.equal(f.w.document.querySelector('.ma-token-scrim').hidden,true);assert.equal(Boolean(f.w.document.getElementById('out-of-matches-modal').inert),false);assert.equal(f.entry().hidden,true);assert.deepEqual(f.quotaReads,[]);
  }finally{f.w.close();}
});

test('optional status failure fails closed and retries without changing legacy payment or debit behavior',async()=>{
  const f=await fixture();try{
    await f.open();f.setRpc(async name=>name==='legacy_reward_status'?{error:new Error('RPC unavailable')}:{data:master});await f.activate(f.button('refresh'));
    assert.equal(f.entry().hidden,true);assert.equal(f.w.document.querySelector('.ma-token-notice').textContent,api.legacyText('en','failed'));assert.equal(f.w.MatchAppTokens.enabled,false);assert.equal(await f.w.MatchAppTokens.consume(),null);assert.equal(f.w.MatchAppTokens.handleLimit('registered',{},'match'),false);
    f.setRpc(async name=>({data:name==='match_token_status'?master:legacy()}));await f.w.MatchAppTokens.refresh();assert.equal(f.entry().hidden,false);assert.equal(f.w.document.querySelector('.ma-token-notice').textContent,api.legacyText('en','rewardNote'));
    f.setWallet(legacy({enabled:false,rewarded_available:false}));f.setRpc(null);await f.w.MatchAppTokens.refresh();assert.equal(f.entry().hidden,true);assert.equal(f.w.document.querySelector('.ma-token-title'),null);assert.equal(f.w.document.getElementById('ma-token-title').textContent,api.legacyText('en','title'));f.paid.click();assert.equal(f.originalClicks(),1);
  }finally{f.w.close();}
});

test('a genuine Home result reads legacy proof after existing durable history flush and any older status read',async()=>{
  const f=await fixture({initial:legacy({first_match_pending:true,rewarded_available:false})});try{
    const flush=deferred(),old=deferred();let stored=false,reads=0;
    f.w.matchPolicy={flush:()=>flush.promise};
    f.setRpc(async name=>{if(name==='match_token_status')return {data:master};reads++;if(reads===1)return old.promise;return {data:legacy({first_match_pending:!stored,rewarded_available:stored})};});
    f.w.MatchAppTokens.confirmResult('one_match');await settle();assert.equal(f.entry(),null);assert.equal(reads,1);
    stored=true;flush.resolve();await settle();assert.equal(reads,1,'the new read waits for the previous response');old.resolve({data:legacy({first_match_pending:true,rewarded_available:false})});await settle();assert.equal(reads,2);assert.ok(f.entry());assert.deepEqual(f.messages,[]);assert.equal(f.w.MatchAppTokens.enabled,false);
  }finally{f.w.close();}
});

test('changed reward assets retain earlier URL pins on all routes and future finalizer output',()=>{
  const files=['index.html','ebooks/index.html','purchase.html','pricing/pricing.html','profile/profile.html','discover.html','friends.html','together.html','events-archive.html','platforms/roku-channel/index.html'];
  for(const file of files){const dom=new JSDOM(read(file));try{
    for(const asset of ['match-tokens.js','match-tokens.css']){
      const el=dom.window.document.querySelector(asset.endsWith('.js')?'script[src^="/'+asset+'?"]':'link[href^="/'+asset+'?"]');assert.ok(el,file+':'+asset);
      const value=new URL(el.getAttribute('src')||el.getAttribute('href'),'https://matchapp.tv');assert.equal(value.searchParams.get('v'),asset.endsWith('.js')?'20261019-refresh1':'20261017-3');assert.deepEqual(value.searchParams.getAll('legacyrewards'),['20261101-1']);
    }
    for(const script of dom.window.document.querySelectorAll('script[src^="/ebooks/ebook-matcher.js?"]'))assert.deepEqual(new URL(script.src,'https://matchapp.tv').searchParams.getAll('legacyrewards'),['20261101-1']);
  }finally{dom.window.close();}}
  const {versionReferenceRuntimeAssets}=require('../tools/finalize-brand.js');
  for(const file of ['match-tokens.js','match-tokens.css','ebooks/ebook-matcher.js']){
    const output=versionReferenceRuntimeAssets('<script src="/'+file+'?v=old&amp;kept=1"></script>');const value=new URL(new JSDOM(output).window.document.querySelector('script').getAttribute('src'),'https://matchapp.tv');assert.equal(value.searchParams.get('v'),'old');assert.equal(value.searchParams.get('kept'),'1');assert.deepEqual(value.searchParams.getAll('legacyrewards'),['20261101-1']);
  }
});
