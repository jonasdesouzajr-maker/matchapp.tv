'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const clone = value => JSON.parse(JSON.stringify(value));
const locales = ['en', 'pt-BR', 'es', 'fr', 'de', 'it', 'tr', 'ru', 'ar', 'hi', 'id', 'ja', 'ko', 'zh', 'zh-TW'];
const copies = Object.fromEntries(locales.map(locale => [locale, JSON.parse(read(`halloween/copy/${locale}.json`))]));
const sourceFilms = JSON.parse(read('halloween/movies.json')).films;
const countries = JSON.parse(read('profile-geography.js').match(/^const DATA=(.*);$/m)[1]);
const now = Date.parse('2026-11-05T00:00:00Z');
const expiry = Date.parse('2026-11-18T03:00:00Z');
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const flush = () => new Promise(resolve => setImmediate(resolve));

// Control browser time, not application behavior, so cutoff and freshness checks
// remain deterministic when the suite runs after the campaign has ended.
function clock(window, initial = now, withTimers = false) {
  let current = initial, nextId = 1;
  const OriginalDate = window.Date;
  window.Date = class extends OriginalDate {
    constructor(...args) { super(...(args.length ? args : [current])); }
    static now() { return current; }
  };
  const timers = new Map();
  if (withTimers) {
    window.setTimeout = (callback, delay = 0, ...args) => {
      const id = nextId++;
      timers.set(id, { at: current + Number(delay), callback, args });
      return id;
    };
    window.clearTimeout = id => timers.delete(id);
  }
  return {
    set(value) { current = value; },
    advance(value) {
      for (;;) {
        const due = [...timers].filter(([, timer]) => timer.at <= value).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        const [id, timer] = due;
        current = timer.at;
        timers.delete(id);
        timer.callback(...timer.args);
      }
      current = value;
    },
    timers
  };
}

function promo(t, options = {}) {
  const { language = 'en', savedLanguage, globalLanguage, url = 'https://matchapp.tv/', time = now, ua, bridge, nativeClass } = options;
  const dom = new JSDOM(`<!doctype html><html lang="${escape(language)}"><body>
    <section id="ma-halloween-promo" hidden>
      <img data-src="/assets/halloween/poster.webp" data-srcset="/assets/halloween/poster.webp 1200w">
      <p data-hw-promo="eyebrow"></p><h2 data-hw-promo="heading"></h2>
      <p data-hw-promo="tagline"></p><p data-hw-promo="promoNote"></p>
      <a href="/halloween/" data-hw-promo="promoCta"></a>
    </section></body></html>`, { url, runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  const w = dom.window, timer = clock(w, time, true), fetches = [];
  w.fetch = (...args) => { fetches.push(args); return Promise.reject(new Error('Promo must not fetch title sources')); };
  if (ua) Object.defineProperty(w.navigator, 'userAgent', { value: ua, configurable: true });
  if (savedLanguage) w.localStorage.setItem('match_lang', savedLanguage);
  if (globalLanguage) w.MATCH_LANG = globalLanguage;
  if (bridge) w[bridge] = {};
  if (nativeClass) w.document.documentElement.classList.add('matchapp-android');
  const card = w.document.getElementById('ma-halloween-promo'), image = card.querySelector('img');
  w.eval(read('halloween/promo-copy.js'));
  w.eval(read('halloween/promo.js'));
  return { w, card, image, fetches, timer };
}

function sourceLink(id, country) {
  return `https://www.themoviedb.org/movie/${id}/watch?locale=${country}`;
}

function snapshotFilm(overrides = {}) {
  const film = clone(sourceFilms[0]);
  return { ...film, checkedAt: new Date(now).toISOString(), availability: {
    source: 'tmdb-watch-providers',
    BR: { stream: ['Brazil subscription'], rent: ['Brazil rental'], buy: ['Brazil purchase'], link: sourceLink(film.tmdbId, 'BR') },
    US: { stream: ['US subscription'], rent: [], buy: [], link: sourceLink(film.tmdbId, 'US') },
    NO: { stream: ['Norway subscription'], rent: [], buy: [], link: sourceLink(film.tmdbId, 'NO') }
  }, ...overrides };
}

async function guide(t, options = {}) {
  const { language = 'en', country = '', profileCountry = '', query = '', snapshot = { films: [snapshotFilm()] }, live, snapshotError = false, snapshotFetch, withSharedHeader = false } = options;
  const copy = copies[language];
  const cards = sourceFilms.map(film => `<article class="hw-film" data-film-id="${film.tmdbId}" data-tone="${film.tone}" data-year="${escape(film.year)}" data-original-title="${escape(film.originalTitle)}">
    <h3>${escape(film.originalTitle)}</h3><div class="hw-availability"></div>
    <button type="button" data-hw-check="${film.tmdbId}">${escape(copy.watch)}</button></article>`).join('');
  const html = `<!doctype html><html lang="${escape(language)}"><head><link rel="canonical" href="https://matchapp.tv/halloween/"></head><body>
    ${withSharedHeader ? '<header class="app-header"></header>' : ''}
    <script type="application/json" id="hw-copy">${JSON.stringify(copy).replace(/</g, '\\u003c')}</script>
    <main class="hw-layout"><nav class="channel-language-list">${locales.map(locale => `<a href="/halloween/${locale === 'en' ? '' : locale.toLowerCase() + '/'}" hreflang="${locale}">${locale}</a>`).join('')}</nav>
    <select id="hw-country"><option value="">${escape(copy.chooseCountry)}</option>${countries.map(([name, code]) => `<option value="${code}">${escape(name)}</option>`).join('')}</select>
    ${['all', 'cozy', 'eerie', 'intense'].map(tone => `<button type="button" data-hw-tone="${tone}">${escape(copy[tone])}</button>`).join('')}
    <p id="hw-count"></p>${cards}<button id="hw-share">${escape(copy.share)}</button><p id="hw-share-status"></p></main></body></html>`;
  const route = language === 'en' ? '/halloween/' : `/halloween/${language.toLowerCase()}/`;
  const dom = new JSDOM(html, { url: `https://matchapp.tv${route}${query}`, runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  const w = dom.window;
  clock(w);
  if (country) w.localStorage.setItem('matchapp_viewer_country', country);
  if (profileCountry) w.localStorage.setItem('match_user_country', profileCountry);
  w.localStorage.setItem('match_lang', language);
  const calls = [];
  w.fetch = async (url, init) => {
    calls.push({ url, init });
    if (String(url).startsWith('/halloween/movies.json')) {
      if (snapshotError) throw new Error('snapshot transport failure');
      if (snapshotFetch) return snapshotFetch(url, init);
      return { ok: true, json: async () => clone(snapshot) };
    }
    if (!live) throw new Error('Unexpected external lookup');
    return live(url, init);
  };
  // Run the real shared country resolver and persistent choice owner.
  w.eval(read('viewer-country.js'));
  if (withSharedHeader) w.MatchAppCountry.mountPicker();
  const initialHeaderCountry = w.document.getElementById('matchapp-viewer-country')?.value;
  w.eval(read('halloween/config.js'));
  w.eval(read('halloween/guide.js'));
  await flush();
  const doc = w.document, card = doc.querySelector('.hw-film'), status = card.querySelector('.hw-availability'), button = card.querySelector('[data-hw-check]'), picker = doc.getElementById('hw-country');
  return {
    w, doc, card, status, button, picker, calls, copy, initialHeaderCountry,
    select(value) { picker.value = value; picker.dispatchEvent(new w.Event('change', { bubbles: true })); },
    async check() { button.click(); await flush(); },
    externalCalls() { return calls.filter(call => !String(call.url).startsWith('/halloween/movies.json')); }
  };
}

function response(result) { return { ok: true, json: async () => ({ results: [clone(result)] }) }; }

test('Halloween promotion excludes every native marker and never loads its artwork or title sources there', t => {
  const exclusions = [
    ...['MatchAppTVAndroid/1.1.71', 'MatchAppAiAndroid/71', 'MatchAppAiKidsAndroid/71'].map(ua => ({ ua })),
    ...['MatchAppNativeAuth', 'MatchAppNativeExperience', 'MatchAppNativePageState'].map(bridge => ({ bridge })),
    { nativeClass: true }, { url: 'https://matchapp.tv/?utm_source=android_app' }
  ];
  for (const condition of exclusions) {
    const page = promo(t, condition);
    assert.equal(page.card.isConnected, false, JSON.stringify(condition));
    assert.equal(page.image.hasAttribute('src'), false);
    assert.equal(page.image.hasAttribute('srcset'), false);
    assert.equal(page.fetches.length, 0);
    assert.equal(page.timer.timers.size, 0);
  }
  const browser = promo(t, { ua: 'Mozilla/5.0 (Linux; Android 17; SM-S918B) Chrome/142.0 Mobile Safari/537.36' });
  assert.equal(browser.card.hidden, false, 'Ordinary Android web browsers retain the requested web campaign');
});

test('Halloween promotion is confined to Home, including exclusion from Kids and secondary pages', t => {
  for (const route of ['/kids/', '/discover.html', '/halloween/', '/profile/profile.html', '/index.html/']) {
    const page = promo(t, { url: `https://matchapp.tv${route}` });
    assert.equal(page.card.isConnected, false, route);
    assert.equal(page.image.hasAttribute('src'), false);
  }
  assert.equal(promo(t, { url: 'https://matchapp.tv/index.html?country=NO#top' }).card.hidden, false);
});

test('promotion is visible one millisecond before the São Paulo cutoff and gone at or after it', t => {
  assert.equal(promo(t, { time: expiry - 1 }).card.hidden, false);
  assert.equal(promo(t, { time: expiry }).card.isConnected, false);
  assert.equal(promo(t, { time: expiry + 1 }).card.isConnected, false);
});

test('an already-open homepage removes the promotion at the cutoff without a refresh', t => {
  const page = promo(t, { time: expiry - 5000 });
  page.timer.advance(expiry - 1);
  assert.equal(page.card.isConnected, true);
  page.timer.advance(expiry);
  assert.equal(page.card.isConnected, false);
  assert.equal(page.timer.timers.size, 0);
  page.w.document.dispatchEvent(new page.w.CustomEvent('matchapp:langchange'));
  assert.equal(page.card.isConnected, false, 'Later language events cannot resurrect the campaign');
});

test('restoring or revealing a suspended page enforces expiration even when its timer did not run', t => {
  for (const event of ['pageshow', 'visibilitychange']) {
    const page = promo(t, { time: expiry - 1 });
    page.timer.set(expiry);
    const target = event === 'pageshow' ? page.w : page.w.document;
    target.dispatchEvent(new page.w.Event(event));
    assert.equal(page.card.isConnected, false, event);
    assert.equal(page.timer.timers.size, 0);
  }
});

test('all 15 promotion languages use their authored text, correct direction and matching guide route', t => {
  for (const language of locales) {
    const { card, image } = promo(t, { savedLanguage: language, language: 'en' });
    assert.equal(card.hidden, false, language);
    assert.equal(card.lang, language);
    assert.equal(card.dir, language === 'ar' ? 'rtl' : 'ltr');
    for (const node of card.querySelectorAll('[data-hw-promo]')) assert.equal(node.textContent, copies[language][node.dataset.hwPromo], `${language}:${node.dataset.hwPromo}`);
    assert.equal(image.alt, copies[language].posterAlt);
    assert.equal(card.querySelector('a').pathname, `/halloween/${language === 'en' ? '' : language.toLowerCase() + '/'}`);
  }
  for (const alias of ['zh_TW', 'zh-Hant', 'zh-Hant-HK', 'zh-HK', 'zh-MO']) {
    assert.equal(promo(t, { savedLanguage: alias }).card.lang, 'zh-TW', alias);
  }
});

test('explicit saved language beats a stale boot global and remains responsive to later language choices', t => {
  const page = promo(t, { savedLanguage: 'zh-TW', globalLanguage: 'en', language: 'pt-BR' });
  assert.equal(page.card.lang, 'zh-TW');
  page.w.localStorage.setItem('match_lang', 'ko');
  page.w.document.dispatchEvent(new page.w.CustomEvent('matchapp:langchange'));
  assert.equal(page.card.querySelector('h2').textContent, copies.ko.heading);
  page.w.localStorage.setItem('match_lang', 'ar');
  page.w.dispatchEvent(new page.w.StorageEvent('storage', { key: 'match_lang', newValue: 'ar' }));
  assert.equal(page.card.dir, 'rtl');
  assert.equal(page.w.localStorage.getItem('match_lang'), 'ar');
  const unsupported = promo(t, { savedLanguage: 'xx' });
  assert.equal(unsupported.card.hidden, true, 'Unsupported text must not silently become English');
  assert.equal(unsupported.image.hasAttribute('src'), false);
});

test('guide never infers US or Brazil from any of its 15 UI languages', async t => {
  for (const language of locales) {
    const page = await guide(t, { language });
    assert.equal(page.picker.value, '', language);
    assert.equal(page.w.MatchAppCountry.regionCode(), '', language);
    assert.equal(page.status.textContent, page.copy.chooseFirst, language);
    await page.check();
    assert.equal(page.externalCalls().length, 0, 'An unknown country must not initiate an unscoped provider lookup');
    assert.equal(page.button.disabled, false);
    assert.equal(page.doc.activeElement, page.picker);
  }
});

test('regional choices use the real country owner, persist deliberate changes and never use another region as fallback', async t => {
  const page = await guide(t, { country: 'NO', profileCountry: 'Brazil', language: 'pt-BR' });
  assert.equal(page.picker.value, 'NO');
  assert.match(page.status.textContent, /Norway subscription/);
  assert.doesNotMatch(page.status.textContent, /Brazil subscription|US subscription/);
  page.select('IN');
  assert.equal(page.w.localStorage.getItem('matchapp_viewer_country'), 'IN');
  assert.equal(page.w.localStorage.getItem('match_user_country'), 'Brazil', 'Viewing preference must not rewrite the profile');
  assert.match(page.status.textContent, new RegExp(escapeRegExp(page.copy.noOffers)));
  assert.equal(page.status.querySelectorAll('.hw-offer-group').length, 0);
  assert.doesNotMatch(page.status.textContent, /Brazil subscription|US subscription|Norway subscription/);
  page.w.MatchAppCountry.setCountry('BR');
  assert.equal(page.picker.value, 'BR');
  assert.match(page.status.textContent, /Brazil subscription/);
});

function escapeRegExp(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

test('a valid shared country synchronizes the existing header and guide without rewriting the profile; invalid values stay unknown', async t => {
  const shared = await guide(t, { country: 'BR', profileCountry: 'Brazil', query: '?country=NO', withSharedHeader: true });
  assert.equal(shared.initialHeaderCountry, 'BR', 'The shared header started with the prior viewing preference');
  assert.equal(shared.picker.value, 'NO');
  assert.match(shared.status.textContent, /Norway subscription/);
  const header = shared.doc.getElementById('matchapp-viewer-country');
  assert.equal(header.value, 'NO');
  assert.equal(shared.w.MatchAppCountry.regionCode(), 'NO');
  assert.equal(shared.w.localStorage.getItem('matchapp_viewer_country'), 'NO');
  assert.equal(shared.w.localStorage.getItem('match_user_country'), 'Brazil', 'The shared viewing choice must not modify profile data');
  shared.select('JP');
  assert.equal(header.value, 'JP', 'A later guide choice also updates the shared header');
  header.value = 'IN';
  header.dispatchEvent(new shared.w.Event('change', { bubbles: true }));
  assert.equal(shared.picker.value, 'IN', 'A later header choice also updates the guide');
  assert.equal(shared.w.MatchAppCountry.regionCode(), 'IN');
  const invalid = await guide(t, { query: '?country=ZZ', language: 'pt-BR' });
  assert.equal(invalid.picker.value, '');
  assert.equal(invalid.status.textContent, invalid.copy.chooseFirst);
});

test('subscription, rental and purchase providers remain distinct and source names are rendered as text', async t => {
  const film = snapshotFilm();
  film.availability.BR.stream = ['Subscription only', 'Subscription only', '<img src=x onerror=alert(1)>', ''];
  film.availability.BR.rent = ['Rental only'];
  film.availability.BR.buy = ['Purchase only'];
  const page = await guide(t, { country: 'BR', snapshot: { films: [film] } });
  const groups = [...page.status.querySelectorAll('.hw-offer-group')];
  assert.equal(groups.length, 3);
  assert.deepEqual(groups.map(group => group.querySelector('strong').textContent), [page.copy.stream, page.copy.rent, page.copy.buy]);
  assert.equal(groups[0].querySelector('span').textContent, 'Subscription only · <img src=x onerror=alert(1)>');
  assert.equal(groups[1].querySelector('span').textContent, 'Rental only');
  assert.equal(groups[2].querySelector('span').textContent, 'Purchase only');
  assert.equal(page.status.querySelector('img'), null);
  assert.equal(page.status.querySelector('.hw-offer-link').href, sourceLink(film.tmdbId, 'BR'));
});

test('empty, old, missing-date and future-dated snapshots are disclosed rather than sold as current availability', async t => {
  const empty = snapshotFilm();
  empty.availability.BR = { stream: [], rent: [], buy: [], link: sourceLink(empty.tmdbId, 'BR') };
  const emptyPage = await guide(t, { country: 'BR', snapshot: { films: [empty] } });
  assert.match(emptyPage.status.textContent, new RegExp(escapeRegExp(emptyPage.copy.noOffers)));
  for (const checkedAt of [new Date(now - 7 * 86400000 - 1).toISOString(), '', 'invalid', new Date(now + 120000).toISOString()]) {
    const page = await guide(t, { country: 'BR', snapshot: { films: [snapshotFilm({ checkedAt })] } });
    assert.match(page.status.textContent, new RegExp(escapeRegExp(page.copy.stale)), checkedAt);
    assert.equal(page.status.querySelectorAll('.hw-offer-group').length, 0, checkedAt);
    assert.equal(page.button.disabled, false);
  }
});

test('snapshot records must match the rendered film identity and provider source', async t => {
  const mutations = [
    { tmdbId: 1 }, { year: '1900' }, { originalTitle: 'A different film' },
    { kind: 'tv' }, { availability: { source: 'unverified', BR: { stream: ['Wrong provider'] } } }
  ];
  for (const mutation of mutations) {
    const page = await guide(t, { country: 'BR', snapshot: { films: [snapshotFilm(mutation)] } });
    assert.equal(page.status.querySelectorAll('.hw-offer-group').length, 0, JSON.stringify(mutation));
    assert.match(page.status.textContent, new RegExp(escapeRegExp(page.copy.unavailable)));
  }
});

test('wrong-country, wrong-film and untrusted viewing URLs never become clickable provider offers', async t => {
  const id = sourceFilms[0].tmdbId;
  const urls = [
    sourceLink(id, 'US'), sourceLink(id + 1, 'BR'), sourceLink(id * 10, 'BR'),
    `http://www.themoviedb.org/movie/${id}/watch?locale=BR`,
    `https://www.themoviedb.org.evil.test/movie/${id}/watch?locale=BR`,
    `https://evil.test/movie/${id}/watch?locale=BR`,
    `https://user:secret@www.themoviedb.org/movie/${id}/watch?locale=BR`,
    `https://www.themoviedb.org:444/movie/${id}/watch?locale=BR`,
    `https://www.themoviedb.org/tv/${id}/watch?locale=BR`,
    `https://www.themoviedb.org/movie/${id}/watch`,
    'javascript:alert(1)'
  ];
  for (const url of urls) {
    const film = snapshotFilm();
    film.availability.BR.link = url;
    const page = await guide(t, { country: 'BR', snapshot: { films: [film] } });
    assert.equal(page.status.querySelector('.hw-offer-link'), null, url);
  }
});

test('live responses with mismatched identity, adult status or an unverified availability source are rejected and retry stays enabled', async t => {
  const mutations = [
    { tmdbId: sourceFilms[0].tmdbId + 1 }, { kind: 'tv' }, { adult: true },
    { year: '1900' }, { originalTitle: 'Another original title' },
    { availability: { source: 'unverified', BR: { stream: ['Unverified offer'] } } }
  ];
  for (const mutation of mutations) {
    const result = snapshotFilm(mutation);
    const page = await guide(t, { country: 'BR', live: async () => response(result) });
    await page.check();
    assert.equal(page.externalCalls().length, 1);
    assert.equal(page.button.disabled, false);
    assert.equal(page.button.textContent, page.copy.watch);
    assert.equal(page.status.querySelector('.hw-availability-error')?.textContent, page.copy.unavailable);
    assert.doesNotMatch(page.status.textContent, /Unverified offer/);
    assert.match(page.status.textContent, /Brazil subscription/, 'A rejected response must not replace the last valid snapshot');
  }
});

test('a lookup completing after a country change renders only the current country', async t => {
  let resolve;
  const pending = new Promise(done => { resolve = done; });
  const page = await guide(t, { country: 'BR', live: () => pending });
  page.button.click();
  await flush();
  assert.equal(page.button.disabled, true);
  assert.equal(page.button.textContent, page.copy.checking);
  page.select('NO');
  const fresh = snapshotFilm();
  fresh.availability.BR.stream = ['New Brazil offer'];
  fresh.availability.NO.stream = ['New Norway offer'];
  resolve(response(fresh));
  await flush();
  assert.equal(page.picker.value, 'NO');
  assert.match(page.status.textContent, /New Norway offer/);
  assert.doesNotMatch(page.status.textContent, /New Brazil offer|Brazil subscription/);
  assert.equal(page.status.querySelector('.hw-offer-link').href, sourceLink(fresh.tmdbId, 'NO'));
  assert.equal(page.button.disabled, false);
});

test('transport errors preserve the last source snapshot and permit an actual successful retry', async t => {
  let attempts = 0;
  const fresh = snapshotFilm();
  fresh.availability.BR.stream = ['Recovered source offer'];
  const page = await guide(t, { country: 'BR', live: async () => {
    attempts++;
    if (attempts === 1) throw new Error('Temporary provider failure');
    return response(fresh);
  } });
  await page.check();
  assert.equal(page.button.disabled, false);
  assert.equal(page.status.querySelector('.hw-availability-error')?.textContent, page.copy.unavailable);
  assert.match(page.status.textContent, /Brazil subscription/);
  await page.check();
  assert.equal(attempts, 2);
  assert.equal(page.status.querySelector('.hw-availability-error'), null);
  assert.match(page.status.textContent, /Recovered source offer/);
  assert.equal(page.button.disabled, false);
});

test('a failed snapshot can recover through a fresh source check while the static card identity still rejects a different film', async t => {
  let attempts = 0;
  const fresh = snapshotFilm();
  fresh.availability.BR.stream = ['Recovered without snapshot'];
  const page = await guide(t, { country: 'BR', snapshotError: true, live: async () => {
    attempts++;
    return response(attempts === 1 ? { ...fresh, originalTitle: 'Different film' } : fresh);
  } });
  assert.equal(page.status.textContent, page.copy.unavailable);
  await page.check();
  assert.equal(page.button.disabled, false);
  assert.equal(page.status.querySelector('.hw-availability-error')?.textContent, page.copy.unavailable);
  assert.equal(page.status.querySelectorAll('.hw-offer-group').length, 0);
  assert.doesNotMatch(page.status.textContent, /Recovered without snapshot/);
  await page.check();
  assert.equal(page.externalCalls().length, 2);
  assert.equal(page.status.querySelector('.hw-availability-error'), null);
  assert.match(page.status.textContent, /Recovered without snapshot/);
  assert.equal(page.status.querySelector('.hw-offer-link').href, sourceLink(fresh.tmdbId, 'BR'));
  assert.equal(page.button.disabled, false);
});

test('a stalled snapshot cannot block a deliberate fresh source check', async t => {
  let releaseSnapshot;
  const stalled = new Promise(resolve => { releaseSnapshot = resolve; });
  const fresh = snapshotFilm();
  fresh.availability.BR.stream = ['Available before snapshot'];
  const page = await guide(t, { country: 'BR', snapshotFetch: () => stalled, live: async () => response(fresh) });
  await page.check();
  assert.equal(page.externalCalls().length, 1);
  assert.equal(page.button.disabled, false);
  assert.match(page.status.textContent, /Available before snapshot/);
  releaseSnapshot({ ok: true, json: async () => ({ films: [] }) });
  await flush();
  assert.match(page.status.textContent, /Available before snapshot/);
});

test('a late stale snapshot cannot overwrite a newer verified live record', async t => {
  let releaseSnapshot;
  const stalled = new Promise(resolve => { releaseSnapshot = resolve; });
  const fresh = snapshotFilm();
  fresh.availability.BR.stream = ['Newest verified provider'];
  const stale = snapshotFilm({ checkedAt: new Date(now - 8 * 86400000).toISOString() });
  stale.availability.BR.stream = ['Older snapshot provider'];
  const page = await guide(t, { country: 'BR', snapshotFetch: () => stalled, live: async () => response(fresh) });
  await page.check();
  assert.match(page.status.textContent, /Newest verified provider/);
  const checkedAt = page.status.querySelector('.hw-source-date').dataset.checkedAt;
  releaseSnapshot({ ok: true, json: async () => ({ films: [stale] }) });
  await flush();
  assert.match(page.status.textContent, /Newest verified provider/);
  assert.doesNotMatch(page.status.textContent, /Older snapshot provider/);
  assert.equal(page.status.textContent.includes(page.copy.stale), false);
  assert.equal(page.status.querySelector('.hw-source-date').dataset.checkedAt, checkedAt);
});

test('each scare filter reports the actual visible film count, including localized numerals', async t => {
  for (const language of ['en', 'ar', 'zh-TW']) {
    const page = await guide(t, { language });
    for (const tone of ['all', 'cozy', 'eerie', 'intense', 'all']) {
      page.doc.querySelector(`[data-hw-tone="${tone}"]`).click();
      const visible = [...page.doc.querySelectorAll('.hw-film')].filter(card => !card.hidden);
      const expected = sourceFilms.filter(film => tone === 'all' || film.tone === tone);
      assert.deepEqual(visible.map(card => Number(card.dataset.filmId)), expected.map(film => film.tmdbId));
      assert.equal(page.doc.getElementById('hw-count').textContent, page.copy.visibleCount.replace('{count}', new Intl.NumberFormat(language).format(visible.length)));
      assert.equal(page.doc.querySelectorAll('[data-hw-tone][aria-pressed="true"]').length, 1);
      assert.equal(page.doc.querySelector('[data-hw-tone][aria-pressed="true"]').dataset.hwTone, tone);
    }
  }
});

test('deliberate guide language links persist every supported choice without modified-click side effects', async t => {
  const page = await guide(t);
  for (const language of locales) {
    const link = page.doc.querySelector(`a[hreflang="${language}"]`);
    page.doc.addEventListener('click', event => event.preventDefault(), { once: true });
    link.dispatchEvent(new page.w.MouseEvent('click', { bubbles: true, cancelable: true }));
    assert.equal(page.w.localStorage.getItem('match_lang'), language);
  }
  page.w.localStorage.setItem('match_lang', 'pt-BR');
  page.doc.addEventListener('click', event => event.preventDefault(), { once: true });
  page.doc.querySelector('a[hreflang="zh-TW"]').dispatchEvent(new page.w.MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }));
  assert.equal(page.w.localStorage.getItem('match_lang'), 'pt-BR');
});

test('all language destinations retain the current viewing country before ordinary or new-tab navigation', async t => {
  const page = await guide(t, { country: 'BR', query: '?country=NO' });
  function checkLinks(country) {
    for (const link of page.doc.querySelectorAll('.channel-language-list a[hreflang]')) {
      const url = new URL(link.href), locale = link.hreflang;
      assert.equal(url.origin, 'https://matchapp.tv');
      assert.equal(url.pathname, `/halloween/${locale === 'en' ? '' : locale.toLowerCase() + '/'}`);
      assert.equal(url.searchParams.get('country'), country, locale);
    }
  }
  checkLinks('NO');
  const traditional = page.doc.querySelector('a[hreflang="zh-TW"]');
  page.doc.addEventListener('click', event => event.preventDefault(), { once: true });
  traditional.dispatchEvent(new page.w.MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }));
  assert.equal(new URL(traditional.href).searchParams.get('country'), 'NO');
  assert.equal(page.w.localStorage.getItem('match_lang'), 'en', 'Opening another language in a new tab leaves this tab’s preference alone');
  page.select('IN');
  checkLinks('IN');
  page.w.MatchAppCountry.setCountry('JP');
  checkLinks('JP');
  page.select('');
  checkLinks(null);
});
