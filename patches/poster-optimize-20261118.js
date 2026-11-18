/* Optimize poster loading.
   Visible posters load first. Background wall uses smaller sizes and defers. */
(function () {
  'use strict';
  if (/^\/(kids|private-voice|oauth)(\/|$)/.test(location.pathname)) return;

  function optimize() {
    var imgs = document.querySelectorAll('img[src*="image.tmdb.org"], img[src*="tmdb"], img[class*="poster"]');
    var vh = window.innerHeight || 800;
    imgs.forEach(function (img, i) {
      var rect = img.getBoundingClientRect();
      var inView = rect.top < vh * 1.2 && rect.bottom > -100;
      if (inView && !img.complete) {
        img.loading = 'eager';
        img.fetchPriority = i < 4 ? 'high' : 'auto';
        img.decoding = 'async';
      } else if (!inView) {
        img.loading = 'lazy';
        img.fetchPriority = 'low';
      }
      if (!img.hasAttribute('width') && !img.hasAttribute('height')) {
        img.style.aspectRatio = '2 / 3';
      }
    });

    /* Background wall tiles: prefer w185 size, defer */
    var wall = document.querySelectorAll('.poster-wall-tile img, [class*="poster-wall"] img');
    wall.forEach(function (img) {
      if (img.src.includes('/w500/') || img.src.includes('/w780/')) {
        img.src = img.src.replace(/\/w\d+\//, '/w185/');
      }
      img.loading = 'lazy';
      img.fetchPriority = 'low';
      img.decoding = 'async';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', optimize);
  } else {
    optimize();
  }
  setTimeout(optimize, 400);
})();
