'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'patches/seo-shortlist-locale.js'), 'utf8');
const contract = require('../tools/film-tv-shortlists.json');
const languages = ['en', 'pt-BR', 'es', 'fr', 'de', 'it', 'tr', 'ru', 'ar', 'hi', 'id', 'ja', 'ko', 'zh'];
const payload = lang => JSON.parse(fs.readFileSync(path.join(root, 'assets/i18n/shortlists', lang + '.json'), 'utf8'));
const english = payload('en').copy;
const tick = () => new Promise(resolve => setImmediate(resolve));
const esc = text => String(text).replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
const response = value => ({ok: true, text: async () => JSON.stringify(value)});
function fixture() {
  const rows = Object.entries(english).map(([key, value]) => `<p><span data-shortlist-copy="${key}">${esc(value)}</span></p>`).join('');
  return '<!doctype html><html lang="en"><head><title>Original title</title>' +
    '<script type="application/ld+json">{"@type":"ItemList","numberOfItems":1}</script></head><body>' +
    '<main data-shortlist-status-host><p id="original">Original authored English guidance.</p>' +
    '<h3 id="work">Alcarràs — 千と千尋の神隠し</h3>' + rows +
    '<a id="match" href="/discover.html?landing=moods%2Fcozy-comfort-watch"><span data-shortlist-copy="ui.match">' + esc(english['ui.match']) + '</span></a>' +
    '<a id="original-link" href="/about.html">About</a>' +
    '<a id="already-inert" inert href="/discover.html"><span data-shortlist-copy="ui.explore">' + esc(english['ui.explore']) + '</span></a>' +
    '</main></body></html>';
}
async function mount(lang = 'en', fetcher, html = fixture()) {
  const dom = new JSDOM(html, {url: 'https://matchapp.tv/moods/cozy-comfort-watch/?lang=de', runScripts: 'outside-only'});
  const w = dom.window, d = w.document, requests = [];
  w.localStorage.setItem('match_lang', lang);
  w.MATCH_LANG = 'fr';
  w.AbortController = AbortController;
  w.fetch = (url, options) => {
    requests.push({url, options});
    if (fetcher) return fetcher(url, options);
    return Promise.resolve(response(payload(url.match(/\/([^/]+)\.json\?/)[1])));
  };
  w.eval(source);
  await tick(); await tick();
  return {dom, w, d, requests, close: () => w.close()};
}
async function change(h, lang, event = 'matchapp:langchange') {
  h.w.localStorage.setItem('match_lang', lang);
  const target = event === 'matchapp:languagechange' ? h.w : h.d;
  target.dispatchEvent(new h.w.CustomEvent(event, {detail: {lang}}));
  await tick(); await tick();
}

test('all fourteen authored shortlist translations contain the complete UI and selection reasons', () => {
  const expected = {...Object.fromEntries(Object.entries(contract.ui).map(([key, value]) => ['ui.' + key, value])),
    ...Object.fromEntries(Object.entries(contract.reasons).map(([key, value]) => ['reason.' + key, value]))};
  assert.deepEqual(english, expected, 'English must remain identical to the crawlable authored contract');
  for (const lang of languages) {
    const data = payload(lang);
    assert.equal(data.language, lang);
    assert.deepEqual(Object.keys(data.copy).sort(), Object.keys(expected).sort());
    for (const [key, value] of Object.entries(data.copy)) {
      assert.equal(typeof value, 'string'); assert.ok(value.trim(), lang + ': ' + key);
      assert.doesNotMatch(value, /<\/?[a-z][^>]*>/i, 'copy must contain text, not markup');
      if (lang !== 'en' && key.startsWith('reason.')) assert.notEqual(value, expected[key], lang + ': untranslated reason');
    }
  }
});

test('every generated screen landing binds only complete known translation keys', () => {
  const {buildPage, loadCatalog, slug, MOOD_COPY, CAT_COPY, PLAT_COPY} = require('../tools/build-seo-pages.js');
  const catalog = loadCatalog();
  for (const page of Object.keys(contract.pages)) {
    const [kind, name] = page.split('/');
    const labels = kind === 'moods' ? MOOD_COPY : kind === 'collections' ? CAT_COPY : PLAT_COPY;
    const key = Object.keys(labels).find(value => slug(value) === name);
    const items = catalog.filter(entry => kind === 'moods' ? (entry.moods || []).includes(key) :
      kind === 'collections' ? (entry.cats || []).includes(key) : entry.platform === key);
    const dom = new JSDOM(buildPage({kind, key, title: labels[key][0], lede: labels[key][1], items, related: []}));
    try {
      const nodes = [...dom.window.document.querySelectorAll('[data-shortlist-copy]')];
      assert.ok(nodes.length > 10, page);
      for (const node of nodes) {
        assert.equal(node.children.length, 0, 'bindings must be text leaves and cannot erase original identity');
        assert.equal(node.textContent, english[node.dataset.shortlistCopy], page + ': ' + node.dataset.shortlistCopy);
      }
      assert.equal(dom.window.document.querySelectorAll('script[src^="/patches/seo-shortlist-locale.js"]').length, 1);
    } finally { dom.window.close(); }
  }
});

test('runtime paints all locales while preserving exact works, URLs, schema and pre-existing editorial text', async () => {
  const h = await mount();
  try {
    const initialLinks = [...h.d.querySelectorAll('a')].map(node => node.getAttribute('href'));
    const schema = h.d.querySelector('script[type="application/ld+json"]').textContent;
    for (const lang of [...languages.slice(1), 'en', 'pt-BR']) {
      await change(h, lang);
      assert.equal(h.d.documentElement.dataset.shortlistLocaleState, 'ready', lang);
      for (const node of h.d.querySelectorAll('[data-shortlist-copy]')) {
        assert.equal(node.textContent, payload(lang).copy[node.dataset.shortlistCopy], lang + ': ' + node.dataset.shortlistCopy);
        assert.equal(node.lang, lang);
        assert.equal(node.dir, lang === 'ar' ? 'rtl' : 'ltr');
        assert.equal(node.style.visibility, '');
      }
      assert.equal(h.d.getElementById('work').textContent, 'Alcarràs — 千と千尋の神隠し');
      assert.equal(h.d.getElementById('original').textContent, 'Original authored English guidance.');
      assert.deepEqual([...h.d.querySelectorAll('a')].map(node => node.getAttribute('href')), initialLinks);
      assert.equal(h.d.querySelector('script[type="application/ld+json"]').textContent, schema);
      assert.equal(h.d.documentElement.lang, 'en', 'new local copy cannot relabel original English editorial');
      assert.equal(h.d.title, 'Original title');
      assert.equal(h.d.getElementById('match').hasAttribute('inert'), false);
      assert.equal(h.d.getElementById('already-inert').hasAttribute('inert'), true);
    }
    assert.equal(h.requests.length, 13, 'English comes from HTML, translated assets are cached once each');
    for (const {options} of h.requests) {
      assert.equal(options.credentials, 'omit'); assert.equal(options.mode, 'same-origin'); assert.equal(options.redirect, 'error');
    }
  } finally { h.close(); }
});

test('saved language wins over URL and ambient defaults and follows canonical and storage language updates', async () => {
  const h = await mount('pt');
  try {
    const node = h.d.querySelector('[data-shortlist-copy="ui.match"]');
    assert.equal(node.textContent, payload('pt-BR').copy['ui.match']);
    await change(h, 'ja', 'matchapp:languagechange');
    assert.equal(node.lang, 'ja');
    h.w.localStorage.setItem('match_lang', 'ar');
    h.w.dispatchEvent(new h.w.StorageEvent('storage', {key: 'match_lang'}));
    await tick(); await tick();
    assert.equal(node.lang, 'ar'); assert.equal(node.dir, 'rtl');
    assert.equal(h.w.MATCH_LANG, 'fr', 'the binder does not take over app language ownership');
  } finally { h.close(); }
});

test('a late previous-language response cannot replace a later selected translation', async () => {
  const pending = [];
  const h = await mount('pt-BR', (url, options) => new Promise(resolve => pending.push({url, options, resolve})));
  try {
    assert.equal(h.d.documentElement.dataset.shortlistLocaleState, 'loading');
    assert.equal(h.d.getElementById('match').hasAttribute('inert'), true);
    assert.equal(h.d.getElementById('original-link').hasAttribute('inert'), false);
    await change(h, 'es');
    assert.equal(pending[0].options.signal.aborted, true);
    pending[1].resolve(response(payload('es'))); await tick(); await tick();
    pending[0].resolve(response(payload('pt-BR'))); await tick(); await tick();
    assert.equal(h.d.documentElement.dataset.shortlistLocaleState, 'ready');
    assert.equal(h.d.querySelector('[data-shortlist-copy="ui.why"]').textContent, payload('es').copy['ui.why']);
  } finally { h.close(); }
});

test('missing translation fails visibly in the selected language and retries without an English substitution', async () => {
  let attempts = 0;
  const h = await mount('pt-BR', () => {
    attempts++;
    const value = payload('pt-BR');
    if (attempts === 1) delete value.copy['reason.frieren'];
    return Promise.resolve(response(value));
  });
  try {
    const status = h.d.querySelector('.seo-shortlist-locale-status');
    assert.equal(h.d.documentElement.dataset.shortlistLocaleState, 'error');
    assert.equal(status.hidden, false); assert.equal(status.lang, 'pt-BR');
    assert.match(status.textContent, /Não foi possível carregar esta tradução/);
    assert.equal(h.d.getElementById('match').hasAttribute('inert'), true);
    assert.equal(h.d.querySelector('[data-shortlist-copy="ui.match"]').style.visibility, 'hidden');
    assert.equal(h.d.getElementById('work').textContent, 'Alcarràs — 千と千尋の神隠し');
    status.querySelector('button').click(); await tick(); await tick();
    assert.equal(h.d.documentElement.dataset.shortlistLocaleState, 'ready');
    assert.equal(status.hidden, true); assert.equal(attempts, 2);
    assert.equal(h.d.querySelector('[data-shortlist-copy="ui.match"]').textContent, payload('pt-BR').copy['ui.match']);
    assert.equal(h.d.getElementById('match').hasAttribute('inert'), false);
  } finally { h.close(); }
});

test('localized strings are inserted only as text and cannot change navigation or execute markup', async () => {
  const value = payload('es');
  value.copy['ui.match'] = '<img src=x onerror="window.bad=1">';
  const h = await mount('es', () => Promise.resolve(response(value)));
  try {
    assert.equal(h.d.querySelector('[data-shortlist-copy="ui.match"]').textContent, value.copy['ui.match']);
    assert.equal(h.d.querySelector('[data-shortlist-copy="ui.match"] img'), null);
    assert.equal(h.w.bad, undefined);
    assert.equal(h.d.getElementById('match').getAttribute('href'), '/discover.html?landing=moods%2Fcozy-comfort-watch');
  } finally { h.close(); }
});

test('pages without shortlist bindings have no locale side effects or network calls', async () => {
  const h = await mount('pt-BR', undefined, '<!doctype html><html lang="en"><body><main>Original</main></body></html>');
  try {
    assert.equal(h.requests.length, 0);
    assert.equal(h.d.querySelector('.seo-shortlist-locale-status'), null);
    assert.equal(h.d.documentElement.hasAttribute('data-shortlist-locale-state'), false);
    assert.equal(h.d.querySelector('main').textContent, 'Original');
  } finally { h.close(); }
});
