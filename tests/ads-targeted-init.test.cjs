const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
test('manual requests target measured units rather than earlier hidden rails, and do not duplicate on resize',()=>{
 const dom=new JSDOM('<aside><ins class="adsbygoogle" id="rail"></ins></aside><main><ins class="adsbygoogle" id="inline"></ins></main>',{url:'https://matchapp.tv/',runScripts:'outside-only'});
 const w=dom.window,rail=w.document.getElementById('rail'),inline=w.document.getElementById('inline'),requested=[];
 let railWidth=0,notify;
 rail.getBoundingClientRect=()=>({width:railWidth});rail.getClientRects=()=>railWidth?[{}]:[];
 inline.getBoundingClientRect=()=>({width:390});inline.getClientRects=()=>[{}];
 w.IntersectionObserver=class{constructor(fn){notify=fn}observe(){}};
 // Google supports element; without it the first unfilled rail is selected.
 w.adsbygoogle={push(options){const slot=options.element||[rail,inline].find(el=>!el.hasAttribute('data-adsbygoogle-status'));
  assert.ok(slot.getBoundingClientRect().width>0,'zero-width unit selected');
  requested.push(slot.id);slot.setAttribute('data-adsbygoogle-status','done');
 }};
 w.eval(fs.readFileSync('ads-init.js','utf8'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 notify([{target:rail,isIntersecting:true},{target:inline,isIntersecting:true}]);
 assert.deepEqual(requested,['inline']);assert.equal(rail.hasAttribute('data-adsbygoogle-status'),false);
 railWidth=128;notify([{target:rail,isIntersecting:true},{target:inline,isIntersecting:true}]);
 assert.deepEqual(requested,['inline','rail']);
 assert.equal(w.document.querySelectorAll('ins.adsbygoogle').length,2);dom.window.close();
});
