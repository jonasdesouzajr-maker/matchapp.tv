'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Home how-it-works fold links to existing original field and mood guides', () => {
  const dom = new JSDOM(read('index.html'));
  const section = dom.window.document.getElementById('how-it-works');
  assert.ok(section);
  const more = section.querySelector('.ma-how-more-guides');
  assert.ok(more);
  const hrefs = [...more.querySelectorAll('a')].map(a => a.getAttribute('href'));
  assert.deepEqual(hrefs, ['/how-it-works.html', '/guides/choose-what-to-watch/']);
  assert.match(more.textContent, /without an account/i);
  // Locked AdSense inventory on Home must remain untouched by this crawlability pass.
  const slots = [...dom.window.document.querySelectorAll('ins.adsbygoogle[data-ad-slot]')];
  assert.equal(slots.length, 5);
  for (const slot of slots) {
    assert.equal(slot.getAttribute('data-ad-client'), 'ca-pub-9541435081010948');
    assert.equal(slot.getAttribute('data-ad-slot'), '2595698117');
  }
  assert.match(read('index.html'), /id="ma-publisher-review-hold"/);
  assert.match(read('index.html'), /pauseAdRequests\s*=\s*1/);
  assert.doesNotMatch(read('index.html'), /pauseAdRequests\s*=\s*(?:0|false)\b/);
  dom.window.close();
});

test('About surfaces the same existing utility guides without inventing pages', () => {
  const html = read('about.html');
  const dom = new JSDOM(html);
  const hrefs = [...dom.window.document.querySelectorAll('a[href]')].map(a => a.getAttribute('href'));
  assert.ok(hrefs.includes('/how-it-works.html'));
  assert.ok(hrefs.includes('/guides/choose-what-to-watch/'));
  assert.ok(hrefs.includes('/founder/'));
  assert.ok(fs.existsSync(path.join(root, 'how-it-works.html')));
  assert.ok(fs.existsSync(path.join(root, 'guides/choose-what-to-watch/index.html')));
  assert.ok(fs.existsSync(path.join(root, 'docs/handoffs/adsense-low-value-assessment-20261106.md')));
  dom.window.close();
});
