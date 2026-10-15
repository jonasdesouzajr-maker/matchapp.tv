/* Native momentum owns touch speed; do not install a competing fling loop. */
(function(){
 'use strict';if(location.pathname.startsWith('/kids'))return;
 function init(){
  var rail=document.getElementById('marquee-viewport');if(!rail||rail.dataset.premiumSwipe)return;
  rail.dataset.premiumSwipe='1';var timer=0,active=false,touching=false;
  var behavior='',snap='';
  function release(){clearTimeout(timer);timer=setTimeout(function(){
   active=false;rail.style.scrollBehavior=behavior;rail.style.scrollSnapType=snap;
  },220)}
  rail.addEventListener('touchstart',function(){
   if(!active){behavior=rail.style.scrollBehavior;snap=rail.style.scrollSnapType}
   active=true;touching=true;clearTimeout(timer);rail.style.scrollBehavior='auto';rail.style.scrollSnapType='none';
  },{passive:true});
  rail.addEventListener('touchend',function(){touching=false;release()},{passive:true});
  rail.addEventListener('touchcancel',function(){touching=false;release()},{passive:true});
  rail.addEventListener('scroll',function(){if(active&&!touching)release()},{passive:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
