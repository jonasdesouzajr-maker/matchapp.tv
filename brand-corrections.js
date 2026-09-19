/* MatchApp surgical brand corrections — canonical animated logo, localized AI label, logout only. */
(function(){
  'use strict';

  const LOGO_ASSET='/assets/brand/matchapp-logo-animated-transparent.svg?v=20260919-premium-slow1';
  const isKidsRoute=()=>{const p=location.pathname.toLowerCase();return p==='/kids'||p.startsWith('/kids/');};

  const AI_LABELS={
    en:'AI','pt-BR':'IA',pt:'IA',es:'IA',fr:'IA',de:'KI',it:'IA',tr:'YZ',ru:'ИИ',
    ar:'ذكاء اصطناعي',hi:'AI',id:'AI',ja:'AI',ko:'AI',zh:'AI'
  };
  const LOGOUT_LABELS={
    en:'Log out','pt-BR':'Sair',pt:'Sair',es:'Cerrar sesión',fr:'Se déconnecter',de:'Abmelden',
    it:'Esci',tr:'Çıkış yap',ru:'Выйти',ar:'تسجيل الخروج',hi:'लॉग आउट',id:'Keluar',ja:'ログアウト',ko:'로그아웃',zh:'退出登录'
  };

  function lang(){
    const raw=String(window.MATCH_LANG||document.documentElement.lang||'en');
    if(AI_LABELS[raw]) return raw;
    const base=raw.toLowerCase().split('-')[0];
    return Object.keys(AI_LABELS).find(k=>k.toLowerCase()===base)||'en';
  }

  function applyWordmark(){
    if(isKidsRoute()) return;
    const code=lang();
    document.querySelectorAll('.app-title-main').forEach(host=>{
      host.classList.add('has-ma-local-wordmark');
      host.querySelectorAll('.matchapp-wordmark,.matchapp-live-wordmark').forEach(el=>el.classList.add('ma-wordmark-source-hidden'));
      let live=host.querySelector('.matchapp-local-wordmark');
      if(!live){
        live=document.createElement('span');
        live.className='matchapp-local-wordmark';
        live.innerHTML='<span class="matchapp-local-core">MatchApp</span><span class="matchapp-local-tv">TV</span><span class="matchapp-local-ai"></span>';
        host.appendChild(live);
      }
      const ai=live.querySelector('.matchapp-local-ai');
      const label=AI_LABELS[code]||AI_LABELS.en;
      ai.textContent=label;
      ai.dataset.long=String(label.length>3);
      const link=host.closest('.matchapp-brand-link');
      if(link) link.setAttribute('aria-label',`MatchApp TV ${label}`);
    });
  }

  function buildLogo(){
    const img=document.createElement('img');
    img.className='brand-logo ma-new-brand-logo';
    img.src=LOGO_ASSET;
    img.alt='MatchApp';
    img.width=96;
    img.height=96;
    img.decoding='async';
    img.setAttribute('data-matchapp-canonical-logo','1');
    return img;
  }

  function applyLogoAsset(){
    if(isKidsRoute()) return;
    document.querySelectorAll('.matchapp-brand-link').forEach(link=>{
      let slot=link.querySelector(':scope > .brand-logo-placeholder,:scope > .brand-logo,:scope > picture,:scope > img:not(.matchapp-wordmark)');
      if(slot?.matches?.('img[data-matchapp-canonical-logo="1"]')){
        if(slot.getAttribute('src')!==LOGO_ASSET)slot.setAttribute('src',LOGO_ASSET);
        return;
      }
      const logo=buildLogo();
      if(slot) slot.replaceWith(logo);
      else link.prepend(logo);
    });
  }

  function applyLogout(){
    const btn=document.getElementById('nav-logout-btn');
    if(!btn) return;
    const code=lang();
    const label=LOGOUT_LABELS[code]||LOGOUT_LABELS.en;
    btn.removeAttribute('data-i18n');
    btn.setAttribute('aria-label',label);
    btn.setAttribute('title',label);
    btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10 5H6.8A1.8 1.8 0 0 0 5 6.8v10.4A1.8 1.8 0 0 0 6.8 19H10" stroke-width="1.8" stroke-linecap="round"/><path d="M14 8l4 4-4 4M18 12H9" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function apply(){applyWordmark();applyLogoAsset();applyLogout();}
  document.addEventListener('matchapp:langchange',()=>setTimeout(apply,0));
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply,{once:true}); else apply();
})();
