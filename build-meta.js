// Functional release identifier must match release.json.
window.MATCHAPP_BUILD = '2026.09.18.5';


/* HOME STARTUP SCHEDULER */
(function(){
  'use strict';
  const p=location.pathname;
  if(p!=='/'&&p!=='/index.html') return;
  if(window.__MATCHAPP_HOME_STARTUP_SCHEDULER__) return;
  window.__MATCHAPP_HOME_STARTUP_SCHEDULER__=true;
  const nativeAdd=Document.prototype.addEventListener;
  let slot=0;
  function patchedAdd(type,listener,options){
    const current=(document.currentScript&&document.currentScript.src)||'';
    const fromApp=type==='DOMContentLoaded'&&/\/app\.js(?:[?#]|$)/.test(current)&&typeof listener==='function';
    if(!fromApp) return nativeAdd.call(this,type,listener,options);
    const delay=Math.min(72,slot++*12);
    const wrapped=function(ev){
      const self=this;
      setTimeout(function(){
        try{listener.call(self,ev);}catch(err){console.error('[MatchApp startup]',err);}
      },delay);
    };
    return nativeAdd.call(this,type,wrapped,options);
  }
  Document.prototype.addEventListener=patchedAdd;
  window.addEventListener('load',function restoreNativeListener(){
    if(Document.prototype.addEventListener===patchedAdd) Document.prototype.addEventListener=nativeAdd;
  },{once:true});
})();

/* Search freshness + truthfulness layer. */
(function () {
  'use strict';
  const TODAY = '2026-09-18';
  const TRENDING = [
    'Antártida',
    'Era Uma Vez Minha 1ª Vez',
    'Quem Ama Cuida',
    'Vermelho Sangue',
    'Amor Sob Vigilância',
    'Resident Evil',
    'Monster: The Lizzie Borden Story',
    'The Scandal',
    'Slow Horses',
    'Outlander: Blood of My Blood'
  ];
  function upsertMeta(name, content) {
    let el = document.querySelector('meta[name="'+name+'"]');
    if (!el) { el = document.createElement('meta'); el.name = name; document.head.appendChild(el); }
    el.content = content;
  }
  function upsertPropertyMeta(property, content) {
    let el = document.querySelector('meta[property="'+property+'"]');
    if (!el) { el = document.createElement('meta'); el.setAttribute('property', property); document.head.appendChild(el); }
    el.content = content;
  }
  function addJsonLd(id, data) {
    if (document.getElementById(id)) return;
    const script = document.createElement('script');
    script.id = id; script.type = 'application/ld+json'; script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }
  function loadHomeRuntimeFixes() {
    if (document.querySelector('script[data-matchapp-marquee-autoplay]')) return;
    const script = document.createElement('script');
    script.src = '/marquee-autoplay.js?v=20260918-mobile-scroll1&b=' + encodeURIComponent(window.MATCHAPP_BUILD || '2026.09.18.5'); script.defer = true; script.dataset.matchappMarqueeAutoplay = '1';    document.head.appendChild(script);
  }
  function normalizePricingTruth() {
    const path = (location.pathname || '').replace(/\/+$/, '') || '/';
    if (path !== '/pricing' && path !== '/pricing/pricing.html') return;

    const vipDaily = 10;
    document.title = 'MatchApp TV Ai VIP | 10 Included AI Actions Daily & Ad-Free Pass';
    upsertMeta('description', 'MatchApp VIP includes 10 AI actions per day and Business includes 50. Included actions can be Matches or Ask AI; Extra Matches and Ask AI credits are separate top-ups.');
    upsertPropertyMeta('og:title', 'MatchApp VIP — 10 Included AI Actions Daily');
    upsertPropertyMeta('og:description', 'VIP includes 10 AI actions per day; Business includes 50. Included actions can be Matches or Ask AI, with separate top-ups after the daily allowance.');

    const heading = document.querySelector('[data-i18n="pricing.title"]');
    if (heading) heading.textContent = 'Match More With VIP';
    const subtitle = document.querySelector('[data-i18n="pricing.subtitle"]');
    if (subtitle) subtitle.textContent = 'VIP includes 10 AI actions per day; Business includes 50. Use the included allowance for Matches or Ask AI, then top up each separately.';
    const monthly = document.querySelector('[data-i18n-html="pricing.vipm.f1"]');
    if (monthly) monthly.innerHTML = '✔️ <strong>'+vipDaily+'</strong> included AI actions daily';

    document.querySelectorAll('script[type="application/ld+json"]').forEach(function (script) {
      try {
        const data = JSON.parse(script.textContent || '{}');
        if (data && data['@type'] === 'Product' && data.name === 'MatchApp VIP') {
          data.description = '10 included AI actions per day, usable for Matches or Ask AI, plus no ads, priority routing and prioritised regional content.';
          script.textContent = JSON.stringify(data);
        }
      } catch (_) {}
    });
  }
  function install() {
    const path = location.pathname;
    if (path === '/' || path === '/index.html') {
      loadHomeRuntimeFixes();
      document.title = 'What to Watch Tonight | AI Movie & TV Finder | MatchApp';
      upsertMeta('description', 'Find what to watch tonight with MatchApp: exact mood matching, verified streaming and cinema availability by country, local streaming alerts, Kids Mode and Match Together.');
      upsertMeta('robots', 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');
      upsertPropertyMeta('og:description', 'Tell MatchApp your mood, get a title, see where it streams or plays in cinemas by country, and follow it for local streaming alerts.');
      addJsonLd('matchapp-organization-schema', {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'MatchApp',
        url: 'https://matchapp.tv/',
        logo: 'https://matchapp.tv/assets/brand/matchapp-icon-512.png',
        email: 'support@matchapp.tv',
        description: 'AI entertainment discovery service for movies, series, K-dramas, anime, novelas, micro-dramas, podcasts, music and family viewing.'
      });
    }
    if (path === '/discover.html') {
      document.title = 'Ask AI What to Watch | Movie & TV Concierge | MatchApp';
      upsertMeta('description', 'Ask MatchApp what to watch, then see verified streaming, rental and cinema options by country. Follow titles and get alerted when streaming starts locally.');
      upsertMeta('robots', 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');
      // Describe the public page factually. Do not claim Software/WebApplication
      // rich-result eligibility until MatchApp has genuine review/rating data.
      addJsonLd('matchapp-discover-page-schema', {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Ask AI What to Watch | MatchApp',
        url: 'https://matchapp.tv/discover.html',
        description: 'Voice- and text-enabled entertainment concierge with regional streaming, rental and cinema availability plus opt-in title alerts.',
        isPartOf: { '@type': 'WebSite', name: 'MatchApp TV Ai', url: 'https://matchapp.tv/' },
        publisher: { '@type': 'Organization', name: 'MatchApp', url: 'https://matchapp.tv/', logo: { '@type': 'ImageObject', url: 'https://matchapp.tv/assets/brand/matchapp-icon-512.png', width: 512, height: 512 } }
      });
    }
    normalizePricingTruth();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();

(function(){
  if(document.querySelector('script[data-matchapp-final-wiring]'))return;
  const s=document.createElement('script');
  s.src='/final-wiring.js?v=20260918-logo-news2';
  s.async=false; s.defer=true; s.dataset.matchappFinalWiring='1';
  document.head.appendChild(s);
})();