/* MatchApp surgical brand corrections — logo, localized AI label, logout only. */
(function(){
  'use strict';

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

  function applyLogoMotion(){
    document.querySelectorAll('.header-brand-area .brand-logo').forEach(img=>{
      // Use the current static master mark so the only motion is the requested
      // outer shine + inner orbit/star, rather than motion baked into the SVG.
      if(!/\/logo\.jpeg(?:\?|$)/.test(img.getAttribute('src')||'')) img.src='/logo.jpeg?v=20260918-brandfix1';
      let shell=img.parentElement;
      if(!shell?.classList.contains('ma-logo-motion-shell')){
        shell=document.createElement('span');
        shell.className='ma-logo-motion-shell';
        img.parentNode.insertBefore(shell,img);
        shell.appendChild(img);
      }
      if(!shell.querySelector('.ma-logo-inner-orbit')){
        const orbit=document.createElement('span');
        orbit.className='ma-logo-inner-orbit';
        orbit.setAttribute('aria-hidden','true');
        orbit.innerHTML='<span class="ma-logo-orbit-star">✦</span>';
        shell.appendChild(orbit);
      }
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

  function apply(){applyWordmark();applyLogoMotion();applyLogout();}
  document.addEventListener('matchapp:langchange',()=>setTimeout(apply,0));
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply,{once:true}); else apply();
})();
