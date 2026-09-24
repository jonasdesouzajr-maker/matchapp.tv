const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const start=source.indexOf('(function () {',source.indexOf('// TRENDING RAIL'));
const rail=source.slice(start,source.indexOf('let authReturnFocus',start));
test('phone rails do not auto-scroll or fight native scrolling when reaching the beginning',()=>{
 const d=new JSDOM('<div id="marquee-viewport"><div id="marquee-track"><div><img alt="A"></div></div></div>',{url:'https://matchapp.tv/',runScripts:'outside-only'}),w=d.window;
 let intervals=0;w.matchMedia=q=>({matches:q.includes('max-width')});w.setInterval=()=>{intervals++;return 1;};w.setTimeout=fn=>{fn();return 1;};w.requestAnimationFrame=fn=>{fn();return 1;};w.cancelAnimationFrame=()=>{};
 try{w.eval(rail);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));const viewport=w.document.getElementById('marquee-viewport'),track=w.document.getElementById('marquee-track');Object.defineProperty(track,'scrollWidth',{value:2400});viewport.scrollLeft=0;viewport.dispatchEvent(new w.Event('scroll'));assert.equal(viewport.scrollLeft,0);assert.equal(intervals,0);w.document.dispatchEvent(new w.Event('visibilitychange'));assert.equal(intervals,0);}finally{w.close();}
});
test('trending covers show their title and stay keyboard reachable, clones excluded',async()=>{
 const d=new JSDOM('<div class="marquee-item"><img data-title="A Film"></div><div class="marquee-item" aria-hidden="true" tabindex="-1"><img data-title="A Film"></div>',{url:'https://matchapp.tv/',runScripts:'outside-only'}),w=d.window;
 try{w.MATCH_LANG='en';w.eval(fs.readFileSync(path.join(__dirname,'../title-captions.js'),'utf8'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));await Promise.resolve();const tiles=w.document.querySelectorAll('.marquee-item');assert.equal(tiles[0].getAttribute('role'),'button');assert.equal(tiles[0].tabIndex,0);assert.equal(tiles[0].getAttribute('aria-label'),'A Film');assert.equal(tiles[1].tabIndex,-1);
 /* 2026-09-21: the caption is now created and filled for every real cover —
    the rail ships image-only tiles, so the previous "fill it if it exists" pass
    meant no cover ever displayed its title. aria-hidden duplicates are still
    skipped entirely, so the marquee clone gains neither a caption nor focus. */
 const caption=tiles[0].querySelector('.marquee-title');
 assert.ok(caption,'a real cover must be given a caption element');
 assert.equal(caption.textContent,'A Film');
 assert.equal(tiles[1].querySelector('.marquee-title'),null,'aria-hidden clones must not be captioned');}finally{w.close();}
});
