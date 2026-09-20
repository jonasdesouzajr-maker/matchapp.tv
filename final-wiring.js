/* Final production wiring: activate reviewed hardening modules without duplicating page markup. */
(function(){
  'use strict';
  const V='20260920-design2';
  const path=location.pathname;
  const isKids=path==='/kids'||path.startsWith('/kids/');
  const isHome=path==='/'||path==='/index.html';
  function js(src){if(document.querySelector(`script[src^="${src}"]`))return;const s=document.createElement('script');s.src=src+'?v='+V;s.async=false;s.defer=true;document.head.appendChild(s);}
  function upsertMeta(name,content){let m=document.querySelector(`meta[name="${name}"]`);if(!m){m=document.createElement('meta');m.name=name;document.head.appendChild(m);}m.content=content;}
  function brand(){
    if(isKids)return;
    if(!document.querySelector('link[data-matchapp-orbital-brand]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/brand.css?v='+V;l.dataset.matchappOrbitalBrand='1';document.head.appendChild(l);}
    if(!document.querySelector('link[data-matchapp-brand-corrections]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/brand-corrections.css?v='+V;l.dataset.matchappBrandCorrections='1';document.head.appendChild(l);}
    document.querySelectorAll('.matchapp-wordmark').forEach(img=>{if(!/matchapp-tv-ai-v2\.svg(?:\?|$)/.test(img.getAttribute('src')||''))return;const next='/assets/brand/matchapp-tv-ai-v2.svg?v='+V;if(img.getAttribute('src')!==next)img.setAttribute('src',next);});
  }
  function pwaIdentity(){
    if(isKids)return;
    let manifest=document.querySelector('link[rel="manifest"]');
    if(!manifest){manifest=document.createElement('link');manifest.rel='manifest';document.head.appendChild(manifest);}
    manifest.href='/manifest.json?v='+V;
    let apple=document.querySelector('link[rel="apple-touch-icon"]');
    if(!apple){apple=document.createElement('link');apple.rel='apple-touch-icon';document.head.appendChild(apple);}
    apple.href='/assets/brand/matchapp-apple-touch-icon.png?v='+V;
    upsertMeta('application-name','MatchApp Ai');
    upsertMeta('apple-mobile-web-app-title','MatchApp Ai');
    upsertMeta('mobile-web-app-capable','yes');
    upsertMeta('apple-mobile-web-app-capable','yes');
  }
  function aiDisclosure(){
    if(path!=='/'&&path!=='/index.html')return;
    const source=document.querySelector('.top-ask-alt[data-i18n="jump.trending"],.top-ask-alt');
    if(!source)return;
    const key='matchapp_ai_disclosure_dismissed_v1';
    try{if(localStorage.getItem(key)==='1'){source.remove();return;}}catch(_){ }
    const box=document.createElement('div');
    box.className='ai-trust-notice';
    box.setAttribute('role','note');
    box.setAttribute('aria-label','AI disclosure');
    const dot=document.createElement('span');dot.className='ai-trust-dot';dot.setAttribute('aria-hidden','true');
    const copy=document.createElement('span');copy.className='ai-trust-copy';copy.textContent='MatchApp uses AI and can make mistakes. It is always improving — stay tuned and install the app for updates on new releases.';
    const close=document.createElement('button');close.type='button';close.className='ai-trust-close';close.setAttribute('aria-label','Dismiss AI disclosure');close.title='Dismiss';close.textContent='×';
    close.addEventListener('click',()=>{try{localStorage.setItem(key,'1');}catch(_){ }box.classList.add('is-leaving');setTimeout(()=>box.remove(),220);});
    box.append(dot,copy,close);
    source.replaceWith(box);
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
    .ai-trust-notice{position:relative;display:flex;align-items:center;gap:.55rem;width:min(94vw,780px);margin:.25rem auto .85rem;padding:.55rem 2.25rem .55rem .8rem;border:1px solid color-mix(in srgb,var(--theme-accent,#e5c158) 28%,transparent);border-radius:999px;background:linear-gradient(110deg,rgba(21,12,39,.76),rgba(57,29,83,.66),rgba(21,12,39,.76));box-shadow:0 8px 24px rgba(0,0,0,.2),inset 0 1px 0 rgba(255,255,255,.08);backdrop-filter:blur(8px);overflow:hidden;animation:maDisclosureIn .45s cubic-bezier(.2,.8,.2,1) both}
    .ai-trust-dot{width:.43rem;height:.43rem;flex:0 0 auto;border-radius:50%;background:#e5c158;box-shadow:0 0 0 4px rgba(229,193,88,.1),0 0 13px rgba(229,193,88,.52);animation:maDisclosureDot 2.1s ease-in-out infinite}
    .ai-trust-copy{font-size:clamp(.72rem,1.3vw,.84rem);line-height:1.35;font-weight:650;letter-spacing:.005em;color:#ddd1ed;background:linear-gradient(105deg,#d9cfe8 0%,#d9cfe8 34%,#fff6ca 45%,#ffffff 50%,#fff6ca 55%,#d9cfe8 66%,#d9cfe8 100%);background-size:220% 100%;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:maDisclosureShine 4.8s linear infinite}
    .ai-trust-close{position:absolute;right:.42rem;top:50%;transform:translateY(-50%);display:grid;place-items:center;width:1.55rem;height:1.55rem;min-width:1.55rem!important;min-height:1.55rem!important;padding:0!important;border:1px solid rgba(255,110,110,.42)!important;border-radius:50%!important;background:rgba(126,21,33,.72)!important;color:#ff818d!important;font-size:1.05rem!important;line-height:1!important;cursor:pointer;box-shadow:0 0 0 2px rgba(255,75,91,.06);transition:transform .18s ease,background .18s ease,box-shadow .18s ease!important}
    .ai-trust-close:hover,.ai-trust-close:focus-visible{transform:translateY(-50%) scale(1.08);background:rgba(174,25,42,.92)!important;box-shadow:0 0 0 4px rgba(255,75,91,.1)}
    .ai-trust-notice.is-leaving{animation:maDisclosureOut .22s ease forwards}
    .marquee-track.is-marquee-flowing .marquee-item img,#events-track.is-marquee-flowing img{animation:none!important;filter:none!important}
    @keyframes maCornerUpdate{0%,100%{box-shadow:0 5px 14px rgba(0,0,0,.36),0 0 0 0 rgba(126,247,232,.32)}50%{box-shadow:0 5px 14px rgba(0,0,0,.36),0 0 0 5px rgba(126,247,232,0)}}
    @keyframes maDisclosureIn{from{opacity:0;transform:translateY(-6px) scale(.985)}to{opacity:1;transform:none}}
    @keyframes maDisclosureOut{to{opacity:0;transform:translateY(-4px) scale(.985)}}
    @keyframes maDisclosureDot{0%,100%{transform:scale(.9);opacity:.75}50%{transform:scale(1.15);opacity:1}}
    @keyframes maDisclosureShine{0%{background-position:160% 0}100%{background-position:-70% 0}}
    @media(max-width:700px){.brand-install-corner{right:-.25rem;bottom:-.35rem;font-size:8px!important}.install-safety-mini{display:none}.ai-trust-notice{width:calc(100% - 1rem);border-radius:1rem;padding:.58rem 2.05rem .58rem .7rem;gap:.48rem}.ai-trust-copy{font-size:.72rem}.ai-trust-close{right:.35rem}}
    @media(prefers-reduced-motion:reduce){.brand-install-corner.has-app-update,.ai-trust-notice,.ai-trust-dot,.ai-trust-copy{animation:none!important}.ai-trust-copy{background:none!important;-webkit-text-fill-color:currentColor!important;color:#ddd1ed!important}}
  `;document.head.appendChild(s);}
  function quotaRoute(e){const q=e.target.closest?.('#quota-badge');if(!q)return;e.preventDefault();e.stopImmediatePropagation();location.href='/pricing/pricing.html?from=quota#match-packs-section';}
  function boot(){
    if(!isHome)brand();style();pwaIdentity();aiDisclosure();
    if(!isKids&&!isHome)js('/brand-corrections.js');
    if(!isHome){js('/install-corner.js');js('/install-device-choice.js');}
    const appPages=path==='/'||path==='/index.html'||path==='/discover.html'||path==='/together.html';
    if(appPages){js('/production-hardening.js');js('/shown-history.js');js('/match-speed.js');js('/catalog-media.js');}
    if(path==='/'||path==='/index.html'){
      const loadHomeEditorial=()=>{
        js('/weekly-pick.js');js('/latest-news.js?v=20260920-speed1');js('/live-news-loader.js');js('/latest-news-image-guard.js');
      };
      const sentinel=document.getElementById('premiere-disclosure')||document.getElementById('swifties-spotify')||document.getElementById('global-events');
      if(sentinel&&'IntersectionObserver' in window){
        const io=new IntersectionObserver(entries=>{
          if(entries.some(e=>e.isIntersecting)){io.disconnect();loadHomeEditorial();}
        },{rootMargin:'0px'});
        io.observe(sentinel);
      }else if(document.readyState==='complete'){
        setTimeout(loadHomeEditorial,1200);
      }else{
        addEventListener('load',()=>setTimeout(loadHomeEditorial,600),{once:true});
      }
    }
    if(path==='/discover.html')js('/human-conversation.js');
    document.addEventListener('click',quotaRoute,true);
    document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest?.('#quota-badge'))quotaRoute(e);},true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();