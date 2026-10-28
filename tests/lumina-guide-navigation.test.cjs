/* Guide navigation only: these DOM fixtures do not simulate browser tabs,
 * network requests, consent state, or game/account persistence. The new-tab
 * cases execute the destination document with the actual language fragment. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {JSDOM} = require('jsdom');

const source = fs.readFileSync(path.join(__dirname, '../lumina-match/guide.js'), 'utf8');

function fixture(t, options = {}) {
  const locale = options.locale === undefined ? 'en' : options.locale;
  const dom = new JSDOM('<!doctype html><html lang="' + (locale || 'en') + '"' +
    (locale ? ' data-lumina-guide-locale="' + locale + '"' : '') + '><body>' +
    '<a data-lumina-guide-link href="/lumina-match/">Guide</a>' +
    '<a data-lumina-language="fr" href="/lumina-match/fr/#language-fr"><span id="choose-fr">Français</span></a>' +
    '<a data-lumina-play href="/">Play</a></body></html>',
  {url: 'https://matchapp.tv/', runScripts: 'outside-only'});
  t.after(() => dom.window.close());
  const storage = new Map(), writes = [], navigations = [], events = new Map();
  if (options.saved !== undefined) storage.set('match_lang', options.saved);
  const host = {
    location: {
      hash: options.hash || '',
      replace: url => navigations.push({kind: 'replace', url}),
      assign: url => navigations.push({kind: 'assign', url})
    },
    localStorage: {
      getItem(key) {
        if (options.readFails) throw new Error('Storage unavailable');
        return storage.get(key) ?? null;
      },
      setItem(key, value) {
        if (options.writeFails) throw new Error('Storage write unavailable');
        writes.push({key, value}); storage.set(key, value);
      }
    },
    addEventListener(name, listener) {
      const listeners = events.get(name) || [];
      listeners.push(listener); events.set(name, listeners);
    }
  };
  if (options.language) host.MATCH_LANG = options.language;
  // Route selection must never inspect device language or geolocation.
  Object.defineProperty(host, 'navigator', {get() { throw new Error('Unexpected device-language lookup'); }});
  const document = dom.window.document;
  vm.runInNewContext(source, {window: host, document}, {filename: 'lumina-match/guide.js'});
  document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  // Suppress only jsdom's unsupported default navigation, after production
  // click handling has observed the event and its original cancellation state.
  document.addEventListener('click', event => event.preventDefault());
  return {
    host, document, storage, writes, navigations,
    guidePath: () => new URL(document.querySelector('[data-lumina-guide-link]').href).pathname,
    click(selector, properties = {}) {
      document.querySelector(selector).dispatchEvent(new dom.window.MouseEvent('click', {
        bubbles: true, cancelable: true, button: 0, ...properties
      }));
    },
    change(name) { document.dispatchEvent(new dom.window.CustomEvent(name, {detail: {lang: host.MATCH_LANG}})); },
    storageEvent(key) {
      const event = new dom.window.StorageEvent('storage', {key, newValue: storage.get(key) ?? null});
      for (const listener of events.get('storage') || []) listener(event);
    }
  };
}

test('a first visit keeps the authored route without choosing a device language or writing a preference', t => {
  const f = fixture(t, {locale: 'fr'});
  assert.equal(f.host.MATCH_LANG, 'fr');
  assert.equal(f.guidePath(), '/lumina-match/fr/');
  assert.deepEqual(f.writes, []);
  assert.deepEqual(f.navigations, []);
});

test('an existing app language is preserved with the section fragment', t => {
  const f = fixture(t, {locale: 'en', saved: 'pt_br', hash: '#music-and-sound'});
  assert.deepEqual(f.navigations, [{kind: 'replace', url: '/lumina-match/pt-br/#music-and-sound'}]);
  assert.deepEqual(f.writes, []);
});

test('explicit language fragments preserve the chosen destination for new-tab navigation', async t => {
  const languages = ['en', 'pt-BR', 'es', 'fr', 'de', 'it', 'tr', 'ru', 'ar', 'hi', 'id', 'ja', 'ko', 'zh'];
  for (const locale of languages) await t.test(locale, inner => {
    const f = fixture(inner, {locale, saved: locale === 'en' ? 'fr' : 'en', hash: '#language-' + locale});
    assert.equal(f.host.MATCH_LANG, locale);
    assert.equal(f.storage.get('match_lang'), locale);
    assert.deepEqual(f.navigations, []);
    assert.equal(f.guidePath(), '/lumina-match/' + (locale === 'en' ? '' : locale.toLowerCase() + '/'));
  });
});

test('a language fragment only overrides preference when it matches the actual supported page locale', t => {
  const f = fixture(t, {locale: 'fr', saved: 'de', hash: '#language-ja'});
  assert.deepEqual(f.writes, []);
  assert.deepEqual(f.navigations, [{kind: 'replace', url: '/lumina-match/de/#language-ja'}]);
});

test('unsupported stored values cannot override the authored locale or produce an external redirect', async t => {
  for (const saved of ['xx', '//outside.invalid', 'javascript:alert(1)', '../es', '__proto__']) await t.test(saved, inner => {
    const f = fixture(inner, {locale: 'fr', saved});
    assert.equal(f.host.MATCH_LANG, 'fr');
    assert.equal(f.guidePath(), '/lumina-match/fr/');
    f.change('matchapp:langchange');
    assert.deepEqual(f.navigations, []);
    assert.deepEqual(f.writes, []);
  });
});

test('an explicit choice still controls guide navigation if an older stored preference cannot be overwritten', t => {
  const f = fixture(t, {locale: 'fr', saved: 'en', writeFails: true, hash: '#language-fr'});
  assert.equal(f.storage.get('match_lang'), 'en', 'the fixture keeps the old unreadjustable preference');
  assert.equal(f.host.MATCH_LANG, 'fr');
  assert.equal(f.guidePath(), '/lumina-match/fr/');
  assert.deepEqual(f.navigations, []);
});

test('unavailable browser storage leaves the page and in-memory language selection usable', t => {
  const f = fixture(t, {locale: 'en', readFails: true, writeFails: true});
  assert.equal(f.guidePath(), '/lumina-match/');
  f.click('#choose-fr');
  assert.equal(f.host.MATCH_LANG, 'fr');
  f.change('matchapp:langchange');
  assert.deepEqual(f.navigations, [{kind: 'assign', url: '/lumina-match/fr/'}]);
  assert.deepEqual(f.writes, []);
});

test('Play remembers the current guide language while leaving ordinary anchor navigation intact', t => {
  const f = fixture(t, {locale: 'pt-BR'});
  f.click('[data-lumina-play]');
  assert.deepEqual(f.writes, [{key: 'match_lang', value: 'pt-BR'}]);
  assert.equal(f.document.querySelector('[data-lumina-play]').getAttribute('href'), '/');
  assert.deepEqual(f.navigations, []);
});

test('both app language events and cross-tab preference changes update the guide destination', t => {
  const f = fixture(t, {locale: 'en', saved: 'en', hash: '#save-and-close'});
  for (const [name, language] of [['matchapp:langchange', 'fr'], ['matchapp:languagechange', 'ja']]) {
    f.storage.set('match_lang', language); f.host.MATCH_LANG = language; f.change(name);
  }
  f.storage.set('match_lang', 'ar'); f.storageEvent('match_lang');
  const expected = ['fr','ja','ar'].map(language => ({kind: 'assign', url: '/lumina-match/' + language + '/#save-and-close'}));
  assert.deepEqual(f.navigations, expected);
  f.storageEvent('luminaAudioSettingsV1');
  assert.deepEqual(f.navigations, expected, 'unrelated preferences do not navigate');
});

test('a Home guide link uses the current app preference without changing the page or writing game data', t => {
  const f = fixture(t, {locale: null, saved: 'es', language: 'es'});
  assert.equal(f.guidePath(), '/lumina-match/es/');
  f.storage.set('match_lang', 'pt-BR'); f.host.MATCH_LANG = 'pt-BR'; f.change('matchapp:langchange');
  assert.equal(f.guidePath(), '/lumina-match/pt-br/');
  assert.deepEqual(f.navigations, []);
  assert.deepEqual(f.writes, []);
});
