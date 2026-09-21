/* ============================================================
   © 2026 MatchApp.tv — All Rights Reserved.
   MatchApp voice input: browser SpeechRecognition with a native
   Android speech-recognizer fallback when running inside the apps.
   ============================================================ */
(function(){
'use strict';

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const SPEECH_LANG_MAP = {
  'en':'en-US','pt-BR':'pt-BR','es':'es-ES','fr':'fr-FR','de':'de-DE',
  'it':'it-IT','tr':'tr-TR','ru':'ru-RU','ar':'ar-SA','hi':'hi-IN',
  'id':'id-ID','ja':'ja-JP','ko':'ko-KR','zh':'zh-CN'
};

function nativeVoiceAvailable(){
  try{return !!(window.MatchAppNativeVoice && typeof window.MatchAppNativeVoice.start === 'function');}
  catch(_){return false;}
}
function activeSpeechLang(){return SPEECH_LANG_MAP[window.MATCH_LANG] || 'en-US';}

function initVoiceInput(inputId,micBtnId,onFinalTranscript){
  const input=document.getElementById(inputId);
  const micBtn=document.getElementById(micBtnId);
  if(!input||!micBtn)return;

  const supported=!!SR || nativeVoiceAvailable();
  micBtn.style.display='inline-flex';
  micBtn.style.visibility='visible';
  micBtn.setAttribute('aria-disabled',supported?'false':'true');

  let recognition=null;
  let listening=false;
  const originalPlaceholder=input.getAttribute('placeholder')||'';

  function tr(key,fallback){return (typeof t==='function'&&t(key))||fallback;}
  function grow(){if(window.autoGrowComposer)window.autoGrowComposer();}
  function finish(){
    listening=false;
    micBtn.classList.remove('mic-listening');
    input.placeholder=originalPlaceholder;
  }
  function begin(){
    listening=true;
    micBtn.classList.add('mic-listening');
    input.placeholder=tr('voice.listening','🎙️ Listening... speak now');
  }
  function acceptTranscript(value){
    const transcript=String(value||'').trim();
    if(!transcript){finish();return;}
    input.value=transcript;
    grow();
    finish();
    input.focus();
    if(onFinalTranscript)onFinalTranscript(transcript);
  }
  function showError(code){
    finish();
    if(code==='not-allowed'||code==='permission-denied'||code==='service-not-allowed'){
      if(window.showToast)showToast(tr('voice.micDenied','🎙️ Microphone access was blocked — check your microphone permission.'),true);
    }else if(code==='no-speech'){
      if(window.showToast)showToast(tr('voice.noSpeech',"Didn't catch that — try again."),true);
    }else if(window.showToast){
      showToast(tr('voice.unavailable','Voice input is not available on this device.'),true);
    }
  }

  /* Android apps call these after the device recognizer closes. */
  window.matchAppNativeVoiceResult=acceptTranscript;
  window.matchAppNativeVoiceError=showError;

  micBtn.addEventListener('click',()=>{
    if(listening&&recognition){
      try{recognition.stop();}catch(_){}
      finish();
      return;
    }

    if(nativeVoiceAvailable()){
      begin();
      try{window.MatchAppNativeVoice.start(activeSpeechLang());}
      catch(_){showError('unavailable');}
      return;
    }

    if(!SR){
      showError('unavailable');
      return;
    }

    recognition=new SR();
    recognition.lang=activeSpeechLang();
    recognition.interimResults=true;
    recognition.continuous=false;
    recognition.maxAlternatives=1;

    recognition.onstart=()=>{
      begin();
      input.value='';
      grow();
    };
    recognition.onresult=e=>{
      let interim='',final='';
      for(let i=e.resultIndex;i<e.results.length;i++){
        const transcript=e.results[i][0].transcript;
        if(e.results[i].isFinal)final+=transcript;else interim+=transcript;
      }
      input.value=final||interim;
      grow();
      if(final.trim())acceptTranscript(final);
    };
    recognition.onerror=e=>showError(e.error||'unavailable');
    recognition.onend=()=>{if(listening)finish();};

    try{recognition.start();}
    catch(_){showError('unavailable');}
  });
}

window.initVoiceInput=initVoiceInput;
window.VOICE_INPUT_SUPPORTED=!!SR || nativeVoiceAvailable();
window.MATCHAPP_SPEECH_LANG_MAP=SPEECH_LANG_MAP;
})();
