// Functional release identifier must match release.json.
window.MATCHAPP_BUILD = '2026.09.16.4';


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
  const TODAY = '2026-09-16';
  const TRENDING = [
    'Slow Horses Season 6',
    'Monster: The Lizzie Borden Story',
    "Stranger Things: Tales from '85 Season 2",
    'K-drama Day 2026',
    'Toy Story 5'
  ];
  function upsertMeta(name, content) {
    let el = document.querySelector('meta[name="'+name+'"]');
    if (!el) { el = document.createElement('meta'); el.name = name; document.head.appendChild(el); }
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
    script.src = '/marquee-autoplay.js?v=20260916-flow2'; script.defer = true; script.dataset.matchappMarqueeAutoplay = '1';    document.head.appendChild(script);
  }
  function install() {
    const path = location.pathname;
    if (path === '/' || path === '/index.html') {
      loadHomeRuntimeFixes();
      document.title = 'What to Watch Tonight | AI Movie & TV Finder | MatchApp';
      upsertMeta('description', 'Find what to watch tonight with MatchApp: mood-based movie and TV picks, Ask AI, verified streaming links, Kids Mode and timely entertainment guides.');
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
        description: 'Voice- and text-enabled entertainment discovery concierge.',
        publisher: { '@type': 'Organization', name: 'MatchApp', url: 'https://matchapp.tv/' }
      });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();

(function(){
  if(document.querySelector('script[data-matchapp-final-wiring]'))return;
  const s=document.createElement('script');
  s.src='/final-wiring.js?v=20260916-perf-safe1';
  s.async=false; s.defer=true; s.dataset.matchappFinalWiring='1';
  document.head.appendChild(s);
})();
