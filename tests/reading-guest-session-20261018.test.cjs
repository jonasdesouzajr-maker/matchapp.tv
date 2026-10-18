'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const known={id:'known-reading-work',title:'Known Reading Work',author:'Fixture Writer',year:1895,genres:['classics'],moods:['cozy'],pace:'balanced',length:'medium',era:'classic',access:['paid'],summary:'An existing catalogue entry.'};
const fresh={...known,id:'fresh-reading-work',title:'Fresh Reading Work'};
const state=(overrides={})=>({saved:[],disliked:[],seen:[],reserved:[],restored:[],...overrides});
const user={id:'registered-reader',is_anonymous:false};
const session={access_token:'fixture-session',user};
// Captured from the page's pinned Supabase JS 2.105.0 with empty storage:
// getSession succeeds with null, while getUser returns this named error.
const missingSession=()=>({data:{user:null},error:Object.assign(new Error('Auth session missing!'),{name:'AuthSessionMissingError',status:400})});

async function boot(client,storage={}){
 const dom=new JSDOM('<!doctype html><html lang="en"><body><main><section id="ebook-matcher-root"></section></main></body></html>',{
  url:'https://matchapp.tv/ebooks/',runScripts:'outside-only'
 });
 const w=dom.window;let credits=0;
 w.MATCH_LANG='en';w.MATCHAPP_EBOOK_CATALOG=[known,fresh];w.MATCHAPP_TOP_EBOOKS=[];
 w.matchMedia=()=>({matches:true});w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.fetch=async()=>{throw Error('Cover requests are outside this session regression');};
 w.checkDailyLimit=async()=>{credits++;return true;};
 w.localStorage.setItem('match_user_country','United Kingdom');
 w.localStorage.setItem('match_ebook_criteria_v1',JSON.stringify({format:'ebook'}));
 for(const [key,value]of Object.entries(storage))w.localStorage.setItem(key,typeof value==='string'?value:JSON.stringify(value));
 if(client)w.supabaseClient=client;
 for(const file of ['viewer-country.js','ebooks/ebook-matcher.js'])w.eval(read(file));
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));await settle();
 return {dom,w,credits:()=>credits,result:()=>w.document.querySelector('[data-ebook-result]'),note:()=>w.document.querySelector('[data-ebook-note]')};
}

test('fresh SDK guest with a missing getUser session can match without an account-history request',async()=>{
 let users=0,rpcs=0;
 const client={auth:{getSession:async()=>({data:{session:null},error:null}),getUser:async()=>{users++;return missingSession();}},rpc:async()=>{rpcs++;throw Error('Guest must use local history');}};
 const app=await boot(client);
 try{
  assert.equal(await app.w.MatchAppEbooks.ready(),true);
  await app.w.MatchAppEbooks.match();
  const first=app.result().querySelector('h3')?.textContent;
  assert([known.title,fresh.title].includes(first));
  assert.equal(app.result().hidden,false);assert.equal(app.credits(),1);
  assert.equal(app.w.MatchAppCountry.regionCode(),'GB');
  assert(app.result().querySelector('a[href^="https://books.apple.com/gb/"]'));
  assert.equal(users,0,'confirmed empty session does not call the failing user endpoint');
  assert.equal(rpcs,0,'guest does not require a registered reading RPC');
  await app.w.MatchAppEbooks.match();
  assert.notEqual(app.result().querySelector('h3')?.textContent,first,'guest exclusions still prevent repeated works');
  assert.equal(app.credits(),2);
 }finally{app.dom.window.close();}
});

test('a registered restored session still hydrates exclusions and reserves before reading debit',async()=>{
 let remote=state({saved:[known.id]}),claimed=false;const calls=[];
 const client={auth:{getSession:async()=>({data:{session},error:null}),getUser:async()=>({data:{user},error:null})},rpc:async(_,{p_action,p_payload})=>{
  calls.push(p_action);assert.equal(p_payload.ownerId,user.id);
  if(p_action==='reading_claim'){
   assert.equal(p_payload.id,fresh.id);claimed=true;remote={...remote,reserved:[fresh.id]};
   return {data:{...remote,claimed:true},error:null};
  }
  if(p_action==='reading_remember'){
   assert.deepEqual(Array.from(p_payload.items,item=>({id:item.id,action:item.action})),[{id:fresh.id,action:'seen'}]);
   remote={...remote,seen:[fresh.id],reserved:[]};
  }else assert.equal(p_action,'reading_list');
  return {data:remote,error:null};
 }};
 const app=await boot(client);
 try{
  assert.equal(await app.w.MatchAppEbooks.ready(),true);
  assert.deepEqual(Array.from(app.w.MatchAppEbooks.saved()),[known.id]);
  const debit=app.w.checkDailyLimit;
  app.w.checkDailyLimit=async()=>{assert.equal(claimed,true,'server reservation must precede a debit');return debit();};
  await app.w.MatchAppEbooks.match();await settle();
  assert.equal(app.result().querySelector('h3')?.textContent,fresh.title);
  assert.equal(app.credits(),1);
  assert(calls.includes('reading_list'));assert(calls.includes('reading_claim'));assert(calls.includes('reading_remember'));
  assert.equal(app.w.localStorage.getItem('match_ebook_owner_v1'),user.id);
 }finally{app.dom.window.close();}
});

test('session, authenticated user and history service failures remain blocked before a result or debit',async()=>{
 for(const failure of ['session','user','missingUserWithSession','history']){
  const client={auth:{
   getSession:async()=>failure==='session'?{data:{session:null},error:new Error('Session restoration failed')}:{data:{session},error:null},
   getUser:async()=>failure==='user'?{data:{user:null},error:new Error('User endpoint unavailable')}:failure==='missingUserWithSession'?missingSession():{data:{user},error:null}
  },rpc:async()=>({data:null,error:new Error('History service unavailable')})};
  const app=await boot(client);
  try{
   assert.equal(await app.w.MatchAppEbooks.ready(),false,failure);
   await app.w.MatchAppEbooks.match();
   assert.equal(app.credits(),0,failure);assert.equal(app.result().querySelector('h3'),null,failure);
   assert.match(app.note().textContent,/could not sync your match history/,failure);
  }finally{app.dom.window.close();}
 }
});

test('an empty session response from an earlier account epoch cannot reset a newly restored reader to guest',async()=>{
 const app=await boot();let release,started,first=true;
 const pending=new Promise(resolve=>{started=resolve;});
 try{
  app.w.supabaseClient={auth:{
   getSession:()=>{if(first){first=false;started();return new Promise(resolve=>{release=resolve;});}return Promise.resolve({data:{session},error:null});},
   getUser:async()=>({data:{user},error:null})
  },rpc:async(_,{p_action,p_payload})=>{assert.equal(p_action,'reading_list');assert.equal(p_payload.ownerId,user.id);return {data:state({saved:[known.id]}),error:null};}};
  const matching=app.w.MatchAppEbooks.match();await pending;
  app.w.document.dispatchEvent(new app.w.CustomEvent('matchapp:authchange'));await settle();
  assert.equal(app.w.localStorage.getItem('match_ebook_owner_v1'),user.id);
  release({data:{session:null},error:null});await matching;
  assert.equal(app.w.localStorage.getItem('match_ebook_owner_v1'),user.id);
  assert.deepEqual(Array.from(app.w.MatchAppEbooks.saved()),[known.id]);
  assert.equal(app.credits(),0);assert.equal(app.result().querySelector('h3'),null);
 }finally{app.dom.window.close();}
});

test('a confirmed signed-out session restores guest history without exposing the previous account portfolio',async()=>{
 let rpcs=0;
 const app=await boot({auth:{getSession:async()=>({data:{session:null},error:null}),getUser:async()=>missingSession()},rpc:async()=>{rpcs++;throw Error('Signed out');}},
  {match_ebook_owner_v1:user.id,match_ebook_saved_v1:[known.id],match_ebook_saved_v1_owner_guest:[fresh.id]});
 try{
  assert.equal(await app.w.MatchAppEbooks.ready(),true);
  assert.equal(app.w.localStorage.getItem('match_ebook_owner_v1'),'guest');
  assert.deepEqual(Array.from(app.w.MatchAppEbooks.saved()),[fresh.id]);
  assert.deepEqual(JSON.parse(app.w.localStorage.getItem('match_ebook_saved_v1_owner_'+user.id)),[known.id]);
  assert.equal(rpcs,0);
 }finally{app.dom.window.close();}
});
