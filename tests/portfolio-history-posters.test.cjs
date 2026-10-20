'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const turn=()=>new Promise(resolve=>setImmediate(resolve));
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const original='https://image.tmdb.org/t/p/w780/xDGbZ0JJ3mYaGKy4Nzd9Kph6M9L.jpg';

function fixture({history=[],activity=[],disliked=[]}={}){
 const errors=[],calls={forget:[],removedAt:[],fetch:[],catalog:[],details:[],lookup:[],probes:[]};
 const console=new VirtualConsole();console.on('jsdomError',error=>errors.push(error.message));
 const dom=new JSDOM('<!doctype html><html lang="en"><head></head><body><div class="container"><section class="profile-hub"></section><script data-registration-upgrade="1" type="application/json"></script><div class="portfolio-tabs">'+
  ['history','watchlater','seenit','audio'].map(name=>'<button id="tab-'+name+'" class="portfolio-tab"><span>'+name+'</span><span id="count-'+name+'" class="tab-count">0</span></button>').join('')+
  '</div><div id="panel-history" class="portfolio-panel"><div id="history-list"></div></div><div id="panel-watchlater" class="portfolio-panel"></div><div id="panel-seenit" class="portfolio-panel"></div><div id="panel-audio" class="portfolio-panel"></div></div></body></html>',
  {url:'https://matchapp.tv/profile/profile.html',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:console});
 const w=dom.window;
 Object.defineProperty(w.document,'readyState',{configurable:true,get:()=> 'complete'});
 w.localStorage.setItem('match_lang','en');w.localStorage.setItem('match_dislikedList',JSON.stringify(disliked));
 w.localStorage.setItem('match_owned_wallet_test','{"match":10,"ask":10}');
 w.matchPolicy={history:()=>history,forget:async title=>{calls.forget.push(title);return true;}};
 w.MatchActivity={all:()=>activity,removeAt:ts=>calls.removedAt.push(ts)};
 w.fetch=async url=>{calls.fetch.push(url);throw new Error('Network disabled in focused fixture');};
 const profile=read('profile.js');
 w.eval(profile.match(/function escapeHtml\(str\) \{[\s\S]*?\n\}/)[0]);
 w.eval(profile.match(/window\.switchPortfolioTab = function\(tab\) \{[\s\S]*?\n\};/)[0]);
 w.eval(profile.split('/* MATCHAPP_PORTFOLIO_POSTERS_BEGIN */')[1].split('/* MATCHAPP_PORTFOLIO_POSTERS_END */')[0]);
 w.eval(read('profile-portfolio-i18n.js'));w.eval(read('portfolio-history.js'));w.eval(read('final-audit.js'));
 const snapshot=()=>Object.fromEntries(Object.keys(w.localStorage).map(key=>[key,w.localStorage.getItem(key)]));
 function catalog({loadedUrls=[],details=null}={}){
  const allowed=new Set(loadedUrls);
  w.Image=class{
   naturalWidth=0;
   set src(url){calls.probes.push(url);w.queueMicrotask(()=>{if(allowed.has(url)){this.naturalWidth=780;this.onload?.();}else this.onerror?.();});}
  };
  w.tmdbLookup=async(...args)=>{calls.lookup.push(args);return null;};
  w.tmdbDetails=async(...args)=>{calls.details.push(args);return details;};
  w.supabaseClient={from(name){calls.catalog.push(name);return {select(){return this;},eq(){return this;},order(){return this;},limit:async()=>({data:[],error:null})};}};
  w.eval(read('catalog-media.js'));
 }
 return {dom,w,calls,errors,snapshot,catalog};
}

test('history and Not For Me preserve genuine saved artwork and activity source identity through the shared renderer',t=>{
 const history=freeze([{title:'Wicked',posterUrl:original,tmdbId:402431,kind:'movie',year:2024,originalTitle:'Wicked',addedAt:500},
  {title:'Nested movie',_tmdb:{poster:original,tmdbId:402431,kind:'movie',year:2024},addedAt:400}]);
 const activity=freeze([{type:'save',detail:'Audio source title',ts:300,meta:{type:'album',artwork:'https://is1-ssl.mzstatic.com/image/thumb/Music1/example.jpg',originalTitle:'Original album'}},
  {type:'seen',detail:'Book source title',ts:200,meta:{type:'book',cover:'https://covers.openlibrary.org/b/id/8225261-L.jpg',year:1965}},
  {type:'match',detail:'Activity movie',ts:100,meta:{poster:original,tmdbId:402431,kind:'movie',year:2024,originalTitle:'Wicked'}}]);
 const disliked=freeze([{title:'Saved excluded title',cover:original,tmdbId:402431,kind:'movie',year:2024}]);
 const before=JSON.stringify({history,activity,disliked});
 const f=fixture({history,activity,disliked});t.after(()=>f.dom.window.close());
 const {w}=f,storage=f.snapshot();
 const images=[...w.document.querySelectorAll('.profile-history-card img')];
 assert.equal(images.length,5);assert.equal(images[0].getAttribute('src'),original);assert.equal(images[1].getAttribute('src'),original);
 assert.equal(images[0].alt,'Wicked');assert.equal(images[0].dataset.tmdbId,'402431');assert.equal(images[0].dataset.tmdbKind,'movie');assert.equal(images[0].dataset.tmdbYear,'2024');
 assert.equal(images[2].dataset.posterSourceKind,'audio');assert.equal(images[2].dataset.portfolioPoster,undefined);
 assert.equal(images[3].dataset.posterSourceKind,'book');assert.equal(images[3].dataset.portfolioPoster,undefined);
 assert.equal(images[4].getAttribute('src'),original);assert.equal(images[4].dataset.tmdbId,'402431');assert.equal(images[4].dataset.originalTitle,'Wicked');
 assert.deepEqual(images.map(img=>img.getAttribute('loading')),['eager','eager','eager','eager','lazy']);
 const excluded=w.document.querySelector('.audit-notforme-card img');assert.equal(excluded.getAttribute('src'),original);assert.equal(excluded.alt,'Saved excluded title');
 w.localStorage.setItem('match_lang','ar');w.document.dispatchEvent(new w.CustomEvent('matchapp:langchange'));
 assert.equal(w.document.querySelector('.audit-notforme-card img'),excluded);assert.equal(excluded.getAttribute('src'),original);assert.equal(w.document.querySelector('.audit-notforme-card strong').textContent,'Saved excluded title');
 w.localStorage.setItem('match_lang','en');assert.deepEqual(f.snapshot(),storage);
 assert.equal(JSON.stringify({history,activity,disliked}),before);assert.deepEqual(f.calls.fetch,[]);assert.deepEqual(f.errors,[]);
});

test('missing, unsafe and broken history/Not For Me images retain a visible local fallback without optional generators',t=>{
 const history=freeze([{title:'Missing artwork',addedAt:300},{title:'Unsafe URL',posterUrl:'javascript:alert(1)',addedAt:200},{title:'Broken source',poster:original,addedAt:100}]);
 const f=fixture({history,disliked:['Legacy string title',{title:'Excluded broken source',poster:original}]});t.after(()=>f.dom.window.close());
 const storage=f.snapshot(),cards=[...f.w.document.querySelectorAll('.profile-history-card,.audit-notforme-card')];
 assert.equal(cards.length,5);
 for(const card of cards){
  const img=card.querySelector('img');assert.ok(img,'every title has an image node');assert.ok(img.getAttribute('src'));
  img.dispatchEvent(new f.w.Event('error'));
  assert.match(img.getAttribute('src'),/^data:image\/svg\+xml/);
  assert.notEqual(img.style.display,'none');assert.notEqual(img.style.visibility,'hidden');assert.equal(img.hidden,false);
  assert.ok(decodeURIComponent(img.src).includes(img.alt),'the fallback retains the exact source title');
 }
 assert.deepEqual(f.snapshot(),storage);assert.deepEqual(f.calls.forget,[]);assert.deepEqual(f.calls.fetch,[]);assert.deepEqual(f.errors,[]);
});

test('late catalog loading repairs exact visual identities in place without rewriting saved records or action handlers',async t=>{
 const history=freeze([{title:'Original saved movie label',tmdbId:402431,kind:'movie',year:2024,ts:123,addedAt:123}]);
 const disliked=freeze([{title:'Original excluded movie label',_tmdb:{tmdbId:402431,kind:'movie',year:2024}}]);
 const f=fixture({history,disliked});t.after(()=>f.dom.window.close());
 const {w}=f,storage=f.snapshot(),record=JSON.stringify(history);
 const historyCard=w.document.querySelector('.profile-history-card'),excluded=w.document.querySelector('.audit-notforme-card');
 const historyImage=historyCard.querySelector('img'),excludedImage=excluded.querySelector('img'),remove=historyCard.querySelector('button'),allow=excluded.querySelector('button');
 assert.match(historyImage.src,/^data:image\/svg\+xml/);assert.match(excludedImage.src,/^data:image\/svg\+xml/);
 f.catalog({loadedUrls:[original],details:{title:'Wicked',tmdbId:402431,kind:'movie',year:2024,poster:original}});
 for(let i=0;i<12&&(!historyImage.src.startsWith('https:')||!excludedImage.src.startsWith('https:'));i++)await turn();
 for(const img of [historyImage,excludedImage]){assert.equal(img.getAttribute('src'),original);assert.equal(img.dataset.matchappFallbackStage,'verified');assert.equal(img.dataset.tmdbId,'402431');}
 assert.equal(w.document.querySelector('.profile-history-card'),historyCard);assert.equal(historyCard.querySelector('button'),remove);assert.equal(excluded.querySelector('button'),allow);
 assert.equal(historyCard.querySelector('h3').textContent,'Original saved movie label');assert.equal(excluded.querySelector('strong').textContent,'Original excluded movie label');
 assert.deepEqual(f.calls.details.map(args=>args.slice(0,2)),[[402431,'movie'],[402431,'movie']]);assert.deepEqual(f.calls.lookup,[]);
 assert.deepEqual(f.snapshot(),storage);assert.equal(JSON.stringify(history),record);
 remove.click();w.document.querySelector('.ma-confirm-cancel').click();await turn();assert.deepEqual(f.calls.forget,[]);assert.deepEqual(f.calls.removedAt,[]);
 // Use the original allow-again action after repair; no re-rendered control is substituted.
 w.supabaseClient=null;allow.click();await turn();assert.deepEqual(f.calls.forget,['Original excluded movie label']);assert.deepEqual(JSON.parse(w.localStorage.getItem('match_dislikedList')),[]);
 assert.equal(w.localStorage.getItem('match_owned_wallet_test'),storage.match_owned_wallet_test);assert.deepEqual(f.calls.fetch,[]);assert.deepEqual(f.errors,[]);
});

test('failed audio and book covers in history and Not For Me never enter film catalog or TMDB lookup',async t=>{
 const f=fixture({activity:[{type:'save',detail:'Audio same-name work',ts:2,meta:{type:'album',artwork:'https://is1-ssl.mzstatic.com/image/thumb/Music1/broken.jpg'}},
  {type:'save',detail:'Book same-name work',ts:1,meta:{type:'book',cover:'https://covers.openlibrary.org/b/id/0-L.jpg'}}],
  disliked:[{title:'Excluded audio work',type:'podcast',cover:'https://is1-ssl.mzstatic.com/image/thumb/Podcasts1/broken.jpg'},{title:'Excluded book work',isBook:true,posterUrl:original,tmdbId:402431,kind:'movie'}]});
 t.after(()=>f.dom.window.close());const storage=f.snapshot();f.catalog();
 for(const img of f.w.document.querySelectorAll('img'))img.dispatchEvent(new f.w.Event('error'));
 await turn();await turn();
 for(const img of f.w.document.querySelectorAll('img')){assert.match(img.src,/^data:image\/svg\+xml/);assert.equal(img.dataset.portfolioPoster,undefined);assert.equal(img.__matchappAdultPoster,undefined);}
 assert.deepEqual(f.calls.catalog,[]);assert.deepEqual(f.calls.details,[]);assert.deepEqual(f.calls.lookup,[]);assert.deepEqual(f.calls.probes,[]);
 assert.deepEqual(f.snapshot(),storage);assert.deepEqual(f.errors,[]);
});
