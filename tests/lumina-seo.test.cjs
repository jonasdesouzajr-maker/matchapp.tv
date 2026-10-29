'use strict';

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const {JSDOM} = require('jsdom');
const builder = require('../tools/build-lumina-pages.cjs');
const campaign = require('../lumina-match/browser/campaign.js');
const source = require('../tools/lumina-seo-copy.json');
const provenance = require('../lumina-match/browser/campaign-source.json');
const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://matchapp.tv';
const LANGUAGES = ['en', 'pt-BR', 'es', 'fr', 'de', 'it', 'tr', 'ru', 'ar', 'hi', 'id', 'ja', 'ko', 'zh'];
const ART = ['card_back.jpg', 'event_card_back.jpg', 'ocean_card_back.jpg'];
const route = language => '/lumina-match/' + (language === 'en' ? '' : language.toLowerCase() + '/');
const fileFor = language => route(language).slice(1) + 'index.html';
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const text = node => node.textContent.replace(/\s+/g, ' ').trim();
const tidy = value => value.replace(/\s+/g, ' ').trim();

function page(language) {
  return new JSDOM(read(fileFor(language)), {url:SITE + route(language), runScripts:'outside-only'});
}

function allObjects(value, output = []) {
  if (!value || typeof value !== 'object') return output;
  if (!Array.isArray(value)) output.push(value);
  for (const child of Object.values(value)) allObjects(child, output);
  return output;
}

function localFile(url) {
  const parsed = new URL(url, SITE);
  if (parsed.origin !== SITE) return null;
  const relative = decodeURIComponent(parsed.pathname).replace(/^\//, '');
  const file = path.resolve(ROOT, relative || 'index.html');
  assert.ok(file.startsWith(ROOT + path.sep), 'resource must remain inside the site');
  return fs.existsSync(file) && fs.statSync(file).isDirectory() ? path.join(file, 'index.html') : file;
}

function jpegSize(bytes) {
  assert.equal(bytes.readUInt16BE(0), 0xffd8, 'original card must be a JPEG');
  let offset = 2;
  const frames = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  while (offset < bytes.length) {
    assert.equal(bytes[offset], 0xff, 'valid JPEG marker');
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    const length = bytes.readUInt16BE(offset);
    assert.ok(length >= 2 && offset + length <= bytes.length, 'bounded JPEG segment');
    if (frames.has(marker)) return {width:bytes.readUInt16BE(offset + 5), height:bytes.readUInt16BE(offset + 3)};
    offset += length;
  }
  throw new Error('JPEG dimensions are missing');
}

test('Lumina guide copy contains every authored game language without an English fallback', () => {
  assert.deepEqual(Object.keys(source.locales).sort(), LANGUAGES.slice().sort());
  assert.deepEqual([...builder.LANGUAGES], LANGUAGES);
  assert.doesNotThrow(() => builder.validate(source));
  for (const language of LANGUAGES.filter(language => language !== 'en')) {
    const copy = source.locales[language];
    for (const field of ['title', 'description', 'h1', 'playLabel', 'playNote', 'faqTitle']) {
      assert.notEqual(copy[field], source.locales.en[field], language + ': translated ' + field);
    }
    copy.sections.forEach((section, index) => {
      assert.notEqual(section.title, source.locales.en.sections[index].title, language + ': translated heading');
      section.paragraphs.forEach((paragraph, paragraphIndex) => {
        assert.notEqual(paragraph, source.locales.en.sections[index].paragraphs[paragraphIndex], language + ': translated paragraph');
      });
    });
    copy.faqs.forEach((faq, index) => {
      assert.notEqual(faq.question, source.locales.en.faqs[index].question, language + ': translated question');
      assert.notEqual(faq.answer, source.locales.en.faqs[index].answer, language + ': translated answer');
    });
  }
});

for (const language of LANGUAGES) test('Lumina ' + language + ' is a complete static page with reciprocal search metadata', () => {
  const dom = page(language), d = dom.window.document, copy = source.locales[language], canonical = SITE + route(language);
  try {
    assert.equal(d.documentElement.lang, language);
    assert.equal(d.documentElement.dir, language === 'ar' ? 'rtl' : 'ltr');
    assert.equal(d.documentElement.getAttribute('data-lumina-guide-locale'), language);
    assert.equal(d.title, copy.title);
    assert.equal(d.querySelectorAll('h1').length, 1);
    assert.equal(d.querySelector('h1 span').textContent, 'Lumina Match');
    assert.ok(text(d.querySelector('h1')).endsWith(tidy(copy.h1)));
    assert.equal(d.querySelectorAll('link[rel="canonical"]').length, 1);
    assert.equal(d.querySelector('link[rel="canonical"]').href, canonical);
    assert.equal(d.querySelector('meta[property="og:url"]').content, canonical);
    for (const selector of ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) {
      assert.equal(d.querySelector(selector).content, copy.description, selector);
    }
    for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) {
      assert.equal(d.querySelector(selector).content, copy.title, selector);
    }
    assert.equal(d.querySelector('meta[property="og:site_name"]').content, 'MatchApp Ai');
    assert.equal(d.querySelector('meta[property="og:locale"]').content, copy.ogLocale);
    assert.deepEqual([...d.querySelectorAll('meta[property="og:locale:alternate"]')].map(node => node.content).sort(),
      LANGUAGES.filter(code => code !== language).map(code => source.locales[code].ogLocale).sort());
    assert.match(d.querySelector('meta[name="robots"]').content, /\bindex\b/);
    assert.doesNotMatch(d.querySelector('meta[name="robots"]').content, /noindex|nofollow/i);

    const alternates = [...d.querySelectorAll('link[rel="alternate"][hreflang]')];
    assert.equal(alternates.length, LANGUAGES.length + 1);
    assert.deepEqual(Object.fromEntries(alternates.map(node => [node.hreflang, node.href])),
      Object.fromEntries([...LANGUAGES.map(code => [code, SITE + route(code)]), ['x-default', SITE + route('en')]]));
    for (const node of alternates) {
      assert.equal(new URL(node.href).search, '');
      assert.equal(new URL(node.href).hash, '');
      assert.ok(fs.existsSync(localFile(node.href)), 'alternate destination exists: ' + node.href);
    }
    const languageLinks = [...d.querySelectorAll('[data-lumina-language]')];
    assert.equal(languageLinks.length, LANGUAGES.length);
    for (const link of languageLinks) {
      const code = link.getAttribute('data-lumina-language');
      assert.equal(link.getAttribute('href'), route(code) + '#language-' + code);
      assert.equal(link.id, 'language-' + code, 'language choice fragment has a real target');
      assert.equal(text(link), source.locales[code].nativeName);
      assert.equal(link.getAttribute('hreflang'), code);
      assert.equal(link.getAttribute('aria-current'), code === language ? 'page' : null);
    }

    const main = d.querySelector('main');
    assert.ok(main && !main.hidden && !main.closest('[hidden],template,[aria-hidden="true"]'));
    for (const paragraph of copy.intro) assert.ok([...main.querySelectorAll('p')].some(node => text(node) === tidy(paragraph)));
    for (const section of copy.sections) {
      const heading = d.getElementById(section.id), body = heading.closest('section');
      assert.equal(text(heading), tidy(section.title));
      assert.deepEqual([...body.querySelectorAll('p')].map(text), section.paragraphs.map(tidy));
      assert.deepEqual([...body.querySelectorAll('li')].map(text), (section.steps || []).map(tidy));
      assert.equal(body.getAttribute('aria-labelledby'), section.id);
    }
    const faqs = [...d.querySelectorAll('.lumina-guide-faq details')];
    assert.equal(faqs.length, copy.faqs.length);
    faqs.forEach((faq, index) => {
      assert.equal(text(faq.querySelector('summary')), tidy(copy.faqs[index].question));
      assert.equal(text(faq.querySelector('p')), tidy(copy.faqs[index].answer));
    });
    assert.equal(d.querySelector('time').dateTime, source.updated);
    const playLinks = [...d.querySelectorAll('a[data-lumina-play]')];
    assert.equal(playLinks.length, 2);
    for (const link of playLinks) {
      assert.equal(link.getAttribute('href'), '/', 'guide returns to the real Home, without a nonexistent static fragment');
      assert.equal(text(link), copy.playLabel);
    }

    const graph = [...d.querySelectorAll('script[type="application/ld+json"]')].flatMap(script => JSON.parse(script.textContent)['@graph'] || []);
    const web = graph.find(item => item['@type'] === 'WebPage');
    const game = graph.find(item => item['@type'] === 'VideoGame');
    assert.ok(web && game, 'page and game have distinct structured identities');
    assert.equal(web.url, canonical);
    assert.equal(web.inLanguage, language);
    assert.equal(web.name, d.title);
    assert.equal(web.description, copy.description);
    assert.equal(web.datePublished, '2026-10-28');
    assert.equal(web.dateModified, source.updated);
    assert.equal(web.mainEntity['@id'], game['@id']);
    assert.equal(game.name, 'Lumina Match');
    assert.equal(game.url, SITE + '/lumina-match/');
    assert.equal(game.description, copy.description);
    assert.equal(game.gamePlatform, 'Web browser');
    assert.match(game.operatingSystem, /web browser/i);
    assert.deepEqual(game.inLanguage, LANGUAGES);
    assert.deepEqual(game.keywords, copy.keywords);
    assert.equal(game.isAccessibleForFree, true);
    assert.equal(Number(game.offers.price), 0);
    assert.deepEqual(game.numberOfPlayers, {'@type':'QuantitativeValue', minValue:1, maxValue:2});
    assert.deepEqual(game.featureList, copy.sections.map(section => section.paragraphs.join(' ')));
    for (const object of allObjects(graph)) {
      for (const field of ['aggregateRating', 'review', 'ratingValue', 'ratingCount', 'reviewCount', 'downloadUrl', 'installUrl']) {
        assert.equal(Object.hasOwn(object, field), false, 'unsupported ' + field + ' must not be invented');
      }
      assert.doesNotMatch(String(object['@type'] || ''), /Medical|Therapeutic|Drug|MobileApplication/i);
    }
    const breadcrumbs = graph.find(item => item['@type'] === 'BreadcrumbList').itemListElement;
    assert.deepEqual(breadcrumbs.map(item => [item.position, item.item]), [[1, SITE + '/'], [2, canonical]]);

    assert.equal(d.querySelectorAll('iframe,canvas,audio,video,ins.adsbygoogle,[data-ad-slot],[data-ad-client]').length, 0);
    assert.doesNotMatch(dom.serialize(), /adsbygoogle|ca-pub-|googlesyndication|doubleclick\.net|\/ads-(?:init|serve)\.js/i);
    for (const script of d.querySelectorAll('script[src]')) {
      assert.doesNotMatch(script.src, /\/lumina-match\/(?:browser\/|game\.mjs|launcher\.js)/, 'guide must not start the game');
    }
    for (const link of d.querySelectorAll('a[href]')) {
      assert.doesNotMatch(link.href, /\.(?:apk|aab|zip)(?:[?#]|$)|play\.google\.com\/store|apps\.apple\.com/i);
    }
    for (const node of d.querySelectorAll('script[src],img[src],link[href]')) {
      const file = localFile(node.getAttribute('src') || node.getAttribute('href'));
      if (file) assert.ok(fs.existsSync(file), 'public asset or canonical target exists: ' + file);
    }
  } finally { dom.window.close(); }
});

test('published campaign counts and limitations match the actual game instead of health or native-app promises', () => {
  const total = campaign.TOTAL || campaign.levels.length;
  assert.equal(total, 250);
  assert.equal(campaign.levels.at(-1).level, total);
  assert.equal(new Set(campaign.levels.map(level => level.chapter)).size, 10);
  for (let chapter = 1; chapter <= 10; chapter++) assert.equal(campaign.levels.filter(level => level.chapter === chapter).length, 25);
  assert.equal(campaign.config(20).theme, 'grove');
  assert.equal(campaign.config(25).theme, 'ocean');
  assert.equal(campaign.config(100).theme, 'grove');
  assert.equal(campaign.config(200).theme, 'grove');
  const perfect = campaign.finish(campaign.empty(), 1, campaign.config(1).pairs, 0, 0);
  assert.equal(perfect.stars, 3);
  assert.equal(campaign.finish(campaign.empty(), 1, campaign.config(1).pairs, 0, 1).stars, 2);
  for (const [language, copy] of Object.entries(source.locales)) {
    assert.ok(copy.description.includes(String(total)), language + ': correct level count');
    assert.ok(copy.sections.find(section => section.id === 'campaign').paragraphs.join(' ').includes(String(total * perfect.stars)), language + ': correct total stars');
  }
  const english = source.locales.en;
  const body = english.intro.concat(english.sections.flatMap(section => section.paragraphs), english.faqs.map(faq => faq.answer)).join(' ');
  assert.match(body, /registered accounts retain progress/i);
  assert.match(body, /guest progress lasts only while the game stays open/i);
  assert.match(body, /mutually accepted Match Together friend/);
  assert.match(body, /classic friend rounds are separate from your solo 250-level campaign/);
  assert.match(body, /currently no ads inside the game/);
  assert.match(body, /not available inside the native Android app or Kids Mode/);
  assert.match(body, /without installing a game/);
  assert.doesNotMatch(body, /clinically proven|(?:cures?|treats?|prevents?) (?:dementia|disease|Alzheimer)|(?:boosts?|improves?) (?:your )?(?:IQ|cognition)|doctor.recommended/i);
});

test('guide images and social metadata reuse original card bytes with actual intrinsic dimensions', () => {
  const dimensions = new Map();
  for (const name of ART) {
    const bytes = fs.readFileSync(path.join(ROOT, 'lumina-match/browser', name));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), provenance.artwork[name], name + ': original source hash');
    dimensions.set(name, jpegSize(bytes));
  }
  for (const language of LANGUAGES) {
    const dom = page(language), d = dom.window.document;
    try {
      const images = [...d.querySelectorAll('.lumina-guide-art img')];
      assert.equal(images.length, ART.length);
      images.forEach((image, index) => {
        const name = ART[index], actual = dimensions.get(name);
        assert.equal(image.getAttribute('src'), '/lumina-match/browser/' + name);
        assert.equal(Number(image.getAttribute('width')), actual.width);
        assert.equal(Number(image.getAttribute('height')), actual.height);
      });
      assert.equal(d.querySelector('.lumina-guide-art').getAttribute('aria-label'), source.locales[language].imageAlt);
      assert.equal(text(d.querySelector('.lumina-guide-hero figcaption')), source.locales[language].imageCaption);
      assert.equal(d.querySelector('meta[property="og:image"]').content, SITE + '/lumina-match/lumina-gameplay-1200x630.jpg');
      assert.equal(d.querySelector('meta[name="twitter:image"]').content, d.querySelector('meta[property="og:image"]').content);
      assert.equal(Number(d.querySelector('meta[property="og:image:width"]').content), jpegSize(fs.readFileSync(path.join(ROOT,'lumina-match/lumina-gameplay-1200x630.jpg'))).width);
      assert.equal(Number(d.querySelector('meta[property="og:image:height"]').content), jpegSize(fs.readFileSync(path.join(ROOT,'lumina-match/lumina-gameplay-1200x630.jpg'))).height);
      const game = JSON.parse(d.querySelector('script[type="application/ld+json"]').textContent)['@graph'].find(item => item['@type'] === 'VideoGame');
      assert.deepEqual(game.image, ART.map(name => ({'@type':'ImageObject', url:SITE + '/lumina-match/browser/' + name, ...dimensions.get(name)})));
    } finally { dom.window.close(); }
  }
  assert.match(read('lumina-match/guide.css'), /\.lumina-guide-art img\s*\{[^}]*height:auto[^}]*object-fit:contain/);
});

test('Home and Explore expose real crawlable guide links before any script runs', () => {
  for (const file of ['index.html', 'explore.html']) {
    const dom = new JSDOM(read(file));
    try {
      const links = [...dom.window.document.querySelectorAll('a[data-lumina-guide-link]')];
      assert.equal(links.length, 1, file + ': one discovery owner');
      assert.equal(links[0].getAttribute('href'), '/lumina-match/');
      assert.match(text(links[0]), /Lumina Match/);
      assert.equal(links[0].closest('[hidden],template,[aria-hidden="true"]'), null);
      assert.equal(dom.window.document.querySelectorAll('script[src^="/lumina-match/guide.js"]').length, 1);
    } finally { dom.window.close(); }
  }
});

test('the generator-owned sitemap inventory contains exactly all public locales and keeps the game runtime private from search', () => {
  const expected = LANGUAGES.map(language => SITE + route(language));
  assert.deepEqual(JSON.parse(read('tools/lumina-urls.json')), expected);
  const urls = [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.deepEqual(urls.filter(url => new URL(url).pathname.startsWith('/lumina-match/')).sort(), expected.slice().sort());
  assert.equal(new Set(urls).size, urls.length);
  assert.doesNotMatch(read('sitemap.xml'), /\/lumina-match\/browser\//);
  const runtime = new JSDOM(read('lumina-match/browser/index.html'));
  try { assert.match(runtime.window.document.querySelector('meta[name="robots"]').content, /noindex/); }
  finally { runtime.window.close(); }
  assert.match(read('tools/update-sitemap.js'), /readList\('lumina-urls\.json'\)/);
});

function guideRuntime(t, language, {saved = null, hash = '', html} = {}) {
  const dom = new JSDOM(html || read(fileFor(language)), {url:SITE + route(language) + hash, runScripts:'outside-only'});
  t.after(() => dom.window.close());
  const state = new Map(saved ? [['match_lang', saved]] : []), navigation = [], handlers = {};
  const w = {
    localStorage:{getItem:key => state.get(key) || null, setItem:(key, value) => state.set(key, value)},
    location:{hash, replace:value => navigation.push(['replace', value]), assign:value => navigation.push(['assign', value])},
    addEventListener:(type, handler) => { handlers[type] = handler; }
  };
  vm.runInNewContext(read('lumina-match/guide.js'), {window:w, document:dom.window.document});
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  return {dom, d:dom.window.document, w, state, navigation, handlers};
}

test('a fresh guide retains its actual locale and Play carries that deliberate choice to Home', t => {
  for (const language of LANGUAGES) {
    const fixture = guideRuntime(t, language);
    assert.deepEqual(fixture.navigation, [], language + ': no crawler or first-visit locale redirect');
    assert.equal(fixture.w.MATCH_LANG, language);
    const play = fixture.d.querySelector('[data-lumina-play]');
    fixture.d.addEventListener('click', event => event.preventDefault());
    play.dispatchEvent(new fixture.dom.window.MouseEvent('click', {bubbles:true, cancelable:true, button:0}));
    assert.equal(fixture.state.get('match_lang'), language, language + ': explicit Play language');
    assert.equal(play.getAttribute('href'), '/');
  }
});

test('saved preferences and explicit language links work across new-tab visits without changing canonicals', t => {
  const returning = guideRuntime(t, 'en', {saved:'pt-BR'});
  assert.deepEqual(returning.navigation, [['replace', '/lumina-match/pt-br/']]);
  for (const language of LANGUAGES) {
    const explicit = guideRuntime(t, language, {saved:language === 'en' ? 'ar' : 'en', hash:'#language-' + language});
    assert.deepEqual(explicit.navigation, [], language + ': explicit route choice wins');
    assert.equal(explicit.state.get('match_lang'), language);
    assert.equal(explicit.w.MATCH_LANG, language);
    assert.equal(explicit.d.querySelector('link[rel="canonical"]').href, SITE + route(language));
  }
  const home = guideRuntime(t, 'en', {saved:'pt-BR', html:'<html lang="en"><body><a href="/lumina-match/" data-lumina-guide-link>Lumina Match</a></body></html>'});
  assert.equal(home.d.querySelector('a').getAttribute('href'), '/lumina-match/pt-br/');
  home.state.set('match_lang', 'ja');
  home.d.dispatchEvent(new home.dom.window.Event('matchapp:langchange'));
  assert.equal(home.d.querySelector('a').getAttribute('href'), '/lumina-match/ja/');
  assert.deepEqual(home.navigation, []);
});

test('guide generation is deterministic and idempotent in an isolated fixture, matching every committed page', t => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'lumina-seo-'));
  t.after(() => fs.rmSync(temporary, {recursive:true, force:true}));
  fs.mkdirSync(path.join(temporary, 'tools'), {recursive:true});
  fs.mkdirSync(path.join(temporary, 'guides/choose-what-to-watch'), {recursive:true});
  fs.copyFileSync(path.join(ROOT, 'tools/lumina-seo-copy.json'), path.join(temporary, 'tools/lumina-seo-copy.json'));
  fs.copyFileSync(path.join(ROOT, 'guides/choose-what-to-watch/index.html'), path.join(temporary, 'guides/choose-what-to-watch/index.html'));
  const outputs = LANGUAGES.map(fileFor).concat('tools/lumina-urls.json');
  assert.deepEqual(builder.build(temporary).sort(), outputs.slice().sort());
  const fixedTime = new Date('2000-01-01T00:00:00Z');
  for (const file of outputs) {
    assert.equal(fs.readFileSync(path.join(temporary, file), 'utf8'), read(file), file + ': generated bytes are current');
    fs.utimesSync(path.join(temporary, file), fixedTime, fixedTime);
  }
  assert.deepEqual(builder.build(temporary), [], 'a second build is a no-op');
  for (const file of outputs) {
    assert.equal(fs.statSync(path.join(temporary, file)).mtimeMs, fixedTime.getTime(), file + ': no unnecessary rewrite');
    assert.equal(fs.readFileSync(path.join(temporary, file), 'utf8'), read(file));
  }
});

test('incomplete locale copy is rejected before publishing any fixture page', t => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'lumina-seo-invalid-'));
  t.after(() => fs.rmSync(temporary, {recursive:true, force:true}));
  fs.mkdirSync(path.join(temporary, 'tools'), {recursive:true});
  const incomplete = structuredClone(source);
  delete incomplete.locales.ar;
  fs.writeFileSync(path.join(temporary, 'tools/lumina-seo-copy.json'), JSON.stringify(incomplete));
  assert.throws(() => builder.build(temporary), /All 14 authored game-guide locales are required/);
  assert.equal(fs.existsSync(path.join(temporary, 'lumina-match')), false);
  const missingCopy = structuredClone(source);
  missingCopy.locales.zh.sections[0].paragraphs = [''];
  assert.throws(() => builder.validate(missingCopy), /zh: incomplete section how-to-play/);
});
