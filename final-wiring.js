/* Final production wiring: activate reviewed hardening modules without duplicating page markup. */
(function(){
  'use strict';
  const V='20260915-final6';
  const path=location.pathname;
  function js(src){if(document.querySelector(`script[src^="${src}"]`))return;const s=document.createElement('script');s.src=src+'?v='+V;s.async=false;s.defer=true;document.head.appendChild(s);}
  function brand(){
    if(!document.querySelector('link[data-matchapp-orbital-brand]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/brand.css?v='+V;l.dataset.matchappOrbitalBrand='1';document.head.appendChild(l);}
    document.querySelectorAll('.matchapp-wordmark').forEach(img=>{if(!/matchapp-tv-ai-v2\.svg(?:\?|$)/.test(img.getAttribute('src')||''))return;const next='/assets/brand/matchapp-tv-ai-v2.svg?v='+V;if(img.getAttribute('src')!==next)img.setAttribute('src',next);});
  }
  function style(){if(document.getElementById('matchapp-final-wiring-style'))return;const s=document.createElement('style');s.id='matchapp-final-wiring-style';s.textContent=`
    .brand-app-cluster{position:relative;display:inline-flex;align-items:center;overflow:visible}
    .brand-install-corner{position:absolute!important;right:-.5rem;bottom:-.45rem;z-index:40;min-width:0!important;min-height:26px!important;padding:4px 7px!important;border-radius:999px!important;font-size:9px!important;line-height:1!important;white-space:nowrap!important;box-shadow:0 5px 14px rgba(0,0,0,.36),0 0 0 1px rgba(255,255,255,.12) inset!important}
    .brand-install-corner.has-app-update{animation:maCornerUpdate 1.8s ease-in-out infinite!important}
    .install-source-suppressed{display:none!important}
    .install-safety-mini{position:absolute;top:calc(100% + .7rem);left:0;z-index:30;max-width:220px;padding:3px 7px;border-radius:999px;background:rgba(15,10,25,.94);border:1px solid rgba(229,193,88,.2);font-size:8px;line-height:1.25;color:#cfc6da;white-space:normal;pointer-events:none}
    .matchapp-format-badge{display:inline-flex;align-items:center;gap:.25rem;margin-left:.45rem;padding:.26rem .5rem;border-radius:999px;border:1px solid rgba(126,247,232,.28);background:rgba(126,247,232,.08);font-size:.72rem;font-weight:800;color:#bffcf3}
    .match-fresh-recovery{margin:1rem 0;padding:1rem;border:1px solid rgba(229,193,88,.25);border-radius:1rem;background:rgba(28,18,45,.72)}
    .match-fresh-recovery p{margin:.1rem 0 .75rem;color:#e8def7}
    .match-fresh-recovery div{display:flex;flex-wrap:wrap;gap:.5rem}
    .match-fresh-recovery button{border:1px solid rgba(229,193,88,.45);border-radius:999px;padding:.55rem .78rem;background:rgba(229,193,88,.08);color:#fff;cursor:pointer}
    @keyframes maCornerUpdate{0%,100%{box-shadow:0 5px 14px rgba(0,0,0,.36),0 0 0 0 rgba(126,247,232,.32)}50%{box-shadow:0 5px 14px rgba(0,0,0,.36),0 0 0 5px rgba(126,247,232,0)}}
    @media(max-width:700px){.brand-install-corner{right:-.25rem;bottom:-.35rem;font-size:8px!important}.install-safety-mini{display:none}}
    @media(prefers-reduced-motion:reduce){.brand-install-corner.has-app-update{animation:none!important}}
  `;document.head.appendChild(s);}
  function quotaRoute(e){const q=e.target.closest?.('#quota-badge');if(!q)return;e.preventDefault();e.stopImmediatePropagation();location.href='/pricing/pricing.html?from=quota#match-packs-section';}
  function boot(){
    brand();style();
    js('/install-corner.js');
    const appPages=path==='/'||path==='/index.html'||path==='/discover.html'||path==='/together.html';
    if(appPages){js('/production-hardening.js');js('/shown-history.js');js('/match-speed.js');}
    if(path==='/discover.html')js('/human-conversation.js');
    document.addEventListener('click',quotaRoute,true);
    document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest?.('#quota-badge'))quotaRoute(e);},true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
