// Functional release identifier must match release.json.
window.MATCHAPP_BUILD = '2026.09.15.9';

/* EMERGENCY SAFE BOOT
   The homepage had accumulated several independent startup enhancement layers.
   In a browser that is already under load, any forgotten short interval or
   observer feedback loop can starve the main thread before the user can click.
   Safe boot keeps the core matcher/auth/i18n runtime but removes continuous
   presentation work from the home route until each enhancement is reintroduced
   behind a measured budget. */
(function(){
  'use strict';
  const path=location.pathname;
  const home=path==='/'||path==='/index.html';
  if(!home)return;
  window.MATCHAPP_SAFE_BOOT=true;
  document.documentElement.classList.add('matchapp-safe-boot');

  // Clamp every interval created after this point. app.js historically had a
  // 16ms rail timer and the loading meter uses 100ms ticks; neither needs that
  // frequency to keep the product functional. One second is intentionally
  // conservative while we recover frozen tabs across desktop/mobile/TV.
  const nativeSetInterval=window.setInterval.bind(window);
  window.setInterval=function(fn,ms,...args){
    const delay=Math.max(1000,Number(ms)||0);
    return nativeSetInterval(fn,delay,...args);
  };
  window.setInterval.__matchappSafeBoot=true;

  const style=document.createElement('style');
  style.id='matchapp-safe-boot-style';
  style.textContent=`
    html.matchapp-safe-boot *,html.matchapp-safe-boot *::before,html.matchapp-safe-boot *::after{animation:none!important;transition:none!important}
    html.matchapp-safe-boot #ambient-bg,html.matchapp-safe-boot .ambient-bg{display:none!important}
    html.matchapp-safe-boot .ad-banner-container,html.matchapp-safe-boot .side-ad{min-height:0!important}
    html.matchapp-safe-boot .scanner-stage .scan-beam,html.matchapp-safe-boot .eq-bars{animation:none!important}
  `;
  document.head.appendChild(style);
})();

/* Search freshness + truthfulness layer.
   Keep this small and evidence-based: it improves discoverability without
   inventing ratings, reviews, popularity numbers or streaming availability. */
(function () {
  'use strict';
  const TODAY = '2026-09-15';
  const TRENDING = [
    'Slow Horses Season 6',
    'Monster: The Lizzie Borden Story',
    "Stranger Things: Tales from '85 Season 2",
    'K-drama Day 2026',
    'Toy Story 5'
  ];

  function upsertMeta(name, content) {
    let el = document.querySelector(`meta[name="${name}"]`);
    if (!el) { el = document.createElement('meta'); el.name = name; document.head.appendChild(el); }
    el.content = content;
  }

  function addJsonLd(id, data) {
    if (document.getElementById(id)) return;
    const script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }

  // Kept for non-safe-boot use and regression coverage. Home safe boot does
  // not call it, so the old rail cannot start a second autoplay controller.
  function loadHomeRuntimeFixes() {
    if (window.MATCHAPP_SAFE_BOOT) return;
    if (document.querySelector('script[data-matchapp-marquee-autoplay]')) return;
    const script = document.createElement('script');
    script.src = '/marquee-autoplay.js?v=20260915c';
    script.defer = true;
    script.dataset.matchappMarqueeAutoplay = '1';
    document.head.appendChild(script);
  }

  function install() {
    const path = location.pathname;

    if (path === '/' || path === '/index.html') {
      loadHomeRuntimeFixes();
      document.title = 'What to Watch Tonight | AI Movie & TV Finder | MatchApp';
      upsertMeta('description', 'Find what to watch tonight with MatchApp: mood-based movie and TV picks, Ask AI, verified streaming links, Kids Mode and timely entertainment guides.');
      document.querySelectorAll('script[type="application/ld+json"]').forEach((node) => {
        try {
          const data = JSON.parse(node.textContent);
          if (data && data['@type'] === 'WebPage' && data.url === 'https://matchapp.tv/') {
            data.dateModified = TODAY;
            node.textContent = JSON.stringify(data);
          }
        } catch (_) {}
      });
      if (!document.getElementById('current-entertainment-searches')) {
        const footer = document.querySelector('.seo-footer');
        if (footer) {
          const section = document.createElement('section');
          section.id = 'current-entertainment-searches';
          section.setAttribute('aria-label', 'Current entertainment searches');
          section.style.cssText = 'max-width:1150px;margin:0 auto 22px;padding:20px 18px;text-align:center';
          const h2 = document.createElement('h2');
          h2.textContent = 'What people are looking to watch this week';
          h2.style.cssText = 'font-size:20px;margin:0 0 12px;color:var(--gold,#e5c158)';
          const p = document.createElement('p');
          p.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:center;gap:9px;margin:0';
          TRENDING.forEach((term) => {
            const a = document.createElement('a');
            a.href = '/discover.html?q=' + encodeURIComponent(term);
            a.textContent = term;
            a.style.cssText = 'color:inherit;text-decoration:none;border:1px solid rgba(229,193,88,.45);border-radius:999px;padding:8px 12px;background:rgba(229,193,88,.08)';
            p.appendChild(a);
          });
          section.append(h2, p);
          footer.parentNode.insertBefore(section, footer);
        }
      }
    }

    if (path === '/discover.html') {
      document.title = 'Ask AI What to Watch | Movie & TV Concierge | MatchApp';
      upsertMeta('description', 'Ask MatchApp what to watch by mood, theme, event or topic. Get entertainment recommendations, real title information and links to continue your search or stream.');
      addJsonLd('matchapp-webapp-schema', {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'MatchApp AI Concierge',
        url: 'https://matchapp.tv/discover.html',
        applicationCategory: 'EntertainmentApplication',
        operatingSystem: 'Any',
        browserRequirements: 'Requires JavaScript and a modern web browser',
        description: 'Voice- and text-enabled entertainment discovery concierge for movies, series, K-dramas, anime, novelas, podcasts and more.',
        inLanguage: ['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'],
        publisher: { '@type': 'Organization', name: 'MatchApp', url: 'https://matchapp.tv/' }
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();

/* Final hardening loader remains enabled on non-home pages. The home route is
   deliberately excluded during safe boot so no MutationObserver/runtime repair
   layer is allowed to start before the core page proves responsive. */
(function(){
  if(window.MATCHAPP_SAFE_BOOT)return;
  if(document.querySelector('script[data-matchapp-final-wiring]'))return;
  const s=document.createElement('script');
  s.src='/final-wiring.js?v=20260915-final9';
  s.async=false;
  s.defer=true;
  s.dataset.matchappFinalWiring='1';
  document.head.appendChild(s);
})();
