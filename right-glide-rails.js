/* MatchApp homepage rails — readable automatic glide with touch pause/resume. */
(()=>{'use strict';
if(location.pathname!=='/'&&location.pathname!=='/index.html')return;
const SPEED=.0185; // 18.5px/s: visibly livelier without turning posters into a ticker.
const RESUME_MS=2800;
function reduced(){return document.documentElement.classList.contains('reduce-motion')||matchMedia('(prefers-reduced-motion: reduce)').matches}
function wireScroller(scroller,track,kind){
 if(!scroller||!track||scroller.dataset.maRightGlide==='2')return;
 scroller.dataset.maRightGlide='2';
 scroller.style.overflowX='auto';scroller.style.webkitOverflowScrolling='touch';
 scroller.style.touchAction='pan-x pan-y';scroller.style.overscrollBehaviorX='contain';
 let paused=false,raf=0,last=0,seeded=false,resumeTimer=0,pos=0;
 const stopFrame=()=>{if(raf)cancelAnimationFrame(raf);raf=0;scroller.dataset.matchappAutoplayActive='0'};
 const resume=()=>{clearTimeout(resumeTimer);resumeTimer=setTimeout(()=>{if(reduced())return;paused=false;last=0;pos=scroller.scrollLeft;raf=requestAnimationFrame(frame)},RESUME_MS)};
 const pause=()=>{paused=true;stopFrame();last=0;pos=scroller.scrollLeft;resume()};
 const frame=ts=>{
   if(paused||reduced()||document.hidden)return;
   if(!seeded){
     const max=Math.max(0,scroller.scrollWidth-scroller.clientWidth);
     if(max>2){scroller.scrollLeft=max;pos=max;seeded=true}else{raf=requestAnimationFrame(frame);return}
   }
   if(last){
     const max=Math.max(0,scroller.scrollWidth-scroller.clientWidth);
     pos-=Math.min(1.45,(ts-last)*SPEED);
     if(pos<=1)pos=max;
     scroller.scrollLeft=pos;
   }
   last=ts;scroller.dataset.matchappAutoplayActive='1';raf=requestAnimationFrame(frame);
 };
 ['touchstart','pointerdown','wheel'].forEach(t=>scroller.addEventListener(t,pause,{passive:true}));
 scroller.addEventListener('scroll',()=>{if(paused)pos=scroller.scrollLeft},{passive:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stopFrame();else if(!paused&&!reduced()){last=0;pos=scroller.scrollLeft;raf=requestAnimationFrame(frame)}});
 setTimeout(()=>{if(!paused&&!reduced())raf=requestAnimationFrame(frame)},420);
}
function trending(){const vp=document.getElementById('marquee-viewport'),track=document.getElementById('marquee-track');if(!vp||!track)return;track.classList.remove('is-marquee-flowing');wireScroller(vp,track,'titles')}
function events(){const host=document.querySelector('#global-events .global-events-body'),track=document.querySelector('#global-events .global-event-grid');if(!host||!track)return;wireScroller(host,track,'events')}
function boot(){trending();events()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();