/* Original intro, once after a deliberate gesture; never overlap Jonas speech. */
(function(){
 'use strict';if(location.pathname.startsWith('/kids')||window.top!==window)return;
 var key='matchapp_intro_audio_session_v1';
 try{if(sessionStorage.getItem(key))return}catch(_){return}
 document.addEventListener('click',function(event){
  if(event.target.closest('button,input,textarea,a,#ma-jonas-home,#ma-ambient-jonas,#ma-ambient-panel'))return;
  if(Array.from(document.querySelectorAll('video')).some(function(video){return !video.paused})||window.speechSynthesis?.speaking)return;
  try{if(sessionStorage.getItem(key))return}catch(_){return}
  var audio=new Audio('/assets/brand/matchapp-intro-audio.mp3');audio.volume=.35;
  function stop(){audio.pause();document.removeEventListener('pointerdown',stop,true)}
  audio.addEventListener('ended',stop,{once:true});
  audio.play().then(function(){sessionStorage.setItem(key,'1');document.addEventListener('pointerdown',stop,true)}).catch(function(){audio.pause()});
 },{passive:true});
})();
