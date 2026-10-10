/* Persistent Jonas on the actual Discovery conversation, not only Home.
 * Reuses existing AI, credit, TTS and microphone flows. No new credentials. */
(function(){
'use strict';
if(window.MatchAppJonasStage || !/\/discover\.html$/.test(location.pathname))return;
const home=document.querySelector('.discover-head'),log=document.getElementById('chat-log'),input=document.getElementById('discover-new-input');
if(!home||!log||!input)return;
const base='/jonas/faces/jonas/';
const names=['rest','aa','ee','oh','blink'];
const frames={};
names.forEach(n=>{let i=new Image();i.src=base+n+'.jpg';frames[n]=i;});
const el=document.createElement('section');
el.id='jonas-voice-stage';
el.className='jonas-voice-stage';
el.setAttribute('aria-label','Jonas speaking avatar');
el.innerHTML='<div class="jds-portrait" aria-hidden="true"><img class="jds-rest" src="'+base+'rest.jpg" alt=""><img class="jds-mouth" alt="" aria-hidden="true"><img class="jds-eyes" src="'+base+'blink.jpg" alt="" aria-hidden="true"><span class="jds-halo"></span></div>'+
'<div class="jds-copy"><strong>Jonas <span class="jds-indicator" aria-hidden="true"></span></strong><span class="jds-state" id="jds-state" role="status" aria-live="polite"></span></div>'+
'<button type="button" id="jds-microphone" class="jds-mic" aria-label="Speak with Jonas" title="Speak with Jonas"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M5 10.5a7 7 0 0 0 14 0M12 17.5V22M8 22h8"/></svg></button>';
home.insertBefore(el,log);
const mouth=el.querySelector('.jds-mouth'),eyes=el.querySelector('.jds-eyes'),status=el.querySelector('.jds-state'),mic=el.querySelector('#jds-microphone');
let active=false,timer=0,raf=0,voiceTurn=new URLSearchParams(location.search).get('from')==='jonas',level=0,frame='rest';
let meterLevel=0,meterAt=0,lastFrameAt=0,silenceAt=0,blinkTimer=0,blinkCloseTimer=0;
const SILENCE_GATE=.05,PHRASE_PAUSE_MS=190,FRAME_HOLD_MS=115;
const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||false;
const words={
'en':['Ready to listen','Jonas is speaking','Listening... speak now','Thinking about your question'],
'pt':['Pronto para ouvir','Jonas está falando','Ouvindo... pode falar','Pensando na sua pergunta'],
'es':['Listo para escuchar','Jonas está hablando','Escuchando... habla ahora','Pensando en tu pregunta'],
'fr':['Prêt à écouter','Jonas parle','Écoute en cours...','Je réfléchis à votre question'],
'de':['Bereit zuzuhören','Jonas spricht','Ich höre zu...','Ich denke nach'],
'it':['Pronto ad ascoltare','Jonas sta parlando','Ti ascolto...','Sto pensando'],
'ja':['お話をどうぞ','Jonasが話しています','聞いています','考えています'],
'ko':['들을 준비가 됐어요','Jonas가 말하고 있어요','듣고 있어요','생각하고 있어요'],
'tr':['Dinlemeye hazırım','Jonas konuşuyor','Dinliyorum... konuşabilirsiniz','Sorunuzu düşünüyorum'],
'ru':['Готов слушать','Йонас говорит','Слушаю... говорите','Обдумываю ваш вопрос'],
'ar':['جاهز للاستماع','يوناس يتحدث','أستمع إليك الآن','أفكر في سؤالك'],
'hi':['सुनने के लिए तैयार','जोनास बोल रहा है','सुन रहा हूँ... बोलिए','आपके प्रश्न पर विचार कर रहा हूँ'],
'id':['Siap mendengarkan','Jonas sedang berbicara','Mendengarkan... silakan bicara','Sedang memikirkan pertanyaan Anda'],
'zh':['准备聆听','Jonas 正在说话','正在聆听，请说话','正在思考你的问题']
};
function labels(){const l=String(window.MATCH_LANG||document.documentElement.lang||navigator.language||'en').toLowerCase();return words[l.split('-')[0]]||words.en}
function change(state){el.dataset.state=state;status.textContent=labels()[{idle:0,speaking:1,listening:2,thinking:3}[state]??0];mic.setAttribute('aria-pressed',String(state==='listening'))}
function showFrame(name){
 if(frame===name)return;
 let i=frames[name];
 if(!i||!i.complete||!i.naturalWidth)return;
 frame=name;
 if(name==='rest'){mouth.style.opacity='0';return}
 mouth.src=i.src;
 mouth.style.opacity='1';
}
function animate(now){
 if(!active)return;
 // Real decoded audio levels drive speech. A stale or absent meter is silence,
 // never an endless artificial sine-wave mouth cycle.
 const raw=now-meterAt<200?meterLevel:0;
 level+=(raw-level)*(raw>level?.22:.15);
 if(level<SILENCE_GATE){if(!silenceAt)silenceAt=now}
 else silenceAt=0;
 const quietFor=silenceAt?now-silenceAt:0;
 const next=quietFor>=PHRASE_PAUSE_MS?'rest'
  :level>=.34?'aa':level>=.16?'oh':level>=SILENCE_GATE?'ee':'rest';
 if(now-lastFrameAt>=FRAME_HOLD_MS && frame!==next){
  showFrame(next);
  lastFrameAt=now;
 }
 el.style.setProperty('--jds-pulse',String(Math.min(.68,level*.7)));
 raf=requestAnimationFrame(animate);
}
function scheduleBlink(){
 clearTimeout(blinkTimer);
 if(reducedMotion)return;
 // Longer, unpatterned breaks between natural, brief eyelid closures.
 const delay=(el.dataset.state==='speaking'?3500:2800)+Math.random()*2800;
 blinkTimer=setTimeout(function(){
  if(!document.hidden && eyes?.complete && eyes.naturalWidth){
   eyes.style.opacity='1';
   clearTimeout(blinkCloseTimer);
   blinkCloseTimer=setTimeout(()=>{eyes.style.opacity='0'},145);
  }
  scheduleBlink();
 },delay);
}
function stopMotion(){
 active=false;cancelAnimationFrame(raf);raf=0;
 level=0;meterLevel=0;meterAt=0;silenceAt=0;lastFrameAt=0;
 showFrame('rest');el.style.setProperty('--jds-pulse','0');
}
function beginSpeaking(){
 clearTimeout(timer);stopMotion();
 active=true;change('speaking');raf=requestAnimationFrame(animate);
}
function endSpeaking(auto){
 stopMotion();change('idle');
 if(auto && voiceTurn && !document.hidden)timer=setTimeout(()=>{if(voiceTurn && document.activeElement!==input)mic.click()},750);
}
function speak(text,opts){
 clearTimeout(timer);voiceTurn=opts?.autoListen===true;
 let x=String(text||'').trim();
 if(!x)return Promise.resolve(false);
 const service=window.MatchAppJonasSpeech;
 if(!service?.speak){change('idle');return Promise.resolve(false)}
 change('thinking');
 return service.speak(x,window.MatchAppJonasLocale?.speech?.()||window.MATCH_LANG||'en',{
  onStart:beginSpeaking,
  onLevel:v=>{if(Number.isFinite(v)){meterLevel=Math.min(1,Math.max(0,v));meterAt=performance.now()} },
  onEnd:ok=>endSpeaking(ok&&opts?.autoListen===true),
  onError:()=>endSpeaking(false)
 }).catch(()=>{endSpeaking(false);return false});
}
mic.addEventListener('click',()=>{voiceTurn=true;stopMotion();change('listening');document.getElementById('mic-btn-discover')?.click()});
input.addEventListener('input',event=>{if(event.isTrusted){voiceTurn=false;clearTimeout(timer);}},true);
input.addEventListener('focus',()=>{voiceTurn=false;clearTimeout(timer)});
document.addEventListener('matchapp:voice-state',event=>{const s=event.detail?.state;if(s==='listening'){voiceTurn=true;change('listening')}else if(s==='idle'&&el.dataset.state==='listening')change('idle')});
document.addEventListener('matchapp:voice-transcript',()=>{voiceTurn=true;change('thinking')});
document.addEventListener('matchapp:voice-error',()=>{change('idle')});
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){clearTimeout(timer);stopMotion();clearTimeout(blinkTimer);clearTimeout(blinkCloseTimer);eyes.style.opacity='0'}
 else {if(el.dataset.state==='speaking')change('idle');scheduleBlink()}
});
window.addEventListener('matchapp:languagechange',()=>change(el.dataset.state||'idle'));
window.MatchAppJonasStage={speak,stop:()=>{clearTimeout(timer);window.MatchAppJonasSpeech?.stop?.();endSpeaking(false)},activateVoice:()=>{voiceTurn=true},el};
change('idle');
scheduleBlink();
})();