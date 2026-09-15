/* MatchApp — resilient Top Titles autoplay.
   The legacy rail intentionally disables its own timer on touch/small screens.
   This fallback restores automatic passing without overriding a real OS
   prefers-reduced-motion request and without double-driving a rail that is
   already moving normally. */
(function(){'use strict';
  function init(){
    if(location.pathname!=='/'&&location.pathname!=='/index.html')return;
    const vp=document.getElementById('marquee-viewport');
    const track=document.getElementById('marquee-track');
    if(!vp||!track||vp.dataset.matchappAutoplayFix==='1')return;
    vp.dataset.matchappAutoplayFix='1';

    const motion=window.matchMedia?window.matchMedia('(prefers-reduced-motion: reduce)'):null;
    if((motion&&motion.matches)||document.documentElement.classList.contains('reduce-motion'))return;

    let running=false,paused=false,raf=0,last=0,resumeTimer=0;
    const speed=.032; // px per millisecond, close to the existing ~0.55px/16ms.
    const wrap=()=>{
      const half=track.scrollWidth/2;
      if(half>1&&vp.scrollLeft>=half)vp.scrollLeft-=half;
    };
    const frame=now=>{
      if(!running)return;
      if(!document.hidden&&!paused&&!vp._paused){
        const dt=last?Math.min(40,now-last):16;
        vp.scrollLeft+=speed*dt;
        wrap();
      }
      last=now;
      raf=requestAnimationFrame(frame);
    };
    const start=()=>{
      if(running||(motion&&motion.matches)||document.documentElement.classList.contains('reduce-motion'))return;
      running=true;last=0;vp.dataset.matchappAutoplayActive='1';raf=requestAnimationFrame(frame);
    };
    const stop=()=>{running=false;vp.dataset.matchappAutoplayActive='0';if(raf)cancelAnimationFrame(raf);raf=0;};
    const pause=()=>{paused=true;clearTimeout(resumeTimer);};
    const resumeSoon=(ms=1100)=>{clearTimeout(resumeTimer);resumeTimer=setTimeout(()=>{paused=false;},ms);};

    // Do not create a second animation on desktop if the original rail is healthy.
    const startAt=vp.scrollLeft;
    setTimeout(()=>{
      const moved=Math.abs(vp.scrollLeft-startAt);
      let hovered=false;try{hovered=vp.matches(':hover');}catch(_){}
      if(moved<3&&!hovered)start();
    },1400);

    vp.addEventListener('mouseenter',pause);
    vp.addEventListener('mouseleave',()=>resumeSoon(250));
    vp.addEventListener('pointerdown',pause,{passive:true});
    window.addEventListener('pointerup',()=>resumeSoon(),{passive:true});
    vp.addEventListener('touchstart',pause,{passive:true});
    vp.addEventListener('touchend',()=>resumeSoon(),{passive:true});
    vp.addEventListener('wheel',()=>{pause();resumeSoon(1400);},{passive:true});
    document.addEventListener('matchapp:settingschanged',()=>{
      if(document.documentElement.classList.contains('reduce-motion'))stop();
      else if(!running)setTimeout(start,300);
    });
    if(motion&&motion.addEventListener)motion.addEventListener('change',e=>{if(e.matches)stop();else start();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
