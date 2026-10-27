/* Parent-only cloud-progress state tests. These mocks create no sessions,
 * account records, real game saves or network requests. */
const test = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const modulePromise = import('../lumina-match/progress-bridge.mjs');
const settle = () => new Promise(resolve=>setImmediate(resolve));
const clone = value=>JSON.parse(JSON.stringify(value));
const snapshot = (points=0,moves=0)=>({points,rounds:Math.floor(points/10),activeRound:{
  cards:['moon','star','planet','heart','crystal','sun','moon','star','planet','heart','crystal','sun'].map(art=>({art,matched:false})),moves
}});
const deferred = () => {let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};

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
  const dispose=createProgressBridge(frame,{window:w,client,requestGame:request});
  t.after(async()=>{
    const done=dispose();session=null;w.document.dispatchEvent(new w.Event('matchapp:authchange'));
    await settle();await done;dom.window.close();
  });
  function message(data,extra={}) {w.dispatchEvent(new w.MessageEvent('message',{source:extra.source||child,origin:extra.origin||'https://matchapp.tv',data}));}
  async function load(){message({type:'lumina:progress-load'});await settle();}
  async function change(value){childSnapshot=clone(value);message({type:'lumina:progress-change',progress:value});await settle();}
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
