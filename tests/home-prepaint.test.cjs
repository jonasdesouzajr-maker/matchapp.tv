'use strict';

// Home presentation remains stable across parser-time and deferred initialization.
// Optional source paths support isolated candidate verification.
// Geometry is supplied at the browser API boundary: these tests cover ordering,
// lifecycle and responsive measurements, while browser QA measures actual CLS.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require(process.env.MATCHAPP_PREPAINT_JSDOM || 'jsdom');
const source = fs.readFileSync(process.env.MATCHAPP_PREPAINT_RUNTIME ||
  path.join(__dirname, '..', 'patches', 'reference-system.js'), 'utf8');
const architecture = fs.readFileSync(process.env.MATCHAPP_PREPAINT_IA ||
  path.join(__dirname, '..', 'matchapp-ia.js'), 'utf8');

const HEADER = `
<header id="mh-topbox" class="app-header"><div class="mh-deck">
  <button id="existing-account" type="button">Account</button>
</div></header>`;
const HOME = `
<main class="page-wrapper"><div class="main-layout">
  <aside class="sidebar-ad-left"><ins class="adsbygoogle" style="display:block;min-height:600px" data-ad-slot="left-fixture"></ins></aside>
  <aside class="sidebar-ad-right"><ins class="adsbygoogle" style="display:block;min-height:600px" data-ad-slot="right-fixture"></ins></aside>
  <section class="container">
    <header class="home-hero"><h1 class="home-h1">What should you watch?</h1></header>
    <div id="trending-rail"><div class="marquee-item"><img alt="Original work" data-title="Original work" src="/original-poster.jpg"></div></div>
    <article id="questionnaire-box">
      <h2 data-i18n="q.heading">Find a match</h2>
      <div class="q-grid--primary">
        <div><label>Format</label><select id="q-category"><option selected value="movie">Movie</option></select></div>
        <div><label>Platform</label><select id="q-platform"><option selected value="Netflix">Netflix</option></select></div>
        <div><label>Mood</label><select id="q-mood"><option selected value="curious">Curious</option></select></div>
      </div>
      <details class="match-more-filters"><summary>More filters</summary><input id="existing-input" value="Keep my text"></details>
      <button id="existing-match" class="gold-btn" type="button" data-i18n="q.submit">Find my match</button>
    </article>
    <article id="search-box"><h2>Ask</h2><input id="specific-search-input"><button class="gold-btn" type="button">Send</button></article>
    <article id="loading-box" hidden></article>
    <article id="result-box" hidden></article>
    <section id="ebook-matcher-root" hidden></section>
    <section id="cooking-home" hidden></section>
    <section id="global-events" hidden></section>
    <section id="how-it-works" hidden></section>
    <section id="ai-concierge-section" hidden></section>
  </section>
</div></main>`;

function scene({ hash = '', phone = false } = {}) {
  const dom = new JSDOM('<!doctype html><html lang="en"><head><script data-cinema-motion></script><script data-cinema-density></script></head><body class="page-home"></body></html>', {
    url: 'https://matchapp.tv/' + hash,
    runScripts: 'outside-only',
    pretendToBeVisual: true
  });
  const w = dom.window, d = w.document;
  let ready = 'loading', nextFrame = 1;
  const frames = new Map(), observers = [], scrolls = [], storageWrites = [], errors = [];
  const geometry = phone
    ? { display: 'block', columns: 'none', gap: '0px', padding: '0px', left: 0, innerLeft: 14, viewport: 390 }
    : { display: 'grid', columns: '180px 980px 180px', gap: '16px', padding: '0px', left: 34, innerLeft: 270, viewport: 1440 };
  Object.defineProperty(d, 'readyState', { get: () => ready });
  Object.defineProperty(d.documentElement, 'clientWidth', { get: () => geometry.viewport });
  const realComputedStyle = w.getComputedStyle.bind(w);
  w.getComputedStyle = element => element?.classList.contains('main-layout') ? {
    display: geometry.display, gridTemplateColumns: geometry.columns,
    columnGap: geometry.gap, paddingLeft: geometry.padding
  } : realComputedStyle(element);
  w.requestAnimationFrame = callback => { const id = nextFrame++; frames.set(id, callback); return id; };
  w.cancelAnimationFrame = id => frames.delete(id);
  w.ResizeObserver = class {
    constructor(callback) { this.callback = callback; this.targets = []; this.disconnected = false; observers.push(this); }
    observe(target) { this.targets.push(target); }
    disconnect() { this.disconnected = true; }
  };
  // Other presentation owners stay external; no network or application engine
  // is loaded, replaced or invoked by this fixture.
  w.MatchAppActivatedScroll = { toStart: (...args) => { scrolls.push(args); return true; } };
  w.MatchAppReferenceHeader = { mount() {} };
  w.MatchAppReferenceDock = {};
  w.MatchAppTextPills = {};
  w.MatchAppDialogs = {};
  w.matchMedia = () => ({ matches: false, addEventListener() {} });
  w.fetch = () => { throw new Error('Presentation initialization must not fetch'); };
  const originalSet = w.Storage.prototype.setItem;
  w.Storage.prototype.setItem = function (key, value) { storageWrites.push(key); return originalSet.call(this, key, value); };
  w.addEventListener('error', event => { errors.push(event.error || event.message); event.preventDefault(); });

  function appendHome() {
    d.body.insertAdjacentHTML('beforeend', HEADER);
    w.MatchCinemaShell.prepareHeader(); // The existing inline hook precedes main.
    d.body.insertAdjacentHTML('beforeend', HOME);
    const layout = d.querySelector('.main-layout'), content = layout.querySelector(':scope > .container');
    layout.getBoundingClientRect = () => ({ left: geometry.left });
    content.getBoundingClientRect = () => ({ left: geometry.innerLeft });
    return { layout, content };
  }
  function flushFrames() {
    let turns = 0;
    while (frames.size) {
      assert.ok(++turns < 20, 'animation-frame work must settle');
      const batch = [...frames.values()]; frames.clear();
      batch.forEach(callback => callback(0));
    }
    assert.deepEqual(errors, [], 'no event handler errors');
  }
  function domContentLoaded() {
    ready = 'interactive';
    d.dispatchEvent(new w.Event('DOMContentLoaded'));
    assert.deepEqual(errors, [], 'DOMContentLoaded must not throw');
  }
  function addLazyFold() {
    let concierge = d.getElementById('ma-concierge');
    if (!concierge) {
      concierge = d.createElement('section'); concierge.id = 'ma-concierge';
      const form = d.getElementById('questionnaire-box'); form.before(concierge); concierge.append(form);
    }
    const toggle = d.createElement('button'); toggle.className = 'lazy-head'; toggle.dataset.foldKey = 'concierge';
    let clicks = 0;
    toggle.addEventListener('click', () => { clicks++; concierge.classList.add('lazy-open'); });
    concierge.before(toggle);
    return () => clicks;
  }
  return {
    w, d, geometry, frames, observers, scrolls, storageWrites, errors,
    appendHome, flushFrames, domContentLoaded, addLazyFold,
    load: () => w.eval(source),
    loadArchitecture: () => { ready = 'interactive'; w.eval(architecture); },
    close: () => w.close()
  };
}

function assertPrepared(f, expectedWidth = '980px', expectedOffset = '-40px') {
  const d = f.d, content = d.querySelector('.main-layout > .container');
  assert.equal(content.style.getPropertyValue('--home-grid-width'), expectedWidth);
  assert.equal(content.style.getPropertyValue('--home-grid-offset'), expectedOffset);
  assert.equal(d.querySelectorAll('.ma-cinema-section-heading').length, 1);
  assert.equal(d.getElementById('trending-rail').previousElementSibling.className, 'ma-cinema-section-heading');
  assert.equal(d.querySelectorAll('.ma-cinema-hero-action').length, 1);
  assert.equal(d.querySelectorAll('.ma-cinema-hero-footer').length, 1);
  assert.equal(d.querySelector('.ma-cinema-hero-action').parentElement.className, 'ma-cinema-hero-footer');
  assert.equal(d.querySelectorAll('.ma-cinema-help').length, 1);
  assert.equal(f.observers.length, 1, 'one grid observer across all initialization paths');
  assert.deepEqual(f.observers[0].targets, [d.querySelector('.main-layout')]);
}

test('parser-time preparation is synchronous and DCL keeps the same nodes, grid observer and late lifecycle', () => {
  const f = scene({ hash: '#questionnaire-box' });
  try {
    f.load();
    assert.equal(typeof f.w.MatchCinemaShell.prepareContent, 'function');
    f.w.MatchCinemaShell.prepareContent(); // Safe before the parser reaches main.
    assert.equal(f.observers.length, 0);
    f.appendHome();
    const form = f.d.getElementById('questionnaire-box'), input = f.d.getElementById('existing-input');
    const button = f.d.getElementById('existing-match'), select = f.d.getElementById('q-mood');
    const ads = [...f.d.querySelectorAll('.adsbygoogle')].map(node => [node, node.outerHTML]);
    let matches = 0; button.addEventListener('click', () => matches++);
    f.w.MatchCinemaShell.prepareContent();
    assert.equal(f.d.readyState, 'loading');
    assertPrepared(f);
    const heading = f.d.querySelector('.ma-cinema-section-heading'), action = f.d.querySelector('.ma-cinema-hero-action');
    assert.equal(heading.querySelector('h2').textContent, 'Top Titles');
    assert.equal(f.d.querySelector('.ma-cinema-dock'), null, 'early presentation must not consume the DCL mount');
    assert.equal(f.scrolls.length, 0, 'hash scrolling belongs to the later lifecycle');
    const lazyClicks = f.addLazyFold();
    f.w.MatchCinemaShell.prepareContent();
    assert.equal(lazyClicks(), 0, 'early presentation must not open a lazy section');
    f.domContentLoaded(); f.flushFrames();
    f.w.MatchCinemaShell.prepareContent();
    assertPrepared(f);
    assert.equal(f.d.querySelector('.ma-cinema-section-heading'), heading);
    assert.equal(f.d.querySelector('.ma-cinema-hero-action'), action);
    assert.equal(f.d.querySelectorAll('.ma-cinema-dock').length, 1);
    assert.equal(lazyClicks(), 1, 'the existing late openMatch path remains active');
    assert.ok(f.scrolls.length > 0, 'the existing hash target still reaches the scroll owner');
    assert.equal(f.d.getElementById('questionnaire-box'), form);
    assert.equal(f.d.getElementById('existing-input'), input); assert.equal(input.value, 'Keep my text');
    assert.equal(f.d.getElementById('q-mood'), select); assert.equal(select.value, 'curious');
    assert.equal(f.d.getElementById('existing-match'), button); button.click(); assert.equal(matches, 1);
    ads.forEach(([node, html]) => { assert.ok(node.isConnected); assert.equal(node.outerHTML, html); });
    assert.deepEqual(f.storageWrites, [], 'presentation does not persist user state');
  } finally { f.close(); }
});

test('the real Home section initializer keeps an already prepared heading with its rail before DCL', () => {
  const f = scene();
  try {
    f.load(); f.appendHome(); f.w.MatchCinemaShell.prepareContent();
    const heading = f.d.querySelector('.ma-cinema-section-heading'), rail = f.d.getElementById('trending-rail');
    const hero = f.d.querySelector('.home-hero'), action = f.d.querySelector('.ma-cinema-hero-action');
    const form = f.d.getElementById('questionnaire-box'), button = f.d.getElementById('existing-match');
    const ads = [...f.d.querySelectorAll('.adsbygoogle')].map(node => [node, node.outerHTML]);
    // Defer scripts execute after parsing with readyState=interactive, before
    // the shared shell's DOMContentLoaded listener. Run the actual owner.
    f.loadArchitecture();
    assert.ok(f.d.getElementById('ma-concierge'), 'the actual IA mount ran');
    assert.equal(heading.previousElementSibling, hero);
    assert.equal(heading.nextElementSibling, rail, 'IA must move the existing heading and rail as one group');
    assert.equal(f.d.getElementById('questionnaire-box'), form);
    assert.equal(f.d.getElementById('existing-match'), button);
    assert.equal(f.d.querySelector('.ma-cinema-hero-action'), action);
    ads.forEach(([node, html]) => { assert.ok(node.isConnected); assert.equal(node.outerHTML, html); });
    f.domContentLoaded(); f.flushFrames(); assertPrepared(f);
    assert.equal(f.d.querySelector('.ma-cinema-section-heading'), heading);
  } finally { f.close(); }
});

test('repeated preparation repairs a displaced existing heading without recreating content or observers', () => {
  const f = scene();
  try {
    f.load(); const { content } = f.appendHome(); f.w.MatchCinemaShell.prepareContent();
    const heading = f.d.querySelector('.ma-cinema-section-heading'), action = f.d.querySelector('.ma-cinema-hero-action');
    content.append(heading); // A legacy section reorder leaves unknown nodes last.
    assert.notEqual(f.d.getElementById('trending-rail').previousElementSibling, heading);
    f.w.MatchCinemaShell.prepareContent(); f.w.MatchCinemaShell.prepareContent();
    assertPrepared(f);
    assert.equal(f.d.querySelector('.ma-cinema-section-heading'), heading);
    assert.equal(f.d.querySelector('.ma-cinema-hero-action'), action);
  } finally { f.close(); }
});

test('DOMContentLoaded still prepares Home when its parser-time hook was not invoked', () => {
  const f = scene({ phone: true });
  try {
    f.load(); const { content } = f.appendHome();
    assert.equal(content.style.getPropertyValue('--home-grid-width'), '');
    assert.equal(f.d.querySelector('.ma-cinema-section-heading'), null);
    f.domContentLoaded(); f.flushFrames();
    assertPrepared(f, '390px', '-14px');
    assert.equal(f.d.querySelectorAll('.ma-cinema-dock').length, 1);
  } finally { f.close(); }
});

test('the single early grid observer continues to measure phone resizing and is cleaned up on pagehide', () => {
  const f = scene();
  try {
    f.load(); f.appendHome(); f.w.MatchCinemaShell.prepareContent();
    f.w.MatchCinemaShell.prepareContent();
    Object.assign(f.geometry, { display: 'block', columns: 'none', gap: '0px', padding: '0px', left: 0, innerLeft: 14, viewport: 390 });
    f.observers[0].callback(); f.w.dispatchEvent(new f.w.Event('resize')); f.observers[0].callback();
    assert.equal(f.frames.size, 1, 'resize sources share one queued measurement');
    f.flushFrames(); assertPrepared(f, '390px', '-14px');
    Object.assign(f.geometry, { viewport: 844, innerLeft: 20 });
    f.observers[0].callback(); f.flushFrames(); assertPrepared(f, '844px', '-20px');
    f.observers[0].callback(); assert.equal(f.frames.size, 1);
    f.w.dispatchEvent(new f.w.Event('pagehide'));
    assert.equal(f.frames.size, 0, 'pagehide cancels the pending grid frame');
    assert.equal(f.observers[0].disconnected, true);
  } finally { f.close(); }
});
