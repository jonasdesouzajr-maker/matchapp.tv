'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const read=file=>fs.readFileSync(path.resolve(__dirname,'..',file),'utf8');

function fixture({osReduced=false}={}){
 const dom=new JSDOM('<!doctype html><html class="ma-reference"><head></head><body class="page-home"><section id="trending-rail"><div id="marquee-viewport"><div id="marquee-track"><div class="marquee-item" data-loop-copy="0"><img data-title="Original title" alt="Original title"></div><div class="marquee-item" data-loop-copy="1" aria-hidden="true"><img data-title="Original title" alt="Original title"></div></div></div></section></body></html>',{url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;Object.defineProperty(w.document,'readyState',{configurable:true,get:()=> 'complete'});
 let clock=0,nextId=0;const frames=new Map(),timers=new Map(),mediaEvents=new w.EventTarget();
 Object.defineProperty(w.performance,'now',{value:()=>clock});
 w.requestAnimationFrame=callback=>{frames.set(++nextId,callback);return nextId;};w.cancelAnimationFrame=id=>frames.delete(id);
 w.setTimeout=(callback,delay)=>{timers.set(++nextId,{callback,delay});return nextId;};w.clearTimeout=id=>timers.delete(id);
 const motion={get matches(){return osReduced;},addEventListener:mediaEvents.addEventListener.bind(mediaEvents),removeEventListener:mediaEvents.removeEventListener.bind(mediaEvents)};
 w.matchMedia=query=>query.includes('prefers-reduced-motion')?motion:{matches:!query.includes('max-width'),addEventListener(){},removeEventListener(){}};
 w.IntersectionObserver=class{observe(){}disconnect(){}};
 const viewport=w.document.getElementById('marquee-viewport'),track=w.document.getElementById('marquee-track');
 Object.defineProperty(viewport,'scrollWidth',{get:()=>1800});Object.defineProperty(viewport,'clientWidth',{get:()=>300});
 Object.defineProperty(track.firstElementChild,'offsetLeft',{get:()=>0});Object.defineProperty(track.lastElementChild,'offsetLeft',{get:()=>900});
 track.firstElementChild.getBoundingClientRect=()=>({width:140});
 // The real local Settings API emits the same production event while sync:false
 // guarantees no account lookup/write participates in this presentation test.
 w.eval(read('settings.js'));w.eval(read('patches/top-titles-draft.js'));
 const controller=w.MatchTopTitlesDraft.mount(viewport);
 const frame=()=>{clock+=16;const pending=[...frames];frames.clear();for(const [,callback]of pending)callback(clock);};
 return{w,viewport,controller,frames,frame,os(value){osReduced=value;mediaEvents.dispatchEvent(new w.Event('change'));},set:(key,value)=>w.MatchSettings.set(key,value,{sync:false}),close:()=>dom.window.close()};
}

test('actual Settings reduceMotion API stops Top Titles and restores one physical-left frame',t=>{
 const f=fixture();t.after(f.close);assert.equal(f.frames.size,1);f.frame();const initial=f.viewport.scrollLeft;
 f.set('reduceMotion',true);assert.equal(f.controller.snapshot().reduced,true);assert.equal(f.frames.size,0);f.frame();assert.equal(f.viewport.scrollLeft,initial,'reduced motion cannot drift');
 f.set('reduceMotion',false);assert.equal(f.controller.snapshot().reduced,false);assert.equal(f.frames.size,1,'the original settings event resumes exactly one owner');
 const before=f.viewport.scrollLeft;f.frame();assert.ok(f.viewport.scrollLeft>before,'actual poster scroller moves physically left');assert.equal(f.controller.snapshot().physicalDirection,'left');assert.equal(f.frames.size,1,'one successor frame remains scheduled');assert.equal(f.w.MatchTopTitlesDraft.mount(f.viewport),f.controller,'settings changes retain the same controller');
});

test('unrelated Settings changes do not cancel or restart the Top Titles frame',t=>{
 const f=fixture();t.after(f.close);const ids=[...f.frames.keys()];f.set('fontScale',1.1);assert.deepEqual([...f.frames.keys()],ids,'font preference does not reset rotation timing');
 f.set('compactCards',true);assert.deepEqual([...f.frames.keys()],ids,'compact preference does not acquire motion ownership');f.frame();assert.equal(f.frames.size,1);
});

test('restoring app motion remains paused under OS reduced motion until its own live query changes',t=>{
 const f=fixture({osReduced:true});t.after(f.close);assert.equal(f.frames.size,0);const position=f.viewport.scrollLeft;
 f.set('reduceMotion',true);f.set('reduceMotion',false);assert.equal(f.controller.snapshot().reduced,true);assert.equal(f.frames.size,0);f.frame();assert.equal(f.viewport.scrollLeft,position);
 f.os(false);assert.equal(f.frames.size,1);f.frame();assert.ok(f.viewport.scrollLeft>position);f.os(true);assert.equal(f.frames.size,0,'OS restoration cancels the active successor frame');
});

test('side arrows step the same row backward and forward, then left autoplay stays the owner',t=>{
 const f=fixture();t.after(f.close);
 assert.equal(f.controller.snapshot().arrows,2,'both side arrows are available from 800px');
 assert.equal(f.controller.snapshot().physicalDirection,'left');
 assert.ok(f.controller.snapshot().speed>=32&&f.controller.snapshot().speed<=48,'glide stays slow enough to read a title');
 f.frame();
 const buttons=[...f.w.document.querySelectorAll('[data-top-title-step]')];
 const back=buttons.find(button=>button.dataset.topTitleStep==='-1');
 const next=buttons.find(button=>button.dataset.topTitleStep==='1');
 const moves=[];
 f.viewport.scrollBy=options=>{moves.push(options.left);f.viewport.scrollLeft+=options.left;};
 const before=f.viewport.scrollLeft;
 next.click();assert.ok(moves[0]>0&&f.viewport.scrollLeft>before,'next arrow advances the posters');
 back.click();assert.ok(moves[1]<0&&f.viewport.scrollLeft<f.viewport.scrollLeft-moves[1],'previous arrow returns along the same row');
 assert.equal(f.viewport.dataset.topTitlesOwner,'draft-native-right');
 assert.equal(f.w.MatchTopTitlesDraft.mount(f.viewport),f.controller,'arrow use does not start a second owner');
});
