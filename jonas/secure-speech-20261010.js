/* Jonas speech: verified male cloud synthesis, all 14 site languages.
   No provider keys in the browser. Only the approved Cedar/Charon provider voices may speak.
   Always fail silent rather than falling back to an arbitrary female voice. */
(function(){
 'use strict';
 if(window.MatchAppJonasSpeech)return;
 var ENDPOINT='https://zkymvqrmbabngsqblyye.supabase.co/functions/v1/jonas-speech';
 var audioContext=null,source=null,htmlAudio=null,abort=null,epoch=0;
 var supported=new Set(['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh']);
 // Fixed, provider-produced greetings contain no account or conversation data.
 // Reuse their exact recording instead of synthesizing the same sentence on
 // every opening. Other languages retain the same approved cloud voice pair.
 var greetings={en:"Hi, I'm Jonas. How can I help?",'pt-BR':'Olá, sou o Jonas. Como posso ajudar?'};
 var greetingAudio=new Map();
 function loadGreeting(language){
  if(!greetings[language])return Promise.resolve(null);
  if(greetingAudio.has(language))return greetingAudio.get(language);
  var pending=fetch('/jonas/greetings/'+language+'.mp3?v=20261014-cedar1',{cache:'force-cache',credentials:'same-origin',signal:AbortSignal.timeout(2500)})
   .then(function(response){if(!response.ok)throw new Error('greeting_unavailable');return response.blob()})
   .then(function(blob){if(blob.size<100||blob.size>200000)throw new Error('invalid_greeting');return blob})
   .catch(function(){greetingAudio.delete(language);return null});
  greetingAudio.set(language,pending);return pending;
 }
 function lang(raw){var saved='';try{saved=localStorage.getItem('match_lang')||''}catch(_){}var s=String(raw||window.MATCH_LANG||saved||document.documentElement.lang||navigator.language||'en');if(/^pt/i.test(s))return 'pt-BR';var base=s.split('-')[0].toLowerCase();return supported.has(base)?base:'en'}
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
 async function speak(input,language,options){
  var text=String(input||'').trim().slice(0,650),opts=options||{};
  if(!text)return false;
  stop();
  var token=epoch;
  var chosen=lang(language);
  if(token!==epoch)return false;
  var controller=new AbortController();
  abort=controller;
  var timeout=setTimeout(function(){controller.abort()},12000);
  try{
   var blob=text===greetings[chosen]?await loadGreeting(chosen):null;
   if(!blob){
   var headers={'Content-Type':'application/json'};
   try{
    var session=await window.supabaseClient?.auth?.getSession?.();
    if(session?.data?.session?.access_token)headers.Authorization='Bearer '+session.data.session.access_token;
   }catch(_){}
   if(token!==epoch)return false;
   var response=await fetch(ENDPOINT,{method:'POST',headers:headers,body:JSON.stringify({text:text,lang:chosen}),signal:controller.signal,cache:'no-store'});
   if(!response.ok)throw new Error(response.status===429?'speech_limit_reached':'speech_provider_unavailable');
   var identity=response.headers.get('X-Jonas-Voice');
   if(identity!=='male-cedar'&&identity!=='male-charon')throw new Error('unapproved_voice');
   blob=await response.blob();
   }
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
      var meterFrame=0;
      node.onended=function(){if(ended)return;ended=true;cancelAnimationFrame(meterFrame);if(source===node)source=null;if(token===epoch){opts.onProgress?.(1);opts.onEnd?.(true)}resolve(true)};
      opts.onStart?.();
      node.start(0);
      if(typeof opts.onLevel==='function'){
       var samples=decoded.getChannelData(0),rate=decoded.sampleRate,startAt=audioContext.currentTime;
       var meter=function(){
        if(ended||token!==epoch)return;
        var elapsed=Math.max(0,audioContext.currentTime-startAt);
        opts.onProgress?.(Math.min(.995,elapsed/Math.max(.1,decoded.duration)));
        var pos=Math.floor(elapsed*rate),sum=0,num=0;
        for(var i=pos;i<Math.min(samples.length,pos+1800);i+=32){sum+=samples[i]*samples[i];num++}
        opts.onLevel(Math.min(1,Math.sqrt(sum/Math.max(1,num))*5));
        meterFrame=requestAnimationFrame(meter);
       };
       meterFrame=requestAnimationFrame(meter);
      }
     });
    }catch(e){if(token!==epoch)return false}
   }
   return await new Promise(function(resolve,reject){
    var audio=new Audio(),url=URL.createObjectURL(blob),finished=false;
    htmlAudio=audio;audio.preload='auto';audio.src=url;
    function end(ok){if(finished)return;finished=true;URL.revokeObjectURL(url);if(htmlAudio===audio)htmlAudio=null;if(token===epoch){if(ok)opts.onProgress?.(1);opts.onEnd?.(ok)}resolve(ok)}
    audio.ontimeupdate=function(){if(token===epoch&&Number.isFinite(audio.duration)&&audio.duration>0)opts.onProgress?.(Math.min(.995,audio.currentTime/audio.duration))};
    audio.onended=function(){end(true)};
    audio.onerror=function(){end(false)};
    audio.play().then(function(){if(token===epoch)opts.onStart?.()}).catch(function(){URL.revokeObjectURL(url);reject(new Error('playback_blocked'))});
   });
  }catch(e){
   if(token!==epoch)return false;
   opts.onError?.(String(e?.message||'speech_unavailable'));opts.onEnd?.(false);
   return false;
  }finally{clearTimeout(timeout);if(abort===controller)abort=null}
 }
 window.MatchAppJonasSpeech=Object.freeze({speak:speak,stop:stop,unlock:unlock,lang:lang});
 document.addEventListener('matchapp:langchange',stop);
 // Small same-origin preload only; no provider request, credit use or hidden
 // conversation. Playback still requires the person's activation gesture.
 function warmGreeting(){loadGreeting(lang())}
 if(window.requestIdleCallback)requestIdleCallback(warmGreeting,{timeout:1800});
 else setTimeout(warmGreeting,800);
})();
