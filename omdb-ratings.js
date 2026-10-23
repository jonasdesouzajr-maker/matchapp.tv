/* Display-only rating enrichment for adult movie/series Matches. */
(function () {
  'use strict';
  const host = document.getElementById('res-omdb-ratings');
  if (!host) return;
  let generation = 0;
  let disabledUntil = 0;
  const pending = new Map();
  const cache = new Map();
  const unavailableUntil = new Map();
  function clear() { generation++; host.hidden = true; host.replaceChildren(); }
  function badge(label, score, unit, className) {
    const item = document.createElement('span');
    item.className = 'ma-critic-badge ' + className;
    const name = document.createElement('span'); name.className = 'ma-critic-name'; name.textContent = label;
    const value = document.createElement('strong'); value.textContent = String(score) + unit;
    item.append(name, value); return item;
  }
  function imdbLink(imdbId, title, score) {
    const link = document.createElement('a');
    link.className = 'ma-critic-badge ma-critic-imdb';
    link.href = 'https://www.imdb.com/title/' + imdbId + '/';
    link.target = '_blank'; link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', 'IMDb: ' + title);
    const name = document.createElement('span'); name.className = 'ma-critic-name'; name.textContent = 'IMDb';
    const value = document.createElement('strong'); value.textContent = typeof score === 'number' ? String(score) + '/10' : '↗';
    link.append(name, value); return link;
  }
  async function update(identity) {
    clear();
    const mine = generation;
    const title = typeof identity?.title === 'string' ? identity.title.trim() : '';
    const kind = identity?.kind || window.tmdbKindForCats?.(identity?.cats || []);
    const year = Number(identity?.year);
    const validYear = Number.isInteger(year) && year >= 1888 && year <= 2100;
    const imdbId = /^tt\d{7,10}$/.test(identity?.imdbId || '') ? identity.imdbId : '';
    if (!['movie','tv'].includes(kind) || (!imdbId && (!title || !validYear))) return;
    if (imdbId && window.globalMatchTitle === title && host.isConnected) {
      // The exact TMDB identity already proves this link, even when OMDb has
      // no scores. No rating is invented for an unavailable provider response.
      host.replaceChildren(imdbLink(imdbId, title)); host.hidden = false;
    }
    if (Date.now() < disabledUntil || !window.supabaseClient?.functions) return;
    // Exact IMDb IDs disambiguate festival/theatrical-year and title aliases.
    // Title-only requests retain their strict year requirement.
    const body = { title, kind, ...(!imdbId && validYear ? {year} : {}), ...(imdbId ? {imdbId} : {}) };
    const key = JSON.stringify(body);
    if (Date.now() < (unavailableUntil.get(key) || 0)) return;
    let request = cache.get(key);
    if (!request) {
      request = pending.get(key);
      if (!request) {
        request = Promise.race([
          window.supabaseClient.functions.invoke('omdb-ratings', {body}),
          new Promise(resolve => setTimeout(() => resolve({error:true}), 5000))
        ]).catch(() => ({error:true})).finally(() => pending.delete(key));
        pending.set(key, request);
      }
    }
    const result = await request;
    // A title with no ratings must not hide ratings for every later Match.
    // Keep the shared cooldown for actual transport/provider failures.
    const status = Number(result?.error?.context?.status);
    if (result?.error && (!status || status === 429 || status >= 500)) disabledUntil = Date.now() + 120000;
    else if (result?.error || result?.data?.unavailable) {
      unavailableUntil.set(key, Date.now() + 120000);
      if (unavailableUntil.size > 100) unavailableUntil.delete(unavailableUntil.keys().next().value);
    }
    if (mine !== generation || window.globalMatchTitle !== title || !host.isConnected) return;
    if (imdbId && result?.data?.imdbId !== imdbId) return;
    const ratings = result?.data?.ratings;
    if (!ratings || typeof ratings !== 'object') return;
    if (result.data.title && !imdbId && result.data.title.localeCompare(title, undefined, {sensitivity:'base'}) !== 0) return;
    if (!imdbId && validYear && result.data.year !== year) return;
    const entries = [
      ['Rotten Tomatoes', ratings.rottenTomatoes, '%', 'ma-critic-rt', 100],
      ['Metacritic', ratings.metacritic, '/100', 'ma-critic-mc', 100],
      ['IMDb', ratings.imdb, '/10', 'ma-critic-imdb', 10]
    ].filter(([,score,,,max]) => typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= max);
    if (!entries.length) return;
    const linkedId = imdbId || (/^tt\d{7,10}$/.test(result.data.imdbId || '') ? result.data.imdbId : '');
    const badges = entries.map(([label,score,unit,className]) =>
      label === 'IMDb' && linkedId ? imdbLink(linkedId, title, score) : badge(label,score,unit,className));
    if (linkedId && !entries.some(([label]) => label === 'IMDb')) badges.push(imdbLink(linkedId, title));
    host.replaceChildren(...badges);
    host.hidden = false;
    cache.set(key, result);
  }
  document.addEventListener('matchapp:newmatch', event => { void update(event.detail).catch(clear); });
  document.addEventListener('matchapp:adult-metadata', event => {
    const identity = window.currentMatchIdentity, detail = event.detail;
    const result = document.getElementById('result-box');
    if (!identity || !detail || window.globalMatchTitle !== identity.title || detail.title !== identity.title ||
        !Number.isSafeInteger(Number(identity.tmdbId)) || Number(identity.tmdbId) <= 0 ||
        Number(detail.tmdbId) !== Number(identity.tmdbId) || detail.kind !== identity.kind ||
        result?.hidden || result?.style.display === 'none') return;
    // Exact source enrichment can fill a missing year after the initial result.
    void update(identity).catch(clear);
  });
  document.getElementById('result-dismiss')?.addEventListener('click', clear);
  const visibleResult = document.getElementById('result-box');
  if (visibleResult && !visibleResult.hidden && visibleResult.style.display !== 'none' &&
      window.currentMatchIdentity?.title === window.globalMatchTitle) {
    void update(window.currentMatchIdentity).catch(clear);
  }
})();
