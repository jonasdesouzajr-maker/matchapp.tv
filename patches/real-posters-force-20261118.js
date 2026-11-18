/* Force real posters into background wall. */
(function () {
  'use strict';
  if (/^\/(kids|private-voice|oauth)(\/|$)/.test(location.pathname)) return;
  function force() {
    var real = Array.from(document.querySelectorAll('img'))
      .map(function (i) { return i.src; })
      .filter(function (s) { return s && (s.includes('image.tmdb.org') || s.includes('/posters/') || s.includes('/covers/')); })
      .filter(function (s, i, a) { return a.indexOf(s) === i; });
    if (!real.length) return;
    var tiles = document.querySelectorAll('.poster-wall-tile img, .poster-wall img');
    tiles.forEach(function (img, i) {
      img.src = real[i % real.length];
      img.style.objectFit = 'cover';
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', force);
  else force();
  setTimeout(force, 200);
  setTimeout(force, 800);
  setTimeout(force, 2000);
})();
