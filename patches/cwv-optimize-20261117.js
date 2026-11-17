/* Core Web Vitals — 2026-11-17
   Improves LCP, INP, and CLS on adult pages.
   Does not touch AdSense units, matching, or protected surfaces. */
(function () {
  'use strict';
  if (window.top !== window) return;
  if (/^\/(kids|private-voice|oauth)(\/|$)/.test(location.pathname)) return;

  var style = document.createElement('style');
  style.textContent = `
    /* Reserve space for images to reduce CLS */
    img:not([width]):not([height]) {
      aspect-ratio: 16 / 9;
      object-fit: cover;
    }
    img[data-poster], img[class*="poster"] {
      aspect-ratio: 2 / 3;
    }
    /* Contain layout for cards */
    .premium-card, [class*="card"] {
      contain: layout style;
    }
    /* Smooth font rendering */
    body {
      text-rendering: optimizeSpeed;
    }
  `;
  document.head.appendChild(style);

  // Preconnect to critical origins early.
  var origins = ['https://image.tmdb.org', 'https://fonts.gstatic.com'];
  origins.forEach(function (origin) {
    if (document.querySelector('link[rel="preconnect"][href="' + origin + '"]')) return;
    var link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });

  // Prioritize LCP candidate images.
  function prioritizeLCP() {
    var candidates = document.querySelectorAll('img');
    var vh = window.innerHeight || 800;
    for (var i = 0; i < candidates.length && i < 4; i++) {
      var img = candidates[i];
      var rect = img.getBoundingClientRect();
      if (rect.top < vh && rect.height > 100) {
        img.fetchPriority = 'high';
        img.loading = 'eager';
        break;
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', prioritizeLCP, { once: true });
  } else {
    prioritizeLCP();
  }
})();
