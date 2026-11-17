/* Restore real title posters in the background wall
   Keeps existing blur/depth styling. Uses TMDB posters already on the page. */
(function () {
  'use strict';
  if (/^\/(kids|private-voice|oauth)(\/|$)/.test(location.pathname)) return;

  function restore() {
    var realPosters = [...document.querySelectorAll('img[src*="image.tmdb.org"]')]
      .map(function (img) { return img.src; })
      .filter(function (src, i, arr) { return arr.indexOf(src) === i; });
    if (!realPosters.length) return;

    var tiles = document.querySelectorAll('.poster-wall-tile img');
    tiles.forEach(function (img, i) {
      if (img.src.includes('.svg') || img.src.includes('/covers/')) {
        img.src = realPosters[i % realPosters.length];
        img.alt = '';
        img.style.objectFit = 'cover';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restore);
  } else {
    restore();
  }
  setTimeout(restore, 500);
})();
