'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const uiSource = read('news-ui.js');
const ui = require('../news-ui.js');
const languages = ['en', 'pt-BR', 'es', 'fr', 'de', 'it', 'tr', 'ru', 'ar', 'hi', 'id', 'ja', 'ko', 'zh'];
const FIXTURE_NOW = Date.parse('2026-10-20T12:00:00.000Z');
class FixtureDate extends Date {
  constructor(...args) { super(...(args.length ? args : [FIXTURE_NOW])); }
  static now() { return FIXTURE_NOW; }
}
const expectedTitle = {
  en: 'Latest Entertainment, World and Sports News', 'pt-BR': 'Últimas notícias de entretenimento, mundo e esportes',
  es: 'Últimas noticias de entretenimiento, mundo y deportes', fr: 'Dernières actualités culturelles, mondiales et sportives',
  de: 'Aktuelle Nachrichten aus Unterhaltung, Welt und Sport', it: 'Ultime notizie di spettacolo, mondo e sport',
  tr: 'Son eğlence, dünya ve spor haberleri', ru: 'Последние новости развлечений, мира и спорта', ar: 'آخر أخبار الترفيه والعالم والرياضة',
  hi: 'मनोरंजन, दुनिया और खेल की ताज़ा खबरें', id: 'Berita hiburan, dunia, dan olahraga terbaru', ja: 'エンタメ・世界・スポーツの最新ニュース',
  ko: '최신 연예·세계·스포츠 뉴스', zh: '最新娱乐、国际与体育新闻'
};
function templates() {
  const file = path.join(root, 'tools/refresh-news-rss.js'), source = read('tools/refresh-news-rss.js');
  const entry = source.indexOf('(async()=>{');
  assert.ok(entry > 0, 'extract definitions without running the publisher');
  return vm.runInNewContext(source.slice(0, entry) + '\n;({page,hub})', {
    require: createRequire(file), __dirname: path.dirname(file), URL, console, Date: FixtureDate,
    fetch() { throw Error('Publisher requests are forbidden in this fixture'); }
  });
}
function story(extra = {}) {
  return {
    id: 'news-ui-fixture', title: 'Original «A & B» — 映画 <script> is a title, not markup',
    url: 'https://www.bbc.com/news/articles/fixture?edition=world&source=rss', source: 'BBC & Partners',
    source_domain: 'bbc.com', source_home: 'https://www.bbc.com', category: 'entertainment', event_type: 'Release',
    country: 'GB', language: 'en', description: 'An original discovery description & context.',
    published_at: '2026-10-18T12:30:00.000Z', discovered_at: '2026-10-18T12:35:00.000Z', image: null,
    matchapp_url: 'https://matchapp.tv/news/articles/fixture/', landing_url: 'https://matchapp.tv/?news=news-ui-fixture#latest-news',
    seo: { meta_title: 'Original source title | MatchApp Ai', meta_description: 'Original SEO description & context.', keywords: ['film', 'Original A & B'], short_tail: ['film'], entity_keywords: ['Original A & B'], trend_keywords: [], seo_generated_at: '2026-10-18T12:35:00.000Z' },
    ...extra
  };
}
function windowFor(html, locale = 'pt-BR', route = '/news/') {
  const w = new JSDOM(html, { url: 'https://matchapp.tv' + route, runScripts: 'outside-only', pretendToBeVisual: true }).window;
  w.localStorage.setItem('match_lang', locale);
  w.localStorage.setItem('match_user_country', 'Brazil');
  w.localStorage.setItem('match_user_region', 'BR');
  w.localStorage.setItem('matchapp-jonas-position-v2', '{"x":0.2,"y":0.4}');
  Object.defineProperty(w.navigator, 'language', { value: 'ja-JP', configurable: true });
  const transports = [], writes = [];
  w.fetch = (...args) => { transports.push(['fetch', ...args]); throw Error('No network in a copy fixture'); };
  w.XMLHttpRequest.prototype.send = function () { transports.push(['xhr']); throw Error('No XHR in a copy fixture'); };
  w.navigator.sendBeacon = (...args) => { transports.push(['beacon', ...args]); return false; };
  const storageSet = w.Storage.prototype.setItem;
  w.Storage.prototype.setItem = function (key, value) { writes.push({ key, value: String(value) }); return storageSet.call(this, key, value); };
  return { w, transports, writes };
}
function boot(w) { w.eval(uiSource); w.document.dispatchEvent(new w.Event('DOMContentLoaded')); }
function saved(w) { return Array.from({ length: w.localStorage.length }, (_, i) => w.localStorage.key(i)).sort().filter(key => key !== 'match_lang').map(key => [key, w.localStorage.getItem(key)]); }
function ownedSnapshot(doc) {
  return {
    head: doc.head.innerHTML,
    titles: Array.from(doc.querySelectorAll('[data-news-source-title]'), node => [node, node.textContent, node.getAttribute('lang'), node.getAttribute('dir')]),
    anchors: Array.from(doc.querySelectorAll('main a'), node => [node, node.getAttribute('href'), node.getAttribute('rel'), node.getAttribute('target')]),
    commerce: Array.from(doc.querySelectorAll('[data-news-commerce-card]'), node => [node, Array.from(node.attributes).filter(a => a.name.startsWith('data-news-')).map(a => [a.name, a.value])]),
    datetimes: Array.from(doc.querySelectorAll('time'), node => [node, node.getAttribute('datetime')])
  };
}
function assertOriginals(doc, original) {
  assert.equal(doc.head.innerHTML, original.head, 'SEO metadata and original scripts/styles remain byte-identical');
  assert.deepEqual(Array.from(doc.querySelectorAll('[data-news-source-title]')), original.titles.map(row => row[0]));
  for (const [node, value, lang, dir] of original.titles) { assert.equal(node.textContent, value); assert.equal(node.getAttribute('lang'), lang); assert.equal(node.getAttribute('dir'), dir); }
  assert.deepEqual(Array.from(doc.querySelectorAll('main a')), original.anchors.map(row => row[0]));
  for (const [node, href, rel, target] of original.anchors) { assert.equal(node.getAttribute('href'), href); assert.equal(node.getAttribute('rel'), rel); assert.equal(node.getAttribute('target'), target); }
  for (const [node, attrs] of original.commerce) assert.deepEqual(Array.from(node.attributes).filter(a => a.name.startsWith('data-news-')).map(a => [a.name, a.value]), attrs);
  for (const [node, datetime] of original.datetimes) assert.equal(node.getAttribute('datetime'), datetime);
}

test('News has an authored complete 38-key catalog in all 14 supported languages', () => {
  assert.deepEqual(ui.languages, languages); assert.equal(ui.keys.length, 38);
  assert.ok(Object.isFrozen(ui) && Object.isFrozen(ui.keys) && Object.isFrozen(ui.languages));
  for (const lang of languages) {
    assert.equal(ui.text(lang, 'hubTitle'), expectedTitle[lang]);
    for (const key of ui.keys) {
      const value = ui.text(lang, key, { source: 'Publisher <safe> & name' });
      assert.ok(value.trim(), lang + ':' + key); assert.doesNotMatch(value, /\{source\}|undefined/);
      assert.doesNotMatch(value, /MatchApp (?:TV|IA|iA|KI|YZ)\b/);
    }
    assert.equal(ui.text(lang, 'missing-key'), '', 'missing keys do not borrow another language');
  }
  for (const [alias, expected] of [['pt', 'pt-BR'], ['pt_PT', 'pt-BR'], ['fr-CA', 'fr'], ['es-MX', 'es'], ['zh-Hant', 'zh']]) assert.equal(ui.normalizeLanguage(alias), expected);
});

for (const lang of languages) test('News hub honors the saved ' + lang + ' language without changing source identity', () => {
  const data = story(), fixture = windowFor(templates().hub([data], data.discovered_at), lang), { w, writes, transports } = fixture;
  try {
    const original = ownedSnapshot(w.document), storage = saved(w);
    boot(w);
    assert.equal(w.document.documentElement.lang, lang); assert.equal(w.document.documentElement.dir, lang === 'ar' ? 'rtl' : 'ltr');
    assert.equal(w.document.querySelector('main h1').textContent, expectedTitle[lang]);
    for (const node of w.document.querySelectorAll('[data-news-ui]')) assert.equal(node.textContent, ui.text(lang, node.dataset.newsUi, { source: node.dataset.newsSource || '' }));
    for (const node of w.document.querySelectorAll('[data-news-ui-event]')) assert.equal(node.textContent, ui.text(lang, 'event' + node.dataset.newsUiEvent));
    assert.equal(w.document.querySelector('[data-native-news-feed]').getAttribute('aria-label'), ui.text(lang, 'feedLabel'));
    assert.equal(w.document.querySelector('[data-news-source-title]').textContent, data.title);
    assertOriginals(w.document, original); assert.deepEqual(saved(w), storage);
    assert.deepEqual(writes, []); assert.deepEqual(transports, []);
  } finally { w.close(); }
});

test('the real language owner repaints News in place across all 14 languages and keeps focus, offers and source state', () => {
  const data = story(), { w, writes, transports } = windowFor(templates().hub([data], data.discovered_at), 'pt-BR');
  try {
    w.eval(read('i18n.js')); boot(w);
    const doc = w.document, original = ownedSnapshot(doc), storage = saved(w);
    const link = doc.querySelector('a[data-news-ui="sourceLink"]'); let clicks = 0;
    link.addEventListener('click', event => { event.preventDefault(); clicks++; }); link.focus();
    const details = doc.querySelector('[data-news-local-offers] details'), select = details.querySelector('select');
    details.open = true; select.value = 'BR';
    const wordmark = doc.querySelector('.ma-brand-copy'), orb = doc.querySelector('.ma-brand-orb');
    writes.length = 0;
    for (const lang of languages) {
      w.setLanguage(lang);
      assert.equal(doc.querySelector('main h1').textContent, expectedTitle[lang]);
      assert.equal(doc.documentElement.lang, lang); assert.equal(doc.documentElement.dir, lang === 'ar' ? 'rtl' : 'ltr');
      assert.equal(doc.activeElement, link); assert.equal(doc.querySelector('[data-news-local-offers] details'), details); assert.ok(details.open);
      assert.equal(details.querySelector('select'), select); assert.equal(select.value, 'BR');
      assert.equal(doc.querySelector('.ma-brand-copy'), wordmark); assert.equal(doc.querySelector('.ma-brand-orb'), orb);
      assert.equal(wordmark.textContent.replace(/\s/g, ''), 'MatchAppAi');
      assertOriginals(doc, original); assert.deepEqual(saved(w), storage);
    }
    link.click(); assert.equal(clicks, 1, 'existing source handler survives every repaint');
    assert.equal(writes.length, languages.length); assert.ok(writes.every(row => row.key === 'match_lang'), 'only actual setLanguage persists its existing preference');
    assert.deepEqual(transports, []);
  } finally { w.close(); }
});

test('article attribution and discovery dates localize while the exact source title, schema, URL and commerce data survive', () => {
  const data = story({ language: 'pt', category: 'sports', event_type: 'Sports', timestamp_kind: 'indexed', source: 'Publisher <img src=x> & Co.' });
  const { w, writes, transports } = windowFor(templates().page(data), 'ar', '/news/articles/fixture/');
  try {
    const doc = w.document, original = ownedSnapshot(doc); boot(w);
    assert.equal(doc.querySelector('h1').textContent, data.title); assert.equal(doc.querySelector('h1').lang, 'pt-BR'); assert.equal(doc.querySelector('h1').dir, 'auto');
    assert.equal(doc.querySelector('[data-news-ui="discovered"]').textContent, ui.text('ar', 'discovered'));
    assert.equal(doc.querySelector('[data-news-ui="readAt"]').textContent, ui.text('ar', 'readAt', { source: data.source }));
    assert.equal(doc.querySelector('[data-news-ui="sourceNote"] img'), null, 'publisher values enter only textContent');
    assert.equal(doc.querySelector('time').textContent, new Intl.DateTimeFormat('ar', { dateStyle: 'long' }).format(new Date(data.published_at)));
    assertOriginals(doc, original); assert.deepEqual(writes, []); assert.deepEqual(transports, []);
    const graph = JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent)['@graph'][0];
    assert.equal(graph.headline, data.title); assert.equal(graph.citation, data.url); assert.equal(graph.mainEntity.name, data.title);
    assert.equal(doc.querySelector('meta[name="robots"]').content, 'noindex,follow');
    assert.equal(doc.querySelector('[data-native-news-feed],[data-native-news-slot]'), null);
  } finally { w.close(); }
});

test('legacy branding can no longer hide or replace the canonical News orb and text', () => {
  const old = new JSDOM('<html><head><style>.app-title-main.has-ma-local-wordmark .matchapp-wordmark{display:none!important}</style></head><body><header class="app-header"><a class="matchapp-brand-link" href="/"><span class="brand-logo-placeholder"></span><span class="app-title-main"><img class="matchapp-wordmark" src="/assets/brand/matchapp-tv-ai-v2.svg"></span></a></header></body></html>', { url: 'https://matchapp.tv/news/', runScripts: 'outside-only' }).window;
  try {
    old.eval(read('brand-corrections.js')); old.document.dispatchEvent(new old.Event('DOMContentLoaded'));
    assert.equal(old.getComputedStyle(old.document.querySelector('.matchapp-wordmark')).display, 'none', 'reproduce the reported legacy hiding contract');
  } finally { old.close(); }
  const { w } = windowFor(templates().hub([story()], story().discovered_at));
  try {
    const doc = w.document, anchor = doc.querySelector('.ma-brand-home-link'), orb = anchor.querySelector('.ma-brand-orb'), mark = anchor.querySelector('.ma-brand-copy');
    w.eval(read('brand-corrections.js')); boot(w); w.MATCH_LANG = 'ar'; doc.dispatchEvent(new w.CustomEvent('matchapp:langchange'));
    assert.equal(anchor.querySelector('.ma-brand-orb'), orb); assert.equal(anchor.querySelector('.ma-brand-copy'), mark);
    assert.equal(orb.getAttribute('src'), '/assets/brand/matchapp-ai-mark.svg?v=20261022-vector1'); assert.equal(orb.alt, '');
    assert.equal(mark.textContent.replace(/\s/g, ''), 'MatchAppAi'); assert.equal(mark.getAttribute('translate'), 'no'); assert.equal(mark.dir, 'ltr');
    assert.equal(doc.querySelectorAll('.ma-brand-lockup').length, 1); assert.equal(doc.querySelector('.matchapp-wordmark,.has-ma-local-wordmark,.ma-official-brand-icon'), null);
    const headlineCSS = read('brand-headline.css'), newsCSS = read('news-ui.css');
    assert.match(headlineCSS, /body\.news-ui-page header\.app-header\.ma-news-header/);
    assert.match(headlineCSS, /html\.reduce-motion body\.news-ui-page/);
    assert.doesNotMatch(newsCSS, /@keyframes|background-image:linear-gradient|font-family:/, 'News does not fork canonical type or motion');
  } finally { w.close(); }
});

test('late existing Kids navigation localizes without recreating the link or changing its destination and hidden state', async () => {
  const { w, writes, transports } = windowFor(templates().hub([story()], story().discovered_at), 'pt-BR');
  try {
    boot(w);
    const kids = w.document.createElement('a'); kids.id = 'matchapp-kids-entry'; kids.href = '/kids/'; kids.hidden = true;
    kids.innerHTML = '<img src="/kids/kids-logo-sm.jpeg" alt=""><span>Kids Mode</span>';
    const image = kids.querySelector('img'), label = kids.querySelector('span'); let clicks = 0;
    kids.addEventListener('click', event => { event.preventDefault(); clicks++; });
    w.document.querySelector('header').append(kids); await new Promise(resolve => w.setTimeout(resolve, 0));
    assert.equal(label.textContent, 'Modo Kids'); assert.equal(kids.getAttribute('aria-label'), 'Abrir o Modo Kids');
    assert.equal(kids.querySelector('img'), image); assert.equal(kids.querySelector('span'), label); assert.equal(kids.getAttribute('href'), '/kids/'); assert.equal(kids.hidden, true);
    kids.click(); assert.equal(clicks, 1); assert.deepEqual(writes, []); assert.deepEqual(transports, []);
  } finally { w.close(); }
});

test('saved language beats device and source defaults, storage repaint is read-only, and unrelated routes do not boot', () => {
  const data = story(), html = templates().page(data), { w, writes } = windowFor(html, 'fr-CA', '/news/articles/fixture/');
  try {
    boot(w); assert.equal(w.document.documentElement.lang, 'fr');
    w.MATCH_LANG = 'pt'; w.MatchAppNewsUI.paint(w); assert.equal(w.document.documentElement.lang, 'pt-BR');
    delete w.MATCH_LANG;
    w.localStorage.setItem('match_lang', 'ar'); writes.length = 0;
    w.dispatchEvent(new w.StorageEvent('storage', { key: 'match_lang', newValue: 'ar' }));
    assert.equal(w.document.documentElement.lang, 'ar'); assert.deepEqual(writes, []);
  } finally { w.close(); }
  for (const route of ['/kids/', '/pricing/pricing.html', '/']) {
    const { w } = windowFor(html, 'ar', route);
    try { const before = w.document.documentElement.outerHTML; boot(w); assert.equal(w.document.documentElement.outerHTML, before); assert.equal(w.__matchappNewsUIStarted, undefined); }
    finally { w.close(); }
  }
});

test('all committed generated News documents carry the durable header and labels without changing their indexability or source identities', () => {
  const files = ['news/index.html', ...fs.readdirSync(path.join(root, 'news/articles'), { withFileTypes: true }).filter(entry => entry.isDirectory() && fs.existsSync(path.join(root, 'news/articles', entry.name, 'index.html'))).map(entry => 'news/articles/' + entry.name + '/index.html')];
  for (const file of files) {
    const html = read(file);
    assert.match(html, /<body class="news-ui-page">/, file);
    assert.equal((html.match(/class="ma-brand-home-link"/g) || []).length, 1, file);
    assert.equal((html.match(/src="\/news-ui\.js\?v=20261019-newsui1"/g) || []).length, 1, file);
    assert.match(html, /src="\/assets\/brand\/matchapp-ai-mark\.svg\?v=20261022-vector1"/); assert.doesNotMatch(html, /class="app-title-main"/);
    if (file !== 'news/index.html') {
      assert.match(html, /<h1 data-news-source-title lang="[^"]+" dir="auto" translate="no">/); assert.match(html, /meta name="robots" content="noindex,follow"/);
      assert.match(html, /data-news-ui="readAt" data-news-source="[^"]+"/, 'every article retains an attributed original publisher action');
      const verified = (html.match(/data-news-ui="verifiedSource"/g) || []).length, compact = (html.match(/<p data-news-source-attribution><bdi>[^<]+<\/bdi> · <time data-news-ui-date="long" datetime="[^"]+">/g) || []).length;
      assert.equal(verified + compact, 1, 'exactly one of the two authored source-attribution templates');
      if (compact) {
        assert.doesNotMatch(html, /data-news-ui="published"|data-news-ui="discovered"|data-news-ui="openStory"|src="\/build-meta\.js/, 'the oldest template gains no timestamp claim, story action or extra runtime');
      }
    }
  }
});
