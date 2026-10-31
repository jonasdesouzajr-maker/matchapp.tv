/* A verified title may link to IMDb. MatchApp does not request or republish OMDb scores. */
(function () {
  'use strict';
  const host = document.getElementById('res-omdb-ratings');
  const result = document.getElementById('result-box');
  if (!host || !result) return;

  function clear() {
    host.hidden = true;
    host.replaceChildren();
  }

  function render(identity) {
    clear();
    if (result.hidden || result.style.display === 'none' || !host.isConnected) return;
    const title = identity?.title;
    const kind = identity?.kind || window.tmdbKindForCats?.(identity?.cats || []);
    const id = identity?.imdbId;
    if (!title || title !== window.globalMatchTitle || !['movie', 'tv'].includes(kind) ||
        typeof id !== 'string' || !/^tt\d{7,10}$/.test(id)) return;

    const link = document.createElement('a');
    link.className = 'ma-critic-badge ma-critic-imdb';
    link.href = 'https://www.imdb.com/title/' + id + '/';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', title + ' · IMDb');
    link.textContent = 'IMDb ↗';
    host.replaceChildren(link);
    host.hidden = false;
  }

  document.addEventListener('matchapp:newmatch', event => render(window.currentMatchIdentity || event.detail));
  document.addEventListener('matchapp:adult-metadata', event => {
    const identity = window.currentMatchIdentity, detail = event.detail;
    if (!identity || !detail || detail.title !== identity.title || detail.kind !== identity.kind ||
        !Number.isSafeInteger(Number(identity.tmdbId)) || Number(identity.tmdbId) <= 0 ||
        Number(detail.tmdbId) !== Number(identity.tmdbId)) return;
    render(identity);
  });
  document.getElementById('result-dismiss')?.addEventListener('click', clear);
  render(window.currentMatchIdentity);
})();
