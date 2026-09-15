// Functional release identifier must match release.json.
window.MATCHAPP_BUILD = '2026.09.15.2';

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

  function loadHomeRuntimeFixes() {
    if (document.querySelector('script[data-matchapp-marquee-autoplay]')) return;
    const script = document.createElement('script');
    script.src = '/marquee-autoplay.js?v=20260915a';
    script.defer = true;
    script.dataset.matchappMarqueeAutoplay = '1';
    document.head.appendChild(script);
  }

  function install() {
    const path = location.pathname;

    if (path === '/' || path === '/index.html') {
      loadHomeRuntimeFixes();
      // Keep the homepage snippet aligned with what the page actually does.
      document.title = 'What to Watch Tonight | AI Movie & TV Finder | MatchApp';
      upsertMeta('description', 'Find what to watch tonight with MatchApp: mood-based movie and TV picks, Ask AI, verified streaming links, Kids Mode and timely entertainment guides.');

      // Update the existing WebPage freshness only when this release genuinely changed the page.
      document.querySelectorAll('script[type="application/ld+json"]').forEach((node) => {
        try {
          const data = JSON.parse(node.textContent);
          if (data && data['@type'] === 'WebPage' && data.url === 'https://matchapp.tv/') {
            data.dateModified = TODAY;
            node.textContent = JSON.stringify(data);
          }
        } catch (_) {}
      });

      // A compact, visible freshness block. These are search shortcuts, not
      // unsupported claims that MatchApp itself measures popularity.
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

      // Legitimate Application structured data: no fabricated aggregateRating,
      // review, download count or price claim. This resolves the audit warning
      // without manufacturing rich-result fields.
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
