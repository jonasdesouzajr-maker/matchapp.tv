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
  Promise,Set
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
