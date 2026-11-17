/* Fast poster rendering — prioritizes visible posters and match results */
(function () {
  'use strict';
  if (/^\/(kids|private-voice|oauth)(\/|$)/.test(location.pathname)) return;

  function prioritize() {
    var imgs = document.querySelectorAll('img[src*="tmdb"], img[src*="poster"], img[class*="poster"]');
    var vh = window.innerHeight || 800;
    imgs.forEach(function (img, i) {
      var rect = img.getBoundingClientRect();
      if (rect.top < vh * 1.5 && !img.complete) {
        img.loading = 'eager';
        img.fetchPriority = i < 6 ? 'high' : 'auto';
        img.decoding = 'async';
      }
      if (!img.hasAttribute('width') && !img.hasAttribute('height')) {
        img.style.aspectRatio = '2 / 3';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', prioritize);
  } else {
    prioritize();
  }
  setTimeout(prioritize, 300);
})();
