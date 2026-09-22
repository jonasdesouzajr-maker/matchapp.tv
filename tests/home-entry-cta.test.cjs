const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('Home labels the matching system clearly and removes Pick My Night',()=>{
  const ia=read('matchapp-ia.js');
  const tour=read('onboarding-tour.js');
  assert.match(ia,/match:'🎯 Find My Perfect Match'/);
  assert.match(ia,/ask:'✨ Ask MatchApp Ai'/);
  assert.match(ia,/ma-tab-title/);
  assert.match(ia,/ma-tab-hint/);
  assert.match(ia,/data-ma-intent','match'/);
  assert.match(tour,/Find My Perfect Match/);
  assert.doesNotMatch(ia,/Pick My Night/);
  assert.doesNotMatch(tour,/Pick My Night/);
});

test('Home Match and Ai entry cards are colorful, animated and distinct',()=>{
  const css=read('matchapp-ia.css');
  const pass=css.slice(css.indexOf('2026-09-21 emotional Match/Ai CTA pass'));
  assert.match(pass,/#ma-tab-match\{/);
  assert.match(pass,/#ma-tab-ask\{/);
  assert.match(pass,/linear-gradient\(120deg,#ff5d73/);
  assert.match(pass,/linear-gradient\(120deg,#00cfee/);
  assert.match(pass,/@keyframes maMatchCtaFlow/);
  assert.match(pass,/@keyframes maAskCtaFlow/);
  assert.match(pass,/@keyframes maCtaSweep/);
  assert.match(pass,/\.ma-tab-title\{/);
  assert.match(pass,/\.ma-tab-hint\{/);
});

test('CTA cards adapt to phone and TV and respect reduced motion',()=>{
  const css=read('matchapp-ia.css');
  const pass=css.slice(css.indexOf('2026-09-21 emotional Match/Ai CTA pass'));
  assert.match(pass,/body\.tv-mode\.page-home \.ma-tab\{[\s\S]*min-height:90px!important/);
  assert.match(pass,/@media\(max-width:560px\)[\s\S]*grid-template-columns:1fr!important/);
  assert.match(pass,/@media\(prefers-reduced-motion:reduce\)[\s\S]*animation:none!important/);
  assert.match(pass,/\.ma-tab::after\{display:none!important\}/);
});

test('Home cache-busts both CTA CSS and CTA JavaScript',()=>{
  const html=read('index.html');
  assert.match(html,/\/matchapp-ia\.css\?v=\d{8}-[\w-]+/);
  assert.match(html,/\/matchapp-ia\.js\?v=20260921-cta1/);
});
