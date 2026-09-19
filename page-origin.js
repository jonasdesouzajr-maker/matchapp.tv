/* MatchApp page-origin guard.
   Fresh page opens stay at scroll position 0. Programmatic scrolling is unlocked
   only after a real user interaction, so delayed onboarding/runtime code cannot
   drag visitors down the page after first paint. */
(function(){
  'use strict';
  if(window.MatchAppScrollGate)return;

  let userInteracted=false;
  const nativeScrollTo=window.scrollTo.bind(window);
  const nativeScrollIntoView=Element.prototype.scrollIntoView;
  const nativeFocus=HTMLElement.prototype.focus;

  try{if('scrollRestoration' in history)history.scrollRestoration='manual';}catch(_){}

  function top(){
    if(userInteracted)return;
    try{nativeScrollTo(0,0);}catch(_){}
    try{document.documentElement.scrollTop=0;}catch(_){}
    try{if(document.body)document.body.scrollTop=0;}catch(_){}
  }

  function unlock(){
    if(userInteracted)return;
    userInteracted=true;
    try{document.documentElement.style.removeProperty('overflow-anchor');}catch(_){}
    try{document.body&&document.body.style.removeProperty('overflow-anchor');}catch(_){}
    clearInterval(topTimer);
  }

  window.MatchAppScrollGate=Object.freeze({
    canAutoScroll:()=>userInteracted,
    unlock,
    top
  });

  // Block script-driven viewport moves until the visitor actually interacts.
  Element.prototype.scrollIntoView=function(){
    if(!userInteracted)return;
    return nativeScrollIntoView.apply(this,arguments);
  };

  HTMLElement.prototype.focus=function(){
    if(!userInteracted){
      const args=[...arguments];
      if(args[0]&&typeof args[0]==='object') args[0]={...args[0],preventScroll:true};
      else args[0]={preventScroll:true};
      try{return nativeFocus.apply(this,args);}catch(_){try{return nativeFocus.call(this);}catch(__){return;}}
    }
    return nativeFocus.apply(this,arguments);
  };

  try{document.documentElement.style.setProperty('overflow-anchor','none');}catch(_){}

  // Catch native browser restoration/hash positioning during the initial layout.
  top();
  const topTimer=setInterval(top,50);

  document.addEventListener('DOMContentLoaded',()=>{
    try{document.body.style.setProperty('overflow-anchor','none');}catch(_){}
    top();requestAnimationFrame(()=>{top();requestAnimationFrame(top);});
  },{once:true});
  addEventListener('load',()=>{top();setTimeout(top,80);setTimeout(top,240);setTimeout(top,700);},{once:true});
  addEventListener('pageshow',()=>{top();setTimeout(top,80);});

  const userEvents=['pointerdown','touchstart','wheel','keydown'];
  for(const type of userEvents){
    addEventListener(type,(e)=>{
      if(type==='keydown'&&!['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' ','Tab','Enter'].includes(e.key))return;
      unlock();
    },{capture:true,passive:true});
  }
})();