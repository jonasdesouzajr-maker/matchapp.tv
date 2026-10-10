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
