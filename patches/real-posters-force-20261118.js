/* Force real posters into background wall. */
(function () {
  'use strict';
  if (/^\/(kids|private-voice|oauth)(\/|$)/.test(location.pathname)) return;
  function isRealPoster(value) {
    try {
      var url = new URL(value, location.href);
      if (url.username || url.password) return false;
      if (url.origin === 'https://image.tmdb.org') return true;
      return url.origin === location.origin && /\/(?:posters|covers)\//.test(url.pathname);
    } catch (_) { return false; }
  }
  function force() {
    var real = Array.from(document.querySelectorAll('img'))
      .map(function (i) { return i.src; })
      .filter(function (s) { return s && isRealPoster(s); })
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
