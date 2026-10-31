/* MatchApp Ai · Jonas compact composer + separate closable results, 2026-10-31.
 * Presentation adapter only: the existing /discover.html conversation owns
 * requests, quotas, authentication, cards, threads, voice and language.
 */
(function(){
 'use strict';
 if(window.top!==window||/^(\/kids|\/private-voice|\/oauth)(\/|$)/.test(location.pathname))return;
 if(window.__maJonasCompactPill)return;
 window.__maJonasCompactPill=true;
 var style=document.createElement('link');
 style.rel='stylesheet';style.href='/jonas/compact-pill-20261031.css?v=1';
 style.dataset.jonasCompact='1';(document.head||document.documentElement).appendChild(style);
 var micIcon='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M5 10.5a7 7 0 0 0 14 0M12 17.5V21M8.5 21h7"/></svg>';
 var sendIcon='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 12 15-8-3.5 16-4.5-6-7-2Z"/><path d="m11 14 8-10"/></svg>';
 var words={
  en:['Ask Jonas anything…','Send question','Use microphone','Jonas’s answer','Close answer','Preparing your answer…'],
  pt:['Pergunte ao Jonas…','Enviar pergunta','Usar microfone','Resposta do Jonas','Fechar resposta','Preparando sua resposta…'],
  es:['Pregunta a Jonas…','Enviar pregunta','Usar micrófono','Respuesta de Jonas','Cerrar respuesta','Preparando tu respuesta…'],
  fr:['Demandez à Jonas…','Envoyer','Utiliser le micro','Réponse de Jonas','Fermer la réponse','Préparation de la réponse…'],
  de:['Frag Jonas…','Frage senden','Mikrofon nutzen','Jonas’ Antwort','Antwort schließen','Antwort wird vorbereitet…'],
  it:['Chiedi a Jonas…','Invia domanda','Usa il microfono','Risposta di Jonas','Chiudi risposta','Preparazione risposta…'],
  tr:['Jonas’a sor…','Soruyu gönder','Mikrofonu kullan','Jonas’ın yanıtı','Yanıtı kapat','Yanıt hazırlanıyor…'],
  ru:['Спросите Йонаса…','Отправить','Микрофон','Ответ Йонаса','Закрыть ответ','Готовим ответ…'],
  ar:['اسأل جوناس…','إرسال السؤال','استخدام الميكروفون','إجابة جوناس','إغلاق الإجابة','جارٍ إعداد الإجابة…'],
  hi:['जोनास से पूछें…','प्रश्न भेजें','माइक्रोफ़ोन उपयोग करें','जोनास का जवाब','जवाब बंद करें','जवाब तैयार हो रहा है…'],
  id:['Tanya Jonas…','Kirim pertanyaan','Gunakan mikrofon','Jawaban Jonas','Tutup jawaban','Menyiapkan jawaban…'],
  ja:['ジョナスに質問…','質問を送信','マイクを使用','ジョナスの回答','回答を閉じる','回答を準備しています…'],
  ko:['조나스에게 물어보세요…','질문 보내기','마이크 사용','조나스의 답변','답변 닫기','답변 준비 중…'],
  zh:['问问乔纳斯…','发送问题','使用麦克风','乔纳斯的回答','关闭回答','正在准备回答…']
 };
 function lang(){var s='';try{s=window.MATCH_LANG||localStorage.getItem('match_lang')||document.documentElement.lang||'en'}catch(_){s=document.documentElement.lang||'en'}return String(s).toLowerCase().split('-')[0]}
 function copy(){return words[lang()]||words.en}
 // The protected resizable-chat controller still owns the old panel. It
 // applies inline !important dimensions after opening. Keep those mechanisms
 // untouched, but confine their presentation to a 64px pill while open.
 function anchorPill(panel,homeResults){
  var scheduled=false;
  function fix(){
   if(panel.hidden)return;
   var vv=window.visualViewport,viewX=vv?.offsetLeft||0,viewY=vv?.offsetTop||0;
   var viewW=vv?.width||innerWidth,viewH=vv?.height||innerHeight;
   var a=panel.__maSize?.A;
   var left=a&&a.w>=160?a.left:viewX+10,right=a&&a.w>=160?a.right:viewX+viewW-10;
   var topBound=a&&a.h>=72?a.top:viewY+6;
   var bottomBound=a&&a.h>=72?a.bottom:viewY+viewH-10;
   var width=Math.min(570,Math.max(120,right-left)),height=Math.min(64,Math.max(48,bottomBound-topBound-4));
   var x=Math.round(left+(Math.max(0,right-left-width))/2);
   var y=Math.round(Math.max(topBound,Math.min(bottomBound-height-6,viewY+viewH-height-10)));
   var sizes={'box-sizing':'border-box',position:'fixed',inset:'auto',top:y+'px',left:x+'px',right:'auto',bottom:'auto',width:Math.round(width)+'px',
    height:height+'px','min-height':height+'px','max-height':height+'px',
    'max-width':Math.round(Math.max(width,right-left))+'px',overflow:'visible','border-radius':'999px',
    transform:'none',display:'flex'};
   Object.keys(sizes).forEach(function(name){
    var value=sizes[name];
    if(panel.style.getPropertyValue(name)!==value||panel.style.getPropertyPriority(name)!=='important')
     panel.style.setProperty(name,value,'important');
   });
   if(homeResults){
    var gap=Math.round(Math.max(72,innerHeight-y+8));
    if(homeResults.style.getPropertyValue('--ja-home-result-bottom')!==gap+'px')
     homeResults.style.setProperty('--ja-home-result-bottom',gap+'px');
   }
  }
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(function(){scheduled=false;fix()})}
  new MutationObserver(schedule).observe(panel,{attributes:true,attributeFilter:['style','hidden']});
  window.visualViewport?.addEventListener('resize',schedule,{passive:true});
  window.visualViewport?.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule,{passive:true});
  schedule();
 }
 function frameDocument(frame){try{if(frame&&frame.contentWindow.location.origin===location.origin&&frame.contentWindow.location.pathname==='/discover.html')return frame.contentDocument}catch(_){}return null}
 function frameWindow(frame){return frameDocument(frame)?frame.contentWindow:null}
 function embed(frame){
  var doc=frameDocument(frame);if(!doc)return false;
  doc.documentElement.classList.add('matchapp-ambient-frame','ma-jonas-pill-embed');
  if(!doc.querySelector('[data-ja-compact-embed]')){
   var css=doc.createElement('link');css.rel='stylesheet';css.dataset.jaCompactEmbed='1';
   css.href='/jonas/compact-result-embed-20261031.css?v=1';
   doc.head.appendChild(css);
  }
  return true;
 }
 function stageMeter(frame,host){
  var w=frameWindow(frame),stage=w?.MatchAppJonasStage;
  if(!stage||typeof stage.speak!=='function'||stage.__maCompactMeter)return;
  var original=stage.speak;
  stage.speak=function(message,options){
   if(!options||typeof options!=='object')return original.apply(this,arguments);
   var o=Object.assign({},options),progress=options.onProgress,complete=options.onComplete;
   o.onProgress=function(p){
    if(host.isConnected){host.classList.add('ja-answer-speaking');host.dataset.jaMetered='1';host.style.setProperty('--ja-voice-fill',Math.round(Math.max(0,Math.min(1,Number(p)||0))*100)+'%')}
    if(typeof progress==='function')progress(p);
   };
   o.onComplete=function(ok){
    if(host.isConnected){host.classList.remove('ja-answer-speaking');host.dataset.jaMetered='0';host.style.removeProperty('--ja-voice-fill')}
    if(typeof complete==='function')complete(ok);
   };
   return original.call(this,message,o);
  };
  stage.__maCompactMeter=true;
 }
 function stopFrameVoice(frame){
  try{frameWindow(frame)?.MatchAppJonasStage?.stop?.()}catch(_){}
 }
 function sendToExistingChat(frame,question){
  var w=frameWindow(frame);
  if(!w||typeof w.newDiscoverSearch!=='function')return false;
  var target=w.document.getElementById('discover-new-input');
  if(!target)return false;
  target.value=question;
  target.dispatchEvent(new Event('input',{bubbles:true}));
  w.newDiscoverSearch();
  return true;
 }
 function watchAnswers(frame,onAnswer,onInput,host){
  var doc=frameDocument(frame);if(!doc)return;
  stageMeter(frame,host);
  var log=doc.getElementById('chat-log');
  if(log){
   var count=log.querySelectorAll('.chat-turn').length;
   var ob=new MutationObserver(function(){var next=log.querySelectorAll('.chat-turn').length;if(next>count){count=next;onAnswer()}else count=next});
   ob.observe(log,{childList:true,subtree:true});
  }
  var input=doc.getElementById('discover-new-input');
  if(input&&onInput)input.addEventListener('input',function(){onInput(input.value)});
  doc.addEventListener('matchapp:voice-state',function(e){
   var listening=e.detail?.state==='listening';
   var parentMic=host.querySelector('.ja-compact-mic');
   if(parentMic)parentMic.setAttribute('aria-pressed',String(listening));
  });
 }
 function mountAmbient(){
  var panel=document.getElementById('ma-ambient-panel'),root=document.getElementById('ma-ambient-jonas');
  if(!panel||!root||panel.dataset.jaCompactReady==='1')return false;
  panel.dataset.jaCompactReady='1';panel.dataset.jaMetered='0';panel.classList.add('ja-compact-on');
  var form=document.createElement('form');form.className='ja-compact-form';form.setAttribute('role','search');
  var input=document.createElement('input');input.type='text';input.className='ja-compose-input';input.maxLength=2000;input.autocomplete='off';input.required=true;
  var mic=document.createElement('button');mic.type='button';mic.className='ja-compact-mic';mic.innerHTML=micIcon;mic.setAttribute('aria-pressed','false');
  var send=document.createElement('button');send.type='submit';send.className='ja-compact-send';send.innerHTML=sendIcon;
  var fill=document.createElement('span');fill.className='ja-voice-fill';fill.setAttribute('aria-hidden','true');
  form.append(input,mic,send,fill);panel.appendChild(form);
  var resultHead=document.createElement('div');resultHead.className='ja-results-head';resultHead.hidden=true;
  var resultTitle=document.createElement('strong'),close=document.createElement('button');
  close.type='button';close.className='ja-result-close';close.textContent='×';
  resultHead.append(resultTitle,close);panel.appendChild(resultHead);
  var currentFrame=null,ready=false,pending='',pendingMic=false,allowPreview=false;
  function opened(){return !panel.hidden&&window.MatchAppAmbientJonas?.isOpen?.()}
  function translate(){
   var c=copy();input.placeholder=c[0];input.setAttribute('aria-label',c[0]);
   send.setAttribute('aria-label',c[1]);send.title=c[1];mic.setAttribute('aria-label',c[2]);mic.title=c[2];
   resultTitle.textContent=c[3];close.setAttribute('aria-label',c[4]);close.title=c[4];
   input.dir=lang()==='ar'?'rtl':'auto';
  }
  function geometry(){
   if(!opened())return;
   var vv=window.visualViewport;
   var x=vv?.offsetLeft||0,y=vv?.offsetTop||0,w=vv?.width||innerWidth,h=vv?.height||innerHeight;
   var reserved=Number.parseFloat(panel.style.getPropertyValue('--ja-view-top'))||0;
   var candidate=Number.parseFloat(panel.style.getPropertyValue('--ja-view-height'))||h;
   if(candidate>0&&candidate<=h){y=Math.max(y,reserved);h=candidate}
   var a=panel.__maSize?.A;
   var left=a&&a.w>=160?a.left:x+10,right=a&&a.w>=160?a.right:x+w-10;
   var top=a&&a.h>=110?a.top:y+3,bottom=a&&a.h>=110?a.bottom:y+h-8;
   var width=Math.min(595,Math.max(120,right-left));
   var maxResultHeight=Math.max(82,bottom-top-82);
   var height=Math.min(650,maxResultHeight,Math.max(82,Math.round((bottom-top)*.70)));
   panel.style.setProperty('--ja-result-width',Math.round(width)+'px');
   panel.style.setProperty('--ja-result-left',Math.round(left+Math.max(0,right-left-width)/2)+'px');
   panel.style.setProperty('--ja-result-height',Math.round(height)+'px');
   panel.style.setProperty('--ja-result-top',Math.round(Math.max(top,bottom-height-74))+'px');
  }
  function reveal(){if(!opened()||!allowPreview)return;geometry();resultHead.hidden=false;panel.classList.add('ja-result-open')}
  function foldResult(){panel.classList.remove('ja-result-open');resultHead.hidden=true;allowPreview=false;stopFrameVoice(currentFrame)}
  function onFrame(){
   if(!embed(currentFrame)||currentFrame.dataset.jaCompactWatched==='1')return;
   currentFrame.dataset.jaCompactWatched='1';
   // The embedded composer is hidden; never echo its programmatic submit
   // into the visible pill or a sent question would reappear as a draft.
   ready=true;watchAnswers(currentFrame,function(){if(opened()){allowPreview=true;reveal()}},null,panel);
   translate();
   if(pending){
    var q=pending;pending='';
    if(sendToExistingChat(currentFrame,q)){allowPreview=true;reveal()}
    else pending=q;
   }
   if(pendingMic){pendingMic=false;mic.click()}
  }
  function trackFrame(){
   var f=panel.querySelector('#ma-ambient-chat-frame');
   if(!f||f===currentFrame)return;
   currentFrame=f;ready=false;
   f.addEventListener('load',onFrame);
   if(frameDocument(f)?.readyState==='complete')onFrame();
  }
  var observer=new MutationObserver(function(){
   if(panel.hidden){panel.classList.remove('ja-result-open');resultHead.hidden=true;allowPreview=false;panel.classList.remove('ja-answer-speaking');mic.setAttribute('aria-pressed','false')}
   else geometry();
   trackFrame();
  });
  observer.observe(panel,{childList:true,attributes:true,attributeFilter:['hidden']});
  trackFrame();
  function submit(question){
   var q=String(question||'').trim();if(!q)return;
   input.value='';allowPreview=true;
   if(ready&&sendToExistingChat(currentFrame,q))reveal();
   else{pending=q;geometry()}
  }
  form.addEventListener('submit',function(e){e.preventDefault();submit(input.value)});
  mic.addEventListener('click',function(){
   var w=frameWindow(currentFrame),button=w?.document.getElementById('mic-btn-discover');
   if(!button){pendingMic=true;return}
   button.click();mic.setAttribute('aria-pressed',String(button.classList.contains('mic-listening')));
  });
  close.addEventListener('click',function(){foldResult();input.focus({preventScroll:true})});
  document.addEventListener('matchapp:langchange',translate);
  window.addEventListener('matchapp:languagechange',translate);
  window.visualViewport?.addEventListener('resize',geometry,{passive:true});
  window.visualViewport?.addEventListener('scroll',geometry,{passive:true});
  window.addEventListener('resize',geometry,{passive:true});
  anchorPill(panel);
  translate();return true;
 }
 function mountHome(){
  var root=document.getElementById('ma-jonas-home'),panel=document.getElementById('ma-jonas-home-panel');
  if(!root||!panel||root.dataset.jaCompactReady==='1')return false;
  root.dataset.jaCompactReady='1';
  // Reuse the existing speech-stage visibility guard: after Jonas folds,
  // late replies cannot speak or restart listening inside the retained iframe.
  if(!window.MatchAppAmbientJonas)window.MatchAppAmbientJonas=Object.freeze({isOpen:function(){return !panel.hidden}});
  var form=panel.querySelector('.jh-form'),input=panel.querySelector('#ma-jonas-home-input');
  var send=form?.querySelector('.jh-send'),mic=form?.querySelector('#ma-jonas-home-mic');
  if(!form||!input||!send||!mic)return false;
  form.classList.add('ja-compact-form');
  send.innerHTML=sendIcon;mic.innerHTML=micIcon;
  var meter=document.createElement('span');meter.className='ja-voice-fill';meter.setAttribute('aria-hidden','true');form.appendChild(meter);
  var results=document.createElement('section');results.id='ja-home-results';results.hidden=true;
  results.setAttribute('role','region');
  var head=document.createElement('div');head.className='ja-result-head';
  var title=document.createElement('strong'),close=document.createElement('button');
  close.type='button';close.className='ja-result-close';close.textContent='×';head.append(title,close);results.appendChild(head);
  document.body.appendChild(results);
  var frame=null,ready=false,pending='',speechObserver=null,allowPreview=false;
  function translate(){
   var c=copy();title.textContent=c[3];results.setAttribute('aria-label',c[3]);
   close.setAttribute('aria-label',c[4]);close.title=c[4];
   // The original fourteen-language owner still controls input, send and mic strings.
  }
  function opened(){return !panel.hidden}
  function hideResult(){
   allowPreview=false;results.hidden=true;stopFrameVoice(frame);root.classList.remove('ja-answer-speaking');
   root.style.removeProperty('--ja-voice-fill')
  }
  function reveal(){if(opened()&&allowPreview)results.hidden=false}
  function onFrameLoad(){
   if(!embed(frame)||frame.dataset.jaCompactWatched==='1')return;
   frame.dataset.jaCompactWatched='1';
   ready=true;watchAnswers(frame,function(){if(opened()){allowPreview=true;reveal()}},null,root);
   if(pending){var q=pending;pending='';if(sendToExistingChat(frame,q))reveal();else pending=q}
  }
  function ensureFrame(){
   if(frame)return;
   frame=document.createElement('iframe');frame.title=copy()[3];frame.allow='microphone';frame.referrerPolicy='same-origin';
   frame.addEventListener('load',onFrameLoad);
   frame.src='/discover.html?ambient=1';results.appendChild(frame);
  }
  form.addEventListener('submit',function(e){
   e.preventDefault();
   var q=input.value.trim();if(!q)return;
   input.value='';allowPreview=true;
   ensureFrame();
   if(ready&&sendToExistingChat(frame,q))reveal();
   else pending=q;
  });
  close.addEventListener('click',function(){hideResult();input.focus({preventScroll:true})});
  root.addEventListener('matchapp:jonas-close',hideResult);
  speechObserver=new MutationObserver(function(){
   if(root.classList.contains('jh-speaking')){
    root.dataset.jaMetered='0';root.style.setProperty('--ja-voice-fill','26%');
   }else if(!root.classList.contains('ja-answer-speaking'))root.style.removeProperty('--ja-voice-fill');
  });
  speechObserver.observe(root,{attributes:true,attributeFilter:['class']});
  document.addEventListener('matchapp:langchange',translate);
  window.addEventListener('matchapp:languagechange',translate);
  anchorPill(panel,results);
  translate();return true;
 }
 function ready(){
  var a=mountAmbient(),h=mountHome();
  return a||h;
 }
 if(!ready()){
  document.addEventListener('matchapp:jonas-mounted',ready);
  document.addEventListener('DOMContentLoaded',ready,{once:true});
  var retries=0,interval=setInterval(function(){if(ready()||++retries>36)clearInterval(interval)},350);
 }
})();
