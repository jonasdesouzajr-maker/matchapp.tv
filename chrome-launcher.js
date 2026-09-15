(function(){
  'use strict';
  const HOME='https://matchapp.tv/';
  let launching=false;

  function androidIntent(){
    return 'intent://matchapp.tv/#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url='+encodeURIComponent(HOME)+';end';
  }

  function launchChromeHome(){
    if(launching)return;
    launching=true;
    const ua=navigator.userAgent||navigator.vendor||'';
    const isAndroid=/Android/i.test(ua);
    const isIOS=/iPad|iPhone|iPod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);

    // Android supports an intent with a browser fallback. If Chrome is
    // installed it opens the MatchApp home page there; otherwise Android
    // opens the same HTTPS home page instead of doing nothing.
    if(isAndroid){
      location.href=androidIntent();
      setTimeout(()=>{if(!document.hidden)location.replace(HOME);launching=false;},1800);
      return;
    }

    // iOS exposes Chrome through its HTTPS custom scheme but offers no API to
    // detect whether Chrome is installed. Try Chrome, then guarantee a normal
    // HTTPS home-page fallback if the app did not take focus.
    if(isIOS){
      const timer=setTimeout(()=>{if(!document.hidden)location.replace(HOME);launching=false;},1300);
      const onHidden=()=>{if(document.hidden){clearTimeout(timer);launching=false;document.removeEventListener('visibilitychange',onHidden)}};
      document.addEventListener('visibilitychange',onHidden);
      location.href='googlechromes://matchapp.tv/';
      return;
    }

    // Desktop browsers do not expose a safe, universal API that can force a
    // different installed browser. Never dead-end: lead to MatchApp home.
    location.assign(HOME);
  }

  window.openInChrome=launchChromeHome;

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

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>wire(),{once:true});else wire();
  new MutationObserver(m=>{if(m.some(x=>x.addedNodes.length))wire()}).observe(document.documentElement,{subtree:true,childList:true});
})();
