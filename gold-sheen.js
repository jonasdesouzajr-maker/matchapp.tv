/* Golden sheen, bounded to what is actually on screen.
   -----------------------------------------------------------------------
   The brief asks for a shimmering gold outline on every cover, box and field.
   Measured live, that selector set is ~243 elements on Home. Animating all of
   them continuously is the pattern that crashed renderers on 2026-09-20
   (posterGlow over 32 tiles), so the outline itself is painted statically by
   CSS on every element, and only the travelling sheen is animated — on at most
   LIVE_CAP elements, and only while they intersect the viewport.

   Stability rules this file keeps:
   - one IntersectionObserver, never a document-wide MutationObserver;
   - a hard cap on simultaneously animated elements;
   - bounded rescans (a short fixed schedule plus the app's own events) rather
     than continuous polling;
   - nothing at all runs when the visitor asked for reduced motion.  */
(function(){'use strict';
 var LIVE_CAP=12, LIVE='ma-sheen-live', MARK='ma-sheen';

 function reduced(){
  try{
   return matchMedia('(prefers-reduced-motion: reduce)').matches
     ||document.documentElement.classList.contains('reduce-motion');
  }catch(_){return false;}
 }
 if(reduced())return;
 if(location.pathname.indexOf('/kids/')===0||document.body&&document.body.classList.contains('kids-body'))return;

 /* Covers, boxes and fields. Kept in one place so the CSS and the runtime
    cannot drift apart. */
 var SELECTOR=[
  '.marquee-item','.ma-news-card','.global-event','.spotlight-card',
  '.premium-card','#questionnaire-box','.ma-news','.tg-entry','.global-events-fold',
  '#daily-match-checkin','.ma-concierge'
 ].join(',');

 var seen=typeof WeakSet==='function'?new WeakSet():null;
 var inView=[];
 var observer=null;

 function apply(){
  // Document order keeps the lit set stable as the page scrolls.
  var live=inView.filter(function(el){return el.isConnected;});
  if(live.length>LIVE_CAP){
   live.sort(function(a,b){
    var p=a.compareDocumentPosition(b);
    return (p&Node.DOCUMENT_POSITION_FOLLOWING)?-1:(p&Node.DOCUMENT_POSITION_PRECEDING)?1:0;
   });
  }
  var keep=live.slice(0,LIVE_CAP), keepSet=new Set(keep);
  for(var i=0;i<live.length;i++){
   var el=live[i];
   if(keepSet.has(el)){
    if(!el.classList.contains(LIVE)){
     el.style.setProperty('--sheen-delay',(keep.indexOf(el)*0.42).toFixed(2)+'s');
     el.classList.add(LIVE);
    }
   }else if(el.classList.contains(LIVE))el.classList.remove(LIVE);
  }
 }

 function onIntersect(entries){
  for(var i=0;i<entries.length;i++){
   var el=entries[i].target, at=inView.indexOf(el);
   if(entries[i].isIntersecting){ if(at===-1)inView.push(el); }
   else{
    if(at!==-1)inView.splice(at,1);
    if(el.classList.contains(LIVE))el.classList.remove(LIVE);
   }
  }
  apply();
 }

 function scan(){
  if(!observer)return;
  var nodes=document.querySelectorAll(SELECTOR), added=0;
  for(var i=0;i<nodes.length;i++){
   var el=nodes[i];
   if(seen&&seen.has(el))continue;
   if(seen)seen.add(el);
   el.classList.add(MARK);
   observer.observe(el);
   added++;
  }
  return added;
 }

 function boot(){
  if(!('IntersectionObserver' in window))return;
  observer=new IntersectionObserver(onIntersect,{rootMargin:'0px',threshold:0.25});
  scan();
  // Rails and the news carousel are built after first paint. A short, finite
  // rescan schedule picks them up without watching the document forever.
  var passes=[1200,3600,8000];
  passes.forEach(function(ms){
   setTimeout(function(){
    if('requestIdleCallback' in window)requestIdleCallback(scan);
    else scan();
   },ms);
  });
  ['matchapp:posterwall','matchapp:newmatch','matchapp:authchange','matchapp:langchange']
   .forEach(function(name){document.addEventListener(name,function(){scan();});});

  /* Some sections — the news carousel above all — mount only once the visitor
     scrolls near them, which can be long after the fixed passes above. Watch a
     short list of known anchors instead of polling on scroll or installing a
     document-wide MutationObserver, and rescan a few times once one appears. */
  var anchors=['#swifties-spotify','#premiere-disclosure','#latest-news','#global-events','.global-events-fold']
   .map(function(sel){return document.querySelector(sel);})
   .filter(Boolean);
  if(anchors.length){
   var late=new IntersectionObserver(function(entries){
    var hit=false;
    for(var i=0;i<entries.length;i++){
     if(!entries[i].isIntersecting)continue;
     hit=true;
     late.unobserve(entries[i].target);
    }
    if(!hit)return;
    [300,1600,4200].forEach(function(ms){setTimeout(scan,ms);});
   },{rootMargin:'200px 0px',threshold:0});
   anchors.forEach(function(el){late.observe(el);});
  }
 }

 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
 else boot();
})();
