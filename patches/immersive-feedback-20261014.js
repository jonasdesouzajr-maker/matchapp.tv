/* MatchApp's original glass interaction suite, 2026-10-20.
 * One cue per deliberate action, shared with the existing sound entry points.
 * No startup audio, telemetry, quota calls, speech changes or third-party samples. */
(function(){
 'use strict';
 if(window.MatchAppFeedback||/^\/(kids|private-voice|oauth)(?:\/|$)/.test(location.pathname)||/\/(callback|confirm)\.html$/.test(location.pathname)||document.body?.classList.contains('page-kids'))return;
 var ctx=null,ready=false,gestureSeen=false,lastHaptic=0,lastSound=0,intent=null,serial=0,buffers={},loading={},voices=[];
 var palette={
  tap:[[659.25,0,.7]],open:[[523.25,0,.56],[783.99,.045,.43]],close:[[783.99,0,.48],[523.25,.035,.4]],
  select:[[659.25,0,.57],[880,.035,.36]],confirm:[[523.25,0,.54],[783.99,.045,.4],[1046.5,.09,.29]],
  mic:[[440,0,.52],[659.25,.055,.4]],error:[[440,0,.5],[392,.065,.35]],
  // Original destination signatures share the glass timbre, with distinct
  // first notes so even an immediate document navigation keeps its identity.
  navHome:[[523.25,0,.46],[659.25,.035,.29],[783.99,.075,.19]],
  navExplore:[[587.33,0,.46],[783.99,.035,.29],[1174.66,.075,.19]],
  navMatches:[[659.25,0,.46],[783.99,.04,.29],[1046.5,.08,.19]],
  navMyList:[[783.99,0,.43],[659.25,.035,.27],[987.77,.075,.18]],
  navProfile:[[880,0,.42],[659.25,.035,.27],[523.25,.075,.18]]
 };
 var dockSignatures={
  home:{cue:'navHome',haptic:10},explore:{cue:'navExplore',haptic:[7,18,5]},
  matches:{cue:'navMatches',haptic:[6,18,6]},mylist:{cue:'navMyList',haptic:[5,18,9]},
  profile:{cue:'navProfile',haptic:8}
 };
 var aliases={nav:'tap',tab:'select',primary:'confirm',result:'confirm',save:'confirm',like:'confirm',share:'confirm',together:'confirm',soundOn:'confirm',back:'close'};
 function allowed(){try{return localStorage.getItem('match_soundEnabled')!=='false'}catch(_){return true}}
 function reduced(){try{return document.documentElement.classList.contains('reduce-motion')||matchMedia('(prefers-reduced-motion: reduce)').matches}catch(_){return true}}
 function haptics(){try{return localStorage.getItem('match_hapticsEnabled')!=='false'&&!reduced()}catch(_){return false}}
 function speaking(){return !!(window.speechSynthesis?.speaking||document.querySelector('#ma-jonas-home.jh-speaking,#ma-ambient-jonas[data-speaking="1"],#ma-ambient-panel[data-speaking="1"]'))}
 function vibrate(pattern){
  if(!haptics()||document.hidden||Date.now()-lastHaptic<85)return;
  lastHaptic=Date.now();try{navigator.vibrate?.(pattern)}catch(_){}
 }
 function context(){
  if(!allowed())return null;
  var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
  try{if(!ctx||ctx.state==='closed')ctx=new AC();if(ctx.state==='suspended')ctx.resume?.().catch?.(()=>{});return ctx}catch(_){return null}
 }
 function preload(kind){
  // Navigation is authored directly in this one engine, without extra files
  // or a fetch that would race the destination page.
  if(kind.indexOf('nav')===0)return;
  if(buffers[kind]||loading[kind]||!ctx||typeof fetch!=='function')return;
  loading[kind]=true;
  fetch('/assets/audio/matchapp-'+kind+'.wav?v=glass20261020-1',{credentials:'same-origin'})
   .then(function(r){if(!r.ok)throw Error('audio unavailable');return r.arrayBuffer()})
   .then(function(bytes){return ctx.decodeAudioData(bytes)})
   .then(function(buffer){buffers[kind]=buffer}).catch(function(){/* Authored synthesis below remains usable offline. */});
 }
 function release(){
  voices.forEach(function(v){try{v.stop()}catch(_){}try{v.disconnect()}catch(_){}});voices=[];
 }
 function synth(kind,audio){
  // The bundled WAVs and fallback share these original damped-glass resonances.
  palette[kind].forEach(function(note){
   [1,2.71,4.09].forEach(function(ratio,index){
    var o=audio.createOscillator(),g=audio.createGain(),start=audio.currentTime+.002+note[1];
    o.type='sine';o.frequency.setValueAtTime(note[0]*ratio,start);
    g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(note[2]*[.035,.0085,.0035][index],start+.003);
    g.gain.exponentialRampToValueAtTime(.0001,start+.19);o.connect(g);g.connect(audio.destination);
    o.start(start);o.stop(start+.20);voices.push(o);o.onended=function(){try{o.disconnect();g.disconnect()}catch(_){}};
   });
  });
 }
 function play(kind){
  if(!gestureSeen||!allowed()||document.hidden||speaking())return;
  var result=kind==='result',now=Date.now();kind=aliases[kind]||kind||'tap';if(!palette[kind])kind='tap';
  if(intent&&now-intent.at<100){if(intent.played)return;intent.played=true;kind=intent.kind;}
  if(now-lastSound<36)return;
  var audio=context();if(!audio)return;lastSound=now;release();
  if(result)vibrate([16,24,10]);
  if(buffers[kind]){
   try{var source=audio.createBufferSource(),gain=audio.createGain();source.buffer=buffers[kind];gain.gain.value=.42;source.connect(gain);gain.connect(audio.destination);source.start();voices.push(source);source.onended=function(){try{source.disconnect();gain.disconnect()}catch(_){}};return}catch(_){}
  }
  synth(kind,audio);preload(kind);
 }
 function wrapExisting(){
  ['playMatchAppSound','maPlayUISound'].forEach(function(name){
   if(typeof window[name]!=='function'||window[name].__maSensory)return;
   var wrapped=function(kind){return play(kind)};wrapped.__maSensory=true;window[name]=wrapped;
  });
 }
 var micSelector='#mic-btn-discover,#mic-button,.mic-btn,.jh-mic,[data-action="mic"],[data-voice-trigger],.ma-voice-mic,.ja-bubble,#ma-jonas-home-bubble';
 function dockSignature(el){
  if(!el.matches('a[href]')||!el.closest('.ma-cinema-dock'))return null;
  var destination=el.getAttribute('data-ma-dock-destination');
  return Object.prototype.hasOwnProperty.call(dockSignatures,destination)?dockSignatures[destination]:null;
 }
 function kindFor(el){
  if(el.matches(micSelector)||el.closest(micSelector))return 'mic';
  if(el.matches('summary'))return el.parentElement.open?'close':'open';
  if(el.matches('.crit-toggle,[aria-expanded]'))return el.getAttribute('aria-expanded')==='true'?'close':'open';
  if(el.matches('[data-action="close"],[data-dismiss],.modal-close,.ja-close,.jh-close,[class*="close-btn"]'))return 'close';
  if(el.matches('.ma-chip,.crit-chip,.ma-tab,.portfolio-tab,[role="tab"],input[type="checkbox"],input[type="radio"],select'))return 'select';
  if(el.matches('.gold-btn,.ma-primary,.composer-send,[type="submit"],[data-action="save"],[data-action="like"],[id*="save"],[id*="share"]'))return 'confirm';
  return 'tap';
 }
 function onClick(e){
  if(!e.isTrusted||document.hidden)return;
  gestureSeen=true;
  var el=e.target.closest?.('button,a[href],summary,[role="button"],input[type="checkbox"],input[type="radio"],select');
  if(!el)return;
  if(el.matches('.sound-toggle-btn')){intent=null;wrapExisting();return;}
  if(el.closest('.adsbygoogle,[data-ad-slot]')||el.matches(':disabled,[aria-disabled="true"]')){intent={at:Date.now(),played:true,kind:'tap'};return;}
  wrapExisting();var nav=dockSignature(el),kind=nav?nav.cue:kindFor(el),mic=kind==='mic';
  intent={id:++serial,at:Date.now(),kind:kind,played:false};var token=intent.id;
  if(nav){
   vibrate(nav.haptic);
   // Start within this deliberate gesture before the browser follows the
   // unchanged href. The consumed intent suppresses legacy duplicate cues.
   play(kind);return;
  }
  vibrate(mic?115:12);
  // AudioContext is unlocked inside the user's gesture, including iOS Safari.
  if(allowed())context();
  setTimeout(function(){if(intent?.id===token&&!intent.played)play(kind)},0);
 }
 function onChange(e){
  if(!e.isTrusted||!e.target.matches?.('select,input[type="range"]'))return;
  gestureSeen=true;
  wrapExisting();intent=null;play('select');vibrate(8);
 }
 function init(){
  if(ready)return;ready=true;wrapExisting();
  document.addEventListener('click',onClick,{capture:true,passive:true});
  document.addEventListener('change',onChange,{passive:true});
 }
 window.MatchAppFeedback={play:play,stop:release,version:'glass20261020-2'};
 document.addEventListener('visibilitychange',function(){if(document.hidden)release()});
 document.addEventListener('matchapp:audio-ready',wrapExisting);
 document.addEventListener('DOMContentLoaded',wrapExisting,{once:true});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
