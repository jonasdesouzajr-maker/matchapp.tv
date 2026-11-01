'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const languages = ['en', 'pt-BR', 'es', 'fr', 'de', 'it', 'tr', 'ru', 'ar', 'hi', 'id', 'ja', 'ko', 'zh'];

test('Home exposes existing planner and memory-game guides before scripts and localizes their purpose', () => {
  const dom = new JSDOM(read('index.html'), {url:'https://matchapp.tv/', runScripts:'outside-only'});
  try {
    const {document} = dom.window;
    const section = document.getElementById('home-discovery-tools');
    assert.ok(section && !section.hidden && !section.closest('[hidden],[aria-hidden="true"]'));
    const links = [...section.querySelectorAll('a[href]')];
    assert.deepEqual(links.map(a => a.getAttribute('href')), ['/watch-night/', '/pt-br/noite-de-filme/', '/lumina-match/']);
    for (const link of links) {
      assert.ok(link.textContent.trim());
      assert.ok(fs.existsSync(path.join(root, link.getAttribute('href'), 'index.html')));
    }
    assert.equal(links[0].hreflang, 'en');
    assert.equal(links[1].hreflang, 'pt-BR');
    dom.window.eval(read('i18n.js'));
    const authored = new Map();
    for (const language of languages) {
      dom.window.setLanguage(language);
      assert.equal(document.documentElement.lang, language);
      const text = section.textContent.replace(/\s+/g, ' ').trim();
      assert.ok(text.includes('Lumina Match'));
      assert.ok(!authored.has(text), 'Each supported language has authored tool guidance');
      authored.set(text, language);
      assert.equal(section.querySelector('nav').getAttribute('aria-label'), section.querySelector('h3').textContent);
      assert.deepEqual(links.map(a => a.getAttribute('href')), ['/watch-night/', '/pt-br/noite-de-filme/', '/lumina-match/']);
    }
  } finally { dom.window.close(); }
});

test('both planner pages describe their visible calculator without ratings, freshness or streaming promises', () => {
  for (const [file, language] of [['watch-night/index.html','en'], ['pt-br/noite-de-filme/index.html','pt-BR']]) {
    const dom = new JSDOM(read(file), {url:'https://matchapp.tv/' + file.replace('index.html','')});
    try {
      const d = dom.window.document;
      const page = JSON.parse(d.querySelector('script[type="application/ld+json"]').textContent);
      const app = page.mainEntity;
      assert.equal(app['@type'], 'WebApplication');
      assert.equal(app.url, d.querySelector('link[rel="canonical"]').href);
      assert.equal(app.inLanguage, language);
      assert.equal(app.description, d.querySelector('meta[name="description"]').content);
      assert.equal(app.isAccessibleForFree, true);
      assert.ok(d.querySelector('#watch-plan #running-time'));
      assert.ok(d.querySelector('#watch-mode option[value="episodes"]'));
      assert.ok(d.querySelector('#break-minutes') && d.querySelector('#share-plan'));
      assert.ok(d.querySelector('#wn-planning-questions'));
      assert.match(d.querySelector('#wn-planning-questions').parentElement.textContent, language === 'en' ? /Neither tool synchronizes video playback/ : /Nenhuma das ferramentas sincroniza/);
      assert.equal(d.querySelectorAll('h1').length, 1);
      assert.equal(d.querySelector('meta[property="og:title"]').content, d.title);
      assert.equal(d.querySelector('meta[name="twitter:title"]').content, d.title);
      for (const forbidden of ['aggregateRating', 'review', 'dateModified', 'VideoObject']) assert.ok(!JSON.stringify(page).includes(forbidden));
      assert.ok(!d.querySelector('.adsbygoogle,script[src*="adsbygoogle"]'));
    } finally { dom.window.close(); }
  }
});

test('Together uses the existing raster preview and concise, consistent preference-sharing copy', () => {
  const dom = new JSDOM(read('together.html'));
  try {
    const d = dom.window.document, description = d.querySelector('meta[name="description"]').content;
    assert.ok(description.length <= 155);
    assert.match(description, /Sign in to invite/);
    assert.match(description, /guest can join without an account/);
    assert.equal(d.querySelector('meta[property="og:description"]').content, description);
    assert.equal(d.querySelector('meta[name="twitter:description"]').content, description);
    const image = d.querySelector('meta[property="og:image"]').content;
    assert.equal(image, d.querySelector('meta[name="twitter:image"]').content);
    assert.equal(d.querySelector('meta[property="og:image:type"]').content, 'image/jpeg');
    assert.equal(fs.readFileSync(path.join(root, new URL(image).pathname)).readUInt16BE(0), 0xffd8);
  } finally { dom.window.close(); }
});
