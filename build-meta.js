// Functional release identifier must match release.json.
window.MATCHAPP_BUILD = '2026.09.16.2';


/* HOME STARTUP SCHEDULER
   app.js registers several DOMContentLoaded jobs. Preserve every one, but
   spread them over short task boundaries so the first paint stays responsive.
   Unlike the emergency gate, this never drops poster/event/rail initialization. */
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
    const delay=Math.min(1500,60+(slot++*85));
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

/* Search freshness + truthfulness layer.
   Keep this small and evidence-based: it improves discoverability without
   inventing ratings, reviews, popularity numbers or streaming availability. */
(function () {
  'use strict';
  const TODAY = '2026-09-16';
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

/* Final hardening loader: central entry point so every page that already loads
   build-meta receives the current integrity/install/brand/speed layer without HTML churn. */
(function(){
  if(document.querySelector('script[data-matchapp-final-wiring]'))return;
  const s=document.createElement('script');
  s.src='/final-wiring.js?v=20260916-uxfix2';
  s.async=false;
  s.defer=true;
  s.dataset.matchappFinalWiring='1';
  document.head.appendChild(s);
})();
