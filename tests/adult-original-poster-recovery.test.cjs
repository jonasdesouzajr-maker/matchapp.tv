'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('every Top Titles source matches the exact-title poster registry, including both corrected originals',()=>{
 const app=read('app.js'),dom=new JSDOM(read('index.html')).window.document;
 const start=app.indexOf('const VERIFIED_POSTERS = {'),end=app.indexOf('\n};',start);
 assert.ok(start>=0&&end>start);
 const registry=vm.runInNewContext(app.slice(start,end+3)+'\nVERIFIED_POSTERS',Object.create(null));
 const images=[...dom.querySelectorAll('#marquee-track .marquee-item img[data-title]')];
 assert.equal(images.length,20,'the established 10-title loop stays unchanged');
 for(const img of images){
  assert.ok(registry[img.dataset.title],'missing exact-title registry record: '+img.dataset.title);
  assert.equal(img.getAttribute('src'),registry[img.dataset.title],img.dataset.title+' must not use stale or unrelated artwork');
  assert.match(img.src,/^https:\/\/image\.tmdb\.org\/t\/p\/w780\//);
 }
 assert.equal(registry['Habeas Corpus'],'https://image.tmdb.org/t/p/w780/cojcROwZe8681XzroVIOE9VK4zV.jpg');
 assert.equal(registry['The Love Hypothesis'],'https://image.tmdb.org/t/p/w780/wlb6vunPuBjboYnmy4r3NlKZWji.jpg');
 assert.match(read('index.html'),/#trending-rail \.marquee-item img \{ object-fit: contain !important/);
});

test('Top Titles and the adult match share poster recovery without replacing the recommendation engine',()=>{
 const app=read('app.js'),media=read('catalog-media.js');
 assert.match(app,/window\.getVerifiedPoster = getVerifiedPoster/);
 assert.match(app,/window\.MatchAppCatalogMedia\.recoverAdultPoster\(img, title, null, verified\)/);
 assert.match(app,/window\.MatchAppCatalogMedia\.recoverAdultPoster\(posterEl, selected\.title, null, realCover\)/);
 assert.match(media,/function recoverAdultPoster\(/);
 assert.match(media,/function exactPosterCandidates\(/);
 assert.match(media,/function adultPosterSurface\(/);
 assert.match(media,/recoverAdultPoster\(img,title,meta\)/);
 assert.match(media,/recoverAdultPoster\(poster,title,meta,resolved\.url\)/);
 assert.match(media,/if\(adultPosterSurface\(img\)\)recoverAdultPoster\(img,title\)/);
 assert.match(media,/else hardenImage\(img,title\)/); // Kids remains on the original media safety path.
 assert.doesNotMatch(media,/CONTENT_CATALOG\s*=/);
});

test('same-poster TMDB size fallback and exact saved metadata recover broken originals without a cross-title lookup',async()=>{
 const media=read('catalog-media.js');
 const start=media.indexOf('  function adultPosterSurface(');
 const end=media.indexOf('  function localLikePoster(',start);
 assert.ok(start>=0&&end>start,'isolatable adult-only helper');
 const bad='https://image.tmdb.org/t/p/w780/oldbad.jpg';
 const good='https://image.tmdb.org/t/p/w500/goodart.jpg';
 const brokenLookups=[];
 class Probe {
  set src(url){brokenLookups.push(url);queueMicrotask(()=>{if(url===good)this.onload?.();else this.onerror?.();});}
 }
 const queried=[];
 const ctx={
  TRUSTED_POSTER:/^https:\/\/(?:image\.tmdb\.org|is\d+-ssl\.mzstatic\.com)\//i,
  Image:Probe,
  window:{getVerifiedPoster:title=>title==='Exact Movie'?bad:null,globalMatchTitle:'Exact Movie'},
  lookup:async title=>{queried.push(title);return {title,poster_url:good};},
  normalise:s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,''),
  localPoster:title=>'data:image/svg+xml,'+encodeURIComponent(title),
  Promise,Set,setTimeout,clearTimeout
 };
 const {posterVariants,recoverAdultPoster}=vm.runInNewContext(media.slice(start,end)+'\n({posterVariants,recoverAdultPoster})',ctx);
 assert.deepEqual(Array.from(posterVariants(bad)),[
  bad,'https://image.tmdb.org/t/p/w500/oldbad.jpg','https://image.tmdb.org/t/p/original/oldbad.jpg'
 ]);
 function fakeImg(initial,title){
  const listeners={};
  return {
   id:'',dataset:{},complete:true,naturalWidth:0,isConnected:true,
   _src:initial,
   get src(){return this._src;},
   set src(url){this._src=url;this.complete=true;this.naturalWidth=url===good?900:0;},
   get currentSrc(){return this._src;},
   getAttribute(name){return name==='src'?this._src:null;},
   closest(sel){return sel==='#marquee-track'?{}:null;},
   addEventListener(event,fn){listeners[event]=fn;},
   fail(){listeners.error?.()},
   title
  };
 }
 const img=fakeImg(bad,'Exact Movie');
 recoverAdultPoster(img,'Exact Movie',null,bad);
 await new Promise(r=>setTimeout(r,15));
 assert.equal(img.src,good,'must reach the exact-title database poster if the old URL and its variants fail');
 assert.deepEqual(queried,['Exact Movie'],'must query only the requested title');
 assert.ok(brokenLookups.includes('https://image.tmdb.org/t/p/w500/oldbad.jpg'));
 assert.ok(brokenLookups.includes('https://image.tmdb.org/t/p/original/oldbad.jpg'));
 assert.ok(brokenLookups.includes(good));
 assert.equal(ctx.window.globalMatchPoster,undefined,'rail recovery must not overwrite the unrelated matched poster');
 // Healthy original artwork is never overwritten with another image or a placeholder.
 const loaded=fakeImg(good,'Exact Movie');loaded.naturalWidth=900;
 const before=queried.length;
 recoverAdultPoster(loaded,'Exact Movie',null,bad);
 await new Promise(r=>setTimeout(r,0));
 assert.equal(loaded.src,good);
 assert.equal(queried.length,before);
});


test('all duplicated Home tiles retain the verified numeric film/TV identities',()=>{
 const dom=new JSDOM(read('index.html')).window.document;
 const expected=new Map([
  ['Quem É Você?',[201778,'tv',1996]],
  ['Vermelho Sangue',[226415,'tv',2025]],
  ['Habeas Corpus',[308963,'tv',2026]],
  ['Virtuosas',[1419806,'movie',2026]],
  ['(Des)controle',[1369243,'movie',2026]],
  ['Line of Fire',[321958,'tv',2026]],
  ['Wicked',[402431,'movie',2024]],
  ['You+Me - Against the World',[1641629,'movie',2026]],
  ['The Love Hypothesis',[1032863,'movie',2026]],
  ['American Hostage',[239618,'tv',2026]]
 ]);
 const imgs=[...dom.querySelectorAll('#marquee-track img[data-title]')];
 assert.equal(imgs.length,20);
 for(const [title,identity] of expected){
  const duplicates=imgs.filter(img=>img.dataset.title===title);
  assert.equal(duplicates.length,2,'must keep the exact duplicate loop for '+title);
  for(const img of duplicates)
   assert.deepEqual([Number(img.dataset.tmdbId),img.dataset.tmdbKind,Number(img.dataset.tmdbYear)],identity);
 }
});

test('translated Top Titles posters recover using an exact ID, not a fuzzy title search',async()=>{
 const media=read('catalog-media.js');
 const start=media.indexOf('  function adultPosterSurface(');
 const end=media.indexOf('  function localLikePoster(',start);
 const dead='https://image.tmdb.org/t/p/w780/dead-registry.jpg';
 const correct='https://image.tmdb.org/t/p/w780/VERIFIED_LOCALIZED.jpg';
 const tried=[],detailsCalls=[],dbCalls=[];
 class Probe {
  naturalWidth=0;
  set src(url){
   tried.push(url);
   queueMicrotask(()=>{
    if(url===correct){this.naturalWidth=780;this.onload?.();}
    else this.onerror?.();
   });
  }
 }
 const win={
  getVerifiedPoster:()=>dead,
  tmdbDetails:async(id,kind)=>{
   detailsCalls.push([id,kind]);
   return {tmdbId:226415,kind:'tv',adult:false,year:2025,posterLarge:correct};
  }
 };
 const ctx={
  TRUSTED_POSTER:/^https:\/\/(?:image\.tmdb\.org|is\d+-ssl\.mzstatic\.com)\//i,
  Image:Probe,window:win,
  lookup:async title=>{dbCalls.push(title);return null;},
  normalise:s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,''),
  localPoster:t=>'data:image/svg+xml,'+encodeURIComponent(t),
  setTimeout,clearTimeout,Promise,Set,Date
 };
 const {recoverAdultPoster}=vm.runInNewContext(media.slice(start,end)+'\n({recoverAdultPoster})',ctx);
 const img={
  id:'',dataset:{tmdbId:'226415',tmdbKind:'tv',tmdbYear:'2025'},
  isConnected:true,complete:true,naturalWidth:0,_src:dead,
  get src(){return this._src},set src(value){this._src=value},
  get currentSrc(){return this._src},
  getAttribute(key){return key==='src'?this._src:null},
  closest(sel){return sel==='#marquee-track'?{}:null},
  addEventListener(){}
 };
 recoverAdultPoster(img,'Vermelho Sangue',null,dead);
 await new Promise(resolve=>setTimeout(resolve,35));
 assert.equal(img.src,correct,'the exact title identity should restore its original art');
 assert.deepEqual(dbCalls,['Vermelho Sangue']);
 assert.deepEqual(detailsCalls,[[226415,'tv']],'do not run a broad search or change TV/movie type');
 assert.ok(!tried.includes('https://image.tmdb.org/t/p/w780/another-title.jpg'));
});

test('wrong numeric ID in similarly named metadata is ignored during poster rescue',async()=>{
 const media=read('catalog-media.js');
 const start=media.indexOf('  function adultPosterSurface(');
 const end=media.indexOf('  function localLikePoster(',start);
 const registry='https://image.tmdb.org/t/p/w780/missing.jpg';
 const wrong='https://image.tmdb.org/t/p/w780/WRONG_MOVIE.jpg';
 const correct='https://image.tmdb.org/t/p/w780/RIGHT_TV.jpg';
 const attempted=[];
 class Probe{
  naturalWidth=0;
  set src(url){attempted.push(url);queueMicrotask(()=>{
   if(url===correct){this.naturalWidth=780;this.onload?.();}
   else this.onerror?.();
  });}
 }
 const ctx={
  TRUSTED_POSTER:/^https:\/\/(?:image\.tmdb\.org|is\d+-ssl\.mzstatic\.com)\//i,
  Image:Probe,
  window:{
   getVerifiedPoster:()=>registry,
   tmdbDetails:async()=>({tmdbId:308963,kind:'tv',adult:false,year:2026,posterLarge:correct})
  },
  lookup:async()=>({title:'Habeas Corpus',year:2026,media_kind:'movie',tmdb_id:999,poster_large_url:wrong}),
  normalise:s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,''),
  localPoster:t=>'data:image/svg+xml,'+encodeURIComponent(t),
  setTimeout,clearTimeout,Promise,Set,Date
 };
 const {recoverAdultPoster}=vm.runInNewContext(media.slice(start,end)+'\n({recoverAdultPoster})',ctx);
 const img={id:'',dataset:{tmdbId:'308963',tmdbKind:'tv',tmdbYear:'2026'},
  isConnected:true,complete:true,naturalWidth:0,_src:registry,
  get src(){return this._src},set src(v){this._src=v},
  get currentSrc(){return this._src},
  getAttribute(v){return v==='src'?this._src:null},
  closest(v){return v==='#marquee-track'?{}:null},
  addEventListener(){}};
 recoverAdultPoster(img,'Habeas Corpus',null,registry);
 await new Promise(resolve=>setTimeout(resolve,35));
 assert.equal(img.src,correct);
 assert.ok(!attempted.includes(wrong),'unrelated movie poster must never be attempted');
});

test('stalled original-poster probes have a bounded fallback and deduplicate duplicate-card downloads',async()=>{
 const media=read('catalog-media.js');
 const start=media.indexOf('  function adultPosterSurface(');
 const end=media.indexOf('  function localLikePoster(',start);
 let starts=0;
 class StalledProbe{set src(_){starts++;}}
 const ctx={Image:StalledProbe,window:{},Promise,Set,Date,
  setTimeout:fn=>{queueMicrotask(fn);return 1},clearTimeout:()=>{},
  TRUSTED_POSTER:/^https:\/\/image\.tmdb\.org\/t\/p\//i};
 const {posterImageLoads}=vm.runInNewContext(media.slice(start,end)+'\n({posterImageLoads})',ctx);
 const url='https://image.tmdb.org/t/p/w780/unresponsive-original.jpg';
 const a=posterImageLoads(url),b=posterImageLoads(url);
 assert.equal(a,b,'duplicate cards should share a single network probe');
 assert.equal(await a,false,'stalled artwork must release fallback without hanging');
 assert.equal(starts,1,'a duplicate request must not waste another provider fetch');
});


test('translated titles refresh visibly loaded Top Titles artwork through the pinned exact ID',async()=>{
 const media=read('catalog-media.js');
 const start=media.indexOf('  async function enrichTrendingRail(');
 const end=media.indexOf('  async function resolvePoster(',start);
 assert.ok(start>=0&&end>start,'Top Titles enrichment must remain isolated');
 const calls={lookup:[],details:[],restored:[]};
 const img={dataset:{title:'Vermelho Sangue',tmdbId:'226415',tmdbKind:'tv',tmdbYear:'2025'}};
 const card={querySelector:sel=>sel==='img[data-title]'?img:null};
 const ctx={
  document:{querySelectorAll:sel=>sel==='#marquee-track .marquee-item'?[card]:[]},
  window:{tmdbDetails:async(id,kind)=>{calls.details.push([id,kind]);return {
   tmdbId:226415,kind:'tv',adult:false,year:2025,
   posterLarge:'https://image.tmdb.org/t/p/w780/FRESH_SAME_TITLE.jpg'
  };}},
  lookup:async title=>{calls.lookup.push(title);return null;},
  refreshExact:async meta=>meta,
  posterVariants:url=>/^https:\/\/image\.tmdb\.org\/t\/p\//.test(url||'')?[url]:[],
  recoverAdultPoster:(el,title,meta)=>calls.restored.push({el,title,meta}),
  availability:()=>({inCinemas:false})
 };
 const fn=vm.runInNewContext(media.slice(start,end)+'\nenrichTrendingRail',ctx);
 await fn();
 assert.deepEqual(calls.lookup,['Vermelho Sangue']);
 assert.deepEqual(calls.details,[[226415,'tv']]);
 assert.equal(calls.restored.length,1);
 assert.equal(calls.restored[0].el,img);
 assert.equal(calls.restored[0].meta.tmdb_id,226415);
 assert.equal(calls.restored[0].meta.poster_large_url,'https://image.tmdb.org/t/p/w780/FRESH_SAME_TITLE.jpg');
});

test('Top Titles refuses a fresh image returned for the wrong numeric film or TV identity',async()=>{
 const media=read('catalog-media.js');
 const start=media.indexOf('  async function enrichTrendingRail(');
 const end=media.indexOf('  async function resolvePoster(',start);
 const calls=[];
 const img={dataset:{title:'Habeas Corpus',tmdbId:'308963',tmdbKind:'tv',tmdbYear:'2026'}};
 const ctx={
  document:{querySelectorAll:()=>[{querySelector:sel=>sel==='img[data-title]'?img:null}]},
  window:{tmdbDetails:async()=>({tmdbId:999,kind:'movie',year:2026,
   posterLarge:'https://image.tmdb.org/t/p/w780/WRONG_MOVIE.jpg'})},
  lookup:async()=>null,refreshExact:async meta=>meta,
  posterVariants:url=>[url],
  recoverAdultPoster:(_img,_title,meta)=>calls.push(meta),
  availability:()=>({inCinemas:false})
 };
 await vm.runInNewContext(media.slice(start,end)+'\nenrichTrendingRail',ctx)();
 assert.equal(calls.length,1);
 assert.equal(calls[0],null,'wrong-identity metadata must never replace the existing original');
});

test('exact-title database metadata refreshes working posters without an extra live lookup',async()=>{
 const media=read('catalog-media.js');
 const start=media.indexOf('  async function enrichTrendingRail(');
 const end=media.indexOf('  async function resolvePoster(',start);
 const img={dataset:{title:'The Love Hypothesis',tmdbId:'1032863',tmdbKind:'movie',tmdbYear:'2026'}};
 const current={title:'The Love Hypothesis',tmdb_id:1032863,media_kind:'movie',
   poster_large_url:'https://image.tmdb.org/t/p/w780/wlb6vunPuBjboYnmy4r3NlKZWji.jpg'};
 const recorded=[];
 const ctx={
  document:{querySelectorAll:()=>[{querySelector:sel=>sel==='img[data-title]'?img:null}]},
  window:{tmdbDetails:async()=>{throw Error('Should not query live ID when saved exact metadata exists');}},
  lookup:async()=>current,
  refreshExact:async row=>row,
  recoverAdultPoster:(_img,_title,meta)=>recorded.push(meta),
  availability:()=>({inCinemas:false})
 };
 await vm.runInNewContext(media.slice(start,end)+'\nenrichTrendingRail',ctx)();
 assert.equal(recorded.length,1);
 assert.equal(recorded[0],current);
});
