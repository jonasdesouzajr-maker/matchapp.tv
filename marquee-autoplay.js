/* MatchApp — low-duty Top Titles autoplay.
   Own the rail on the homepage so the legacy 16ms timer cannot continuously
   repaint it. Manual arrows/dragging remain available; automatic passing uses
   a low-frequency timer instead of requestAnimationFrame. */
(function(){'use strict';
  function init(){
    if(location.pathname!=='/'&&location.pathname!=='/index.html')return;
    const vp=document.getElementById('marquee-viewport');
    const track=document.getElementById('marquee-track');
    if(!vp||!track||vp.dataset.matchappAutoplayFix==='2')return;
    vp.dataset.matchappAutoplayFix='2';

    const motion=window.matchMedia?window.matchMedia('(prefers-reduced-motion: reduce)'):null;
    let paused=false,timer=0,resumeTimer=0,stopped=false;

    // The legacy rail's tick checks vp._paused before touching scrollLeft.
    // Keep that driver permanently paused so only this low-duty controller
    // moves the rail. The legacy interval may still wake, but it exits before
    // layout/paint work and therefore cannot compete with this controller.
    try{
      Object.defineProperty(vp,'_paused',{configurable:true,get:()=>true,set:()=>{}});
    }catch(_){vp._paused=true;}

    const reduced=()=>!!((motion&&motion.matches)||document.documentElement.classList.contains('reduce-motion'));
    const wrap=()=>{
      const half=track.scrollWidth/2;
      if(half>1&&vp.scrollLeft>=half)vp.scrollLeft-=half;
    };
    const step=()=>{
      timer=0;
      if(stopped||reduced())return;
      if(!document.hidden&&!paused){
        const amount=Math.max(12,Math.min(30,(vp.clientWidth||600)*.025));
        vp.scrollLeft+=amount;
        wrap();
      }
      timer=setTimeout(step,900);
    };
    const start=()=>{
      if(stopped||reduced()||timer)return;
      vp.dataset.matchappAutoplayActive='1';
      timer=setTimeout(step,1200);
    };
    const stop=()=>{
      stopped=true;
      vp.dataset.matchappAutoplayActive='0';
      clearTimeout(timer);timer=0;
    };
    const pause=()=>{paused=true;clearTimeout(resumeTimer);};
    const resumeSoon=(ms=1200)=>{clearTimeout(resumeTimer);resumeTimer=setTimeout(()=>{paused=false;if(!timer&&!stopped)start();},ms);};

    vp.addEventListener('mouseenter',pause);
    vp.addEventListener('mouseleave',()=>resumeSoon(300));
    vp.addEventListener('pointerdown',pause,{passive:true});
    window.addEventListener('pointerup',()=>resumeSoon(),{passive:true});
    vp.addEventListener('touchstart',pause,{passive:true});
    vp.addEventListener('touchend',()=>resumeSoon(),{passive:true});
    vp.addEventListener('wheel',()=>{pause();resumeSoon(1500);},{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!stopped&&!timer)start();});
    document.addEventListener('matchapp:settingschanged',()=>{
      if(reduced()){clearTimeout(timer);timer=0;vp.dataset.matchappAutoplayActive='0';}
      else if(!stopped)start();
    });
    if(motion&&motion.addEventListener)motion.addEventListener('change',e=>{
      if(e.matches){clearTimeout(timer);timer=0;vp.dataset.matchappAutoplayActive='0';}
      else if(!stopped)start();
    });

    if(!reduced())start();else stop();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
