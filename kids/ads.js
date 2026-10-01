/* MatchApp Kids — one owner-authorized grown-up-area AdSense banner.
   It loads only when the parent information disclosure is opened.
   Native Kids Android remains ad-free. */
(function(){
 'use strict';
 if(!location.pathname.startsWith('/kids'))return;
 const host=document.getElementById('kids-parent-ad'),details=host?.closest('details.kids-parent-info'),slot=host?.querySelector('ins.adsbygoogle');
 if(!host||!details||!slot)return;
 const native=/MatchAppTVAndroid|MatchAppAiKidsAndroid/i.test(navigator.userAgent||'')||document.documentElement.classList.contains('matchapp-ai-kids-android');
 function adFree(){try{return window.MATCHAPP_IS_AD_FREE===true||localStorage.getItem('match_ad_free')==='true'||/"is_ad_free"\s*:\s*true/.test(localStorage.getItem('match_profile')||'')}catch(_){return false}}
 if(native||adFree()){host.hidden=true;return}
 let requested=false;
 function request(){
   if(requested||!details.open)return;requested=true;host.hidden=false;
   window.adsbygoogle=window.adsbygoogle||[];
   try{window.adsbygoogle.requestNonPersonalizedAds=1}catch(_){}
   const fire=()=>{try{(window.adsbygoogle=window.adsbygoogle||[]).push({})}catch(_){host.hidden=true}};
   const existing=document.querySelector('script[data-kids-adsense]');
   if(existing){if(existing.dataset.loaded==='1')fire();else existing.addEventListener('load',fire,{once:true});return}
   const s=document.createElement('script');s.async=true;s.crossOrigin='anonymous';s.dataset.kidsAdsense='1';
   s.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9541435081010948';
   s.addEventListener('load',()=>{s.dataset.loaded='1';fire()},{once:true});
   s.addEventListener('error',()=>{host.hidden=true},{once:true});
   document.head.appendChild(s);
 }
 details.addEventListener('toggle',request);
 if(details.open)request();
})();