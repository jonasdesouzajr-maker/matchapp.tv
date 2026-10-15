'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const load=file=>fs.readFileSync(file,'utf8');
test('enhancer preserves bubble, click handlers and existing portrait without duplicate layers',()=>{
 const d=new JSDOM('<button class="ja-bubble"><img src="/jonas/faces/jonas/rest.jpg"><span class="ja-live"></span></button>',{url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=d.window,b=w.document.querySelector('button');b.parentNode.id='ma-ambient-jonas';let clicks=0;b.onclick=()=>clicks++;
 w.eval(load('patches/jonas-premium-enhancer.js'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 w.document.dispatchEvent(new w.Event('matchapp:jonas-mounted'));b.click();
 assert.equal(clicks,1);assert.equal(b.querySelectorAll('.ja-premium-face').length,1);
 assert.match(b.querySelector('.ja-premium-face img').src,/rest.jpg$/);assert.ok(b.querySelector('.ja-live'));w.close();
});
test('swipe patch leaves pointer and scroll ownership with original rail controller',async()=>{
 const d=new JSDOM('<div id="marquee-viewport" style="scroll-behavior:smooth;scroll-snap-type:x mandatory"></div>',{url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true});
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
test('Jonas defaults to a safe lower-right dock and honors existing dragged positions',()=>{
 for(const saved of [null,{x:.2,y:.4}]){
  const d=new JSDOM('<body><aside id="ma-ambient-jonas"><button class="ja-bubble"><img></button></aside></body>',{url:'https://matchapp.tv/ebooks/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=d.window,root=w.document.querySelector('aside');if(saved)w.localStorage.setItem('matchapp-jonas-position-v2',JSON.stringify(saved));
  w.eval(load('patches/jonas-premium-enhancer.js'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  if(saved){assert.equal(root.style.left,'');assert.equal(root.classList.contains('ja-header-default'),false)}
  else{assert.equal(root.style.left,(w.innerWidth-76-22)+'px');assert.equal(root.style.top,(w.innerHeight-76-118)+'px')}
  assert.equal(w.document.documentElement.style.getPropertyValue('--ja-view-height'),w.innerHeight+'px');d.window.close();
 }
 assert.match(load('index.html'),/id="ma-jonas-header-slot"/);
});
test('native drag persists a shared cross-page position and chat dimensions ignore launcher coordinates',()=>{
 const js=load('jonas/android-ambient-assistant-20261011.js'),css=load('patches/jonas-premium-glass.css');
 assert.match(js,/localStorage.setItem\('matchapp-jonas-position-v2',position\)/);
 assert.match(css,/height:var\(--ja-view-height,100dvh\)!important/);
 assert.match(css,/\.jh-content \{min-height:0!important;overflow-y:auto!important/);
 assert.match(js,/class="ja-blink"/);assert.match(js,/onLevel:level=>\{if\(open&&token===epoch&&level>0\)faceWord\('a'\)/);
});

test('desktop Home docks inside its reserved header slot without overwriting a saved drag',()=>{
 for(const saved of [false,true]){
  const d=new JSDOM('<body class="page-home"><header><div><span id="ma-jonas-header-slot"></span></div></header><aside id="ma-jonas-home"></aside></body>',{url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=d.window,root=w.document.querySelector('aside');w.innerWidth=1440;w.matchMedia=()=>({matches:true});
  w.document.getElementById('ma-jonas-header-slot').getBoundingClientRect=()=>({left:1200,top:60,width:92,height:92});
  if(saved)w.localStorage.setItem('matchapp-jonas-position-v2',JSON.stringify({x:.3,y:.5}));
  w.eval(load('patches/jonas-premium-enhancer.js'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  assert.equal(root.style.left,saved?'':'1208px');assert.equal(root.style.top,saved?'':'68px');
  assert.equal(w.localStorage.getItem('matchapp-jonas-position-v2')!==null,saved);w.close();
 }
});
