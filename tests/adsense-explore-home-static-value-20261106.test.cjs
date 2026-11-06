'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Explore ships a static how-to guide for existing destinations', () => {
  const dom = new JSDOM(read('explore.html'));
  const guide = dom.window.document.querySelector('.ma-explore-static-guide');
  assert.ok(guide);
  const hrefs = [...guide.querySelectorAll('a')].map(a => a.getAttribute('href'));
  for (const needed of ['/', '/ebooks/#ebook-matcher-root', '/cooking/', '/news/', '/events-archive.html', '/music.html', '/discover.html', '/how-it-works.html', '/guides/choose-what-to-watch/', '/tech/', '/lumina-match/']) {
    assert.ok(hrefs.includes(needed), needed);
  }
  assert.ok(dom.window.document.getElementById('explore-topics'));
  assert.ok(dom.window.document.querySelector('.ref-explore-more'));
  assert.match(guide.textContent, /without creating an account/i);
  assert.ok(dom.window.document.querySelector('.ma-explore-lede-extra'));
  assert.equal(dom.window.document.querySelectorAll('ins.adsbygoogle, script[src*="adsbygoogle.js"]').length, 0);
  dom.window.close();
});

test('Home keeps a crawlable static intro and noscript fallback without touching AdSense hold', () => {
  const html = read('index.html');
  const dom = new JSDOM(html);
  const intro = dom.window.document.getElementById('ma-home-static-intro');
  assert.ok(intro);
  assert.deepEqual([...intro.querySelectorAll('a')].map(a => a.getAttribute('href')), ['/explore.html', '/how-it-works.html', '/guides/choose-what-to-watch/', '/guides/what-to-watch-when-you-disagree/']);
  const fallback = dom.window.document.querySelector('noscript .ma-home-static-fallback');
  assert.ok(fallback);
  assert.ok(fallback.querySelector('a[href="/how-it-works.html"]'));
  assert.ok(fallback.querySelector('a[href="/guides/choose-what-to-watch/"]'));
  assert.ok(fallback.querySelector('a[href="/explore.html"]'));
  assert.match(html, /id="ma-publisher-review-hold"/);
  assert.match(html, /pauseAdRequests\s*=\s*1/);
  assert.doesNotMatch(html, /pauseAdRequests\s*=\s*(?:0|false)\b/);
  const slots = [...dom.window.document.querySelectorAll('ins.adsbygoogle[data-ad-slot]')];
  assert.equal(slots.length, 5);
  for (const slot of slots) {
    assert.equal(slot.getAttribute('data-ad-client'), 'ca-pub-9541435081010948');
    assert.equal(slot.getAttribute('data-ad-slot'), '2595698117');
  }
  dom.window.close();
});

test('Tech locales keep the same verified section structure as English (not word-count gated)', () => {
  function ids(file) {
    const dom = new JSDOM(read(file));
    const arts = [...dom.window.document.querySelectorAll('article[id]')];
    const map = Object.fromEntries(arts.map(a => [a.id, a.querySelectorAll('a[href^="http"]').length]));
    dom.window.close();
    return map;
  }
  const en = ids('tech/index.html');
  assert.deepEqual(Object.keys(en).sort(), ['audiobook', 'book', 'podcast', 'press', 'video']);
  for (const locale of ['tech/ja/index.html', 'tech/zh/index.html', 'tech/zh-tw/index.html', 'tech/ko/index.html', 'tech/pt-br/index.html']) {
    const local = ids(locale);
    assert.deepEqual(Object.keys(local).sort(), Object.keys(en).sort(), locale);
    for (const id of Object.keys(en)) assert.ok(local[id] >= 2, `${locale} ${id} keeps external sources`);
  }
});
