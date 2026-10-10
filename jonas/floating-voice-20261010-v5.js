/* Jonas: greeting + mic opt-in from a real tap; typing always wins.
   The recognized query goes through the original authenticated MatchApp Ai route.
   No API keys, parallel AI engine, or background recording. */
(function(){
 'use strict';
 var root=document.getElementById('ma-jonas-home'),panel=document.getElementById('ma-jonas-home-panel');
 if(!root||!panel||window.__matchappJonasVoice)return;
 window.__matchappJonasVoice=true;
 var input=root.querySelector('#ma-jonas-home-input'),form=root.querySelector('.jh-form');
 var mic=root.querySelector('#ma-jonas-home-mic'),status=root.querySelector('#ma-jonas-home-status');
 var recognition=null,mode='idle',session=0,spoken=null,timeout=0,guard=0,mouthTimer=0;
 var portrait=root.querySelector('.jh-medallion img');
 var faceBase='/jonas/faces/jonas/',frames={},mouth=null;
 ['rest','smile','aa','ee','oh'].forEach(function(name){var img=new Image();img.decoding='async';img.src=faceBase+name+'.jpg';frames[name]=img});
 if(portrait){
  // Never swap the whole head image: only the mouth moves, so eyes and face
  // remain stable without flashes during speech synthesis.
  mouth=document.createElement('img');
  mouth.className='jh-mouth-layer';mouth.alt='';mouth.setAttribute('aria-hidden','true');
  mouth.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 19%;clip-path:inset(54% 0 0 0);opacity:0;pointer-events:none;border-radius:50%';
  portrait.parentNode.style.position='relative';
  portrait.parentNode.appendChild(mouth);
 }
 try{window.speechSynthesis?.getVoices?.()}catch(_){}
 function face(name){
  if(!mouth)return;
  if(name==='rest'){mouth.style.opacity='0';return}
  var image=frames[name];
  if(image&&image.complete&&image.naturalWidth>0){mouth.src=image.src;mouth.style.opacity='1'}
 }
 function voiceFor(lang){
  // Never fall back to the device's first/default voice, which may be female.
  var policy=window.MatchAppJonasVoicePolicy;
  if(!policy)return null;
  try{return policy.select(window.speechSynthesis?.getVoices?.()||[],lang)}catch(_){return null}
 }
 function animateMouth(){
  clearInterval(mouthTimer);var frames=['aa','ee','oh','rest'];var pos=0;
  face('smile');root.classList.add('jh-speaking');
  mouthTimer=setInterval(function(){if(!document.hidden)face(frames[pos++%frames.length])},150);
 }
 function resetMouth(){clearInterval(mouthTimer);mouthTimer=0;face('rest');root.classList.remove('jh-speaking')}

 function locale(){return window.MatchAppJonasLocale}
 function isPt(){return /^pt/i.test(window.MATCH_LANG||document.documentElement.lang||navigator.language||'en')}
 function label(en,pt){return isPt()?pt:en}
 function statusText(en,pt){
  if(!status)return;
  var key={
   'Tap Jonas to talk · or start typing':'ready',
   'Jonas is greeting you…':'speaking','Listening… speak now':'listening',
   'Starting microphone…':'mic','Text mode · Voice is off':'text',
   'Speech recognition is unavailable here. You can type instead.':'unsupported',
   'Microphone unavailable or denied. You can type instead.':'denied',
   'Please allow microphone access, or type instead.':'permission',
   'Could not hear you. Tap the microphone to try again.':'permission',
   'Automatic listening was blocked. Tap the microphone to retry.':'permission',
   'Speak now, or tap the microphone to retry.':'listening'
  }[en];
  status.textContent=(key&&locale()?.t(key))||label(en,pt);
 }
 function stopRecognition(){
  if(recognition){var r=recognition;recognition=null;r.onresult=null;r.onend=null;r.onerror=null;try{r.abort()}catch(_){}}
 }
 function stopVoice(){
  clearTimeout(timeout);clearTimeout(guard);stopRecognition();
  window.MatchAppJonasSpeech?.stop?.();
  try{if(spoken&&'speechSynthesis' in window)window.speechSynthesis.cancel()}catch(_){}
  spoken=null;resetMouth();
  root.classList.remove('jh-listening','jh-greeting');
  if(mic){mic.setAttribute('aria-pressed','false');mic.title=label('Start voice input','Iniciar entrada por voz')}
 }
 function switchToText(){
  if(mode==='text')return;
  ++session;mode='text';stopVoice();
  root.dataset.voiceMode='text';
  statusText('Text mode · Voice is off','Modo texto · Voz desativada');
 }
 var nativeListening=false;
 function listen(token){
  if(token!==session||mode!=='voice'||panel.hidden)return;
  // Keep recognition active while the Android system recognizer takes focus.`n  // The resulting transcript arrives on the same WebView after Activity resumes.`n  // The installed Android WebView does not expose the browser SpeechRecognition
  // API reliably. Use the existing native recognizer bridge instead and preserve
  // the voice-origin marker through the authorized /discover.html navigation.
  if(window.MatchAppNativeVoice&&typeof window.MatchAppNativeVoice.start==='function'){
   nativeListening=true;
   var oldNativeResult=window.matchAppNativeVoiceResult;
   var oldNativeError=window.matchAppNativeVoiceError;
   function returnToQuestion(transcript){
    if(token!==session||mode!=='voice'||panel.hidden){if(typeof oldNativeResult==='function')oldNativeResult(transcript);return}
    nativeListening=false;
    var words=String(transcript||'').trim();
    if(!words)return;
    input.value=words;
    try{sessionStorage.setItem('matchapp_voice_origin_v1',JSON.stringify({inputId:'ma-jonas-home-input',text:words,scope:'adult',at:Date.now()}))}catch(_){}
    ++session;mode='idle';stopVoice();
    if(form?.requestSubmit)form.requestSubmit();
    else location.assign('/discover.html?q='+encodeURIComponent(words)+'&focus=start&from=jonas');
   }
   window.matchAppNativeVoiceResult=returnToQuestion;
   window.matchAppNativeVoiceError=function(code){
    if(token!==session||mode!=='voice'){if(typeof oldNativeError==='function')oldNativeError(code);return}
    nativeListening=false;root.classList.remove('jh-listening');mic?.setAttribute('aria-pressed','false');
    statusText('Microphone unavailable. Tap to retry or type.','Microfone indisponível. Toque para tentar novamente ou digite.');
   };
   root.classList.add('jh-listening');mic?.setAttribute('aria-pressed','true');
   statusText('Listening — speak now.','Ouvindo — pode falar.');
   try{window.MatchAppNativeVoice.start(locale()?.speech()||window.MATCH_LANG||'en-US')}
   catch(_){window.matchAppNativeVoiceError?.('unavailable')}
   return;
  }
  var Engine=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Engine){statusText('Voice recognition is unavailable here. You can type instead.','Reconhecimento de voz indisponível aqui. Você pode digitar.');return;}
  stopRecognition();
  try{
   var r=new Engine();recognition=r;r.lang=locale()?.speech()||window.MATCH_LANG||document.documentElement.lang||navigator.language||'en-US';
   r.continuous=false;r.interimResults=true;r.maxAlternatives=1;
   r.onstart=function(){if(token!==session||mode!=='voice')return;root.classList.add('jh-listening');mic?.setAttribute('aria-pressed','true');statusText('Listening… speak now','Ouvindo… pode falar')};
   r.onresult=function(e){
    if(token!==session||mode!=='voice')return;
    var transcript='',isFinal=false;
    for(var i=e.resultIndex;i<e.results.length;i++){
     transcript+=e.results[i][0]?.transcript||'';
     if(e.results[i].isFinal)isFinal=true;
    }
    if(transcript.trim()){input.value=transcript.trim();status.textContent=input.value}
    if(isFinal&&input.value.trim()){
     try{sessionStorage.setItem('matchapp_voice_origin_v1',JSON.stringify({inputId:'ma-jonas-home-input',text:input.value.trim(),scope:'adult',at:Date.now()}))}catch(_){}
     ++session;mode='idle';stopVoice();
     status.textContent=input.value;
     if(form?.requestSubmit)form.requestSubmit();
     else location.assign('/discover.html?q='+encodeURIComponent(input.value.trim())+'&focus=start&from=jonas');
    }
   };
   r.onerror=function(e){
    if(token!==session||mode!=='voice')return;
    var denied=['not-allowed','service-not-allowed','audio-capture'].includes(e.error);
    stopRecognition();root.classList.remove('jh-listening');mic?.setAttribute('aria-pressed','false');
    statusText(denied?'Microphone unavailable or denied. You can type instead.':'Could not hear you. Tap the microphone to try again.',
     denied?'Microfone indisponível ou sem permissão. Você pode digitar.':'Não consegui ouvir. Toque no microfone para tentar novamente.');
   };
   r.onend=function(){if(token===session){root.classList.remove('jh-listening');mic?.setAttribute('aria-pressed','false')}};
   r.start();
   guard=setTimeout(function(){if(token===session&&mode==='voice'&&!input.value.trim())statusText('Speak now, or tap the microphone to retry.','Fale agora ou toque no microfone para tentar de novo.')},11000);
  }catch(_){statusText('Automatic listening was blocked. Tap the microphone to retry.','A escuta automática foi bloqueada. Toque no microfone para tentar de novo.')}
 }
 function greet(token){
  var message=locale()?.t('greeting')||label("Hi, I'm Jonas. What would you like to discover?","Olá, sou o Jonas. O que você gostaria de descobrir?");
  root.classList.add('jh-greeting');statusText('Jonas is greeting you…','Jonas está dando as boas-vindas…');
  var complete=false,started=false;
  function finish(){
   if(complete)return;complete=true;clearTimeout(timeout);resetMouth();
   root.classList.remove('jh-greeting');
   if(token===session&&mode==='voice')listen(token);
  }
  if(window.MatchAppJonasSpeech){
   window.MatchAppJonasSpeech.unlock();
   window.MatchAppJonasSpeech.speak(message,locale()?.speech()||window.MATCH_LANG||'en',{
    onStart:function(){if(token===session&&mode==='voice')animateMouth()},
    onEnd:function(){if(token===session)finish()},
    onError:function(){if(token===session)statusText('Speech recognition is unavailable here. You can type instead.','Voz indisponível. Você pode digitar.')}
   });
   return;
  }
  // The greeting is visible even if the OS has no usable synthesized voice.
  if(!('speechSynthesis' in window)||!('SpeechSynthesisUtterance' in window)){finish();return;}
  timeout=setTimeout(function(){if(token===session)finish()},11000);
  try{
   // stopVoice already cancelled the previous utterance; calling cancel twice
   // in the same user activation can swallow Chrome/Android's first greeting.
   var lang=locale()?.speech()||(isPt()?'pt-BR':'en-US');
   var selected=voiceFor(lang);
   if(!selected){
    status.textContent=locale()?.t('unsupported')||'A verified masculine voice is unavailable. You can still type or talk.';
    finish();return;
   }
   spoken=new SpeechSynthesisUtterance(message);spoken.lang=lang;
   spoken.voice=selected;
   spoken.rate=.94;spoken.pitch=.85;spoken.volume=1;
   spoken.onstart=function(){if(token===session){started=true;animateMouth()}};
   spoken.onboundary=function(e){if(token!==session||!started)return;var ch=message.charAt(e.charIndex||0).toLowerCase();face(/[oou]/.test(ch)?'oh':/[eiiy]/.test(ch)?'ee':'aa')};
   spoken.onend=finish;spoken.onerror=finish;
   window.speechSynthesis.speak(spoken);
   window.speechSynthesis.resume?.();
  }catch(_){finish()}
 }
 function startVoice(automatic){
  ++session;var token=session;mode='voice';root.dataset.voiceMode='voice';stopVoice();
  if(panel.hidden)return;
  // Requesting a microphone stream while TTS starts ducks/silences Android
  // Chrome audio. Speak first; browser recognition requests permission next.
  if(automatic)greet(token);
  else {statusText('Starting microphone…','Iniciando microfone…');listen(token)}
 }
 root.addEventListener('matchapp:jonas-open',function(){startVoice(true)});
 root.addEventListener('matchapp:jonas-close',function(){++session;mode='idle';stopVoice()});
 root.addEventListener('matchapp:jonas-language',function(){
  if(mode==='voice'&&!panel.hidden){startVoice(true);return}
  if(mode==='text')statusText('Text mode · Voice is off','Modo texto · Voz desativada');
  else statusText('Tap Jonas to talk · or start typing','Toque no Jonas para falar · ou digite');
 });
 mic?.addEventListener('click',function(e){
  e.stopPropagation();
  if(mode==='voice'&&root.classList.contains('jh-listening')){switchToText();return;}
  startVoice(false);
 });
 input?.addEventListener('beforeinput',function(e){if(e.isTrusted)switchToText()});
 input?.addEventListener('keydown',function(e){if(e.isTrusted&&!['Tab','Escape','Enter'].includes(e.key))switchToText()});
 input?.addEventListener('focus',function(e){if(e.isTrusted&&input.value.trim())switchToText()});
 form?.addEventListener('submit',function(){switchToText()});
 document.addEventListener('visibilitychange',function(){if(document.hidden&&!nativeListening){++session;mode='idle';stopVoice()}});
 window.addEventListener('pagehide',function(){++session;mode='idle';stopVoice()});
 statusText('Tap Jonas to talk · or start typing','Toque no Jonas para falar · ou digite');
})();
