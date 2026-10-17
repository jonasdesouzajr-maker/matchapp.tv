'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), { JSDOM } = require('jsdom');
const api = require('../native-news-slot.js'), source = fs.readFileSync(path.join(__dirname, '../native-news-slot.js'), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
async function fixture({ route = '/news/', origin = 'https://matchapp.tv', bridge = true, width = 360, height = 800, feedWidth = 288, articleCount = 10, anchorBottom = 2600, hasValue = false } = {}) {
  const html = '<html lang="en"><body><a id="original-source" href="https://publisher.example/report">Original source</a><section data-native-news-feed>' + Array.from({ length: articleCount }, (_, i) => '<article><h2>Original article ' + i + '</h2><a href="/news/article-' + i + '/">Read</a></article>').join('') + '</section><div id="locked-ad"><ins data-ad-slot="2595698117"></ins></div></body></html>';
  const w = new JSDOM(html, { url: origin + route, runScripts: 'outside-only', pretendToBeVisual: true }).window, d = w.document;
  const messages = [], calls = [], pending = new Map(); let id = 0, now = 1000, slotY = 2800, slotX = 36, currentAnchorBottom = anchorBottom, overlay = null;
  Object.defineProperty(w, 'innerWidth', { value: width, configurable: true }); Object.defineProperty(w, 'innerHeight', { value: height, configurable: true });
  w.Date.now = () => now;
  w.requestAnimationFrame = callback => { const value = ++id; pending.set(value, { at: now + 16, callback }); return value; };
  w.cancelAnimationFrame = value => pending.delete(value);
  w.setTimeout = (callback, delay = 0) => { const value = ++id; pending.set(value, { at: now + delay, callback }); return value; };
  w.clearTimeout = value => pending.delete(value);
  const rect = (x, y, rw, rh) => ({ x, y, width: rw, height: rh, top: y, left: x, right: x + rw, bottom: y + rh });
  w.Element.prototype.getBoundingClientRect = function () {
    if (this.matches('[data-native-news-slot]')) return rect(slotX, slotY, Math.min(feedWidth, 640), 480);
    if (this.matches('[data-native-news-feed]')) return rect(36, 1600, feedWidth, 6000);
    if (this.tagName === 'ARTICLE') return rect(36, currentAnchorBottom - 300, feedWidth, 300);
    if (this.id === 'cover') return rect(90, 200, 40, 40);
    return rect(0, 0, 30, 30);
  };
  w.Element.prototype.getClientRects = function () { return this.hidden ? [] : [this.getBoundingClientRect()]; };
  d.elementFromPoint = () => overlay || d.querySelector('[data-native-news-slot]') || d.querySelector('#res-title,.ebook-result-copy h3');
  w.fetch = () => { calls.push('fetch'); throw Error('No web request is permitted'); };
  w.MatchAppTokens = { enabled: true, hasValue };
  w.MatchAppNativeRewards = { postMessage: () => calls.push('reward') };
  w.MATCHAPP_IS_AD_FREE = true; // Existing WebView shell suppresses web ads for every account.
  if (bridge) w.MatchAppNativeNews = { postMessage: raw => { const value = JSON.parse(raw); if (value.type === 'hello') assert.equal(w.MatchAppNativeNewsDocumentId, value.requestId); messages.push(value); } };
  const original = d.getElementById('original-source'), originalHref = original.href, articles = [...d.querySelectorAll('article')], ad = d.getElementById('locked-ad').outerHTML;
  let clicks = 0; const handler = event => { event.preventDefault(); clicks++; }; original.onclick = handler;
  const storageBefore = Object.keys(w.localStorage);
  w.eval(source); d.dispatchEvent(new w.Event('DOMContentLoaded')); await tick();
  async function advance(ms = 500) {
    const until = now + ms; let count = 0;
    await tick();
    while (true) {
      const next = [...pending].filter(([, task]) => task.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      assert.ok(++count < 300, 'bounded scheduling'); now = next[1].at; pending.delete(next[0]); next[1].callback(); await tick();
    }
    now = until; await tick();
  }
  const emit = (status, values = {}) => w.dispatchEvent(new w.CustomEvent('matchapp:nativenews', { detail: { requestId: w.MatchAppNativeNewsSlot?.requestId, status, enabled: true, eligible: true, heightCss: 480, minWidthCss: 280, maxWidthCss: 640, ...values } }));
  function result(kind = 'one_match') {
    const card = d.createElement('section');
    if (kind === 'one_match') {
      card.id = 'result-box'; card.className = 'is-revealed';
      card.innerHTML = '<img id="res-poster-img" data-matchapp-media-title="Visible real title"><h2 id="res-title">Visible real title</h2><a id="res-direct-link" href="https://www.netflix.com/title/123">Open Netflix</a>';
      w.globalMatchTitle = 'Visible real title'; w.__matchappMatchRunId = 12; w.__matchappMatchPhase = 'result';
    } else {
      card.dataset.ebookResult = '';
      card.innerHTML = '<div class="ebook-result-grid"><div class="ebook-result-copy"><h3>A curated book</h3><p class="ebook-summary">The original curated synopsis.</p><a data-ebook-provider="Google Books" href="https://books.google.com/books?id=fixture">Open source</a><button data-ebook-save="curated-book">Save</button></div></div>';
    }
    d.body.append(card); return card;
  }
  return { w, d, messages, calls, original, originalHref, handler, articles, ad, storageBefore, clicks: () => clicks, advance, emit,
    result,
    setSlot: (y, x = 36) => { slotY = y; slotX = x; }, setAnchor: bottom => { currentAnchorBottom = bottom; }, setOverlay: el => { overlay = el; },
    close: () => { w.MatchAppNativeNewsSlot?.dispose(); w.close(); } };
}

test('the adapter has no DOM or bridge behavior on web, older apps, Kids, other routes or other origins', async () => {
  for (const options of [{ bridge: false }, { route: '/kids/' }, { route: '/discover.html' }, { route: '/news/articles/report/' }, { origin: 'https://www.matchapp.tv' }, { origin: 'http://matchapp.tv' }]) {
    const f = await fixture(options);
    try { assert.equal(f.w.MatchAppNativeNewsSlot, undefined); assert.equal(f.d.querySelector('[data-native-news-slot]'), null); assert.deepEqual(f.messages, []); assert.deepEqual(f.calls, []); } finally { f.close(); }
  }
  assert.equal(api.scope({ top: {}, location: { origin: 'https://matchapp.tv', pathname: '/news/' }, document: { documentElement: { dataset: {} } } }), '');
});

test('unknown consent, wrong request IDs and malformed native eligibility cannot reserve inventory', async () => {
  const f = await fixture();
  try {
    assert.equal(f.messages.length, 1); assert.equal(f.messages[0].type, 'hello'); assert.equal(f.messages[0].hasValue, false);
    for (const data of [{ enabled: false }, { eligible: false }, { eligible: 'true' }, { enabled: 'true' }, { heightCss: 250 }, { minWidthCss: 240 }, { maxWidthCss: 999 }, { requestId: 'stale-document' }]) { f.emit('available', data); await f.advance(); assert.equal(f.d.querySelector('[data-native-news-slot]'), null); }
    assert.equal(f.messages.filter(m => m.type === 'slot').length, 0); assert.deepEqual(f.calls, []);
  } finally { f.close(); }
});

test('a narrow, short, incomplete or already-viewed feed is never widened or shifted for an ad', async () => {
  for (const options of [{ width: 320, feedWidth: 248 }, { height: 480 }, { articleCount: 6 }, { anchorBottom: 650 }]) {
    const f = await fixture(options);
    try { f.emit('available'); await f.advance(); assert.equal(f.d.querySelector('[data-native-news-slot]'), null); assert.equal(f.d.querySelector('[data-native-news-feed]').children.length, options.articleCount || 10); assert.equal(f.messages.filter(m => m.type === 'slot').length, 0); } finally { f.close(); }
  }
});

test('reservation appears after the sixth original article before any request-eligible geometry', async () => {
  const f = await fixture();
  try {
    f.original.focus(); f.emit('available'); await f.advance();
    const slot = f.d.querySelector('[data-native-news-slot]'), feed = f.d.querySelector('[data-native-news-feed]');
    assert.ok(slot); assert.equal(feed.children[6], slot); assert.equal(slot.previousElementSibling, f.articles[5]); assert.equal(slot.nextElementSibling, f.articles[6]);
    assert.equal(slot.style.height, '480px'); assert.equal(slot.style.minHeight, '480px'); assert.equal(slot.style.maxHeight, '480px');
    assert.equal(f.messages.filter(m => m.type === 'slot').length, 0, 'a below-viewport reservation cannot request an ad');
    assert.deepEqual([...f.d.querySelectorAll('article')], f.articles); assert.equal(f.original.onclick, f.handler); assert.equal(f.original.href, f.originalHref); f.original.click(); assert.equal(f.clicks(), 1);
    assert.equal(f.d.activeElement, f.original); assert.equal(f.d.getElementById('locked-ad').outerHTML, f.ad); assert.deepEqual(Object.keys(f.w.localStorage), f.storageBefore);
    assert.equal(slot.querySelectorAll('a,img,iframe,button,script,ins').length, 0); assert.doesNotMatch(slot.textContent, /Sponsored|Advertisement|click|watch.*ad/i);
    f.setSlot(100); f.w.dispatchEvent(new f.w.Event('scroll')); await f.advance(230);
    assert.equal(f.messages.filter(m => m.type === 'slot').length, 0, 'one settled frame is insufficient');
    await f.advance(25);
    const packet = f.messages.find(m => m.type === 'slot'); assert.ok(packet); assert.equal(packet.rect.height, 480); assert.equal(packet.rect.width, 288); assert.equal(packet.visible, true); assert.equal(packet.unobscured, true); assert.equal(packet.viewport.scale, 1);
    assert.deepEqual(Object.keys(packet).sort(), ['lang', 'rect', 'requestId', 'seq', 'type', 'unobscured', 'viewport', 'visible'].sort());
    await f.advance(500); const numbers = f.messages.filter(m => m.type === 'slot').map(m => m.seq); assert.ok(numbers.every((n, i) => i === 0 || n > numbers[i - 1])); assert.deepEqual(f.calls, []);
  } finally { f.close(); }
});

test('scroll, touch, partial visibility and a covering dialog hide native creative immediately', async () => {
  const f = await fixture();
  try {
    f.emit('available'); await f.advance(); f.setSlot(100); f.w.dispatchEvent(new f.w.Event('scroll')); await f.advance(); assert.ok(f.messages.some(m => m.type === 'slot'));
    f.emit('ready'); const slot = f.d.querySelector('[data-native-news-slot]'); assert.equal(slot.dataset.nativeNewsState, 'ready');
    const count = f.messages.length; f.w.dispatchEvent(new f.w.Event('scroll')); assert.equal(f.messages[count].type, 'hide'); assert.equal(slot.dataset.nativeNewsState, 'neutral');
    await f.advance(); f.d.dispatchEvent(new f.w.Event('pointerdown')); const countAfterDown = f.messages.filter(m => m.type === 'slot').length; await f.advance(600); assert.equal(f.messages.filter(m => m.type === 'slot').length, countAfterDown);
    f.d.dispatchEvent(new f.w.Event('pointerup')); await f.advance();
    f.setSlot(400); f.w.dispatchEvent(new f.w.Event('scroll')); const partial = f.messages.filter(m => m.type === 'slot').length; await f.advance(); assert.equal(f.messages.filter(m => m.type === 'slot').length, partial);
    f.setSlot(100); f.w.dispatchEvent(new f.w.Event('scroll')); await f.advance();
    const dialog = f.d.createElement('section'); dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); f.d.body.append(dialog); await tick();
    assert.equal(f.messages.at(-1).type, 'hide'); const blocked = f.messages.filter(m => m.type === 'slot').length; await f.advance(); assert.equal(f.messages.filter(m => m.type === 'slot').length, blocked);
    dialog.remove(); await f.advance(); assert.ok(f.messages.filter(m => m.type === 'slot').length > blocked);
    assert.equal(slot.style.height, '480px');
  } finally { f.close(); }
});

test('rounded transparent corners do not suppress an otherwise safe native reservation', async () => {
  const f = await fixture();
  try {
    f.emit('available'); await f.advance(); f.setSlot(100);
    const slot = f.d.querySelector('[data-native-news-slot]'), probes = [];
    f.d.elementFromPoint = (x, y) => {
      const r = slot.getBoundingClientRect(), dx = Math.min(x - r.x, r.right - x), dy = Math.min(y - r.y, r.bottom - y);
      probes.push({ x, y });
      return dx < 14 && dy < 14 && Math.hypot(14 - dx, 14 - dy) > 14 ? slot.parentElement : slot;
    };
    f.w.dispatchEvent(new f.w.Event('scroll')); await f.advance();
    assert.ok(f.messages.some(m => m.type === 'slot')); assert.ok(probes.length >= 9);
    const count = f.messages.filter(m => m.type === 'slot').length;
    f.d.elementFromPoint = () => f.original;
    f.w.dispatchEvent(new f.w.Event('scroll')); await f.advance();
    assert.equal(f.messages.filter(m => m.type === 'slot').length, count, 'a real covering element still blocks the full native view');
    assert.equal(f.messages.at(-1).type, 'hide');
  } finally { f.close(); }
});

test('small overlapping fixed controls, zoom and gold-frame collisions also fail closed', async () => {
  const f = await fixture();
  try {
    f.emit('available'); await f.advance(); f.setSlot(100); f.w.dispatchEvent(new f.w.Event('scroll')); await f.advance();
    const cover = f.d.createElement('button'); cover.id = 'cover'; cover.style.position = 'fixed'; f.d.body.append(cover); await tick(); const covered = f.messages.filter(m => m.type === 'slot').length; await f.advance(); assert.equal(f.messages.filter(m => m.type === 'slot').length, covered, 'intersection catches a small overlay between hit-test sample points');
    cover.remove(); await f.advance();
    for (const position of [[7, 36], [100, 7], [100, 70]]) { f.setSlot(...position); f.w.dispatchEvent(new f.w.Event('scroll')); const before = f.messages.filter(m => m.type === 'slot').length; await f.advance(); assert.equal(f.messages.filter(m => m.type === 'slot').length, before); }
    const visual = new f.w.EventTarget(); Object.assign(visual, { width: 360, height: 800, offsetLeft: 0, offsetTop: 0, scale: 1.5 }); Object.defineProperty(f.w, 'visualViewport', { value: visual });
    f.setSlot(100); f.w.dispatchEvent(new f.w.Event('resize')); const beforeZoom = f.messages.filter(m => m.type === 'slot').length; await f.advance(); assert.equal(f.messages.filter(m => m.type === 'slot').length, beforeZoom);
  } finally { f.close(); }
});

test('ready, hidden and no-fill alter only fallback visibility and never collapse or retry inventory', async () => {
  const f = await fixture();
  try {
    f.emit('available'); await f.advance(); f.setSlot(100); f.w.dispatchEvent(new f.w.Event('scroll')); await f.advance();
    const slot = f.d.querySelector('[data-native-news-slot]'), fallback = slot.firstElementChild;
    f.emit('ready'); assert.equal(fallback.getAttribute('aria-hidden'), 'true');
    f.emit('hidden'); assert.equal(fallback.getAttribute('aria-hidden'), 'false');
    f.emit('unavailable', { reason: 'ad_load_failed' }); const before = f.messages.filter(m => m.type === 'slot').length;
    f.w.dispatchEvent(new f.w.Event('scroll')); f.emit('available'); await f.advance(1500);
    assert.equal(f.messages.filter(m => m.type === 'slot').length, before); assert.equal(f.d.querySelectorAll('[data-native-news-slot]').length, 1); assert.equal(slot.style.height, '480px'); assert.equal(fallback.textContent, api.fallback.en);
  } finally { f.close(); }
});

test('account changes replace the document nonce and ignore every prior native response', async () => {
  const f = await fixture({ hasValue: true });
  try {
    const old = f.w.MatchAppNativeNewsDocumentId; assert.equal(f.messages[0].hasValue, false, 'wallet presentation alone does not prove a visible result');
    f.w.MatchAppTokens.hasValue = false; f.d.dispatchEvent(new f.w.CustomEvent('matchapp:authchange')); await tick();
    const current = f.w.MatchAppNativeNewsDocumentId; assert.notEqual(current, old); assert.ok(f.messages.some(m => m.type === 'reset' && m.requestId === old));
    assert.equal(f.messages.at(-1).type, 'hello'); assert.equal(f.messages.at(-1).hasValue, false);
    f.emit('available', { requestId: old }); await f.advance(); assert.equal(f.d.querySelector('[data-native-news-slot]'), null);
    f.d.dispatchEvent(new f.w.CustomEvent('matchapp:firstvalue', { detail: { hasValue: true } })); await tick(); assert.equal(f.messages.at(-1).hasValue, false, 'event payload does not override actual token presentation state');
    f.w.MatchAppTokens.hasValue = true; f.d.dispatchEvent(new f.w.CustomEvent('matchapp:firstvalue', { detail: { surface: 'ebook' } })); await tick(); assert.equal(f.messages.at(-1).hasValue, false); assert.equal(f.messages.at(-1).requestId, current);
    assert.deepEqual(f.calls, []);
  } finally { f.close(); }
});

test('a real visible successful result reports value while token rollout remains disabled, without changing its state', async () => {
  for (const route of ['/', '/ebooks/']) {
    const f = await fixture({ route });
    try {
      delete f.w.MatchAppTokens; const rpc = [];
      f.w.supabaseClient = { auth: { getSession: async () => ({ data: { session: null } }) }, rpc: async name => { rpc.push(name); return { data: { ok: true, enabled: false, policy_version: 'match-tokens-v1', authenticated: false } }; } };
      f.w.eval(fs.readFileSync(path.join(__dirname, '../match-tokens.js'), 'utf8')); await f.w.MatchAppTokens.refresh();
      const kind = route === '/' ? 'one_match' : 'ebook', card = f.result(kind);
      assert.equal(f.w.MatchAppTokens.enabled, false); assert.equal(f.w.MatchAppTokens.hasValue, false);
      assert.equal(f.messages.at(-1).hasValue, false, 'visible markup by itself does not signal success');
      f.w.MatchAppTokens.confirmResult(kind, kind === 'ebook' ? card : null, kind === 'ebook' ? 'book-run' : 12);
      await f.advance(20); assert.equal(f.messages.at(-1).hasValue, false, 'one frame is insufficient');
      await f.advance(25); assert.equal(f.messages.at(-1).hasValue, true);
      assert.equal(f.w.MatchAppTokens.enabled, false); assert.equal(f.w.MatchAppTokens.hasValue, false, 'native signal does not enable wallet/gates');
      assert.ok(rpc.every(name => name === 'match_token_status')); assert.equal(f.d.querySelector('[data-native-news-slot]'), null); assert.deepEqual(f.calls, []);
    } finally { f.close(); }
  }
});

test('hidden, failed, mismatched, covered and stale-run results cannot report native first value', async () => {
  for (const invalid of ['hidden', 'failed', 'mismatched', 'covered', 'stale', 'unsafe']) {
    const f = await fixture({ route: '/' });
    try {
      const card = f.result();
      if (invalid === 'hidden') card.hidden = true;
      if (invalid === 'failed') card.classList.remove('is-revealed');
      if (invalid === 'mismatched') f.w.globalMatchTitle = 'A different result';
      if (invalid === 'covered') f.setOverlay(f.original);
      if (invalid === 'stale') f.w.__matchappMatchRunId = 13;
      if (invalid === 'unsafe') card.querySelector('a').href = 'javascript:alert(1)';
      f.w.MatchAppNativeNewsSlot.confirmValue('one_match', null, 12); await f.advance();
      assert.ok(f.messages.every(message => message.hasValue !== true), invalid);
    } finally { f.close(); }
  }
  const f = await fixture({ route: '/ebooks/' });
  try {
    const card = f.result('ebook'); card.innerHTML = '<div class="ebook-result-copy ebook-audio-discovery"><h3>Source check unavailable</h3><a href="https://books.google.com/">Search</a></div>';
    assert.equal(f.w.MatchAppNativeNewsSlot.confirmValue('ebook', card, 'book-run'), false); await f.advance(); assert.ok(f.messages.every(message => message.hasValue !== true));
  } finally { f.close(); }
});

test('account reset cancels pending proof and cannot resurrect an old visible result through refresh', async () => {
  const f = await fixture({ route: '/' });
  try {
    f.result(); f.w.MatchAppNativeNewsSlot.confirmValue('one_match', null, 12); await f.advance(20);
    f.d.dispatchEvent(new f.w.CustomEvent('matchapp:authchange')); await f.advance(); assert.ok(f.messages.every(m => m.hasValue !== true));
    f.w.MatchAppNativeNewsSlot.confirmValue('one_match', null, 12); await f.advance(); assert.equal(f.messages.at(-1).hasValue, true);
    f.d.dispatchEvent(new f.w.CustomEvent('matchapp:authchange')); await tick(); const newId = f.w.MatchAppNativeNewsDocumentId;
    f.w.MatchAppNativeNewsSlot.refresh(); await tick(); assert.equal(f.messages.at(-1).requestId, newId); assert.equal(f.messages.at(-1).hasValue, false);
    assert.equal(f.d.getElementById('res-title').textContent, 'Visible real title', 'account reset preserves original result DOM');
  } finally { f.close(); }
});

test('Home and ebooks report prior value without creating any ad UI across all fourteen languages', async () => {
  assert.equal(api.languages.length, 14);
  for (const route of ['/', '/ebooks/']) {
    const f = await fixture({ route });
    try {
      f.emit('available'); await f.advance(); assert.equal(f.d.querySelector('[data-native-news-slot]'), null);
      for (const lang of api.languages) {
        assert.ok(api.fallback[lang].trim()); if (lang !== 'en') assert.notEqual(api.fallback[lang], api.fallback.en);
        f.w.MATCH_LANG = lang; f.d.dispatchEvent(new f.w.CustomEvent('matchapp:langchange')); await tick(); assert.equal(f.messages.at(-1).lang, lang);
      }
      assert.equal(f.messages.filter(m => m.type === 'slot').length, 0); assert.deepEqual(f.calls, []); assert.equal(f.original.onclick, f.handler);
    } finally { f.close(); }
  }
});

test('page teardown preserves layout, sends disposal rather than an account reset, and replaces BFCache request IDs', async () => {
  const f = await fixture();
  try {
    f.emit('available'); await f.advance(); const old = f.w.MatchAppNativeNewsDocumentId, slot = f.d.querySelector('[data-native-news-slot]');
    f.w.dispatchEvent(new f.w.Event('pagehide')); assert.equal(f.messages.at(-1).type, 'dispose'); assert.equal(f.messages.filter(m => m.type === 'reset').length, 0);
    f.w.dispatchEvent(new f.w.Event('pageshow')); assert.notEqual(f.w.MatchAppNativeNewsDocumentId, old); assert.equal(f.d.querySelector('[data-native-news-slot]'), slot);
    f.emit('ready', { requestId: old }); assert.notEqual(slot.dataset.nativeNewsState, 'ready');
    f.w.MatchAppNativeNewsSlot.dispose(); const count = f.messages.length; await f.advance(1000); f.d.dispatchEvent(new f.w.CustomEvent('matchapp:authchange')); assert.equal(f.messages.length, count);
  } finally { f.close(); }
});
