/* Keeps the Jonas workspace between the rendered header and device viewport.
   Does not intercept scrolling, keyboard focus, AI requests or voice. */
(function(){
 'use strict';
 if(!/\/discover\.html$/.test(location.pathname))return;
 // The Android ambient iframe is sized by its floating panel, not the outer
 // browser window. Recomputing a second workspace height clips chat/composer.
 if(window.parent!==window&&new URLSearchParams(location.search).get('ambient')==='1')return;
 let raf=0;
 function fit(){
  if(raf)cancelAnimationFrame(raf);
  raf=requestAnimationFrame(()=>{
   raf=0;
   const panel=document.querySelector('body.ai-chat-page .discover-head');
   if(!panel)return;
   const top=panel.getBoundingClientRect().top;
   const viewport=window.visualViewport;
   const keyboardVisible=!!(viewport&&viewport.height<window.innerHeight-110);
   // Work from viewport coordinates, not document scroll offsets. The cookie
   // notice and Android keyboard must never cover the anchored composer.
   const viewportBottom=keyboardVisible
    ? viewport.offsetTop+viewport.height
    : document.documentElement.clientHeight;
   const cookie=document.querySelector('body > .ma-cookie');
   const cookieRect=cookie?.getBoundingClientRect();
   const cookieTop=cookieRect&&cookieRect.height>0&&getComputedStyle(cookie).display!=='none'
    ? cookieRect.top-9:Infinity;
   const free=Math.max(keyboardVisible?230:260,Math.floor(Math.min(viewportBottom-10,cookieTop)-top));
   panel.style.setProperty('--jonas-workspace-height',free+'px');
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fit,{once:true});else fit();
 window.addEventListener('resize',fit,{passive:true});
 window.visualViewport?.addEventListener('resize',fit,{passive:true});
 // Consent appears after boot and may disappear without a viewport resize.
 function watchCookie(){
  if(!document.body)return;
  const observer=new MutationObserver(records=>{
   if(records.some(record=>[...record.addedNodes,...record.removedNodes].some(node=>
    node.nodeType===1 && node.classList?.contains('ma-cookie'))))fit();
  });
  observer.observe(document.body,{childList:true});
  fit();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watchCookie,{once:true});
 else watchCookie();
 setTimeout(fit,420);
 setTimeout(fit,1200);
})();