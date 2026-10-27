/* Sitewide fluidity: preload nearby art, map wheel onto rails, never wait to paint. */
(function(){
  'use strict';
  if(window.__MATCHAPP_FLUIDITY__)return;
  window.__MATCHAPP_FLUIDITY__=true;

  var RAIL_SEL='.marquee-viewport,#events-viewport,.events-viewport,.portfolio-tabs';
  var CARD_SEL='.premium-card,.ad-banner-container,.discover-card,.global-event,.kids-card';
  var scheduled=0;
  var pendingRoots=new Set(),seenArt=new WeakSet(),near=null,artCount=0;

  function reduced(){
    return !!(document.documentElement.classList.contains('reduce-motion')
      || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches));
  }

  function each(root,selector,callback){
    if(root.nodeType===1&&root.matches(selector))callback(root);
    root.querySelectorAll(selector).forEach(callback);
  }

  function paintNow(root){
    each(root,CARD_SEL,function(el){
      if(!el.classList.contains('fade-in')) el.classList.add('fade-in');
      if(el.classList.contains('discover-card')) el.style.animationDelay='0s';
    });
  }

  function promoteLazyArt(root){
    if(!near&&typeof IntersectionObserver==='function')near=new IntersectionObserver(function(entries){
          entries.forEach(function(entry){
            if(!entry.isIntersecting)return;
            const img=entry.target;
            if(img.getAttribute('loading')==='lazy') img.loading='eager';
            img.decoding='async';
            near.unobserve(img);
          });
        },{rootMargin:'1200px 640px'});
    each(root,'img[loading="lazy"]',function(img){
      if(seenArt.has(img))return;
      seenArt.add(img);
      if(artCount++<16){img.loading='eager';img.decoding='async';return;}
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
      // Let the page keep scrolling when this rail is already at its edge.
      const limit=Math.max(0,vp.scrollWidth-vp.clientWidth);
      if((e.deltaY<0 && vp.scrollLeft<=1) || (e.deltaY>0 && vp.scrollLeft>=limit-1))return;
      vp.scrollLeft=Math.max(0,Math.min(limit,vp.scrollLeft+e.deltaY));
      e.preventDefault();
    },{passive:false});
  }

  function rails(root){
    each(root,RAIL_SEL,bindRail);
  }

  function boot(root){
    root=root&&root.querySelectorAll?root:document;
    paintNow(root);
    promoteLazyArt(root);
    rails(root);
  }

  function kick(records){
    records.forEach(function(record){record.addedNodes.forEach(function(node){if(node.nodeType===1)pendingRoots.add(node);});});
    if(!pendingRoots.size||scheduled)return;
    scheduled=1;
    setTimeout(function(){
      scheduled=0;
      var roots=Array.from(pendingRoots);pendingRoots.clear();
      roots.forEach(function(root){if(root.isConnected&&!roots.some(function(other){return other!==root&&other.contains(root);}))boot(root);});
    },16);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
  window.addEventListener('load',function(){promoteLazyArt(document);rails(document);},{once:true});
  document.addEventListener('matchapp:posterwall',function(){promoteLazyArt(document);});
  if(typeof MutationObserver==='function'){
    new MutationObserver(kick).observe(document.documentElement,{childList:true,subtree:true});
  }
})();
