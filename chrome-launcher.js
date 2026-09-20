(function(){
  'use strict';
  const HOME='https://matchapp.tv/';
  let launching=false;

  function inAndroidApp(){
    return /MatchAppTVAndroid/i.test(navigator.userAgent||'');
  }

  function androidIntent(){
    return 'intent://matchapp.tv/#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url='+encodeURIComponent(HOME)+';end';
  }

  function launchChromeHome(){
    if(inAndroidApp())return;
    if(launching)return;
    launching=true;
    const ua=navigator.userAgent||navigator.vendor||'';
    const isAndroid=/Android/i.test(ua);
    const isIOS=/iPad|iPhone|iPod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    if(isAndroid){
      location.href=androidIntent();
      setTimeout(()=>{if(!document.hidden)location.replace(HOME);launching=false;},1800);
      return;
    }
    if(isIOS){
      const timer=setTimeout(()=>{if(!document.hidden)location.replace(HOME);launching=false;},1300);
      const onHidden=()=>{if(document.hidden){clearTimeout(timer);launching=false;document.removeEventListener('visibilitychange',onHidden)}};
      document.addEventListener('visibilitychange',onHidden);
      location.href='googlechromes://matchapp.tv/';
      return;
    }
    location.assign(HOME);
  }

  window.openInChrome=launchChromeHome;

  function alreadyChrome(){
    if(inAndroidApp())return true;
    const ua=navigator.userAgent||'';
    return /Chrome\//.test(ua) && !/Edg\/|OPR\/|SamsungBrowser|YaBrowser/.test(ua);
  }

  function hideChromeNotice(){
    if(!alreadyChrome())return;
    document.documentElement.classList.add('is-chrome');
    const notice=document.getElementById('chrome-notice');
    if(notice)notice.hidden=true;
  }

  function markAndroidAppAdFree(){
    if(!inAndroidApp())return;
    window.MATCHAPP_IS_AD_FREE=true;
    try{localStorage.setItem('match_ad_free','true')}catch(_){}
    document.documentElement.classList.add('ads-empty','matchapp-android','is-chrome');
    hideChromeNotice();
  }

  function collapseEmptyAdRails(){
    if(inAndroidApp()){markAndroidAppAdFree();return;}
    const rails=[...document.querySelectorAll('.sidebar-ad-left,.sidebar-ad-right,.ad-banner-container,.mobile-ad-bottom,.premium-ad-frame')];
    if(!rails.length)return;
    const filled=rails.some(rail=>{
      const iframe=rail.querySelector('iframe');
      const ins=rail.querySelector('ins.adsbygoogle');
      const h=Math.max(iframe?.offsetHeight||0, ins?.offsetHeight||0);
      return h>80 && getComputedStyle(rail).display!=='none';
    });
    if(/Googlebot|Mediapartners-Google|AdsBot-Google/i.test(navigator.userAgent||''))return;
    rails.forEach(rail=>{
      const iframe=rail.querySelector('iframe');
      const ins=rail.querySelector('ins.adsbygoogle');
      const status=(ins?.getAttribute('data-ad-status')||'').toLowerCase();
      const h=Math.max(iframe?.offsetHeight||0, ins?.offsetHeight||0);
      const live=status==='filled'||(iframe&&h>80);
      rail.classList.toggle('is-ad-empty',!live);
    });
    if(Date.now()-(window.__MATCHAPP_ADS_START|| (window.__MATCHAPP_ADS_START=Date.now()))<6000)return;
    if(!filled)document.documentElement.classList.add('ads-empty');
  }

  function fillClock(){
    const el=document.getElementById('real-time-clock');
    if(!el)return;
    const tick=()=>{
      try{
        el.classList.remove('is-pending');
        el.textContent=new Date().toLocaleString(document.documentElement.lang||undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
      }catch(_){
        el.textContent=new Date().toLocaleString();
      }
    };
    if(/loading/i.test(el.textContent||'')) el.classList.add('is-pending');
    tick();
    if(!window.__matchappClock){window.__matchappClock=setInterval(tick,30000)}
  }

  function wire(root=document){
    root.querySelectorAll?.('.chrome-btn').forEach(btn=>{
      btn.href=HOME;
      btn.setAttribute('data-chrome-launcher','true');
      if(btn.tagName==='A')btn.setAttribute('rel','noopener');
    });
  }

  document.addEventListener('click',event=>{
    const btn=event.target.closest?.('.chrome-btn,[data-open-chrome]');
    if(!btn)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    launchChromeHome();
  },true);

  document.addEventListener('keydown',event=>{
    const btn=event.target.closest?.('[data-open-chrome]');
    if(!btn||(event.key!=='Enter'&&event.key!==' '))return;
    event.preventDefault();
    launchChromeHome();
  },true);

  function boot(){
    markAndroidAppAdFree();
    hideChromeNotice();
    wire();
    fillClock();
    if(/pricing/.test(location.pathname)) document.body.classList.add('page-pricing');
    setTimeout(collapseEmptyAdRails,2200);
    setTimeout(collapseEmptyAdRails,6000);
    setTimeout(collapseEmptyAdRails,13000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
