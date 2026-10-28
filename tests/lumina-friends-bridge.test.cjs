/* Exercise the real bridge's input and message boundaries with synthetic sessions only. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {JSDOM} = require('jsdom');
const ROOT = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(ROOT, name), 'utf8');
const ORIGIN = 'https://matchapp.tv';
const USER = '12345678-1234-4123-8123-123456789abc';
const FRIEND = 'abcdef12-3456-4234-8234-abcdef123456';
const CODE = 'room_code_123';
const exported = import('../lumina-match/friends-bridge.mjs');
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return {promise, resolve, reject};
};
const session = id => ({user:{id:id || USER,is_anonymous:false},access_token:'fixture-access-only',refresh_token:'fixture-refresh-only'});
const withHeaders = query => {
  query.headers = new Headers();
  query.setHeader = (name,value) => {query.headers = new Headers(query.headers);query.headers.set(name,value);return query;};
  return query;
};

function fixture(t, client) {
  const dom = new JSDOM('<!doctype html><html><body><div id="stage"></div></body></html>', {url:ORIGIN + '/'});
  const w = dom.window, timers = new Map(), posted = [], navigated = [];
  let nextTimer = 0, closed = 0;
  const setTimer = fn => { timers.set(++nextTimer,fn); return nextTimer; };
  const clearTimer = id => timers.delete(id);
  const location = {origin:ORIGIN,search:'',assign:target => navigated.push(target)};
  const context = vm.createContext({window:w,document:w.document,location,AbortController,URL,URLSearchParams,
    MutationObserver:w.MutationObserver,setTimeout:setTimer,clearTimeout:clearTimer});
  vm.runInContext(read('lumina-match/friends-bridge.mjs').replace(/^export /gm,'') +
    '\nglobalThis.makeBridge = createFriendsBridge;',context);
  const frame = w.document.createElement('iframe');
  frame.src = ORIGIN + '/lumina-match/browser/index.html';
  w.document.querySelector('#stage').append(frame);
  const source = frame.contentWindow;
  source.postMessage = (data,origin) => posted.push({data:JSON.parse(JSON.stringify(data)),origin});
  w.supabaseClient = client;
  const dispose = context.makeBridge(frame,{close(){closed++;}});
  const send = (data, overrides = {}) => w.dispatchEvent(new w.MessageEvent('message', {
    data, origin:overrides.origin ?? ORIGIN, source:overrides.source ?? source
  }));
  const rpc = (id,action='list',payload={}) => send({type:'lumina:rpc',id,action,payload});
  t.after(() => { dispose(); dom.window.close(); });
  return {w,frame,source,posted,navigated,timers,send,rpc,dispose,context,location,
    authChange(){w.document.dispatchEvent(new w.Event('matchapp:authchange'));},get closed(){return closed;}};
}

test('Lumina payloads whitelist actions, validate identifiers and discard unrelated fields',async()=>{
  const {gamePayload} = await exported;
  assert.deepEqual(gamePayload('list',{token:'fixture-token',role:'admin'}),{});
  assert.deepEqual(gamePayload('create',{friend:FRIEND,score:999,token:'fixture-token'}),{friend:FRIEND});
  for(const action of ['accept','decline','cancel','get','leave']) {
    assert.deepEqual(gamePayload(action,{code:CODE,index:5,revision:8,token:'fixture-token'}),{code:CODE});
  }
  assert.deepEqual(gamePayload('flip',{code:CODE,index:11,revision:3,friend:FRIEND,score:99}),{code:CODE,index:11,revision:3});
  for(const [action,input] of [
    ['delete_user',{}],['rpc',{}],['list',null],['list',[]],['create',{friend:'../private'}],
    ['get',{code:'short'}],['get',{code:'../../private'}],['get',{code:'x'.repeat(65)}],
    ['flip',{code:CODE,index:-1,revision:0}],['flip',{code:CODE,index:12,revision:0}],
    ['flip',{code:CODE,index:'1',revision:0}],['flip',{code:CODE,index:1.5,revision:0}],
    ['flip',{code:CODE,index:0,revision:-1}],['flip',{code:CODE,index:0,revision:Number.MAX_SAFE_INTEGER+1}]
  ]) assert.throws(()=>gamePayload(action,input),error=>error.code==='LUMINA_INVALID',action);
});

test('guest and anonymous sessions never call a game RPC',async()=>{
  const {requestGame} = await exported;
  await assert.rejects(requestGame(null,'list',{}),error=>error.code==='LUMINA_UNAVAILABLE');
  let calls = 0;
  for(const value of [null,{user:{id:USER,is_anonymous:true}},{user:{}}]) {
    const client={auth:{getSession:async()=>({data:{session:value}})},rpc(){calls++;}};
    await assert.rejects(requestGame(client,'list',{}),error=>error.code==='LUMINA_AUTH_REQUIRED');
  }
  assert.equal(calls,0);
});

test('signed requests pin transport credentials while keeping payloads and results credential-free',async()=>{
  const {requestGame} = await exported;
  const calls=[], signals=[], queries=[], controller=new AbortController();
  const gameData={games:[],friends:[{id:FRIEND,name:'Fixture friend'}]};
  const client={auth:{getSession:async()=>({data:{session:session()}})},rpc(name,args){
    calls.push({name,args});
    const query=withHeaders(Promise.resolve({data:gameData,error:null}));
    queries.push(query);
    query.abortSignal=signal=>{signals.push(signal);return query;};
    return query;
  }};
  assert.equal(await requestGame(client,'create',{friend:FRIEND,access_token:'untrusted'},controller.signal),gameData);
  assert.deepEqual(calls,[{name:'lumina_action',args:{p_action:'create',p_payload:{friend:FRIEND}}}]);
  assert.equal(queries[0].headers.get('Authorization'),'Bearer fixture-access-only');
  assert.equal(signals[0],controller.signal);
  assert.doesNotMatch(JSON.stringify({calls,gameData}),/fixture-access-only|fixture-refresh-only|untrusted/);
  controller.abort();
  await assert.rejects(requestGame(client,'list',{},controller.signal),error=>error.code==='LUMINA_UNAVAILABLE');
  assert.equal(calls.length,1);
});

test('missing access tokens and unsupported header pinning fail before RPC transport',async()=>{
  const {requestGame} = await exported;
  let built=0,dispatched=0;
  for(const access_token of [undefined,null,'','  ',123]) {
    const client={auth:{getSession:async()=>({data:{session:{...session(),access_token}}})},rpc(){built++;}};
    await assert.rejects(requestGame(client,'list',{}),error=>error.code==='LUMINA_AUTH_REQUIRED');
  }
  assert.equal(built,0,'invalid credentials must not build a query');
  const client={auth:{getSession:async()=>({data:{session:session()}})},rpc(){
    built++;
    return {then(resolve,reject){dispatched++;return Promise.resolve({data:{},error:null}).then(resolve,reject);}};
  }};
  await assert.rejects(requestGame(client,'list',{}),error=>error.code==='LUMINA_UNAVAILABLE');
  assert.equal(built,1);assert.equal(dispatched,0,'an unsupported lazy builder must never be dispatched');
});

test('a changed expected account is rejected before constructing a query',async()=>{
  const {requestGame} = await exported;
  let built=0;
  const client={auth:{getSession:async()=>({data:{session:session(FRIEND)}})},rpc(){built++;}};
  await assert.rejects(requestGame(client,'progress',{},undefined,USER),error=>error.code==='LUMINA_AUTH_CHANGED');
  assert.equal(built,0);
});

test('a completed 250-level campaign uses the same checked per-request account and credential-free payload',async()=>{
  const {requestGame}=await exported;
  const progress={version:2,points:25000,rounds:250,activeRound:null,campaign:{
    unlocked:250,results:Array.from({length:250},()=>[3,20,60]),activeLevel:null
  }};
  const calls=[],queries=[],client={auth:{getSession:async()=>({data:{session:session()}})},rpc(name,args){
    calls.push({name,args});const query=withHeaders(Promise.resolve({data:{revision:7,progress},error:null}));queries.push(query);return query;
  }};
  const result=await requestGame(client,'save_progress',{revision:6,progress:{...progress,user:FRIEND,access_token:'untrusted'},user:FRIEND},undefined,USER);
  assert.deepEqual(result,{revision:7,progress});
  assert.deepEqual(calls,[{name:'lumina_action',args:{p_action:'save_progress',p_payload:{revision:6,progress}}}]);
  assert.equal(queries[0].headers.get('Authorization'),'Bearer fixture-access-only');
  assert.doesNotMatch(JSON.stringify(calls),/fixture-access-only|refresh_token|untrusted/);
});

test('a delayed SDK auth lookup cannot move a save to another account or mutate shared headers',async()=>{
  const {requestGame} = await exported;
  const accountA={...session(USER),access_token:'fixture-account-a'};
  const accountB={...session(FRIEND),access_token:'fixture-account-b'};
  const sharedHeaders=new Headers({'X-Shared-Fixture':'unchanged'}),queries=[],requests=[];
  const progress={points:10,rounds:1,activeRound:null};
  let reads=0;
  const client={auth:{getSession:async()=>({data:{session:++reads===1?accountA:accountB}})},rpc(name,args){
    const query=withHeaders({then(resolve,reject){
      // Supabase's fetchWithAuth reads the shared session a second time at
      // dispatch and preserves an Authorization header already on the query.
      return Promise.resolve().then(async()=>{
        const live=(await client.auth.getSession()).data.session;
        const headers=new Headers(query.headers);
        if(!headers.has('Authorization'))headers.set('Authorization','Bearer '+live.access_token);
        requests.push({name,args,authorization:headers.get('Authorization')});
        return {data:{revision:1,progress},error:null};
      }).then(resolve,reject);
    }});
    query.headers=sharedHeaders;
    queries.push(query);return query;
  }};
  await requestGame(client,'save_progress',{revision:0,progress},undefined,USER);
  assert.equal(reads,2);
  assert.equal(requests[0].authorization,'Bearer fixture-account-a');
  assert.deepEqual(requests[0].args,{p_action:'save_progress',p_payload:{revision:0,progress}});
  await requestGame(client,'progress',{},undefined,FRIEND);
  assert.equal(requests[1].authorization,'Bearer fixture-account-b');
  assert.equal(queries[0].headers.get('Authorization'),'Bearer fixture-account-a');
  assert.equal(sharedHeaders.has('Authorization'),false);
  assert.equal(sharedHeaders.get('X-Shared-Fixture'),'unchanged');
  assert.doesNotMatch(JSON.stringify(requests.map(request=>request.args)),/fixture-account-[ab]|refresh_token/);
});

test('RPC error responses expose only stable Lumina codes',async()=>{
  const {requestGame} = await exported;
  for(const [error,expected] of [
    [{message:'internal database detail fixture-secret',code:'XX000'},'LUMINA_UNAVAILABLE'],
    [{message:'invalid authentication fixture-secret',code:'PGRST301'},'LUMINA_AUTH_REQUIRED'],
    [{message:'details: LUMINA_FRIEND_REQUIRED; fixture-secret'},'LUMINA_FRIEND_REQUIRED']
  ]) {
    const client={auth:{getSession:async()=>({data:{session:session()}})},rpc:()=>withHeaders(Promise.resolve({data:null,error}))};
    await assert.rejects(requestGame(client,'list',{}),failure=>{
      assert.equal(failure.code,expected);assert.equal(failure.message,expected);return true;
    });
  }
});

test('frame messages must match both origin and exact source window',async t=>{
  const calls=[];
  const client={auth:{getSession:async()=>({data:{session:session()}})},rpc(name,args){calls.push({name,args});return withHeaders(Promise.resolve({data:{friends:[],games:[]},error:null}));}};
  const f=fixture(t,client), message={type:'lumina:rpc',id:'safe',action:'list',payload:{}};
  f.send(message,{origin:'https://untrusted.example'});
  f.send(message,{source:f.w});
  f.send({...message,id:'invalid id!'});
  f.send({...message,type:'supabase:rpc'});
  await tick();assert.equal(calls.length,0);assert.equal(f.posted.length,0);
  f.send(message);await tick();
  assert.equal(calls.length,1);
  assert.deepEqual(f.posted,[{origin:ORIGIN,data:{type:'lumina:rpc-result',id:'safe',data:{friends:[],games:[]}}}]);
  assert.equal(f.timers.size,0);
});

test('bridge returns a localized-code-compatible guest error without credentials',async t=>{
  let called=false;
  const f=fixture(t,{auth:{getSession:async()=>({data:{session:null}})},rpc(){called=true;}});
  f.rpc('guest');await tick();
  assert.equal(called,false);
  assert.deepEqual(f.posted[0].data,{type:'lumina:rpc-result',id:'guest',error:{code:'LUMINA_AUTH_REQUIRED'}});
  assert.doesNotMatch(JSON.stringify(f.posted),/access_token|refresh_token|session|stack/);
});

test('bridge redacts thrown transport details and rejects unknown actions before transport',async t=>{
  let calls=0;
  const f=fixture(t,{auth:{getSession:async()=>({data:{session:session()}})},rpc(){calls++;throw Error('fixture-secret private transport');}});
  f.rpc('unknown','delete_account',{token:'fixture-secret'});await tick();
  assert.equal(calls,0);
  f.rpc('transport');await tick();
  assert.equal(calls,1);
  assert.deepEqual(f.posted.map(item=>item.data.error.code),['LUMINA_INVALID','LUMINA_UNAVAILABLE']);
  assert.doesNotMatch(JSON.stringify(f.posted),/fixture-secret|transport details|private|stack/);
});

test('duplicate IDs and the pending limit bound concurrent game operations',async t=>{
  const work=deferred();let calls=0;
  const f=fixture(t,{auth:{getSession:async()=>({data:{session:session()}})},rpc(){calls++;return withHeaders(work.promise);}});
  for(let i=0;i<4;i++)f.rpc('pending'+i);
  f.rpc('pending0');f.rpc('overflow');await tick();
  assert.equal(calls,4);assert.equal(f.timers.size,4);
  assert.deepEqual(f.posted[0].data,{type:'lumina:rpc-result',id:'overflow',error:{code:'LUMINA_LIMIT'}});
  f.dispose();work.resolve({data:{safe:true},error:null});await tick();
  assert.equal(f.posted.length,1);assert.equal(f.timers.size,0);
});

test('disposal aborts in-flight work and never sends its late result to the frame',async t=>{
  const work=deferred(),signals=[];
  work.promise.abortSignal=signal=>{signals.push(signal);return work.promise;};
  const f=fixture(t,{auth:{getSession:async()=>({data:{session:session()}})},rpc:()=>withHeaders(work.promise)});
  f.rpc('closing');await tick();assert.equal(signals.length,1);
  f.dispose();assert.equal(signals[0].aborted,true);
  work.resolve({data:{privateOldGame:'fixture'},error:null});await tick();
  f.rpc('after-close');await tick();
  assert.deepEqual(f.posted,[]);assert.equal(f.timers.size,0);
});

test('an auth change aborts old work and suppresses old-account results',async t=>{
  const old=deferred(),fresh=deferred(),signals=[];let call=0;
  const f=fixture(t,{auth:{getSession:async()=>({data:{session:session()}})},rpc(){
    const promise=call++===0?old.promise:fresh.promise;
    promise.abortSignal=signal=>{signals.push(signal);return promise;};return withHeaders(promise);
  }});
  f.rpc('old');await tick();f.authChange();
  assert.equal(signals[0].aborted,true);
  f.rpc('fresh');await tick();
  old.resolve({data:{oldAccount:true},error:null});fresh.resolve({data:{newAccount:true},error:null});await tick();
  assert.deepEqual(f.posted.map(item=>item.data),[
    {type:'lumina:auth-changed'},
    {type:'lumina:rpc-result',id:'fresh',data:{newAccount:true}}
  ]);
  assert.equal(f.timers.size,0);
});

test('settlement from an earlier auth generation cannot delete a reused pending ID',async t=>{
  const old=deferred(),fresh=deferred(),signals=[];let call=0;
  const f=fixture(t,{auth:{getSession:async()=>({data:{session:session()}})},rpc(){
    const promise=call++===0?old.promise:fresh.promise;
    promise.abortSignal=signal=>{signals.push(signal);return promise;};return withHeaders(promise);
  }});
  f.rpc('reused');await tick();f.authChange();f.rpc('reused');await tick();
  assert.equal(signals.length,2);
  old.resolve({data:{oldAccount:true},error:null});await tick();
  f.authChange();
  assert.equal(signals[1].aborted,true,'new generation must retain its own pending controller');
  fresh.resolve({data:{newAccount:true},error:null});await tick();
  assert.ok(f.posted.every(item=>item.data.type==='lumina:auth-changed'));
  assert.equal(f.timers.size,0);
});

test('navigation is restricted to existing profile and friend destinations',t=>{
  const f=fixture(t,null);
  f.send({type:'lumina:navigate',destination:'https://untrusted.example'});
  f.send({type:'lumina:navigate',destination:'profile'},{origin:'https://untrusted.example'});
  f.send({type:'lumina:navigate',destination:'profile'},{source:f.w});
  assert.deepEqual(f.navigated,[]);assert.equal(f.closed,0);
  f.send({type:'lumina:navigate',destination:'profile'});
  f.send({type:'lumina:navigate',destination:'friends'});
  assert.deepEqual(f.navigated,['/profile/profile.html','/friends.html']);
  assert.equal(f.closed,2);
  for(const route of f.navigated)assert.ok(fs.existsSync(path.join(ROOT,route)),'destination exists: '+route);
});

test('both browser dictionaries cover exactly all 14 locales and preserve every placeholder',()=>{
  const expected=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'].sort();
  const scope={window:{}};
  vm.runInNewContext(read('lumina-match/browser/i18n.js'),scope);
  vm.runInNewContext(read('lumina-match/browser/online-i18n.js'),scope);
  const placeholders=value=>Array.from(value.matchAll(/\{\w+\}/g),match=>match[0]).sort();
  for(const [name,count] of [['LuminaMessages',37],['LuminaOnlineMessages',51]]) {
    const dictionary=scope.window[name],keys=Object.keys(dictionary.en).sort();
    assert.deepEqual(Object.keys(dictionary).sort(),expected,name);assert.equal(keys.length,count,name);
    for(const [locale,messages] of Object.entries(dictionary)) {
      assert.deepEqual(Object.keys(messages).sort(),keys,name+':'+locale);
      for(const key of keys) {
        assert.equal(typeof messages[key],'string');assert.ok(messages[key].trim(),name+':'+locale+':'+key);
        assert.deepEqual(placeholders(messages[key]),placeholders(dictionary.en[key]),name+':'+locale+':'+key);
      }
    }
  }
});
