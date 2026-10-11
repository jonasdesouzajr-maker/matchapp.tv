/* Keeps the Jonas workspace between the rendered header and device viewport.
   Does not intercept scrolling, keyboard focus, AI requests or voice. */
(function(){
 'use strict';
 if(!/\/discover\.html$/.test(location.pathname))return;
 let raf=0;
 function fit(){
  if(raf)cancelAnimationFrame(raf);
  raf=requestAnimationFrame(()=>{
   raf=0;
   const panel=document.querySelector('body.ai-chat-page .discover-head');
   if(!panel)return;
   const top=panel.getBoundingClientRect().top+window.scrollY;
   const viewport=window.visualViewport;
   const keyboardVisible=!!(viewport&&viewport.height<window.innerHeight-110);
   // VisualViewport height tracks Android keyboard; ordinary screen uses a
   // stable layout viewport so a minor browser-toolbar shift is not a jump.
   const height=keyboardVisible?viewport.height:document.documentElement.clientHeight;
   const free=Math.max(290,Math.floor(height-top-10));
   panel.style.setProperty('--jonas-workspace-height',free+'px');
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fit,{once:true});else fit();
 window.addEventListener('resize',fit,{passive:true});
 window.visualViewport?.addEventListener('resize',fit,{passive:true});
 setTimeout(fit,420);
 setTimeout(fit,1200);
})();