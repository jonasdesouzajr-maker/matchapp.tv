/* MatchApp page-origin: fresh navigations start at the top without polling
   or prototype monkey-patches. User-driven/history restoration is left native. */
(function(){
'use strict';
try{if('scrollRestoration' in history)history.scrollRestoration='manual'}catch(_){}
function top(){
 if(location.hash)return;
 try{window.scrollTo({top:0,left:0,behavior:'auto'})}catch(_){window.scrollTo(0,0)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(top),{once:true});
else requestAnimationFrame(top);
addEventListener('pageshow',e=>{if(!e.persisted)requestAnimationFrame(top)},{once:true});
window.MatchAppScrollGate=Object.freeze({canAutoScroll:()=>true,unlock:()=>{},top});
})();
