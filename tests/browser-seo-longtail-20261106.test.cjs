'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('new disagree-tastes guide is crawlable Article with accurate product links', () => {
  const html = read('guides/what-to-watch-when-you-disagree/index.html');
  assert.match(html, /<title>What to Watch When You Disagree on Genre \| MatchApp Ai<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/matchapp\.tv\/guides\/what-to-watch-when-you-disagree\/">/);
  assert.match(html, /"@type":"Article"/);
  assert.match(html, /href="\/together\.html"/);
  assert.match(html, /href="\/guides\/choose-what-to-watch\/"/);
  assert.doesNotMatch(html, /name="keywords"/);
  assert.doesNotMatch(html, /FAQPage/);
  assert.doesNotMatch(html, /thousands more traffic|guaranteed ranking|#1 on Google/i);
});

test('Together keeps locked title while adding visible shared-night guidance', () => {
  const html = read('together.html');
  const pairTitle = 'Match Together – Movie Picker for Couples | MatchApp Ai';
  assert.ok(html.includes('<title>' + pairTitle + '</title>'));
  assert.match(html, /what should we watch tonight/);
  assert.match(html, /ma-together-seo-guide/);
  assert.match(html, /guides\/what-to-watch-when-you-disagree\//);
  assert.match(html, /content="index,\s*follow/);
});

test('Anime, K-drama and Discover expose product-relevant long-tail prose', () => {
  assert.match(read('anime.html'), /anime-longtail-title/);
  assert.match(read('anime.html'), /Where to watch anime in your country/);
  assert.match(read('collections/k-drama/index.html'), /kdrama-longtail/);
  assert.match(read('collections/k-drama/index.html'), /historical romance/);
  const discover = read('discover.html');
  assert.match(discover, /ma-discover-longtail/);
  assert.match(discover, /where to stream a title/);
  assert.match(discover, /micro-drama finder/);
});

test('internal hubs and sitemap surface the new guide without touching AdSense hold', () => {
  assert.match(read('explore.html'), /guides\/what-to-watch-when-you-disagree\//);
  assert.match(read('index.html'), /guides\/what-to-watch-when-you-disagree\//);
  assert.match(read('index.html'), /ma-publisher-review-hold/);
  assert.match(read('index.html'), /pauseAdRequests = 1/);
  assert.equal((read('index.html').match(/data-ad-slot="2595698117"/g) || []).length, 5);
  assert.match(read('sitemap.xml'), /<loc>https:\/\/matchapp\.tv\/guides\/what-to-watch-when-you-disagree\/<\/loc>/);
  assert.match(read('br/index.html'), /what-to-watch-when-you-disagree/);
});

test('friends stays intentionally noindex (not an SEO target)', () => {
  assert.match(read('friends.html'), /content="noindex,follow"/);
});
