/* Adult web only: one lightweight install offer per fresh Home opening.
   Installation is never automatic; only a user tap invokes browser/Play actions. */
(function(){
  'use strict';
  if(window.__maBrowserInstallOffer) return;
  window.__maBrowserInstallOffer=true;
  const OPT_OUT='matchapp_install_offer_never_v1';
  const DISMISSED_AT='matchapp_android_offer_dismissed_at_v1';
  const DISMISS_COOLDOWN=7*24*60*60*1000;
  const PLAY='https://play.google.com/store/apps/details?id=com.jonas.papercup';
  // Owner-controlled launch gate. Do not re-enable until explicitly authorized.
  const PLAY_RELEASED=true;
  const INSTALL_DELAY=1100, VISIBLE_FOR=15000;
  let shown=false,queued=false,expiry=0,composerOverlapHandler=null;

  function nativeShell(){
    return /MatchAppTVAndroid|MatchAppAiAndroid|MatchAppAiKidsAndroid/i.test(navigator.userAgent||'') ||
      document.documentElement.classList.contains('matchapp-android');
  }
  function standalone(){
    return navigator.standalone===true ||
      !!(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches);
  }
  function excluded(){
    if(!document.body || !document.body.classList.contains('page-home')) return true;
    // A pending delayed install banner cannot appear on top of an active
    // Ask AI composer after its button was tapped. It can return next visit.
    if(document.body.classList.contains('ma-ask-tab')) return true;
    if(document.getElementById('ma-ai-entry')?.classList.contains('lazy-open')) return true;
    if(location.pathname!=='/' && location.pathname!=='/index.html') return true;
    if(nativeShell()||standalone()) return true;
    try{
      if(localStorage.getItem(OPT_OUT)==='1')return true;
      const dismissed=Number(localStorage.getItem(DISMISSED_AT)||0);
      if(dismissed>0 && Date.now()-dismissed<DISMISS_COOLDOWN)return true;
    }catch(_){}
    return !!(window.matchAppInstallState&&window.matchAppInstallState.isInstalled());
  }
  async function relatedInstalled(){
    // Supported browsers may verify an associated Play package or PWA; others
    // cannot. Do not mistake unsupported detection for proof of noninstallation.
    if(typeof navigator.getInstalledRelatedApps!=='function')return false;
    try{
      const apps=await Promise.race([
        navigator.getInstalledRelatedApps(),
        new Promise(resolve=>setTimeout(()=>resolve([]),1400))
      ]);
      return Array.isArray(apps)&&apps.some(app=>{
        if(app.platform==='play'&&app.id==='com.jonas.papercup')return true;
        if(app.platform!=='webapp')return false;
        if(app.id==='https://matchapp.tv/')return true;
        try{
          const url=new URL(app.url||'',location.href);
          return url.origin===location.origin &&
            (url.pathname==='/manifest.json'||url.pathname==='/manifest-pt-br.json');
        }catch(_){return false;}
      });
    }catch(_){return false;}
  }
  function pt(){
    return /^pt/i.test(String(document.documentElement.lang||navigator.language||'en'));
  }
  function copy(){
    const android=androidMobile(),ios=appleMobile();
    if(pt()){
      if(android)return {
        title:'Baixe o MatchApp Ai oficial',
        description:'Você está no Android. Instale o MatchApp Ai oficial pelo Google Play para ter a melhor experiência no seu aparelho.',
        browser:'Instalar pelo navegador',play:'Baixar no Google Play',
        never:'Nunca mostrar novamente',close:'Fechar sugestão de instalação'
      };
      if(ios)return {
        title:'Instale o MatchApp Ai no seu iPhone ou iPad',
        description:'Adicione o MatchApp Ai à Tela de Início pelo navegador para abrir como um aplicativo.',
        browser:'Adicionar à Tela de Início',play:'Google Play',
        never:'Nunca mostrar novamente',close:'Fechar sugestão de instalação'
      };
      return {
        title:'Instale o MatchApp Ai',
        description:'Instale pelo navegador para abrir o MatchApp Ai como um aplicativo neste computador.',
        browser:'Instalar pelo navegador',play:'Google Play',
        never:'Nunca mostrar novamente',close:'Fechar sugestão de instalação'
      };
    }
    if(android)return {
      title:'Get the official MatchApp Ai app',
      description:'You’re on Android. Install the official MatchApp Ai app from Google Play for the best experience on your device.',
      browser:'Install from browser',play:'Get it on Google Play',
      never:'Never show this again',close:'Dismiss app installation suggestion'
    };
    if(ios)return {
      title:'Install MatchApp Ai on your iPhone or iPad',
      description:'Add MatchApp Ai to your Home Screen from the browser so it opens like an app.',
      browser:'Add to Home Screen',play:'Google Play',
      never:'Never show this again',close:'Dismiss app installation suggestion'
    };
    return {
      title:'Install MatchApp Ai',
      description:'Install from your browser so MatchApp Ai opens like an app on this computer.',
      browser:'Install from browser',play:'Google Play',
      never:'Never show this again',close:'Dismiss app installation suggestion'
    };
  }
  function close(){
    if(expiry){clearTimeout(expiry);expiry=0;}
    if(composerOverlapHandler){
      window.removeEventListener('scroll',composerOverlapHandler);
      window.removeEventListener('resize',composerOverlapHandler);
      composerOverlapHandler=null;
    }
    const item=document.getElementById('ma-install-offer');
    if(item)item.remove();
  }
  function closeIfOverlappingComposer(){
    const item=document.getElementById('ma-install-offer');
    const composer=document.getElementById('ma-ai-entry');
    if(!item||!composer||!item.getClientRects().length||!composer.getClientRects().length)return;
    const offer=item.getBoundingClientRect(),entry=composer.getBoundingClientRect();
    if(entry.left<offer.right&&entry.right>offer.left&&entry.top<offer.bottom&&entry.bottom>offer.top)close();
  }
  function startExpiry(){
    if(expiry)clearTimeout(expiry);
    expiry=setTimeout(close,VISIBLE_FOR);
  }
  function paint(node){
    const t=copy();
    node.setAttribute('aria-label',t.title);
    node.querySelector('.ma-offer-title').textContent=t.title;
    node.querySelector('.ma-offer-description').textContent=t.description;
    node.querySelector('.ma-offer-browser').textContent=t.browser;
    node.querySelector('.ma-offer-play').textContent=t.play;
    node.querySelector('.ma-offer-never').textContent=t.never;
    node.querySelector('.ma-offer-close').setAttribute('aria-label',t.close);
  }
  function appleMobile(){
    const ua=navigator.userAgent||'';
    return /iPhone|iPod|iPad/i.test(ua) || (/Macintosh/i.test(ua)&&navigator.maxTouchPoints>1);
  }
  function androidMobile(){
    return /Android/i.test(navigator.userAgent||'') && !nativeShell();
  }
  function openPlay(event){
    if(!androidMobile())return;
    event.preventDefault();
    location.href='intent://details?id=com.jonas.papercup#Intent;scheme=market;package=com.android.vending;S.browser_fallback_url='+encodeURIComponent(PLAY)+';end';
  }
  async function display(){
    if(shown||excluded())return;
    if(await relatedInstalled()||excluded())return;
    shown=true; // Never show twice within a single page opening.
    const node=document.createElement('aside');
    node.id='ma-install-offer';
    node.setAttribute('role','region');
    node.innerHTML='<button class="ma-offer-close" type="button" aria-label="Close">×</button>'+
      '<div class="ma-offer-head"><img src="/assets/brand/matchapp-ai-install-192.png?v=20261003-premiumicon1" width="40" height="40" alt="">'+
      '<div><strong class="ma-offer-title"></strong><p class="ma-offer-description"></p></div></div>'+
      '<div class="ma-offer-actions"><button class="ma-offer-browser" type="button"></button>'+
      (PLAY_RELEASED?'<a class="ma-offer-play" target="_blank" rel="noopener noreferrer" href="'+PLAY+'"></a>':'<button class="ma-offer-play" type="button" disabled aria-disabled="true"></button>')+'</div>'+
      '<button class="ma-offer-never" type="button"></button>';
    paint(node);
    // Device-aware install route: Android promotes the official Play app;
    // iOS/iPadOS and desktop keep the genuine browser/PWA installation path.
    const android=androidMobile();
    node.querySelector('.ma-offer-browser').hidden=android;
    node.querySelector('.ma-offer-play').hidden=!android;
    node.querySelector('.ma-offer-close').addEventListener('click',()=>{
      try{localStorage.setItem(DISMISSED_AT,String(Date.now()));}catch(_){}
      close();
    });
    node.querySelector('.ma-offer-never').addEventListener('click',()=>{
      try{localStorage.setItem(OPT_OUT,'1');}catch(_){}
      close();
    });
    node.querySelector('.ma-offer-browser').addEventListener('click',()=>{
      // Keep the synchronous click gesture for Chromium's PWA install prompt.
      if(typeof window.installMatchApp==='function'){close();window.installMatchApp();}
    });
    if(PLAY_RELEASED)node.querySelector('.ma-offer-play').addEventListener('click',event=>{
      close();
      openPlay(event);
    });
    node.addEventListener('mouseenter',()=>{if(expiry){clearTimeout(expiry);expiry=0;}});
    node.addEventListener('mouseleave',startExpiry);
    node.addEventListener('focusin',()=>{if(expiry){clearTimeout(expiry);expiry=0;}});
    node.addEventListener('focusout',event=>{
      if(!node.contains(event.relatedTarget))startExpiry();
    });
    document.body.appendChild(node);
    startExpiry();
    // The Home Ask composer is a primary action. Keep this optional fixed
    // invitation from covering it as the visitor scrolls to or resizes around it.
    composerOverlapHandler=()=>window.requestAnimationFrame(closeIfOverlappingComposer);
    window.addEventListener('scroll',composerOverlapHandler,{passive:true});
    window.addEventListener('resize',composerOverlapHandler,{passive:true});
    closeIfOverlappingComposer();
  }
  function boot(){
    // Remove remnants from stale Home scripts without touching site content.
    document.getElementById('ma-install-chip')?.remove();
    document.getElementById('chrome-install-card')?.remove();
    if(queued||shown||excluded())return;
    queued=true;
    setTimeout(()=>{queued=false;display();},INSTALL_DELAY);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
  document.addEventListener('matchapp:langchange',()=>{
    const offer=document.getElementById('ma-install-offer');
    if(offer)paint(offer);
  });
  window.addEventListener('appinstalled',()=>{shown=true;close();});
  window.addEventListener('matchapp:installstate',()=>{if(excluded()){shown=true;close();}});
})();
