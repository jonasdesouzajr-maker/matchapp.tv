// Auto ads use the single publisher script in <head>. Manual units must wait
// for a visible container with a measurable width (including collapsed panels).
(function(){
 'use strict';
 if(/MatchAppTVAndroid/i.test(navigator.userAgent||'')){
  window.MATCHAPP_IS_AD_FREE=true;
  try{localStorage.setItem('match_ad_free','true')}catch(_){}
  document.documentElement.classList.add('ads-empty','matchapp-android');
  return;
 }
 try{if(localStorage.getItem('match_ad_free')==='true')return;}catch(_){}
 if(window.MATCHAPP_IS_AD_FREE===true)return;
 if(window.matchAppAdsInitialized)return;
 window.matchAppAdsInitialized=true;
 function ready(){
  const slots=Array.from(document.querySelectorAll('ins.adsbygoogle'));
  const requested=new WeakSet();
  function initialize(slot){
   if(requested.has(slot)||slot.hasAttribute('data-adsbygoogle-status'))return;
   const rect=slot.getBoundingClientRect();
   if(rect.width<=0||!slot.getClientRects().length||rect.top>window.innerHeight+250||rect.bottom< -250)return;
   requested.add(slot);
   try{
    // The publisher SDK accepts an explicit element, so a hidden earlier unit
    // cannot be selected instead of this visible unit.
    (window.adsbygoogle=window.adsbygoogle||[]).push({element:slot});
   }catch(e){console.warn('Ad slot unavailable.',e);}
  }
  let scheduled=false;
  function scan(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;slots.forEach(initialize);});}
  if(typeof IntersectionObserver==='function'){
   const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)initialize(e.target);}),{rootMargin:'250px'});
   slots.forEach(s=>observer.observe(s));
  }else window.addEventListener('scroll',scan,{passive:true});
  if(typeof ResizeObserver==='function'){
   const observer=new ResizeObserver(entries=>entries.forEach(e=>initialize(e.target)));
   slots.forEach(s=>observer.observe(s));
  }else if(typeof MutationObserver==='function'){
   new MutationObserver(scan).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class','style','hidden']});
  }
  window.addEventListener('resize',scan,{passive:true});
  slots.forEach(initialize);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
