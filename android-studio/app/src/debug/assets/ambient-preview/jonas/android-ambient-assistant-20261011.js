/* MatchApp Ai: Android-only floating Jonas. Remote-editable presentation shell.
 * Same-origin /discover.html is the one authenticated, metered chat; no second AI engine.
 * The page beneath the panel never navigates or loses its matching state.
 */
(function(){
 'use strict';
 if(window.top!==window||window.__matchappAmbientJonas||!/^(?:matchapp\.tv|www\.matchapp\.tv|127\.0\.0\.1|localhost)$/i.test(location.hostname))return;
 if(location.pathname.startsWith('/kids'))return;
 // Only the Android app launches this script; explicit local QA opt-in never affects website users.
 if(!/MatchAppAiAndroid\//.test(navigator.userAgent)&&!window.__MATCHAPP_AMBIENT_QA__)return;
 window.__matchappAmbientJonas=true;
 var asset='/jonas/android-ambient-assistant-20261011.css?live='+Date.now(),frame=null,panel=null,root=null,bubble=null;
 var open=false,epoch=0,ready=false,drag=null,skipClick=false,activeTitle='',helloTimer=0;
 var greetStarted=0,greetingFinished=0,pendingListen=0,pendingCloud=0,restoreNativeState=null;
 var key='matchapp_jonas_ambient_position_v1';
 var labels={
  en:{hello:"Hi, I'm Jonas. How can I help?",subject:'I can tell you more about this title.',close:'Close Jonas chat',open:'Talk to Jonas',state:'Your conversation stays over this page'},
  pt:{hello:'Olá, sou o Jonas. Como posso ajudar?',subject:'Posso contar mais sobre este título.',close:'Fechar conversa com Jonas',open:'Conversar com Jonas',state:'Sua conversa fica sobre esta página'},
  es:{hello:'¡Hola! Soy Jonas. ¿Cómo puedo ayudarte?',subject:'Puedo darte más detalles de este título.',close:'Cerrar chat con Jonas',open:'Hablar con Jonas',state:'Tu conversación sigue sobre esta página'},
  fr:{hello:'Bonjour, je suis Jonas. Comment puis-je vous aider ?',subject:'Je peux vous en dire plus sur ce titre.',close:'Fermer la conversation',open:'Parler à Jonas',state:'Votre page reste ouverte'},
  de:{hello:'Hallo, ich bin Jonas. Wie kann ich helfen?',subject:'Ich kann mehr über diesen Titel erzählen.',close:'Chat schließen',open:'Mit Jonas sprechen',state:'Diese Seite bleibt geöffnet'},
  it:{hello:'Ciao, sono Jonas. Come posso aiutarti?',subject:'Posso raccontarti di più su questo titolo.',close:'Chiudi la chat',open:'Parla con Jonas',state:'Questa pagina rimane aperta'},
  tr:{hello:'Merhaba, ben Jonas. Nasıl yardımcı olabilirim?',subject:'Bu yapım hakkında daha fazla bilgi verebilirim.',close:'Sohbeti kapat',open:'Jonas ile konuş',state:'Sayfanız açık kalır'},
  ru:{hello:'Привет, я Йонас. Чем помочь?',subject:'Могу рассказать больше об этом произведении.',close:'Закрыть чат',open:'Поговорить с Йонасом',state:'Страница остаётся открытой'},
  ar:{hello:'مرحباً، أنا جوناس. كيف يمكنني مساعدتك؟',subject:'يمكنني تقديم تفاصيل عن هذا العنوان.',close:'إغلاق المحادثة',open:'تحدث إلى جوناس',state:'ستبقى الصفحة مفتوحة'},
  hi:{hello:'नमस्ते, मैं जोनास हूँ। कैसे मदद करूँ?',subject:'मैं इस शीर्षक के बारे में और बता सकता हूँ।',close:'चैट बंद करें',open:'जोनास से बात करें',state:'आपका पेज खुला रहेगा'},
  id:{hello:'Halo, saya Jonas. Ada yang bisa saya bantu?',subject:'Saya bisa menjelaskan judul ini lebih lanjut.',close:'Tutup obrolan',open:'Bicara dengan Jonas',state:'Halaman Anda tetap terbuka'},
  ja:{hello:'こんにちは、ジョナスです。何をお手伝いしましょうか？',subject:'この作品について詳しく説明できます。',close:'チャットを閉じる',open:'ジョナスと話す',state:'元のページは開いたままです'},
  ko:{hello:'안녕하세요, 조나스입니다. 무엇을 도와드릴까요?',subject:'이 작품에 대해 더 자세히 알려드릴게요.',close:'채팅 닫기',open:'조나스와 대화',state:'현재 페이지는 그대로 유지됩니다'},
  zh:{hello:'你好，我是乔纳斯。有什么可以帮你？',subject:'我可以进一步介绍这部作品。',close:'关闭聊天',open:'与乔纳斯交谈',state:'当前页面将保持打开'}
 };
 function locale(){var s=String(window.MATCH_LANG||document.documentElement.lang||navigator.language||'en').toLowerCase();return labels[s.split('-')[0]]||labels.en}
 function clamp(x,low,high){return Math.max(low,Math.min(high,x))}
 function viewport(){return {width:Math.max(1,window.innerWidth),height:Math.max(1,window.visualViewport?.height||window.innerHeight)}}
 function setPosition(x,y){var v=viewport(),sz=76;root.style.left=clamp(x,8,Math.max(8,v.width-sz-8))+'px';root.style.top=clamp(y,8,Math.max(8,v.height-sz-8))+'px';root.style.right='auto';root.style.bottom='auto'}
 function store(){try{var r=root.getBoundingClientRect(),v=viewport();localStorage.setItem(key,JSON.stringify({x:r.left/Math.max(1,v.width-76),y:r.top/Math.max(1,v.height-76)}))}catch(_){}}
 function restore(){try{var p=JSON.parse(localStorage.getItem(key)||'null');if(Number.isFinite(p?.x)&&Number.isFinite(p?.y)){var v=viewport();setPosition(p.x*(v.width-76),p.y*(v.height-76))}}catch(_){}}
 function visibleResult(){
  var box=document.getElementById('result-box')||document.getElementById('result-card');
  if(!box||box.hidden||getComputedStyle(box).display==='none')return '';
  return String(window.currentMatchIdentity?.title||window.globalMatchTitle||document.getElementById('res-title')?.textContent||'').trim().slice(0,160);
 }
 function contextTitle(){
  var matched=visibleResult();
  if(matched)return matched;
  if(location.pathname==='/discover.html')return String(document.querySelector('#chat-log [data-discover-idx] h3')?.textContent||new URLSearchParams(location.search).get('title')||'').trim().slice(0,160);
  return '';
 }
 function css(){
  if(document.querySelector('link[data-ma-ambient-style]'))return;
  var l=document.createElement('link');l.rel='stylesheet';l.href=asset;l.dataset.maAmbientStyle='1';(document.head||document.documentElement).appendChild(l);
 }
 function stopConversation(){
  clearTimeout(helloTimer);epoch++;pendingListen=0;pendingCloud=0;
  if(restoreNativeState){window.matchAppNativeSpeechState=restoreNativeState.previous;restoreNativeState=null}
  try{window.MatchAppNativeVoice?.stopSpeaking?.()}catch(_){}
  try{frame?.contentWindow?.document?.activeElement?.blur?.()}catch(_){}
  try{frame?.contentWindow?.MatchAppVoiceControls?.stop?.()}catch(_){}
  try{frame?.contentWindow?.MatchAppJonasStage?.stop?.()}catch(_){}
  try{frame?.contentWindow?.MatchAppJonasSpeech?.stop?.()}catch(_){}
  try{window.MatchAppNativeVoice?.stop?.()}catch(_){}
 }
 function greeting(){var l=locale(),intro=l.hello;try{intro=frame?.contentWindow?.MatchAppJonasLocale?.get?.()?.greeting||intro}catch(_){}return activeTitle?intro+' '+l.subject:intro}
 function listen(){
  if(!open||!ready)return;
  try{var w=frame.contentWindow;if(!w||!w.document.getElementById('mic-btn-discover'))return;
    // MatchApp's pre-existing voice-input handler controls native permissions,
    // transcript, AI submit and quota. No independent recognizer.
    var button=w.document.getElementById('mic-btn-discover');
    if(!button.classList.contains('mic-listening'))button.click();
  }catch(_){}
 }
 function restoreSpeakingCallback(){
  if(!restoreNativeState)return;
  window.matchAppNativeSpeechState=restoreNativeState.previous;
  restoreNativeState=null;
 }
 function finishGreeting(token){
  if(!open||token!==epoch||greetingFinished===token)return;
  greetingFinished=token;
  clearTimeout(helloTimer);restoreSpeakingCallback();pendingCloud=0;
  if(!ready){pendingListen=token;return}
  pendingListen=0;listen();
 }
 function cloudGreeting(token){
  if(!open||token!==epoch)return;
  clearTimeout(helloTimer);restoreSpeakingCallback();
  if(!ready){pendingCloud=token;helloTimer=setTimeout(()=>finishGreeting(token),3600);return}
  pendingCloud=0;
  var voice;
  try{
   var w=frame.contentWindow;
   w.MatchAppJonasSpeech?.unlock?.();
   voice=w.MatchAppJonasStage?.speak?.(locale().hello,{autoListen:false,onComplete:()=>finishGreeting(token)});
  }catch(_){}
  if(!voice){helloTimer=setTimeout(()=>finishGreeting(token),120);return}
  // Network speech must not block the next microphone turn for twelve seconds.
  helloTimer=setTimeout(()=>{
   try{frame?.contentWindow?.MatchAppJonasStage?.stop?.()}catch(_){}
   finishGreeting(token);
  },4200);
 }
 function spokenGreeting(token){
  if(!open||token!==epoch||greetStarted===token)return;
  greetStarted=token;
  var bridge=window.MatchAppNativeVoice;
  if(!bridge?.speak){cloudGreeting(token);return}
  var started=false,previous=window.matchAppNativeSpeechState;
  restoreNativeState={previous:previous};
  window.matchAppNativeSpeechState=function(active){
   try{if(typeof previous==='function')previous(active)}catch(_){}
   if(!open||token!==epoch)return;
   if(active){
    started=true;clearTimeout(helloTimer);
    helloTimer=setTimeout(()=>{
     try{bridge.stopSpeaking?.()}catch(_){}
     finishGreeting(token);
    },5500);
   }else if(started){
    finishGreeting(token);
   }else{
    cloudGreeting(token);
   }
  };
  try{
   // Native Android TTS is local and starts without a remote synthesis roundtrip.
   // Kotlin refuses any voice whose masculine identity cannot be verified.
   bridge.speak(locale().hello,String(window.MATCH_LANG||document.documentElement.lang||'en-US'));
  }catch(_){cloudGreeting(token);return}
  helloTimer=setTimeout(()=>{
   if(!started&&open&&token===epoch){
    try{bridge.stopSpeaking?.()}catch(_){}
    cloudGreeting(token);
   }
  },1150);
 }
 function embedStyle(){
  if(!frame?.contentDocument)return;
  try{
   var doc=frame.contentDocument;
   doc.documentElement.classList.add('matchapp-ambient-frame');
   // This embedded chat is not a second MatchApp page. Remove duplicate
   // headers and the oversized voice-stage card, retaining their JS handlers.
   // Inline !important takes precedence over late site layout injections.
   function compactChrome(){
     doc.querySelectorAll('header.app-header,#jonas-voice-stage,.discover-title-row,.ai-session-strip').forEach(function(el){
       if(el.style.getPropertyValue('display')!=='none'||el.style.getPropertyPriority('display')!=='important')
         el.style.setProperty('display','none','important');
     });
   }
   compactChrome();
   // The scoped stylesheet also hides these nodes after late layout scripts.
   // Avoid observing style mutations: site layout routines update them often.
   if(!doc.querySelector('link[data-ma-ambient-embed]')){
     var sheet=doc.createElement('link');sheet.rel='stylesheet';sheet.dataset.maAmbientEmbed='1';
     sheet.href='/jonas/android-ambient-embed-20261011.css?live='+Date.now();doc.head.appendChild(sheet);
   }
  }catch(_){}
 }
 function onFrameLoad(){
  try{if(frame.contentWindow.location.origin!==location.origin||frame.contentWindow.location.pathname!=='/discover.html')return}catch(_){return}
  ready=true;embedStyle();panel.querySelector('.ja-hello').textContent=greeting();
  if(!open)return;
  if(pendingCloud===epoch){cloudGreeting(epoch);return}
  if(pendingListen===epoch){pendingListen=0;listen();return}
  spokenGreeting(epoch);
 }
 function frameUrl(title){
  var u=new URL('/discover.html',location.origin);u.searchParams.set('ambient','1');
  if(title)u.searchParams.set('title',title);
  return u.pathname+u.search;
 }
 function createFrame(title){
  if(frame){frame.remove();frame=null}
  ready=false;
  frame=document.createElement('iframe');frame.id='ma-ambient-chat-frame';
  frame.title='Jonas — MatchApp Ai';frame.allow='microphone';frame.referrerPolicy='same-origin';
  frame.src=frameUrl(title);frame.addEventListener('load',onFrameLoad);
  panel.appendChild(frame);
 }
 function openPanel(){
  if(open)return;
  open=true;epoch++;activeTitle=contextTitle();
  panel.hidden=false;panel.querySelector('.ja-hello').textContent=greeting();
  // Unfold visually from the actual draggable bubble, wherever it is parked.
  var at=bubble.getBoundingClientRect(),box=panel.getBoundingClientRect();
  panel.style.setProperty('--ja-origin-x',Math.round(at.left+at.width/2-box.left)+'px');
  panel.style.setProperty('--ja-origin-y',Math.round(at.top+at.height/2-box.top)+'px');
  panel.querySelector('.ja-head-text span').textContent=locale().state;
  panel.querySelector('.ja-close').ariaLabel=locale().close;
  panel.querySelector('.ja-close').focus({preventScroll:true});
  root.hidden=true;
  // A fresh title selection starts its own source-backed information card.
  // Otherwise the existing iframe remains alive, retaining conversation state.
  if(!frame||frame.dataset.title!==activeTitle){
    createFrame(activeTitle);frame.dataset.title=activeTitle;
  }
  // Speech starts on the tap, not after loading the chat iframe.
  spokenGreeting(epoch);
  document.addEventListener('keydown',escapeKey);
 }
 function closePanel(){
  if(!open)return;
  open=false;stopConversation();
  panel.hidden=true;root.hidden=false;document.removeEventListener('keydown',escapeKey);
  bubble.focus({preventScroll:true});
 }
 function escapeKey(event){if(event.key==='Escape'){event.preventDefault();closePanel()}}
 function handleNative(kind,payload,previous){
  if(!open||!ready||!frame?.contentWindow)return typeof previous==='function'?previous(payload):undefined;
  try{
   var w=frame.contentWindow;
   var callback=w['matchAppNativeVoice'+kind];
   if(typeof callback==='function')return callback(payload);
  }catch(_){}
  return undefined;
 }
 function routeNative(){
  ['Result','Partial','Error'].forEach(function(kind){
   var fn='matchAppNativeVoice'+kind,prev=window[fn];
   window[fn]=function(value){return handleNative(kind,value,prev)};
  });
 }
 function removeLegacyJonas(){
  // One assistant entry point on Android, never an additional home/inline dock.
  if(location.pathname!=='/' && location.pathname!=='/index.html')return;
  document.querySelectorAll('#ma-ai-entry,#ma-jonas-inline-dock,#ma-jonas-home,.ma-jonas-web-entry,#matchapp-android-avatar-launcher').forEach(function(el){
    el.style.setProperty('display','none','important');
    el.setAttribute('aria-hidden','true');
  });
 }
 function build(){
  css();
  removeLegacyJonas();
  document.addEventListener('matchapp:authchange',removeLegacyJonas);
  root=document.createElement('div');root.id='ma-ambient-jonas';
  root.innerHTML='<button type="button" class="ja-bubble" aria-label="Talk to Jonas" aria-haspopup="dialog"><img src="/jonas/faces/jonas/rest.jpg" alt=""><span class="ja-live" aria-hidden="true"></span></button>';
  bubble=root.firstElementChild;
  panel=document.createElement('section');panel.id='ma-ambient-panel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Jonas conversation');
  panel.innerHTML='<div class="ja-panel-head"><img class="ja-face" src="/jonas/faces/jonas/rest.jpg" alt=""><div class="ja-head-text"><strong>Jonas</strong><span></span></div><button type="button" class="ja-close" aria-label="Close Jonas conversation">×</button></div><p class="ja-hello"></p>';
  document.body.append(root,panel);
  bubble.setAttribute('aria-label',locale().open);
  bubble.addEventListener('pointerdown',function(e){
    if(e.button!==0&&e.pointerType==='mouse')return;
    var r=root.getBoundingClientRect();drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,x:r.left,y:r.top,moved:false};
    bubble.setPointerCapture?.(e.pointerId);
  });
  bubble.addEventListener('pointermove',function(e){
    if(!drag||drag.id!==e.pointerId)return;
    var dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;
    if(!drag.moved&&Math.hypot(dx,dy)<9)return;
    drag.moved=true;setPosition(drag.x+dx,drag.y+dy);
  });
  function end(e){
    if(!drag||drag.id!==e.pointerId)return;
    if(drag.moved){skipClick=true;store();setTimeout(function(){skipClick=false},240);}
    drag=null;
  }
  bubble.addEventListener('pointerup',end);bubble.addEventListener('pointercancel',end);
  bubble.addEventListener('click',function(){if(skipClick){skipClick=false;return}openPanel()});
  panel.querySelector('.ja-close').addEventListener('click',closePanel);
  window.addEventListener('resize',function(){var r=root.getBoundingClientRect();if(root.style.left)setPosition(r.left,r.top)},{passive:true});
  window.addEventListener('pagehide',stopConversation);
  window.addEventListener('matchapp:language-changed',function(){bubble.ariaLabel=locale().open});
  routeNative();restore();
  // Keep Jonas dormant/lightweight. Native greeting happens on tap while
  // the single conversation frame initializes only when the user opens it.
  window.MatchAppAmbientJonas=Object.freeze({open:openPanel,close:closePanel,getContext:contextTitle,isOpen:()=>open});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build,{once:true});else build();
})();
