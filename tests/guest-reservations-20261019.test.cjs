const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'..','guest-reservations.js'),'utf8');

// A transaction boundary, including commit/abort and exclusive readwrite
// scheduling. Native browser durability is also exercised by browser QA.
function indexedDBFixture({openFailure=false,abortCommit=false}={}){
 let rows=new Map(),tail=Promise.resolve(),created=false,opens=0;
 const db={objectStoreNames:{contains:()=>created},createObjectStore(){created=true;},close(){},transaction(name,mode){
  assert.equal(name,'identities');assert.equal(mode,'readwrite');
  let active=false,finished=false,pending=0,staged,complete;const operations=[];
  const tx={abort(){if(finished)return;finished=true;tx.onabort?.();complete?.();},objectStore(){return {get(identity){const request={};enqueue(()=>{request.result=structuredClone(staged.get(identity));request.onsuccess?.();});return request;},put(row){enqueue(()=>staged.set(row.identity,structuredClone(row)));}};}};
  function check(){setImmediate(()=>{if(!active||finished||pending)return;if(abortCommit){tx.abort();return;}finished=true;rows=staged;tx.oncomplete?.();complete();});}
  function execute(job){queueMicrotask(()=>{if(finished)return;job();pending--;check();});}
  function enqueue(job){pending++;if(active)execute(job);else operations.push(job);}
  const next=tail.then(()=>new Promise(resolve=>{complete=resolve;if(finished){resolve();return;}active=true;staged=new Map(rows);operations.forEach(execute);check();}));tail=next.catch(()=>{});
  return tx;
 }};
 return {get opens(){return opens;},open(){opens++;const request={};queueMicrotask(()=>{if(openFailure){request.onerror?.();return;}request.result=db;if(!created)request.onupgradeneeded?.();request.onsuccess?.();});return request;}};
}
function browser(idb=indexedDBFixture()){
 const dom=new JSDOM('<body></body>',{url:'https://matchapp.tv/',runScripts:'outside-only'});
 Object.defineProperty(dom.window,'indexedDB',{value:idb});dom.window.eval(source);
 return {w:dom.window,api:dom.window.MatchAppGuestReservations,close:()=>dom.window.close()};
}
const reservation=(token,keys=['original','tmdb:movie:123'],scope='audiovisual')=>({scope,keys,token});

test('atomic readwrite claims admit one of concurrent localized identities',async()=>{
 const b=browser();try{
  const results=await Promise.all([b.api.reserve(reservation('first')),b.api.reserve(reservation('second',['localized','tmdb:movie:123']))]);
  assert.equal(results.filter(x=>x.claimed).length,1);
  assert.equal((await b.api.reserve(reservation('third',['thirdlocale','tmdb:movie:123']))).claimed,false);
 }finally{b.close();}
});
test('only the winning unused token releases and released receipts permit a fresh atomic claim',async()=>{
 const b=browser();try{
  assert((await b.api.reserve(reservation('first'))).claimed);
  assert.equal(await b.api.release(reservation('loser')),false);
  assert.equal((await b.api.reserve(reservation('second'))).claimed,false);
  assert(await b.api.release(reservation('first')));
  const result=await b.api.reserve(reservation('second'));
  assert(result.claimed);assert.deepEqual(Array.from(result.releasedTokens),['first']);
  assert.equal(await b.api.release(reservation('first')),false,'stale release cannot undo a newer claim');
 }finally{b.close();}
});
test('shown and lifetime settlement are monotonic and cannot release or reserve again',async()=>{
 const b=browser();try{
  assert((await b.api.reserve(reservation('first'))).claimed);
  assert(await b.api.settle({...reservation('first'),state:'shown'}));
  assert.equal(await b.api.release(reservation('first')),false);
  assert(await b.api.settle({...reservation('first'),state:'lifetime'}));
  assert(await b.api.settle({...reservation('first'),state:'shown'}));
  assert.equal(await b.api.release(reservation('first')),false);
  assert.equal((await b.api.reserve(reservation('second'))).claimed,false);
 }finally{b.close();}
});
test('scope and source namespace separate reading, movie and television identities',async()=>{
 const b=browser();try{
  for(const item of [reservation('movie',['tmdb:movie:123']),reservation('tv',['tmdb:tv:123']),reservation('book',['tmdb:movie:123'],'reading')])assert((await b.api.reserve(item)).claimed);
 }finally{b.close();}
});
test('aborted transactions never report a durable claim or successful settlement',async()=>{
 const b=browser(indexedDBFixture({abortCommit:true}));try{
  assert.equal((await b.api.reserve(reservation('first'))).claimed,false);
  assert.equal(await b.api.settle({...reservation('first'),state:'lifetime'}),false);
  assert.equal(await b.api.release(reservation('first')),false);
 }finally{b.close();}
});
test('unavailable or rejected IndexedDB fails closed without network or memory claims',async()=>{
 for(const idb of [undefined,{open(){throw new Error('Blocked');}},indexedDBFixture({openFailure:true})]){
  const dom=new JSDOM('<body></body>',{url:'https://matchapp.tv/',runScripts:'outside-only'});
  try{Object.defineProperty(dom.window,'indexedDB',{value:idb});dom.window.eval(source);assert.equal((await dom.window.MatchAppGuestReservations.reserve(reservation('first'))).claimed,false);}finally{dom.window.close();}
 }
});
test('invalid scopes, empty keys and unsafe tokens are rejected before opening a database',async()=>{
 const idb=indexedDBFixture(),b=browser(idb);try{
  for(const input of [{...reservation('first'),scope:'account'},{...reservation('first'),keys:[]},{...reservation('first'),keys:['bad\nkey']},{...reservation('first'),token:''}])assert.equal((await b.api.reserve(input)).claimed,false);
  assert.equal(idb.opens,0);
 }finally{b.close();}
});
test('stuck database opening and transactions resolve false at their bounded deadline',async()=>{
 for(const phase of ['open','transaction']){
  let aborted=false;
  const idb={open(){const request={};if(phase==='transaction')queueMicrotask(()=>{request.result={close(){},transaction(){const tx={abort(){aborted=true;tx.onabort?.();},objectStore(){return {get(){return {};}};}};return tx;}};request.onsuccess?.();});return request;}};
  const b=browser(idb),deadlines=[];
  try{
   b.w.setTimeout=callback=>{deadlines.push(callback);return deadlines.length;};b.w.clearTimeout=()=>{};
   const result=b.api.reserve(reservation('first'));
   await new Promise(resolve=>setImmediate(resolve));
   assert.equal(deadlines.length,phase==='open'?1:2);
   deadlines.forEach(callback=>callback());
   assert.equal((await result).claimed,false);
   if(phase==='transaction')assert(aborted,'a stuck transaction is aborted before failure is reported');
  }finally{b.close();}
 }
});
