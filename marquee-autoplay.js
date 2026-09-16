/* MatchApp — compositor-only Top Titles flow.
   The old 900ms scrollLeft stepper made the rail hitch. A CSS translate3d
   loop glides the duplicated strip without a JS frame loop. The legacy
   16ms scrollLeft driver stays paused. Phones keep native swipe. */
(function(){'use strict';
  const RAILS=[['marquee-viewport','marquee-track'],['events-viewport','events-track']];

  function reduced(){
    return !!(document.documentElement.classList.contains('reduce-motion')
      || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches));
  }
  function desktop(){
    return !!(window.matchMedia && window.matchMedia('(hover: hover) and (min-width: 761px)').matches);
  }

  function holdLegacy(vp){
    try{Object.defineProperty(vp,'_paused',{configurable:true,get:()=>true,set:()=>{}});}
    catch(_){vp._paused=true;}
  }

  function measure(vp, track){
    const half=track.scrollWidth/2;
    if(!(half>40))return false;
    const pxPerSec=Math.max(28, Math.min(48, (vp.clientWidth||600)*0.042));
    const dur=Math.max(22, half/pxPerSec);
    track.style.setProperty('--marquee-shift', half+'px');
    track.style.setProperty('--marquee-duration', dur.toFixed(2)+'s');
    return true;
  }

  function initRail(vpId, trackId){
    const vp=document.getElementById(vpId);
    const track=document.getElementById(trackId);
    if(!vp||!track||vp.dataset.matchappAutoplayFix==='3')return;
    vp.dataset.matchappAutoplayFix='3';
    holdLegacy(vp);

    const canFlow=()=>desktop()&&!reduced();
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
    const pause=()=>{
      vp.classList.add('is-marquee-paused');
      clearTimeout(resumeTimer);
    };
    const resumeSoon=(ms=900)=>{
      clearTimeout(resumeTimer);
      resumeTimer=setTimeout(()=>{
        vp.classList.remove('is-marquee-paused');
        if(canFlow()&&!track.classList.contains('is-marquee-flowing'))startFlow();
      },ms);
    };

    const wrap=vp.closest('.marquee-wrapper, .events-wrapper, #trending-rail') || vp;
    wrap.addEventListener('mouseenter',pause);
    wrap.addEventListener('mouseleave',()=>resumeSoon(240));
    vp.addEventListener('pointerdown',pause,{passive:true});
    vp.addEventListener('focusin',pause);
    vp.addEventListener('focusout',()=>resumeSoon(240));
    window.addEventListener('pointerup',()=>resumeSoon(),{passive:true});
    vp.addEventListener('touchstart',pause,{passive:true});
    vp.addEventListener('touchend',()=>resumeSoon(),{passive:true});
    vp.addEventListener('wheel',()=>{pause();resumeSoon(1400);},{passive:true});

    document.addEventListener('visibilitychange',()=>{
      if(document.hidden) stopFlow();
      else startFlow();
    });
    document.addEventListener('matchapp:settingschanged',()=>{
      if(reduced()||!desktop())stopFlow();else startFlow();
    });
    if(window.matchMedia){
      const mq=window.matchMedia('(hover: hover) and (min-width: 761px)');
      const onMq=()=>{if(canFlow())startFlow();else stopFlow();};
      if(mq.addEventListener)mq.addEventListener('change',onMq);
      else if(mq.addListener)mq.addListener(onMq);
    }

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
