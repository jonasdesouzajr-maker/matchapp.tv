/* Core Web Vitals optimization.
   Reserves space, prioritizes LCP, defers non-critical work.
   Does not change ad IDs, slots, or initialization. */
(function () {
  'use strict';
  if (/^\/(kids|private-voice|oauth)(\/|$)/.test(location.pathname)) return;

  function optimize() {
    /* Reserve aspect ratio on images to reduce CLS */
    var imgs = document.querySelectorAll('img:not([width]):not([height])');
    imgs.forEach(function (img) {
      if (!img.style.aspectRatio) {
        img.style.aspectRatio = img.classList.contains('poster') || img.src.includes('tmdb') ? '2 / 3' : '16 / 9';
      }
    });

    /* Prioritize first hero or title image for LCP */
    var hero = document.querySelector('.home-hero img, .hero img, [class*="hero"] img');
    if (hero && !hero.complete) {
      hero.loading = 'eager';
      hero.fetchPriority = 'high';
      hero.decoding = 'async';
    }

    /* Defer non-critical scripts already marked defer stay deferred */
    var scripts = document.querySelectorAll('script[src]:not([defer]):not([async])');
    scripts.forEach(function (s) {
      if (s.src.includes('/patches/') && !s.src.includes('critical')) {
        s.defer = true;
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', optimize);
  } else {
    optimize();
  }
})();
