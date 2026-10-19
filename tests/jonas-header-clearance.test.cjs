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
 Object.defineProperty(node,'offsetWidth',{value:home?92:78});
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

test('shared-page defaults stay clear of the sticky navigation through header reflow in LTR and RTL',()=>{
 for(const width of [320,390])for(const dir of ['ltr','rtl']){
  const f=scene({width,dir});try{
   const {w,node,button,input}=f;f.mount();
   assert.equal(node.style.top,'20px',width+' '+dir+' must start at the screen corner, not the earlier header y');
   assert.equal(Number.parseFloat(node.style.left)+78,width-22,'same physical right corner in RTL');
   assert.ok(Number.parseFloat(node.style.top)+78+13<122,'launcher and halo clear the sticky first control row');
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

test('Home reserved slot, quick document dock and Kids isolation retain their existing routes',()=>{
 const home=scene({width:1440,kind:'home'});try{
  home.mount();assert.equal(home.node.style.left,'1200px');assert.equal(home.node.style.top,'60px');
 }finally{home.close()}
 const quick=scene({kind:'quick'});try{
  quick.w.scrollY=400;quick.headerBox({left:20,top:60,right:370,width:350,height:100});quick.mount();
  assert.equal(quick.node.style.left,'292px');assert.equal(quick.node.style.top,'471px');
 }finally{quick.close()}
 const kids=new JSDOM('<body><aside id="ma-ambient-jonas"><button class="ja-bubble"><img></button></aside></body>',
  {url:'https://matchapp.tv/kids/',runScripts:'outside-only'});
 try{kids.window.eval(enhancer);assert.equal(kids.window.__maJonasPremium,undefined);assert.equal(kids.window.document.querySelector('.ja-premium-face'),null)}finally{kids.window.close()}
});

test('default-only clearance covers physical-right RTL heads and simple news headers without touching saved positions',()=>{
 // JSDOM does not certify CSS-layer layout; these assertions protect the authored
 // selector/declaration contract, paired with the real-page collision harness.
 const shared=css.match(/(html body\.page-shell:has\(#ma-ambient-jonas\.ja-header-default\) header\.app-header\.mh-topbox > \.mh-head)\s*\{([^}]+)\}/);
 assert.ok(shared,'shared default clearance rule');
 assert.match(shared[2],/padding-left:0!important/);assert.match(shared[2],/padding-right:100px!important/);
 const simple=css.match(/@media\(max-width:600px\)\s*\{\s*\/\* Publisher hubs[^]*?\*\/\s*(html body:has\(#ma-ambient-jonas\.ja-header-default\):not\(\.page-home\) > header\.app-header:not\(\.mh-topbox\))\s*\{([^}]+)\}/);
 assert.ok(simple,'narrow simple-header clearance rule');assert.match(simple[2],/padding-right:106px!important/);
 for(const dir of ['ltr','rtl'])for(const kind of ['shared','news']){
  const f=scene({dir,kind});try{
   f.mount();const selector=kind==='shared'?shared[1]:simple[1];
   assert.equal(f.w.document.querySelectorAll(selector).length,1,kind+' '+dir+' default reservation');
   f.node.classList.remove('ja-header-default');
   assert.equal(f.w.document.querySelectorAll(selector).length,0,kind+' saved/dragged position releases default reservation');
  }finally{f.close()}
 }
});
