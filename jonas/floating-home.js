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
 var opened=false;
 var getLocale=function(){
  var selected=String(window.MATCH_LANG||document.documentElement.lang||navigator.language||'en');
  return /^pt(?:-|$)/i.test(selected)?'pt':'en';
 };
 function translate(){
  var pt=getLocale()==='pt';
  root.querySelectorAll('[data-jh-en][data-jh-pt]').forEach(function(el){
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
 }
 function setOpen(next){
  if(opened===next)return;
  opened=next;
  panel.hidden=!next;
  bubble.setAttribute('aria-expanded',String(next));
  root.classList.toggle('is-open',next);
  if(next){
   translate();
   if(window.matchMedia&&window.matchMedia('(pointer: fine)').matches)input.focus({preventScroll:true});
   else close.focus({preventScroll:true});
  }else{
   bubble.focus({preventScroll:true});
  }
 }
 bubble.addEventListener('click',function(){setOpen(!opened)});
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
 translate();
})();
