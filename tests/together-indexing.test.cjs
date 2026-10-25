'use strict';

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const ROOT = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'growth-bootstrap.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'together.html'), 'utf8');
const staticRobots = html.match(/<meta name="robots"[^>]*>/)[0];
const KEY = 'matchapp_growth_context_v1';

function visit(t, suffix = '', {state, late = true, blockedWrites = false} = {}) {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'https://matchapp.tv/together.html' + suffix, runScripts: 'outside-only'
  });
  t.after(() => dom.window.close());
  const w = dom.window;
  if (state) w.sessionStorage.setItem(KEY, JSON.stringify(state));
  if (blockedWrites) Object.defineProperty(w, 'sessionStorage', {value: {
    getItem: () => null, setItem: () => { throw Error('storage unavailable'); }, removeItem: () => {}
  }});
  if (!late) w.document.head.insertAdjacentHTML('beforeend', staticRobots);
  w.eval(source);
  // Production runs bootstrap before the static index/follow tag is parsed.
  if (late) w.document.head.insertAdjacentHTML('beforeend', staticRobots);
  return w;
}
const directives = w => [...w.document.querySelectorAll('meta[name="robots"]')].map(n => n.content);
const privatePage = w => assert.ok(directives(w).some(value => /\bnoindex\b/.test(value)));
const publicPage = w => { assert.equal(directives(w).length, 1); assert.match(directives(w)[0], /\bindex\b/); assert.doesNotMatch(directives(w)[0], /noindex/); };

test('clean public Together stays indexable before and after static metadata parsing', t => {
  for (const late of [true, false]) for (const suffix of ['', '?country=BR&lang=pt-BR', '#how-it-works', '?new=1']) {
    const w = visit(t, suffix, {late});
    publicPage(w);
    assert.equal(w.document.documentElement.dataset.growthMode, 'quick');
    assert.equal(w.MatchAppGrowthContext.state, null);
  }
});

test('valid and malformed reserved fragments remain private and are stripped before other scripts', t => {
  for (const key of ['invite', 'resume']) for (const token of ['a'.repeat(64), '', 'bad', 'A'.repeat(64), '%']) {
    const w = visit(t, '#' + key + '=' + token);
    privatePage(w);
    assert.equal(w.location.hash, '');
    assert.equal(w.MatchAppGrowthContext.invalid, token !== 'a'.repeat(64));
    if (!w.MatchAppGrowthContext.invalid) assert.equal(w.MatchAppGrowthContext.state.token, token);
  }
});

test('restored private sessions and reset invitation URLs cannot become indexable', t => {
  for (const kind of ['host', 'invite', 'resume']) {
    const state = {kind, token: 'b'.repeat(64), expiresAt: Date.now() + 60000};
    privatePage(visit(t, '', {state}));
    const reset = visit(t, '?new=1', {state});
    privatePage(reset);
    assert.equal(reset.MatchAppGrowthContext.state, null);
  }
  privatePage(visit(t, '?new=1#invite=invalid'));
  publicPage(visit(t, '', {state: {kind: 'host', expiresAt: 1}}));
});

test('mistyped capability locations stay private without becoming valid invitations', t => {
  for (const suffix of ['?invite=bad', '?resume=', '#Invite=bad', '#RESUME=bad', '?MODE=classic&CODE=bad']) {
    const w = visit(t, suffix);
    privatePage(w);
    assert.equal(w.MatchAppGrowthContext.state, null);
  }
});

test('starting or restoring a private flow protects the current document even if storage fails', t => {
  for (const blockedWrites of [false, true]) {
    const w = visit(t, '', {blockedWrites});
    publicPage(w);
    const state = {kind: 'host', prefs: {country: 'BR'}, expiresAt: Date.now() + 60000};
    assert.equal(w.MatchAppGrowthContext.store(state), !blockedWrites);
    privatePage(w);
  }
  privatePage(visit(t, '#resume=' + 'c'.repeat(64), {blockedWrites: true}));
});

test('private same-document navigation and page restoration keep noindex sticky', t => {
  for (const [event, suffix] of [['hashchange', '#invite=invalid'], ['popstate', '?s=ABCDEF'], ['popstate', '?code=bad'], ['pageshow', '#resume=bad']]) {
    const w = visit(t);
    publicPage(w);
    w.history.replaceState(null, '', '/together.html' + suffix);
    w.dispatchEvent(new w.Event(event));
    privatePage(w);
    w.history.replaceState(null, '', '/together.html');
    w.dispatchEvent(new w.Event('popstate'));
    privatePage(w);
  }
  const restored = visit(t);
  restored.sessionStorage.setItem(KEY, JSON.stringify({kind: 'host', expiresAt: Date.now() + 60000}));
  restored.dispatchEvent(new restored.Event('pageshow'));
  privatePage(restored);
});

test('classic private links retain their existing flow and stay out of the index', t => {
  for (const suffix of ['?s=ABCDEF', '?code=bad', '?mode=classic']) {
    const w = visit(t, suffix);
    privatePage(w);
    assert.equal(w.MatchAppGrowthContext.classic, true);
    assert.equal(w.document.documentElement.dataset.growthMode, undefined);
  }
});

test('public metadata and sitemap retain the canonical Together landing page', () => {
  assert.match(staticRobots, /content="index,\s*follow(?:,|")/);
  assert.match(html, /<link rel="canonical" href="https:\/\/matchapp\.tv\/together\.html"/);
  assert.match(fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8'), /<loc>https:\/\/matchapp\.tv\/together\.html<\/loc>/);
  assert.ok(html.indexOf('growth-bootstrap.js') < html.indexOf('googletagmanager.com'));
  assert.match(html, /<meta name="referrer" content="no-referrer">/);
});
