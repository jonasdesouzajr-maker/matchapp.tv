/* MatchApp page-origin: establish top-of-page once, before layout, with no delayed
   scroll correction. Browser history restoration is left native on back/forward. */
(function(){
'use strict';
try{if('scrollRestoration' in history)history.scrollRestoration='manual'}catch(_){}
function top(){
 if(location.hash)return;
 try{window.scrollTo({top:0,left:0,behavior:'auto'})}catch(_){window.scrollTo(0,0)}
}
let navType='';
try{navType=performance.getEntriesByType?.('navigation')?.[0]?.type||''}catch(_){}
if(!location.hash&&navType!=='back_forward')top();
window.MatchAppScrollGate=Object.freeze({canAutoScroll:()=>true,unlock:()=>{},top});
})();
