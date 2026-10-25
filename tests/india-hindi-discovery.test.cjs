'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '..');

test('India guidance is crawlable Hindi with real public destinations and explicit availability limits', () => {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'guides/worldwide-entertainment-discovery/index.html'), 'utf8'));
  try {
    const doc = dom.window.document;
    const india = [...doc.querySelectorAll('article.route')].find(node => node.querySelector('h3')?.textContent === 'India / भारत');
    assert.ok(india);
    const hindi = [...india.querySelectorAll('p[lang="hi"]')];
    assert.equal(hindi.length, 2);
    assert.match(hindi[0].textContent, /भारत में उपलब्ध होने की पुष्टि नहीं होती/);
    assert.match(hindi[1].textContent, /आधिकारिक आयोजक से जाँचें/);
    assert.match(hindi[1].textContent, /MatchApp Ai एक स्वतंत्र मार्गदर्शिका/);
    assert.match(hindi[1].textContent, /आधिकारिक ऐप या टिकट सेवा नहीं/);
    const link = hindi[1].querySelector('a');
    assert.equal(link.getAttribute('href'), '/events/kota-dussehra-2026/');
    assert.match(link.textContent, /कोटा दशहरा मेला 2026/);
    const target = new JSDOM(fs.readFileSync(path.join(root, 'events/kota-dussehra-2026/index.html'), 'utf8'));
    try {
      assert.equal(target.window.document.querySelector('link[rel="canonical"]').href, 'https://matchapp.tv/events/kota-dussehra-2026/');
      assert.ok(![...target.window.document.querySelectorAll('meta[name="robots"]')].some(node => /noindex/i.test(node.content)));
    } finally { target.window.close(); }
    assert.equal(doc.querySelectorAll('.lang-card').length, 14);
    assert.equal(doc.querySelector('#lang-hi a').getAttribute('href'), '/?lang=hi');
  } finally { dom.window.close(); }
});
