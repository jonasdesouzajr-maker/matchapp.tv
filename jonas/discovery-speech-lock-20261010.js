/* MatchApp Ai: hard stop for unapproved Jonas speech in Discovery.
 * This runs only on /discover.html, never Kids Mode or other products.
 * Catches stale cached readers that ignore the new explicit voice selector.
 */
(function(){
 'use strict';
 var tts=window.speechSynthesis;
 if(!tts||tts.__matchappJonasMaleOnly||typeof tts.speak!=='function')return;
 var base=tts.speak.bind(tts);
 var protectedSpeak=function(utterance){
  var allow=window.MatchAppJonasVoicePolicy?.approved;
  if(!allow||!allow(utterance?.voice,utterance?.lang)){
   document.querySelectorAll('.discover-speak.speaking').forEach(function(button){button.classList.remove('speaking')});
   return;
  }
  return base(utterance);
 };
 try {
  Object.defineProperty(tts,'speak',{configurable:false,writable:false,value:protectedSpeak});
  Object.defineProperty(tts,'__matchappJonasMaleOnly',{value:true});
 }catch(_){
  try{tts.speak=protectedSpeak;tts.__matchappJonasMaleOnly=true}catch(__){}
 }
})();
