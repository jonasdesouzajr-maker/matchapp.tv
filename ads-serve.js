(function(){
 'use strict';
 if(window.matchAppAdsInitialized)return;
 window.matchAppAdsInitialized=true;
 // AdSense approval hardening: only the publisher-content homepage is ad-enabled.
 // Account, auth, pricing, AI conversation and other behavioral screens stay ad-free.
 const adAllowedPath=location.pathname==='/'||location.pathname==='/index.html';
 if(!adAllowedPath){document.documentElement.classList.add('ads-empty');return;}
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
  function collapse(){
   document.querySelectorAll('.premium-ad-frame,.ad-banner-container,.sidebar-ad-left,.sidebar-ad-right,.mobile-ad-bottom,.ma-inline-ad').forEach(frame=>{
    const ins=frame.querySelector('ins.adsbygoogle');
    const iframe=frame.querySelector('iframe');
    const status=(ins?.getAttribute('data-ad-status')||'').toLowerCase();
    const live=status==='filled'||(iframe&&(iframe.offsetHeight||0)>90);
    frame.classList.toggle('is-ad-empty',!live);
   });
   const frames=[...document.querySelectorAll('.premium-ad-frame,.ad-banner-container,.sidebar-ad-left,.sidebar-ad-right,.mobile-ad-bottom,.ma-inline-ad')];
   if(frames.length&&frames.every(f=>f.classList.contains('is-ad-empty'))) document.documentElement.classList.add('ads-empty');
  }
  window.addEventListener('resize',scan,{passive:true});
  setTimeout(scan,800);
  setTimeout(scan,4000);
  setTimeout(collapse,4500);
  setTimeout(collapse,9000);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
