'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM} = require('jsdom');
const {validateEditorial} = require('../tools/discovery-editorial.cjs');
const {hasConfirmedOffer} = require('../tools/availability-page-policy.cjs');
const copy = require('../tools/discovery-editorial.json');

test('new catalog facets cannot publish without original selection guidance', () => {
  validateEditorial(Object.keys(copy));
  assert.throws(() => validateEditorial(['collections/unauthored-facet']), /Missing original/);
  const paths = require('../tools/seo-urls.json').map(u => new URL(u).pathname.replace(/^\//, '').replace(/\/$/, ''));
  assert.equal(paths.length, Object.keys(copy).length);
  for (const key of paths) {
    const dom = new JSDOM(fs.readFileSync(key + '/index.html', 'utf8'));
    const d = dom.window.document;
    assert.equal(d.querySelectorAll('.seo-editorial').length, 1, key);
    for (const p of copy[key].paragraphs) assert.ok(d.querySelector('.seo-editorial').textContent.includes(p), key);
    assert.equal(d.querySelectorAll('.seo-title-link').length, d.querySelectorAll('.seo-item').length, key);
    for (const item of d.querySelectorAll('.seo-item')) {
      const title = item.querySelector('h3').childNodes[0].textContent.trim();
      assert.equal(new URL(item.querySelector('a').href, 'https://matchapp.tv').searchParams.get('title'), title);
    }
    assert.doesNotMatch(d.querySelector('.seo-hero').textContent, /kept current/);
    assert.match(d.querySelector('section[aria-label="Recommended titles"]').textContent, /not a confirmed offer/);
    dom.window.close();
  }
});

test('empty offers stay accessible but outside search until real providers exist', () => {
  for (const value of [undefined, {}, {regions:{BR:{}}}, {regions:{BR:{stream:[]}}}, {regions:{BR:{stream:['  ']}}}, {regions:{BR:{stream:'Netflix'}}}]) {
    assert.equal(hasConfirmedOffer(value), false);
  }
  for (const kind of ['stream','rent','buy']) assert.equal(hasConfirmedOffer({regions:{BR:{[kind]:['Verified provider']}}}), true);
  const {titles} = require('../data/availability.json');
  const manifest = new Set(require('../tools/watch-urls.json'));
  const sitemap = fs.readFileSync('sitemap.xml','utf8');
  const slug = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  for (const [title, record] of Object.entries(titles)) {
    const url = 'https://matchapp.tv/where-to-watch/' + slug(title) + '/';
    const html = fs.readFileSync('where-to-watch/' + slug(title) + '/index.html','utf8');
    const robots = html.match(/<meta name="robots" content="([^"]+)/)?.[1];
    assert.equal(/noindex/.test(robots), !hasConfirmedOffer(record), title);
    assert.equal(manifest.has(url), hasConfirmedOffer(record), title);
    assert.equal(sitemap.includes('<loc>'+url+'</loc>'), hasConfirmedOffer(record), title);
  }
});

test('every current event guide retains its original planning notes in generator-owned data', () => {
  for (const e of require('../tools/global-events.json')) {
    assert.equal(e.visitorNotes?.length, 3, e.slug);
    const dom = new JSDOM(fs.readFileSync('events/'+e.slug+'/index.html','utf8'));
    for (const note of e.visitorNotes) assert.ok(dom.window.document.body.textContent.includes(note), e.slug);
    dom.window.close();
  }
});

test('desktop install pages are useful without JavaScript and do not promise unpublished downloads', () => {
  for (const os of ['macos','windows']) {
    const dom = new JSDOM(fs.readFileSync('desktop/'+os+'.html','utf8'));
    const d = dom.window.document;
    assert.ok(d.querySelector('#install-guide'));
    assert.ok(d.querySelector('a[href="/contact.html"]'));
    assert.ok(d.querySelector('a[href="/privacy.html"]'));
    assert.match(d.querySelector('#status').textContent, /browser now/);
    assert.ok(d.querySelector('#file').hidden);
    assert.equal(dom.window.getComputedStyle(d.querySelector('#file')).display, 'none');
    dom.window.close();
  }
});
