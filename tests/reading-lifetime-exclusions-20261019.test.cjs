'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const {createGuestReservations,installGuestReservations}=require('./helpers/guest-reservations.cjs');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const item={id:'lifetime-reading-work',title:'A Previously Shown Work',author:'Known Writer',year:1895,genres:['classics'],moods:['cozy'],pace:'balanced',length:'medium',era:'classic',access:['free','paid'],summary:'A curated book profile.'};
const keys={saved:'match_ebook_saved_v1',disliked:'match_ebook_disliked_v1',seen:'match_ebook_seen_v1',pending:'match_ebook_pending_v2_guest'};
const settle=()=>new Promise(resolve=>setImmediate(resolve));
async function boot(storage={},coordinator){
 const dom=new JSDOM('<html lang="en"><body><main><section id="ebook-matcher-root"></section></main></body></html>',{url:'https://matchapp.tv/ebooks/',runScripts:'outside-only'}),w=dom.window;
 installGuestReservations(w,coordinator);
 w.MATCH_LANG='en';w.MATCHAPP_EBOOK_CATALOG=[item];w.MATCHAPP_TOP_EBOOKS=[];
 w.matchMedia=()=>({matches:true});w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.fetch=async()=>{throw Error('External source requests are disabled in this regression');};
 w.localStorage.setItem('match_ebook_criteria_v1',JSON.stringify({format:'ebook'}));
 for(const [key,value]of Object.entries(storage))w.localStorage.setItem(key,typeof value==='string'?value:JSON.stringify(value));
 let debits=0;w.checkDailyLimit=async()=>{debits++;return true;};
 w.eval(read('ebooks/ebook-matcher.js'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));await settle();
 return {dom,w,debits:()=>debits,result:()=>w.document.querySelector('[data-ebook-result]'),note:()=>w.document.querySelector('[data-ebook-note]')};
}
function removeSaved(app){
 app.w.localStorage.setItem(keys.saved,JSON.stringify([item.id]));
 app.w.dispatchEvent(new app.w.StorageEvent('storage',{key:keys.saved}));
 const remove=app.w.document.querySelector('[data-ebook-remove]');assert(remove);remove.click();
}
test('removed guest books stay excluded after a full document reload',async()=>{
 const first=await boot();let storage;
 try{
  await first.w.MatchAppEbooks.match();assert.equal(first.result().querySelector('h3').textContent,item.title);
  first.result().querySelector('[data-ebook-save]').click();first.w.document.querySelector('[data-ebook-remove]').click();
  assert.deepEqual(Array.from(first.w.MatchAppEbooks.saved()),[]);
  storage=Object.fromEntries(Object.keys(first.w.localStorage).map(key=>[key,first.w.localStorage.getItem(key)]));
 }finally{first.dom.window.close();}
 const reloaded=await boot(storage);
 try{
  await reloaded.w.MatchAppEbooks.match();assert.doesNotMatch(reloaded.result().textContent,new RegExp(item.title));
  assert.equal(reloaded.debits(),0);assert(JSON.parse(reloaded.w.localStorage.getItem(keys.seen)).includes(item.id));
 }finally{reloaded.dom.window.close();}
});
test('late release of an unused guest claim cannot undo a preference-removal tombstone',async()=>{
 const app=await boot();
 try{
  const claim=await app.w.MatchAppEbooks.claimSuggestion(item.id);assert(claim);
  removeSaved(app);await app.w.MatchAppEbooks.releaseSuggestion(claim);
  assert(JSON.parse(app.w.localStorage.getItem(keys.seen)).includes(item.id));
  assert.equal(await app.w.MatchAppEbooks.claimSuggestion(item.id),null);
  assert.equal(app.debits(),0);
 }finally{app.dom.window.close();}
});
test('a removal in another tab survives the original guest reservation release',async()=>{
 const app=await boot();
 try{
  const claim=await app.w.MatchAppEbooks.claimSuggestion(item.id);assert(claim);
  app.w.localStorage.setItem(keys.pending,JSON.stringify([{id:item.id,action:'forget',token:'other-tab-removal'}]));
  await app.w.MatchAppEbooks.releaseSuggestion(claim);
  assert(JSON.parse(app.w.localStorage.getItem(keys.seen)).includes(item.id));
  assert.equal(await app.w.MatchAppEbooks.claimSuggestion(item.id),null);
 }finally{app.dom.window.close();}
});
test('a guest without an atomic reservation coordinator cannot reveal or debit a book',async()=>{
 const app=await boot();
 try{
  delete app.w.MatchAppGuestReservations;
  await app.w.MatchAppEbooks.match();assert.equal(app.result().querySelector('h3'),null);
  assert.equal(app.debits(),0);assert.match(app.note().textContent,/could not sync your match history/);
 }finally{app.dom.window.close();}
});
test('a working atomic coordinator does not require browser Web Locks',async()=>{
 const app=await boot();
 try{
  delete app.w.navigator.locks;
  await app.w.MatchAppEbooks.match();assert.equal(app.result().querySelector('h3').textContent,item.title);assert.equal(app.debits(),1);
 }finally{app.dom.window.close();}
});
test('a failed atomic reservation commit cannot reveal or debit a book',async()=>{
 const app=await boot();
 try{
  app.w.MatchAppGuestReservations={...app.w.MatchAppGuestReservations,reserve:async()=>({claimed:false,releasedTokens:[]})};
  await app.w.MatchAppEbooks.match();assert(!app.result().textContent.includes(item.title));assert.equal(app.debits(),0);
 }finally{app.dom.window.close();}
});
test('separate guest documents sharing the atomic ledger can reserve only one reading work',async()=>{
 const coordinator=createGuestReservations(),first=await boot({},coordinator),second=await boot({},coordinator);
 try{
  const claims=await Promise.all([first.w.MatchAppEbooks.claimSuggestion(item.id),second.w.MatchAppEbooks.claimSuggestion(item.id)]);
  assert.equal(claims.filter(Boolean).length,1);
  const winner=claims[0]?first:second,claim=claims.find(Boolean);
  assert.equal(winner.w.MatchAppEbooks.finishSuggestion(claim),true);
  await winner.w.MatchAppEbooks.releaseSuggestion(claim);
  assert.equal(await coordinator.reserve({scope:'reading',keys:[item.id],token:'another-reading-claim'}).then(value=>value.claimed),false);
 }finally{first.dom.window.close();second.dom.window.close();}
});
test('a released unused reading receipt can be reconciled after reload without recycling shown works',async()=>{
 const coordinator=createGuestReservations(),first=await boot({},coordinator);let storage,claim;
 try{
  claim=await first.w.MatchAppEbooks.claimSuggestion(item.id);assert(claim);
  storage=Object.fromEntries(Object.keys(first.w.localStorage).map(key=>[key,first.w.localStorage.getItem(key)]));
  assert.equal(await coordinator.release({scope:'reading',keys:[item.id],token:claim.token}),true);
 }finally{first.dom.window.close();}
 const reloaded=await boot(storage,coordinator);
 try{
  const retry=await reloaded.w.MatchAppEbooks.claimSuggestion(item.id);assert(retry);assert.notEqual(retry.token,claim.token);
  assert.equal(reloaded.w.MatchAppEbooks.finishSuggestion(retry),true);
  await reloaded.w.MatchAppEbooks.releaseSuggestion(claim);
  assert.equal(await reloaded.w.MatchAppEbooks.claimSuggestion(item.id),null);
 }finally{reloaded.dom.window.close();}
});
test('an unused reading claim can be released by its owned receipt after reload',async()=>{
 const coordinator=createGuestReservations(),first=await boot({},coordinator);let storage,claim;
 try{
  claim=await first.w.MatchAppEbooks.claimSuggestion(item.id);assert(claim);
  storage=Object.fromEntries(Object.keys(first.w.localStorage).map(key=>[key,first.w.localStorage.getItem(key)]));
 }finally{first.dom.window.close();}
 const reloaded=await boot(storage,coordinator);
 try{
  await reloaded.w.MatchAppEbooks.releaseSuggestion(claim);
  assert(!JSON.parse(reloaded.w.localStorage.getItem(keys.seen)).includes(item.id));
  assert(await reloaded.w.MatchAppEbooks.claimSuggestion(item.id));
 }finally{reloaded.dom.window.close();}
});
test('a failed local reservation mirror releases its atomic claim for repaired-storage retry',async()=>{
 const app=await boot();
 try{
  const store=app.w.localStorage;
  Object.defineProperty(app.w,'localStorage',{configurable:true,value:{getItem:key=>store.getItem(key),setItem:(key,value)=>{if(key===keys.seen)throw Error('Storage temporarily unavailable');store.setItem(key,value);}}});
  await assert.rejects(app.w.MatchAppEbooks.claimSuggestion(item.id),/Reading history unavailable/);
  Object.defineProperty(app.w,'localStorage',{configurable:true,value:store});
  assert(await app.w.MatchAppEbooks.claimSuggestion(item.id));assert.equal(app.debits(),0);
 }finally{app.dom.window.close();}
});
test('a late guest lifetime settlement cannot write into a newly restored account',async()=>{
 const coordinator=createGuestReservations(),original=coordinator.settle;let release,started;
 const waiting=new Promise(resolve=>{started=resolve;});let first=true;
 coordinator.settle=input=>{if(!first)return original(input);first=false;started();return new Promise(resolve=>{release=()=>original(input).then(resolve);});};
 const app=await boot({[keys.seen]:[item.id]},coordinator);
 try{
  const pending=app.w.MatchAppEbooks.claimSuggestion(item.id);await waiting;
  const user={id:'different-reading-owner',is_anonymous:false},state={saved:[],disliked:[],seen:[],reserved:[],restored:[]};
  app.w.supabaseClient={auth:{getSession:async()=>({data:{session:{user}}}),getUser:async()=>({data:{user}})},rpc:async()=>({data:state})};
  app.w.document.dispatchEvent(new app.w.CustomEvent('matchapp:authchange'));await app.w.MatchAppEbooks.ready();
  assert.equal(app.w.localStorage.getItem('match_ebook_owner_v1'),user.id);
  const before=app.w.localStorage.getItem(keys.seen);await release();assert.equal(await pending,null);
  assert.equal(app.w.localStorage.getItem(keys.seen),before);assert.equal(app.debits(),0);
 }finally{app.dom.window.close();}
});
test('an interleaved old release cannot make another tab\'s removed work claimable',async()=>{
 const app=await boot();
 try{
  const claim=await app.w.MatchAppEbooks.claimSuggestion(item.id);assert(claim);
  const store=app.w.localStorage;let interleave=true;
  Object.defineProperty(app.w,'localStorage',{configurable:true,value:{
   getItem:key=>store.getItem(key),
   setItem:(key,value)=>{
    if(interleave&&key===keys.seen&&value==='[]'){
     interleave=false;store.setItem(keys.pending,JSON.stringify([{id:item.id,action:'forget',token:'interleaved-other-tab'}]));
     store.setItem(keys.seen,JSON.stringify([item.id]));
    }
    store.setItem(key,value);
   }
  }});
  await app.w.MatchAppEbooks.releaseSuggestion(claim);
  assert.equal(await app.w.MatchAppEbooks.claimSuggestion(item.id),null);
  assert(JSON.parse(store.getItem(keys.seen)).includes(item.id));assert.equal(app.debits(),0);
 }finally{app.dom.window.close();}
});
for(const failure of ['read denied','write denied','silently dropped write','malformed history','mixed history','malformed receipt','malformed pending action'])test('guest claims fail closed with '+failure,async()=>{
 const app=await boot();
 try{
  const store=app.w.localStorage;
  if(failure==='malformed history')store.setItem(keys.seen,'{"invalid":true}');
  else if(failure==='mixed history')store.setItem(keys.seen,JSON.stringify(['older-reading-work',null]));
  else if(failure==='malformed receipt')store.setItem('match_ebook_guest_claims_v1',JSON.stringify([{id:item.id,token:null}]));
  else if(failure==='malformed pending action')store.setItem(keys.pending,JSON.stringify([{id:item.id,token:'old-claim',action:'unexpected'}]));
  else Object.defineProperty(app.w,'localStorage',{configurable:true,value:{
   getItem:key=>{if(failure==='read denied')throw Error('Storage denied');return store.getItem(key);},
   setItem:(key,value)=>{if(failure==='write denied')throw Error('Storage denied');if(failure!=='silently dropped write')store.setItem(key,value);}
  }});
  await app.w.MatchAppEbooks.match();assert.equal(app.result().querySelector('h3'),null);
  assert.equal(app.debits(),0);assert.match(app.note().textContent,/could not sync your match history/);
 }finally{app.dom.window.close();}
});
for(const changed of ['saved','disliked','removed'])test('a '+changed+' preference during allowance cannot reveal a stale book',async()=>{
 const app=await boot();let release,started;
 const waiting=new Promise(resolve=>{started=resolve;});const unconfirmed=[],confirmed=[];
 try{
  app.w.MatchAppTokens={createContext:()=>({surface:'ebook',runId:'reading-request'}),noteUnconfirmed:(...args)=>unconfirmed.push(args),confirmResult:(...args)=>confirmed.push(args)};
  app.w.checkDailyLimit=()=>{started();return new Promise(resolve=>{release=resolve;});};
  const request=app.w.MatchAppEbooks.match();await waiting;
  if(changed==='removed')removeSaved(app);else app.w.localStorage.setItem(keys[changed],JSON.stringify([item.id]));
  release(true);await request;
  assert.equal(app.result().querySelector('h3'),null);assert.equal(app.result().hidden,true);
  assert.deepEqual(unconfirmed,[['ebook','reading-request']]);assert.equal(confirmed.length,0);
  assert.equal(app.w.document.getElementById('ebook-matcher-root').dataset.audioBusy,'0');
  assert.equal(app.w.document.querySelector('[data-ebook-match]').disabled,false);
  if(changed==='removed')assert(JSON.parse(app.w.localStorage.getItem(keys.seen)).includes(item.id));
 }finally{app.dom.window.close();}
});
test('repeated unavailable-audio searches never present or claim an unverified book',async()=>{
 const app=await boot({'match_ebook_criteria_v1':{format:'audiobook',access:'free'},match_user_country:'br'});
 try{
  app.w.MatchAppAudiobooks={verify:async()=>{assert.fail('US public-domain audio is not rights-verified in Brazil');}};
  for(let attempt=0;attempt<2;attempt++){
   await app.w.MatchAppEbooks.match();assert.doesNotMatch(app.result().textContent,new RegExp(item.title));
   assert(app.result().querySelector('a[href^="https://librivox.org/"]'));
   for(const link of app.result().querySelectorAll('a'))assert(!decodeURIComponent(link.href).includes(item.title));
  }
  assert.equal(app.debits(),0);assert.deepEqual(JSON.parse(app.w.localStorage.getItem(keys.seen)||'[]'),[]);
 }finally{app.dom.window.close();}
});
