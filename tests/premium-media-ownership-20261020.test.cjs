'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'..','premium-ui.js'),'utf8');
function scene(body){
 const dom=new JSDOM('<!doctype html><html><body>'+body+'</body></html>',{url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;w.matchMedia=()=>({matches:true});
 w.document.querySelectorAll('img').forEach(img=>{Object.defineProperty(img,'complete',{configurable:true,value:true});Object.defineProperty(img,'naturalWidth',{configurable:true,value:80});});
 w.eval(source);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 return {dom,w,doc:w.document,error:img=>img.dispatchEvent(new w.Event('error')),load:img=>img.dispatchEvent(new w.Event('load'))};
}
test('specialized posters, Books covers, events, avatars and brand retain their source and accessible identity on error',()=>{
 const s=scene('<img id="res-poster-img" src="/original-result.jpg" alt="Verified result"><div id="marquee-track"><img data-title="Exact title" src="/rail.jpg" alt="Exact title"></div><div class="ebook-cover"><img data-ebook-cover src="/book.jpg" alt="Exact author and book"></div><img data-top-cover src="/top-book.jpg" alt="Top book"><img data-magazine-publisher-icon src="/publisher.png" alt="Publisher"><div class="global-event"><img src="/event.jpg" alt="Official event"></div><img id="profile-avatar-img" src="/avatar.jpg" alt="Your avatar"><img src="/assets/brand/matchapp-icon-approved.png" alt="MatchApp Ai">');
 for(const img of s.doc.images){const before={src:img.getAttribute('src'),alt:img.alt};s.error(img);assert.equal(img.getAttribute('src'),before.src);assert.equal(img.alt,before.alt);assert.notEqual(img.dataset.maFallback,'1');}
 s.w.close();
});
test('ownership attached after the generic scan still prevents a competing fallback and lets the existing handler recover',()=>{
 const s=scene('<div><img src="/pending-source.jpg" alt="Original title"></div>'),img=s.doc.querySelector('img');
 img.setAttribute('data-ebook-cover','');let errors=0;img.addEventListener('error',()=>{errors++;img.src='/verified-edition.jpg';});
 s.error(img);assert.equal(errors,1);assert.equal(img.getAttribute('src'),'/verified-edition.jpg');assert.equal(img.alt,'Original title');assert.notEqual(img.dataset.maFallback,'1');s.w.close();
});
test('useful generic fallback preserves source, srcset and alt without pretending its SVG is original artwork',()=>{
 const s=scene('<img src="/ordinary.jpg" srcset="/ordinary-small.jpg 200w, /ordinary.jpg 600w" sizes="50vw" alt="Ordinary illustration">'),img=s.doc.querySelector('img');
 s.error(img);const fallback=img.src;assert.match(fallback,/^data:image\/svg\+xml/);assert.equal(img.dataset.maFallback,'1');assert.equal(img.dataset.maOriginalSrc,'https://matchapp.tv/ordinary.jpg');assert.equal(img.dataset.maOriginalSrcset,'/ordinary-small.jpg 200w, /ordinary.jpg 600w');assert.equal(img.dataset.maOriginalSizes,'50vw');assert.equal(img.alt,'Ordinary illustration');assert.equal(img.hasAttribute('srcset'),false);
 s.load(img);assert.equal(img.dataset.maFallback,'1','a decoded generic SVG is still a fallback');s.error(img);assert.equal(img.src,fallback,'a fallback failure must not loop');
 img.src='/recovered-real.jpg';s.load(img);assert.equal(img.dataset.maFallback,undefined);assert.equal(img.getAttribute('src'),'/recovered-real.jpg');s.w.close();
});
test('legacy generic pixels with a recorded source yield to a specialized cover owner once',()=>{
 const s=scene('<div class="ebook-cover"><img data-ebook-cover data-ma-fallback="1" data-ma-original-src="https://covers.openlibrary.org/b/id/123-L.jpg" data-ma-original-alt="Verified title and author" src="data:image/svg+xml,placeholder" alt=""></div>'),img=s.doc.querySelector('img');
 assert.equal(img.src,'https://covers.openlibrary.org/b/id/123-L.jpg');assert.equal(img.alt,'Verified title and author');assert.notEqual(img.dataset.maFallback,'1');assert.equal(img.dataset.maFallbackRestored,img.src);s.error(img);assert.equal(img.src,'https://covers.openlibrary.org/b/id/123-L.jpg','specialized error recovery retains ownership');s.w.close();
});
test('a pending verified handoff is never replaced with a stale recorded URL; a genuine load clears the legacy marker',()=>{
 const s=scene('<div class="ebook-cover"><img data-ebook-cover data-ma-fallback="1" data-ma-original-src="/old-bad.jpg" src="/new-verified.jpg" alt="Exact cover"></div>'),img=s.doc.querySelector('img');
 assert.equal(img.getAttribute('src'),'/new-verified.jpg');s.load(img);assert.equal(img.dataset.maFallback,undefined);assert.equal(img.getAttribute('src'),'/new-verified.jpg');s.w.close();
});
test('legacy fallback without a recoverable source keeps its marker for the owning loader to reject',()=>{
 const s=scene('<div class="ebook-cover"><img data-ebook-cover data-ma-fallback="1" src="data:image/svg+xml,placeholder" alt="Exact title"></div>'),img=s.doc.querySelector('img');
 assert.equal(img.dataset.maFallback,'1');assert.equal(img.getAttribute('src'),'data:image/svg+xml,placeholder');s.error(img);assert.equal(img.dataset.maFallback,'1');s.w.close();
});
