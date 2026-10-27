'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'../patches/chat-resize-20261022.js'),'utf8');

const microtasks=()=>new Promise(resolve=>setImmediate(resolve));
async function scene(viewport){
 const dom=new JSDOM('<!doctype html><html><head></head><body><section id="ma-ambient-panel"><div class="ja-panel-head">Jonas</div></section></body></html>',{
  url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,panel=w.document.getElementById('ma-ambient-panel'),timers=new Map();
 if(viewport)w.visualViewport=Object.assign(new w.EventTarget(),viewport);
 let timerId=0,insets={top:11,right:7,bottom:17,left:5};
 w.matchMedia=()=>({matches:false});
 Object.defineProperty(w.document.documentElement,'clientWidth',{value:390,configurable:true});
 Object.defineProperty(w,'innerWidth',{value:390,configurable:true});
 Object.defineProperty(w,'innerHeight',{value:844,configurable:true});
 w.setTimeout=(fn,delay)=>{const id=++timerId;timers.set(id,{fn,delay});return id;};
 w.clearTimeout=id=>timers.delete(id);
 const computed=w.getComputedStyle.bind(w);
 w.getComputedStyle=element=>{
  const style=computed(element);
  if(element.style.position!=='fixed'||element.style.visibility!=='hidden')return style;
  return new Proxy(style,{get(target,key){
   const side={paddingTop:'top',paddingRight:'right',paddingBottom:'bottom',paddingLeft:'left'}[key];
   return side?insets[side]+'px':Reflect.get(target,key);
  }});
 };
 w.eval(source);await microtasks();
 async function drain(limit=8){
  let count=0;
  while(timers.size&&count<limit){
   const [id,entry]=[...timers].sort((a,b)=>a[1].delay-b[1].delay)[0];
   timers.delete(id);entry.fn();count++;await microtasks();
  }
  return count;
 }
 return {dom,w,panel,timers,drain,setInsets:next=>{insets=next;}};
}

test('an unrelated page update does not keep an open chat in a resize feedback loop',async()=>{
 const s=await scene();
 try{
  // Real pages insert posters/cards after chat opens. One such insertion
  // may schedule layout checks, but measuring must not create more work.
  s.w.document.body.appendChild(s.w.document.createElement('aside'));
  await microtasks();assert(s.timers.size>0,'the existing page observer should notice the update');
  const passes=await s.drain();
  assert.equal(s.timers.size,0,'measurement mutations must settle without scheduling themselves');
  assert(passes<=3,'one page change should cause only bounded layout work');
  assert.equal(s.panel.hidden,false,'settling layout must keep the conversation open');
 }finally{s.dom.window.close();}
});

test('safe-area values are freshly measured after viewport changes without replacing the probe',async()=>{
 const s=await scene();
 try{
  const probes=()=>[...s.w.document.body.children].filter(e=>e.style.position==='fixed'&&e.style.visibility==='hidden');
  const originalProbe=probes()[0];assert(originalProbe,'safe-area measurement must have a rendered probe');
  assert.equal(s.panel.style.left,'13px');assert.equal(s.panel.style.width,'362px');
  s.setInsets({top:23,right:11,bottom:41,left:9});
  s.w.dispatchEvent(new s.w.Event('resize'));await s.drain();
  assert.equal(s.panel.style.left,'17px');assert.equal(s.panel.style.width,'354px');
  assert.equal(parseFloat(s.panel.style.top)+parseFloat(s.panel.style.height),795,
   'the panel must still clear the updated bottom safe area');
  assert.deepEqual(probes(),[originalProbe],'viewport changes must reuse the same invisible measurement element');
  assert.equal(s.timers.size,0,'viewport updates must settle too');
 }finally{s.dom.window.close();}
});

test('a resized embedded conversation reveals its focused composer without moving unfocused history',async()=>{
 const s=await scene();
 try{
  const frame=s.w.document.createElement('iframe');s.panel.appendChild(frame);
  await microtasks();await s.drain();
  const d=frame.contentDocument,w=frame.contentWindow;
  const input=d.createElement('textarea');d.body.appendChild(input);
  let scrollY=0;const scrolls=[];
  Object.defineProperty(w,'innerHeight',{value:62,configurable:true});
  Object.defineProperty(w,'scrollY',{get:()=>scrollY,configurable:true});
  w.scrollTo=(x,y)=>{scrollY=y;scrolls.push({x,y});};
  input.getBoundingClientRect=()=>({top:110-scrollY,bottom:154-scrollY,height:44});
  input.focus();s.w.dispatchEvent(new s.w.Event('resize'));await s.drain();
  assert.equal(d.activeElement,input,'the keyboard owner must stay focused');
  assert(input.getBoundingClientRect().top>=0&&input.getBoundingClientRect().bottom<=w.innerHeight,
   'the complete input must remain visible inside the shortened frame');
  assert.equal(s.w.scrollY,0,'revealing the composer must not scroll the underlying page');
  input.blur();scrollY=17;const previousCalls=scrolls.length;
  s.w.dispatchEvent(new s.w.Event('resize'));await s.drain();
  assert.equal(scrollY,17,'unfocused conversation history retains its reading position');
  assert.equal(scrolls.length,previousCalls,'unfocused frames must not receive a scrolling command');
 }finally{s.dom.window.close();}
});

test('keyboard panning keeps the panel inside the visual viewport after scroll as well as resize',async()=>{
 const s=await scene({width:390,height:388,offsetTop:194,offsetLeft:0});
 try{
  const assertInside=()=>{
   const top=parseFloat(s.panel.style.top),bottom=top+parseFloat(s.panel.style.height);
   assert(top>=s.w.visualViewport.offsetTop+19,'panel top must follow the panned viewport and safe area');
   assert(bottom<=s.w.visualViewport.offsetTop+363,'panel bottom must clear the keyboard and safe area');
  };
  assertInside();
  s.w.visualViewport.offsetTop=270;
  s.w.visualViewport.dispatchEvent(new s.w.Event('scroll'));await s.drain();
  assertInside();assert.equal(s.timers.size,0,'keyboard pan handling must settle');
 }finally{s.dom.window.close();}
});
