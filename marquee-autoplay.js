/* MatchApp — compositor-only horizontal title rails.
   Auto-glides the "opening this week" and event strips until a title is
   interacted with. Pointer/touch dragging takes direct control of the running
   animation in either direction, then autoplay resumes smoothly. */
(function(){'use strict';
  const RAILS=[['marquee-viewport','marquee-track'],['events-viewport','events-track']];

  function reduced(){
    return !!(document.documentElement.classList.contains('reduce-motion')
      || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches));
  }

  function holdLegacy(vp){
    try{Object.defineProperty(vp,'_paused',{configurable:true,get:()=>true,set:()=>{}});}
    catch(_){vp._paused=true;}
  }

  function measure(vp, track){
    const half=track.scrollWidth/2;
    if(!(half>40))return false;
    const pxPerSec=Math.max(24, Math.min(42, (vp.clientWidth||600)*0.038));
    const dur=Math.max(18, half/pxPerSec);
    track.style.setProperty('--marquee-shift', half+'px');
    track.style.setProperty('--marquee-duration', dur.toFixed(2)+'s');
    return true;
  }

  function runningAnimation(track){
    if(!track||!track.getAnimations)return null;
    return track.getAnimations().find(a=>{
      try{return a.animationName==='marqueeFlow'||a.playState==='running'||a.playState==='paused';}
      catch(_){return a.playState==='running'||a.playState==='paused';}
    })||null;
  }

  function animationDuration(anim){
    if(!anim)return 0;
    try{
      const timing=anim.effect&&anim.effect.getComputedTiming&&anim.effect.getComputedTiming();
      const d=timing&&timing.duration;
      return typeof d==='number'&&isFinite(d)&&d>0?d:0;
    }catch(_){return 0;}
  }

  function initRail(vpId, trackId){
    const vp=document.getElementById(vpId);
    const track=document.getElementById(trackId);
    if(!vp||!track||vp.dataset.matchappAutoplayFix==='5')return;
    vp.dataset.matchappAutoplayFix='5';
    holdLegacy(vp);
    vp.style.touchAction='pan-y';
    vp.style.overscrollBehaviorX='contain';

    const canFlow=()=>!reduced();
    const held=new Set();
    let resumeTimer=0;
    let drag=null;
    let suppressClick=false;

    const stopFlow=()=>{
      track.classList.remove('is-marquee-flowing');
      vp.dataset.matchappAutoplayActive='0';
      vp.classList.remove('is-marquee-paused');
    };
    const startFlow=()=>{
      if(!canFlow()){stopFlow();return;}
      if(!measure(vp,track))return;
      track.classList.add('is-marquee-flowing');
      vp.dataset.matchappAutoplayActive='1';
    };
    const freeze=()=>{
      vp.classList.add('is-marquee-paused');
      clearTimeout(resumeTimer);
    };
    const pauseOn=el=>{
      held.add(el);
      freeze();
    };
    const resumeSoon=(el, ms=160)=>{
      if(el)held.delete(el);
      clearTimeout(resumeTimer);
      resumeTimer=setTimeout(()=>{
        if(held.size||drag)return;
        vp.classList.remove('is-marquee-paused');
        if(canFlow()&&!track.classList.contains('is-marquee-flowing'))startFlow();
      },ms);
    };

    function bindTitle(item){
      if(!item||item.dataset.marqueeHold)return;
      item.dataset.marqueeHold='1';
      item.addEventListener('pointerenter', ()=>pauseOn(item));
      item.addEventListener('pointerleave', ()=>resumeSoon(item, 80));
      item.addEventListener('focusin', ()=>pauseOn(item));
      item.addEventListener('focusout', ()=>resumeSoon(item, 80));
    }
    const bindItems=()=>track.querySelectorAll('.marquee-item, .events-item, [role="button"]').forEach(bindTitle);
    bindItems();
    if(window.MutationObserver)new MutationObserver(bindItems).observe(track,{childList:true,subtree:true});

    /* Mobile/touch drag: keep the compositor animation as the source of truth
       and scrub its timeline with the finger. That avoids switching between a
       transformed track and scrollLeft (which caused jumps), while allowing
       natural left AND right swipes. touch-action:pan-y preserves normal
       vertical page scrolling. */
    vp.addEventListener('pointerdown',e=>{
      if(e.button!=null&&e.button!==0)return;
      const anim=runningAnimation(track);
      if(!anim||typeof anim.currentTime!=='number')return;
      const dur=animationDuration(anim);
      const shift=track.scrollWidth/2;
      if(!(dur>0&&shift>40))return;
      drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,startTime:anim.currentTime,duration:dur,shift,moved:false};
      suppressClick=false;
      freeze();
      try{vp.setPointerCapture(e.pointerId);}catch(_){}
    },{passive:true});

    vp.addEventListener('pointermove',e=>{
      if(!drag||e.pointerId!==drag.id)return;
      const dx=e.clientX-drag.startX;
      const dy=e.clientY-drag.startY;
      if(!drag.moved){
        if(Math.abs(dx)<6)return;
        if(Math.abs(dy)>Math.abs(dx)*1.2){
          try{vp.releasePointerCapture(e.pointerId);}catch(_){}
          drag=null;
          resumeSoon(null,220);
          return;
        }
        drag.moved=true;
        suppressClick=true;
        vp.classList.add('is-marquee-dragging');
      }
      const anim=runningAnimation(track);
      if(!anim||typeof anim.currentTime!=='number')return;
      const deltaMs=(-dx/drag.shift)*drag.duration;
      anim.currentTime=((drag.startTime+deltaMs)%drag.duration+drag.duration)%drag.duration;
      if(e.cancelable)e.preventDefault();
    },{passive:false});

    const finishDrag=e=>{
      if(!drag||(e&&e.pointerId!=null&&e.pointerId!==drag.id))return;
      const wasMoved=drag.moved;
      try{if(e)vp.releasePointerCapture(e.pointerId);}catch(_){}
      drag=null;
      vp.classList.remove('is-marquee-dragging');
      held.clear();
      if(wasMoved){
        setTimeout(()=>{suppressClick=false;},80);
        resumeSoon(null,520);
      }else{
        suppressClick=false;
        resumeSoon(null,180);
      }
    };
    vp.addEventListener('pointerup',finishDrag,{passive:true});
    vp.addEventListener('pointercancel',finishDrag,{passive:true});
    vp.addEventListener('lostpointercapture',finishDrag,{passive:true});
    vp.addEventListener('click',e=>{
      if(!suppressClick)return;
      e.preventDefault();
      e.stopPropagation();
      suppressClick=false;
    },true);

    vp.addEventListener('wheel',()=>{freeze();resumeSoon(null,1200);},{passive:true});

    document.addEventListener('visibilitychange',()=>{
      if(document.hidden) stopFlow();
      else startFlow();
    });
    document.addEventListener('matchapp:settingschanged',()=>{
      if(reduced())stopFlow();else startFlow();
    });

    if(window.ResizeObserver){
      let t=0;
      new ResizeObserver(()=>{
        clearTimeout(t);
        t=setTimeout(()=>{if(track.classList.contains('is-marquee-flowing'))measure(vp,track);},160);
      }).observe(track);
    }

    let tries=0;
    const boot=()=>{
      tries++;
      if(track.scrollWidth>120 || tries>25)startFlow();
      else setTimeout(boot,100);
    };
    boot();
  }

  function wrapNudge(){
    const prev=window.railNudge;
    window.railNudge=function(vpId,dir){
      const trackId=vpId==='marquee-viewport'?'marquee-track':(vpId==='events-viewport'?'events-track':null);
      const track=trackId&&document.getElementById(trackId);
      const anim=runningAnimation(track);
      if(anim&&typeof anim.currentTime==='number'){
        let d=animationDuration(anim)||40000;
        anim.currentTime=((anim.currentTime+dir*920)%d+d)%d;
        return;
      }
      if(typeof prev==='function')return prev(vpId,dir);
    };
    window.marqueeNudge=function(dir){window.railNudge('marquee-viewport',dir);};
  }

  function init(){
    if(location.pathname!=='/'&&location.pathname!=='/index.html')return;
    wrapNudge();
    RAILS.forEach(pair=>initRail(pair[0],pair[1]));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
