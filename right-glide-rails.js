/* Rightward, readable homepage rail glide. Stops permanently after manual swipe. */
(()=>{'use strict';
if(location.pathname!=='/'&&location.pathname!=='/index.html')return;
const SPEED=.012; // px/ms = 12px/s; enough time to visually read each 130px poster.
function reduced(){return document.documentElement.classList.contains('reduce-motion')||matchMedia('(prefers-reduced-motion: reduce)').matches}
function wireScroller(scroller,track,kind){
 if(!scroller||!track||scroller.dataset.maRightGlide==='1')return;
 scroller.dataset.maRightGlide='1';scroller.style.overflowX='auto';scroller.style.webkitOverflowScrolling='touch';scroller.style.touchAction='pan-x pan-y';scroller.style.overscrollBehaviorX='contain';
 let stopped=false,raf=0,last=0,seeded=false;
 const stop=()=>{stopped=true;if(raf)cancelAnimationFrame(raf);raf=0;scroller.dataset.matchappAutoplayActive='0'};
 ['touchstart','pointerdown','wheel'].forEach(t=>scroller.addEventListener(t,stop,{passive:true,once:true}));
 const frame=ts=>{if(stopped||reduced()||document.hidden)return;if(!seeded){const max=Math.max(0,scroller.scrollWidth-scroller.clientWidth);if(max>2){scroller.scrollLeft=max;seeded=true}else{raf=requestAnimationFrame(frame);return}}if(last){scroller.scrollLeft-=Math.min(1.1,(ts-last)*SPEED);if(scroller.scrollLeft<=1){const max=Math.max(0,scroller.scrollWidth-scroller.clientWidth);if(max>2)scroller.scrollLeft=max}}last=ts;scroller.dataset.matchappAutoplayActive='1';raf=requestAnimationFrame(frame)};
 setTimeout(()=>{if(!stopped&&!reduced())raf=requestAnimationFrame(frame)},550);
}
function trending(){const vp=document.getElementById('marquee-viewport'),track=document.getElementById('marquee-track');if(!vp||!track)return;track.classList.remove('is-marquee-flowing');wireScroller(vp,track,'titles')}
function events(){const host=document.querySelector('#global-events .global-events-body'),track=document.querySelector('#global-events .global-event-grid');if(!host||!track)return;wireScroller(host,track,'events')}
function boot(){trending();events()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();