/* MatchApp homepage rails — readable automatic glide with touch pause/resume. */
(()=>{'use strict';
if(location.pathname!=='/'&&location.pathname!=='/index.html')return;
const SPEED=.022; // 18.5px/s: visibly livelier without turning posters into a ticker.
const RESUME_MS=2800;
function reduced(){return document.documentElement.classList.contains('reduce-motion')||matchMedia('(prefers-reduced-motion: reduce)').matches}
function wireScroller(scroller,track,kind){
 if(!scroller||!track||scroller.dataset.maRightGlide==='3')return;
 scroller.dataset.maRightGlide='3';
 scroller.style.overflowX='auto';scroller.style.webkitOverflowScrolling='touch';
 scroller.style.touchAction='pan-x pan-y';scroller.style.overscrollBehaviorX='contain';
 const mobileLike=!!(window.matchMedia&&(window.matchMedia('(pointer: coarse)').matches||window.matchMedia('(max-width: 1024px)').matches));
 if(mobileLike){
   let timer=0,resumeTimer=0,paused=false;
   const stop=()=>{if(timer)clearInterval(timer);timer=0;scroller.dataset.matchappAutoplayActive='0'};
   const step=()=>{const first=track.firstElementChild;if(!first)return Math.max(140,scroller.clientWidth*.42);const r=first.getBoundingClientRect();return Math.max(120,r.width+12)};
   const tick=()=>{
     if(paused||reduced()||document.hidden)return;
     const max=Math.max(0,scroller.scrollWidth-scroller.clientWidth);if(max<4)return;
     const amount=step();
     if(scroller.scrollLeft<=amount*.55)scroller.scrollTo({left:max,behavior:'auto'});
     else scroller.scrollBy({left:-amount,behavior:'smooth'});
     scroller.dataset.matchappAutoplayActive='1';
   };
   const start=()=>{stop();if(paused||reduced()||document.hidden)return;timer=setInterval(tick,1450);scroller.dataset.matchappAutoplayActive='1'};
   const pause=()=>{paused=true;stop();clearTimeout(resumeTimer)};
   const resume=()=>{clearTimeout(resumeTimer);resumeTimer=setTimeout(()=>{paused=false;start()},1050)};
   ['touchstart','pointerdown','wheel'].forEach(t=>scroller.addEventListener(t,pause,{passive:true}));
   ['touchend','pointerup','pointercancel'].forEach(t=>scroller.addEventListener(t,resume,{passive:true}));
   document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else resume()});
   setTimeout(()=>{const max=Math.max(0,scroller.scrollWidth-scroller.clientWidth);if(max>4)scroller.scrollLeft=max;start()},260);
   return;
 }
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