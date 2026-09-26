/* Adult web only: one lightweight install offer per fresh Home opening.
   Installation is never automatic; only a user tap invokes browser/Play actions. */
(function(){
  'use strict';
  if(window.__maBrowserInstallOffer) return;
  window.__maBrowserInstallOffer=true;
  const OPT_OUT='matchapp_install_offer_never_v1';
  const PLAY='https://play.google.com/store/apps/details?id=com.jonas.papercup';
  // Owner-controlled launch gate. Do not re-enable until explicitly authorized.
  const PLAY_RELEASED=false;
  const INSTALL_DELAY=1100, VISIBLE_FOR=15000;
  let shown=false,queued=false,expiry=0;

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
    if(location.pathname!=='/' && location.pathname!=='/index.html') return true;
    if(nativeShell()||standalone()) return true;
    try{if(localStorage.getItem(OPT_OUT)==='1')return true;}catch(_){}
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
    return pt()?{
      title:'Leve o MatchApp iA com você',
      description:PLAY_RELEASED?'Prefere usar como aplicativo? Instale pelo navegador ou escolha o Google Play.':'Instale pelo navegador agora. O download pelo Google Play estará disponível após o lançamento.',
      browser:'Instalar pelo navegador',play:PLAY_RELEASED?'Baixar no Google Play':'Google Play — em breve',
      never:'Nunca mostrar novamente',close:'Fechar sugestão de instalação'
    }:{
      title:'Take MatchApp Ai with you',
      description:PLAY_RELEASED?'Prefer the app experience? Install from your browser or choose Google Play.':'Install from your browser for now. Google Play downloads open after launch.',
      browser:'Install from browser',play:PLAY_RELEASED?'Get it on Google Play':'Google Play — coming soon',
      never:'Never show this again',close:'Dismiss app installation suggestion'
    };
  }
  function close(){
    if(expiry){clearTimeout(expiry);expiry=0;}
    const item=document.getElementById('ma-install-offer');
    if(item)item.remove();
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
  function openPlay(event){
    const ua=navigator.userAgent||'';
    if(/Android/i.test(ua)&&/Chrome\//i.test(ua)&&!/EdgA|OPR\/|SamsungBrowser/i.test(ua)){
      event.preventDefault();
      location.href='intent://details?id=com.jonas.papercup#Intent;scheme=market;package=com.android.vending;S.browser_fallback_url='+encodeURIComponent(PLAY)+';end';
    }
  }
  async function display(){
    if(shown||excluded())return;
    if(await relatedInstalled()||excluded())return;
    shown=true; // Never show twice within a single page opening.
    const node=document.createElement('aside');
    node.id='ma-install-offer';
    node.setAttribute('role','region');
    node.innerHTML='<button class="ma-offer-close" type="button" aria-label="Close">×</button>'+
      '<div class="ma-offer-head"><img src="/assets/brand/matchapp-ai-install-192.png?v=20260923-icon4" width="40" height="40" alt="">'+
      '<div><strong class="ma-offer-title"></strong><p class="ma-offer-description"></p></div></div>'+
      '<div class="ma-offer-actions"><button class="ma-offer-browser" type="button"></button>'+
      (PLAY_RELEASED?'<a class="ma-offer-play" target="_blank" rel="noopener noreferrer" href="'+PLAY+'"></a>':'<button class="ma-offer-play" type="button" disabled aria-disabled="true"></button>')+'</div>'+
      '<button class="ma-offer-never" type="button"></button>';
    paint(node);
    // No iOS App Store build exists. Safari supports browser Add to Home Screen.
    node.querySelector('.ma-offer-play').hidden=appleMobile();
    node.querySelector('.ma-offer-close').addEventListener('click',close);
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
