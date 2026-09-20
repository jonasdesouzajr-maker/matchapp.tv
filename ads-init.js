/* MatchApp AdSense manual units — one initializer, fixed slots, no layout polling. */
(function(){
'use strict';
const path=location.pathname||'/';
if(path!=='/'&&path!=='/index.html')return;
if(/MatchAppTVAndroid/i.test(navigator.userAgent||'')){
 window.MATCHAPP_IS_AD_FREE=true;try{localStorage.setItem('match_ad_free','true')}catch(_){}
 document.documentElement.classList.add('matchapp-android');return;
}
try{if(localStorage.getItem('match_ad_free')==='true')return}catch(_){}
if(window.MATCHAPP_IS_AD_FREE===true||window.matchAppAdsInitialized)return;
window.matchAppAdsInitialized=true;
function adFreeAccount(){
 try{return /"is_ad_free"\s*:\s*true/.test(localStorage.getItem('match_profile')||'')}catch(_){return false}
}
function hostFor(slot){return slot.closest('.sidebar-ad-left,.sidebar-ad-right,.ad-banner-container,.mobile-ad-bottom,.premium-ad-frame,.ma-inline-ad')||slot.parentElement}
function label(slot){
 const host=hostFor(slot);if(!host||host.querySelector('.ma-ad-label'))return;
 const tag=document.createElement('span');tag.className='ma-ad-label';tag.textContent='Advertisement';host.prepend(tag);
}
function monitor(slot){
 const host=hostFor(slot);if(!host||!window.MutationObserver)return;
 const paint=()=>{
   const status=(slot.getAttribute('data-ad-status')||'').toLowerCase();
   if(status==='unfilled')host.classList.add('is-ad-empty');
   else if(status==='filled')host.classList.remove('is-ad-empty');
 };
 new MutationObserver(paint).observe(slot,{attributes:true,attributeFilter:['data-ad-status']});paint();
}
function init(){
 if(adFreeAccount())return;
 const slots=[...document.querySelectorAll('ins.adsbygoogle')];
 const requested=new WeakSet();
 const request=slot=>{
   if(requested.has(slot)||slot.hasAttribute('data-adsbygoogle-status'))return;
   const r=slot.getBoundingClientRect(),style=getComputedStyle(slot);
   if(style.display==='none'||style.visibility==='hidden'||r.width<=0||!slot.getClientRects().length)return;
   requested.add(slot);label(slot);monitor(slot);
   try{(window.adsbygoogle=window.adsbygoogle||[]).push({element:slot})}
   catch(err){console.warn('[MatchApp ads] slot request failed',err)}
 };
 if('IntersectionObserver' in window){
   const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)request(e.target)}),{rootMargin:'320px'});
   slots.forEach(slot=>{label(slot);monitor(slot);io.observe(slot)});
 }else slots.forEach(request);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
