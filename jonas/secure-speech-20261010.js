/* Jonas speech: verified male cloud synthesis, all 14 site languages.
   No provider keys in the browser. Only approved Cedar, ElevenLabs and Charon voices may speak.
   Always fail silent rather than falling back to an arbitrary female voice. */
(function(){
 'use strict';
 if(window.MatchAppJonasSpeech)return;
 var ENDPOINT='https://zkymvqrmbabngsqblyye.supabase.co/functions/v1/jonas-speech';
 var audioContext=null,source=null,htmlAudio=null,abort=null,epoch=0,streamStop=null;
 var supported=new Set(['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh']);
 // Fixed, provider-produced greetings contain no account or conversation data.
 // Reuse their exact recording instead of synthesizing the same sentence on
 // every opening. Other languages retain the same approved cloud voice pair.
 var greetings={"en": "Hi, I'm Jonas. How can I help?", "pt-BR": "Olá, sou o Jonas. Como posso ajudar?", "es": "¡Hola! Soy Jonas. ¿Qué te gustaría descubrir?", "fr": "Bonjour, je suis Jonas. Que souhaitez-vous découvrir ?", "de": "Hallo, ich bin Jonas. Was möchtest du entdecken?", "it": "Ciao, sono Jonas. Cosa ti piacerebbe scoprire?", "tr": "Merhaba, ben Jonas. Ne keşfetmek istersin?", "ru": "Привет, я Йонас. Что хочешь открыть для себя?", "ar": "مرحبًا، أنا جوناس. ماذا تود أن تكتشف؟", "hi": "नमस्ते, मैं जोनास हूँ। आप क्या खोजना चाहेंगे?", "id": "Halo, saya Jonas. Apa yang ingin kamu temukan?", "ja": "こんにちは、ジョナスです。今日は何を見つけましょうか？", "ko": "안녕하세요, 저는 조나스예요. 무엇을 찾아볼까요?", "zh": "你好，我是乔纳斯。今天想发现什么？"};
 var greetingAudio=new Map(),greetingDecoded=new Map();
 function context(){
  try{var Context=window.AudioContext||window.webkitAudioContext;if(Context&&!audioContext)audioContext=new Context()}catch(_){}
  return audioContext;
 }
 function decodeGreeting(language,blob){
  if(!blob||!context())return Promise.resolve(null);
  if(greetingDecoded.has(language))return greetingDecoded.get(language);
  var pending=blob.arrayBuffer().then(bytes=>audioContext.decodeAudioData(bytes)).catch(()=>{greetingDecoded.delete(language);return null});
  greetingDecoded.set(language,pending);return pending;
 }
 function loadGreeting(language){
  if(!greetings[language])return Promise.resolve(null);
  if(greetingAudio.has(language))return greetingAudio.get(language);
  var pending=fetch('/jonas/greetings/'+language+'.mp3?v=20261015-instant1',{cache:'force-cache',credentials:'same-origin',signal:AbortSignal.timeout(2500)})
   .then(function(response){if(!response.ok)throw new Error('greeting_unavailable');return response.blob()})
   .then(function(blob){if(blob.size<100||blob.size>200000)throw new Error('invalid_greeting');void decodeGreeting(language,blob);return blob})
   .catch(function(){greetingAudio.delete(language);return null});
  greetingAudio.set(language,pending);return pending;
 }
 function lang(raw){var saved='';try{saved=localStorage.getItem('match_lang')||''}catch(_){}var s=String(raw||window.MATCH_LANG||saved||document.documentElement.lang||navigator.language||'en');if(/^pt/i.test(s))return 'pt-BR';var base=s.split('-')[0].toLowerCase();return supported.has(base)?base:'en'}
 function unlock(){
  try{
   context();
   if(audioContext&&audioContext.state==='suspended')audioContext.resume().catch(function(){});
  }catch(_){}
 }
 document.addEventListener('pointerdown',function(event){
  if(event.target?.closest?.('.ja-bubble,.jh-bubble,.jh-mic,.jh-launch-label,.jh-send,.discover-speak,.mic-btn,.composer-send,#mic-button,#jonas-bubble,#send-button'))unlock();
 },{capture:true,passive:true});
 function stop(){
  ++epoch;
  if(streamStop){streamStop();streamStop=null}
  if(abort){abort.abort();abort=null}
  if(source){try{source.stop()}catch(_){}source=null}
  if(htmlAudio){try{htmlAudio.pause();htmlAudio.src=''}catch(_){}htmlAudio=null}
  try{window.speechSynthesis?.cancel?.()}catch(_){}
 }
 // One synthesis request, scheduled in contiguous PCM buffers. No sentence
 // splitting, second model call, invented speech, or repeated allowance debit.
 async function playPCM(response,token,opts,signal){
  if(audioContext.state==='suspended')await audioContext.resume();
  var reader=response.body.getReader(),nodes=new Set(),segments=[],tail=new Uint8Array(0);
  var nextAt=audioContext.currentTime+.06,started=false,done=false,finished=false,total=0,played=0,meterFrame=0;
  return await new Promise(function(resolve,reject){
   function cleanup(){cancelAnimationFrame(meterFrame);signal.removeEventListener('abort',cancel);if(streamStop===cancel)streamStop=null}
   function halt(){nodes.forEach(node=>{node.onended=null;try{node.stop()}catch(_){}node.disconnect()});nodes.clear();segments=[];void reader.cancel().catch(()=>{})}
   function cancel(){if(finished)return;if(token===epoch){fail(new Error('speech_timeout'));return}finished=true;cleanup();halt();resolve(false)}
   function fail(error){if(finished)return;finished=true;cleanup();halt();reject(error)}
   function finish(){if(finished||!done||nodes.size)return;finished=true;cleanup();if(token===epoch){opts.onProgress?.(1);opts.onEnd?.(true)}resolve(true)}
   function meter(){
    if(finished||token!==epoch)return;
    var now=audioContext.currentTime,segment=segments.find(item=>now>=item.start&&now<item.end),sum=0,count=0;
    if(segment){
     if(!started){started=true;opts.onStart?.()}
     var pos=Math.floor((now-segment.start)*24000);
     for(var i=pos;i<Math.min(segment.samples.length,pos+1024);i+=16){sum+=segment.samples[i]*segment.samples[i];count++}
    }
    opts.onLevel?.(Math.min(1,Math.sqrt(sum/Math.max(1,count))*5));
    // Progress uses the real final duration once the stream ends. While the
    // total is unknown, keep the full answer readable rather than guessing.
    if(done&&total)opts.onProgress?.(Math.min(.995,(played+(segment?Math.max(0,now-segment.start):0))/total));
    meterFrame=requestAnimationFrame(meter);
   }
   function schedule(bytes){
    var count=bytes.length/2,buffer=audioContext.createBuffer(1,count,24000),samples=buffer.getChannelData(0),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    for(var i=0;i<count;i++)samples[i]=view.getInt16(i*2,true)/32768;
    var node=audioContext.createBufferSource();node.buffer=buffer;node.connect(audioContext.destination);
    var start=Math.max(nextAt,audioContext.currentTime+.025),segment={start:start,end:start+buffer.duration,samples:samples};
    nextAt=segment.end;total+=buffer.duration;segments.push(segment);nodes.add(node);
    node.onended=function(){nodes.delete(node);node.disconnect();segments=segments.filter(item=>item!==segment);played+=buffer.duration;finish()};
    node.start(start);
   }
   streamStop=cancel;signal.addEventListener('abort',cancel,{once:true});
   if(signal.aborted||token!==epoch){cancel();return}
   meterFrame=requestAnimationFrame(meter);
   (async function(){
    var size=0;
    while(!finished){
     var chunk=await reader.read();
     if(finished||token!==epoch){cancel();return}
     if(chunk.done)break;
     size+=chunk.value.length;if(size>=4_000_000)throw new Error('invalid_audio');
     var joined=new Uint8Array(tail.length+chunk.value.length);joined.set(tail);joined.set(chunk.value,tail.length);
     // 100 ms batches avoid tiny network packets creating thousands of nodes.
     var usable=joined.length-joined.length%4800;
     if(usable)schedule(joined.subarray(0,usable));tail=joined.slice(usable);
    }
    if(finished)return;
    if(tail.length%2||size<100)throw new Error('invalid_audio');
    if(tail.length)schedule(tail);
    done=true;finish();
   })().catch(fail);
  });
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
   var isGreeting=text===greetings[chosen];
   var blob=isGreeting?await loadGreeting(chosen):null;
   if(!blob){
   var headers={'Content-Type':'application/json'};
   try{
    var session=await window.supabaseClient?.auth?.getSession?.();
    if(session?.data?.session?.access_token)headers.Authorization='Bearer '+session.data.session.access_token;
   }catch(_){}
   if(token!==epoch)return false;
   var response=await fetch(ENDPOINT,{method:'POST',headers:headers,body:JSON.stringify({text:text,lang:chosen,stream:!!audioContext&&typeof TransformStream==='function',voiceVersion:2}),signal:controller.signal,cache:'no-store'});
   if(!response.ok)throw new Error(response.status===429?'speech_limit_reached':'speech_provider_unavailable');
   var identity=response.headers.get('X-Jonas-Voice');
   if(identity!=='male-cedar'&&identity!=='male-charon'&&identity!=='male-elevenlabs')throw new Error('unapproved_voice');
   if(token!==epoch)return false;
   if(audioContext&&response.headers.get('Content-Type')?.startsWith('audio/pcm')&&response.body){
    // Fetch has a finite budget, but playing a successfully received response
    // must not be cut off by the original download timer.
    var received=response.body.pipeThrough(new TransformStream({flush(){clearTimeout(timeout)}}));
    return await playPCM(new Response(received),token,opts,controller.signal);
   }
   blob=await response.blob();
   }
   clearTimeout(timeout);
   if(token!==epoch)return false;
   if(blob.size<100||blob.size>4_000_000)throw new Error('invalid_audio');
   if(audioContext){
    try{
     if(audioContext.state==='suspended')await audioContext.resume();
     var decoded=isGreeting?await decodeGreeting(chosen,blob):null;
     if(!decoded){var bytes=await blob.arrayBuffer();decoded=await audioContext.decodeAudioData(bytes)}
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
 window.MatchAppJonasSpeech=Object.freeze({speak:speak,stop:stop,unlock:unlock,lang:lang,prepare:language=>loadGreeting(lang(language))});
 document.addEventListener('matchapp:langchange',stop);
 // Small same-origin preload only; no provider request, credit use or hidden
 // conversation. Playback still requires the person's activation gesture.
 function warmGreeting(){loadGreeting(lang())}
 document.addEventListener('matchapp:langchange',warmGreeting);
 if(window.requestIdleCallback)requestIdleCallback(warmGreeting,{timeout:100});
 else setTimeout(warmGreeting,0);
})();
