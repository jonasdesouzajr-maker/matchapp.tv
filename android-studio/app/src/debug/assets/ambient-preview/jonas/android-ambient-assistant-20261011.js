/* MatchApp Ai: Android-only floating Jonas. Remote-editable presentation shell.
 * Same-origin /discover.html is the one authenticated, metered chat; no second AI engine.
 * The page beneath the panel never navigates or loses its matching state.
 */
(function(){
 'use strict';
 if(window.top!==window||window.__matchappAmbientJonas||!/^(?:matchapp\.tv|www\.matchapp\.tv|127\.0\.0\.1|localhost)$/i.test(location.hostname))return;
 if(location.pathname.startsWith('/kids'))return;
 // Only the Android app launches this script; explicit local QA opt-in never affects website users.
 if(!/MatchAppAiAndroid\//.test(navigator.userAgent)&&!window.__MATCHAPP_AMBIENT_QA__&&!window.__MATCHAPP_AMBIENT_WEB__)return;
 window.__matchappAmbientJonas=true;
 var asset='/jonas/android-ambient-assistant-20261011.css?v=20261014-fullscreen1',frame=null,panel=null,root=null,bubble=null;
 var open=false,epoch=0,ready=false,drag=null,dragRaf=0,flingRaf=0,skipClick=false,activeTitle='',helloTimer=0,parkedBeforeChat=null;
 var greetStarted=0,cloudGreetingStarted=0,greetingFinished=0,pendingListen=0,pendingCloud=0,restoreNativeState=null,faceObserver=null;
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
 function selectedLanguage(){var saved='';try{saved=localStorage.getItem('match_lang')||''}catch(_){}return window.MATCH_LANG||saved||document.documentElement.lang||'en'}
 function locale(){var s=String(selectedLanguage()).toLowerCase();return labels[s.split('-')[0]]||labels.en}
 function clamp(x,low,high){return Math.max(low,Math.min(high,x))}
 function viewport(){return {width:Math.max(1,window.innerWidth),height:Math.max(1,window.visualViewport?.height||window.innerHeight)}}
 function safeBounds(){var v=viewport(),inset=(v.width>=700?4:3)+13;return {minX:inset,minY:inset,maxX:Math.max(inset,v.width-78-inset),maxY:Math.max(inset,v.height-78-inset)}}
 function setPosition(x,y){var b=safeBounds();root.style.setProperty('left',clamp(x,b.minX,b.maxX)+'px','important');root.style.setProperty('top',clamp(y,b.minY,b.maxY)+'px','important');root.style.setProperty('right','auto','important');root.style.setProperty('bottom','auto','important')}
 function flushDrag(){dragRaf=0;if(!drag||!drag.moved)return;var b=safeBounds();var nx=clamp(drag.x+drag.dx,b.minX,b.maxX),ny=clamp(drag.y+drag.dy,b.minY,b.maxY);root.style.transform='translate3d('+(nx-drag.x)+'px,'+(ny-drag.y)+'px,0)';}
 function stopDragFrame(){if(dragRaf){cancelAnimationFrame(dragRaf);dragRaf=0;}}
 function stopFling(){if(flingRaf){cancelAnimationFrame(flingRaf);flingRaf=0;var rect=root.getBoundingClientRect();root.style.transform='';setPosition(rect.left,rect.top);}}
 function coastBubble(fromX,fromY,toX,toY,ms,dragStartX,dragStartY){
   var begin=0;
   function coast(now){
     if(!begin)begin=now;
     var t=clamp((now-begin)/ms,0,1),ease=1-Math.pow(1-t,3);
     root.style.transform='translate3d('+(fromX+(toX-fromX)*ease-dragStartX)+'px,'+(fromY+(toY-fromY)*ease-dragStartY)+'px,0)';
     if(t<1)flingRaf=requestAnimationFrame(coast);
     else{flingRaf=0;root.style.transform='';setPosition(toX,toY);store()}
   }
   // The original bubble can be positioned using right/bottom rather than
   // left/top; always use the measured drag origin, never parseStyle(auto).
   flingRaf=requestAnimationFrame(coast);
 }
 function store(){try{var r=root.getBoundingClientRect(),v=viewport();var position=JSON.stringify({x:r.left/Math.max(1,v.width-76),y:r.top/Math.max(1,v.height-76)});localStorage.setItem(key,position);localStorage.setItem('matchapp-jonas-position-v2',position)}catch(_){}}
 function restore(){try{var p=JSON.parse(localStorage.getItem('matchapp-jonas-position-v2')||localStorage.getItem(key)||'null');if(Number.isFinite(p?.x)&&Number.isFinite(p?.y)){var v=viewport();setPosition(p.x*(v.width-76),p.y*(v.height-76))}}catch(_){}}
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
  // Prepare only the small shared speech modules, never a hidden chat/frame
  // or a provider request. The first greeting can then start on the tap.
  if(!window.MatchAppJonasSpeech&&!document.getElementById('ma-ambient-speech-loader')){
   var speech=document.createElement('script');speech.id='ma-ambient-speech-loader';speech.src='/jonas/secure-speech-20261010.js?v=20261014-fast1&voicepair=20261014-1';
   if(window.MatchAppJonasVoicePolicy)document.head.appendChild(speech);
   else{var policy=document.createElement('script');policy.src='/jonas/male-voice-policy-20261010.js';policy.onload=function(){document.head.appendChild(speech)};document.head.appendChild(policy)}
  }
  if(!document.getElementById('ma-jonas-premium-script')){
   var premium=document.createElement('script');premium.id='ma-jonas-premium-script';premium.src='/patches/jonas-premium-enhancer.js?v=premium2';premium.defer=true;(document.head||document.documentElement).appendChild(premium);
  }
  // Critical first-paint styling is deliberately inline. Synchronous head
  // scripts may delay external CSS but the Jonas bubble cannot appear square
  // or expand to full page width while that stylesheet is loading.
  if(!document.querySelector('style[data-ma-ambient-critical]')){
   var s=document.createElement('style');s.dataset.maAmbientCritical='1';
   s.textContent=`
html.matchapp-ai-android #ma-ai-entry,html.matchapp-ai-android #ma-jonas-inline-dock,
html.matchapp-ai-android #ma-jonas-home,html.matchapp-ai-android #matchapp-android-avatar-launcher{display:none!important}
#ma-ambient-jonas{position:fixed!important;z-index:2147483200!important;right:16px;top:16px;bottom:auto;left:auto;width:78px!important;height:78px!important;touch-action:none}
#ma-ambient-jonas[hidden],#ma-ambient-panel[hidden]{display:none!important}
#ma-ambient-jonas .ja-bubble{display:block;position:relative;width:76px;height:76px;padding:2px;border:2px solid #efcf88;border-radius:50%;background:#2b1940;box-shadow:0 6px 24px #0009,0 0 0 4px #efcf8838;touch-action:none}
#ma-ambient-jonas .ja-bubble img{width:100%;height:100%;border-radius:50%;object-fit:cover;object-position:center 18%;pointer-events:none}
#ma-ambient-jonas .ja-live{position:absolute;right:3px;bottom:3px;width:15px;height:15px;border:2px solid #2b1940;border-radius:50%;background:#65dfa5}
#ma-ambient-panel{position:fixed!important;z-index:2147483300!important;left:12px;right:12px;bottom:12px;width:calc(100vw - 24px);height:min(73dvh,680px);max-height:calc(100dvh - 50px);margin:0 auto;display:flex;flex-direction:column;background:#21162f;color:#f9e7d7;border:1px solid #eac984b0;border-radius:23px;overflow:hidden;box-shadow:0 20px 60px #000b}
#ma-ambient-panel .ja-panel-head{height:61px;flex:none;display:flex;align-items:center;gap:11px;padding:9px 12px;background:#3a244f}
#ma-ambient-panel .ja-face{width:42px;height:42px;border:2px solid #eacf87;border-radius:50%;object-fit:cover}
#ma-ambient-panel .ja-head-text{display:flex;flex:1;min-width:0;flex-direction:column;gap:2px;font:12px system-ui}
#ma-ambient-panel .ja-head-text strong{font-size:16px;color:#f6d598}
#ma-ambient-panel .ja-close{width:42px;height:42px;border:1px solid #c9ac81;border-radius:12px;background:#372548;color:#ffe8bc;font:800 28px system-ui}
#ma-ambient-panel .ja-hello{margin:0;padding:9px 14px;font:13px system-ui;background:#2c1a3b}
#ma-ambient-panel iframe{display:block;flex:1;min-height:0;width:100%;border:0;background:#140d23}
`;
   (document.head||document.documentElement).appendChild(s);
  }
  if(document.querySelector('link[data-ma-ambient-style]'))return;
  var l=document.createElement('link');l.rel='stylesheet';l.href=asset;l.dataset.maAmbientStyle='1';(document.head||document.documentElement).appendChild(l);
 }
 function faceSpeech(active){
  if(!panel)return;
  panel.dataset.speaking=active?'1':'0';
  if(!active)panel.querySelectorAll('.ja-mouth').forEach(img=>{img.style.opacity='0'});
 }
 function faceWord(word){
  if(!panel||panel.dataset.speaking!=='1')return;
  var nextName=/[ou]/i.test(word)?'oh':/[ae]/i.test(word)?'aa':'ee';
  var first=panel.querySelector('.ja-mouth-a'),second=panel.querySelector('.ja-mouth-b');
  if(!first||!second)return;
  var front=panel.dataset.mouthFront==='b'?second:first;
  var next=front===first?second:first;
  next.src='/jonas/faces/jonas/'+nextName+'.jpg';
  next.style.opacity='1';front.style.opacity='0';
  panel.dataset.mouthFront=next===first?'a':'b';
 }
 function stopConversation(){
  clearTimeout(helloTimer);epoch++;pendingListen=0;pendingCloud=0;
  if(restoreNativeState){window.matchAppNativeSpeechState=restoreNativeState.previous;window.matchAppNativeSpeechWord=restoreNativeState.previousWord;restoreNativeState=null}
  faceSpeech(false);
  try{window.MatchAppNativeVoice?.stopSpeaking?.()}catch(_){}
  try{window.MatchAppJonasSpeech?.stop?.()}catch(_){}
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
  window.matchAppNativeSpeechWord=restoreNativeState.previousWord;
  faceSpeech(false);
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
  if(!open||token!==epoch||cloudGreetingStarted===token)return;
  clearTimeout(helloTimer);restoreSpeakingCallback();
  if(window.MatchAppJonasSpeech){
   cloudGreetingStarted=token;pendingCloud=0;
   window.MatchAppJonasSpeech.unlock?.();
   window.MatchAppJonasSpeech.speak(locale().hello,selectedLanguage(),{
    onStart:()=>{if(open&&token===epoch)faceSpeech(true)},
    onLevel:level=>{if(open&&token===epoch&&level>0)faceWord('a')},
    onEnd:()=>finishGreeting(token)
   }).catch(()=>finishGreeting(token));
   helloTimer=setTimeout(()=>{window.MatchAppJonasSpeech.stop();finishGreeting(token)},5500);
   return;
  }
  if(!ready){pendingCloud=token;helloTimer=setTimeout(()=>finishGreeting(token),3600);return}
  pendingCloud=0;cloudGreetingStarted=token;
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
  // The same provider voice pair owns greetings and replies on every device.
  cloudGreeting(token);
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
 function mirrorConversationFace(){
  if(faceObserver){faceObserver.disconnect();faceObserver=null}
  var stage=frame?.contentDocument?.getElementById('jonas-voice-stage');
  if(!stage)return;
  function sync(){
   if(!open||greetingFinished!==epoch)return;
   faceSpeech(stage.dataset.state==='speaking');
   var source=stage.querySelectorAll('.jds-mouth'),target=panel.querySelectorAll('.ja-mouth');
   source.forEach(function(image,i){if(!target[i])return;if(image.getAttribute('src'))target[i].src=image.src;target[i].style.opacity=stage.dataset.state==='speaking'?(image.style.opacity||'0'):'0'});
  }
  faceObserver=new MutationObserver(sync);
  faceObserver.observe(stage,{subtree:true,attributes:true,attributeFilter:['data-state','src','style']});
  sync();
 }
 function onFrameLoad(){
  try{if(frame.contentWindow.location.origin!==location.origin||frame.contentWindow.location.pathname!=='/discover.html')return}catch(_){return}
  ready=true;embedStyle();mirrorConversationFace();panel.querySelector('.ja-hello').textContent=greeting();
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
  if(faceObserver){faceObserver.disconnect();faceObserver=null}
  if(frame){frame.remove();frame=null}
  ready=false;
  frame=document.createElement('iframe');frame.id='ma-ambient-chat-frame';
  frame.title='Jonas — MatchApp Ai';frame.allow='microphone';frame.referrerPolicy='same-origin';
  frame.src=frameUrl(title);frame.addEventListener('load',onFrameLoad);
  panel.appendChild(frame);
 }
 function syncPanelViewport(){
  if(!panel||!open)return;
  var v=window.visualViewport;
  panel.style.setProperty('--ja-view-left',Math.round(v?.offsetLeft||0)+'px');
  panel.style.setProperty('--ja-view-top',Math.round(v?.offsetTop||0)+'px');
  panel.style.setProperty('--ja-view-width',Math.round(v?.width||window.innerWidth)+'px');
  panel.style.setProperty('--ja-view-height',Math.round(v?.height||window.innerHeight)+'px');
 }
 window.addEventListener('resize',syncPanelViewport,{passive:true});
 window.visualViewport?.addEventListener('resize',syncPanelViewport,{passive:true});
 window.visualViewport?.addEventListener('scroll',syncPanelViewport,{passive:true});
 function openPanel(){
  if(open)return;
  var parked=root.getBoundingClientRect();
  parkedBeforeChat={x:parked.left,y:parked.top};
  root.dataset.jonasPositionHeld='1';
  open=true;epoch++;activeTitle=contextTitle();
  document.body?.classList.add('ma-jonas-modal-open');
  panel.hidden=false;syncPanelViewport();panel.querySelector('.ja-hello').textContent=greeting();
  // Full-screen conversation is viewport-anchored, not positioned or scaled
  // from the movable bubble. Closing restores the original saved placement.
  panel.style.removeProperty('--ja-origin-x');
  panel.style.removeProperty('--ja-origin-y');
  panel.querySelector('.ja-head-text span').textContent=locale().state;
  panel.querySelector('.ja-close').ariaLabel=locale().close;
  panel.querySelector('.ja-close').focus({preventScroll:true});
  root.hidden=true;
  // Start the local TTS immediately on the actual click. Iframe parsing/network
  // must not sit on the critical path to the spoken greeting.
  spokenGreeting(epoch);
  // A fresh title selection starts its own source-backed information card.
  // Otherwise the existing iframe remains alive, retaining conversation state.
  if(!frame||frame.dataset.title!==activeTitle){
    createFrame(activeTitle);frame.dataset.title=activeTitle;
  }
  document.addEventListener('keydown',escapeKey);
 }
 function closePanel(){
  if(!open)return;
  open=false;stopConversation();
  document.body?.classList.remove('ma-jonas-modal-open');
  panel.hidden=true;root.hidden=false;
  var resume=parkedBeforeChat;parkedBeforeChat=null;
  if(resume){setPosition(resume.x,resume.y);requestAnimationFrame(function(){if(!open)setPosition(resume.x,resume.y)})}
  ['--ja-view-left','--ja-view-top','--ja-view-width','--ja-view-height'].forEach(function(key){panel.style.removeProperty(key)});
  document.removeEventListener('keydown',escapeKey);
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
  panel=document.createElement('section');panel.id='ma-ambient-panel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Jonas conversation');panel.setAttribute('aria-modal','true');
  panel.innerHTML='<div class="ja-panel-head"><div class="ja-face-wrap" aria-hidden="true"><img class="ja-face" src="/jonas/faces/jonas/rest.jpg" alt=""><img class="ja-blink" src="/jonas/faces/jonas/blink.jpg" alt="" aria-hidden="true"><img class="ja-mouth ja-mouth-a" alt=""><img class="ja-mouth ja-mouth-b" alt=""></div><div class="ja-head-text"><strong>Jonas</strong><span></span></div><button type="button" class="ja-close" aria-label="Close Jonas conversation">×</button></div><p class="ja-hello"></p>';
  (document.body||document.documentElement).append(root,panel);
  if(!document.body)document.addEventListener('DOMContentLoaded',function(){
    if(document.body){document.body.append(root,panel);removeLegacyJonas();document.dispatchEvent(new Event('matchapp:jonas-mounted'))}
  },{once:true});
  bubble.setAttribute('aria-label',locale().open);
  bubble.addEventListener('pointerdown',function(e){
    if(e.button!==0&&e.pointerType==='mouse')return;
    stopDragFrame();stopFling();
    var r=root.getBoundingClientRect();
    drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,x:r.left,y:r.top,dx:0,dy:0,moved:false,
          lastX:e.clientX,lastY:e.clientY,lastTime:performance.now(),vx:0,vy:0};
    bubble.setPointerCapture?.(e.pointerId);
  });
  bubble.addEventListener('pointermove',function(e){
    if(!drag||drag.id!==e.pointerId)return;
    drag.dx=e.clientX-drag.startX;drag.dy=e.clientY-drag.startY;
    var at=performance.now(),dt=Math.max(1,at-drag.lastTime);
    if(dt>=8){
      drag.vx=drag.vx*.35+clamp((e.clientX-drag.lastX)/dt,-2,2)*.65;
      drag.vy=drag.vy*.35+clamp((e.clientY-drag.lastY)/dt,-2,2)*.65;
    }
    drag.lastX=e.clientX;drag.lastY=e.clientY;drag.lastTime=at;
    if(!drag.moved&&Math.hypot(drag.dx,drag.dy)<6)return;
    drag.moved=true;
    // GPU compositing follows the finger without changing layout or forcing
    // getBoundingClientRect on every touch sample.
    if(!dragRaf)dragRaf=requestAnimationFrame(flushDrag);
  });
  function end(e){
    if(!drag||drag.id!==e.pointerId)return;
    if(e.type==='pointerup'){
      drag.dx=e.clientX-drag.startX;drag.dy=e.clientY-drag.startY;
    }
    stopDragFrame();
    if(drag.moved){
      var b=safeBounds();
      var x=clamp(drag.x+drag.dx,b.minX,b.maxX);
      var y=clamp(drag.y+drag.dy,b.minY,b.maxY);
      // A soft fling preserves the last real swipe velocity, stops at the
      // viewport's safe edges and never continues through a new pointerdown.
      var impulse=Math.hypot(drag.vx,drag.vy);
      var toX=clamp(x+drag.vx*155,b.minX,b.maxX);
      var toY=clamp(y+drag.vy*155,b.minY,b.maxY);
      // Bounce inward whenever the finger or a fling collides with the frame.
      if(x<=b.minX+2||toX<=b.minX+2)toX=Math.min(b.maxX,b.minX+16);
      if(x>=b.maxX-2||toX>=b.maxX-2)toX=Math.max(b.minX,b.maxX-16);
      if(y<=b.minY+2||toY<=b.minY+2)toY=Math.min(b.maxY,b.minY+16);
      if(y>=b.maxY-2||toY>=b.maxY-2)toY=Math.max(b.minY,b.maxY-16);
      if(Math.hypot(toX-x,toY-y)>4)
        coastBubble(x,y,toX,toY,clamp(impulse*250,180,420),drag.x,drag.y);
      else{root.style.transform='';setPosition(x,y);store();}
      skipClick=true;
      setTimeout(function(){skipClick=false},480);
    }else root.style.transform='';
    drag=null;
  }
  bubble.addEventListener('pointerup',end);bubble.addEventListener('pointercancel',end);
  bubble.addEventListener('click',function(){if(skipClick){skipClick=false;return}openPanel()});
  panel.querySelector('.ja-close').addEventListener('click',closePanel);
  window.addEventListener('resize',function(){var r=root.getBoundingClientRect();if(root.style.left)setPosition(r.left,r.top)},{passive:true});
  window.addEventListener('pagehide',stopConversation);
  document.addEventListener('matchapp:langchange',function(){
   // The same-origin chat must use the same explicit language immediately.
   // Cancel any prior-language turn before accepting another microphone turn.
   if(open)stopConversation();
   bubble.ariaLabel=locale().open;
   panel.querySelector('.ja-hello').textContent=locale().hello;
   panel.querySelector('.ja-head-text span').textContent=locale().state;
   panel.querySelector('.ja-close').ariaLabel=locale().close;
   try{frame?.contentWindow?.setLanguage?.(selectedLanguage())}catch(_){}
  });
  routeNative();restore();
  // Keep Jonas dormant/lightweight. Native greeting happens on tap while
  // the single conversation frame initializes only when the user opens it.
  window.MatchAppAmbientJonas=Object.freeze({open:openPanel,close:closePanel,getContext:contextTitle,isOpen:()=>open});
 }
 // The app may still be parsing blocking head scripts. Jonas must not wait
 // for DOMContentLoaded or onPageFinished; the HTML root is sufficient.
 function boot(){if(document.documentElement)build();else setTimeout(boot,65)}
 boot();
})();
