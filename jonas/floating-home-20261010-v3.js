/* MatchApp Ai · Floating Jonas on the browser homepage.
   Routes every question to the original metered /discover.html AI flow. */
(function(){
 'use strict';
 var root=document.getElementById('ma-jonas-home');
 if(!root||!/^\/(?:index\.html)?$/.test(location.pathname)){
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
 function headerMode(){return !!document.documentElement?.hasAttribute?.('data-ma-jonas-header')}
 function mountHeader(){return window.MatchAppReferenceHeader?.claim(root)}
 function homeEntry(){return document?.getElementById?.('ma-ai-entry')||null}
 function mountInline(){
  if(headerMode()){mountHeader();return true;}
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
 function edgeInset(){return 16}
 function safeBounds(w,h){if(window.MatchAppJonasPlacement)return window.MatchAppJonasPlacement.bounds(w,h);var inset=edgeInset(),v=window.visualViewport;var vx=v?.offsetLeft||0,vy=v?.offsetTop||0,vw=v?.width||innerWidth,vh=v?.height||innerHeight;return {minX:vx+inset,minY:vy+inset,maxX:Math.max(vx+inset,vx+vw-w-inset),maxY:Math.max(vy+inset,vy+vh-h-inset)}}
 function setFloating(x,y){
  if(headerMode()){mountHeader();return;}
  if(root.parentElement!==document.body)document.body.appendChild(root);
  root.classList.add('is-floating');
  var size=bubble.getBoundingClientRect();
  var w=Math.max(72,size.width||82,root.offsetWidth||0),h=Math.max(72,size.height||82,root.offsetHeight||0);
  var bounds=safeBounds(w,h);
  root.style.setProperty('left',Math.round(clamp(x,bounds.minX,bounds.maxX))+'px','important');
  root.style.setProperty('top',Math.round(clamp(y,bounds.minY,bounds.maxY))+'px','important');
  root.style.setProperty('right','auto','important');root.style.setProperty('bottom','auto','important');
  if(returnButton)returnButton.hidden=false;
 }
 function restorePosition(){
  if(headerMode()){mountHeader();return;}
  try{
   var pos=JSON.parse(localStorage.getItem('matchapp-jonas-position-v2')||localStorage.getItem(storageKey)||'null');
   if(!pos||!Number.isFinite(pos.x)||!Number.isFinite(pos.y))return;
   setFloating(pos.x*Math.max(1,innerWidth-(root.offsetWidth||bubble.offsetWidth)),pos.y*Math.max(1,innerHeight-(root.offsetHeight||bubble.offsetHeight)));
  }catch(_){/* Unavailable storage simply leaves Jonas in his section. */}
 }
 function returnHome(clear){
  setOpen(false);
  if(clear)try{localStorage.removeItem(storageKey);localStorage.removeItem('matchapp-jonas-position-v2')}catch(_){}
  root.classList.remove('is-floating');
  mountInline();translate();
 }
 function savePosition(){
  if(headerMode())return;
  try{
   var r=root.getBoundingClientRect();
   var position=JSON.stringify({x:r.left/Math.max(1,innerWidth-r.width),y:r.top/Math.max(1,innerHeight-r.height)});localStorage.setItem(storageKey,position);localStorage.setItem('matchapp-jonas-position-v2',position);
  }catch(_){/* optional preference */}
 }
 function positionPanel(){
  if(headerMode())return;
  if(root.classList.contains('is-chat-stage')||!root.classList.contains('is-floating'))return;
  var r=root.getBoundingClientRect();
  var panelW=Math.min(355,innerWidth-24),panelH=Math.min(370,innerHeight-130);
  panel.style.setProperty('left',r.left+panelW>innerWidth-12?'auto':'0');
  panel.style.setProperty('right',r.left+panelW>innerWidth-12?'0':'auto');
  if(r.top<panelH+12){panel.style.setProperty('top',(r.height+12)+'px');panel.style.setProperty('bottom','auto');}
  else{panel.style.setProperty('top','auto');panel.style.setProperty('bottom',(r.height+12)+'px');}
 }
 function startDrag(event){
  if(headerMode())return;
  if(event.button!==0 && event.pointerType==='mouse')return;
  var r=root.getBoundingClientRect();
  dragging={id:event.pointerId,x:event.clientX,y:event.clientY,left:r.left,top:r.top,moved:false};
  if(bubble.setPointerCapture)bubble.setPointerCapture(event.pointerId);
 }
 function moveDrag(event){
  if(headerMode()){dragging=null;return;}
  if(!dragging||dragging.id!==event.pointerId)return;
  var dx=event.clientX-dragging.x,dy=event.clientY-dragging.y;
  if(!dragging.moved&&Math.hypot(dx,dy)<9)return;
  if(!dragging.moved){dragging.moved=true;setOpen(false);}
  setFloating(dragging.left+dx,dragging.top+dy);
 }
 function endDrag(event){
  if(headerMode()){dragging=null;return;}
  if(!dragging||dragging.id!==event.pointerId)return;
  if(dragging.moved){
   root.dataset.jonasDefaultDock='0';
   var size=bubble.getBoundingClientRect(),bounds=safeBounds(Math.max(72,size.width||82,root.offsetWidth||0),Math.max(72,size.height||82,root.offsetHeight||0));
   var x=clamp(dragging.left+event.clientX-dragging.x,bounds.minX,bounds.maxX);
   var y=clamp(dragging.top+event.clientY-dragging.y,bounds.minY,bounds.maxY);
   // A screen-edge collision keeps the glass halo inside the visible screen.
   var reboundX=x<=bounds.minX+2?Math.min(bounds.maxX,bounds.minX+16):x>=bounds.maxX-2?Math.max(bounds.minX,bounds.maxX-16):x;
   var reboundY=y<=bounds.minY+2?Math.min(bounds.maxY,bounds.minY+16):y>=bounds.maxY-2?Math.max(bounds.minY,bounds.maxY-16):y;
   if(reboundX!==x||reboundY!==y){root.classList.add('ma-jonas-rebound');setFloating(reboundX,reboundY);setTimeout(function(){root.classList.remove('ma-jonas-rebound')},280)}
   savePosition();suppressClick=true;setTimeout(function(){suppressClick=false},120);
  }
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
   // Keep the visible microphone hint in the user's selected language too.
   if(!root.classList.contains('jh-listening')&&!root.classList.contains('jh-speaking'))
    set('#ma-jonas-home-status',d.ready);
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
 function syncConversationViewport(){
  if(!opened&&!root.classList.contains('is-chat-stage')&&!panel.classList.contains('ma-header-jonas-conversation'))return;
  var v=window.visualViewport;
  root.style.setProperty('--ja-view-left',Math.round(v?.offsetLeft||0)+'px');
  root.style.setProperty('--ja-view-top',Math.round(v?.offsetTop||0)+'px');
  root.style.setProperty('--ja-view-width',Math.round(v?.width||window.innerWidth)+'px');
  root.style.setProperty('--ja-view-height',Math.round(v?.height||window.innerHeight)+'px');
 }
 window.addEventListener('resize',syncConversationViewport,{passive:true});
 window.visualViewport?.addEventListener('resize',syncConversationViewport,{passive:true});
 window.visualViewport?.addEventListener('scroll',syncConversationViewport,{passive:true});
 function setOpen(next){
  if(opened===next)return;
  if(next){
   stageFloating=root.classList.contains('is-floating');
   var r=root.getBoundingClientRect();stagePosition={left:r.left,top:r.top};
   if(headerMode()){panel.classList.add('ma-header-jonas-conversation');mountHeader();}
   else {if(root.parentElement!==document.body)document.body.appendChild(root);root.classList.add('is-chat-stage');}
   panel.setAttribute('aria-modal','true');
   syncConversationViewport();
   ['top','bottom','left','right'].forEach(function(key){root.style.removeProperty(key)});
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
   panel.setAttribute('aria-modal','false');
   ['--ja-view-left','--ja-view-top','--ja-view-width','--ja-view-height'].forEach(function(key){root.style.removeProperty(key)});
   document.body.classList.remove('ma-jonas-chat-open');
   panel.classList.remove('ma-header-jonas-conversation');
   if(headerMode())mountHeader();
   else if(stageFloating&&stagePosition)setFloating(stagePosition.left,stagePosition.top);
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
 // Start in a consistent safe lower-right dock instead of covering the top-box
 // navigation. Existing user-saved drag placements always win.
 if(document.body.classList.contains('ma-watch-focused')&&!root.classList.contains('is-floating')){
  var width=bubble.getBoundingClientRect().width||82;
  var bottomGap=innerWidth>=1100?120:(innerWidth>=700?118:Math.max(104,Math.min(150,innerHeight*.17)));
  var rightGap=innerWidth>=1100?28:(innerWidth>=700?22:14);
  setFloating(innerWidth-width-rightGap,innerHeight-width-bottomGap);
  root.dataset.jonasDefaultDock='1';
 }
 translate();
})();
