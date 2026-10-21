'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'how-it-works.html'), 'utf8');
const source = fs.readFileSync(path.join(root, 'patches/premium-journey-20261014.js'), 'utf8');
const locales = ['en', 'pt-BR', 'es', 'fr', 'de', 'it', 'tr', 'ru', 'ar', 'hi', 'id', 'ja', 'ko', 'zh'];
const expectedRoutes = [
  '/', '/#trending-rail', '/#questionnaire-box', '/', '/#premiere-disclosure',
  '/discover.html', '/explore.html', '/music.html', '/ebooks/#ebook-matcher-root',
  '/cooking/', '/news/', '/together.html', '/profile/profile.html', '/',
];
const expectedScripts = {
  ru: /\p{Script=Cyrillic}/u,
  ar: /\p{Script=Arabic}/u,
  hi: /\p{Script=Devanagari}/u,
  ja: /[\p{Script=Hiragana}\p{Script=Katakana}]/u,
  ko: /\p{Script=Hangul}/u,
  zh: /\p{Script=Han}/u,
};

test('all fourteen guide languages explain every chapter in the selected language and preserve destinations', () => {
  const dom = new JSDOM(html, { url: 'https://matchapp.tv/how-it-works.html#chapter-6', runScripts: 'outside-only' });
  const { window } = dom;
  const { document } = window;
  const chapters = [...document.querySelectorAll('.journey-chapter')];
  const originalEnglish = chapters.map(chapter => chapter.querySelector('[data-guide-explain]').textContent);
  const relatedRoutes = [...document.querySelectorAll('[data-guide-related]')].map(link => link.getAttribute('href'));
  const copies = new Map();
  window.localStorage.setItem('match_lang', 'en');
  window.eval(source);

  try {
    for (const locale of locales) {
      window.localStorage.setItem('match_lang', locale);
      document.dispatchEvent(new window.CustomEvent('matchapp:langchange'));

      assert.equal(document.documentElement.lang, locale);
      assert.equal(document.documentElement.dir, locale === 'ar' ? 'rtl' : 'ltr');
      assert.equal(document.querySelector('.journey-chapter.is-active').id, 'chapter-6');
      assert.equal(window.location.hash, '#chapter-6');
      assert.equal(document.querySelectorAll('.journey-chapter:not([hidden])').length, 1);
      assert.equal(document.querySelector('#journey-position').textContent, '06 / 14');
      assert.equal(document.querySelector('#journey-sound').getAttribute('aria-pressed'), 'false');

      const explanations = [];
      chapters.forEach((chapter, index) => {
        const explanation = chapter.querySelector('[data-guide-explain]');
        const title = chapter.querySelector('[data-guide-title]').textContent;
        const copy = explanation.textContent.trim();
        assert.equal(chapter.id, `chapter-${index + 1}`);
        assert.equal(chapter.querySelector('.journey-visit').getAttribute('href'), expectedRoutes[index]);
        assert.equal(explanation.lang, locale, `${locale}, chapter ${index + 1}: wrong speech language`);
        assert.ok(copy.length > 30, `${locale}, chapter ${index + 1}: explanation missing`);
        assert.notEqual(copy, title, `${locale}, chapter ${index + 1}: title is not an explanation`);
        assert.doesNotMatch(copy, /undefined|\[object Object\]|TODO|TBD|\uFFFD/, `${locale}, chapter ${index + 1}: invalid copy`);
        if (locale === 'en') assert.equal(copy, originalEnglish[index]);
        else assert.notEqual(copy, originalEnglish[index], `${locale}, chapter ${index + 1}: English fallback`);
        if (expectedScripts[locale]) assert.match(copy, expectedScripts[locale], `${locale}, chapter ${index + 1}: wrong script`);
        assert.equal(chapter.querySelector('[data-guide-note]').hidden, locale !== 'en');
        assert.equal(document.querySelector(`[data-guide-goto="${index}"] .journey-nav-text`).textContent, title);
        explanations.push(copy);
      });

      assert.equal(new Set(explanations).size, 14, `${locale}: repeated explanation`);
      assert.deepEqual([...document.querySelectorAll('[data-guide-related]')].map(link => link.getAttribute('href')), relatedRoutes);
      const fingerprint = explanations.join('\n');
      assert.ok(!copies.has(fingerprint), `${locale}: content reused from ${copies.get(fingerprint)}`);
      copies.set(fingerprint, locale);
    }

    window.localStorage.setItem('match_lang', 'en');
    document.dispatchEvent(new window.CustomEvent('matchapp:langchange'));
    assert.deepEqual(chapters.map(chapter => chapter.querySelector('[data-guide-explain]').textContent), originalEnglish);
    assert.equal(document.querySelector('.journey-chapter.is-active').id, 'chapter-6');
  } finally {
    window.close();
  }
});

test('newly localized explanations keep the exact product and shared-match names', () => {
  const dom = new JSDOM(html, { url: 'https://matchapp.tv/how-it-works.html', runScripts: 'outside-only' });
  const { window } = dom;
  window.eval(source);
  try {
    for (const locale of locales.slice(3)) {
      window.localStorage.setItem('match_lang', locale);
      window.dispatchEvent(new window.StorageEvent('storage', { key: 'match_lang' }));
      assert.match(window.document.querySelector('#chapter-1 [data-guide-explain]').textContent, /MatchApp Ai/, locale);
      assert.match(window.document.querySelector('#chapter-12 [data-guide-explain]').textContent, /Match Together/, locale);
    }
  } finally {
    window.close();
  }
});
