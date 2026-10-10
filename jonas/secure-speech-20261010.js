/* Jonas speech: verified male cloud synthesis, all 14 site languages.
   No provider keys in the browser. Device TTS is an approved-male-only backup.
   Always fail silent rather than falling back to an arbitrary female voice. */
(function(){
 'use strict';
 if(window.MatchAppJonasSpeech)return;
 var ENDPOINT='https://zkymvqrmbabngsqblyye.supabase.co/functions/v1/jonas-speech';
 var audioContext=null,source=null,htmlAudio=null,abort=null,epoch=0;
 var supported=new Set(['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh']);
 function lang(raw){var s=String(raw||window.MATCH_LANG||document.documentElement.lang||navigator.language||'en');if(/^pt/i.test(s))return 'pt-BR';var base=s.split('-')[0].toLowerCase();return supported.has(base)?base:'en'}
 function unlock(){
  try{
   var Context=window.AudioContext||window.webkitAudioContext;
   if(Context&&!audioContext)audioContext=new Context();
   if(audioContext&&audioContext.state==='suspended')audioContext.resume().catch(function(){});
  }catch(_){}
 }
 document.addEventListener('pointerdown',function(event){
  if(event.target?.closest?.('.jh-bubble,.jh-mic,.jh-launch-label,.jh-send,.discover-speak,.mic-btn,.composer-send,#mic-button,#jonas-bubble,#send-button'))unlock();
 },{capture:true,passive:true});
 function stop(){
  ++epoch;
  if(abort){abort.abort();abort=null}
  if(source){try{source.stop()}catch(_){}source=null}
  if(htmlAudio){try{htmlAudio.pause();htmlAudio.src=''}catch(_){}htmlAudio=null}
  try{window.speechSynthesis?.cancel?.()}catch(_){}
 }
 function approvedFallback(text,language,options,token){
  var synthesis=window.speechSynthesis;
  var voices=window.MatchAppJonasVoicePolicy;
  var voice;
  try{voice=voices?.select?.(synthesis?.getVoices?.()||[],language)}catch(_){}
  if(!voice||!window.SpeechSynthesisUtterance||token!==epoch)return Promise.resolve(false);
  return new Promise(function(resolve){
   var done=false;
   var finish=function(ok){if(done)return;done=true;if(token===epoch)options.onEnd?.(ok);resolve(ok)};
   try{
    var utter=new SpeechSynthesisUtterance(text);
    utter.voice=voice;utter.lang=voice.lang;utter.pitch=1;utter.rate=1;
    utter.onstart=function(){if(token===epoch)options.onStart?.()};
    utter.onend=function(){finish(true)};
    utter.onerror=function(){finish(false)};
    synthesis.speak(utter);
   }catch(_){finish(false)}
  });
 }
 async function speak(input,language,options){
  var text=String(input||'').trim().slice(0,650),opts=options||{};
  if(!text)return false;
  stop();
  var token=epoch;
  var chosen=lang(language);
  var controller=new AbortController();
  abort=controller;
  var timeout=setTimeout(function(){controller.abort()},21000);
  try{
   var headers={'Content-Type':'application/json'};
   try{
    var session=await window.supabaseClient?.auth?.getSession?.();
    if(session?.data?.session?.access_token)headers.Authorization='Bearer '+session.data.session.access_token;
   }catch(_){}
   if(token!==epoch)return false;
   var response=await fetch(ENDPOINT,{method:'POST',headers:headers,body:JSON.stringify({text:text,lang:chosen}),signal:controller.signal,cache:'no-store'});
   if(!response.ok)throw new Error(response.status===429?'speech_limit_reached':'speech_provider_unavailable');
   var blob=await response.blob();
   if(token!==epoch)return false;
   if(blob.size<100||blob.size>4_000_000)throw new Error('invalid_audio');
   if(audioContext){
    try{
     if(audioContext.state==='suspended')await audioContext.resume();
     var bytes=await blob.arrayBuffer();
     var decoded=await audioContext.decodeAudioData(bytes);
     if(token!==epoch)return false;
     return await new Promise(function(resolve){
      var node=audioContext.createBufferSource(),ended=false;
      source=node;node.buffer=decoded;node.connect(audioContext.destination);
      node.onended=function(){if(ended)return;ended=true;if(source===node)source=null;if(token===epoch)opts.onEnd?.(true);resolve(true)};
      opts.onStart?.();
      node.start(0);
     });
    }catch(e){if(token!==epoch)return false}
   }
   return await new Promise(function(resolve,reject){
    var audio=new Audio(),url=URL.createObjectURL(blob),finished=false;
    htmlAudio=audio;audio.preload='auto';audio.src=url;
    function end(ok){if(finished)return;finished=true;URL.revokeObjectURL(url);if(htmlAudio===audio)htmlAudio=null;if(token===epoch)opts.onEnd?.(ok);resolve(ok)}
    audio.onended=function(){end(true)};
    audio.onerror=function(){end(false)};
    audio.play().then(function(){if(token===epoch)opts.onStart?.()}).catch(function(){URL.revokeObjectURL(url);reject(new Error('playback_blocked'))});
   });
  }catch(e){
   if(token!==epoch)return false;
   var fallback=await approvedFallback(text,chosen,opts,token);
   if(!fallback&&token===epoch){opts.onError?.(String(e?.message||'speech_unavailable'));opts.onEnd?.(false)}
   return fallback;
  }finally{clearTimeout(timeout);if(abort===controller)abort=null}
 }
 window.MatchAppJonasSpeech=Object.freeze({speak:speak,stop:stop,unlock:unlock,lang:lang});
})();
