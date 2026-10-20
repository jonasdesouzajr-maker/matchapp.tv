'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.resolve(__dirname,'../latest-news.js'),'utf8');
const start=source.indexOf('  function rail(items){');
const actualRail=source.slice(start,source.indexOf('\n  function installStyle()',start));
const settle=async()=>{await Promise.resolve();await Promise.resolve();};

function fixture({appReduced=false}={}){
 assert.ok(start>=0&&actualRail.endsWith('  }\n'),'isolate the actual News rail, leaving production API untouched');
 const dom=new JSDOM('<!doctype html><html'+(appReduced?' class="reduce-motion"':'')+'><body><details id="latest-news" open></details></body></html>',{url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;let time=0,id=0,io,osReduced=false,hidden=false;
 const timers=new Map(),moves=[],mediaEvents=new w.EventTarget();
 const media={get matches(){return osReduced;},addEventListener:mediaEvents.addEventListener.bind(mediaEvents),removeEventListener:mediaEvents.removeEventListener.bind(mediaEvents),addListener:callback=>mediaEvents.addEventListener('change',callback),removeListener:callback=>mediaEvents.removeEventListener('change',callback)};
 w.setTimeout=(callback,delay=0)=>{timers.set(++id,{at:time+delay,callback});return id;};w.clearTimeout=id=>timers.delete(id);w.requestAnimationFrame=()=>0;
 w.matchMedia=()=>media;Object.defineProperty(w.document,'hidden',{get:()=>hidden});
 w.IntersectionObserver=class{constructor(callback){io=callback;}observe(){}unobserve(){}disconnect(){}};
 w.HTMLElement.prototype.scrollTo=function(options){this.scrollLeft=options.left;moves.push({...options});};
 // Only source-card creation is stubbed. The entire production rotation and
 // event controller runs unchanged; no matching/account/network owner is run.
 w.eval('const AUTO_MS=4000,AUTO_FIRST_MS=2600; function card(item){const a=document.createElement("article"),link=document.createElement("a");a.className="ma-news-card";link.href="/news/"+item.id;link.textContent="Story "+item.id;a.append(link);a.getBoundingClientRect=()=>({width:160});return a;}\n'+actualRail+'\nwindow.__actualNewsRail=rail;');
 const rail=w.__actualNewsRail([{item:{id:'a'},scope:'local'},{item:{id:'b'},scope:'global'}]);w.document.getElementById('latest-news').append(rail);
 const track=rail.querySelector('.ma-news-track');Object.defineProperty(track,'scrollWidth',{get:()=>1000});Object.defineProperty(track,'clientWidth',{get:()=>300});
 const inView=value=>io([{isIntersecting:value,intersectionRatio:value?1:0}]);inView(true);
 const emit=type=>rail.dispatchEvent(new w.Event(type,{bubbles:true}));
 const advance=duration=>{const end=time+duration;let count=0;while(true){const task=[...timers].filter(([,value])=>value.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!task)break;assert.ok(++count<1000,'rotation timers stay bounded');timers.delete(task[0]);time=task[1].at;task[1].callback();}time=end;};
 return{w,rail,track,moves,emit,advance,inView,os(value,notify=true){osReduced=value;if(notify)mediaEvents.dispatchEvent(new w.Event('change'));},visibility(value){hidden=value;w.document.dispatchEvent(new w.Event('visibilitychange'));},close(){dom.window.close();}};
}

test('visible News rotates one card, while both arrows and keyboard keep their original destinations',t=>{
 const f=fixture();t.after(f.close);const {rail,track,w}=f,links=[...rail.querySelectorAll('a')],hrefs=links.map(node=>node.href);
 f.advance(2700);assert.equal(track.scrollLeft,168);assert.equal(f.moves.length,1);
 rail.querySelector('.ma-news-arrow-next').click();assert.equal(track.scrollLeft,336);rail.querySelector('.ma-news-arrow-prev').click();assert.equal(track.scrollLeft,168);
 rail.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.equal(track.scrollLeft,336);rail.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));assert.equal(track.scrollLeft,168);
 assert.deepEqual([...rail.querySelectorAll('a')],links);assert.deepEqual(links.map(node=>node.href),hrefs);
 track.scrollLeft=700;f.advance(4100);assert.equal(track.scrollLeft,0,'auto wraps only at the end');
});

test('a cancelled native touch resumes News after the normal idle delay',t=>{
 const f=fixture();t.after(f.close);f.emit('touchstart');f.advance(8000);assert.equal(f.moves.length,0,'an active touch holds rotation');f.emit('touchcancel');f.advance(2500);assert.equal(f.moves.length,0);f.advance(200);assert.equal(f.moves.length,1,'touchcancel releases the same pause as touchend');
});

test('News mouse, focus and touch pauses remain independent until every active hold ends',t=>{
 const f=fixture();t.after(f.close);const link=f.rail.querySelector('a');link.focus();f.emit('mouseenter');f.emit('mouseleave');f.advance(8000);assert.equal(f.moves.length,0,'mouseleave must preserve actual focus inside the rail');
 link.blur();f.advance(2700);assert.equal(f.moves.length,1,'leaving the last active hold resumes rotation');
 f.emit('mouseenter');f.emit('touchstart');f.emit('touchend');f.advance(8000);assert.equal(f.moves.length,1,'touchend must preserve desktop hover');f.emit('mouseleave');f.advance(2700);assert.equal(f.moves.length,2);
});

test('the real app reduced-motion setting cancels pending News movement and can resume it at runtime',async t=>{
 const f=fixture();t.after(f.close);const change=value=>{f.w.document.documentElement.classList.toggle('reduce-motion',value);f.w.document.dispatchEvent(new f.w.CustomEvent('matchapp:settingschanged',{detail:{key:'reduceMotion',value}}));};change(true);await settle();f.advance(10000);assert.equal(f.moves.length,0,'app preference suppresses movement even when OS motion is allowed');
 change(false);await settle();f.advance(2700);assert.equal(f.moves.length,1,'removing the app preference reschedules once');
});

test('an OS reduced-motion change is checked at execution as well as cancellation and resume events',t=>{
 const f=fixture();t.after(f.close);f.os(true,false);f.advance(2700);assert.equal(f.moves.length,0,'an already queued callback rechecks the current OS preference');f.os(false);f.advance(2700);assert.equal(f.moves.length,1);
 f.os(true);f.advance(10000);assert.equal(f.moves.length,1,'runtime OS preference cancels rotation');f.os(false);f.advance(2700);assert.equal(f.moves.length,2,'OS motion restoration resumes one timer');
});

test('hidden and offscreen News stop and resume only while both visibility requirements permit it',t=>{
 const f=fixture();t.after(f.close);f.visibility(true);f.advance(10000);assert.equal(f.moves.length,0);f.inView(false);f.visibility(false);f.advance(5000);assert.equal(f.moves.length,0,'returning to a visible tab cannot move an offscreen rail');f.inView(true);f.advance(2700);assert.equal(f.moves.length,1);
 f.inView(false);f.advance(10000);assert.equal(f.moves.length,1);f.visibility(true);f.inView(true);f.advance(5000);assert.equal(f.moves.length,1,'intersection callback cannot restart a hidden page');f.visibility(false);f.advance(2700);assert.equal(f.moves.length,2);
});
