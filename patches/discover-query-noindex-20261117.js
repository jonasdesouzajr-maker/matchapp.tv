/* Noindex discover.html query variants — 2026-11-17
   Search parameter pages are thin and should not be indexed.
   Canonical points to the base discover page. */
(function () {
  'use strict';
  if (!/\/discover\.html$/i.test(location.pathname)) return;
  var q = new URLSearchParams(location.search).get('q');
  if (!q) return;
  var robots = document.querySelector('meta[name="robots"]');
  if (robots) {
    robots.content = 'noindex, follow';
  } else {
    robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex, follow';
    document.head.appendChild(robots);
  }
  var canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = location.origin + '/discover.html';
})();
