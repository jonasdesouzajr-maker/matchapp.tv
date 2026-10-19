'use strict';
// QA-only init script. Retain real media observations before natural teardown;
// do not infer playback from a storage flag or the disappearance of an overlay.
function installIntroPlaybackEvidence(){
 const evidence=window.introPlaybackEvidence={frame:null,ends:[],errors:[],skip:null};
 window.introMediaEnds=evidence.ends;window.introMediaErrors=[];
 const isIntro=video=>video instanceof HTMLVideoElement&&video.matches('#matchapp-launch-intro video');
 const capture=event=>{
  const video=event.target;if(!isIntro(video))return;
  if(!evidence.frame&&video.readyState>=2&&video.currentTime>0){
   const rect=video.getBoundingClientRect();
   evidence.frame={width:rect.width,height:rect.height,screenWidth:innerWidth,screenHeight:innerHeight,
    encodedWidth:video.videoWidth,encodedHeight:video.videoHeight,fit:getComputedStyle(video).objectFit,muted:video.muted,duration:video.duration};
  }
  if(event.type==='ended')evidence.ends.push({trusted:event.isTrusted,ended:video.ended,currentTime:video.currentTime,duration:video.duration});
 };
 for(const event of ['loadeddata','playing','timeupdate','ended'])document.addEventListener(event,capture,true);
 document.addEventListener('error',event=>{
  if(!(event.target instanceof HTMLMediaElement))return;
  const error={code:event.target.error?.code,message:event.target.error?.message};window.introMediaErrors.push(error);
  if(isIntro(event.target))evidence.errors.push(error);
 },true);
 document.addEventListener('click',event=>{
  if(event.target instanceof Element&&event.target.closest('#matchapp-launch-intro button'))evidence.skip={trusted:event.isTrusted};
 },true);
}
module.exports={installIntroPlaybackEvidence};
