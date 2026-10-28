'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const {loadRegistry, validateRegistry, projectDirectory} = require('../tools/streaming-registry.cjs');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const readJson = file => JSON.parse(read(file));
const clone = value => JSON.parse(JSON.stringify(value));
const LANGUAGES = ['en','pt','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];

function fixture() {
  const service = {
    id: 'example-stream',
    name: 'Example Stream',
    aliases: ['Former Example'],
    homepage: 'https://example.com/',
    representative_markets: ['BR'],
    offer_types: ['subscription'],
    focus: ['movies'],
    official_sources: [{url: 'https://example.com/about', note: 'Service identity and Brazil availability.'}],
    checked_on: '2026-10-28',
    evidence_scope: 'Service information only.',
    caveats: 'Does not establish title rights.',
    status: 'active',
    integration: 'directory_only'
  };
  return {schema_version: 1, research_date:'2026-10-28', services: [service]};
}

function openDirectory() {
  const dom = new JSDOM(read('streaming/index.html'), {
    url: 'https://matchapp.tv/streaming/',
    runScripts: 'outside-only'
  });
  dom.window.eval(read('patches/partnership-copy.js'));
  dom.window.eval(read('patches/partnership-pages.js'));
  return dom;
}

function setControl(window, id, value, type = 'change') {
  const control = window.document.getElementById(id);
  assert(control, 'Missing directory control: ' + id);
  control.value = value;
  assert.equal(control.value, value, 'Unsupported test option: ' + id + '=' + value);
  control.dispatchEvent(new window.Event(type, {bubbles: true}));
}

function visibleIds(window) {
  return [...window.document.querySelectorAll('.mp-service')]
    .filter(node => !node.hidden)
    .map(node => node.id.replace(/^service-/, ''))
    .sort();
}

function assertVisible(window, ids) {
  const actual = visibleIds(window);
  assert.deepEqual(actual, [...ids].sort());
  assert.equal(Number(window.document.getElementById('mp-results-count').textContent), actual.length);
  assert.equal(window.document.getElementById('mp-directory-empty').hidden, actual.length > 0);
}

test('registry rejects broken provenance, invalid dates and implied title integrations', () => {
  const corruptions = [
    ['insecure homepage', row => { row.homepage = 'http://example.com/'; }],
    ['credentials in link', row => { row.homepage = 'https://user:secret@example.com/'; }],
    ['unverifiable source', row => { row.official_sources = []; }],
    ['insecure evidence', row => { row.official_sources[0].url = 'http://example.com/about'; }],
    ['missing evidence scope', row => { row.official_sources[0].note = ''; }],
    ['impossible date', row => { row.checked_on = '2026-02-30'; }],
    ['date beyond research snapshot', row => { row.checked_on = '2026-10-29'; }],
    ['title integration assertion', row => { row.integration = 'title_availability'; }],
    ['inactive current offer', row => { row.status = 'legacy'; }],
    ['wildcard market', row => { row.representative_markets = ['WORLDWIDE']; }],
    ['unsupported access type', row => { row.offer_types = ['every-title-free']; }]
  ];
  for (const [label, corrupt] of corruptions) {
    const registry = fixture();
    corrupt(registry.services[0]);
    assert.throws(() => validateRegistry(registry), undefined, label);
  }
  const duplicate = fixture();
  duplicate.services.push(clone(duplicate.services[0]));
  assert.throws(() => validateRegistry(duplicate), /duplicate/i);
});

test('explicit historical names remain discoverable with country and access filters, and reveal the successor',()=>{
  const dom=openDirectory(),w=dom.window;
  try{
    for(const [country,query,successor] of [['BR','Star+','disney-plus'],['ZA','Showmax','dstv-stream'],['US','Freevee','prime-video'],['IN','JioCinema','jiohotstar']]){
      setControl(w,'mp-market',country);setControl(w,'mp-offer','subscription');setControl(w,'mp-service-query',query,'input');
      const history=w.document.getElementById('mp-legacy-services');
      assert.equal(history.hidden,false);assert.equal(history.open,true);
      const link=[...history.querySelectorAll('[data-current-service]')].find(a=>!a.closest('.mp-legacy-service').hidden&&a.dataset.currentService===successor);
      assert(link,'Missing accessible historical destination for '+query);
      link.click();
      assert.equal(w.document.getElementById('mp-service-query').value,'');
      assert.equal(w.document.getElementById('mp-market').value,'');
      assert.equal(w.document.getElementById('mp-offer').value,'');
      assert.equal(w.document.getElementById('service-'+successor).hidden,false);
    }
  }finally{w.close();}
});

test('projection separates active directory entries, legacy migrations and unverified services', () => {
  const registry = fixture();
  const active = registry.services[0];
  registry.services.push({...clone(active), id: 'unmapped-stream', representative_markets: [], aliases: []});
  registry.services.push({...clone(active), id: 'old-stream', status: 'legacy', offer_types: [], successor_id: active.id});
  registry.services.push({...clone(active), id: 'unverified-stream', status: 'pending_verification', offer_types: []});
  const before = clone(registry);
  assert.deepEqual(projectDirectory(registry).map(row => row.id).sort(), ['example-stream', 'unmapped-stream']);
  assert.deepEqual(registry, before, 'Projection must not promote services or mutate research evidence');
  const legacy = registry.services.find(row => row.id === 'old-stream');
  legacy.successor_id = 'unverified-stream';
  assert.throws(() => validateRegistry(registry), /successor/i);
});

test('published service cards preserve official evidence and individual source dates', () => {
  const registry = loadRegistry(root);
  const active = registry.services.filter(row => row.status === 'active');
  assert(active.length > 0, 'Directory must contain researched active services');
  const dom = new JSDOM(read('streaming/index.html'));
  try {
    const doc = dom.window.document;
    assert.equal(doc.querySelectorAll('.mp-service').length, active.length);
    for (const row of active) {
      const card = doc.getElementById('service-' + row.id);
      assert(card && card.classList.contains('mp-service'), row.id);
      assert.equal(card.querySelector('h3').textContent, row.name);
      assert.equal(card.querySelector('time').getAttribute('datetime'), row.checked_on, row.id + ' source date');
      assert(row.checked_on <= registry.research_date, row.id + ' source date cannot be later than research');
      const evidenceLinks = [...card.querySelectorAll('.mp-service-evidence a')];
      for (const source of row.official_sources) {
        assert(evidenceLinks.some(link => link.href === new URL(source.url).href), row.id + ' missing evidence');
      }
      for (const link of card.querySelectorAll('a[href]')) {
        const url = new URL(link.href);
        assert.equal(url.protocol, 'https:', row.id);
        assert.equal(url.username, '', row.id);
        assert.equal(url.password, '', row.id);
        assert(link.rel.includes('noopener'), row.id + ' external handoff');
      }
    }
  } finally {
    dom.window.close();
  }
});

test('legacy and pending services are never displayed as active providers', () => {
  const registry = loadRegistry(root);
  const retired = registry.services.filter(row => row.status === 'legacy');
  assert(retired.length > 0, 'The researched migration history should not disappear');
  const dom = new JSDOM(read('streaming/index.html'));
  try {
    const doc = dom.window.document;
    const history = doc.getElementById('mp-legacy-services');
    assert(history && history.tagName === 'DETAILS');
    assert.equal(history.querySelectorAll('.mp-legacy-service').length, retired.length);
    for (const row of registry.services.filter(row => row.status !== 'active')) {
      assert.equal(doc.querySelector('.mp-service#service-' + row.id), null, row.id);
    }
    for (const row of retired) {
      const card = [...history.querySelectorAll('.mp-legacy-service')]
        .find(node => node.querySelector('h3').textContent === row.name);
      assert(card, row.id);
      assert.equal(card.querySelector('time').getAttribute('datetime'), row.checked_on);
      assert.equal(card.querySelector('.mp-service-offers'), null, row.id + ' must not claim active offers');
      if (row.successor_id) {
        const link = card.querySelector('a[href="#service-' + row.successor_id + '"]');
        assert(link, row.id + ' successor handoff');
        assert(doc.querySelector('.mp-service' + link.getAttribute('href')), row.id + ' must target an active service');
      }
    }
  } finally {
    dom.window.close();
  }
});

test('country, access type and service search combine rather than replacing one another', () => {
  const registry = loadRegistry(root);
  const dom = openDirectory();
  try {
    const w = dom.window;
    assertVisible(w, registry.services.filter(row => row.status === 'active').map(row => row.id));
    setControl(w, 'mp-market', 'IN');
    setControl(w, 'mp-offer', 'free_ads');
    setControl(w, 'mp-service-query', 'Amazon miniTV', 'input');
    assertVisible(w, ['mx-player-by-prime-video']);
    setControl(w, 'mp-market', 'BR');
    assertVisible(w, []);
    setControl(w, 'mp-market', 'IN');
    setControl(w, 'mp-offer', 'rent');
    assertVisible(w, []);
    setControl(w, 'mp-service-query', '', 'input');
    setControl(w, 'mp-offer', '');
    assertVisible(w, registry.services.filter(row => row.status === 'active' && row.representative_markets.includes('IN')).map(row => row.id));
  } finally {
    dom.window.close();
  }
});

test('search handles former brands, punctuation, case and Unicode compatibility forms', () => {
  const dom = openDirectory();
  try {
    const w = dom.window;
    setControl(w, 'mp-service-query', 'mAx', 'input');
    assert(visibleIds(w).includes('hbo-max'));
    setControl(w, 'mp-service-query', 'Apple TV+', 'input');
    assert(visibleIds(w).includes('apple-tv'));
    setControl(w, 'mp-service-query', 'Ａｐｐｌｅ ＴＶ＋', 'input');
    assert(visibleIds(w).includes('apple-tv'), 'Full-width aliases should find their canonical service');
    setControl(w, 'mp-service-query', '  Amazon miniTV  ', 'input');
    assertVisible(w, ['mx-player-by-prime-video']);
    setControl(w, 'mp-service-query', '<script>unmatched-service</script>', 'input');
    assertVisible(w, []);
    assert.equal(w.document.querySelector('#mp-service-list script'), null, 'Search input must remain text');
    assert.equal(w.document.querySelector('#mp-directory-status').getAttribute('role'), 'status');
  } finally {
    dom.window.close();
  }
});

test('services with unverified country coverage remain discoverable without guessed markets', () => {
  const registry = loadRegistry(root);
  const unmapped = registry.services.filter(row => row.status === 'active' && row.representative_markets.length === 0);
  assert(unmapped.length > 0, 'This fixture must exercise genuinely unmapped researched services');
  const dom = openDirectory();
  try {
    const w = dom.window;
    for (const row of unmapped) {
      assert(visibleIds(w).includes(row.id), row.id + ' all-services view');
      assert(w.document.getElementById('service-' + row.id).querySelector('[data-mp="directoryUnmapped"]'));
    }
    setControl(w, 'mp-market', 'BR');
    for (const row of unmapped) assert(!visibleIds(w).includes(row.id), row.id + ' must not guess Brazil coverage');
    setControl(w, 'mp-market', '');
    for (const row of unmapped) assert(visibleIds(w).includes(row.id), row.id + ' reset');
  } finally {
    dom.window.close();
  }
});

test('Apple TV subscription and Store rental or purchase remain distinct access paths', () => {
  const registry = loadRegistry(root);
  const subscription = registry.services.find(row => row.id === 'apple-tv');
  const store = registry.services.find(row => row.id === 'apple-tv-store');
  assert(subscription && store);
  assert(subscription.offer_types.includes('subscription'));
  assert(!subscription.offer_types.includes('rent'));
  assert(store.offer_types.includes('rent') && store.offer_types.includes('buy'));
  assert(!store.offer_types.includes('subscription'));
  const dom = openDirectory();
  try {
    const w = dom.window;
    setControl(w, 'mp-service-query', 'Apple TV', 'input');
    setControl(w, 'mp-offer', 'subscription');
    assert(visibleIds(w).includes(subscription.id));
    assert(!visibleIds(w).includes(store.id));
    setControl(w, 'mp-offer', 'rent');
    assert(visibleIds(w).includes(store.id));
    assert(!visibleIds(w).includes(subscription.id));
    setControl(w, 'mp-offer', 'buy');
    assert(visibleIds(w).includes(store.id));
    assert(!visibleIds(w).includes(subscription.id));
  } finally {
    dom.window.close();
  }
});

test('all fourteen authored locales reach generated labels and SEO without fallback', () => {
  const copy = readJson('data/streaming-directory-copy.json');
  assert.deepEqual(Object.keys(copy).sort(), [...LANGUAGES].sort());
  const keys = Object.keys(copy.en).sort();
  for (const language of LANGUAGES) {
    assert.deepEqual(Object.keys(copy[language]).sort(), keys, language);
    for (const value of Object.values(copy[language])) assert.equal(typeof value, 'string');
    for (const [key, value] of Object.entries(copy[language])) assert(value.trim(), language + ':' + key);
    if (language !== 'en') assert.notEqual(copy[language].directoryEmpty, copy.en.directoryEmpty, language + ' requires authored copy');
  }
  const dom = openDirectory();
  try {
    const w = dom.window;
    for (const language of LANGUAGES) {
      setControl(w, 'mp-language', language);
      assert.equal(w.document.documentElement.lang, language === 'pt' ? 'pt-BR' : language);
      assert.equal(w.document.documentElement.dir, language === 'ar' ? 'rtl' : 'ltr');
      assert.equal(w.document.title, copy[language].streamingSeoTitle, language + ' SEO must not be overwritten');
      assert.equal(w.document.querySelector('meta[name="description"]').content, copy[language].streamingSeoDescription);
      for (const node of w.document.querySelectorAll('[data-mp]')) {
        const key = node.dataset.mp;
        assert.equal(node.textContent, w.MATCHAPP_PARTNERSHIP_COPY[language][key], language + ':' + key);
      }
    }
    setControl(w, 'mp-market', 'IN');
    setControl(w, 'mp-offer', 'free_ads');
    setControl(w, 'mp-service-query', 'Amazon miniTV', 'input');
    setControl(w, 'mp-language', 'pt');
    assertVisible(w, ['mx-player-by-prime-video']);
    setControl(w, 'mp-language', 'ar');
    assertVisible(w, ['mx-player-by-prime-video']);
    assert.equal(w.document.getElementById('mp-service-query').value, 'Amazon miniTV');
    const row = loadRegistry(root).services.find(service => service.id === 'mx-player-by-prime-video');
    assert.equal(w.document.querySelector('#service-' + row.id + ' time').getAttribute('datetime'), row.checked_on);
  } finally {
    dom.window.close();
  }
});

test('authored sponsor labels survive the late generic localizer and still change language', async () => {
  const dom = new JSDOM(read('sponsor/index.html'), {
    url: 'https://matchapp.tv/sponsor/', runScripts: 'outside-only', pretendToBeVisual: true
  });
  try {
    const w = dom.window;
    w.localStorage.setItem('match_lang', 'pt');
    w.MATCH_LANG = 'pt';
    w.eval(read('patches/partnership-copy.js'));
    w.eval(read('patches/partnership-pages.js'));
    const unowned = w.document.createElement('a');
    unowned.href = '#test-control';
    unowned.textContent = 'Início';
    w.document.body.appendChild(unowned);
    // Exercise the actual shared runtime that previously replaced authored
    // Portuguese text when its dictionary received the shorter pt code.
    w.eval(read('ai-composer.js'));
    if (w.document.readyState === 'loading') {
      await new Promise(resolve => w.document.addEventListener('DOMContentLoaded', resolve, {once: true}));
    }
    assert.equal(unowned.textContent, 'Home', 'The fixture must exercise the generic fallback repaint');
    for (const key of ['home', 'privacy', 'terms', 'copyright', 'contact']) {
      assert.equal(w.document.querySelector('[data-mp="' + key + '"]').textContent, w.MATCHAPP_PARTNERSHIP_COPY.pt[key]);
    }
    setControl(w, 'mp-language', 'ar');
    assert.equal(w.document.querySelector('[data-mp="home"]').textContent, w.MATCHAPP_PARTNERSHIP_COPY.ar.home);
    setControl(w, 'mp-language', 'pt');
    assert.equal(w.document.querySelector('[data-mp="home"]').textContent, w.MATCHAPP_PARTNERSHIP_COPY.pt.home);
  } finally {
    dom.window.close();
  }
});

test('directory structured data stays factual and its canonical route remains discoverable', () => {
  const registry = loadRegistry(root);
  const active = registry.services.filter(row => row.status === 'active');
  const dom = new JSDOM(read('streaming/index.html'));
  try {
    const doc = dom.window.document;
    assert.equal(doc.querySelector('link[rel="canonical"]').href, 'https://matchapp.tv/streaming/');
    assert.match(read('sitemap.xml'), /https:\/\/matchapp\.tv\/streaming\//);
    assert.match(read('tools/update-sitemap.js'), /\/streaming\//);
    const schemas = [...doc.querySelectorAll('script[type="application/ld+json"]')].map(node => JSON.parse(node.textContent));
    const nodes = [];
    const visit = value => {
      if (!value || typeof value !== 'object') return;
      if (Array.isArray(value)) { value.forEach(visit); return; }
      nodes.push(value);
      for (const nested of Object.values(value)) visit(nested);
    };
    schemas.forEach(visit);
    for (const node of nodes) {
      const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
      assert(!types.some(type => ['Offer','AggregateOffer','AggregateRating'].includes(type)), 'Service research is not a priced offer or rating');
      for (const key of ['price','priceCurrency','lowPrice','highPrice','availability']) {
        assert(!Object.hasOwn(node, key), 'Directory must not invent title price or availability');
      }
    }
    const collection = nodes.find(node => node['@type'] === 'CollectionPage');
    assert(collection);
    assert.equal(collection.dateModified, registry.research_date);
    const list = nodes.find(node => node['@type'] === 'ItemList');
    assert(list);
    assert.equal(list.numberOfItems, active.length);
    assert.equal(list.itemListElement.length, active.length);
    for (const item of list.itemListElement) {
      const url = new URL(item.url);
      assert.equal(url.origin + url.pathname, 'https://matchapp.tv/streaming/');
      assert(doc.querySelector('.mp-service' + url.hash), 'Structured data must point at visible active service content');
    }
    assert.equal(doc.querySelectorAll('h1').length, 1);
    assert.equal(doc.querySelector('script[src*="adsbygoogle"],ins.adsbygoogle'), null);
  } finally {
    dom.window.close();
  }
});

