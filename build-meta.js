// Functional release identifier must match release.json.
window.MATCHAPP_BUILD = '2026.09.20.2';


/* Search freshness + truthfulness layer. */
(function () {
  'use strict';
  const TODAY = '2026-09-20';
  const TRENDING = [
    'Habeas Corpus',
    'Era Uma Vez Minha 1ª Vez',
    'Furnas Fundas',
    'Virtuosas',
    'Viva Marília',
    'American Hostage',
    'Youth',
    'Stop! That! Train!',
    'How to Live on Earth',
    'Lanterns'
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

    // MatchApp plans are digital services, not shippable merchant products.
    // Remove any legacy Product JSON-LD left by an older cached/template release so
    // Google does not expect physical-goods shipping, returns or fabricated reviews.
    document.querySelectorAll('script[type="application/ld+json"]').forEach(function (script) {
      try {
        const data = JSON.parse(script.textContent || '{}');
        if (data && data['@type'] === 'Product' && /^MatchApp\b/i.test(String(data.name || ''))) {
          script.remove();
        }
      } catch (_) {}
    });
  }
  function ensureKidsEntry(){
    const p=(location.pathname||'/').toLowerCase();if(p==='/kids'||p.startsWith('/kids/'))return;
    let entry=document.getElementById('matchapp-kids-entry');const header=document.querySelector('header.app-header,.app-header');const host=header?.querySelector('nav,#header-auth-area')||header;
    if(!entry){entry=document.createElement('a');entry.id='matchapp-kids-entry';entry.className='ma-kids-mode-entry';entry.href='/kids/';entry.setAttribute('aria-label','Open Kids Mode');entry.setAttribute('title','Kids Mode');entry.innerHTML='<img src="/kids/kids-logo-sm.jpeg" alt="" width="23" height="23"><span>Kids Mode</span>';}
    if(host){entry.classList.remove('ma-kids-floating');if(entry.parentNode!==host)host.appendChild(entry)}else if(document.body&&!entry.isConnected){entry.classList.add('ma-kids-floating');document.body.appendChild(entry)}
  }
  function install() {
    const path = location.pathname;
    ensureKidsEntry();
    if (path === '/' || path === '/index.html') {
      document.title = 'What to Watch Tonight | AI Movie & TV Finder | MatchApp';
      upsertMeta('description', 'Find what to watch tonight with MatchApp: exact mood matching, verified streaming and cinema availability by country, local streaming alerts, Kids Mode and Match Together.');
      upsertMeta('robots', 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');
      upsertPropertyMeta('og:description', 'Tell MatchApp your mood, get a title, see where it streams or plays in cinemas by country, and follow it for local streaming alerts.');
      addJsonLd('matchapp-organization-schema', {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'MatchApp',
        url: 'https://matchapp.tv/',
        logo: 'https://matchapp.tv/assets/brand/matchapp-official-icon-512.webp',
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
        publisher: { '@type': 'Organization', name: 'MatchApp', url: 'https://matchapp.tv/', logo: { '@type': 'ImageObject', url: 'https://matchapp.tv/assets/brand/matchapp-official-icon-512.webp', width: 512, height: 512 } }
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
  s.src='/final-wiring.js?v=20260920-design4';
  s.async=false; s.defer=true; s.dataset.matchappFinalWiring='1';
  document.head.appendChild(s);
})();