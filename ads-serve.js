(function(){
 'use strict';
 if(window.matchAppAdsInitialized)return;
 window.matchAppAdsInitialized=true;
 if(location.pathname.indexOf('/kids/')===0)return;
 if(/MatchAppTVAndroid/i.test(navigator.userAgent||'')){
  window.MATCHAPP_IS_AD_FREE=true;
  try{localStorage.setItem('match_ad_free','true')}catch(_){}
  document.documentElement.classList.add('ads-empty','matchapp-android');
  return;
 }
 try{if(localStorage.getItem('match_ad_free')==='true')return;}catch(_){}
 if(!document.querySelector('meta[name="google-adsense-account"]')){
  const m=document.createElement('meta');
  m.name='google-adsense-account';
  m.content='ca-pub-9541435081010948';
  document.head.appendChild(m);
 }
 function adFreeAccount(){
  try{
   if(window.MATCHAPP_IS_AD_FREE===true)return true;
   return /"is_ad_free"\s*:\s*true/.test(localStorage.getItem('match_profile')||'');
  }catch(_){return false;}
 }
 function ready(){
  if(adFreeAccount())return;
  const slots=Array.from(document.querySelectorAll('ins.adsbygoogle'));
  const requested=new WeakSet();
  let live=0;
  const MAX=3;
  function label(slot){
   const host=slot.closest('.sidebar-ad-left,.sidebar-ad-right,.ad-banner-container,.mobile-ad-bottom,.premium-ad-frame,aside,section')||slot.parentElement;
   if(!host||host.querySelector('.ma-ad-label'))return;
   const tag=document.createElement('span');
   tag.className='ma-ad-label';
   tag.textContent='Sponsored';
   host.insertBefore(tag, host.firstChild);
  }
  function usable(slot){
   if(!slot||requested.has(slot)||slot.hasAttribute('data-adsbygoogle-status'))return false;
   const rect=slot.getBoundingClientRect();
   const style=getComputedStyle(slot);
   if(style.display==='none'||style.visibility==='hidden')return false;
   if(rect.width<250&&rect.height<90)return false;
   return true;
  }
  function initialize(slot){
   if(live>=MAX||!usable(slot))return;
   requested.add(slot);
   label(slot);
   live+=1;
   try{(window.adsbygoogle=window.adsbygoogle||[]).push({element:slot});}
   catch(e){live-=1;}
  }
  function scan(){
   slots.filter(usable).sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top).forEach(initialize);
  }
  if(typeof IntersectionObserver==='function'){
   const observer=new IntersectionObserver(entries=>{
    entries.filter(e=>e.isIntersecting).forEach(e=>initialize(e.target));
   },{rootMargin:'180px'});
   slots.forEach(s=>observer.observe(s));
  }
  window.addEventListener('resize',scan,{passive:true});
  setTimeout(scan,800);
  setTimeout(scan,4000);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
