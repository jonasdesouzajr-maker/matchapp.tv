/* Floating Luma voice assistant — Kids Mode only. */
(function(){'use strict';
if(window.__matchappLumiAssistant)return;window.__matchappLumiAssistant=true;
const POS_KEY='match_kids_lumi_assistant_pos',VOICE_KEY='match_kids_lumi_voice';
let host=null,state='idle',heard=false,suppressClickUntil=0,listenTimer=0,promptTimer=0;
function api(){return window.MatchAppLumi||null}
function tr(key,fallback){try{return api()?.t?.(key)||fallback}catch(_){return fallback}}
function setState(next){state=next||'idle';if(host)host.dataset.state=state}
function stopTimers(){clearTimeout(listenTimer);clearTimeout(promptTimer);listenTimer=promptTimer=0}
function speak(text,done){const a=api();if(!a?.speak)return false;return !!a.speak(text,done)}
function enableVoice(){try{localStorage.setItem(VOICE_KEY,'true')}catch(_){}try{api()?.enable?.()}catch(_){}}
function nativeRecognizer(){try{return typeof window.MatchAppNativeVoice?.start==='function'}catch(_){return false}}
async function primeMic(){
  if(nativeRecognizer()||!navigator.mediaDevices?.getUserMedia)return true;
  try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});stream.getTracks().forEach(t=>t.stop());return true}catch(_){return false}
}
function speakError(key,fallback){
  stopTimers();setState('speaking');
  const ok=speak(tr(key,fallback),()=>setState('idle'));if(!ok)setState('idle');
}
function startListening(){
  stopTimers();const mic=document.getElementById('kids-mic'),input=document.getElementById('kids-question');
  if(!mic||!input){speakError('voiceUnavailable','Voice listening is not available on this device.');return}
  heard=false;input.value='';setState('listening');
  try{mic.click()}catch(_){speakError('voiceUnavailable','Voice listening is not available on this device.');return}
  listenTimer=setTimeout(()=>{if(state==='listening'&&!heard)speakError('noSpeech',"I didn't catch that. Tap me and try again!")},18000);
}
async function activate(){
  if(state==='thinking')return;
  stopTimers();try{api()?.stop?.()}catch(_){}
  enableVoice();setState('prompt');
  let started=false;
  const listen=async()=>{if(started)return;started=true;const allowed=await primeMic();if(!allowed){speakError('micDenied','I need microphone permission to hear you.');return}startListening()};
  const spoken=speak(tr('askQuestion','Ask your question!'),listen);
  if(!spoken){listen();return}
  promptTimer=setTimeout(listen,4200);
}
function clamp(n,min,max){return Math.min(Math.max(n,min),Math.max(min,max))}
function bounds(){
  const r=host?.getBoundingClientRect();const w=r?.width||78,h=r?.height||78;
  const pad=10,topPad=Math.max(10,Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-top'))||10);
  return{w,h,minX:pad,maxX:Math.max(pad,innerWidth-w-pad),minY:topPad,maxY:Math.max(topPad,innerHeight-h-pad)}
}
function readPos(){try{const p=JSON.parse(localStorage.getItem(POS_KEY)||'null');return p&&Number.isFinite(p.x)&&Number.isFinite(p.y)?p:null}catch(_){return null}}
function placeStored(){
  if(!host)return;const p=readPos();if(!p)return;
  const b=bounds();host.style.right='auto';host.style.bottom='auto';
  host.style.left=clamp(b.minX+p.x*(b.maxX-b.minX),b.minX,b.maxX)+'px';
  host.style.top=clamp(b.minY+p.y*(b.maxY-b.minY),b.minY,b.maxY)+'px';
}
function savePos(){
  if(!host)return;const r=host.getBoundingClientRect(),b=bounds();
  const x=(clamp(r.left,b.minX,b.maxX)-b.minX)/Math.max(1,b.maxX-b.minX);
  const y=(clamp(r.top,b.minY,b.maxY)-b.minY)/Math.max(1,b.maxY-b.minY);
  try{localStorage.setItem(POS_KEY,JSON.stringify({x,y}))}catch(_){}
}
function installDrag(){
  let pointerId=null,startX=0,startY=0,left=0,top=0,dragged=false;
  host.addEventListener('pointerdown',e=>{
    if(e.button!==undefined&&e.button!==0)return;
    const r=host.getBoundingClientRect();pointerId=e.pointerId;startX=e.clientX;startY=e.clientY;left=r.left;top=r.top;dragged=false;
    try{host.setPointerCapture(pointerId)}catch(_){}
  });
  host.addEventListener('pointermove',e=>{
    if(pointerId!==e.pointerId)return;const dx=e.clientX-startX,dy=e.clientY-startY;
    if(!dragged&&Math.hypot(dx,dy)<6)return;dragged=true;host.classList.add('is-dragging');e.preventDefault();
    const b=bounds();host.style.right='auto';host.style.bottom='auto';
    host.style.left=clamp(left+dx,b.minX,b.maxX)+'px';host.style.top=clamp(top+dy,b.minY,b.maxY)+'px';
  });
  const finish=e=>{
    if(pointerId!==e.pointerId)return;try{host.releasePointerCapture(pointerId)}catch(_){}
    pointerId=null;host.classList.remove('is-dragging');if(dragged){savePos();suppressClickUntil=Date.now()+400}
  };
  host.addEventListener('pointerup',finish);host.addEventListener('pointercancel',finish);
}
function installEvents(){
  document.addEventListener('matchapp:voice-state',e=>{
    if(e.detail?.inputId!=='kids-question')return;
    if(e.detail.state==='listening'){heard=false;setState('listening');return}
    if(e.detail.state==='idle'&&state==='listening'){
      clearTimeout(listenTimer);listenTimer=0;
      setTimeout(()=>{if(state==='idle'&&!heard)speakError('noSpeech',"I didn't catch that. Tap me and try again!")},120);
      setState('idle');
    }
  });
  document.addEventListener('matchapp:voice-transcript',e=>{
    if(e.detail?.inputId!=='kids-question')return;heard=!!String(e.detail?.text||'').trim();clearTimeout(listenTimer);listenTimer=0;if(heard)setState('thinking');
  });
  document.addEventListener('matchapp:voice-error',e=>{
    if(e.detail?.inputId!=='kids-question')return;
    const code=String(e.detail?.code||'');
    speakError(/not-allowed|permission|service-not-allowed/.test(code)?'micDenied':'voiceUnavailable',/not-allowed|permission|service-not-allowed/.test(code)?'I need microphone permission to hear you.':'Voice listening is not available on this device.');
  });
  document.getElementById('kids-ask-form')?.addEventListener('submit',()=>{clearTimeout(listenTimer);listenTimer=0;setState('thinking')},true);
  document.addEventListener('matchapp:kids-ai-result',e=>{
    const text=String(e.detail?.speech||e.detail?.answer||e.detail?.title||'').trim();if(!text){setState('idle');return}
    setState('speaking');const full=(tr('asked',"Here's a safe idea.")+' '+text).trim();const ok=speak(full,()=>setState('idle'));if(!ok)setState('idle');
  });
  document.addEventListener('matchapp:kids-ai-error',e=>{
    const text=String(e.detail?.text||'').trim();if(!text){setState('idle');return}
    setState('speaking');const ok=speak(text,()=>setState('idle'));if(!ok)setState('idle');
  });
  document.addEventListener('matchapp:kids-quota-empty',()=>{
    setState('speaking');const ok=speak(tr('empty','Adventure power is empty. A grown-up can add more.'),()=>setState('idle'));if(!ok)setState('idle');
  });
  addEventListener('resize',placeStored,{passive:true});try{visualViewport?.addEventListener?.('resize',placeStored,{passive:true})}catch(_){}
}
function boot(){
  if(!document.body.classList.contains('page-kids'))return;
  host=document.createElement('button');host.id='kids-lumi-assistant';host.type='button';host.dataset.state='idle';
  host.setAttribute('aria-label',tr('assistantLabel','Ask Luma a question by voice'));
  host.innerHTML='<span class="kids-lumi-assistant-ring" aria-hidden="true"></span><span class="kids-lumi-assistant-body"><img src="/kids/lumi.svg?v=20261002-luma1" alt="" width="96" height="96" draggable="false"><span class="kids-lumi-assistant-wave" aria-hidden="true"><i></i><i></i><i></i></span><span class="kids-lumi-assistant-mic" aria-hidden="true">🎙️</span></span>';
  document.body.appendChild(host);installDrag();installEvents();placeStored();
  host.addEventListener('click',()=>{if(Date.now()<suppressClickUntil)return;activate()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();