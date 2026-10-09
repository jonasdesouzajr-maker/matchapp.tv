/* Jonas: greeting + mic opt-in from a real tap; typing always wins.
   The recognized query goes through the original authenticated MatchApp Ai route.
   No API keys, parallel AI engine, or background recording. */
(function(){
 'use strict';
 var root=document.getElementById('ma-jonas-home'),panel=document.getElementById('ma-jonas-home-panel');
 if(!root||!panel||window.MATCHAPP_ANDROID||window.__matchappJonasVoice)return;
 window.__matchappJonasVoice=true;
 var input=root.querySelector('#ma-jonas-home-input'),form=root.querySelector('.jh-form');
 var mic=root.querySelector('#ma-jonas-home-mic'),status=root.querySelector('#ma-jonas-home-status');
 var recognition=null,mode='idle',session=0,spoken=null,timeout=0,guard=0;
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
  try{if(spoken&&'speechSynthesis' in window)window.speechSynthesis.cancel()}catch(_){}
  spoken=null;
  root.classList.remove('jh-listening','jh-greeting');
  if(mic){mic.setAttribute('aria-pressed','false');mic.title=label('Start voice input','Iniciar entrada por voz')}
 }
 function switchToText(){
  if(mode==='text')return;
  ++session;mode='text';stopVoice();
  root.dataset.voiceMode='text';
  statusText('Text mode · Voice is off','Modo texto · Voz desativada');
 }
 function listen(token){
  if(token!==session||mode!=='voice'||panel.hidden)return;
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
     ++session;mode='idle';stopVoice();
     status.textContent=input.value;
     if(form?.requestSubmit)form.requestSubmit();
     else location.assign('/discover.html?q='+encodeURIComponent(input.value.trim())+'&focus=start');
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
  var complete=false;
  function finish(){if(complete)return;complete=true;root.classList.remove('jh-greeting');if(token===session&&mode==='voice')listen(token)}
  timeout=setTimeout(finish,4500);
  if(!('speechSynthesis' in window)||!('SpeechSynthesisUtterance' in window)){finish();return;}
  try{
   window.speechSynthesis.cancel();
   spoken=new SpeechSynthesisUtterance(message);spoken.lang=locale()?.speech()||(isPt()?'pt-BR':'en-US');
   var voices=window.speechSynthesis.getVoices?.()||[];
   var best=voices.find(function(v){return v.lang.toLowerCase()===spoken.lang.toLowerCase()})||voices.find(function(v){return v.lang.split('-')[0].toLowerCase()===spoken.lang.split('-')[0].toLowerCase()});
   if(best)spoken.voice=best;
   spoken.rate=.95;spoken.pitch=1;spoken.onend=finish;spoken.onerror=finish;
   window.speechSynthesis.speak(spoken);
  }catch(_){finish()}
 }
 function startVoice(automatic){
  ++session;var token=session;mode='voice';root.dataset.voiceMode='voice';stopVoice();
  if(!panel.hidden){
   // Permission request originates from the actual avatar tap. The temporary
   // stream is released immediately: speech recognition owns recording thereafter.
   if(automatic&&navigator.mediaDevices?.getUserMedia){
    try{navigator.mediaDevices.getUserMedia({audio:true}).then(function(stream){
      stream.getTracks().forEach(function(t){t.stop()});
    }).catch(function(){if(token===session&&mode==='voice')statusText('Please allow microphone access, or type instead.','Permita acesso ao microfone ou digite.')});}catch(_){}
   }
   if(automatic)greet(token);
   else {statusText('Starting microphone…','Iniciando microfone…');listen(token)}
  }
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
 document.addEventListener('visibilitychange',function(){if(document.hidden){++session;mode='idle';stopVoice()}});
 window.addEventListener('pagehide',function(){++session;mode='idle';stopVoice()});
 statusText('Tap Jonas to talk · or start typing','Toque no Jonas para falar · ou digite');
})();
