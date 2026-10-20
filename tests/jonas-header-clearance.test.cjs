'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const rootPath=path.join(__dirname,'..');
const enhancer=fs.readFileSync(path.join(rootPath,'patches/jonas-premium-enhancer.js'),'utf8');
const css=fs.readFileSync(path.join(rootPath,'patches/adult-screen-fit-20261015.css'),'utf8');
const POS='matchapp-jonas-position-v2';

function scene({width=390,dir='ltr',saved=null,kind='shared'}={}){
 const home=kind==='home',simple=kind==='news',quick=kind==='quick';
 const header=quick?'<header class="journey-header"><a href="/">Brand</a></header>':
  simple?'<header class="app-header"><a href="/" class="matchapp-brand-link">Brand</a><a id="matchapp-kids-entry" href="/kids/">Kids Mode</a></header>':
  '<header id="mh-topbox" class="app-header mh-topbox"><div class="mh-head"><a href="/">Brand</a><span id="ma-jonas-header-slot"></span></div><nav class="mh-deck"><button id="nav-reg-btn">Sign In / Join</button></nav></header>';
 const id=home?'ma-jonas-home':'ma-ambient-jonas';
 const portrait=home?'jh-portrait':'ja-bubble';
 const d=new JSDOM('<!doctype html><html dir="'+dir+'"><body class="'+(home?'page-home':simple||quick?'':'page-shell')+'">'+header+
  '<input id="unsaved" value="keep this"><aside id="'+id+'"><button class="'+portrait+'"><img alt=""></button></aside></body></html>',
  {url:'https://matchapp.tv/'+(home?'':simple?'news/':quick?'quick-match.html':'pricing/pricing.html'),runScripts:'outside-only',pretendToBeVisual:true});
 const w=d.window,node=w.document.getElementById(id),button=node.querySelector('button');
 w.innerWidth=width;w.innerHeight=710;w.matchMedia=()=>({matches:home});
 Object.defineProperty(node,'offsetWidth',{value:78});
 let headerBox={left:32,top:80,right:width-32,width:width-64,height:88};
 const measured=w.document.querySelector('.mh-head,.journey-header');
 if(measured)measured.getBoundingClientRect=()=>({...headerBox});
 const slot=w.document.getElementById('ma-jonas-header-slot');
 if(slot)slot.getBoundingClientRect=()=>({left:1200,top:60,width:92,height:92,right:1292,bottom:152});
 if(quick)w.document.documentElement.dataset.growthMode='quick';
 if(saved)w.localStorage.setItem(POS,JSON.stringify(saved));
 let clicks=0;button.onclick=()=>clicks++;
 const input=w.document.getElementById('unsaved');input.value='unsaved details';input.focus();input.setSelectionRange(3,7);
 return {w,node,button,input,measured,headerBox:box=>{headerBox=box},clicks:()=>clicks,
  mount(){w.eval(enhancer);w.document.dispatchEvent(new w.Event('DOMContentLoaded'))},close(){w.close()}};
}
function pointer(w,node,type,x,y){
 const event=new w.Event(type,{bubbles:true});
 Object.defineProperties(event,{clientX:{value:x},clientY:{value:y}});node.dispatchEvent(event);
}

test('shared-page defaults use a lower corner in LTR and RTL without changing focused form state',()=>{
 for(const width of [320,390])for(const dir of ['ltr','rtl']){
  const f=scene({width,dir});try{
   const {w,node,button,input}=f;f.mount();
   assert.equal(node.style.top,'522px',width+' '+dir+' starts above the navigation dock');
   assert.equal(Number.parseFloat(node.style.left)+78,width-18,'same physical right corner in RTL');
   assert.ok(Number.parseFloat(node.style.top)>122,'launcher clears the sticky first control row');
   assert.equal(node.classList.contains('ja-header-default'),false);
   assert.equal(node.classList.contains('ja-corner-default'),true);
   const before={left:node.style.left,top:node.style.top};
   f.headerBox({left:20,top:12,right:width-20,width:width-40,height:140});
   w.dispatchEvent(new w.Event('resize'));
   w.document.dispatchEvent(new w.Event('visibilitychange'));
   assert.deepEqual({left:node.style.left,top:node.style.top},before,'late header geometry must not shift a screen default');
   assert.equal(w.document.activeElement,input);assert.equal(input.value,'unsaved details');
   assert.equal(input.selectionStart,3);assert.equal(input.selectionEnd,7);
   assert.equal(node.querySelector('button'),button);button.click();assert.equal(f.clicks(),1);
   assert.equal(w.localStorage.getItem(POS),null,'presentation cannot persist a default as a user drag');
  }finally{f.close()}
 }
});

test('saved, deliberately dragged and chat-held placements remain authoritative',()=>{
 for(const mode of ['saved','dragged','held','chat-stage']){
  const saved={x:.23,y:.47},f=scene({saved:mode==='saved'?saved:null});try{
   const {w,node}=f;node.style.left='91px';node.style.top='247px';f.mount();
   if(mode==='dragged'){
    pointer(w,node,'pointerdown',100,120);pointer(w,node,'pointermove',120,150);pointer(w,node,'pointerup',120,150);
   }
   if(mode==='held')node.dataset.jonasPositionHeld='1';
   if(mode==='chat-stage')node.classList.add('is-chat-stage');
   node.style.left='91px';node.style.top='247px';
   const stored=w.localStorage.getItem(POS);
   w.dispatchEvent(new w.Event('resize'));w.document.dispatchEvent(new w.Event('visibilitychange'));
   w.document.dispatchEvent(new w.Event('matchapp:jonas-mounted'));
   assert.equal(node.style.left,'91px',mode);assert.equal(node.style.top,'247px',mode);
   assert.equal(w.localStorage.getItem(POS),stored,mode+' storage unchanged');
   if(mode==='saved'||mode==='dragged')assert.equal(node.classList.contains('ja-header-default'),false,mode);
  }finally{f.close()}
 }
});

test('Home and quick pages share the viewport dock while Kids remains isolated',()=>{
 const home=scene({width:1440,kind:'home'});try{
  home.mount();assert.equal(Number.parseFloat(home.node.style.left)+78,1440-18,'current glass size clears the right edge');assert.equal(home.node.style.top,'522px');
 }finally{home.close()}
 const quick=scene({kind:'quick'});try{
  quick.w.scrollY=400;quick.headerBox({left:20,top:60,right:370,width:350,height:100});quick.mount();
  assert.equal(quick.node.style.left,'294px');assert.equal(quick.node.style.top,'522px');
  assert.equal(quick.node.style.position,'fixed');
 }finally{quick.close()}
 const kids=new JSDOM('<body><aside id="ma-ambient-jonas"><button class="ja-bubble"><img></button></aside></body>',
  {url:'https://matchapp.tv/kids/',runScripts:'outside-only'});
 try{kids.window.eval(enhancer);assert.equal(kids.window.__maJonasPremium,undefined);assert.equal(kids.window.document.querySelector('.ja-premium-face'),null)}finally{kids.window.close()}
});

test('default placement avoids an occupied field and releases superseded header reservations',()=>{
 for(const dir of ['ltr','rtl'])for(const kind of ['shared','news']){
  const f=scene({dir,kind});try{
   const button=f.w.document.createElement('button');button.textContent='Save changes';f.w.document.body.appendChild(button);
   button.getBoundingClientRect=()=>({left:260,top:500,right:380,bottom:610,width:120,height:110});
   f.mount();
   const x=Number.parseFloat(f.node.style.left),y=Number.parseFloat(f.node.style.top);
   assert.ok(x+78+8<=260||x-8>=380||y+78+8<=500||y-8>=610,'default bubble must clear Save changes');
   assert.equal(f.node.classList.contains('ja-header-default'),false,'obsolete header reservation is inactive');
   assert.equal(f.node.classList.contains('ja-corner-default'),true);
   assert.equal(f.input.value,'unsaved details');assert.equal(f.w.document.activeElement,f.input);
   assert.equal(f.w.localStorage.getItem(POS),null,'default collision avoidance is not a saved user drag');
  }finally{f.close()}
 }
});
test('shared bounds follow the visible keyboard viewport and keep the glass halo inside all edges',()=>{
 const f=scene();try{
  const v=new f.w.EventTarget();Object.assign(v,{width:320,height:400,offsetLeft:10,offsetTop:120});f.w.visualViewport=v;
  f.mount();
  assert.deepEqual(JSON.parse(JSON.stringify(f.w.MatchAppJonasPlacement.bounds(78,78))),{minX:22,minY:132,maxX:240,maxY:430});
  assert.equal(f.w.document.documentElement.style.getPropertyValue('--ja-view-height'),'400px');
 }finally{f.close()}
});

test('default placement clears painted paragraph lines without storing a drag',()=>{
 const f=scene();try{
  const {w,node}=f,note=w.document.createElement('p');note.textContent='Preview the whole page, then save your favorite.';w.document.body.appendChild(note);
  const line={left:240,right:380,top:520,bottom:545,width:140,height:25};
  w.Range.prototype.getClientRects=function(){return this.commonAncestorContainer.textContent.includes('Preview the whole page')?[line]:[]};
  f.mount();
  const x=Number.parseFloat(node.style.left),y=Number.parseFloat(node.style.top);
  assert.ok(x+78+8<=line.left||x-8>=line.right||y+78+8<=line.top||y-8>=line.bottom,'glass and halo clear the visible paragraph line');
  assert.equal(w.localStorage.getItem(POS),null,'automatic avoidance cannot become a saved user choice');
 }finally{f.close()}
});

test('a clear compact default keeps its size and location when scrolling',async()=>{
 const f=scene();try{
  const {w,node}=f;f.mount();node.dataset.jonasPlacement='floating';
  node.style.setProperty('--ma-jonas-launcher-size','64px');node.style.left='230px';node.style.top='380px';
  node.getBoundingClientRect=()=>({left:230,top:380,right:294,bottom:444,width:64,height:64});
  w.dispatchEvent(new w.Event('scroll'));await new Promise(resolve=>w.requestAnimationFrame(resolve));
  assert.equal(node.style.left,'230px');assert.equal(node.style.top,'380px');
  assert.equal(node.style.getPropertyValue('--ma-jonas-launcher-size'),'64px','an available larger gap must not move a clear compact launcher');
  await new Promise(resolve=>w.setTimeout(resolve,30));w.dispatchEvent(new w.Event('pagehide'));
 }finally{f.close()}
});

test('intentional drag releases an adaptive dock at the shared persisted size',()=>{
 const f=scene();try{
  const {w,node}=f;f.mount();
  const nativeDrag=new w.Event('dragstart',{bubbles:true,cancelable:true});node.querySelector('img').dispatchEvent(nativeDrag);
  assert.equal(nativeDrag.defaultPrevented,true,'HTML portrait dragging cannot cancel the existing pointer drag');
  assert.equal(node.querySelector('img').draggable,false);
  node.style.setProperty('--ma-jonas-launcher-size','56px');node.style.left='200px';node.style.top='500px';
  const dock=w.document.createElement('nav');dock.className='ma-cinema-dock';dock.setAttribute('data-jonas-reserved','');dock.innerHTML='<span class="ma-jonas-dock-slot" aria-hidden="true"></span>';w.document.body.appendChild(dock);
  const ordinaryDrag=new w.Event('dragstart',{bubbles:true,cancelable:true});w.document.body.dispatchEvent(ordinaryDrag);assert.equal(ordinaryDrag.defaultPrevented,false,'unrelated native drags remain untouched');
  pointer(w,node,'pointerdown',228,528);
  const displacedTargetDrag=new w.Event('dragstart',{bubbles:true,cancelable:true});w.document.body.dispatchEvent(displacedTargetDrag);assert.equal(displacedTargetDrag.defaultPrevented,true,'slot reflow cannot hand the held Jonas gesture to a page link');
  pointer(w,node,'pointermove',240,540);pointer(w,node,'pointerup',240,540);
  assert.equal(node.style.getPropertyValue('--ma-jonas-launcher-size'),'78px','all user-dragged launchers use the same normalized-storage dimensions');
  assert.equal(node.style.left,'200px');assert.equal(node.style.top,'500px','the existing drag controller alone owns pointer coordinates');
  assert.equal(w.document.querySelector('.ma-jonas-dock-slot'),null);assert.equal(dock.hasAttribute('data-jonas-reserved'),false);
  assert.equal(w.localStorage.getItem(POS),null,'the presentation enhancer never writes drag storage');
 }finally{f.close()}
});

test('Home prefers the clear space above its existing guide while saved drags remain authoritative',()=>{
 for(const mode of ['clear','occupied','saved']){
  const f=scene({kind:'home',saved:mode==='saved'?{x:.23,y:.47}:null});try{
   const {w,node}=f,footer=w.document.createElement('div');footer.className='ma-cinema-hero-footer';
   footer.innerHTML='<button class="ma-how-button">How to use</button>';const guide=footer.firstChild;
   guide.getBoundingClientRect=()=>({left:245,right:372,top:222,bottom:266,width:127,height:44});w.document.body.appendChild(footer);
   if(mode==='occupied'){const note=w.document.createElement('p');note.textContent='Protected hero text';w.document.body.appendChild(note);w.Range.prototype.getClientRects=function(){return this.commonAncestorContainer.textContent==='Protected hero text'?[{left:250,right:380,top:130,bottom:215,width:130,height:85}]:[]};}
   if(mode==='saved'){node.style.left='91px';node.style.top='247px';}
   let clicks=0;guide.onclick=()=>clicks++;f.mount();guide.click();assert.equal(clicks,1,'the existing guide keeps its click owner');
   if(mode==='clear'){assert.equal(node.style.left,'270px');assert.equal(node.style.top,'132px');assert.equal(node.dataset.jonasGuideAnchor,'1');}
   if(mode==='occupied')assert.notEqual(node.dataset.jonasGuideAnchor,'1','hero text can veto the preferred anchor');
   if(mode==='saved'){assert.equal(node.style.left,'91px');assert.equal(node.style.top,'247px');assert.notEqual(node.dataset.jonasGuideAnchor,'1');}
  }finally{f.close()}
 }
});
