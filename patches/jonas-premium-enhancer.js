/* Presentation only: existing voice handlers remain the sole speech engine. */
(function(){
 'use strict';
 if(location.pathname.startsWith('/kids')||window.__maJonasPremium)return;
 window.__maJonasPremium=true;
 function enhance(){
  document.querySelectorAll('#ma-jonas-home .jh-portrait,#ma-ambient-jonas .ja-bubble').forEach(function(host){
   if(host.dataset.jonasPremium==='1')return;
   var image=host.querySelector('img');if(!image)return;
   host.dataset.jonasPremium='1';
   var layer=host;
   if(host.classList.contains('ja-bubble')){
    layer=document.createElement('span');layer.className='ja-premium-face';
    image.before(layer);layer.appendChild(image);
   }
   var smile=document.createElement('img');smile.className='ja-premium-smile';
   smile.alt='';smile.setAttribute('aria-hidden','true');smile.decoding='async';
   smile.onload=function(){layer.appendChild(smile)};
   smile.src='/jonas/faces/jonas/smile.jpg';
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance,{once:true});else enhance();
 document.addEventListener('matchapp:jonas-mounted',enhance);
})();
