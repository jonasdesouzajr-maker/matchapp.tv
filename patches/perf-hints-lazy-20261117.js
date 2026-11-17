/* Performance patch — 2026-11-17
   Adds connection hints and lazy-loads below-fold images.
   Does not touch AdSense, matching, or protected surfaces. */
(function () {
  'use strict';
  if (window.top !== window) return;
  if (/^\/(kids|private-voice|oauth)(\/|$)/.test(location.pathname)) return;

  // Connection hints for common external origins.
  var hints = [
    'https://image.tmdb.org',
    'https://fonts.gstatic.com',
    'https://covers.openlibrary.org'
  ];
  hints.forEach(function (origin) {
    if (document.querySelector('link[rel="dns-prefetch"][href="' + origin + '"]')) return;
    var link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = origin;
    document.head.appendChild(link);
  });

  // Lazy-load images that are below the fold and lack a loading attribute.
  function lazyImages() {
    var imgs = document.querySelectorAll('img:not([loading])');
    var vh = window.innerHeight || 800;
    imgs.forEach(function (img) {
      var rect = img.getBoundingClientRect();
      if (rect.top > vh * 1.2) {
        img.loading = 'lazy';
        img.decoding = 'async';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', lazyImages, { once: true });
  } else {
    lazyImages();
  }
})();
