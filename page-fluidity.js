/* Sitewide fluidity: preload nearby art, map wheel onto rails, never wait to paint. */
(function(){
  'use strict';
  if(window.__MATCHAPP_FLUIDITY__)return;
  window.__MATCHAPP_FLUIDITY__=true;

  var RAIL_SEL='.marquee-viewport,#events-viewport,.events-viewport,.portfolio-tabs';
  var CARD_SEL='.premium-card,.ad-banner-container,.discover-card,.global-event,.kids-card';
  var scheduled=0;

  function reduced(){
    return !!(document.documentElement.classList.contains('reduce-motion')
      || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches));
  }

  function paintNow(){
    document.querySelectorAll(CARD_SEL).forEach(function(el){
      if(!el.classList.contains('fade-in')) el.classList.add('fade-in');
      if(el.classList.contains('discover-card')) el.style.animationDelay='0s';
    });
  }

  function promoteLazyArt(){
    const imgs=document.querySelectorAll('img[loading="lazy"]');
    if(!imgs.length)return;
    const near=typeof IntersectionObserver==='function'
      ? new IntersectionObserver(function(entries){
          entries.forEach(function(entry){
            if(!entry.isIntersecting)return;
            const img=entry.target;
            if(img.getAttribute('loading')==='lazy') img.loading='eager';
            img.decoding='async';
            near.unobserve(img);
          });
        },{rootMargin:'1200px 640px'})
      : null;
    imgs.forEach(function(img,i){
      if(i<16){img.loading='eager';img.decoding='async';return;}
      if(near) near.observe(img);
      else {img.loading='eager';img.decoding='async';}
    });
  }

  function bindRail(vp){
    if(!vp||vp.dataset.fluidRail==='1')return;
    vp.dataset.fluidRail='1';
    vp.style.webkitOverflowScrolling='touch';
    if(reduced())return;
    vp.addEventListener('wheel',function(e){
      if(vp.scrollWidth<=vp.clientWidth+12)return;
      if(Math.abs(e.deltaY)<=Math.abs(e.deltaX))return;
      vp.scrollLeft+=e.deltaY;
      e.preventDefault();
    },{passive:false});
  }

  function rails(){
    document.querySelectorAll(RAIL_SEL).forEach(bindRail);
  }

  function boot(){
    paintNow();
    promoteLazyArt();
    rails();
  }

  function kick(){
    if(scheduled)return;
    scheduled=1;
    setTimeout(function(){
      scheduled=0;
      boot();
    },16);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
  window.addEventListener('load',function(){promoteLazyArt();rails();},{once:true});
  document.addEventListener('matchapp:posterwall',promoteLazyArt);
  if(typeof MutationObserver==='function'){
    new MutationObserver(kick).observe(document.documentElement,{childList:true,subtree:true});
  }
})();
