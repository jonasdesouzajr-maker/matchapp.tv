'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const {installIntroPlaybackEvidence}=require('../tools/intro-playback-evidence.cjs');
function fixture(){
 const dom=new JSDOM('<div id="matchapp-launch-intro"><video style="object-fit:cover"></video><button><span>Skip</span></button></div>',{runScripts:'outside-only'}),w=dom.window,v=w.document.querySelector('video');
 w.eval('('+installIntroPlaybackEvidence.toString()+')()');v.getBoundingClientRect=()=>({width:w.innerWidth,height:w.innerHeight});
 Object.defineProperties(v,{readyState:{value:4,configurable:true},videoWidth:{value:1080},videoHeight:{value:1920},duration:{value:4.466},ended:{value:true}});v.muted=true;
 return {w,v,evidence:w.introPlaybackEvidence,event(type){v.dispatchEvent(new w.Event(type));},close(){w.close();}};
}
test('decoded frame geometry survives natural teardown before the browser polling callback runs',()=>{
 const f=fixture();try{
  f.v.currentTime=.2;f.event('timeupdate');f.v.currentTime=4.466;f.v.addEventListener('ended',()=>{f.v.removeAttribute('src');f.v.remove();});f.event('ended');
  assert.equal(f.w.document.querySelector('#matchapp-launch-intro video'),null,'the old live-element poll loses completed playback');
  assert.deepEqual(JSON.parse(JSON.stringify(f.evidence.frame)),{width:1024,height:768,screenWidth:1024,screenHeight:768,encodedWidth:1080,encodedHeight:1920,fit:'cover',muted:true,duration:4.466});
  assert.equal(f.evidence.ends.length,1);assert.equal(f.evidence.ends[0].currentTime,4.466);
  assert.equal(f.evidence.ends[0].trusted,false,'synthetic unit events must never masquerade as trusted media completion');
 }finally{f.close();}
});
test('metadata, an unrelated playing video and removal without a decoded frame cannot satisfy playback',()=>{
 const f=fixture();try{
  f.event('loadeddata');f.event('playing');const other=f.w.document.createElement('video');f.w.document.body.append(other);Object.defineProperty(other,'readyState',{value:4});other.currentTime=1;other.dispatchEvent(new f.w.Event('timeupdate'));f.v.remove();
  assert.equal(f.evidence.frame,null);assert.equal(f.evidence.ends.length,0);
 }finally{f.close();}
});
test('the retained frame requires the same positive playback time and decoded ready state as the original gate',()=>{
 const f=fixture();try{
  Object.defineProperty(f.v,'readyState',{value:1,configurable:true});f.v.currentTime=1;f.event('timeupdate');assert.equal(f.evidence.frame,null);
  Object.defineProperty(f.v,'readyState',{value:2,configurable:true});f.event('playing');assert.equal(f.evidence.frame.encodedWidth,1080);
 }finally{f.close();}
});
test('intro media failure remains visible when the application immediately removes its overlay',()=>{
 const f=fixture();try{
  f.v.currentTime=.1;f.event('timeupdate');Object.defineProperty(f.v,'error',{value:{code:3,message:'decode failed'}});f.v.addEventListener('error',()=>f.v.parentElement.remove());f.event('error');
  assert.equal(f.evidence.errors.length,1);assert.equal(f.evidence.errors[0].code,3);assert.equal(f.evidence.ends.length,0);assert.equal(f.w.introMediaErrors.length,1);
 }finally{f.close();}
});
test('only the actual intro Skip target is observed and synthetic clicks retain their untrusted status',()=>{
 const f=fixture();try{
  const other=f.w.document.createElement('button');f.w.document.body.append(other);other.click();assert.equal(f.evidence.skip,null);
  f.w.document.querySelector('#matchapp-launch-intro span').click();assert.equal(f.evidence.skip.trusted,false);assert.equal(f.evidence.ends.length,0);assert.equal(f.evidence.frame,null);
 }finally{f.close();}
});
test('unrelated media errors stay diagnostic without being attributed to the intro video',()=>{
 const f=fixture();try{
  const other=f.w.document.createElement('video');f.w.document.body.append(other);Object.defineProperty(other,'error',{value:{code:4,message:'unrelated source'}});other.dispatchEvent(new f.w.Event('error'));
  assert.equal(f.w.introMediaErrors.length,1);assert.equal(f.evidence.errors.length,0);
 }finally{f.close();}
});
