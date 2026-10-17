/* Native-only news geometry. The Android SDK owns every ad asset and ad request. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root?.document) {
    const start = () => api.boot(root);
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
  }
})(typeof window === 'undefined' ? null : window, function () {
  'use strict';
  const HEIGHT = 480, MIN_WIDTH = 280, MAX_WIDTH = 640, INSET = 8;
  const FALLBACK = Object.freeze({
    en: 'Continue reading below.', pt: 'Continue a leitura abaixo.', es: 'Sigue leyendo abajo.',
    fr: 'Poursuivez votre lecture ci-dessous.', de: 'Lies unten weiter.', it: 'Continua a leggere qui sotto.',
    tr: 'Aşağıda okumaya devam edin.', ru: 'Продолжайте чтение ниже.', ar: 'تابع القراءة أدناه.',
    hi: 'आगे पढ़ने के लिए नीचे जाएँ।', id: 'Lanjutkan membaca di bawah.', ja: '続きは下にあります。',
    ko: '아래에서 계속 읽어보세요.', zh: '请在下方继续阅读。'
  });
  function scope(w) {
    try {
      if (w.top !== w || w.location.origin !== 'https://matchapp.tv' || w.document.documentElement.dataset.matchappMode === 'kids') return '';
      const route = w.location.pathname;
      if (['/', '/index.html'].includes(route)) return 'home';
      if (['/ebooks/', '/ebooks/index.html'].includes(route)) return 'ebook';
      if (['/news/', '/news/index.html'].includes(route)) return 'news';
    } catch (_) {}
    return '';
  }
  function language(w) {
    let saved = '';
    try { saved = w.localStorage.getItem('match_lang') || ''; } catch (_) {}
    for (const value of [w.MATCH_LANG, saved, w.document.documentElement.lang]) {
      const lang = String(value || '').toLowerCase().split('-')[0];
      if (Object.prototype.hasOwnProperty.call(FALLBACK, lang)) return lang;
    }
    return 'en';
  }
  function uuid(w) {
    try {
      if (typeof w.crypto?.randomUUID === 'function') return w.crypto.randomUUID();
      const bytes = w.crypto.getRandomValues(new Uint8Array(16));
      bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
      const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
      return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
    } catch (_) { return ''; }
  }
  function viewport(w) {
    const visual = w.visualViewport;
    const value = { width: visual ? visual.width : w.innerWidth, height: visual ? visual.height : w.innerHeight, offsetX: visual ? visual.offsetLeft : 0, offsetY: visual ? visual.offsetTop : 0, scale: visual ? visual.scale : 1 };
    if (!Object.values(value).every(Number.isFinite) || value.width < MIN_WIDTH + INSET * 2 || value.height < HEIGHT + INSET * 2 || value.width > 10000 || value.height > 10000 || Math.abs(value.scale - 1) > .001 || Math.abs(value.offsetX) > .5 || Math.abs(value.offsetY) > .5) return null;
    return value;
  }
  function rectangle(el) {
    const value = el.getBoundingClientRect();
    const rect = { x: value.x, y: value.y, width: value.width, height: value.height };
    return Object.values(rect).every(Number.isFinite) ? rect : null;
  }
  function dimensions(value) {
    return value?.heightCss === HEIGHT && value.minWidthCss === MIN_WIDTH && value.maxWidthCss === MAX_WIDTH;
  }
  function boot(w) {
    const surface = w?.document && scope(w);
    if (!surface || typeof w.MatchAppNativeNews?.postMessage !== 'function') return null;
    if (w.MatchAppNativeNewsSlot) return w.MatchAppNativeNewsSlot;
    let requestId = uuid(w);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(requestId)) return null;
    const d = w.document, listeners = [], pointers = new Set();
    let eligible = false, stopped = false, suspended = false, destroyed = false, seq = 0;
    let slot = null, fallback = null, frame = null, timer = null, previous = '', stableFrames = 0;
    let lastHello = '', hiddenSent = true, settleUntil = 0, queuedHello = false;
    let overlayDirty = true, overlayElements = [], observer = null;
    let observedValue = false, valueEpoch = 0, valueCandidate = null, valueFrame = null, valueObserver = null, valuePosition = '';
    w.MatchAppNativeNewsDocumentId = requestId;
    function post(type, detail = {}) {
      if (destroyed || !scope(w)) return false;
      try { w.MatchAppNativeNews.postMessage(JSON.stringify({ type, requestId, ...detail })); return true; } catch (_) { return false; }
    }
    function listen(target, name, handler, options) {
      target.addEventListener(name, handler, options); listeners.push(() => target.removeEventListener(name, handler, options));
    }
    function translate() {
      if (!slot) return;
      const lang = language(w); slot.lang = lang; slot.dir = lang === 'ar' ? 'rtl' : 'ltr';
      if (fallback.textContent !== FALLBACK[lang]) fallback.textContent = FALLBACK[lang];
    }
    function showFallback(ready = false) {
      if (!slot) return;
      slot.dataset.nativeNewsState = ready ? 'ready' : 'neutral';
      fallback.setAttribute('aria-hidden', String(ready));
    }
    function clearSchedule() {
      if (frame !== null) w.cancelAnimationFrame(frame);
      if (timer !== null) w.clearTimeout(timer);
      frame = null; timer = null; previous = ''; stableFrames = 0;
    }
    function hide() {
      showFallback(); previous = ''; stableFrames = 0;
      if (!hiddenSent) { post('hide'); hiddenSent = true; }
    }
    // A quota cache is not evidence that the person saw a result. This bit is
    // document/account-local and is set only by the successful render callback.
    function hasValue() { return observedValue; }
    function clearValuePending() {
      if (valueFrame !== null) w.cancelAnimationFrame(valueFrame);
      valueFrame = null; valueObserver?.disconnect(); valueObserver = null; valueCandidate = null; valuePosition = '';
    }
    function proof(chosen, host, run) {
      try {
        if (!['home', 'ebook'].includes(surface) || !['one_match', 'ebook'].includes(chosen)) return null;
        if (chosen === 'one_match' && (surface !== 'home' || run !== w.__matchappMatchRunId || w.__matchappMatchPhase !== 'result')) return null;
        const card = chosen === 'one_match' ? d.getElementById('result-box') : host;
        if (!card?.isConnected || card.ownerDocument !== d || card.hidden || card.closest('[hidden],[aria-hidden="true"]')) return null;
        const style = w.getComputedStyle(card);
        if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return null;
        const title = card.querySelector(chosen === 'one_match' ? '#res-title' : '.ebook-result-grid .ebook-result-copy h3');
        const source = card.querySelector(chosen === 'one_match' ? '#res-direct-link' : '.ebook-result-grid a[data-ebook-provider][href]');
        if (!title?.textContent.trim() || !source?.getAttribute('href')?.trim() || source.getAttribute('href') === '#') return null;
        const url = new URL(source.href);
        if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
        if (chosen === 'one_match') {
          const expected = String(w.globalMatchTitle || '').trim(), poster = card.querySelector('#res-poster-img');
          if (!card.classList.contains('is-revealed') || !expected || poster?.dataset.matchappMediaTitle !== expected) return null;
        } else if (!card.matches('[data-ebook-result]') || !card.querySelector('.ebook-summary')?.textContent.trim() || !card.querySelector('[data-ebook-save]')?.getAttribute('data-ebook-save')) return null;
        return { chosen, card, title, source, run, epoch: valueEpoch };
      } catch (_) { return null; }
    }
    function scheduleValue() {
      if (!valueCandidate || valueFrame !== null || destroyed || suspended || observedValue) return;
      valueFrame = w.requestAnimationFrame(() => { valueFrame = null; checkValue(); });
    }
    function checkValue() {
      const value = valueCandidate;
      if (!value || value.epoch !== valueEpoch || destroyed || suspended || observedValue) return;
      const current = proof(value.chosen, value.card, value.run);
      if (!current || current.title !== value.title || current.source !== value.source) { clearValuePending(); return; }
      if (d.visibilityState !== 'visible' || !visibleElement(value.card) || !visibleElement(value.title) || d.fullscreenElement) { valuePosition = ''; return; }
      for (const modal of d.querySelectorAll('dialog[open],[aria-modal="true"],[role="dialog"]')) if (visibleElement(modal)) { valuePosition = ''; return; }
      const rect = rectangle(value.title), visual = w.visualViewport;
      const width = visual?.width || w.innerWidth, height = visual?.height || w.innerHeight;
      if (!rect || rect.width <= 0 || rect.height <= 0 || rect.x < 0 || rect.y < 0 || rect.x + rect.width > width || rect.y + rect.height > height || typeof d.elementFromPoint !== 'function') { valuePosition = ''; return; }
      const hit = d.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      if (!hit || (hit !== value.title && !value.title.contains(hit))) { valuePosition = ''; return; }
      const key = [rect.x, rect.y, rect.width, rect.height].map(n => Math.round(n * 2) / 2).join(':');
      if (key !== valuePosition) { valuePosition = key; scheduleValue(); return; }
      observedValue = true; clearValuePending(); hello(true);
    }
    function confirmValue(chosen, host, run) {
      if (destroyed || suspended || observedValue) return false;
      const value = proof(chosen, host, run);
      if (!value) return false;
      clearValuePending(); valueCandidate = value;
      if (typeof w.IntersectionObserver === 'function') {
        valueObserver = new w.IntersectionObserver(scheduleValue, { threshold: [0, .5, 1] });
        valueObserver.observe(value.title);
      }
      scheduleValue(); return true;
    }
    function hello(force = false) {
      if (destroyed || suspended) return;
      const lang = language(w), value = hasValue(), key = lang + ':' + value;
      translate();
      if (force || key !== lastHello) { lastHello = key; post('hello', { hasValue: value, lang }); }
    }
    function queueHello(force = false) {
      if (queuedHello || destroyed) return;
      queuedHello = true;
      Promise.resolve().then(() => { queuedHello = false; hello(force); });
    }
    function schedule(delay = 0) {
      if (surface !== 'news' || destroyed || suspended || stopped || !eligible || frame !== null || timer !== null) return;
      if (delay) timer = w.setTimeout(() => { timer = null; schedule(); }, delay);
      else frame = w.requestAnimationFrame(() => { frame = null; sample(); });
    }
    function mount(view) {
      if (slot) return true;
      const feed = d.querySelector('[data-native-news-feed]');
      if (!feed) return false;
      const articles = Array.from(feed.children).filter(el => el.tagName === 'ARTICLE');
      if (articles.length < 7) return false;
      const feedRect = rectangle(feed), anchor = articles[5], anchorRect = rectangle(anchor);
      // Delayed consent must not insert inventory into content already being read.
      if (!feedRect || !anchorRect || feedRect.width < MIN_WIDTH || anchorRect.y + anchorRect.height < view.height + 32) return false;
      slot = d.createElement('div'); slot.className = 'ma-native-news-slot'; slot.dataset.nativeNewsSlot = '';
      // Critical reservation is synchronous, including when the optional stylesheet fails.
      slot.style.cssText = 'box-sizing:border-box;grid-column:1 / -1;width:min(100%,640px);height:480px;min-height:480px;max-height:480px;margin:16px auto;position:relative';
      fallback = d.createElement('p'); fallback.className = 'ma-native-news-neutral'; slot.append(fallback);
      translate(); showFallback(); anchor.after(slot); overlayDirty = true;
      return true;
    }
    function visibleElement(el) {
      if (!el?.isConnected || el.hidden || el.closest('[hidden],[aria-hidden="true"]')) return false;
      const style = w.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.visibility !== 'collapse' && Number(style.opacity || 1) > .01 && el.getClientRects().length > 0;
    }
    function unobscured(rect) {
      if (d.fullscreenElement || typeof d.elementFromPoint !== 'function') return false;
      for (const modal of d.querySelectorAll('dialog[open],[aria-modal="true"],[role="dialog"]')) if (visibleElement(modal)) return false;
      if (overlayDirty) {
        overlayElements = Array.from(d.body.querySelectorAll('*')).filter(el => {
          if (el === slot || slot.contains(el)) return false;
          const style = w.getComputedStyle(el);
          return style.position === 'fixed' || style.position === 'sticky' || (style.position === 'absolute' && Number(style.zIndex) > 0);
        });
        overlayDirty = false;
      }
      for (const el of overlayElements) {
        if (!visibleElement(el)) continue;
        const other = rectangle(el);
        if (other && other.width > 0 && other.height > 0 && other.x < rect.x + rect.width && other.x + other.width > rect.x && other.y < rect.y + rect.height && other.y + other.height > rect.y) return false;
      }
      // Probe inside the 14px rounded card: its transparent corner pixels
      // legitimately hit the feed underneath. The rectangle/overlay checks
      // above still protect the entire reservation, including its corners.
      for (const x of [rect.x + 16, rect.x + rect.width / 2, rect.x + rect.width - 16]) {
        for (const y of [rect.y + 16, rect.y + rect.height / 2, rect.y + rect.height - 16]) {
          const hit = d.elementFromPoint(x, y);
          if (!hit || (hit !== slot && !slot.contains(hit))) return false;
        }
      }
      return true;
    }
    function sample() {
      if (destroyed || suspended || stopped || !eligible) return;
      const view = viewport(w);
      if (!view || d.visibilityState !== 'visible' || pointers.size) { hide(); return; }
      if (Date.now() < settleUntil) { hide(); schedule(250); return; }
      if (!mount(view)) return;
      const rect = rectangle(slot);
      if (!rect || rect.width < MIN_WIDTH || rect.width > MAX_WIDTH + .5 || Math.abs(rect.height - HEIGHT) > .5 || rect.x < INSET || rect.y < INSET || rect.x + rect.width > view.width - INSET || rect.y + rect.height > view.height - INSET || !unobscured(rect)) { hide(); schedule(250); return; }
      const key = [rect.x, rect.y, rect.width, rect.height, view.width, view.height].map(n => Math.round(n * 2) / 2).join(':');
      if (key !== previous) { previous = key; stableFrames = 1; if (!hiddenSent) { post('hide'); hiddenSent = true; showFallback(); } schedule(); return; }
      if (++stableFrames < 2) { schedule(); return; }
      // This is the first point at which native may request/display an ad.
      if (post('slot', { seq: ++seq, rect, viewport: view, visible: true, unobscured: true, lang: language(w) })) hiddenSent = false;
      schedule(250);
    }
    function invalidate() {
      if (destroyed || suspended) return;
      settleUntil = Date.now() + 180; overlayDirty = true; hide(); clearSchedule(); schedule(200);
    }
    function nativeEvent(event) {
      const value = event.detail;
      if (destroyed || suspended || !value || value.requestId !== requestId || typeof value.enabled !== 'boolean' || typeof value.eligible !== 'boolean') return;
      if (!['available', 'loading', 'ready', 'unavailable', 'hidden', 'disposed'].includes(value.status)) return;
      if (!value.enabled || !value.eligible || !dimensions(value)) { eligible = false; hide(); clearSchedule(); return; }
      eligible = true;
      if (value.status === 'unavailable') { stopped = true; hide(); clearSchedule(); return; }
      if (value.status === 'disposed') { eligible = false; hide(); clearSchedule(); return; }
      if (value.status === 'ready') showFallback(true);
      else showFallback();
      schedule();
    }
    function resetAccount() {
      if (destroyed) return;
      ++valueEpoch; observedValue = false; clearValuePending();
      post('reset'); hide(); clearSchedule(); eligible = false; stopped = false; lastHello = ''; seq = 0; pointers.clear();
      requestId = uuid(w); w.MatchAppNativeNewsDocumentId = requestId;
      if (!requestId) { suspended = true; return; }
      // The existing auth callback clears token state; wait until it has returned.
      queueHello(true);
    }
    function suspend() {
      if (destroyed || suspended) return;
      ++valueEpoch; observedValue = false; clearValuePending();
      hide(); post('dispose'); clearSchedule(); eligible = false; suspended = true;
    }
    function resume() {
      if (destroyed) return;
      if (suspended) {
        requestId = uuid(w); w.MatchAppNativeNewsDocumentId = requestId;
        if (!requestId) return;
        suspended = false; stopped = false; seq = 0; lastHello = '';
      }
      hello(true); invalidate();
    }
    function dispose() {
      if (destroyed) return;
      suspend(); destroyed = true; observer?.disconnect(); listeners.splice(0).forEach(remove => remove());
    }
    listen(w, 'matchapp:nativenews', nativeEvent);
    listen(d, 'matchapp:authchange', resetAccount);
    listen(d, 'matchapp:firstvalue', () => queueHello());
    listen(d, 'matchapp:tokenpolicy', () => queueHello());
    for (const name of ['matchapp:langchange', 'matchapp:languagechange', 'matchapp:prostatus', 'matchapp:profilehydrated']) listen(d, name, () => queueHello(true));
    listen(w, 'pagehide', suspend); listen(w, 'pageshow', resume);
    if (surface !== 'news') {
      for (const name of ['scroll', 'resize']) listen(w, name, scheduleValue, { passive: true, capture: true });
      for (const name of ['visibilitychange', 'animationend', 'transitionend', 'toggle', 'focusout']) listen(d, name, scheduleValue, true);
    }
    if (surface === 'news') {
      listen(w, 'scroll', invalidate, { passive: true, capture: true });
      listen(w, 'resize', invalidate, { passive: true });
      listen(d, 'visibilitychange', () => { if (d.visibilityState === 'visible') { hello(true); invalidate(); } else { hide(); clearSchedule(); } });
      listen(d, 'pointerdown', event => { pointers.add(event.pointerId); invalidate(); }, { passive: true, capture: true });
      for (const name of ['pointerup', 'pointercancel']) listen(d, name, event => { pointers.delete(event.pointerId); invalidate(); }, { passive: true, capture: true });
      for (const name of ['focusin', 'beforetoggle', 'toggle', 'fullscreenchange']) listen(d, name, invalidate, true);
      if (w.visualViewport) for (const name of ['resize', 'scroll']) listen(w.visualViewport, name, invalidate, { passive: true });
      if (typeof w.MutationObserver === 'function') {
        observer = new w.MutationObserver(records => {
          if (records.some(record => !slot || (record.target !== slot && !slot.contains(record.target)))) invalidate();
        });
        observer.observe(d.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'open', 'aria-hidden', 'aria-modal', 'style', 'class'] });
      }
    }
    const controller = Object.freeze({ refresh: () => queueHello(true), confirmValue, dispose, get requestId() { return requestId; } });
    w.MatchAppNativeNewsSlot = controller; hello(); return controller;
  }
  return Object.freeze({ boot, scope, language, viewport, languages: Object.freeze(Object.keys(FALLBACK)), fallback: FALLBACK, height: HEIGHT, minWidth: MIN_WIDTH, maxWidth: MAX_WIDTH });
});
