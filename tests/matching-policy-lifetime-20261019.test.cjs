const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const {createGuestReservations}=require('./helpers/guest-reservations.cjs');
const source=fs.readFileSync(path.join(__dirname,'..','matching-policy.js'),'utf8');
const coordinators=new WeakMap();

function lockManager(){
 let current=Promise.resolve();
 return {request(_name,callback){const next=current.then(callback);current=next.catch(()=>{});return next;}};
}
function browser({values=new Map(),locks=lockManager(),rpc,coordinator}={}){
 const dom=new JSDOM('<body></body>',{url:'https://matchapp.tv/',runScripts:'outside-only'}),w=dom.window;
 const failure={write:false,read:false,silent:false};
 const storage={getItem(name){if(failure.read)throw new Error('Storage blocked');return values.get(name)??null;},setItem(name,value){if(failure.write)throw new Error('Quota exceeded');if(!failure.silent)values.set(name,String(value));},removeItem(name){values.delete(name);}};
 Object.defineProperty(w,'localStorage',{value:storage});
 if(locks)Object.defineProperty(w.navigator,'locks',{value:locks,configurable:true});
 if(coordinator===undefined){if(!coordinators.has(values))coordinators.set(values,createGuestReservations());coordinator=coordinators.get(values);}
 if(coordinator)w.MatchAppGuestReservations=coordinator;
 w.supabaseClient={rpc:rpc||(async(_name,args)=>({data:args.p_action==='list'?{keys:[],history:[],hiddenKeys:[]}:{}}))};
 w.eval(source);
 return {dom,w,values,failure,reload:()=>w.eval(source),close:()=>dom.window.close()};
}
const work={title:'A viagem',originalTitle:'The Journey',tmdbId:123,kind:'movie',addedAt:1};
const translated={title:'Die Reise',tmdbId:123,kind:'movie'};

test('removing visible history preserves lifetime identity through reload and passive artwork',async()=>{
 const b=browser(),{w}=b;
 try{
  await w.matchPolicy.attach(null);
  w.matchPolicy.savePreference(work,'dislike');
  w.localStorage.setItem('match_recentTitles',JSON.stringify([work.title]));
  w.sessionStorage.setItem('match_sessionShown',JSON.stringify([work.title]));
  assert(await w.matchPolicy.forget('The Journey'));
  assert.equal(w.matchPolicy.history().length,0);
  assert(w.matchPolicy.excludes(translated));
  assert(!w.matchPolicy.excludes(translated,{hardOnly:true}),'removed preference is no longer an explicit dislike');
  assert.deepEqual(JSON.parse(w.localStorage.getItem('match_dislikedList')),[]);
  assert.deepEqual(JSON.parse(w.sessionStorage.getItem('match_sessionShown')),[]);
  w.matchPolicy.remember({...translated,posterUrl:'https://image.tmdb.org/t/p/w500/journey.jpg'},'shown');
  assert.equal(w.matchPolicy.history().length,0,'poster enrichment cannot resurrect hidden history');
  b.reload();await w.matchPolicy.attach(null);
  assert.equal(w.matchPolicy.history().length,0);
  for(const item of [work,translated,{title:'The Journey'}])assert(w.matchPolicy.excludes(item));
  assert.equal(await w.matchPolicy.claim(translated),false);
  assert(!w.matchPolicy.excludes({title:'Distinct TV work',tmdbId:123,kind:'tv'}));
 }finally{b.close();}
});

test('cloud hiddenKeys hide stale local history and pending enrichment while keeping exclusion keys',async()=>{
 let remote={keys:[],history:[],hiddenKeys:[]};const writes=[];
 const b=browser({rpc:async(_name,args)=>{if(args.p_action==='remember')writes.push(...args.p_payload.items);return {data:args.p_action==='list'?remote:{}};}}),{w}=b;
 try{
  await w.matchPolicy.attach({id:'alice'});
  w.matchPolicy.remember(work,'dislike',false);
  w.localStorage.setItem('match_dislikedList',JSON.stringify([work]));
  remote={keys:['aviagem','thejourney','tmdb:movie:123'],history:[],hiddenKeys:['tmdb:movie:123']};
  await w.matchPolicy.refresh(true);
  assert.equal(w.matchPolicy.history().length,0);
  assert(w.matchPolicy.excludes(translated));
  assert.deepEqual(JSON.parse(w.localStorage.getItem('match_dislikedList')),[]);
  await w.matchPolicy.flush();assert.equal(writes.length,0,'stale queued visible rows are discarded after remote hide');
  w.matchPolicy.remember(translated,'shown',false);
  assert.equal(w.matchPolicy.history().length,0);
  await w.matchPolicy.flush();assert.equal(writes.length,1);
  assert.equal(writes[0].action,'lifetime');assert.equal(writes[0].historyHidden,true);
  b.reload();await w.matchPolicy.attach({id:'alice'});
  assert.equal(w.matchPolicy.history().length,0);assert(w.matchPolicy.excludes(translated));
 }finally{b.close();}
});

test('an incomplete cloud snapshot cannot erase an already shown lifetime identity',async()=>{
 let remote={keys:['thejourney','tmdb:movie:123'],history:[{...work,action:'shown'}]};
 const b=browser({rpc:async(_name,args)=>({data:args.p_action==='list'?remote:{}})}),{w}=b;
 try{
  await w.matchPolicy.attach({id:'alice'});assert(w.matchPolicy.excludes(translated));
  remote={keys:[],history:[],hiddenKeys:[]};await w.matchPolicy.refresh(true);
  assert(w.matchPolicy.excludes(translated),'absence is never permission to recommend a lifetime identity again');
  b.reload();await w.matchPolicy.attach({id:'alice'});assert(w.matchPolicy.excludes(translated));
 }finally{b.close();}
});

test('guest hidden history migrates as a tombstone and remains isolated from another account',async()=>{
 const writes=[];
 const b=browser({rpc:async(_name,args)=>{if(args.p_action==='remember')writes.push(args.p_payload);return {data:args.p_action==='list'?{keys:[],history:[],hiddenKeys:[]}:{}};}}),{w}=b;
 try{
  await w.matchPolicy.attach(null);w.matchPolicy.remember(work,'shown');await w.matchPolicy.forget(work.title);
  await w.matchPolicy.attach({id:'alice'});
  assert.equal(w.matchPolicy.history().length,0);assert(w.matchPolicy.excludes(translated));
  const imported=writes.flatMap(x=>x.items).find(x=>x.identityKeys.includes('tmdb:movie:123'));
  assert(imported);assert.equal(imported.action,'lifetime');assert.equal(imported.historyHidden,true);
  assert.equal(w.localStorage.getItem('match_history_hidden_guest'),null);
  await w.matchPolicy.attach({id:'bob'});
  assert(!w.matchPolicy.excludes(translated));assert.equal(w.matchPolicy.history().length,0);
  await w.matchPolicy.attach({id:'alice'});assert(w.matchPolicy.excludes(translated));assert.equal(w.matchPolicy.history().length,0);
 }finally{b.close();}
});

for(const mode of ['write','read','silent'])test(`guest reservation fails closed when durable storage ${mode} fails`,async()=>{
 let rpcCalls=0;const b=browser({rpc:async()=>{rpcCalls++;return {data:{}};}}),{w}=b;
 try{
  await w.matchPolicy.attach(null);b.failure[mode]=true;
  assert.equal(await w.matchPolicy.claim(work),false);
  assert.equal(rpcCalls,0,'guest failure neither invents a server identity nor calls the credit service');
 }finally{b.close();}
});

for(const mode of ['write','silent'])test(`an unshown ${mode} storage failure releases the atomic token for a safe retry`,async()=>{
 const b=browser(),{w}=b;
 try{
  await w.matchPolicy.attach(null);b.failure[mode]=true;
  assert.equal(await w.matchPolicy.claim(work),false);
  b.failure[mode]=false;
  assert(await w.matchPolicy.claim(work),'no result or credit was consumed, so a repaired ledger can retry');
  w.matchPolicy.remember(work,'shown');assert.equal(await w.matchPolicy.claim(translated),false);
 }finally{b.close();}
});

for(const [name,value] of [
 ['match_history_guest','{invalid'],
 ['match_history_guest','{}'],
 ['match_history_guest','[{"title":"Known"},null]'],
 ['match_exclusions_guest','["known",42]'],
 ['match_history_hidden_guest','{}']
])test(`an invalid guest ledger is preserved and blocks new reservations: ${name} ${value}`,async()=>{
 const values=new Map([[name,value]]),b=browser({values});
 try{
  await b.w.matchPolicy.attach(null);
  assert.equal(await b.w.matchPolicy.claim(work),false);
  assert.equal(values.get(name),value,'corrupt history is never silently replaced by an empty ledger');
 }finally{b.close();}
});

test('guest reservation requires an atomic coordinator and never falls back to localStorage alone',async()=>{
 for(const coordinator of [null,{reserve:async()=>({claimed:false,releasedTokens:[]})}]){
  const b=browser({coordinator});try{await b.w.matchPolicy.attach(null);assert.equal(await b.w.matchPolicy.claim(work),false);assert.equal(b.w.matchPolicy.history().length,0);}finally{b.close();}
 }
});

test('atomic guest claims work without the optional Web Locks browser feature',async()=>{
 const b=browser({locks:null});try{await b.w.matchPolicy.attach(null);assert(await b.w.matchPolicy.claim(work));}finally{b.close();}
});

test('two guest tabs serialize one source identity even with different localized names',async()=>{
 const values=new Map(),locks=lockManager(),a=browser({values,locks}),b=browser({values,locks});
 try{
  await Promise.all([a.w.matchPolicy.attach(null),b.w.matchPolicy.attach(null)]);
  const results=await Promise.all([a.w.matchPolicy.claim(work),b.w.matchPolicy.claim(translated)]);
  assert.equal(results.filter(Boolean).length,1);
  const winner=results[0]?a:b,loser=results[0]?b:a;
  winner.w.matchPolicy.remember(work,'shown');
  assert(loser.w.matchPolicy.excludes(translated));
  loser.reload();await loser.w.matchPolicy.attach(null);assert.equal(await loser.w.matchPolicy.claim(translated),false);
 }finally{a.close();b.close();}
});

test('a second tab can discard only an atomically proven unused released reservation',async()=>{
 const values=new Map(),a=browser({values}),b=browser({values});
 try{
  await a.w.matchPolicy.attach(null);assert(await a.w.matchPolicy.claim(work));
  await b.w.matchPolicy.attach(null);assert.equal(await b.w.matchPolicy.claim(translated),false);
  assert(await a.w.matchPolicy.releaseClaim(work));
  assert(await b.w.matchPolicy.claim(translated),'cached reserved row cannot permanently block an explicitly released unused token');
  b.w.matchPolicy.remember(translated,'shown');assert.equal(await b.w.matchPolicy.releaseClaim(translated),false);
  assert.equal(await a.w.matchPolicy.claim(work),false,'shown history never participates in released-token cleanup');
 }finally{a.close();b.close();}
});

test('an account switch while a guest lock waits cannot write a reservation into the new owner',async()=>{
 let release;const locks={request:(_name,callback)=>new Promise(resolve=>{release=()=>resolve(callback());})};
 const b=browser({locks}),{w}=b;
 try{
  await w.matchPolicy.attach(null);const claim=w.matchPolicy.claim(work);
  await new Promise(resolve=>setImmediate(resolve));assert.equal(typeof release,'function');
  await w.matchPolicy.attach({id:'alice'});release();
  assert.equal(await claim,false);assert(!w.matchPolicy.excludes(work));
 }finally{b.close();}
});

test('a signed-in database claim remains authoritative when browser storage is unavailable',async()=>{
 const calls=[];const b=browser({locks:null,rpc:async(_name,args)=>{calls.push(args);return {data:args.p_action==='list'?{keys:[],history:[]}:args.p_action==='claim'?{claimed:true,item:args.p_payload.items[0]}:{}};}}),{w}=b;
 try{
  await w.matchPolicy.attach({id:'alice'});b.failure.write=true;
  assert.equal(await w.matchPolicy.claim(work),true);
  assert(calls.some(x=>x.p_action==='claim'&&x.p_payload.ownerId==='alice'));
 }finally{b.close();}
});

test('a hide during an awaited database claim prevents acceptance and cannot release the hidden identity',async()=>{
 let resolveClaim;const calls=[];
 const b=browser({rpc:async(_name,args)=>{
  calls.push(args.p_action);
  if(args.p_action==='list')return {data:{keys:[],history:[],hiddenKeys:[]}};
  if(args.p_action==='claim')return new Promise(resolve=>{resolveClaim=()=>resolve({data:{claimed:true,item:args.p_payload.items[0]}});});
  return {data:{released:true}};
 }}),{w}=b;
 try{
  await w.matchPolicy.attach({id:'alice'});const claim=w.matchPolicy.claim(work);
  await new Promise(resolve=>setImmediate(resolve));assert.equal(typeof resolveClaim,'function');
  assert(await w.matchPolicy.forget(work.title));resolveClaim();
  assert.equal(await claim,false);assert.equal(w.matchPolicy.history().length,0);assert(w.matchPolicy.excludes(work));
  assert(!calls.includes('release_claim'),'a title hidden while waiting is a lifetime tombstone, not an unused reservation');
 }finally{b.close();}
});

test('unused guest reservations may release but displayed or hidden lifetime work may not',async()=>{
 const b=browser(),{w}=b;
 try{
  await w.matchPolicy.attach(null);assert(await w.matchPolicy.claim(work));
  assert(await w.matchPolicy.releaseClaim(work));assert(!w.matchPolicy.excludes(work));
  assert(await w.matchPolicy.claim(work));w.matchPolicy.remember(work,'shown');
  assert.equal(await w.matchPolicy.releaseClaim(work),false);
  await w.matchPolicy.forget(work.title);assert.equal(await w.matchPolicy.releaseClaim(work),false);assert(w.matchPolicy.excludes(translated));
 }finally{b.close();}
});

test('a hidden-key storage event removes the other tab visible row without dropping its lifetime identity',async()=>{
 const values=new Map(),a=browser({values}),b=browser({values});
 try{
  await a.w.matchPolicy.attach(null);a.w.matchPolicy.remember(work,'shown');await b.w.matchPolicy.attach(null);
  assert.equal(b.w.matchPolicy.history().length,1);await a.w.matchPolicy.forget(work.title);
  b.w.dispatchEvent(new b.w.StorageEvent('storage',{key:'match_history_hidden_guest'}));
  assert.equal(b.w.matchPolicy.history().length,0);assert(b.w.matchPolicy.excludes(translated));
  b.w.matchPolicy.remember(translated,'shown');assert.equal(b.w.matchPolicy.history().length,0);
 }finally{a.close();b.close();}
});

test('another tab hiding a reserved guest identity prevents a stale release from erasing it',async()=>{
 const values=new Map(),a=browser({values}),b=browser({values});
 try{
  await a.w.matchPolicy.attach(null);assert(await a.w.matchPolicy.claim(work));
  await b.w.matchPolicy.attach(null);assert(await b.w.matchPolicy.forget(work.title));
  assert.equal(await a.w.matchPolicy.releaseClaim(work),false);
  a.reload();await a.w.matchPolicy.attach(null);
  assert.equal(a.w.matchPolicy.history().length,0);assert(a.w.matchPolicy.excludes(translated));
 }finally{a.close();b.close();}
});

test('old lifetime history is retained beyond the recent-title and activity UI bounds',async()=>{
 const rows=Array.from({length:1005},(_,index)=>({title:'Historical '+index,action:'shown',addedAt:index+1,identityKeys:['tmdb:movie:'+(10000+index)]}));
 const values=new Map([['match_history_guest',JSON.stringify(rows)],['match_exclusions_guest',JSON.stringify(rows.flatMap(x=>x.identityKeys))]]),b=browser({values}),{w}=b;
 try{
  await w.matchPolicy.attach(null);assert.equal(w.matchPolicy.history().length,1005);
  await w.matchPolicy.forget('Historical 0');b.reload();await w.matchPolicy.attach(null);
  assert.equal(w.matchPolicy.history().length,1004);
  assert(w.matchPolicy.excludes({title:'First work in another locale',tmdbId:10000,kind:'movie'}));
  assert(w.matchPolicy.excludes({title:'Last work in another locale',tmdbId:11004,kind:'movie'}));
 }finally{b.close();}
});

test('failed account hiding retains a durable tombstone outbox for retry after reload',async()=>{
 let failed=true;const writes=[];
 const b=browser({rpc:async(_name,args)=>{
  if(args.p_action==='list')return {data:{keys:['tmdb:movie:123'],history:[{...work,action:'shown'}]}};
  if(failed)return {error:{message:'Offline'}};
  if(args.p_action==='remember')writes.push(...args.p_payload.items);
  return {data:{}};
 }}),{w}=b;
 try{
  await w.matchPolicy.attach({id:'alice'});assert.equal(await w.matchPolicy.forget(work.title),false);
  const pending=JSON.parse(w.localStorage.getItem('match_history_pending_alice'));
  assert(pending.some(x=>x.action==='lifetime'&&x.historyHidden===true));
  failed=false;b.reload();await w.matchPolicy.attach({id:'alice'});await w.matchPolicy.flush();
  assert.equal(w.matchPolicy.history().length,0);assert(w.matchPolicy.excludes(translated));
  assert(writes.some(x=>x.action==='lifetime'&&x.historyHidden===true));
 }finally{b.close();}
});

test('a cloud hidden identity with no local row stays hidden when a stale scanner later finds it',async()=>{
 const b=browser({rpc:async(_name,args)=>({data:args.p_action==='list'?{keys:['tmdb:movie:123'],history:[],hiddenKeys:['tmdb:movie:123']}:{}})}),{w}=b;
 try{
  await w.matchPolicy.attach({id:'alice'});b.reload();await w.matchPolicy.attach({id:'alice'});
  w.matchPolicy.remember(translated,'shown',false);
  assert.equal(w.matchPolicy.history().length,0);assert(w.matchPolicy.excludes(work));
 }finally{b.close();}
});
