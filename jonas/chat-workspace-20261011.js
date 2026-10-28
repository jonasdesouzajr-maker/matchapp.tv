/* Keeps the Jonas workspace between the rendered header and device viewport.
   Does not intercept scrolling, keyboard focus, AI requests or voice. */
(function(){
 'use strict';
 if(!/\/discover\.html$/.test(location.pathname))return;
 // The Android ambient iframe is sized by its floating panel, not the outer
 // browser window. Recomputing a second workspace height clips chat/composer.
 if(window.parent!==window&&new URLSearchParams(location.search).get('ambient')==='1')return;
 let raf=0,fullHeight=window.innerHeight;
 function fit(){
  if(raf)cancelAnimationFrame(raf);
  raf=requestAnimationFrame(()=>{
   raf=0;
   const panel=document.querySelector('body.ai-chat-page .discover-head');
   if(!panel)return;
   const viewport=window.visualViewport;
   const editing=panel.contains(document.activeElement)&&document.activeElement?.tagName==='TEXTAREA';
   if(!editing)fullHeight=window.innerHeight;
   const keyboardVisible=!!(viewport&&(viewport.height<window.innerHeight-110||editing&&window.innerHeight<fullHeight-110));
   panel.dataset.keyboard=String(keyboardVisible);
   panel.style.setProperty('--jonas-workspace-top',((viewport?.offsetTop||0)+10)+'px');
   const top=panel.getBoundingClientRect().top;
   // Work from viewport coordinates, not document scroll offsets. The cookie
   // notice and Android keyboard must never cover the anchored composer.
   const viewportBottom=keyboardVisible
    ? viewport.offsetTop+viewport.height
    : document.documentElement.clientHeight;
   const cookie=document.querySelector('body > .ma-cookie');
   const cookieRect=cookie?.getBoundingClientRect();
   const cookieTop=cookieRect&&cookieRect.height>0&&getComputedStyle(cookie).display!=='none'
    ? cookieRect.top-9:Infinity;
   const dock=document.querySelector('.ma-cinema-dock,.ma-reference-dock');
   const dockRect=dock?.getBoundingClientRect();
   const dockTop=dockRect&&dockRect.height>0&&getComputedStyle(dock).display!=='none'&&getComputedStyle(dock).visibility!=='hidden'
    ? dockRect.top-8:Infinity;
   const workspaceTop=keyboardVisible?(viewport.offsetTop+10):top;
   const free=Math.max(80,Math.floor(Math.min(viewportBottom-10,cookieTop,dockTop)-workspaceTop));
   panel.dataset.compact=String(free<280);
   panel.style.setProperty('--jonas-workspace-height',free+'px');
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fit,{once:true});else fit();
 window.addEventListener('resize',fit,{passive:true});
 window.visualViewport?.addEventListener('resize',fit,{passive:true});
 window.visualViewport?.addEventListener('scroll',fit,{passive:true});
 // Consent appears after boot and may disappear without a viewport resize.
 function watchCookie(){
  if(!document.body)return;
  const observer=new MutationObserver(records=>{
   if(records.some(record=>[...record.addedNodes,...record.removedNodes].some(node=>
    node.nodeType===1 && node.classList?.contains('ma-cookie'))))fit();
  });
  observer.observe(document.body,{childList:true});
  const header=document.querySelector('header.app-header');
  if(header&&typeof ResizeObserver==='function')new ResizeObserver(fit).observe(header);
  fit();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watchCookie,{once:true});
 else watchCookie();
 setTimeout(fit,420);
 setTimeout(fit,1200);
})();
