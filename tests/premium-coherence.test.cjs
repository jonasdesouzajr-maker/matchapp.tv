'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

test('premium coherence keeps Home width fluid and first posters visible immediately',()=>{
  const html=read('index.html');
  assert.match(html,/main\.page-wrapper > \.main-layout > \.container \{\s*width: 100% !important;\s*max-width: var\(--measure\) !important;/);
  assert.match(html,/#ai-concierge-section, #ma-ai-entry, #ma-ai-entry #search-box, #ma-concierge/);
  const rail=html.slice(html.indexOf('id="marquee-track"'),html.indexOf('data-loop-copy="1"',html.indexOf('id="marquee-track"')));
  assert.equal((rail.match(/fetchpriority="high"/g)||[]).length,4);
  assert.match(html,/marquee-item \{ width: 106px !important; height: 159px !important; \}/);
  assert.match(html,/marquee-item \{ width: 84px !important; height: 126px !important; \}/);
});

test('Home fold chrome is calm while keeping signature identity and pill geometry',()=>{
  const css=read('home-fold-grid.css');
  assert.match(css,/PREMIUM COHERENCE 2026-10-02/);
  assert.match(css,/color-mix\(in srgb,var\(--ma-fold-a/);
  assert.match(css,/border:1px solid var\(--ma-line-soft\)!important/);
  assert.match(css,/border-radius:999px!important/);
  assert.match(css,/trending-week-label/);
  assert.doesNotMatch(css.slice(css.indexOf('PREMIUM COHERENCE 2026-10-02')),/adsbygoogle|sidebar-ad|ma-together-ad/);
});

test('Home and Discover use one input pill with controls beside it, no outer rounded composer box',()=>{
  const css=read('ai-composer.css');
  const home=css.slice(css.indexOf('2026-10-02 owner correction: one calm Ask AI pill'));
  const discover=css.slice(css.indexOf('DISCOVER COMPOSER COHERENCE 2026-10-02'));
  assert.match(home,/grid-template-areas:"input mic send"/);
  assert.match(home,/\.home-ask-composer\{[\s\S]*?border:0!important;[\s\S]*?background:transparent!important/);
  assert.match(discover,/grid-template-areas:"input mic send" "hint hint hint"/);
  assert.match(discover,/\.newsearch-row\{[\s\S]*?border:0!important;[\s\S]*?background:transparent!important/);
  assert.match(discover,/#discover-new-input\{[\s\S]*?border-radius:25px!important;[\s\S]*?background:#17151d!important/);
  assert.match(read('index.html'),/ai-composer\.css\?v=20261002-premium-coherence1/);
  assert.match(read('discover.html'),/ai-composer\.css\?v=20261002-premium-coherence1/);
});
