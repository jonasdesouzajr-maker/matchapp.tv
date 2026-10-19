const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const api=require('../match-tokens.js');
const source=fs.readFileSync(path.join(__dirname,'../match-tokens.js'),'utf8');
const settle=async()=>{for(let i=0;i<4;i++)await new Promise(resolve=>setImmediate(resolve));};
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const wallet=(daily=2,purchased=4,earned=3)=>({ok:true,enabled:true,policy_version:'match-tokens-v1',authenticated:true,
  daily_limit:3,daily_remaining:daily,bonus_tokens:earned,purchased_matches:purchased,remaining:daily+earned,
  available_total:daily+earned+purchased,unlimited:false,pro_active:false,first_match_pending:false,
  next_reset_at:'2026-10-20T00:00:00.000Z',rewarded_available:true});

async function fixture({lang='en',native=false,initial=wallet()}={}){
  const w=new JSDOM('<html><body><main id="result-box"><div class="match-result-toolbar"></div></main></body></html>',{
    url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true
  }).window;
  const handlers=new WeakMap(),calls=[],toasts=[],nativeMessages=[];
  const add=w.EventTarget.prototype.addEventListener;
  w.EventTarget.prototype.addEventListener=function(type,listener,...rest){
    if(type==='click'){const list=handlers.get(this)||[];list.push(listener);handlers.set(this,list);}
    return add.call(this,type,listener,...rest);
  };
  let session={user:{id:'account-one'},access_token:'test-only-token'};
  let respond=async()=>({data:initial});
  let respondReward=async()=>({data:{ok:true,claimNonce:'a'.repeat(64),rewardAmount:3,
    expiresAt:Date.now()+600000,wallet:initial}});
  w.MATCH_LANG=lang;w.showToast=(...args)=>toasts.push(args);
  w.supabaseClient={auth:{getSession:async()=>({data:{session}})},rpc:async(name,args)=>{
    calls.push({name,args});return respond(name,args);
  },functions:{invoke:async(name,args)=>{calls.push({name,args});return respondReward(args.body);}}};
  if(native)w.MatchAppNativeRewards={postMessage:value=>nativeMessages.push(JSON.parse(value))};
  w.eval(source);await settle();assert.equal(w.MatchAppTokens.open(),true);
  const button=key=>[...w.document.querySelectorAll('.ma-token-actions button')].find(el=>el.textContent===api.text(lang,key));
  return {w,calls,toasts,nativeMessages,button,
    respond:handler=>{respond=handler;},reward:handler=>{respondReward=handler;},session:value=>{session=value;},
    notice:()=>w.document.querySelector('.ma-token-notice').textContent,
    balance:()=>w.document.querySelector('[data-match-token-balance]').textContent,
    click:async key=>{const el=button(key);assert.ok(el,'owned '+key+' control exists');assert.equal(el.disabled,false);
      for(const listener of handlers.get(el)||[])listener({isTrusted:true});await settle();},
    close:()=>w.close()
  };
}

test('successful manual balance refresh settles the Portuguese loading notice with the exact server balance',async()=>{
  const f=await fixture({lang:'pt-BR'});
  try{
    f.respond(async()=>({data:wallet(1,5,7)}));await f.click('refresh');
    assert.equal(f.balance(),'13 tokens de Match');
    assert.equal(f.notice(),api.text('pt-BR','refreshNote'));
    assert.equal(f.button('refresh').disabled,false);assert.deepEqual(f.toasts,[]);
    assert.ok(f.calls.every(call=>call.name==='match_token_status'));
  }finally{f.close();}
});

test('failed, aborted and invalid refresh responses settle to a retryable failure; a later success clears it',async t=>{
  for(const failure of ['network','cancelled','invalid'])await t.test(failure,async()=>{
    const f=await fixture();
    try{
      f.respond(async()=>{
        if(failure==='network')throw Error('offline');
        if(failure==='cancelled')throw new f.w.DOMException('Request cancelled','AbortError');
        return {data:{...wallet(),available_total:999}};
      });
      await f.click('refresh');
      assert.equal(f.notice(),api.text('en','failed'));assert.equal(f.button('refresh').disabled,false);
      assert.deepEqual(f.toasts,[[api.text('en','failed'),true]]);
      f.respond(async()=>({data:wallet(0,6,1)}));
      if(failure==='network'){await f.w.MatchAppTokens.refresh();await settle();}else await f.click('refresh');
      assert.equal(f.balance(),'7 Match tokens');assert.equal(f.notice(),api.text('en','refreshNote'));
      assert.ok(f.calls.every(call=>call.name==='match_token_status'));
      assert.equal(f.w.localStorage.getItem('match_guestBonusMatches'),null);
    }finally{f.close();}
  });
});

test('delayed overlapping manual and background refreshes share one read and settle together',async()=>{
  const f=await fixture();
  try{
    const waiting=deferred();f.respond(()=>waiting.promise);const before=f.calls.length;
    await f.click('refresh');assert.equal(f.notice(),api.text('en','loading'));assert.equal(f.balance(),'9 Match tokens');
    await f.click('refresh');const background=f.w.MatchAppTokens.refresh();
    assert.equal(f.calls.length,before+1,'repeated and overlapping reads are coalesced');
    waiting.resolve({data:wallet(3,8,2)});await background;await settle();
    assert.equal(f.balance(),'13 Match tokens');assert.equal(f.notice(),api.text('en','refreshNote'));
    await f.click('refresh');assert.equal(f.calls.length,before+2,'the flight is released after completion');
    assert.equal(f.notice(),api.text('en','refreshNote'));
  }finally{f.close();}
});

test('the existing bounded timeout releases loading and ignores a late response before a fresh retry',async()=>{
  const f=await fixture();
  try{
    const waiting=deferred();let expire;
    const set=f.w.setTimeout,clear=f.w.clearTimeout;
    f.w.setTimeout=(handler,delay,...args)=>delay===12000?(expire=handler,-1):set(handler,delay,...args);
    f.w.clearTimeout=id=>{if(id!==-1)clear(id);};
    f.respond(()=>waiting.promise);await f.click('refresh');
    assert.equal(f.notice(),api.text('en','loading'));assert.equal(typeof expire,'function');
    expire();await settle();assert.equal(f.notice(),api.text('en','failed'));
    waiting.resolve({data:wallet(3,90,0)});await settle();
    assert.equal(f.notice(),api.text('en','failed'),'timed-out response cannot overwrite settled state');
    f.respond(async()=>({data:wallet(2,0,0)}));await f.click('refresh');
    assert.equal(f.balance(),'2 Match tokens');assert.equal(f.notice(),api.text('en','refreshNote'));
  }finally{f.close();}
});

test('closing the panel during a balance refresh keeps it closed and reopening shows settled data',async()=>{
  const f=await fixture();
  try{
    const waiting=deferred();f.respond(()=>waiting.promise);await f.click('refresh');f.w.MatchAppTokens.close();
    waiting.resolve({data:wallet(1,1,1)});await settle();
    assert.equal(f.w.document.querySelector('.ma-token-scrim').hidden,true);
    assert.equal(f.notice(),api.text('en','refreshNote'));assert.equal(f.balance(),'3 Match tokens');
    assert.equal(f.w.MatchAppTokens.open(),true);assert.equal(f.notice(),api.text('en','refreshNote'));
    assert.deepEqual(f.nativeMessages,[]);assert.ok(f.calls.every(call=>call.name==='match_token_status'));
  }finally{f.close();}
});

test('account changes invalidate pending reads without letting an old account replace the new balance or notice',async()=>{
  const f=await fixture();
  try{
    const old=deferred();f.respond(()=>old.promise);await f.click('refresh');
    f.session({user:{id:'account-two'},access_token:'new-test-only-token'});
    f.respond(async()=>({data:wallet(1,0,1)}));
    f.w.document.dispatchEvent(new f.w.CustomEvent('matchapp:authchange'));
    await new Promise(resolve=>f.w.setTimeout(resolve,0));await settle();
    assert.equal(f.balance(),'2 Match tokens');assert.equal(f.notice(),api.text('en','refreshNote'));
    old.resolve({data:wallet(3,40,50)});await settle();
    assert.equal(f.balance(),'2 Match tokens');assert.equal(f.notice(),api.text('en','refreshNote'));
    assert.ok(f.calls.every(call=>call.name==='match_token_status'));
  }finally{f.close();}
});

test('a refresh preserves optional-ad readiness while its separate server reconciliation is pending',async()=>{
  const f=await fixture({native:true,initial:wallet(0,0,0)});
  try{
    await f.click('reward');const request=f.nativeMessages.find(message=>message.type==='prepare');assert.ok(request);
    f.w.dispatchEvent(new f.w.CustomEvent('matchapp:rewarded',{detail:{requestId:request.requestId,status:'ready'}}));
    assert.equal(f.notice(),api.text('en','ready'));
    const reconciliation=deferred();f.reward(()=>reconciliation.promise);
    await f.click('refresh');assert.equal(f.notice(),api.text('en','ready'));assert.ok(f.button('watch'));
    assert.equal(f.balance(),'0 Match tokens');assert.ok(!f.nativeMessages.some(message=>message.type==='show'));
    assert.ok(!f.calls.some(call=>call.name==='consume_match_token'));
  }finally{f.close();}
});

test('a late balance read cannot overwrite a reward notice already settled by server verification',async()=>{
  const f=await fixture({native:true,initial:wallet(0,0,0)});
  try{
    await f.click('reward');const request=f.nativeMessages.find(message=>message.type==='prepare');assert.ok(request);
    f.w.dispatchEvent(new f.w.CustomEvent('matchapp:rewarded',{detail:{requestId:request.requestId,status:'ready'}}));
    const waiting=deferred();f.respond(()=>waiting.promise);await f.click('refresh');
    f.reward(async()=>({data:{ok:true,claimNonce:'a'.repeat(64),status:'credited',credited:true,wallet:wallet(0,0,3)}}));
    f.w.dispatchEvent(new f.w.CustomEvent('matchapp:rewarded',{detail:{requestId:request.requestId,status:'earned'}}));
    await settle();assert.equal(f.notice(),api.text('en','credited'));assert.equal(f.balance(),'3 Match tokens');
    waiting.resolve({data:wallet(0,0,3)});await settle();
    assert.equal(f.notice(),api.text('en','credited'));assert.equal(f.balance(),'3 Match tokens');
    assert.ok(f.calls.filter(call=>call.name==='reward-session').every(call=>['create','status'].includes(call.args.body.action)));
  }finally{f.close();}
});
