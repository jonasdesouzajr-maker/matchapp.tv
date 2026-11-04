/* On-demand factual viewing lookups for this editorial guide only. No matching or AI calls. */
(function () {
  'use strict';
  const host = document.querySelector('.hw-layout');
  const copyNode = document.getElementById('hw-copy');
  const picker = document.getElementById('hw-country');
  if (!host || !copyNode || !picker) return;
  let copy;
  try { copy = JSON.parse(copyNode.textContent); } catch (_) { return; }
  const language = document.documentElement.lang || 'en';
  const films = new Map(), pending = new Map();
  const maxSnapshotAge = 7 * 24 * 60 * 60 * 1000;
  let selected = '', filter = 'all';
  const validCountry = value => window.MatchAppCountry?.resolveCountryCode(value) || '';
  const sharedCountry = validCountry(new URL(location.href).searchParams.get('country'));
  if (sharedCountry) window.MatchAppCountry?.setCountry(sharedCountry);
  selected = sharedCountry || window.MatchAppCountry?.regionCode() || '';
  picker.value = selected;
  function text(tag, value, className) {
    const el = document.createElement(tag);
    el.textContent = value;
    if (className) el.className = className;
    return el;
  }
  function sourceLink(value, id, country) {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password || url.port ||
          !['www.themoviedb.org','themoviedb.org'].includes(url.hostname) ||
          !new RegExp('^/movie/' + id + '(?:/|-)').test(url.pathname) ||
          !/\/watch$/.test(url.pathname) || url.searchParams.get('locale') !== country) return '';
      return url.href;
    } catch (_) { return ''; }
  }
  function date(value) {
    const instant = new Date(value);
    if (!Number.isFinite(instant.getTime())) return '';
    return new Intl.DateTimeFormat(language, {dateStyle:'medium',timeStyle:'short'}).format(instant);
  }
  function paintCard(card) {
    const target = card.querySelector('.hw-availability');
    if (!target) return;
    target.replaceChildren();
    if (!selected) { target.append(text('p', copy.chooseFirst)); return; }
    const film = films.get(Number(card.dataset.filmId));
    if (!film) { target.append(text('p', copy.unavailable)); return; }
    const row = film.availability?.[selected];
    const age = Date.now() - Date.parse(film.checkedAt);
    const fresh = Number.isFinite(age) && age >= -60000 && age <= maxSnapshotAge;
    let found = false;
    if (fresh && row) {
      for (const kind of ['stream','rent','buy']) {
        const names = Array.isArray(row[kind]) ? [...new Set(row[kind].filter(n => typeof n === 'string' && n.trim()))].slice(0,24) : [];
        if (!names.length) continue;
        found = true;
        const group = text('p', '', 'hw-offer-group');
        group.append(text('strong', copy[kind]), text('span', names.join(' · ')));
        target.append(group);
      }
    }
    if (!fresh) target.append(text('p', copy.stale));
    else if (!found) target.append(text('p', copy.noOffers));
    const checked = date(film.checkedAt);
    if (checked) {
      const note = text('p', copy.checked + ': ' + checked, 'hw-source-date');
      note.dataset.checkedAt = film.checkedAt;
      target.append(note);
    }
    const href = sourceLink(row?.link, film.tmdbId, selected);
    if (href) {
      const link = text('a', copy.offers, 'hw-offer-link');
      link.href = href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer external';
      target.append(link);
    }
  }
  function syncLanguageLinks() {
    document.querySelectorAll('.channel-language-list a[hreflang]').forEach(link => {
      const destination = new URL(link.href);
      if (selected) destination.searchParams.set('country', selected);
      else destination.searchParams.delete('country');
      link.href = destination.href;
    });
  }
  function paintAvailability() { syncLanguageLinks(); document.querySelectorAll('.hw-film').forEach(paintCard); }
  syncLanguageLinks();
  function countryChange() {
    selected = validCountry(picker.value);
    if (selected) window.MatchAppCountry?.setCountry(selected);
    paintAvailability();
  }
  picker.addEventListener('change', countryChange);
  document.addEventListener('matchapp:countrychange', event => {
    selected = validCountry(event.detail?.country);
    picker.value = selected;
    paintAvailability();
  });
  const snapshotController = new AbortController();
  const snapshotTimeout = setTimeout(() => snapshotController.abort(), 10000);
  fetch('/halloween/movies.json?v=20261104-1', {credentials:'same-origin',signal:snapshotController.signal})
    .then(response => { if (!response.ok) throw new Error('snapshot'); return response.json(); })
    .then(data => {
      if (!Array.isArray(data.films)) throw new Error('snapshot');
      for (const film of data.films) {
        const card = document.querySelector('.hw-film[data-film-id="' + Number(film.tmdbId) + '"]');
        if (card && film.kind === 'movie' && String(film.year) === card.dataset.year &&
            film.originalTitle === card.dataset.originalTitle && film.availability?.source === 'tmdb-watch-providers') {
          const current = films.get(film.tmdbId);
          if (!current || Date.parse(film.checkedAt) > Date.parse(current.checkedAt)) films.set(film.tmdbId, film);
        }
      }
      paintAvailability();
      return true;
    }).catch(() => { paintAvailability(); return false; }).finally(() => clearTimeout(snapshotTimeout));
  function track(event, details) {
    if (Array.isArray(window.dataLayer)) window.dataLayer.push({event, ...details});
  }
  const locales = {en:'en-US','pt-BR':'pt-BR',es:'es-ES',fr:'fr-FR',de:'de-DE',it:'it-IT',tr:'tr-TR',ru:'ru-RU',ar:'ar-SA',hi:'hi-IN',id:'id-ID',ja:'ja-JP',ko:'ko-KR',zh:'zh-CN','zh-TW':'zh-TW'};
  async function check(button) {
    if (!selected) { picker.focus(); paintAvailability(); return; }
    const id = Number(button.dataset.hwCheck);
    if (pending.has(id)) return;
    const card = button.closest('.hw-film');
    const status = card?.querySelector('.hw-availability');
    if (!card || !status) return;
    button.disabled = true;
    button.textContent = copy.checking;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    pending.set(id, controller);
    try {
      // The crawlable card already contains a verified identity. A failed or slow
      // snapshot must not block a deliberate fresh source check.
      const film = films.get(id) || {tmdbId:id,kind:'movie',year:card.dataset.year,originalTitle:card.dataset.originalTitle};
      const config = window.MatchAppHalloweenConfig;
      if (!film || !config || pending.size > 3) throw new Error('not-ready');
      // The existing anonymous, rate-limited TMDB proxy owns credentials and source access.
      const response = await fetch(config.url, {
        method:'POST', credentials:'omit', signal:controller.signal,
        headers:{'Content-Type':'application/json',apikey:config.publicKey,Authorization:'Bearer ' + config.publicKey},
        body:JSON.stringify({tmdb_id:id,kind:'movie',lang:locales[language] || 'en-US',details:true})
      });
      if (!response.ok) throw new Error('source');
      const data = await response.json(), result = data?.results?.[0];
      if (!result || result.tmdbId !== id || result.kind !== 'movie' || result.adult === true ||
          String(result.year) !== String(film.year) || result.originalTitle !== film.originalTitle ||
          !result.availability || result.availability.source !== 'tmdb-watch-providers') throw new Error('identity');
      films.set(id, {...film, availability:result.availability, checkedAt:new Date().toISOString()});
      // All-country source data is re-rendered for the CURRENT selection, even if it changed in flight.
      paintCard(card);
      track('halloween_availability_check', {film_id:id,viewing_country:selected,guide_language:language});
    } catch (_) {
      paintCard(card);
      status.prepend(text('p', copy.unavailable, 'hw-availability-error'));
    } finally {
      clearTimeout(timeout);
      pending.delete(id);
      button.disabled = false;
      button.textContent = copy.watch;
    }
  }
  host.addEventListener('click', event => {
    const button = event.target.closest('button[data-hw-check]');
    if (button) check(button);
  });
  function filterCards() {
    let count = 0;
    document.querySelectorAll('.hw-film').forEach(card => {
      card.hidden = filter !== 'all' && card.dataset.tone !== filter;
      if (!card.hidden) count++;
    });
    document.querySelectorAll('[data-hw-tone]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.hwTone === filter)));
    const output = document.getElementById('hw-count');
    if (output) output.textContent = copy.visibleCount.replace('{count}', new Intl.NumberFormat(language).format(count));
  }
  document.querySelectorAll('[data-hw-tone]').forEach(button => button.addEventListener('click', () => {
    filter = button.dataset.hwTone;
    filterCards();
    track('halloween_scare_filter', {scare_level:filter,guide_language:language});
  }));
  filterCards();
  document.getElementById('hw-share')?.addEventListener('click', async () => {
    const output = document.getElementById('hw-share-status');
    const link = new URL(document.querySelector('link[rel=canonical]').href);
    if (selected) link.searchParams.set('country', selected);
    try {
      if (typeof navigator.share === 'function') await navigator.share({title:document.title,text:copy.tagline,url:link.href});
      else { await navigator.clipboard.writeText(link.href); if (output) output.textContent = copy.copied; }
      track('halloween_guide_share', {guide_language:language});
    } catch (error) { if (error?.name !== 'AbortError' && output) output.textContent = copy.shareFailed; }
  });
  document.querySelector('.channel-language-list')?.addEventListener('click', event => {
    const link = event.target.closest('a[hreflang]');
    if (link && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
      try { localStorage.setItem('match_lang', link.hreflang); } catch (_) {}
    }
  });
  window.addEventListener('pagehide', () => { snapshotController.abort(); for (const controller of pending.values()) controller.abort(); });
})();
