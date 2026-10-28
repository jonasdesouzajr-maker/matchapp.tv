/* Parent-only cloud-progress state tests. These mocks create no sessions,
 * account records, real game saves or network requests. */
const test = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const campaign = require('../lumina-match/browser/campaign.js');
const modulePromise = import('../lumina-match/progress-bridge.mjs');
const settle = () => new Promise(resolve=>setImmediate(resolve));
const clone = value=>JSON.parse(JSON.stringify(value));
const snapshot = (points=0,moves=0)=>({points,rounds:Math.floor(points/10),activeRound:{
  cards:['moon','star','planet','heart','crystal','sun','moon','star','planet','heart','crystal','sun'].map(art=>({art,matched:false})),moves
}});
const deferred = () => {let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const campaignSnapshot = (level=1,moves=0)=>({version:2,...snapshot(30),campaign:{
  unlocked:level,results:Array.from({length:250},(_,i)=>i<level-1?[3,20,60]:null),
  activeLevel:{level,cards:campaign.deck(level,()=>0.375),moves,elapsedSeconds:moves*5,timed:true,hintsUsed:1}
}});

async function fixture(t, options={}) {
  const {createProgressBridge}=await modulePromise;
  const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://matchapp.tv/',pretendToBeVisual:true});
  const w=dom.window, sent=[],calls=[],timers=new Map();
  let time=0,timerId=0,session=options.guest?null:{user:{id:'account-a',is_anonymous:false},access_token:'NEVER_SEND_ACCOUNT_TOKEN'};
  let childSnapshot=options.local || snapshot(0);
  let record={revision:options.revision ?? 1,progress:options.progress === undefined ? snapshot(10) : options.progress};
  let handler=null;
  w.setTimeout=(fn,delay)=>{let id=++timerId;timers.set(id,{fn,at:time+delay});return id;};
  w.clearTimeout=id=>timers.delete(id);
  const child={postMessage(value,origin){
    sent.push({value:clone(value),origin});
    // Mirror the child protocol: an auth reset immediately clears private UI,
    // and an account load replaces it with that account's authoritative save.
    if(value.mode==='loading' && value.progress===null) childSnapshot=null;
    if(value.mode==='account') childSnapshot=value.progress===null?{points:0,rounds:0,activeRound:null}:clone(value.progress);
  },LuminaGameProgress:{snapshot:()=>childSnapshot}};
  const frame={contentWindow:child};
  const client={auth:{getSession:async()=>({data:{session},error:null})}};
  const request=async(service,action,payload,signal,expectedUser)=>{
    const call={action,payload:clone(payload),signal,expectedUser,user:session?.user?.id};calls.push(call);
    if(handler)return handler(call);
    if(action==='progress')return clone(record);
    if(payload.revision!==record.revision)throw Object.assign(new Error('conflict'),{code:'LUMINA_CONFLICT'});
    record={revision:record.revision+1,progress:clone(payload.progress)};return clone(record);
  };
  const dispose=createProgressBridge(frame,{window:w,client,requestGame:request,onAccountReady:options.onAccountReady});
  t.after(async()=>{
    const done=dispose();session=null;w.document.dispatchEvent(new w.Event('matchapp:authchange'));
    await settle();await done;dom.window.close();
  });
  function message(data,extra={}) {w.dispatchEvent(new w.MessageEvent('message',{source:extra.source||child,origin:extra.origin||'https://matchapp.tv',data}));}
  async function load(){message({type:'lumina:progress-load'});await settle();}
  async function change(value,explicit=false){childSnapshot=clone(value);message({type:'lumina:progress-change',progress:value,explicit});await settle();}
  async function advance(ms){
    const target=time+ms;let count=0;
    while(true){const next=[...timers].filter(([,v])=>v.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;
      assert.ok(++count<100,'Timer loop');time=next[1].at;timers.delete(next[0]);next[1].fn();await settle();}
    time=target;await settle();
  }
  return {w,child,frame,sent,calls,dispose,message,load,change,advance,
    mode:()=>sent.at(-1)?.value.mode,
    setSnapshot:value=>{childSnapshot=value;},
    setHandler:value=>{handler=value;},
    setRecord:value=>{record=clone(value);},
    setSession:value=>{session=value;},
    authChange(){w.document.dispatchEvent(new w.Event('matchapp:authchange'));}
  };
}

test('progress snapshots preserve six valid pairs while dropping transient reveals and extra fields', async()=>{
  const {progressSnapshot}=await modulePromise;
  const value=snapshot(20,5);value.extra='not persisted';value.activeRound.cards[0].flipped=true;
  assert.deepEqual(progressSnapshot(value),snapshot(20,5));
  assert.deepEqual(progressSnapshot({points:0,rounds:0,activeRound:null}),{points:0,rounds:0,activeRound:null});
  for(const invalid of [
    {...snapshot(),points:-1},{...snapshot(),rounds:Infinity},
    {...snapshot(),activeRound:{cards:snapshot().activeRound.cards.slice(0,10),moves:0}},
    {...snapshot(),activeRound:{cards:snapshot().activeRound.cards.map((card,index)=>index===0?{art:'untrusted',matched:false}:card),moves:0}},
    {...snapshot(),activeRound:{cards:snapshot().activeRound.cards.map((card,index)=>index===0?{...card,matched:true}:card),moves:0}},
    {...snapshot(),activeRound:{cards:snapshot().activeRound.cards,moves:1000001}}
  ])assert.throws(()=>progressSnapshot(invalid),error=>error.code==='LUMINA_INVALID');
});

test('guest games remain local and are not automatically imported when an account signs in', async t=>{
  const f=await fixture(t,{guest:true,local:snapshot(90),progress:null,revision:0});
  await f.load();assert.equal(f.mode(),'guest');assert.equal(f.calls.length,0);
  await f.change(snapshot(100));assert.equal(f.calls.length,0);
  f.setSession({user:{id:'new-account',is_anonymous:false},access_token:'ANOTHER_PRIVATE_TOKEN'});f.authChange();
  assert.deepEqual(f.sent.at(-1).value,{type:'lumina:progress-state',mode:'loading',progress:null,revision:null});
  await f.advance(0);assert.equal(f.mode(),'account');
  assert.deepEqual(f.sent.at(-1).value,{type:'lumina:progress-state',mode:'account',progress:null,revision:0});
  assert.deepEqual(f.calls.map(c=>c.action),['progress']);
  assert.equal(JSON.stringify(f.sent).includes('PRIVATE_TOKEN'),false);
});

test('account loading restores exact progress and unchanged snapshots do not write again', async t=>{
  const value=snapshot(30,8),f=await fixture(t,{progress:value,revision:4});
  await f.load();assert.equal(f.mode(),'account');
  assert.deepEqual(f.sent.at(-1).value.progress,value);assert.equal(f.sent.at(-1).value.revision,4);
  await f.change(value);await f.change(value);assert.deepEqual(f.calls.map(c=>c.action),['progress']);
  await f.dispose();assert.deepEqual(f.calls.map(c=>c.action),['progress']);
  assert.equal(JSON.stringify(f.sent).includes('NEVER_SEND_ACCOUNT_TOKEN'),false);
});

test('saves are serialized and coalesce pending changes into the newest snapshot', async t=>{
  const f=await fixture(t);await f.load();
  const first=deferred();let saves=0;
  f.setHandler(call=>{
    if(call.action==='save_progress' && ++saves===1)return first.promise;
    return {revision:call.payload.revision+1,progress:clone(call.payload.progress)};
  });
  await f.change(snapshot(20,1));await f.change(snapshot(20,2));await f.change(snapshot(20,3));
  assert.equal(f.calls.filter(c=>c.action==='save_progress').length,1);assert.equal(f.mode(),'saving');
  first.resolve({revision:2,progress:snapshot(20,1)});await settle();
  const writes=f.calls.filter(c=>c.action==='save_progress');assert.equal(writes.length,2);
  assert.deepEqual(writes[1].payload,{revision:2,progress:snapshot(20,3)});assert.equal(f.mode(),'saved');
  assert.deepEqual(f.sent.at(-1).value,{type:'lumina:progress-state',mode:'saved',revision:3});
  assert.ok(f.sent.filter(item=>item.value.mode==='saved').every(item=>!Object.hasOwn(item.value,'progress')),'Save acknowledgments must not overwrite newer child moves');
});

test('explicit reload waits for the latest queued save before reading account progress', async t=>{
  const f=await fixture(t);await f.load();const pending=deferred();let writes=0,remote={revision:1,progress:snapshot(10)};
  f.setHandler(call=>{
    if(call.action==='progress')return clone(remote);
    if(++writes===1)return pending.promise;
    remote={revision:call.payload.revision+1,progress:clone(call.payload.progress)};return clone(remote);
  });
  await f.change(snapshot(20,1));await f.change(snapshot(20,2));await f.load();
  pending.resolve({revision:2,progress:snapshot(20,1)});await settle();
  assert.deepEqual(f.calls.map(c=>c.action),['progress','save_progress','save_progress','progress']);
  assert.deepEqual(f.sent.at(-1).value.progress,snapshot(20,2));
});

test('closing the iframe flushes its latest snapshot after an in-flight save instead of aborting it', async t=>{
  const f=await fixture(t);await f.load();const first=deferred(),last=deferred();let writes=0;
  f.setHandler(()=>++writes===1?first.promise:last.promise);
  await f.change(snapshot(20,1));f.setSnapshot(snapshot(20,4));
  const firstWrite=f.calls.at(-1),done=f.dispose();f.frame.contentWindow=null;
  assert.equal(firstWrite.signal.aborted,false);
  first.resolve({revision:2,progress:snapshot(20,1)});await settle();
  assert.deepEqual(f.calls.at(-1).payload,{revision:2,progress:snapshot(20,4)});
  assert.equal(f.calls.at(-1).signal.aborted,false);
  last.resolve({revision:3,progress:snapshot(20,4)});await done;
  assert.equal(f.calls.filter(c=>c.action==='save_progress').length,2);
});

test('the disposer captures a last dirty snapshot even without a preceding change message', async t=>{
  const f=await fixture(t);await f.load();f.setSnapshot(snapshot(40,7));
  await f.dispose();
  assert.equal(f.calls.at(-1).action,'save_progress');
  assert.deepEqual(f.calls.at(-1).payload,{revision:1,progress:snapshot(40,7)});
});

test('conflicts stop writes and explicit reload adopts server progress without replaying stale local changes', async t=>{
  const f=await fixture(t);await f.load();
  f.setHandler(()=>Promise.reject(Object.assign(new Error('conflict'),{code:'LUMINA_CONFLICT'})));
  await f.change(snapshot(50));assert.equal(f.mode(),'conflict');
  await f.change(snapshot(60));assert.equal(f.calls.filter(c=>c.action==='save_progress').length,1);
  const remote={revision:7,progress:snapshot(80,9)};f.setHandler(()=>clone(remote));
  await f.load();assert.equal(f.mode(),'account');assert.deepEqual(f.sent.at(-1).value.progress,remote.progress);
  assert.equal(f.calls.filter(c=>c.action==='save_progress').length,1);
});

test('the 14-second bound aborts stalled writes and reports offline without claiming a save', async t=>{
  const f=await fixture(t);await f.load();const never=deferred();f.setHandler(()=>never.promise);
  await f.change(snapshot(30));const writing=f.calls.at(-1);
  await f.advance(14000);assert.equal(writing.signal.aborted,true);assert.equal(f.mode(),'offline');
  assert.equal(f.sent.some(item=>item.value.mode==='saved'),false);
  await f.change(snapshot(40));assert.equal(f.calls.filter(c=>c.action==='save_progress').length,1);
  await f.dispose();never.resolve({revision:2,progress:snapshot(30)});await settle();
});

test('auth changes immediately clear prior progress, abort queued old-account saves and load the new account', async t=>{
  const f=await fixture(t);await f.load();const old=deferred();
  f.setHandler(call=>call.action==='save_progress'?old.promise:{revision:6,progress:snapshot(90)});
  await f.change(snapshot(20,1));await f.change(snapshot(20,2));const writing=f.calls.at(-1);
  f.setSession({user:{id:'account-b',is_anonymous:false},access_token:'PRIVATE_NEW_ACCOUNT_TOKEN'});f.authChange();
  assert.equal(writing.signal.aborted,true);
  assert.deepEqual(f.sent.at(-1).value,{type:'lumina:progress-state',mode:'loading',progress:null,revision:null});
  await f.advance(0);assert.equal(f.mode(),'account');assert.deepEqual(f.sent.at(-1).value.progress,snapshot(90));
  old.resolve({revision:2,progress:snapshot(20,1)});await settle();
  assert.equal(f.calls.filter(c=>c.action==='save_progress').length,1);
  assert.ok(f.calls.filter(c=>c.user==='account-b').every(c=>c.action==='progress'));
  assert.equal(JSON.stringify(f.sent).includes('PRIVATE_NEW_ACCOUNT_TOKEN'),false);
});

test('account switching after iframe close still aborts detached old-account writes and clears their queue', async t=>{
  const f=await fixture(t);await f.load();const old=deferred();f.setHandler(()=>old.promise);
  await f.change(snapshot(20,1));f.setSnapshot(snapshot(20,4));const writing=f.calls.at(-1),done=f.dispose();
  f.frame.contentWindow=null;f.setSession({user:{id:'account-b',is_anonymous:false}});f.authChange();
  assert.equal(writing.signal.aborted,true);await done;
  old.resolve({revision:2,progress:snapshot(20,1)});await settle();
  assert.equal(f.calls.filter(c=>c.action==='save_progress').length,1);
  assert.equal(f.calls.some(c=>c.user==='account-b'),false);
});

test('each save checks the pinned account identity even when no auth event was delivered', async t=>{
  const f=await fixture(t);await f.load();
  f.setSession({user:{id:'account-b',is_anonymous:false}});
  f.setRecord({revision:4,progress:snapshot(70)});await f.change(snapshot(20));
  assert.equal(f.calls.filter(c=>c.action==='save_progress').length,0);
  await f.advance(0);assert.equal(f.mode(),'account');assert.deepEqual(f.sent.at(-1).value.progress,snapshot(70));
});

test('RPC authentication receives the pinned owner and an internal session race reloads the new account', async t=>{
  const f=await fixture(t);await f.load();assert.equal(f.calls[0].expectedUser,'account-a');
  f.setHandler(call=>{
    if(call.action==='save_progress') {
      assert.equal(call.expectedUser,'account-a');
      f.setSession({user:{id:'account-b',is_anonymous:false}});
      throw Object.assign(new Error('Session changed inside requestGame'),{code:'LUMINA_AUTH_CHANGED'});
    }
    assert.equal(call.expectedUser,'account-b');
    return {revision:9,progress:snapshot(90)};
  });
  await f.change(snapshot(20));assert.equal(f.mode(),'loading');
  await f.advance(0);assert.equal(f.mode(),'account');assert.deepEqual(f.sent.at(-1).value.progress,snapshot(90));
  assert.equal(f.sent.some(item=>item.value.mode==='offline'),false);
  assert.equal(f.calls.filter(call=>call.action==='save_progress').length,1);
});

test('foreign frame messages cannot load or modify progress, and offline startup cannot save guest state to an account', async t=>{
  const f=await fixture(t);
  f.message({type:'lumina:progress-load'},{origin:'https://example.invalid'});
  f.message({type:'lumina:progress-load'},{source:{}});await settle();assert.equal(f.calls.length,0);
  f.setHandler(()=>Promise.reject(new Error('offline')));await f.load();assert.equal(f.mode(),'offline');
  await f.change(snapshot(90));assert.equal(f.calls.filter(c=>c.action==='save_progress').length,0);
  assert.equal(f.sent.some(item=>item.value.mode==='account'),false);
});

test('a legacy account can start the campaign without replacing its existing classic totals and board', async t=>{
  const f=await fixture(t,{progress:snapshot(30),revision:8});await f.load();
  const upgraded=campaignSnapshot(1,2);await f.change(upgraded);
  assert.deepEqual(f.calls.at(-1).payload,{revision:8,progress:upgraded});assert.equal(f.mode(),'saved');
  await f.load();assert.deepEqual(f.sent.at(-1).value.progress,upgraded);assert.equal(f.sent.at(-1).value.revision,9);
  await f.change(upgraded);assert.equal(f.calls.filter(call=>call.action==='save_progress').length,1);
});

test('closing a campaign flushes its latest board and elapsed time after an in-flight save', async t=>{
  const initial=campaignSnapshot(249,4),f=await fixture(t,{progress:initial,revision:20});await f.load();
  assert.deepEqual(f.sent.at(-1).value.progress,initial);
  const first=deferred(),last=deferred();let writes=0;
  f.setHandler(()=>++writes===1?first.promise:last.promise);
  const moving=campaignSnapshot(249,5),latest=campaignSnapshot(249,6);
  latest.campaign.activeLevel.elapsedSeconds=121;latest.campaign.activeLevel.hintsUsed=2;
  const matched=latest.campaign.activeLevel.cards[0].art;
  latest.campaign.activeLevel.cards.forEach(card=>{card.matched=card.art===matched;});
  await f.change(moving);f.setSnapshot(latest);
  const pending=f.calls.at(-1),done=f.dispose();f.frame.contentWindow=null;
  assert.equal(pending.signal.aborted,false);
  first.resolve({revision:21,progress:moving});await settle();
  assert.deepEqual(f.calls.at(-1).payload,{revision:21,progress:latest});
  assert.equal(f.calls.at(-1).expectedUser,'account-a');
  last.resolve({revision:22,progress:latest});await done;
  assert.equal(f.calls.filter(call=>call.action==='save_progress').length,2);
  assert.doesNotMatch(JSON.stringify(f.sent),/NEVER_SEND_ACCOUNT_TOKEN|access_token|account-a/);
});

test('campaign auth resets clear old private progress and drop pending boards before another account loads', async t=>{
  const f=await fixture(t,{progress:campaignSnapshot(100,2)});await f.load();
  const stale=deferred();f.setHandler(()=>stale.promise);
  await f.change(campaignSnapshot(100,3));await f.change(campaignSnapshot(100,4));
  const writing=f.calls.at(-1);
  f.setSession({user:{id:'account-b',is_anonymous:false},access_token:'SECOND_PRIVATE_TOKEN'});
  f.setHandler(call=>({revision:1,progress:campaignSnapshot(1)}));f.authChange();
  assert.equal(writing.signal.aborted,true);
  assert.deepEqual(f.sent.at(-1).value,{type:'lumina:progress-state',mode:'loading',progress:null,revision:null});
  await f.advance(0);assert.deepEqual(f.sent.at(-1).value.progress,campaignSnapshot(1));
  stale.resolve({revision:2,progress:campaignSnapshot(100,3)});await settle();
  assert.equal(f.calls.filter(call=>call.action==='save_progress').length,1);
  assert.equal(f.calls.filter(call=>call.action==='save_progress'&&call.user==='account-b').length,0);
  assert.deepEqual(f.sent.at(-1).value.progress,campaignSnapshot(1));
});

test('a campaign conflict cannot replay an older board over a newer remote level', async t=>{
  const f=await fixture(t,{progress:campaignSnapshot(99,2),revision:10});await f.load();
  f.setHandler(()=>Promise.reject(Object.assign(new Error('conflict'),{code:'LUMINA_CONFLICT'})));
  await f.change(campaignSnapshot(99,3));assert.equal(f.mode(),'conflict');
  await f.change(campaignSnapshot(99,4));assert.equal(f.calls.filter(call=>call.action==='save_progress').length,1);
  f.setHandler(null);f.setRecord({revision:12,progress:campaignSnapshot(100,1)});await f.load();
  assert.equal(f.mode(),'account');assert.deepEqual(f.sent.at(-1).value.progress,campaignSnapshot(100,1));
  await f.dispose();assert.equal(f.calls.filter(call=>call.action==='save_progress').length,1);
});

test('explicit Save confirms an unchanged server snapshot without rewriting it and still checks the active account', async t=>{
  const value=campaignSnapshot(12,3),f=await fixture(t,{progress:value,revision:7});await f.load();
  const before=f.sent.length;await f.change(value,true);
  assert.deepEqual(f.sent.slice(before).map(item=>item.value.mode),['saving','saved']);
  assert.deepEqual(f.sent.at(-1).value,{type:'lumina:progress-state',mode:'saved',revision:7});
  assert.deepEqual(f.calls.map(call=>call.action),['progress']);
  f.setSession({user:{id:'account-b',is_anonymous:false},access_token:'OTHER_PRIVATE_TOKEN'});
  f.setRecord({revision:4,progress:campaignSnapshot(1)});
  const switching=f.sent.length;await f.change(value,true);assert.equal(f.mode(),'loading');
  assert.equal(f.sent.slice(switching).some(item=>item.value.mode==='saved'),false);
  await f.advance(0);assert.deepEqual(f.sent.at(-1).value.progress,campaignSnapshot(1));
  assert.equal(f.calls.filter(call=>call.action==='save_progress').length,0);
});

test('explicit Save during an in-flight campaign checkpoint waits for the same write acknowledgement', async t=>{
  const f=await fixture(t,{progress:campaignSnapshot(20,1)});await f.load();
  const pending=deferred();f.setHandler(()=>pending.promise);
  const value=campaignSnapshot(20,2);await f.change(value);
  await f.change(value,true);await f.change(value,true);
  assert.equal(f.calls.filter(call=>call.action==='save_progress').length,1);assert.equal(f.mode(),'saving');
  assert.equal(f.sent.some(item=>item.value.mode==='saved'),false);
  pending.resolve({revision:2,progress:value});await settle();
  assert.equal(f.mode(),'saved');assert.equal(f.calls.filter(call=>call.action==='save_progress').length,1);
});

test('registration stages only an explicitly supplied guest snapshot in memory and queues it after verified account readiness', async t=>{
  const ready=[],value=campaignSnapshot(3,4),expected=clone(value);
  const f=await fixture(t,{guest:true,progress:null,revision:0,onAccountReady(...args){ready.push(args);}});
  assert.equal(f.dispose.stageRegistration(value),false,'loading is not verified guest mode');
  await f.load();assert.equal(f.dispose.stageRegistration({...value,version:3}),false);
  assert.equal(f.dispose.stageRegistration(value),true);value.campaign.activeLevel.moves=99;
  assert.equal(f.calls.length,0);assert.equal(f.w.localStorage.length,0);assert.equal(ready.length,0);
  const pending=deferred();f.setHandler(call=>call.action==='progress'?{revision:0,progress:null}:pending.promise);
  f.setSession({user:{id:'registered-account',is_anonymous:false},access_token:'PRIVATE_REGISTERED_TOKEN'});f.authChange();
  await f.advance(0);
  assert.deepEqual(ready,[[]],'the parent gets no account identity or credentials');
  assert.deepEqual(f.sent.findLast(item=>item.value.mode==='account').value,{type:'lumina:progress-state',mode:'account',progress:expected,revision:0});
  assert.equal(f.mode(),'saving','account readiness is separate from save success');
  assert.deepEqual(f.calls.at(-1).payload,{revision:0,progress:expected});
  assert.equal(f.calls.at(-1).expectedUser,'registered-account');
  assert.equal(f.sent.some(item=>item.value.mode==='saved'),false);
  pending.resolve({revision:1,progress:expected});await settle();assert.equal(f.mode(),'saved');
  assert.equal(f.w.localStorage.length,0);assert.doesNotMatch(JSON.stringify(f.sent),/PRIVATE_REGISTERED_TOKEN|access_token/);
});

test('registration never overwrites an existing account save or carries the staged guest game into a later account', async t=>{
  const saved=campaignSnapshot(120,8),f=await fixture(t,{guest:true,progress:saved,revision:42});await f.load();
  assert.equal(f.dispose.stageRegistration(campaignSnapshot(2,1)),true);
  f.setSession({user:{id:'account-a',is_anonymous:false},access_token:'FIRST_PRIVATE_TOKEN'});f.authChange();await f.advance(0);
  assert.deepEqual(f.sent.at(-1).value.progress,saved);assert.equal(f.dispose.stageRegistration(campaignSnapshot(1)),false);
  assert.equal(f.calls.filter(call=>call.action==='save_progress').length,0);
  f.setSession({user:{id:'account-b',is_anonymous:false},access_token:'SECOND_PRIVATE_TOKEN'});
  f.setRecord({revision:0,progress:null});f.authChange();await f.advance(0);
  assert.equal(f.sent.at(-1).value.progress,null);
  assert.equal(f.calls.filter(call=>call.action==='save_progress').length,0);
});

test('canceling registration disposes its memory snapshot before any later sign-in can save it', async t=>{
  let ready=0;const f=await fixture(t,{guest:true,progress:null,revision:0,onAccountReady(){ready++;}});await f.load();
  assert.equal(f.dispose.stageRegistration(campaignSnapshot(1,2)),true);
  await f.dispose();assert.equal(f.dispose.stageRegistration(campaignSnapshot(1,3)),false);
  f.setSession({user:{id:'account-a',is_anonymous:false},access_token:'LATER_PRIVATE_TOKEN'});f.authChange();await f.advance(0);
  assert.equal(f.calls.length,0);assert.equal(ready,0);assert.equal(f.w.localStorage.length,0);
});

test('switching accounts while a staged registration save is pending aborts it and cannot import it into the second account', async t=>{
  const value=campaignSnapshot(4,3),f=await fixture(t,{guest:true,progress:null,revision:0});await f.load();
  assert.equal(f.dispose.stageRegistration(value),true);
  const pending=deferred();f.setHandler(call=>call.action==='progress'?{revision:0,progress:null}:pending.promise);
  f.setSession({user:{id:'account-a',is_anonymous:false},access_token:'FIRST_PRIVATE_TOKEN'});f.authChange();await f.advance(0);
  const writing=f.calls.at(-1);assert.equal(writing.action,'save_progress');assert.equal(writing.expectedUser,'account-a');
  f.setSession({user:{id:'account-b',is_anonymous:false},access_token:'SECOND_PRIVATE_TOKEN'});f.authChange();
  assert.equal(writing.signal.aborted,true);await f.advance(0);
  assert.equal(f.sent.at(-1).value.progress,null);
  pending.resolve({revision:1,progress:value});await settle();
  assert.equal(f.calls.filter(call=>call.action==='save_progress').length,1);
  assert.equal(f.calls.some(call=>call.action==='save_progress'&&call.expectedUser==='account-b'),false);
});

test('staged registration binds the first registered account before its pending read and is discarded if another account signs in', async t=>{
  const value=campaignSnapshot(4,3),f=await fixture(t,{guest:true,progress:null,revision:0});await f.load();
  assert.equal(f.dispose.stageRegistration(value),true);
  const pending=deferred();f.setHandler(call=>{
    assert.equal(call.action,'progress','neither account may receive a save from a canceled registration read');
    return call.expectedUser==='account-a'?pending.promise:{revision:0,progress:null};
  });
  f.setSession({user:{id:'account-a',is_anonymous:false},access_token:'FIRST_PRIVATE_TOKEN'});f.authChange();await f.advance(0);
  const reading=f.calls.at(-1);assert.equal(reading.action,'progress');assert.equal(reading.expectedUser,'account-a');
  f.setSession({user:{id:'account-b',is_anonymous:false},access_token:'SECOND_PRIVATE_TOKEN'});f.authChange();
  assert.equal(reading.signal.aborted,true);await settle();await f.advance(0);
  assert.equal(f.sent.at(-1).value.progress,null);assert.equal(f.mode(),'account');
  pending.resolve({revision:0,progress:null});await settle();
  assert.equal(f.calls.filter(call=>call.action==='save_progress').length,0);
  assert.equal(f.sent.some(item=>item.value.mode==='account'&&item.value.progress?.campaign?.unlocked===4),false);
});

test('anonymous sessions cannot consume staged registration or trigger account readiness', async t=>{
  let ready=0;const f=await fixture(t,{guest:true,progress:null,revision:0,onAccountReady(){ready++;}});await f.load();
  const value=campaignSnapshot(1,2);assert.equal(f.dispose.stageRegistration(value),true);
  f.setSession({user:{id:'anonymous-session',is_anonymous:true},access_token:'ANONYMOUS_TOKEN'});f.authChange();await f.advance(0);
  assert.equal(f.mode(),'guest');assert.equal(f.calls.length,0);assert.equal(ready,0);
  f.setSession({user:{id:'registered-account',is_anonymous:false},access_token:'REGISTERED_TOKEN'});f.authChange();await f.advance(0);
  assert.equal(ready,1);assert.deepEqual(f.calls.at(-1).payload,{revision:0,progress:value});assert.equal(f.mode(),'saved');
});

test('staged registration respects the loaded revision if another device saves first and does not claim save success', async t=>{
  let ready=0;const f=await fixture(t,{guest:true,progress:null,revision:0,onAccountReady(){ready++;}});await f.load();
  assert.equal(f.dispose.stageRegistration(campaignSnapshot(1,2)),true);
  f.setHandler(call=>{
    if(call.action==='progress')return {revision:0,progress:null};
    assert.equal(call.payload.revision,0);throw Object.assign(new Error('another device saved'),{code:'LUMINA_CONFLICT'});
  });
  f.setSession({user:{id:'account-a',is_anonymous:false},access_token:'REGISTERED_PRIVATE_TOKEN'});f.authChange();await f.advance(0);
  assert.equal(ready,1);assert.equal(f.mode(),'conflict');assert.equal(f.sent.some(item=>item.value.mode==='saved'),false);
  assert.equal(f.calls.filter(call=>call.action==='save_progress').length,1);
});
