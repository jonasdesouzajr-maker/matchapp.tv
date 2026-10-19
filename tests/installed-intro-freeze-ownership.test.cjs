'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=process.env.MATCHAPP_TEST_SOURCE_ROOT||path.resolve(__dirname,'..');
const intro=fs.readFileSync(path.join(root,'installed-app-intro.js'),'utf8');
const guard=fs.readFileSync(path.join(root,'freeze-guard.js'),'utf8');
function fixture({reject=false}={}){
 const w=new JSDOM('<html><body style="pointer-events:none"><main>Home</main><div id="matchapp-update-overlay"></div></body></html>',{
  url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true
 }).window;
 Object.defineProperty(w.navigator,'userAgent',{value:'Android Chrome'});w.matchMedia=()=>({matches:true});
 const scheduled=[],timers=new Map();let next=0,paused=0,loaded=0;
 w.setTimeout=(fn,delay)=>{const id=++next,record={id,delay,fn,marker:w.document.querySelector('#matchapp-launch-intro')?.dataset.matchappIntroManaged};scheduled.push(record);timers.set(id,record);return id;};
 w.clearTimeout=id=>timers.delete(id);w.requestAnimationFrame=fn=>{fn();return 1;};
 w.HTMLMediaElement.prototype.canPlayType=()=>'';
 w.HTMLMediaElement.prototype.play=()=>reject?Promise.reject(Error('autoplay unavailable')):Promise.resolve();
 w.HTMLMediaElement.prototype.pause=()=>{paused++;};w.HTMLMediaElement.prototype.load=()=>{loaded++;};
 w.eval(intro);const overlay=w.document.getElementById('matchapp-launch-intro'),video=overlay.querySelector('video');
 Object.defineProperty(video,'duration',{value:4.466,configurable:true});const startup=scheduled[0];
 w.eval(guard);const guardTimer=scheduled[1];
 return {w,overlay,video,startup,guardTimer,scheduled,timers,
  fire:record=>{assert.ok(timers.has(record.id),'timer must still be armed');timers.delete(record.id);record.fn();},
  ready:()=>w.document.dispatchEvent(new w.Event('DOMContentLoaded')),
  pageshow:()=>w.dispatchEvent(new w.Event('pageshow')),
  present:()=>w.document.getElementById('matchapp-launch-intro'),
  resources:()=>({paused,loaded}),close:()=>w.close()};
}
test('combined startup marks ownership only after its preparation deadline is armed',()=>{
 const f=fixture();try{
  assert.equal(f.startup.delay,8000);assert.equal(f.startup.marker,undefined);
  assert.equal(f.overlay.dataset.matchappIntroManaged,'1');assert.ok(f.timers.has(f.startup.id));
 }finally{f.close();}
});
test('pageshow and the generic four-second release preserve a preparing intro but still release Home and update UI',()=>{
 const f=fixture();try{
  f.w.__matchappMatchPhase='searching';f.w.document.body.classList.add('match-searching');
  f.pageshow();assert.equal(f.present(),f.overlay);assert.equal(f.w.document.getElementById('matchapp-update-overlay'),null);
  assert.equal(f.w.document.body.style.pointerEvents,'');assert.ok(f.w.document.body.classList.contains('match-searching'));
  f.ready();f.fire(f.scheduled.find(timer=>timer.delay===4000));assert.equal(f.present(),f.overlay);
  f.fire(f.startup);assert.equal(f.present(),null);assert.deepEqual(f.resources(),{paused:1,loaded:1});
 }finally{f.close();}
});
test('playing retains its own duration-aware deadline across every generic release',()=>{
 const f=fixture();try{
  f.video.dispatchEvent(new f.w.Event('playing'));assert.equal(f.timers.has(f.startup.id),false);
  const playback=f.scheduled.find(timer=>timer.delay===9466);assert.ok(playback);
  f.pageshow();f.ready();f.fire(f.scheduled.find(timer=>timer.delay===4000));f.fire(f.guardTimer);
  assert.equal(f.present(),f.overlay);assert.ok(f.timers.has(playback.id));
  assert.equal(f.w.localStorage.getItem('matchapp-launch-intro-seen-v1'),'true');
  f.fire(playback);assert.equal(f.present(),null);assert.deepEqual(f.resources(),{paused:1,loaded:1});
 }finally{f.close();}
});
test('managed intro keeps its existing end, error, Skip, pagehide, visibility and autoplay-rejection cleanup',async t=>{
 for(const action of ['ended','error','skip','pagehide','hidden','reject'])await t.test(action,async()=>{
  const f=fixture({reject:action==='reject'});try{
   f.pageshow();assert.equal(f.present(),f.overlay);
   if(action==='skip')f.overlay.querySelector('button').click();
   else if(action==='pagehide')f.w.dispatchEvent(new f.w.Event('pagehide'));
   else if(action==='hidden'){Object.defineProperty(f.w.document,'hidden',{value:true});f.w.document.dispatchEvent(new f.w.Event('visibilitychange'));}
   else if(action==='reject')await Promise.resolve();
   else f.video.dispatchEvent(new f.w.Event(action));
   assert.equal(f.present(),null);assert.deepEqual(f.resources(),{paused:1,loaded:1});
   f.pageshow();assert.deepEqual(f.resources(),{paused:1,loaded:1},'cleanup stays idempotent');
  }finally{await Promise.resolve();f.close();}
 });
});
test('generic releases still remove unmanaged orphan intros and preserve searching state only while searching',()=>{
 for(const phase of ['idle','searching']){
  const w=new JSDOM('<body style="pointer-events:none" class="match-searching"><div id="matchapp-launch-intro"></div><div id="matchapp-update-overlay"></div></body>',{
   url:'https://matchapp.tv/',runScripts:'outside-only'
  }).window;
  try{w.setTimeout=()=>1;w.__matchappMatchPhase=phase;w.eval(guard);w.dispatchEvent(new w.Event('pageshow'));
   assert.equal(w.document.getElementById('matchapp-launch-intro'),null);assert.equal(w.document.getElementById('matchapp-update-overlay'),null);
   assert.equal(w.document.body.style.pointerEvents,'');assert.equal(w.document.body.classList.contains('match-searching'),phase==='searching');
  }finally{w.close();}
 }
});
