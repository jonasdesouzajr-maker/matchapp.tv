'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const sourceRoute=(value,hosts,prefix='/')=>{
 const url=new URL(value,'https://matchapp.tv/');
 return hosts.includes(url.hostname)&&url.pathname.startsWith(prefix);
};
test('reading source assertions compare parsed hosts and paths, not deceptive URL substrings',()=>{
 assert(sourceRoute('https://itunes.apple.com/search',['itunes.apple.com']));
 assert(!sourceRoute('https://itunes.apple.com.evil.invalid/search',['itunes.apple.com']));
 assert(!sourceRoute('https://example.invalid/itunes.apple.com/search',['itunes.apple.com']));
 assert(!sourceRoute('https://example.invalid/?url=https://books.apple.com/us/book',['books.apple.com'],'/us/'));
 assert(sourceRoute('https://books.apple.com/us/book',['books.apple.com'],'/us/'));
 assert(!sourceRoute('https://books.apple.com/gb/book',['books.apple.com'],'/us/'));
});
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
test('Bookworms uses the chosen country despite a different browser language',async()=>{
 const h=await setup({},[book('Exact country book',['classics'],['curious'])]);
 try{
  Object.defineProperty(h.w.navigator,'language',{value:'pt-BR',configurable:true});
  h.w.localStorage.setItem('match_user_country','United Kingdom');
  h.w.eval(read('viewer-country.js'));
  await h.w.MatchAppEbooks.match();
  const urls=[...h.result().querySelectorAll('a')].map(a=>a.href);
  assert(urls.some(url=>url.startsWith('https://books.apple.com/gb/')));
  assert(urls.some(url=>url.startsWith('https://www.amazon.co.uk/')));
  assert(!urls.some(url=>/amazon\.com\.br|books\.apple\.com\/us\/|barnesandnoble/.test(url)));
 }finally{h.dom.window.close()}
});
test('an unknown country offers a profile choice and never requests a US cover storefront',async()=>{
 const h=await setup({},[book('Unknown country book',['classics'],['curious'])]);
 try{
  const calls=[];h.w.fetch=async url=>{calls.push(String(url));throw Error('Source unavailable')};
  h.w.eval(read('viewer-country.js'));
  await h.w.MatchAppEbooks.match();
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(h.result().querySelector('[data-ebook-choose-country]')?.getAttribute('href'),'/profile/profile.html');
  assert(!calls.some(url=>sourceRoute(url,['itunes.apple.com'])));
  assert(![...h.result().querySelectorAll('a')].some(a=>sourceRoute(a.href,['books.apple.com'],'/us/')||sourceRoute(a.href,['amazon.com','www.amazon.com'],'/s')||sourceRoute(a.href,['kobo.com','www.kobo.com'],'/us/')));
  assert(h.result().querySelector('a[href^="https://books.google.com/"]'));
  assert.equal(h.credits(),1,'the actual book remains matchable without inventing local stock');
 }finally{h.dom.window.close()}
});
test('Ask AI source cards honor reading exclusions without hiding film adaptations',async()=>{
 const h=await setup({},[book('Saved title',['classics'],['curious']),book('Dismissed title',['classics'],['curious']),book('Previous title',['classics'],['curious']),book('Fresh title',['classics'],['curious'])]);
 try{
  h.w.eval(read('ebooks/reading-ai.js'));
  h.w.localStorage.setItem('match_ebook_saved_v1',JSON.stringify(['Saved title']));
  h.w.localStorage.setItem('match_ebook_disliked_v1',JSON.stringify(['Dismissed title']));
  h.w.localStorage.setItem('match_ebook_seen_v1',JSON.stringify(['Previous title']));
  h.w.localStorage.setItem('match_dislikedList',JSON.stringify([{title:'Fresh title'}]));
  assert.deepEqual(Array.from(h.w.MatchAppReadingAI.selectBooks('Recommend a book'),b=>b.id),['Fresh title']);
  h.w.MatchAppMagazines={items:[{id:'Saved title',title:'Saved magazine',genres:['nature']},{id:'mag-fresh',title:'New nature magazine',genres:['nature']}]};
  assert.deepEqual(Array.from(h.w.MatchAppReadingAI.selectMagazine('Recommend a nature magazine'),m=>m.id),['mag-fresh']);
 }finally{h.dom.window.close()}
});
test('a known reference can guide a fresh recommendation while factual lookup retains its exact identity',async()=>{
 const original=book('Pride and Prejudice',['romance'],['romantic']),fresh=book('Fresh romance',['romance'],['romantic']);
 const h=await setup({},[original,fresh]);
 try{
  h.w.eval(read('ebooks/reading-ai.js'));
  h.w.localStorage.setItem('match_ebook_saved_v1',JSON.stringify([original.id]));
  assert.deepEqual(Array.from(h.w.MatchAppReadingAI.selectBooks('Recommend romance books like Pride and Prejudice'),b=>b.id),[fresh.id]);
  assert.deepEqual(Array.from(h.w.MatchAppReadingAI.selectBooks('Where can I find Pride and Prejudice?',{allowKnown:true}),b=>b.id),[original.id]);
  assert.deepEqual(Array.from(h.w.MatchAppReadingAI.selectBooks('Where can I find Pride and Prejudice?'),b=>b.id),[],'never substitute another title for an exact lookup');
 }finally{h.dom.window.close()}
});
test('fresh Ask AI reading cards reserve their IDs and are not offered on the next request',async()=>{
 const item=book('One fresh AI book',['classics'],['curious']);
 const h=await setup({},[item]);
 try{
  h.w.eval(read('ebooks/reading-ai.js'));
  const host=h.w.document.createElement('main');h.w.document.body.appendChild(host);
  assert.equal(await h.w.MatchAppReadingAI.renderFresh('Recommend a book',host),1);
  assert.equal(host.querySelector('.reading-ai-card h4')?.textContent,item.title);
  host.innerHTML='';
  assert.equal(await h.w.MatchAppReadingAI.renderFresh('Recommend a book',host),0);
  assert.equal(host.children.length,0);
  assert.deepEqual(Array.from(h.w.MatchAppReadingAI.excludedTitles()),[item.title]);
  assert.equal(h.credits(),0,'Ask source cards do not debit the separate Match meter');
 }finally{h.dom.window.close()}
});
test('a canceled Ask reading request releases its unseen claim and renders no stale card',async()=>{
 const item=book('Canceled AI source',['classics'],['curious']);
 const h=await setup({},[item]);
 try{
  h.w.eval(read('ebooks/reading-ai.js'));
  const host=h.w.document.createElement('main');h.w.document.body.appendChild(host);
  const claim=h.w.MatchAppEbooks.claimSuggestion;let active=true;
  h.w.MatchAppEbooks.claimSuggestion=async id=>{const result=await claim(id);active=false;return result;};
  assert.equal(await h.w.MatchAppReadingAI.renderFresh('Recommend a book',host,{current:()=>active}),0);
  assert.equal(host.children.length,0);
  assert.deepEqual(JSON.parse(h.w.localStorage.getItem('match_ebook_seen_v1')),[]);
 }finally{h.dom.window.close()}
});
test('denied local storage still prevents repeated guest books within the active page',async()=>{
 const item=book('Storage denied title',['classics'],['curious']);
 const h=await setup({},[item]);
 try{
  Object.defineProperty(h.w,'localStorage',{get(){throw Error('Storage denied')}});
  await h.w.MatchAppEbooks.match();
  assert.match(h.result().textContent,/Storage denied title/);
  await h.w.MatchAppEbooks.match();
  assert.doesNotMatch(h.result().textContent,/Storage denied title/);
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
test('saved, disliked and previously suggested books never recycle after catalogue exhaustion',async()=>{
 const a=book('Already saved',['historical'],['cozy']);
 const b=book('Previously seen',['historical'],['cozy']);
 const c=book('Explicitly disliked',['historical'],['cozy']);
 const h=await setup({mood:'cozy',genre:'historical',access:'free'},[a,b,c]);
 try{
  h.w.localStorage.setItem('match_ebook_saved_v1',JSON.stringify([a.id]));
  h.w.localStorage.setItem('match_ebook_disliked_v1',JSON.stringify([c.id]));
  h.w.localStorage.setItem('match_ebook_seen_v1',JSON.stringify([b.id]));
  await h.w.MatchAppEbooks.match();
  assert.match(h.result().textContent,/No unexcluded catalogued title remains/);
  assert.doesNotMatch(h.result().textContent,/Already saved|Explicitly disliked|Previously seen/);
  assert.equal(h.credits(),0);
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

test('another e-book request does not repeat the only work or consume another credit',async()=>{
 const h=await setup({},[book('One source work',['classics'],['cozy'])]);
 try{
  await h.w.MatchAppEbooks.match();
  assert.equal(h.credits(),1);
  await h.w.MatchAppEbooks.match();
  assert.match(h.result().textContent,/No unexcluded catalogued title remains/);
  assert.doesNotMatch(h.result().textContent,/One source work/);
  assert.equal(h.credits(),1);
 }finally{h.dom.window.close()}
});

test('a previously suggested magazine is not recycled after publisher exhaustion',async()=>{
 const mag={id:'mag-only',title:'Only Publisher',genres:['history'],moods:['curious'],region:'US',access:['paid'],kind:'magazine',icon:'https://example.org/icon.png',site:'https://example.org',issues:'https://example.org/issues',summary:'An official publisher.'};
 const h=await setup({format:'magazine',access:'paid'},[],[mag]);
 try{
  h.w.localStorage.setItem('match_ebook_seen_v1',JSON.stringify([mag.id]));
  await h.w.MatchAppEbooks.match();
  assert.match(h.result().textContent,/No unexcluded catalogued title remains/);
  assert.doesNotMatch(h.result().textContent,/Only Publisher/);
  assert.equal(h.credits(),0);
 }finally{h.dom.window.close()}
});

test('reading cloud history is restored before selection and separated between accounts',async()=>{
 const a=book('Account A saved work',['classics'],['cozy']);
 const h=await setup({},[a]);
 let user={id:'reader-a',user_metadata:{match_ebook_saved:[a.id],match_ebook_seen:[a.id]}};
 try{
  h.w.supabaseClient={auth:{getUser:async()=>({data:{user}})},rpc:async(_,{p_action,p_payload})=>{
   assert.equal(p_action,'reading_list');assert.equal(p_payload.ownerId,user.id);
   return {data:{saved:user.id==='reader-a'?[a.id]:[],seen:user.id==='reader-a'?[a.id]:[],disliked:[],reserved:[],restored:[],claimed:false}};
  }};
  await h.w.MatchAppEbooks.match();
  assert.equal(h.credits(),0);
  assert.deepEqual(Array.from(h.w.MatchAppEbooks.saved()),[a.id]);
  user={id:'reader-b',user_metadata:{}};
  h.w.document.dispatchEvent(new h.w.CustomEvent('matchapp:authchange'));
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.deepEqual(Array.from(h.w.MatchAppEbooks.saved()),[]);
  assert.deepEqual(JSON.parse(h.w.localStorage.getItem('match_ebook_seen_v1')),[]);
  user={id:'reader-a',user_metadata:{}};
  h.w.document.dispatchEvent(new h.w.CustomEvent('matchapp:authchange'));
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.deepEqual(Array.from(h.w.MatchAppEbooks.saved()),[a.id]);
  assert.deepEqual(JSON.parse(h.w.localStorage.getItem('match_ebook_seen_v1')),[a.id]);
 }finally{h.dom.window.close()}
});
test('a refused Match allowance releases an unshown reading reservation',async()=>{
 const item=book('Not charged title',['classics'],['cozy']);
 const h=await setup({},[item]);
 try{
  h.w.checkDailyLimit=async()=>false;
  await h.w.MatchAppEbooks.match();
  assert.deepEqual(JSON.parse(h.w.localStorage.getItem('match_ebook_seen_v1')),[]);
  assert(!h.result().querySelector('h3'));
  h.w.checkDailyLimit=async()=>true;
  await h.w.MatchAppEbooks.match();
  assert.match(h.result().textContent,/Not charged title/);
 }finally{h.dom.window.close()}
});
test('an account change invalidates an earlier identity lookup before any debit or result',async()=>{
 const item=book('Account switch title',['classics'],['cozy']);
 const h=await setup({},[item]);
 let release,started;const waiting=new Promise(resolve=>{started=resolve});let first=true;
 try{
  h.w.supabaseClient={auth:{getUser:()=>{
   if(first){first=false;started();return new Promise(resolve=>{release=resolve})}
   return Promise.resolve({data:{user:{id:'reader-b'}}});
  }},rpc:async(_,{p_payload})=>{
   assert.equal(p_payload.ownerId,'reader-b');
   return {data:{saved:['Other account saved title'],disliked:[],seen:[],reserved:[],restored:[],claimed:false}};
  }};
  const job=h.w.MatchAppEbooks.match();await waiting;
  h.w.document.dispatchEvent(new h.w.CustomEvent('matchapp:authchange'));
  await new Promise(resolve=>setTimeout(resolve,0));
  release({data:{user:{id:'reader-a'}}});await job;
  assert.equal(h.credits(),0);
  assert.deepEqual(Array.from(h.w.MatchAppEbooks.saved()),['Other account saved title']);
  assert(!h.result().querySelector('h3'));
 }finally{h.dom.window.close()}
});
test('a simultaneous cloud title claim loses safely and cannot debit or reveal the duplicate',async()=>{
 const item=book('Claimed elsewhere',['classics'],['cozy']);
 const h=await setup({},[item]);let claims=0;
 try{
  h.w.supabaseClient={auth:{getUser:async()=>({data:{user:{id:'reader-a'}}})},rpc:async(_,{p_action,p_payload})=>{
   assert.equal(p_payload.ownerId,'reader-a');
   if(p_action==='reading_claim'){claims++;return {data:{saved:[],disliked:[],seen:[],reserved:[item.id],restored:[],claimed:false}};}
   assert.equal(p_action,'reading_list');return {data:{saved:[],disliked:[],seen:[],reserved:[],restored:[],claimed:false}};
  }};
  await h.w.MatchAppEbooks.match();
  assert.equal(claims,1);assert.equal(h.credits(),0);
  assert.doesNotMatch(h.result().textContent,/Claimed elsewhere/);
  assert.match(h.result().textContent,/No unexcluded catalogued title remains/);
 }finally{h.dom.window.close()}
});
test('explicit Remove restores a saved book for future matching',async()=>{
 const item=book('Restore this book',['classics'],['cozy']);
 const h=await setup({},[item]);
 try{
  await h.w.MatchAppEbooks.match();
  h.result().querySelector('[data-ebook-save]').click();
  assert.deepEqual(Array.from(h.w.MatchAppEbooks.saved()),[item.id]);
  h.w.document.querySelector('[data-ebook-remove]').click();
  assert.deepEqual(Array.from(h.w.MatchAppEbooks.saved()),[]);
  assert.deepEqual(JSON.parse(h.w.localStorage.getItem('match_ebook_seen_v1')),[]);
  await h.w.MatchAppEbooks.match();
  assert.match(h.result().textContent,/Restore this book/);
  assert.equal(h.credits(),2,'the user explicitly restored this title');
 }finally{h.dom.window.close()}
});

test('a late AI ranking cannot revive a book dismissed during the request',async()=>{
 const item=book('Dismissed during ranking',['classics'],['cozy']);
 const h=await setup({},[item]);
 let release,started;
 const waiting=new Promise(resolve=>{started=resolve});
 try{
  h.w.MatchAppAIRank={rank:()=>{started();return new Promise(resolve=>{release=resolve})}};
  const job=h.w.MatchAppEbooks.match();
  await waiting;
  h.w.localStorage.setItem('match_ebook_disliked_v1',JSON.stringify([item.id]));
  release({id:'c0'});
  await job;
  assert.doesNotMatch(h.result().textContent,/Dismissed during ranking/);
  assert.equal(h.credits(),0);
 }finally{h.dom.window.close()}
});

test('reading history retains older exclusions beyond the previous 300-item cutoff',async()=>{
 const h=await setup({},[book('Fresh source work',['classics'],['cozy'])]);
 try{
  const previous=Array.from({length:350},(_,i)=>'older-work-'+i);
  h.w.localStorage.setItem('match_ebook_seen_v1',JSON.stringify(previous));
  await h.w.MatchAppEbooks.match();
  const seen=JSON.parse(h.w.localStorage.getItem('match_ebook_seen_v1'));
  assert.equal(seen.length,351);
  assert(seen.includes('older-work-0'));
 }finally{h.dom.window.close()}
});
