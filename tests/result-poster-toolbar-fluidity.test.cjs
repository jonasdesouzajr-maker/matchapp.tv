'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('adult match reserves a full poster above the facts, with isolated quota and dismiss controls', () => {
  const html = read('index.html');
  const doc = new JSDOM(html).window.document;
  const result = doc.querySelector('#result-box');
  const toolbar = result.querySelector('.match-result-toolbar');
  const media = result.querySelector('.res-media-row');
  assert.ok(toolbar && media && toolbar.compareDocumentPosition(media) & 4,
    'controls must precede the poster');
  assert.equal(result.querySelectorAll('#result-dismiss').length, 1);
  assert.equal(result.querySelectorAll('#res-poster-img').length, 1);
  assert.ok(toolbar.querySelector('#result-quota-corner'));
  assert.ok(toolbar.querySelector('#result-dismiss'));
  assert.ok(!media.querySelector('#result-dismiss'), 'dismiss may never cover image controls');
  assert.equal(media.querySelector('#res-poster-img').getAttribute('loading'), 'eager');
  assert.match(html, /match-result-stability\.css\?v=20260927-mobile1/);
  assert.match(html, /app\.js\?v=20260926-catalogscale1&amp;poster=20260927-mobile1/);
});

test('scoped CSS reserves original cover size on phones without cropping or extra poster animations', () => {
  const css = read('match-result-stability.css');
  assert.match(css, /\.match-result-toolbar \.result-dismiss\s*\{[^}]*position: relative !important/);
  assert.match(css, /main\.page-wrapper #result-box \.res-media-row\s*\{[^}]*padding: 0 !important/);
  assert.match(css, /#result-box \.res-poster-col \.poster-stage\s*\{[^}]*aspect-ratio: 2 \/ 3 !important/);
  assert.match(css, /#result-box \.res-poster-col img#res-poster-img\s*\{[^}]*display: block !important;[^}]*visibility: visible !important;[^}]*opacity: 1 !important/);
  assert.match(css, /object-fit: contain !important/);
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test('match paints a title-labelled image before revealing and scrolling, without layout thrash', () => {
  const app = read('app.js');
  const start = app.indexOf('async function renderResult(');
  const end = app.indexOf('rememberShownTitle(selected.title);', start);
  assert.ok(start > 0 && end > start);
  const reveal = app.slice(start, end);
  const firstPaint = reveal.indexOf('firstPoster.src = firstCover;');
  const show = reveal.indexOf("resultBox.style.display = 'block';");
  const scroll = reveal.indexOf('scrollIntoView(');
  assert.ok(firstPaint > 0 && show > firstPaint && scroll > show,
    'cover must be assigned before reveal and its reserved-layout scroll');
  assert.doesNotMatch(reveal, /offsetWidth|offsetHeight/, 'do not force a synchronous layout');
  assert.match(reveal, /requestAnimationFrame\(\(\) => requestAnimationFrame/);
  // No Kids mode implementation, matching criteria or live poster recovery changed.
  assert.match(app, /void getCuratedPoster\(selected.title\)\.then\(url =>/);
});
