'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'../patches/reference-motion.js'),'utf8');
function fixture(reduced=false){
 const dom=new JSDOM('<html class="ma-reference"><head><style>.crit-collapsible:not(.crit-open) .crit-chips{display:none}</style></head><body><main><div class="crit-collapsible"><button class="crit-toggle" aria-expanded="false">Format</button><div class="crit-chips"><button id="original-chip" onclick="window.bad=1">Movie</button></div></div></main></body></html>',{url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,frames=[],animations=[];Object.defineProperty(w.document,'readyState',{get:()=> 'complete'});
 w.matchMedia=()=>({matches:reduced,addEventListener(){}});w.requestAnimationFrame=fn=>{frames.push(fn);return frames.length};
 w.HTMLElement.prototype.animate=function(keyframes,options){let done;const animation={node:this,keyframes,options,finished:new Promise(resolve=>done=resolve),cancel(){},complete:()=>done()};animations.push(animation);return animation};
 const host=w.document.querySelector('.crit-collapsible'),panel=w.document.querySelector('.crit-chips'),button=w.document.querySelector('.crit-toggle');
 host.getBoundingClientRect=()=>({height:host.classList.contains('crit-open')?180:48,left:0,top:0,width:300});
 panel.getBoundingClientRect=()=>({height:host.classList.contains('crit-open')?132:0,left:0,top:48,width:300});
 panel.getClientRects=()=>host.classList.contains('crit-open')?[panel.getBoundingClientRect()]:[];
 let calls=0;button.addEventListener('click',()=>{calls++;const on=host.classList.toggle('crit-open');button.setAttribute('aria-expanded',String(on));});
 w.eval(source);return {dom,w,host,panel,button,frames,animations,calls:()=>calls,flush:()=>{while(frames.length)frames.shift()();}};
}
test('custom folds animate both directions while preserving original listeners and semantic state',async t=>{
 const f=fixture();t.after(()=>f.dom.window.close());const original=f.w.document.getElementById('original-chip');
 f.button.click();f.flush();assert.equal(f.calls(),1);assert.equal(f.button.getAttribute('aria-expanded'),'true');
 assert.ok(f.animations.some(a=>a.node===f.host&&a.keyframes[0].height==='48px'&&a.keyframes[1].height==='180px'));
 f.animations.forEach(a=>a.complete());await Promise.resolve();
 f.button.click();f.flush();assert.equal(f.calls(),2);assert.equal(f.button.getAttribute('aria-expanded'),'false');
 const echo=f.host.querySelector('.ma-cinema-fold-echo');assert.ok(echo);assert.ok(echo.hasAttribute('inert'));assert.equal(echo.getAttribute('aria-hidden'),'true');
 assert.equal(echo.querySelector('[onclick]'),null);assert.equal(echo.querySelector('[id]'),null);
 assert.equal(f.w.document.getElementById('original-chip'),original);
 f.animations.forEach(a=>a.complete());await Promise.resolve();assert.equal(f.host.querySelector('.ma-cinema-fold-echo'),null);
 assert.equal(f.host.hasAttribute('data-cinema-fold-animating'),false);
});
test('reduced motion never delays or replaces the existing fold action',t=>{
 const f=fixture(true);t.after(()=>f.dom.window.close());f.button.click();f.flush();
 assert.equal(f.calls(),1);assert.equal(f.button.getAttribute('aria-expanded'),'true');assert.equal(f.animations.length,0);assert.equal(f.host.querySelector('.ma-cinema-fold-echo'),null);
});
test('repeated boot leaves one animation controller and isolated Kids routes remain untouched',t=>{
 const f=fixture();t.after(()=>f.dom.window.close());f.w.eval(source);f.button.click();f.flush();assert.equal(f.calls(),1);
 assert.equal(f.animations.filter(a=>a.node===f.host).length,1);
 const kids=new JSDOM('<html class="ma-reference"><body></body></html>',{url:'https://matchapp.tv/kids/',runScripts:'outside-only'});t.after(()=>kids.window.close());kids.window.eval(source);assert.equal(kids.window.MatchCinemaMotion,undefined);
});
