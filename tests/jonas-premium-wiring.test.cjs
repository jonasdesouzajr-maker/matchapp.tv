'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const load=file=>fs.readFileSync(file,'utf8');
test('enhancer preserves bubble, click handlers and existing portrait without duplicate layers',()=>{
 const d=new JSDOM('<button class="ja-bubble"><img src="/jonas/faces/jonas/rest.jpg"><span class="ja-live"></span></button>',{url:'https://matchapp.tv/',runScripts:'outside-only'});
 const w=d.window,b=w.document.querySelector('button');b.parentNode.id='ma-ambient-jonas';let clicks=0;b.onclick=()=>clicks++;
 w.eval(load('patches/jonas-premium-enhancer.js'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 w.document.dispatchEvent(new w.Event('matchapp:jonas-mounted'));b.click();
 assert.equal(clicks,1);assert.equal(b.querySelectorAll('.ja-premium-face').length,1);
 assert.match(b.querySelector('.ja-premium-face img').src,/rest.jpg$/);assert.ok(b.querySelector('.ja-live'));w.close();
});
test('swipe patch leaves pointer and scroll ownership with original rail controller',async()=>{
 const d=new JSDOM('<div id="marquee-viewport" style="scroll-behavior:smooth;scroll-snap-type:x mandatory"></div>',{url:'https://matchapp.tv/',runScripts:'outside-only'});
 const w=d.window,r=w.document.querySelector('div');let touches=0;r.addEventListener('touchstart',()=>touches++);
 w.eval(load('patches/jonas-swipe-velocity.js'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 r.dispatchEvent(new w.Event('touchstart'));r.dispatchEvent(new w.Event('scroll'));
 assert.equal(touches,1);assert.equal(r.style.scrollBehavior,'auto');assert.equal(r.style.scrollSnapType,'none');
 r.dispatchEvent(new w.Event('touchcancel'));await new Promise(resolve=>setTimeout(resolve,250));
 assert.equal(r.style.scrollBehavior,'smooth');assert.equal(r.style.scrollSnapType,'x mandatory');w.close();
});
test('all new UI scripts fail closed on Kids routes',()=>{
 const d=new JSDOM('<div id="marquee-viewport"></div><aside id="ma-jonas-home"><span class="jh-portrait"><img></span></aside>',{url:'https://matchapp.tv/kids/',runScripts:'outside-only'});
 for(const file of ['jonas-premium-enhancer.js','jonas-swipe-velocity.js','jonas-intro-audio.js'])d.window.eval(load('patches/'+file));
 d.window.document.dispatchEvent(new d.window.Event('DOMContentLoaded'));
 assert.equal(d.window.document.querySelector('.ja-premium-face'),null);
 assert.equal(d.window.document.querySelector('#marquee-viewport').dataset.premiumSwipe,undefined);d.window.close();
});
test('browser and remotely editable Android shell load premium presentation without native changes',()=>{
 const home=load('index.html'),android=load('jonas/android-ambient-assistant-20261011.js');
 for(const file of ['jonas-premium-glass.css','jonas-premium-enhancer.js','jonas-swipe-velocity.js','jonas-intro-audio.js'])assert.ok(home.includes('/patches/'+file));
 assert.match(android,/matchapp:jonas-mounted/);assert.match(android,/jonas-premium-enhancer.js/);
 assert.match(load('jonas/android-ambient-assistant-20261011.css'),/jonas-premium-glass.css/);
 assert.match(android,/setProperty\('left',[^;]+,'important'\)/);
 assert.ok(fs.statSync('assets/brand/matchapp-intro-audio.mp3').size>1000);
});
