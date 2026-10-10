/* Keep the Ask workspace below its header on small displays.
   Runtime page-shell can insert stronger sticky-header rules after CSS loads. */
(function(){
 'use strict';
 function settle(){
  if(!document.body?.classList.contains('ai-chat-page')||!matchMedia('(max-width: 980px)').matches)return;
  const h=document.querySelector('header.app-header');
  if(h){
   h.style.setProperty('position','relative','important');
   h.style.setProperty('top','auto','important');
   h.style.setProperty('z-index','25','important');
  }
  if(matchMedia('(max-width: 520px)').matches){
   const input=document.getElementById('discover-new-input');
   if(input){
    const key=String(window.MATCH_LANG||document.documentElement.lang||'en').toLowerCase();
    const placeholders={'pt':'Pergunte ao Jonas…','es':'Pregunta a Jonas…','fr':'Demandez à Jonas…','de':'Frag Jonas…','it':'Chiedi a Jonas…','tr':'Jonas’a sor…','ru':'Спросите Йонаса…','ar':'اسأل جوناس…','hi':'जोनास से पूछें…','id':'Tanya Jonas…','ja':'Jonasに聞く…','ko':'Jonas에게 물어봐…','zh':'问 Jonas…'};
    const short=placeholders[key.split('-')[0]]||'Ask Jonas anything…';
    if(input.placeholder!==short)input.placeholder=short;
   }
  }
  const history=document.getElementById('ai-sidebar-toggle');
  if(history){
   history.style.setProperty('position','relative','important');
   history.style.setProperty('top','0','important');
   history.style.setProperty('left','0','important');
   history.style.setProperty('right','auto','important');
   history.style.setProperty('transform','none','important');
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',settle,{once:true});else settle();
 setTimeout(settle,400);
 setTimeout(settle,1200);
})();
