'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const {installGuestReservations}=require('./helpers/guest-reservations.cjs');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const result=(title='Shared original',id=123)=>({title,year:2020,kind:'movie',tmdbId:id,posterUrl:'https://image.tmdb.org/t/p/w500/original.jpg',viewingMode:'shared',viewing:[{role:'shared',country:'BR',checkedAt:new Date().toISOString(),source:'TMDB / JustWatch',sourceUrl:'https://www.themoviedb.org/movie/'+id+'-original/watch?locale=BR',offers:[{provider:'Verified source',access:'subscription'}]}]});
async function boot(user=null){
 const dom=new JSDOM('<main><section id="growth-root"></section></main>',{url:'https://matchapp.tv/together.html',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 installGuestReservations(w);
 w.supabaseClient={supabaseKey:'test-public-key',supabaseUrl:'https://example.supabase.co',auth:{getUser:async()=>({data:{user}}),getSession:async()=>({data:{session:null}})}};
 w.eval(read('matching-policy.js'));await w.matchPolicy.ready();
 for(const file of ['growth-bootstrap.js','growth-core.js','growth-copy.js'])w.eval(read(file));
 w.eval(read('growth-together.js').replace('w.MatchAppGrowthTogether=Object.freeze','w.__growthTest={apply,exclusions,newInvite,model:()=>model};w.MatchAppGrowthTogether=Object.freeze').replace('initialize().catch(', 'w.__growthReady=initialize();w.__growthReady.catch('));
 await w.__growthReady;
 return {dom,w,api:w.__growthTest};
}
test('anonymous quick matches reserve before paint, retain same-invite revisits, and exclude the same source on a new match',async()=>{
 const {dom,w,api}=await boot();
 try{
  const item=result();await api.apply({status:'matched',result:item});
  assert(w.document.body.textContent.includes(item.title));assert.equal(w.matchPolicy.history()[0].action,'matched');
  await api.apply({status:'matched',result:item});assert(w.document.body.textContent.includes(item.title));
  api.newInvite();await api.apply({status:'matched',result:result('Translated original')});
  assert(!w.document.body.textContent.includes('Translated original'));assert.equal(api.model().status,'no_match');
 }finally{dom.window.close();}
});
test('returning to a saved shared invitation stays usable, while a hard-dismissed alias remains hidden',async()=>{
 const {dom,w,api}=await boot();
 try{
  const item=result();await api.apply({status:'matched',result:item});
  w.matchPolicy.savePreference(item,'save');await api.apply({status:'matched',result:item});
  assert(w.document.body.textContent.includes(item.title),'an intentional return is not a fresh recommendation');
  w.matchPolicy.savePreference({...item,title:'Dismissed translated title'},'dislike');await api.apply({status:'matched',result:item});
  assert(!w.document.body.textContent.includes(item.title));assert.equal(api.model().status,'no_match');
 }finally{dom.window.close();}
});
test('a guest claim collision never reveals a quick result',async()=>{
 const {dom,w,api}=await boot();let resolve;
 try{
  w.matchPolicy={...w.matchPolicy,claim:()=>new Promise(done=>{resolve=done;})};
  const pending=api.apply({status:'matched',result:result('Contested original')});
  for(let i=0;i<40&&!resolve;i++)await Promise.resolve();assert(resolve);
  assert(!w.document.body.textContent.includes('Contested original'));
  resolve(false);await pending;assert(!w.document.body.textContent.includes('Contested original'));
 }finally{dom.window.close();}
});
test('a changed quick invitation releases its unshown pending guest reservation',async()=>{
 const {dom,w,api}=await boot();let resolve,claimed=false;
 try{
  const policy=w.matchPolicy,item=result('Canceled original');
  w.matchPolicy={...policy,claim:async value=>{claimed=await policy.claim(value);return new Promise(done=>{resolve=done;});}};
  const pending=api.apply({status:'matched',result:item});
  for(let i=0;i<60&&!resolve;i++)await Promise.resolve();assert(resolve);assert.equal(claimed,true);
  api.newInvite();resolve(true);await pending;
  assert.equal(policy.excludes(item),false);assert(!w.document.body.textContent.includes(item.title));
 }finally{dom.window.close();}
});
test('registered quick results reuse only the exact server session reservation',async()=>{
 const {dom,w,api}=await boot({id:'registered-account'});
 try{
  const item={...result(),matchScope:'growth:current-invitation'};
  w.matchPolicy.remember({...item,reason:item.matchScope},'shown');
  let claims=0;w.matchPolicy={...w.matchPolicy,claim:async()=>{claims++;return false;}};
  await api.apply({status:'matched',result:item});assert(w.document.body.textContent.includes(item.title));assert.equal(claims,0);
  api.newInvite();await api.apply({status:'matched',result:{...item,matchScope:'growth:another-invitation'}});
  assert(!w.document.body.textContent.includes(item.title));assert.equal(claims,1);
 }finally{dom.window.close();}
});
test('quick exclusions include shown source identities and readable aliases, beyond the saved lists',async()=>{
 const {dom,w,api}=await boot();
 try{
  w.matchPolicy.remember({...result('Localized title'),originalTitle:'Original title',titleAliases:['Third title']},'shown');
  const titles=await api.exclusions();
  for(const value of ['tmdb:movie:123','Localized title','Original title','Third title'])assert(titles.includes(value),value);
 }finally{dom.window.close();}
});
test('Growth service preserves only valid typed movie and TV identity exclusion keys',async()=>{
 const {cleanExclusions}=await import('../supabase/functions/growth-together/eligibility.mjs');
 assert.deepEqual(cleanExclusions(['tmdb:movie:123','tmdb:tv:123','A Film','A Film']),['tmdb:movie:123','tmdb:tv:123','afilm']);
 assert(!cleanExclusions(['tmdb:movie:-2','tmdb:person:123']).some(key=>key.includes(':')));
});
