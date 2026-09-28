'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const base={mood:'any',genre:'any',pace:'any',length:'any',era:'any',format:'ebook',access:'any'};
const book=(id,genres,moods,access=['free','paid'])=>({
 id,title:id,author:'Known Writer',year:1885,genres,moods,pace:'balanced',
 length:'medium',era:'classic',access,summary:'A real catalogued reading profile.'
});
async function setup(criteria={},items=null,magazines=null){
 const dom=new JSDOM('<!doctype html><html lang="en"><body class="page-home"><main><div id="questionnaire-box"></div><section id="ebook-matcher-root"></section></main></body></html>',{
  url:'https://matchapp.tv/',runScripts:'outside-only'
 });
 const w=dom.window;
 w.MATCH_LANG='en';w.MATCHAPP_TOP_EBOOKS=[];
 w.matchMedia=()=>({matches:true});w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.fetch=async()=>{throw Error('Cover network unavailable in isolated test')};
 w.localStorage.setItem('match_ebook_criteria_v1',JSON.stringify({...base,...criteria}));
 if(items===null)w.eval(read('ebooks/catalog.js'));else w.MATCHAPP_EBOOK_CATALOG=items;
 if(magazines!==null)w.MatchAppMagazines={
  items:magazines,
  buyLinks:m=>[{name:'Official publisher',url:m.issues}]
 };
 let credits=0;w.checkDailyLimit=async()=>{credits++;return true};
 w.eval(read('ebooks/ebook-matcher.js'));
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 await new Promise(resolve=>setTimeout(resolve,0));
 return {w,dom,credits:()=>credits,result:()=>w.document.querySelector('[data-ebook-result]'),
  note:()=>w.document.querySelector('[data-ebook-note]')};
}
test('exact screenshot: cozy + historical + legal free returns a real historical free catalogue book with disclosed mood difference',async()=>{
 const h=await setup({format:'ebook',mood:'cozy',genre:'historical',access:'free'});
 try{
  await h.w.MatchAppEbooks.match();
  const title=h.result().querySelector('.ebook-result-copy h3')?.textContent;
  const sourceBook=h.w.MATCHAPP_EBOOK_CATALOG.find(b=>b.title===title);
  assert(sourceBook,'suggestion must originate from curated real book catalogue');
  assert(sourceBook.genres.includes('historical'),'preserve historical genre where possible');
  assert(sourceBook.access.includes('free'),'never substitute paid edition for legal-free selection');
  assert(!sourceBook.genres.some(g=>['horror','thriller','true-crime','dystopian'].includes(g)));
  assert.match(h.result().textContent,/Closest available source match/);
  assert.match(h.result().textContent,/Cozy/,'honestly disclose unmet chosen mood');
  assert.match(h.result().textContent,/local copyright eligibility must still be checked/);
  assert.equal(h.credits(),1);
 }finally{h.dom.window.close()}
});
test('an exact fresh match remains exact and does not claim relaxed criteria',async()=>{
 const item=book('Exact cozy historical',['historical'],['cozy']);
 const h=await setup({mood:'cozy',genre:'historical',access:'free'},[item]);
 try{
  await h.w.MatchAppEbooks.match();
  assert.match(h.result().textContent,/Exact cozy historical/);
  assert.doesNotMatch(h.result().textContent,/Closest available source match/);
  assert.equal(h.credits(),1);
 }finally{h.dom.window.close()}
});
test('selected paid/free access and cozy-content safety remain hard gates',async()=>{
 const paid=book('Paid only historical',['historical'],['cozy'],['paid']);
 const incompatible=book('Free historical horror',['historical','horror'],['dark'],['free']);
 const free=book('Safe free alternative',['classics'],['cozy'],['free']);
 const h=await setup({mood:'cozy',genre:'historical',access:'free'},[paid,incompatible,free]);
 try{
  await h.w.MatchAppEbooks.match();
  assert.match(h.result().textContent,/Safe free alternative/);
  assert.doesNotMatch(h.result().textContent,/Paid only historical|Free historical horror/);
  assert.match(h.result().textContent,/Historical/);
  assert.equal(h.credits(),1);
 }finally{h.dom.window.close()}
});
test('saved and disliked items never recycle; exhausted seen suggestions are labelled',async()=>{
 const a=book('Already saved',['historical'],['cozy']);
 const b=book('Previously seen',['historical'],['cozy']);
 const c=book('Explicitly disliked',['historical'],['cozy']);
 const h=await setup({mood:'cozy',genre:'historical',access:'free'},[a,b,c]);
 try{
  h.w.localStorage.setItem('match_ebook_saved_v1',JSON.stringify([a.id]));
  h.w.localStorage.setItem('match_ebook_disliked_v1',JSON.stringify([c.id]));
  h.w.localStorage.setItem('match_ebook_seen_v1',JSON.stringify([b.id]));
  await h.w.MatchAppEbooks.match();
  assert.match(h.result().textContent,/Previously seen/);
  assert.match(h.result().textContent,/Previously suggested/);
  assert.doesNotMatch(h.result().textContent,/Already saved|Explicitly disliked/);
  assert.equal(h.credits(),1);
 }finally{h.dom.window.close()}
});
test('fully excluded e-book catalogue displays safe source searches instead of an empty warning or billing',async()=>{
 const item=book('Disliked source book',['historical'],['cozy']);
 const h=await setup({mood:'cozy',genre:'historical',access:'free'},[item]);
 try{
  h.w.localStorage.setItem('match_ebook_disliked_v1',JSON.stringify([item.id]));
  await h.w.MatchAppEbooks.match();
  assert.equal(h.result().hidden,false);
  assert.match(h.result().textContent,/No unexcluded catalogued title remains/);
  assert.match(h.result().textContent,/Project Gutenberg|Standard Ebooks/);
  assert.doesNotMatch(h.result().textContent,/Disliked source book/);
  assert.equal(h.credits(),0);
 }finally{h.dom.window.close()}
});
test('magazine-only search returns closest official publisher and exposes missing and unsupported criteria',async()=>{
 const mags=[
  {id:'mag-history',title:'Official History Monthly',publisher:'History House',genres:['historical','history'],
   moods:['curious'],region:'GLOBAL',access:['free','paid'],kind:'magazine',
   icon:'https://example.org/favicon.ico',site:'https://example.org',issues:'https://example.org/issues',
   summary:'Curated publisher identity.'},
  {id:'mag-cozy',title:'Cozy Gardening',publisher:'Garden House',genres:['nature'],
   moods:['cozy'],region:'GLOBAL',access:['free','paid'],kind:'magazine',
   icon:'https://example.net/favicon.ico',site:'https://example.net',issues:'https://example.net/issues',
   summary:'Curated publisher identity.'}
 ];
 const h=await setup({format:'magazine',mood:'cozy',genre:'historical',pace:'fast',length:'short',era:'recent',access:'free'},[],mags);
 try{
  await h.w.MatchAppEbooks.match();
  assert.match(h.result().textContent,/Official History Monthly/);
  assert.match(h.result().textContent,/Not matched: Cozy/);
  assert.match(h.result().textContent,/Magazine publishers do not confirm: Fast, Short, 2015\+/);
  assert.match(h.result().textContent,/free full-issue download/);
  assert.equal(h.credits(),1);
 }finally{h.dom.window.close()}
});
test('excluded magazines show genuine publisher discovery instead of a wrong-category book or credit charge',async()=>{
 const m={id:'mag-excluded',title:'Never show',publisher:'Publisher',genres:['history'],moods:['cozy'],
  access:['free','paid'],region:'GLOBAL',kind:'magazine',site:'https://example.com',
  issues:'https://example.com/issues',icon:'https://example.com/favicon.ico',summary:'Identity'};
 const h=await setup({format:'magazine',genre:'historical',access:'free'},[],[m]);
 try{
  h.w.localStorage.setItem('match_ebook_disliked_v1',JSON.stringify([m.id]));
  await h.w.MatchAppEbooks.match();
  assert.match(h.result().textContent,/Search official magazine publishers/);
  assert.doesNotMatch(h.result().textContent,/Never show/);
  assert.equal(h.credits(),0);
 }finally{h.dom.window.close()}
});
test('free audiobooks outside US remain honest unverified book suggestions and cost no credits',async()=>{
 const it=book('Real curated classic',['historical'],['hopeful']);
 const h=await setup({format:'audiobook',mood:'cozy',genre:'historical',access:'free'},[it]);
 try{
  h.w.localStorage.setItem('match_user_country','br');
  let calls=0;
  h.w.MatchAppAudiobooks={verify:async()=>{calls++;throw Error('must not claim US rights in Brazil')}};
  await h.w.MatchAppEbooks.match();
  assert.equal(calls,0);
  assert.match(h.result().textContent,/Real curated classic/);
  assert.match(h.result().textContent,/Free recordings are not yet rights-verified/);
  assert.match(h.result().textContent,/unverified search/);
  assert.doesNotMatch(h.result().textContent,/Audible|Apple Books/);
  assert.equal(h.credits(),0);
 }finally{h.dom.window.close()}
});
test('verified paid audio may use closest genre profile but never an invented edition',async()=>{
 const historic=book('Documented historical title',['historical'],['hopeful'],['paid']);
 const cozy=book('Cozy contemporary book',['contemporary'],['cozy'],['paid']);
 const h=await setup({format:'audiobook',mood:'cozy',genre:'historical',access:'paid'},[historic,cozy]);
 try{
  let checked=[];
  h.w.MatchAppAudiobooks={
   verify:async(b,region,access)=>{
    checked.push([b.id,region,access]);
    return b.id===historic.id?{apple:{
      provider:'Apple Books',url:'https://books.apple.com/us/audiobook/documented/id123',
      title:b.title,author:b.author,verified:true,kind:'paid',region:'US',
      previewUrl:null},free:null,searches:[]}:null;
   },sourceSearches:()=>[]
  };
  await h.w.MatchAppEbooks.match();
  assert(checked.some(row=>row[0]===historic.id&&row[2]==='paid'));
  assert.match(h.result().textContent,/Documented historical title/);
  assert.match(h.result().textContent,/Cozy/);
  assert.equal(h.credits(),1);
 }finally{h.dom.window.close()}
});
