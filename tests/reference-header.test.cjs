'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');

const repo=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(repo,file),'utf8');
const saved='{"x":0.79,"y":0.66}';
const positionKeys=['matchapp-jonas-position-v2','matchapp-jonas-inline-position-v1','matchapp_jonas_ambient_position_v1'];
const headerPositionKey='matchapp-jonas-header-drag-v1';
const languages=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
const launcher='<div id="ma-jonas-home" style="position:fixed;left:200px;top:300px;transform:translate3d(8px,9px,0)">'+
 '<button type="button" id="ma-jonas-home-bubble" class="jh-bubble"><span class="jh-portrait"><img alt=""></span></button>'+
 '<section id="ma-jonas-home-panel" class="jh-popover" hidden role="dialog">'+
 '<div class="jh-header"><div class="jh-title"><small>Companion</small></div><button type="button" id="ma-jonas-home-close">Close</button></div>'+
 '<div class="jh-content"><p class="jh-greeting">Hello</p><p id="ma-jonas-home-status">Ready</p>'+
 '<form class="jh-form"><input id="ma-jonas-home-input"><button type="button" class="jh-send">Send</button></form>'+
 '<button type="button" id="ma-jonas-home-mic">Mic</button><div class="jh-suggestions"><a href="/discover.html">First</a><a href="/discover.html">Second</a></div>'+
 '<a class="jh-full" href="/discover.html">Full conversation</a><p class="jh-footnote">Jonas</p></div></section></div>';

function scene(route='/',options={}){
 const masthead=options.noHeader?'':'<header class="app-header"><a class="matchapp-brand-link" href="/">MatchApp Ai</a>'+
  '<button id="original-control" type="button">Original action</button><select id="original-language"><option value="en">English</option><option value="ar">العربية</option></select></header>';
 const dom=new JSDOM('<!doctype html><html lang="en" class="ma-reference"><head></head><body class="page-home ma-watch-focused">'+masthead+
  '<main><button id="original-filter" type="button">Original filter</button><div id="ma-ai-entry">'+launcher+'</div></main></body></html>',{
  url:'https://matchapp.tv'+route,runScripts:'outside-only',pretendToBeVisual:true
 });
 const w=dom.window;
 Object.defineProperty(w,'innerWidth',{configurable:true,value:390});
 Object.defineProperty(w,'innerHeight',{configurable:true,value:850});
 Object.defineProperty(w.document,'readyState',{configurable:true,get:()=> 'complete'});
 w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
 w.ResizeObserver=class{observe(){}disconnect(){}};
 w.HTMLElement.prototype.scrollIntoView=function(){};
 w.Range.prototype.getClientRects=function(){return[];};
 w.scrollTo=()=>{};
 const heights={header:88};
 w.HTMLElement.prototype.getBoundingClientRect=function(){
  const width=this.id==='ma-reference-header'?390:this.id==='ma-reference-header-slot'?80:this.id==='ma-jonas-home'||this.id==='ma-ambient-jonas'?64:44;
  const height=this.id==='ma-reference-header'?heights.header:width;
  const isLauncher=this.id==='ma-jonas-home'||this.id==='ma-ambient-jonas',left=isLauncher?parseFloat(this.style.left)||0:0,top=isLauncher?parseFloat(this.style.top)||0:0;
  return{left,top,right:left+width,bottom:top+height,x:left,y:top,width,height,toJSON(){return{left,top,right:left+width,bottom:top+height,x:left,y:top,width,height};}};
 };
 positionKeys.forEach(key=>w.localStorage.setItem(key,saved));
 w.localStorage.setItem('match_lang','en');
 w.localStorage.setItem('match_history',JSON.stringify([{title:'Saved title'}]));
 const calls={original:0,filter:0,pointerCapture:0};
 w.document.getElementById('original-control')?.addEventListener('click',()=>calls.original++);
 w.document.getElementById('original-filter').addEventListener('click',()=>calls.filter++);
 w.HTMLElement.prototype.setPointerCapture=function(){calls.pointerCapture++;};
 w.HTMLElement.prototype.releasePointerCapture=function(){};
 const start=()=>w.eval(read('patches/reference-header.js'));
 const close=()=>{w.dispatchEvent(new w.PageTransitionEvent('pagehide',{persisted:false}));dom.window.close();};
 return{dom,w,start,heights,calls,close};
}
const flush=w=>new Promise(resolve=>w.requestAnimationFrame(resolve));
function unchangedPositions(w){for(const key of positionKeys)assert.equal(w.localStorage.getItem(key),saved,key);}
function pointer(w,target,type,x,y){const event=new w.MouseEvent(type,{bubbles:true,button:0,buttons:type==='pointerup'||type==='pointercancel'?0:1,clientX:x,clientY:y});Object.defineProperty(event,'pointerId',{value:7});Object.defineProperty(event,'pointerType',{value:'mouse'});target.dispatchEvent(event);}
function legacyHeaderOwner(w){
 const header=w.document.createElement('header');header.id='ma-reference-header';
 const slot=w.document.createElement('div');slot.id='ma-reference-header-slot';header.appendChild(slot);w.document.body.prepend(header);let active=null;
 const claim=root=>{if(!root)return false;active=root;root.dataset.jonasPlacement='header';['left','right','top','bottom','position','transform'].forEach(name=>root.style.removeProperty(name));if(root.parentElement!==slot)slot.appendChild(root);return true;};
 w.MatchAppReferenceHeader={claim,owns:root=>root===active,mount(){},measure(){}};
 w.document.documentElement.dataset.maJonasHeader='active';claim(w.document.getElementById('ma-jonas-home'));
 return{slot};
}

test('shared header moves the original controls and launcher once, preserving handlers and data',t=>{
 const f=scene();t.after(f.close);
 const {w}=f,original=w.document.getElementById('original-control'),language=w.document.getElementById('original-language'),root=w.document.getElementById('ma-jonas-home');
 language.value='ar';const history=w.localStorage.getItem('match_history');
 f.start();const header=w.document.getElementById('ma-reference-header'),slot=w.document.getElementById('ma-reference-header-slot');
 assert.equal(w.document.querySelector('header header'),null,'the original semantic masthead must not be nested inside another header');
 assert.equal(w.document.documentElement.dataset.maJonasHeader,'active');
 assert.equal(slot.querySelector('#ma-jonas-home'),root);assert.ok(w.MatchAppReferenceHeader.owns(root));
 assert.equal(header.querySelector('#original-control'),original);assert.equal(header.querySelector('#original-language'),language);assert.equal(language.value,'ar');
 assert.equal(root.style.left,'');assert.equal(root.style.top,'');assert.equal(root.style.transform,'');assert.equal(root.style.position,'');
 assert.equal(root.dataset.jonasPlacement,'header');
 original.click();w.document.getElementById('original-filter').click();assert.equal(f.calls.original,1);assert.equal(f.calls.filter,1);
 f.start();w.MatchAppReferenceHeader.mount();
 assert.equal(w.document.querySelectorAll('#ma-reference-header').length,1);assert.equal(w.document.querySelectorAll('#ma-reference-header-space').length,1);assert.equal(slot.querySelector('#ma-jonas-home'),root);
 unchangedPositions(w);assert.equal(w.localStorage.getItem('match_history'),history);
});

test('late native launcher takeover clears an obsolete dock slot and keeps one selected owner',async t=>{
 const f=scene();t.after(f.close);const {w}=f;
 f.start();const home=w.document.getElementById('ma-jonas-home');
 const dock=w.document.createElement('nav');dock.className='ma-cinema-dock';dock.setAttribute('data-jonas-reserved','');dock.innerHTML='<span class="ma-jonas-dock-slot"></span>';w.document.body.appendChild(dock);
 const ambient=w.document.createElement('div');ambient.id='ma-ambient-jonas';ambient.style.cssText='position:fixed;left:150px;top:250px;transform:translate3d(4px,5px,0)';w.document.body.appendChild(ambient);
 w.document.dispatchEvent(new w.Event('matchapp:jonas-mounted'));await flush(w);
 assert.equal(ambient.parentElement.id,'ma-reference-header-slot');assert.ok(w.MatchAppReferenceHeader.owns(ambient));assert.equal(w.MatchAppReferenceHeader.owns(home),false);
 assert.equal(w.document.querySelector('.ma-jonas-dock-slot'),null);assert.equal(dock.hasAttribute('data-jonas-reserved'),false);
 assert.equal(ambient.style.position,'');assert.equal(ambient.style.left,'');assert.equal(ambient.style.top,'');assert.equal(ambient.style.transform,'');unchangedPositions(w);
});

test('flow reservation follows the measured header height after a resize',async t=>{
 const f=scene();t.after(f.close);const {w}=f;f.start();
 f.heights.header=93.25;w.MatchAppReferenceHeader.measure();await flush(w);
 assert.equal(w.document.getElementById('ma-reference-header-space').style.height,'94px');assert.equal(w.document.documentElement.style.getPropertyValue('--ma-reference-header-height'),'94px');
 f.heights.header=141.8;w.dispatchEvent(new w.Event('resize'));await flush(w);
 assert.equal(w.document.getElementById('ma-reference-header-space').style.height,'142px');assert.equal(w.document.documentElement.style.getPropertyValue('--ma-reference-header-height'),'142px');
});

test('header tools use the explicitly selected language in all fourteen locales',t=>{
 const f=scene();t.after(f.close);const {w}=f;f.start();
 const summary=w.document.querySelector('.ma-reference-header-tools>summary');assert.ok(summary);
 const labels=new Set();
 for(const lang of languages){w.localStorage.setItem('match_lang',lang);w.MATCH_LANG=lang;w.document.documentElement.lang=lang;w.document.dispatchEvent(new w.CustomEvent('matchapp:langchange',{detail:{lang}}));const label=summary.getAttribute('aria-label');assert.ok(label?.trim(),lang);assert.equal(summary.title,label);labels.add(label);}
 assert.equal(labels.size,14);unchangedPositions(w);
});

test('fallback branding leaves the existing matcher and filter nodes in place',t=>{
 const f=scene('/',{noHeader:true});t.after(f.close);const {w}=f,filter=w.document.getElementById('original-filter'),parent=filter.parentElement;f.start();
 const brand=w.document.querySelector('#ma-reference-header .ma-reference-header-brand');assert.equal(brand.getAttribute('href'),'/');assert.equal(brand.textContent,'MatchApp Ai');assert.equal(filter.parentElement,parent);filter.click();assert.equal(f.calls.filter,1);unchangedPositions(w);
});

test('a generic brand-only header yields its exact generated Search action to the fallback once',async t=>{
 const f=scene('/contact.html',{noHeader:true});t.after(f.close);const {w}=f;
 const legacy=w.document.createElement('header');legacy.innerHTML='\n <a class="matchapp-brand-link" href="/"><img class="matchapp-wordmark" alt="MatchApp Ai"></a>\n <a class="ma-cinema-search" data-cinema-icon-only="true" data-cinema-copy="search" href="/discover.html?focus=start">Search</a>\n';
 w.document.body.prepend(legacy);const brand=legacy.firstElementChild,search=legacy.lastElementChild;let calls=0;search.addEventListener('click',event=>{event.preventDefault();calls++;});
 f.start();const fallback=w.document.querySelector('.ma-reference-header-fallback');
 assert.equal(search.parentElement,fallback);assert.equal(search.getAttribute('href'),'/discover.html?focus=start');assert.equal(brand.parentElement,legacy);assert.equal(legacy.getAttribute('data-ma-reference-brand-only'),'true');
 search.click();assert.equal(calls,1);w.MatchAppReferenceHeader.mount();await flush(w);
 assert.equal(fallback.querySelectorAll('.ma-cinema-search').length,1);assert.equal(legacy.children.length,1);assert.equal(legacy.firstElementChild,brand);unchangedPositions(w);
});

test('generic headers with authored text, navigation or unknown controls retain their exact children',t=>{
 const f=scene('/contact.html',{noHeader:true});t.after(f.close);const {w}=f,headers=[];
 for(const extra of ['Keep this authored text','<button type="button">Original action</button>','<nav><a href="/privacy.html">Privacy</a></nav>']){
  const header=w.document.createElement('header');header.innerHTML='<a class="matchapp-brand-link" href="/"><img class="matchapp-wordmark"></a><a class="ma-cinema-search" data-cinema-icon-only="true" data-cinema-copy="search" href="/discover.html?focus=start">Search</a>'+extra;w.document.body.prepend(header);headers.push({header,nodes:[...header.childNodes]});
 }
 f.start();for(const {header,nodes}of headers){assert.deepEqual([...header.childNodes],nodes);assert.equal(header.hasAttribute('data-ma-reference-brand-only'),false);assert.equal(header.querySelector('.ma-cinema-search').parentElement,header);}unchangedPositions(w);
});

test('late generated Search stays live while a later unknown control restores its legacy header',async t=>{
 const f=scene('/contact.html',{noHeader:true});t.after(f.close);const {w}=f;
 const legacy=w.document.createElement('header');legacy.innerHTML='<a class="matchapp-brand-link" href="/"><img class="matchapp-wordmark"></a>';w.document.body.prepend(legacy);f.start();assert.equal(legacy.getAttribute('data-ma-reference-brand-only'),'true');
 const search=w.document.createElement('a');search.className='ma-cinema-search';search.dataset.cinemaIconOnly='true';search.dataset.cinemaCopy='search';search.href='/discover.html?focus=start';let calls=0;search.addEventListener('click',event=>{event.preventDefault();calls++;});legacy.appendChild(search);await flush(w);
 assert.equal(search.parentElement,w.document.querySelector('.ma-reference-header-fallback'));search.click();assert.equal(calls,1);
 const button=w.document.createElement('button');button.textContent='Late original action';legacy.appendChild(button);await flush(w);assert.equal(legacy.hasAttribute('data-ma-reference-brand-only'),false);assert.equal(button.parentElement,legacy);unchangedPositions(w);
});

test('a late canonical masthead replaces only the fallback while preserving its original buttons',async t=>{
 const f=scene('/',{noHeader:true});t.after(f.close);const {w}=f;f.start();
 const header=w.document.getElementById('ma-reference-header'),slot=w.document.getElementById('ma-reference-header-slot'),root=w.document.getElementById('ma-jonas-home');
 assert.ok(header.querySelector('.ma-reference-header-fallback'));
 const canonical=w.document.createElement('header');canonical.className='app-header';
 const brand=w.document.createElement('a');brand.className='matchapp-brand-link';brand.href='/';brand.textContent='MatchApp Ai';
 const button=w.document.createElement('button');button.type='button';button.id='late-original-control';button.textContent='Late original action';let calls=0;button.addEventListener('click',()=>calls++);
 canonical.append(brand,button);w.document.body.appendChild(canonical);await flush(w);
 assert.equal(w.document.querySelectorAll('#ma-reference-header').length,1);assert.equal(header.querySelector('header.app-header'),canonical);assert.equal(header.querySelector('#late-original-control'),button);assert.equal(header.querySelector('.ma-reference-header-fallback'),null);
 button.click();assert.equal(calls,1);assert.equal(root.parentElement,slot);assert.ok(w.MatchAppReferenceHeader.owns(root));unchangedPositions(w);
});

test('the single shared adapter starts in the header, saves intentional dragging separately and returns to its slot',async t=>{
 const f=scene();t.after(f.close);const {w}=f;f.start();
 const root=w.document.getElementById('ma-jonas-home'),bubble=w.document.getElementById('ma-jonas-home-bubble'),slot=w.document.getElementById('ma-reference-header-slot'),back=slot.querySelector('.ma-reference-header-return');
 assert.equal(root.parentElement,slot);assert.equal(w.localStorage.getItem(headerPositionKey),null);assert.equal(back.hidden,true);assert.match(bubble.getAttribute('aria-keyshortcuts'),/Alt\+Home/);
 pointer(w,bubble,'pointerdown',32,32);pointer(w,w,'pointermove',200,350);pointer(w,w,'pointerup',200,350);await flush(w);
 assert.equal(root.parentElement,w.document.body);assert.equal(root.dataset.jonasPlacement,'dragged');assert.equal(root.style.position,'fixed');assert.ok(w.MatchAppReferenceHeader.owns(root));assert.equal(back.hidden,false);
 const position=JSON.parse(w.localStorage.getItem(headerPositionKey));assert.ok(Number.isFinite(position.x)&&position.x>=0&&position.x<=1);assert.ok(Number.isFinite(position.y)&&position.y>=0&&position.y<=1);unchangedPositions(w);
 const before={left:root.style.left,top:root.style.top};w.MatchAppReferenceHeader.claim(root);assert.deepEqual({left:root.style.left,top:root.style.top},before,'legacy owner claims cannot cancel the intentional placement');
 back.click();await flush(w);assert.equal(root.parentElement,slot);assert.equal(root.dataset.jonasPlacement,'header');assert.equal(root.style.left,'');assert.equal(root.style.top,'');assert.equal(w.localStorage.getItem(headerPositionKey),null);assert.equal(back.hidden,true);unchangedPositions(w);
});

test('the shared adapter restores its own saved point and supports keyboard movement and return',async t=>{
 const f=scene();t.after(f.close);const {w}=f;w.localStorage.setItem(headerPositionKey,'{"x":0.5,"y":0.4}');f.start();
 const root=w.document.getElementById('ma-jonas-home'),bubble=w.document.getElementById('ma-jonas-home-bubble');
 assert.equal(root.parentElement,w.document.body);assert.equal(root.dataset.jonasPlacement,'dragged');assert.equal(parseFloat(root.style.left),163);assert.equal(parseFloat(root.style.top),316.8);unchangedPositions(w);
 const before=parseFloat(root.style.left);bubble.dispatchEvent(new w.KeyboardEvent('keydown',{bubbles:true,altKey:true,key:'ArrowRight'}));assert.equal(parseFloat(root.style.left),before+16);assert.ok(w.localStorage.getItem(headerPositionKey));
 bubble.dispatchEvent(new w.KeyboardEvent('keydown',{bubbles:true,altKey:true,key:'Home'}));await flush(w);assert.equal(root.parentElement.id,'ma-reference-header-slot');assert.equal(w.localStorage.getItem(headerPositionKey),null);unchangedPositions(w);
});

test('the original web owner leaves dragging to the shared adapter and keeps its conversation handlers',async t=>{
 const f=scene();t.after(f.close);const {w}=f;legacyHeaderOwner(w);w.eval(read('jonas/floating-home-20261010-v3.js'));await flush(w);
 const root=w.document.getElementById('ma-jonas-home'),bubble=w.document.getElementById('ma-jonas-home-bubble'),panel=w.document.getElementById('ma-jonas-home-panel');
 assert.equal(root.parentElement.id,'ma-reference-header-slot');
 pointer(w,bubble,'pointerdown',32,32);pointer(w,w,'pointermove',200,350);pointer(w,w,'pointerup',200,350);await flush(w);
 assert.equal(f.calls.pointerCapture,0);assert.equal(root.style.left,'');assert.equal(root.style.top,'');assert.equal(root.parentElement.id,'ma-reference-header-slot');unchangedPositions(w);
 bubble.click();assert.equal(panel.hidden,false);assert.ok(w.MatchAppReferenceHeader.owns(root));assert.equal(w.document.getElementById('ma-jonas-home-panel'),panel);
 w.document.getElementById('ma-jonas-home-close').click();await flush(w);
 assert.equal(panel.hidden,true);assert.equal(root.parentElement.id,'ma-reference-header-slot');assert.ok(w.MatchAppReferenceHeader.owns(root));unchangedPositions(w);
});

test('the first header-owned web conversation uses the current viewport after a resize',async t=>{
 const f=scene();t.after(f.close);const {w}=f;legacyHeaderOwner(w);w.eval(read('jonas/floating-home-20261010-v3.js'));await flush(w);
 Object.defineProperty(w,'innerWidth',{configurable:true,value:320});Object.defineProperty(w,'innerHeight',{configurable:true,value:640});
 const root=w.document.getElementById('ma-jonas-home'),panel=w.document.getElementById('ma-jonas-home-panel');w.document.getElementById('ma-jonas-home-bubble').click();
 assert.equal(panel.hidden,false);assert.equal(root.style.getPropertyValue('--ja-view-width'),'320px');assert.equal(root.style.getPropertyValue('--ja-view-height'),'640px');
 w.document.getElementById('ma-jonas-home-close').click();assert.equal(panel.hidden,true);assert.equal(root.style.getPropertyValue('--ja-view-width'),'');assert.equal(root.style.getPropertyValue('--ja-view-height'),'');unchangedPositions(w);
});

test('the native owner leaves dragging to the shared adapter after header takeover',async t=>{
 const f=scene();t.after(f.close);const {w}=f;legacyHeaderOwner(w);w.__MATCHAPP_AMBIENT_QA__=true;w.eval(read('jonas/android-ambient-assistant-20261011.js'));await flush(w);
 const root=w.document.getElementById('ma-ambient-jonas'),bubble=root.querySelector('.ja-bubble');assert.ok(w.MatchAppAmbientJonas);assert.equal(root.parentElement.id,'ma-reference-header-slot');
 pointer(w,bubble,'pointerdown',32,32);pointer(w,bubble,'pointermove',200,350);pointer(w,bubble,'pointerup',200,350);await flush(w);
 assert.equal(f.calls.pointerCapture,0);assert.equal(root.style.left,'');assert.equal(root.style.top,'');assert.equal(root.style.transform,'');assert.ok(w.MatchAppReferenceHeader.owns(root));unchangedPositions(w);
 w.dispatchEvent(new w.Event('resize'));await flush(w);assert.equal(root.style.left,'');assert.equal(root.style.top,'');unchangedPositions(w);
});

test('isolated Kids, private and authentication routes receive no adult shared header',t=>{
 for(const route of['/kids/','/private-voice/','/oauth/consent.html','/android-studio/','/callback.html','/confirm.html']){const f=scene(route);t.after(f.close);f.start();assert.equal(f.w.MatchAppReferenceHeader,undefined,route);assert.equal(f.w.document.getElementById('ma-reference-header'),null,route);}
});
