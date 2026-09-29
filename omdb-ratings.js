/* Display-only rating enrichment for adult movie/series Matches. */
(function () {
  'use strict';
  const host = document.getElementById('res-omdb-ratings');
  if (!host) return;
  let generation = 0;
  let disabledUntil = 0;
  const pending = new Map();
  const cache = new Map();
  function clear() { generation++; host.hidden = true; host.replaceChildren(); }
  function badge(label, score, unit, className) {
    const item = document.createElement('span');
    item.className = 'ma-critic-badge ' + className;
    const name = document.createElement('span'); name.className = 'ma-critic-name'; name.textContent = label;
    const value = document.createElement('strong'); value.textContent = String(score) + unit;
    item.append(name, value); return item;
  }
  async function update(identity) {
    clear();
    const mine = generation;
    const title = typeof identity?.title === 'string' ? identity.title.trim() : '';
    const kind = identity?.kind || window.tmdbKindForCats?.(identity?.cats || []);
    const year = Number(identity?.year);
    const imdbId = /^tt\d{7,10}$/.test(identity?.imdbId || '') ? identity.imdbId : '';
    if (Date.now() < disabledUntil || !['movie','tv'].includes(kind) || (!imdbId && (!title || !Number.isInteger(year))) || !window.supabaseClient?.functions) return;
    const body = { title, kind, ...(year >= 1888 && year <= 2100 ? {year} : {}), ...(imdbId ? {imdbId} : {}) };
    const key = JSON.stringify(body);
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
    if (result?.error || result?.data?.unavailable) disabledUntil = Date.now() + 120000;
    if (mine !== generation || window.globalMatchTitle !== title || !host.isConnected) return;
    const ratings = result?.data?.ratings;
    if (!ratings || typeof ratings !== 'object') return;
    if (result.data.title && !imdbId && result.data.title.localeCompare(title, undefined, {sensitivity:'base'}) !== 0) return;
    if (Number.isInteger(year) && result.data.year !== year) return;
    const entries = [
      ['Rotten Tomatoes', ratings.rottenTomatoes, '%', 'ma-critic-rt', 100],
      ['Metacritic', ratings.metacritic, '/100', 'ma-critic-mc', 100],
      ['IMDb', ratings.imdb, '/10', 'ma-critic-imdb', 10]
    ].filter(([,score,,,max]) => typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= max);
    if (!entries.length) return;
    host.replaceChildren(...entries.map(([label,score,unit,className]) => badge(label,score,unit,className)));
    host.hidden = false;
    cache.set(key, result);
  }
  document.addEventListener('matchapp:newmatch', event => { void update(event.detail).catch(clear); });
  document.getElementById('result-dismiss')?.addEventListener('click', clear);
})();
