/* MatchApp TV Ai — "International day of…" card for the Events field.

   The card is data-driven: everything it shows comes from
   /data/international-day.json, which an external bot rewrites once a day.
   Nothing in this file names a specific day, so a new day needs no code
   change — see docs/DAILY_EVENT_AND_FEATURED_TITLE_CONTRACT.md.

   Tapping it opens the MatchApp Ai chat with that day's question, so the
   visitor gets what the day is plus tips for enjoying it, in their language.

   Runtime contract (AGENTS.md stability invariant):
     * one fetch, one render, no observers, no intervals, no retries;
     * a missing, stale or malformed file leaves the Events field exactly as
       the page shipped it — the card simply does not appear.  */
(function () {
  'use strict';

  var SRC = '/data/international-day.json';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function langKey() {
    var raw = 'en';
    try {
      raw = String(window.MATCH_LANG || localStorage.getItem('match_lang') ||
                   document.documentElement.lang || 'en').toLowerCase();
    } catch (_) { /* storage can be blocked */ }
    if (raw.indexOf('pt') === 0) return 'pt-BR';
    if (raw.indexOf('es') === 0) return 'es';
    return 'en';
  }

  /* Merge the localized block over the base record, so a bot that only fills
     English still produces a complete card in every language. */
  function localize(data) {
    var out = {}, key;
    for (key in data) if (Object.prototype.hasOwnProperty.call(data, key)) out[key] = data[key];
    var loc = data && data.i18n && data.i18n[langKey()];
    if (loc) for (key in loc) if (Object.prototype.hasOwnProperty.call(loc, key)) out[key] = loc[key];
    return out;
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function prettyDate(iso) {
    try {
      return new Intl.DateTimeFormat(document.documentElement.lang || 'en',
        { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(iso + 'T12:00:00Z'));
    } catch (_) { return iso; }
  }

  /* The AI chat is the destination: the day's own question, pre-typed. */
  function askHref(day) {
    var q = String(day.prompt || ('What is ' + (day.title || 'today\'s international day') +
      ', and how can I enjoy it tonight?')).slice(0, 600);
    return '/discover.html?q=' + encodeURIComponent(q) + '&focus=start';
  }

  function card(day, isToday) {
    var href = askHref(day);
    var label = (isToday ? 'Today' : prettyDate(day.date));
    var art = day.image
      ? '<img src="' + esc(day.image) + '" alt="' + esc(day.title) +
        '" width="1024" height="1536" loading="lazy" decoding="async">'
      : '<span class="id-poster" aria-hidden="true">' +
          '<span class="id-poster-emoji">' + esc(day.emoji || '🌍') + '</span>' +
          '<span class="id-poster-title">' + esc(day.title) + '</span>' +
        '</span>';

    var article = document.createElement('article');
    article.className = 'premium-card global-event international-day';
    article.id = 'international-day-card';
    article.setAttribute('data-international-day', esc(day.id || day.date || '1'));
    article.innerHTML =
      '<a class="id-art" href="' + esc(href) + '" aria-label="' + esc(day.title) +
        ' — ask MatchApp Ai about this day">' + art + '</a>' +
      '<span class="event-badge ' + (isToday ? 'event-live' : 'event-soon') + '">' + esc(label) + '</span>' +
      '<h3><a href="' + esc(href) + '">' + esc(day.emoji ? day.emoji + ' ' : '') + esc(day.title) + '</a></h3>' +
      '<p><span class="id-kicker">' + esc(day.kicker || 'International day') + '</span>' +
        (day.place ? '<br>' + esc(day.place) : '') + '</p>' +
      '<p class="id-summary">' + esc(day.summary || '') + '</p>' +
      '<a class="gold-btn id-cta" href="' + esc(href) + '">✨ Ask MatchApp Ai</a>' +
      (day.officialUrl
        ? '<a class="id-official" href="' + esc(day.officialUrl) + '" target="_blank" rel="noopener noreferrer">Official page</a>'
        : '');
    return article;
  }

  /* Google reads the day from the page, not from a stale static block, so the
     Event record is emitted next to the card it describes. */
  function schema(day) {
    var node = document.createElement('script');
    node.type = 'application/ld+json';
    node.id = 'international-day-schema';
    node.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: day.title,
      startDate: day.date,
      endDate: day.date,
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
      description: day.summary || '',
      about: day.kicker || 'International day',
      isAccessibleForFree: true,
      image: day.image ? new URL(day.image, location.origin).href : undefined,
      location: {
        '@type': 'VirtualLocation',
        url: new URL(askHref(day), location.origin).href
      },
      organizer: { '@type': 'Organization', name: 'MatchApp TV Ai', url: 'https://matchapp.tv/' },
      url: new URL(askHref(day), location.origin).href,
      keywords: Array.isArray(day.keywords) ? day.keywords.join(', ') : undefined,
      inLanguage: document.documentElement.lang || 'en'
    });
    return node;
  }

  /* The day's own long-tail terms join the page keywords so a search for the
     day itself can find the field that answers it. */
  function seo(day) {
    if (!Array.isArray(day.keywords) || !day.keywords.length) return;
    var meta = document.querySelector('meta[name="keywords"]');
    if (!meta) return;
    var have = String(meta.content || '').toLowerCase();
    var add = day.keywords
      .map(function (k) { return String(k).trim(); })
      .filter(function (k) { return k && have.indexOf(k.toLowerCase()) === -1; });
    if (add.length) meta.content = (meta.content ? meta.content + ', ' : '') + add.join(', ');
  }

  function mount(raw) {
    if (!raw || typeof raw !== 'object' || !raw.title || !raw.date) return;
    if (document.getElementById('international-day-card')) return;

    var grid = document.querySelector('#global-events .global-event-grid');
    if (!grid) return;

    var day = localize(raw);
    var isToday = day.date === todayISO();

    grid.insertBefore(card(day, isToday), grid.firstChild);

    var count = document.querySelector('#global-events .ge-sum-count');
    if (count) count.textContent = String(grid.querySelectorAll('.global-event').length);

    if (!document.getElementById('international-day-schema')) {
      document.head.appendChild(schema(day));
    }
    seo(day);
  }

  function boot() {
    // Kids Mode keeps its own reviewed shelves; normal-mode editorial never
    // leaks into it.
    if (location.pathname.indexOf('/kids') === 0) return;
    if (!document.querySelector('#global-events .global-event-grid')) return;
    fetch(SRC, { cache: 'no-cache', credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(mount)
      .catch(function () { /* The Events field is complete without this card. */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
