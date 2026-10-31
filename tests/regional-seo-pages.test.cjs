const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');

const root = path.join(__dirname, '..');
const regions = [
  ['au','en-AU'], ['br','pt-BR'], ['us','en-US'],
  ['uk','en-GB'], ['ca','en-CA'], ['jp','ja-JP']
];

test('regional landing pages have canonical and reciprocal hreflang cluster', () => {
  for (const [code, lang] of regions) {
    const html = fs.readFileSync(path.join(root, code, 'index.html'), 'utf8');
    const dom = new JSDOM(html);
    assert.equal(dom.window.document.documentElement.lang, lang);
    assert.ok(dom.window.document.documentElement.classList.contains('ma-reference'));
    dom.window.close();
    assert.ok(html.includes('<link rel="canonical" href="https://matchapp.tv/' + code + '/">'));
    assert.ok(html.includes('hreflang="x-default" href="https://matchapp.tv/guides/worldwide-entertainment-discovery/"'));
    for (const [peer, peerLang] of regions) {
      assert.ok(html.includes('hreflang="' + peerLang + '" href="https://matchapp.tv/' + peer + '/"'));
    }
    assert.ok(html.includes('application/ld+json'));
    assert.ok(html.includes('name="robots" content="index,follow,max-image-preview:large"'));
  }
});

test('worldwide x-default page reciprocates regional hreflang cluster', () => {
  const html = fs.readFileSync(path.join(root, 'guides', 'worldwide-entertainment-discovery', 'index.html'), 'utf8');
  for (const [code, lang] of regions) {
    assert.ok(html.includes('hreflang="' + lang + '" href="https://matchapp.tv/' + code + '/"'));
  }
  assert.ok(html.includes('hreflang="x-default" href="https://matchapp.tv/guides/worldwide-entertainment-discovery/"'));
});

test('regional routes persist in sitemap generator and current sitemap', () => {
  const generator = fs.readFileSync(path.join(root, 'tools', 'update-sitemap.js'), 'utf8');
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  for (const [code] of regions) {
    assert.ok(generator.includes("${SITE}/" + code + "/"));
    assert.ok(sitemap.includes('<loc>https://matchapp.tv/' + code + '/</loc>'));
  }
});

test('country guides link to the local watch directory and exact regional title sections', () => {
  const regionLinks = {
    br: ['/pt/br/watch/'],
    uk: ['/en/gb/watch/', '/where-to-watch/the-gentlemen/#availability-gb', '/where-to-watch/3-idiots/#availability-gb'],
    us: ['/en/us/watch/', '/where-to-watch/the-bear/#availability-us', '/where-to-watch/fallout/#availability-us']
  };
  for (const [region, routes] of Object.entries(regionLinks)) {
    const page = new JSDOM(fs.readFileSync(path.join(root, region, 'index.html'), 'utf8'));
    for (const route of routes) {
      assert.ok(page.window.document.querySelector(`main a[href="${route}"]`), region + ' links to ' + route);
      const [pathname, fragment] = route.split('#');
      const target = new JSDOM(fs.readFileSync(path.join(root, pathname, 'index.html'), 'utf8'));
      assert.equal(target.window.document.querySelector('link[rel="canonical"]').href, 'https://matchapp.tv' + pathname);
      if (fragment) assert.ok(target.window.document.getElementById(fragment), route);
      target.window.close();
    }
    if (region === 'br') assert.ok(page.window.document.querySelector('main a[href="/together.html?lang=pt-BR"]'));
    page.window.close();
  }
});

test('global watch navigation only promotes regional directories emitted by the current build', () => {
  const {buildIndex} = require('../tools/build-watch-pages.js');
  const current = require('../tools/watch-urls.json');
  const routes = ['/pt/br/watch/', '/en/br/watch/', '/en/us/watch/', '/en/gb/watch/', '/en/pt/watch/'];
  const navLinks = html => {
    const dom = new JSDOM(html);
    const links = [...dom.window.document.querySelectorAll('nav[aria-labelledby="watch-by-country"] a')]
      .map(a => a.getAttribute('href'));
    dom.window.close();
    return links;
  };
  const available = routes.filter(route => current.includes('https://matchapp.tv' + route));
  assert.deepEqual(navLinks(buildIndex([], current)), available);
  assert.deepEqual(navLinks(fs.readFileSync(path.join(root, 'where-to-watch/index.html'), 'utf8')), available);
  assert.deepEqual(navLinks(buildIndex([], ['https://matchapp.tv/en/gb/watch/'])), ['/en/gb/watch/']);
  assert.deepEqual(navLinks(buildIndex([])), []);
});
