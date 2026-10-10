/* MatchApp Ai · Floating Jonas on the browser homepage.
   Routes every question to the original metered /discover.html AI flow. */
(function(){
 'use strict';
 var root=document.getElementById('ma-jonas-home');
 if(!root||!/^\/(?:index\.html)?$/.test(location.pathname)||window.MATCHAPP_ANDROID||
    document.documentElement.classList.contains('matchapp-ai-android')){
  if(root)root.hidden=true;
  return;
 }
 if(root.dataset.ready==='1')return;
 root.dataset.ready='1';
 var bubble=root.querySelector('#ma-jonas-home-bubble');
 var panel=root.querySelector('#ma-jonas-home-panel');
 var close=root.querySelector('#ma-jonas-home-close');
 var input=root.querySelector('#ma-jonas-home-input');
 var opened=false,dragging=null,suppressClick=false,stageFloating=false,stagePosition=null,lastAppliedLang=null;
 var storageKey='matchapp-jonas-inline-position-v1';
 var dock=null,returnButton=null;
 function homeEntry(){return document?.getElementById?.('ma-ai-entry')||null}
 function mountInline(){
  var entry=homeEntry();
  if(!entry||root.classList.contains('is-floating'))return false;
  if(!dock){
   dock=document.createElement('div');dock.id='ma-jonas-inline-dock';dock.className='jh-inline-dock';
   var text=document.createElement('div');text.className='jh-inline-copy';
   text.innerHTML='<span class="jh-inline-eyebrow" data-jh-en="YOUR ENTERTAINMENT COMPANION" data-jh-pt="SEU ASSISTENTE DE ENTRETENIMENTO">YOUR ENTERTAINMENT COMPANION</span><strong>Jonas</strong><small data-jh-en="Tap to talk. Drag him anywhere." data-jh-pt="Toque para conversar. Arraste para onde quiser.">Tap to talk. Drag him anywhere.</small>';
   var talk=document.createElement('button');
   talk.type='button';talk.className='jh-launch-label';
   talk.setAttribute('data-jh-en','Talk to Jonas');talk.setAttribute('data-jh-pt','Conversar com Jonas');
   talk.textContent='Talk to Jonas';
   talk.addEventListener('click',function(){setOpen(true)});
   text.appendChild(talk);
   returnButton=document.createElement('button');returnButton.type='button';returnButton.className='jh-return';
   returnButton.setAttribute('data-jh-en','Bring Jonas back');returnButton.setAttribute('data-jh-pt','Trazer Jonas de volta');
   returnButton.textContent='Bring Jonas back';returnButton.hidden=true;
   returnButton.addEventListener('click',function(){returnHome(true)});
   dock.append(root,text,returnButton);
  }
  if(dock.parentElement!==entry)entry.insertBefore(dock,entry.firstChild);
  var oldHeading=entry.previousElementSibling;
  if(oldHeading&&oldHeading.classList.contains('lazy-head')){
   oldHeading.classList.add('ma-jonas-legacy-head');
   oldHeading.style.setProperty('display','none','important');
   oldHeading.setAttribute('aria-hidden','true');oldHeading.tabIndex=-1;
  }
  if(root.parentElement!==dock)dock.insertBefore(root,dock.firstChild);
  root.classList.remove('is-floating');root.style.removeProperty('left');root.style.removeProperty('top');
  root.style.removeProperty('right');root.style.removeProperty('bottom');
  document.body.classList.add('ma-jonas-inline');
  if(returnButton)returnButton.hidden=true;
  return true;
 }
 function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
 function setFloating(x,y){
  if(root.parentElement!==document.body)document.body.appendChild(root);
  root.classList.add('is-floating');
  var size=bubble.getBoundingClientRect();
  var w=Math.max(72,size.width||82),h=Math.max(72,size.height||82);
  var maxX=Math.max(8,innerWidth-w-8),maxY=Math.max(8,innerHeight-h-8);
  root.style.setProperty('left',Math.round(clamp(x,8,maxX))+'px','important');
  root.style.setProperty('top',Math.round(clamp(y,8,maxY))+'px','important');
  root.style.setProperty('right','auto','important');root.style.setProperty('bottom','auto','important');
  if(returnButton)returnButton.hidden=false;
 }
 function restorePosition(){
  try{
   var pos=JSON.parse(localStorage.getItem(storageKey)||'null');
   if(!pos||!Number.isFinite(pos.x)||!Number.isFinite(pos.y))return;
   setFloating(pos.x*Math.max(1,innerWidth-bubble.offsetWidth),pos.y*Math.max(1,innerHeight-bubble.offsetHeight));
  }catch(_){/* Unavailable storage simply leaves Jonas in his section. */}
 }
 function returnHome(clear){
  setOpen(false);
  if(clear)try{localStorage.removeItem(storageKey)}catch(_){}
  root.classList.remove('is-floating');
  mountInline();translate();
 }
 function savePosition(){
  try{
   var r=root.getBoundingClientRect();
   localStorage.setItem(storageKey,JSON.stringify({x:r.left/Math.max(1,innerWidth-r.width),y:r.top/Math.max(1,innerHeight-r.height)}));
  }catch(_){/* optional preference */}
 }
 function positionPanel(){
  if(root.classList.contains('is-chat-stage')||!root.classList.contains('is-floating'))return;
  var r=root.getBoundingClientRect();
  var panelW=Math.min(355,innerWidth-24),panelH=Math.min(370,innerHeight-130);
  panel.style.setProperty('left',r.left+panelW>innerWidth-12?'auto':'0');
  panel.style.setProperty('right',r.left+panelW>innerWidth-12?'0':'auto');
  if(r.top<panelH+12){panel.style.setProperty('top',(r.height+12)+'px');panel.style.setProperty('bottom','auto');}
  else{panel.style.setProperty('top','auto');panel.style.setProperty('bottom',(r.height+12)+'px');}
 }
 function startDrag(event){
  if(event.button!==0 && event.pointerType==='mouse')return;
  var r=root.getBoundingClientRect();
  dragging={id:event.pointerId,x:event.clientX,y:event.clientY,left:r.left,top:r.top,moved:false};
  if(bubble.setPointerCapture)bubble.setPointerCapture(event.pointerId);
 }
 function moveDrag(event){
  if(!dragging||dragging.id!==event.pointerId)return;
  var dx=event.clientX-dragging.x,dy=event.clientY-dragging.y;
  if(!dragging.moved&&Math.hypot(dx,dy)<9)return;
  if(!dragging.moved){dragging.moved=true;setOpen(false);}
  setFloating(dragging.left+dx,dragging.top+dy);
 }
 function endDrag(event){
  if(!dragging||dragging.id!==event.pointerId)return;
  if(dragging.moved){suppressClick=true;savePosition();setTimeout(function(){suppressClick=false},120);}
  dragging=null;
 }
 bubble.addEventListener('pointerdown',startDrag);
 // The root moves to document.body at drag-start; global listeners keep
 // tracking even when DOM reparenting releases native pointer capture.
 window.addEventListener('pointermove',moveDrag,{passive:true});
 window.addEventListener('pointerup',endDrag);
 window.addEventListener('pointercancel',endDrag);
 window.addEventListener('resize',function(){
  if(!root.classList.contains('is-floating'))return;
  var r=root.getBoundingClientRect();setFloating(r.left,r.top);if(opened)positionPanel();
 });
 var getLocale=function(){
  var selected=String(window.MATCH_LANG||document.documentElement.lang||navigator.language||'en');
  return /^pt(?:-|$)/i.test(selected)?'pt':'en';
 };
 function translate(){
  if(!document?.querySelector||!document.documentElement)return;
  var pt=getLocale()==='pt';
  root.querySelectorAll('[data-jh-en][data-jh-pt]').forEach(function(el){
   el.textContent=pt?el.dataset.jhPt:el.dataset.jhEn;
  });
  if(dock)dock.querySelectorAll('.jh-inline-copy [data-jh-en][data-jh-pt],.jh-return[data-jh-en][data-jh-pt]').forEach(function(el){
   el.textContent=pt?el.dataset.jhPt:el.dataset.jhEn;
  });
  root.querySelectorAll('[data-jh-placeholder-en][data-jh-placeholder-pt]').forEach(function(el){
   el.placeholder=pt?el.dataset.jhPlaceholderPt:el.dataset.jhPlaceholderEn;
  });
  root.querySelectorAll('[data-jh-query-en][data-jh-query-pt]').forEach(function(el){
   var question=pt?el.dataset.jhQueryPt:el.dataset.jhQueryEn;
   el.setAttribute('href','/discover.html?q='+encodeURIComponent(question)+'&focus=start');
  });
  bubble.setAttribute('aria-label',pt?'Conversar com Jonas':'Chat with Jonas');
  close.setAttribute('aria-label',pt?'Fechar conversa':'Close conversation');
  input.setAttribute('aria-label',pt?'Sua pergunta para Jonas':'Your question for Jonas');
  var send=root.querySelector('.jh-send');
  send.setAttribute('aria-label',pt?'Enviar pergunta ao MatchApp Ai':'Send question to MatchApp Ai');
  panel.setAttribute('aria-label',pt?'Converse com Jonas':'Chat with Jonas');
  // The top-box selector governs Jonas too: all fourteen existing locales.
  var locale=window.MatchAppJonasLocale;
  if(locale){
   var d=locale.get(),set=function(selector,value){var el=document.querySelector(selector);if(el&&value)el.textContent=value};
   set('#ma-jonas-home .jh-title small',d.companion);
   set('#ma-jonas-home .jh-greeting',d.greeting);
   set('#ma-jonas-inline-dock .jh-inline-eyebrow',d.eyebrow);
   set('#ma-jonas-inline-dock .jh-inline-copy small',d.hint);
   set('#ma-jonas-inline-dock .jh-launch-label',d.mic);
   set('#ma-jonas-inline-dock .jh-return',locale.lang()==='en'?'Bring Jonas back':d.explore);
   set('#ma-jonas-home .jh-suggestions .jh-suggestion:first-child',d.doc);
   set('#ma-jonas-home .jh-suggestions .jh-suggestion:last-child',d.mood);
   set('#ma-jonas-home .jh-full',d.explore);
   set('#ma-jonas-home .jh-footnote',window.MatchAppJonasLocale.lang()==='en'?d.companion:'MatchApp Ai');
   input.placeholder=d.placeholder;
   bubble.setAttribute('aria-label',d.mic);close.setAttribute('aria-label',d.close);
   send.setAttribute('aria-label',d.send);
   panel.setAttribute('aria-label','Jonas — '+d.companion);
   var mic=root.querySelector('#ma-jonas-home-mic');if(mic){mic.setAttribute('aria-label',d.mic);mic.title=d.mic}
   root.querySelectorAll('.jh-suggestion').forEach(function(el,i){
    el.href='/discover.html?q='+encodeURIComponent(i?d.qmood:d.qdoc)+'&focus=start';
   });
   panel.setAttribute('dir',locale.lang()==='ar'?'rtl':'ltr');
   if(lastAppliedLang!==locale.lang()){
    lastAppliedLang=locale.lang();
    root.dispatchEvent(new CustomEvent('matchapp:jonas-language',{detail:{lang:lastAppliedLang}}));
   }
  }
 }
 function setOpen(next){
  if(opened===next)return;
  if(next){
   stageFloating=root.classList.contains('is-floating');
   var r=root.getBoundingClientRect();stagePosition={left:r.left,top:r.top};
   if(root.parentElement!==document.body)document.body.appendChild(root);
   root.classList.add('is-chat-stage');
   ['top','bottom','left','right'].forEach(function(key){panel.style.removeProperty(key)});
   document.body.classList.add('ma-jonas-chat-open');
  }
  opened=next;
  panel.hidden=!next;
  bubble.setAttribute('aria-expanded',String(next));
  root.classList.toggle('is-open',next);
  if(!next){
   root.dispatchEvent(new CustomEvent('matchapp:jonas-close'));
   root.classList.remove('is-chat-stage');
   document.body.classList.remove('ma-jonas-chat-open');
   if(stageFloating&&stagePosition)setFloating(stagePosition.left,stagePosition.top);
   else {root.classList.remove('is-floating');mountInline();}
  }
  if(next){
   translate();positionPanel();
   // An in-flow conversation should become visible immediately even when
   // the user opens Jonas near the bottom edge of a short phone screen.
   if(!root.classList.contains('is-floating')&&dock){
    requestAnimationFrame(function(){
     if(opened&&dock.isConnected&&typeof dock.scrollIntoView==='function'){
      var reduced=!!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      dock.scrollIntoView({block:'start',behavior:reduced?'instant':'smooth'});
     }
    });
   }
   close.focus({preventScroll:true});
   root.dispatchEvent(new CustomEvent('matchapp:jonas-open'));
  }else{
   bubble.focus({preventScroll:true});
  }
 }
 bubble.addEventListener('click',function(){
  if(suppressClick){suppressClick=false;return;}
  setOpen(!opened);
 });
 root.addEventListener('click',function(e){if(opened&&e.target===root)setOpen(false)});
 close.addEventListener('click',function(){setOpen(false)});
 document.addEventListener('keydown',function(ev){
  if(!opened)return;
  if(ev.key==='Escape'){ev.preventDefault();setOpen(false);}
 });
 document.addEventListener('pointerdown',function(ev){
  if(opened&&!root.contains(ev.target))setOpen(false);
 },{passive:true});
 document.addEventListener('change',function(){queueMicrotask(translate)});
 document.addEventListener('matchapp:language-changed',translate);
 window.addEventListener('languagechange',translate);
 if(window.MutationObserver)new MutationObserver(translate).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 function hideLateAskHeading(){
  if(!document?.querySelector)return;
  var entry=homeEntry(),head=entry?.previousElementSibling;
  if(!head?.matches?.('.lazy-head'))head=document.querySelector('.lazy-head[data-fold-key="askai"]');
  if(!head)return;
  if(!head.classList.contains('ma-jonas-legacy-head'))head.classList.add('ma-jonas-legacy-head');
  if(head.style.getPropertyValue('display')!=='none'||head.style.getPropertyPriority('display')!=='important')
   head.style.setProperty('display','none','important');
  if(head.getAttribute('aria-hidden')!=='true')head.setAttribute('aria-hidden','true');
  head.tabIndex=-1;
 }
 mountInline();
 var outer=homeEntry()?.parentElement;
 if(outer&&window.MutationObserver)new MutationObserver(hideLateAskHeading).observe(outer,{childList:true,subtree:false});
 hideLateAskHeading();
 setTimeout(hideLateAskHeading,120);
 setTimeout(hideLateAskHeading,1100);
 document.addEventListener('matchapp:langchange',hideLateAskHeading);
 document.addEventListener('matchapp:langchange',translate);
 restorePosition();
 translate();
})();
