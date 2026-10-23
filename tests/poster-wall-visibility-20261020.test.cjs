'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'..','poster-wall.js'),'utf8');
async function scene({htmlClass='',htmlId='',bodyClass='',pathname='/',duringFetch}={}){
 const dom=new JSDOM('<!doctype html><html class="'+htmlClass+'" id="'+htmlId+'"><head></head><body class="'+bodyClass+'"></body></html>',{url:'https://matchapp.tv'+pathname,runScripts:'outside-only'});
 const w=dom.window,requests=[],imageSources=[];
 Object.defineProperty(w.document,'readyState',{configurable:true,value:'complete'});
 const descriptor=Object.getOwnPropertyDescriptor(w.HTMLImageElement.prototype,'src');
 Object.defineProperty(w.HTMLImageElement.prototype,'src',{configurable:true,get:descriptor.get,set(value){imageSources.push(value);descriptor.set.call(this,value);}});
 w.fetch=async url=>{requests.push(url);duringFetch?.(w);return {ok:true,json:async()=>[{poster:'https://image.tmdb.org/t/p/w500/verified-source.jpg'}]};};
 w.setTimeout=fn=>{queueMicrotask(fn);return 0;};
 w.requestIdleCallback=fn=>{queueMicrotask(fn);return 0;};
 w.eval(source);
 // Drain the finite startup/idle chunks and the two catalogue fetches.
 for(let i=0;i<30;i++)await Promise.resolve();
 return {w,doc:w.document,requests,imageSources,close:()=>w.close()};
}
test('owner-restored (2026-10-23) reference Home and secondary walls build the poster collage and still load the share guard',async()=>{
 for(const bodyClass of ['page-home','ebook-page','page-settings']){
  const s=await scene({htmlClass:'ma-reference',bodyClass});
  assert.deepEqual(s.requests,['/data/poster-wall.json','/data/poster-identities.json','/data/watch-poster-identities.json']);
  assert.ok(s.doc.querySelector('.poster-wall img'),'restored wall must render posters');
  assert.equal(s.doc.querySelectorAll('script[data-share-guard]').length,1,'independent share protection must remain');
  s.close();
 }
});
test('the existing visible legacy wall still fills in finite chunks with genuine low-priority poster renditions',async()=>{
 const s=await scene({bodyClass:'page-home'});
 assert.deepEqual(s.requests,['/data/poster-wall.json','/data/poster-identities.json','/data/watch-poster-identities.json']);
 const images=[...s.doc.querySelectorAll('.poster-wall img')];
 assert.ok(images.length>10&&images.length<=320,'the legacy wall keeps its bounded multi-chunk fill');
 assert.equal(s.imageSources.length,images.length);
 for(const img of images){assert.match(img.src,/^https:\/\/image\.tmdb\.org\/t\/p\/w154\/verified-source\.jpg$/);assert.match(img.srcset,/w185\/verified-source\.jpg/);assert.equal(img.loading,'eager');assert.equal(img.fetchPriority,'low');}
 assert.equal(s.doc.querySelector('.poster-wall').getAttribute('aria-hidden'),'true');
 s.close();
});
test('secondary legacy opt-out remains visible and Kids remains isolated by path and body',async()=>{
 const legacy=await scene({htmlClass:'ma-reference',htmlId:'ma-reference-legacy',bodyClass:'ebook-page'});
 assert.ok(legacy.doc.querySelector('.poster-wall img'));legacy.close();
 for(const options of [{pathname:'/kids/'},{bodyClass:'kids-body'},{htmlClass:'ma-reference',bodyClass:'kids-body'}]){
  const s=await scene(options);assert.deepEqual(s.requests,[]);assert.deepEqual(s.imageSources,[]);assert.equal(s.doc.querySelector('.poster-wall'),null);s.close();
 }
});
test('a theme applied while catalogues are pending keeps the restored wall',async()=>{
 const s=await scene({bodyClass:'page-home',duringFetch:w=>w.document.documentElement.classList.add('ma-reference')});
 assert.equal(s.requests.length,3);assert.ok(s.imageSources.length>0);assert.ok(s.doc.querySelector('.poster-wall img'));s.close();
});
