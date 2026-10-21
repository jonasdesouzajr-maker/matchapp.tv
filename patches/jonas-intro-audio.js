/* Original intro, once after a deliberate gesture; never overlap Jonas speech. */
(function(){
 'use strict';if(location.pathname.startsWith('/kids')||window.top!==window)return;
 // Android owns its one-time intro at package launch. Website clicks must never
 // re-arm it, including before the native DOM injection has completed.
 if(/MatchApp(?:TV|Ai)Android\//i.test(navigator.userAgent||'')||window.MATCHAPP_ANDROID||window.MatchAppNativeStartup)return;
 var key='matchapp_intro_audio_session_v1';
 var pending=false;
 try{if(sessionStorage.getItem(key))return}catch(_){return}
 document.addEventListener('click',function(event){
  if(event.target.closest('button,input,textarea,a,#ma-jonas-home,#ma-ambient-jonas,#ma-ambient-panel'))return;
  if(Array.from(document.querySelectorAll('video')).some(function(video){return !video.paused})||window.speechSynthesis?.speaking)return;
  try{if(sessionStorage.getItem(key))return}catch(_){return}
  if(pending)return;pending=true;
  var audio=new Audio('/assets/brand/matchapp-intro-audio.mp3');audio.volume=.35;
  function stop(){audio.pause();document.removeEventListener('pointerdown',stop,true)}
  audio.addEventListener('ended',stop,{once:true});
  audio.play().then(function(){sessionStorage.setItem(key,'1');document.addEventListener('pointerdown',stop,true)}).catch(function(){audio.pause();pending=false});
 },{passive:true});
})();
