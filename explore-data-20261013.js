/* Read the existing editorial sources without executing Home or its hidden sections. */
(function () {
  'use strict';
  async function read(path, kind) {
    var controller = new AbortController(), timeout = setTimeout(function () { controller.abort(); }, 8000);
    try {
      var response = await fetch(path, { signal: controller.signal, cache: 'no-cache' });
      if (!response.ok) throw new Error('Explore source HTTP ' + response.status);
      return await (kind === 'json' ? response.json() : response.text());
    } finally { clearTimeout(timeout); }
  }
  function poster(card, src, alt, query) {
    if (!card || !src || !query) return;
    var url = new URL(src, location.origin);
    if (url.protocol !== 'https:' && url.origin !== location.origin) return;
    var img = card.querySelector('img');
    // Switch to a new editorial record only after its exact poster decodes.
    var image = new Image();image.onload = function () {
      img.src = url.href;img.alt = alt;card.title = alt;
      card.href = '/discover.html?q=' + encodeURIComponent(query) + '&focus=start';
    };
    image.src = url.href;
  }
  read('/data/weekly-pick.json', 'json').then(function (pick) {
    if (!pick.auto || !pick.title || !pick.tmdbId || !pick.poster || !pick.synopsis) return;
    var kind = pick.kind === 'tv' ? 'series' : 'film';
    var query = 'Tell me about the ' + kind + ' ' + pick.title + ' (' + pick.year + ', ' + pick.country + '). Give the synopsis, cast, runtime, rating and ' + (pick.inCinemas ? 'cinemas near me and showtimes.' : 'current streaming, rent and buy options in my country.');
    poster(document.querySelector('[data-explore-pick="weekly"]'), pick.poster, pick.title + ' (' + pick.year + ')', query);
  }).catch(function () { /* Keep the committed source-backed record on transient failure. */ });
  read('/index.html', 'text').then(function (html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var source = doc.querySelector('#premiere-disclosure');
    var image = source && source.querySelector('#spotlight-poster-img');
    var title = source && source.querySelector('.spotlight-title');
    var description = source && source.querySelector('.spotlight-desc');
    if (!image || !title || !description) return;
    poster(document.querySelector('[data-explore-pick="premiere"]'), image.getAttribute('src'), image.alt, 'Tell me about ' + title.textContent.trim() + '. ' + description.textContent.trim() + ' Give me the synopsis, cast and current viewing options in my country.');
    var taylor = doc.querySelector('#swifties-spotify .swifties-official-link');
    if (taylor) {
      var url = new URL(taylor.getAttribute('href'), location.origin);
      if (url.protocol === 'https:' && url.hostname === 'open.spotify.com') document.querySelector('.ex-card[href*="open.spotify.com"]').href = url.href;
    }
  }).catch(function () { /* Static verified links remain navigable offline. */ });
})();
