/* MatchApp — compositor-only Top Titles flow.
   Auto-swipes the "opening this week" strip until a title is pointed at.
   Hover/touch a poster to pause; leave it and the glide continues. */
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

  function initRail(vpId, trackId){
    const vp=document.getElementById(vpId);
    const track=document.getElementById(trackId);
    if(!vp||!track||vp.dataset.matchappAutoplayFix==='4')return;
    vp.dataset.matchappAutoplayFix='4';
    holdLegacy(vp);

    const canFlow=()=>!reduced();
    const held=new Set();
    let resumeTimer=0;

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
        if(held.size)return;
        vp.classList.remove('is-marquee-paused');
        if(canFlow()&&!track.classList.contains('is-marquee-flowing'))startFlow();
      },ms);
    };

    function bindTitle(item){
      if(!item||item.dataset.marqueeHold)return;
      item.dataset.marqueeHold='1';
      item.addEventListener('pointerenter', ()=>pauseOn(item));
      item.addEventListener('pointerleave', ()=>resumeSoon(item, 80));
      item.addEventListener('pointerdown', ()=>pauseOn(item), {passive:true});
      item.addEventListener('focusin', ()=>pauseOn(item));
      item.addEventListener('focusout', ()=>resumeSoon(item, 80));
    }
    const bindItems=()=>track.querySelectorAll('.marquee-item, .events-item, [role="button"]').forEach(bindTitle);
    bindItems();
    if(window.MutationObserver)new MutationObserver(bindItems).observe(track,{childList:true,subtree:true});

    window.addEventListener('pointerup',()=>{held.clear();resumeSoon(null,280);},{passive:true});
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
      const anim=track&&track.getAnimations&&track.getAnimations().find(a=>a.playState==='running'||a.playState==='paused');
      if(anim&&typeof anim.currentTime==='number'){
        let d=40000;
        try{const t=anim.effect.getComputedTiming().duration;if(typeof t==='number'&&t>0)d=t;}catch(_){}
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
