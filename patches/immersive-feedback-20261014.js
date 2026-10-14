/* MatchApp Ai immersive feedback (adult pages only).
   One opt-in-sound-aware cue per deliberate action; no loops, timers or startup audio. */
(function(){
 'use strict';
 if(/^\/kids(?:\/|$)/.test(location.pathname)||document.body?.classList.contains('page-kids'))return;
 var soundTime=0,lastHaptic=0,ctx=null,ready=false;
 function allowed(){
  try{return localStorage.getItem('match_soundEnabled')!=='false'}catch(_){return true}
 }
 function haptics(){
  try{return localStorage.getItem('match_hapticsEnabled')!=='false'
   &&!matchMedia('(prefers-reduced-motion: reduce)').matches}catch(_){return false}
 }
 function vibrate(pattern){
  if(!haptics()||document.hidden||Date.now()-lastHaptic<85)return;
  lastHaptic=Date.now();
  try{if(typeof navigator.vibrate==='function')navigator.vibrate(pattern)}catch(_){}
 }
 function tone(kind){
  if(!allowed()||document.hidden||window.speechSynthesis?.speaking)return;
  var AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)return;
  try{
   ctx=ctx||new AC();
   if(ctx.state==='suspended')ctx.resume?.().catch?.(()=>{});
   var frequencies=kind==='mic'?[493.88,698.46]:kind==='result'?[392,587.33,783.99]:[440];
   frequencies.forEach(function(f,i){
    var start=ctx.currentTime+.005+i*.044;
    var o=ctx.createOscillator(),g=ctx.createGain();
    o.type='sine';o.frequency.setValueAtTime(f,start);
    g.gain.setValueAtTime(.0001,start);
    g.gain.exponentialRampToValueAtTime(kind==='mic'?.004:.003,start+.012);
    g.gain.exponentialRampToValueAtTime(.0001,start+.073);
    o.connect(g);g.connect(ctx.destination);o.start(start);o.stop(start+.085);
   });
  }catch(_){}
 }
 function wrapExisting(){
  if(typeof window.playMatchAppSound==='function'&&!window.playMatchAppSound.__maSensory){
   var orig=window.playMatchAppSound;
   var wrapped=function(kind){
    soundTime=Date.now();
    if(kind==='result')vibrate([18,28,24]);
    return orig.apply(this,arguments);
   };
   wrapped.__maSensory=true;
   window.playMatchAppSound=wrapped;
  }
  if(typeof window.maPlayUISound==='function'&&!window.maPlayUISound.__maSensory){
   var origUI=window.maPlayUISound;
   var wrappedUI=function(){soundTime=Date.now();return origUI.apply(this,arguments)};
   wrappedUI.__maSensory=true;
   window.maPlayUISound=wrappedUI;
  }
 }
 var micSelector='#mic-btn-discover,#mic-button,.mic-btn,.jh-mic,[data-action="mic"],[data-voice-trigger],.ma-voice-mic,.ja-bubble,#ma-jonas-home-bubble';
 function onClick(e){
  if(!e.isTrusted||document.hidden)return;
  var el=e.target.closest('button,a[href],summary,[role="button"]');
  if(!el||el.matches('.sound-toggle-btn')||el.closest('.adsbygoogle,[data-ad-slot]')||
     el.matches(':disabled,[aria-disabled="true"]'))return;
  var mic=!!el.matches(micSelector)||!!el.closest(micSelector);
  vibrate(mic?115:12); // Voice has a distinguishable longer pulse.
  if(mic&&allowed()){
   // Existing delegated UI controller provides the ordinary button cue;
   // issue an original mic cue only when no controller already played one.
   setTimeout(function(){if(Date.now()-soundTime>90){
    if(typeof window.playMatchAppSound==='function')window.playMatchAppSound('mic');
    else tone('mic');
   }},0);
  }else{
   setTimeout(function(){
    if(Date.now()-soundTime>90&&allowed()){
     if(typeof window.playMatchAppSound==='function')window.playMatchAppSound('tap');
     else tone('tap');
    }
   },0);
  }
 }
 function init(){
  if(ready)return;ready=true;
  wrapExisting();
  document.addEventListener('click',onClick,{passive:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
 document.addEventListener('matchapp:audio-ready',wrapExisting);
})();
