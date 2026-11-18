/* Real posters in background wall. Runs after titles load. */
(function () {
  'use strict';
  if (/^\/(kids|private-voice|oauth)(\/|$)/.test(location.pathname)) return;
  function restore() {
    var real = Array.from(document.querySelectorAll('img[src*="image.tmdb.org"], img[src*="/posters/"]'))
      .map(function (i) { return i.src; })
      .filter(function (s, i, a) { return a.indexOf(s) === i && s; });
    if (!real.length) return;
    var tiles = document.querySelectorAll('.poster-wall-tile img, .poster-wall img');
    tiles.forEach(function (img, i) {
      if (!img.src || img.src.includes('.svg') || img.src.includes('/covers/') || img.src.includes('placeholder')) {
        img.src = real[i % real.length];
        img.style.objectFit = 'cover';
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', restore);
  else restore();
  setTimeout(restore, 300);
  setTimeout(restore, 1200);
})();
