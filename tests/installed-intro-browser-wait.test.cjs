'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const {waitForIntroFrame}=require('../tools/installed-intro-browser-smoke.cjs');
const {installIntroPlaybackEvidence}=require('../tools/intro-playback-evidence.cjs');

// Exercise the actual browser predicates against DOM/media observations on a
// virtual clock. Synthetic unit events do not claim real video decoding.
function fixture(events=[],options={}){
 const w=new JSDOM('<body></body>',{url:'https://matchapp.tv/',runScripts:'outside-only'}).window;
 w.eval('('+installIntroPlaybackEvidence.toString()+')()');
 let clock=0,ready=!options.loading;const pending=events.slice().sort((a,b)=>a.at-b.at),waits=[];
 const actions={
  ready(){ready=true;},
  owner(){
   w.sessionStorage.setItem('matchapp-launch-intro','played');
   const overlay=w.document.createElement('div');overlay.id='matchapp-launch-intro';
   overlay.dataset.matchappIntroManaged='1';overlay.innerHTML='<video style="object-fit:cover"></video>';
   w.document.body.appendChild(overlay);
  },
  decoded(){
   const video=w.document.querySelector('video');
   Object.defineProperties(video,{readyState:{value:2},videoWidth:{value:1080},videoHeight:{value:1920},duration:{value:4.466}});
   video.muted=true;video.currentTime=.25;video.getBoundingClientRect=()=>({width:w.innerWidth,height:w.innerHeight});
   video.dispatchEvent(new w.Event('timeupdate'));
  },
  removed(){w.document.getElementById('matchapp-launch-intro')?.remove();},
  failed(){
   const video=w.document.querySelector('video');Object.defineProperty(video,'error',{value:{code:3,message:'decode failed'}});
   video.dispatchEvent(new w.Event('error'));actions.removed();
  }
 };
 const page={
  async waitForLoadState(state,{timeout}){
   assert.equal(state,'domcontentloaded');const deadline=clock+timeout;
   while(!ready){
    if(!pending.length||pending[0].at>deadline){clock=deadline;throw new Error('Document timeout '+timeout+'ms exceeded');}
    const event=pending.shift();clock=event.at;actions[event.action]();
   }
  },
  async waitForFunction(predicate,_argument,{timeout}){
   const deadline=clock+timeout;waits.push({startedAt:clock,timeout});
   while(!w.eval('('+predicate.toString()+')()')){
    if(!pending.length||pending[0].at>deadline){clock=deadline;throw new Error('Timeout '+timeout+'ms exceeded');}
    const event=pending.shift();clock=event.at;actions[event.action]();
   }
  },
  async evaluate(predicate){return JSON.parse(JSON.stringify(w.eval('('+predicate.toString()+')()')));}
 };
 return {page,actions,waits,elapsed:()=>clock,close:()=>w.close()};
}

test('slow deferred-script delivery does not consume the intro startup or preparation windows',async()=>{
 const f=fixture([{at:13000,action:'ready'},{at:14000,action:'owner'},{at:21000,action:'decoded'}],{loading:true});
 try{
  const frame=await waitForIntroFrame(f.page);assert.equal(frame.encodedWidth,1080);
  assert.equal(f.waits[0].startedAt,13000);assert.equal(f.waits[1].startedAt,14000);assert.equal(f.elapsed(),21000);
 }finally{f.close();}
});
test('a document that never finishes startup fails within its separate navigation budget',async()=>{
 const f=fixture([],{loading:true});try{
  await assert.rejects(waitForIntroFrame(f.page),/Document timeout 30000ms exceeded/);
  assert.equal(f.elapsed(),30000);assert.equal(f.waits.length,0);
 }finally{f.close();}
});

test('script startup and valid preparation after six seconds have separate bounded windows',async()=>{
 const f=fixture([{at:4000,action:'owner'},{at:11000,action:'decoded'}]);
 try{
  const frame=await waitForIntroFrame(f.page);
  assert.equal(frame.encodedWidth,1080);assert.equal(frame.encodedHeight,1920);
  assert.equal(f.elapsed(),11000,'a seven-second preparation remains inside the owner eight-second allowance');
  assert.equal(f.waits[1].startedAt,4000,'the preparation window begins after startup is observed');
 }finally{f.close();}
});

test('retained decoded playback survives an overlay removed before the first poll',async()=>{
 const f=fixture();try{
  f.actions.owner();f.actions.decoded();f.actions.removed();
  assert.equal((await waitForIntroFrame(f.page)).duration,4.466);
  assert.equal(f.elapsed(),0);
 }finally{f.close();}
});

test('the owner preparation deadline without a decoded frame remains an immediate failure',async()=>{
 const f=fixture([{at:1000,action:'owner'},{at:9000,action:'removed'}]);
 try{
  await assert.rejects(waitForIntroFrame(f.page),/without a decoded positive-time frame/);
  assert.equal(f.elapsed(),9000,'terminal teardown must fail without waiting out the reporting margin');
 }finally{f.close();}
});

test('a media error remains fatal even when its overlay has already been removed',async()=>{
 const f=fixture([{at:0,action:'owner'},{at:2000,action:'failed'}]);
 try{
  await assert.rejects(waitForIntroFrame(f.page),/intro media errors must fail/);
  assert.equal(f.elapsed(),2000);
 }finally{f.close();}
});

test('a played session marker without retained decoding never satisfies playback',async()=>{
 const f=fixture();try{
  f.actions.owner();f.actions.removed();
  await assert.rejects(waitForIntroFrame(f.page),/without a decoded positive-time frame/);
  assert.equal(f.elapsed(),0);
 }finally{f.close();}
});

test('missing startup cannot wait indefinitely',async()=>{
 const f=fixture();try{
  await assert.rejects(waitForIntroFrame(f.page),/Timeout 10000ms exceeded/);
  assert.equal(f.elapsed(),10000);assert.equal(f.waits.length,1);
 }finally{f.close();}
});

test('a stuck managed overlay cannot wait beyond preparation plus the reporting margin',async()=>{
 const f=fixture([{at:0,action:'owner'}]);try{
  await assert.rejects(waitForIntroFrame(f.page),/Timeout 9000ms exceeded/);
  assert.equal(f.elapsed(),9000);
 }finally{f.close();}
});
