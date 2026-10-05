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

const VOICE_ORIGIN_KEY='matchapp_voice_origin_v1';
const VOICE_ORIGIN_TTL=120000;
function voiceScope(){return location.pathname.startsWith('/kids')?'kids':'adult';}
function normVoiceText(value){return String(value||'').trim().replace(/\s+/g,' ').toLocaleLowerCase();}
function readVoiceOrigin(){
  try{
    const row=JSON.parse(sessionStorage.getItem(VOICE_ORIGIN_KEY)||'null');
    if(!row||row.scope!==voiceScope()||Date.now()-Number(row.at||0)>VOICE_ORIGIN_TTL){
      sessionStorage.removeItem(VOICE_ORIGIN_KEY);return null;
    }
    return row;
  }catch(_){return null;}
}
function markVoiceOrigin(inputId,text){
  try{sessionStorage.setItem(VOICE_ORIGIN_KEY,JSON.stringify({inputId:String(inputId||''),text:String(text||''),scope:voiceScope(),at:Date.now()}));}catch(_){}
}
function clearVoiceOrigin(inputId){
  try{
    const row=readVoiceOrigin();
    if(!row||!inputId||row.inputId===inputId)sessionStorage.removeItem(VOICE_ORIGIN_KEY);
  }catch(_){}
}
function consumeVoiceOrigin(text){
  const row=readVoiceOrigin();
  if(!row)return false;
  const matches=normVoiceText(row.text)===normVoiceText(text);
  try{sessionStorage.removeItem(VOICE_ORIGIN_KEY);}catch(_){}
  return matches;
}
window.MatchAppVoiceOrigin=Object.freeze({consume:consumeVoiceOrigin,clear:clearVoiceOrigin,peek:()=>readVoiceOrigin()});

function nativeVoiceAvailable(){
  try{return !!(window.MatchAppNativeVoice && typeof window.MatchAppNativeVoice.start === 'function');}
  catch(_){return false;}
}
function activeSpeechLang(){return SPEECH_LANG_MAP[window.MATCH_LANG] || 'en-US';}

/* Keep recognizer wording and existing device punctuation. */
function punctuateSpeech(value,lang){
  let text=String(value||'').trim().replace(/\s+/g,' ');
  const commands=lang==='pt-BR'
    ? [[/\b(?:ponto de interrogação)\b/gi,'?'],[/\b(?:ponto de exclamação)\b/gi,'!'],[/\b(?:vírgula)\b/gi,','],[/\b(?:ponto final)\b/gi,'.']]
    : lang==='en' ? [[/\bquestion mark\b/gi,'?'],[/\bexclamation (?:mark|point)\b/gi,'!'],[/\bcomma\b/gi,','],[/\bfull stop\b/gi,'.']] : [];
  for(const [pattern,mark] of commands)text=text.replace(pattern,mark);
  text=text.replace(/\s+([,.;:!?])/g,'$1').replace(/([,;:!?])(?=[\p{L}\p{N}])/gu,'$1 ');
  text=text.replace(/(^|[.!?]\s+)(\p{L})/gu,(_,before,letter)=>before+letter.toLocaleUpperCase(lang||'en'));
  if(text&&!/[.!?。！？…]$/.test(text)){
    const question=lang==='pt-BR'
      ? /^(?:o que|qual|quais|quem|onde|quando|como|por que|quanto|quantos|quantas)\b/i.test(text)
      : lang==='en' ? /^(?:what|which|who|where|when|why|how|can you|could you|is there|are there|do you|does)\b/i.test(text) : false;
    text+=(question?'?':/^(?:ja|zh)/.test(lang||'')?'。':'.');
  }
  return text;
}
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
  const audioOnlyKids=inputId==='kids-question';
  const voiceEvent=(name,detail={})=>{try{document.dispatchEvent(new CustomEvent(name,{detail:{inputId,...detail}}))}catch(_){}};
  const enhanced=!location.pathname.startsWith('/kids/') &&
    (inputId==='specific-search-input'||inputId==='discover-new-input');
  let prefix='',finalText='',interimText='',cancelled=false;
  function paintTranscript(value){
    input.value=value;
    input.dispatchEvent(new Event('input',{bubbles:true}));
    grow();
    input.scrollTop=input.scrollHeight;
  }
  const originalPlaceholder=input.getAttribute('placeholder')||'';

  function tr(key,fallback){return (typeof t==='function'&&t(key))||fallback;}
  function grow(){if(window.autoGrowComposer)window.autoGrowComposer();}
  function finish(){
    const wasListening=listening;
    listening=false;
    micBtn.classList.remove('mic-listening');
    input.placeholder=originalPlaceholder;
    if(wasListening)voiceEvent('matchapp:voice-state',{state:'idle'});
  }
  function begin(){
    if(enhanced){prefix=input.value.trim();finalText='';interimText='';cancelled=false;}
    listening=true;
    micBtn.classList.add('mic-listening');
    input.placeholder=tr('voice.listening','🎙️ Listening... speak now');
    voiceEvent('matchapp:voice-state',{state:'listening'});
  }
  function acceptTranscript(value){
    const raw=String(value||'').trim();
    if(!raw||(enhanced&&cancelled)){finish();return;}
    const spoken=enhanced?punctuateSpeech(raw,window.MATCH_LANG||'en'):raw;
    const transcript=enhanced&&spoken?[prefix,spoken].filter(Boolean).join(' '):spoken;
    if(!transcript){finish();return;}
    if(enhanced)paintTranscript(transcript);else{input.value=transcript;grow();}
    finish();
    // Voice is a first-class input path: do not focus the textarea here.
    // On mobile, focusing it after dictation opens the software keyboard and
    // covers the conversation even though the user chose the microphone.
    markVoiceOrigin(inputId,transcript);
    voiceEvent('matchapp:voice-transcript',{text:transcript,voiceOrigin:true});
    if(onFinalTranscript)onFinalTranscript(transcript);
  }
  function showError(code){
    finish();
    voiceEvent('matchapp:voice-error',{code:String(code||'unavailable')});
    if(audioOnlyKids)return;
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

  input.addEventListener('input',event=>{
    if(!event.isTrusted)return;
    clearVoiceOrigin(inputId);
    if(!enhanced||!listening)return;
    cancelled=true;
    try{recognition?.abort();}catch(_){}
    finish();
  });

  micBtn.addEventListener('click',()=>{
    if(listening&&recognition){
      try{recognition.stop();}catch(_){}
      if(!enhanced)finish();
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
      if(!enhanced)input.value='';
      grow();
    };
    recognition.onresult=e=>{
      if(enhanced){
        if(cancelled)return;
        const finals=[],interims=[];
        // Rebuild all results: resultIndex only identifies changed entries.
        for(let i=0;i<e.results.length;i++){
          const words=e.results[i][0].transcript.trim();
          (e.results[i].isFinal?finals:interims).push(words);
        }
        finalText=finals.join(' ');interimText=interims.join(' ');
        paintTranscript([prefix,finalText,interimText].filter(Boolean).join(' '));
      }else{
        let interim='',final='';
        for(let i=e.resultIndex;i<e.results.length;i++){
          const transcript=e.results[i][0].transcript;
          if(e.results[i].isFinal)final+=transcript;else interim+=transcript;
        }
        input.value=final||interim;
        grow();
        if(final.trim())acceptTranscript(final);
      }
    };
    recognition.onerror=e=>showError(e.error||'unavailable');
    recognition.onend=()=>{
      if(enhanced&&listening&&!cancelled&&finalText.trim())acceptTranscript(finalText);
      else if(listening)finish();
    };

    try{recognition.start();}
    catch(_){showError('unavailable');}
  });
}

window.initVoiceInput=initVoiceInput;
window.VOICE_INPUT_SUPPORTED=!!SR || nativeVoiceAvailable();
window.MATCHAPP_SPEECH_LANG_MAP=SPEECH_LANG_MAP;
})();
