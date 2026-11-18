/* SEO enrichment — long-tail and trending signals.
   Does not change ad IDs, slots, matching, or Jonas voice. */
(function () {
  'use strict';
  if (/^\/(kids|private-voice|oauth)(\/|$)/.test(location.pathname)) return;

  /* Long-tail keywords relevant to discovery */
  var keywords = [
    'what to watch tonight',
    'movie recommendations by mood',
    'where to stream',
    'best shows this week',
    'find something to watch',
    'streaming guide by country',
    'movie night planner',
    'TV series recommendations',
    'watchlist ideas',
    'entertainment matcher'
  ];

  var meta = document.querySelector('meta[name="keywords"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'keywords';
    document.head.appendChild(meta);
  }
  meta.content = keywords.join(', ');

  /* Add JSON-LD if missing */
  if (!document.querySelector('script[type="application/ld+json"]')) {
    var ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      'name': 'MatchApp Ai',
      'url': 'https://matchapp.tv/',
      'description': 'Find movies and TV shows to watch tonight. Get picks by mood and see where to stream in your country.',
      'applicationCategory': 'Entertainment',
      'operatingSystem': 'Web'
    });
    document.head.appendChild(ld);
  }
})();
