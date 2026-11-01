/* Native-only content geometry. The Android SDK owns every ad asset and ad request. */
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
  const HEIGHT = 480, CONTENT_HEIGHT = 360, MIN_WIDTH = 280, MAX_WIDTH = 640, INSET = 8, CONTROL_GAP = 32;
  const CONTENT_LOAD_FAILURES = new Set(['no_fill', 'load_failed', 'load_timeout', 'sdk_unavailable', 'viewport_changed', 'creative_does_not_fit', 'creative_expired']);
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
      if (route === '/explore.html') return 'explore';
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
  function viewport(w, height = HEIGHT) {
    const visual = w.visualViewport;
    const value = { width: visual ? visual.width : w.innerWidth, height: visual ? visual.height : w.innerHeight, offsetX: visual ? visual.offsetLeft : 0, offsetY: visual ? visual.offsetTop : 0, scale: visual ? visual.scale : 1 };
    if (!Object.values(value).every(Number.isFinite) || value.width < MIN_WIDTH + INSET * 2 || value.height < height + INSET * 2 || value.width > 10000 || value.height > 10000 || Math.abs(value.scale - 1) > .001 || Math.abs(value.offsetX) > .5 || Math.abs(value.offsetY) > .5) return null;
    return value;
  }
  function rectangle(el) {
    const value = el.getBoundingClientRect();
    const rect = { x: value.x, y: value.y, width: value.width, height: value.height };
    return Object.values(rect).every(Number.isFinite) ? rect : null;
  }
  function dimensions(value, height) {
    return value?.heightCss === height && value.minWidthCss === MIN_WIDTH && value.maxWidthCss === MAX_WIDTH;
  }

  // Standalone native News/Explore need session context, not app.js's quota boot.
  // Keep the shared project's pinned SDK and default persistent session storage.
  const NEWS_AUTH_SDK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.105.0/dist/umd/supabase.js';
  const NEWS_AUTH_URL = 'https://zkymvqrmbabngsqblyye.supabase.co';
  const NEWS_AUTH_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpreW12cXJtYmFibmdzcWJseXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4MDUyNDIsImV4cCI6MjEwMjM4MTI0Mn0._yEVFMfwVU6GBqQ8m3ljfOgA0HSLEDiKMOfYae6ZD8Q';
  function bootNewsAccount(w) {
    if (!['news', 'explore'].includes(scope(w)) || typeof w.MatchAppNativeNews?.postMessage !== 'function' ||
        typeof w.MatchAppNativeExperience?.setAdFree !== 'function' ||
        typeof w.MatchAppNativeExperience?.setNewsAccountContext !== 'function') return null;
    // A page that already has the shared app account publisher needs no second one.
    if (typeof w.ensureCompactMatchSession === 'function') return null;
    if (w.MatchAppNativeNewsAccount) return w.MatchAppNativeNewsAccount;
    const d = w.document, timers = new Set();
    let client = null, subscription = null, disposed = false, starting = false, revision = 0, readTimer = null;
    let owner, observedOwner, resetPending = false; // undefined = unhydrated; null = verified signed-out.
    let readyResolve, accountReady;
    function prepareReady() { accountReady = new Promise(resolve => { readyResolve = resolve; }); }
    function settleReady(value) { const resolve = readyResolve; readyResolve = null; resolve?.(value); }
    prepareReady();
    function later(fn, ms) {
      const id = w.setTimeout(() => { timers.delete(id); fn(); }, ms);
      timers.add(id); return id;
    }
    function cancel(id) { w.clearTimeout(id); timers.delete(id); }
    function notify(name) {
      d.dispatchEvent(new w.CustomEvent(name, { detail: { source: 'native-news-session' } }));
    }
    function unknown(status = 'loading', reset = false) {
      w.isUserLoggedIn = false;
      w.matchProfileState = { status, userId: null, error: status === 'error' ? 'session_unavailable' : null };
      // The new document's native listeners may not be bound before its first hello.
      // Deny synchronously; only the native authoritative sync may enable ads.
      try { w.MatchAppNativeExperience.setAdFree(true); } catch (_) {}
      notify(reset ? 'matchapp:authchange' : 'matchapp:profilehydrated');
    }
    function identity(session) {
      if (session === null) return null;
      const id = session?.user?.id;
      return typeof session?.access_token === 'string' && session.access_token.length > 0 &&
        typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id) ? id : undefined;
    }
    function bounded(promise) {
      return new Promise((resolve, reject) => {
        const timeout = later(() => reject(new Error('session_timeout')), 8000);
        Promise.resolve(promise).then(value => { cancel(timeout); resolve(value); }, error => { cancel(timeout); reject(error); });
      });
    }
    function schedule(event, session) {
      if (disposed || !client) return;
      client.auth.__matchappInvalidateSessionRead?.();
      const current = ++revision, next = identity(session);
      if (readTimer !== null) cancel(readTimer);
      const previous = observedOwner === undefined ? owner : observedOwner;
      const reset = event === 'SIGNED_OUT' || (previous !== undefined && next !== undefined && previous !== next);
      // SDK callbacks can deny old proof immediately, but never enable identity/ads.
      if (next !== undefined) observedOwner = next;
      if (reset) resetPending = true;
      unknown('loading', reset);
      // Supabase callbacks run under its session lock. Read only after they return.
      readTimer = later(async () => {
        readTimer = null;
        try {
          const result = await bounded(client.auth.getSession());
          if (disposed || current !== revision) return;
          if (!result || result.error || !result.data || !Object.prototype.hasOwnProperty.call(result.data, 'session')) throw new Error('session_unavailable');
          const nextOwner = identity(result.data.session);
          if (nextOwner === undefined) throw new Error('invalid_session');
          const changed = owner !== undefined && owner !== nextOwner;
          owner = nextOwner; observedOwner = owner;
          w.isUserLoggedIn = owner !== null;
          // This publishes identity only. Native still verifies profiles + pro_status.
          w.matchProfileState = { status: owner === null ? 'signedout' : 'loading', userId: owner, error: null };
          notify(changed && !resetPending ? 'matchapp:authchange' : 'matchapp:profilehydrated');
          resetPending = false;
        } catch (_) {
          if (!disposed && current === revision) unknown('error');
        }
      }, 0);
    }
    function loadSdk() {
      if (typeof w.supabase?.createClient === 'function') return Promise.resolve();
      return new Promise((resolve, reject) => {
        const existing = Array.from(d.scripts).find(script => script.src === NEWS_AUTH_SDK);
        const script = existing || d.createElement('script');
        let timeout;
        function finish(error) {
          cancel(timeout); script.removeEventListener('load', loaded); script.removeEventListener('error', failed);
          if (error) reject(error); else resolve();
        }
        function loaded() { finish(typeof w.supabase?.createClient === 'function' ? null : new Error('sdk_unavailable')); }
        function failed() { if (!existing) script.remove?.(); finish(new Error('sdk_unavailable')); }
        script.addEventListener('load', loaded, { once: true }); script.addEventListener('error', failed, { once: true });
        timeout = later(failed, 8000);
        if (!existing) { script.src = NEWS_AUTH_SDK; script.async = true; (d.head || d.documentElement).appendChild(script); }
      });
    }
    async function start() {
      if (disposed || starting) return;
      if (!readyResolve) prepareReady();
      starting = true;
      try {
        client = w.supabaseClient;
        if (!client) {
          await loadSdk();
          if (disposed) return;
          client = w.supabaseClient || w.supabase.createClient(NEWS_AUTH_URL, NEWS_AUTH_KEY, { auth: { detectSessionInUrl: false, experimental: { passkey: true }, flowType: typeof w.MatchAppNativeAuth?.openOAuth === 'function' ? 'pkce' : 'implicit' } });
        }
        if (typeof client?.auth?.getSession !== 'function' || typeof client.auth.onAuthStateChange !== 'function' ||
            typeof client.from !== 'function' || typeof client.rpc !== 'function') throw new Error('client_unavailable');
        // This standalone page owns the client in the parent window. Install
        // its read coalescer here so Jonas never attaches a frame-owned closure
        // to a longer-lived parent client. schedule() invalidates old identities.
        if (!client.auth.__matchappSessionFlight) {
          const getSession = client.auth.getSession.bind(client.auth);
          let flight = null;
          client.auth.getSession = function () {
            if (!flight) {
              const current = Promise.resolve().then(getSession).finally(() => {
                if (flight === current) flight = null;
              });
              flight = current;
            }
            return flight;
          };
          Object.defineProperty(client.auth, '__matchappInvalidateSessionRead', { value: () => { flight = null; } });
          Object.defineProperty(client.auth, '__matchappSessionFlight', { value: true });
        }
        w.supabaseClient = client;
        subscription = client.auth.onAuthStateChange(schedule)?.data?.subscription;
        schedule();
        settleReady(true);
      } catch (_) {
        if (!disposed) unknown('error');
        settleReady(false);
      } finally {
        starting = false;
      }
    }
    function resume() {
      if (client) schedule();
      else if (typeof w.supabase?.createClient === 'function') start();
    }
    const controller = Object.freeze({
      get ready() { return accountReady; },
      retry() {
        if (disposed) return Promise.resolve(false);
        if (!starting) { prepareReady(); start(); }
        return accountReady;
      },
      dispose() {
      if (disposed) return;
      disposed = true; ++revision; settleReady(false);
      timers.forEach(id => w.clearTimeout(id)); timers.clear();
      subscription?.unsubscribe(); w.removeEventListener('pageshow', resume);
    } });
    w.MatchAppNativeNewsAccount = controller;
    w.addEventListener('pageshow', resume);
    unknown(); start(); return controller;
  }
  function boot(w) {
    const surface = w?.document && scope(w);
    if (!surface || typeof w.MatchAppNativeNews?.postMessage !== 'function') return null;
    if (w.MatchAppNativeNewsSlot) return w.MatchAppNativeNewsSlot;
    const slotHeight = surface === 'news' ? HEIGHT : CONTENT_HEIGHT;
    let requestId = uuid(w);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(requestId)) return null;
    const newsAccount = ['news', 'explore'].includes(surface) ? bootNewsAccount(w) : null;
    const d = w.document, listeners = [], pointers = new Set();
    let eligible = false, stopped = false, suspended = false, destroyed = false, seq = 0;
    let slot = null, slotAnchor = null, fallback = null, frame = null, timer = null, previous = '', stableFrames = 0;
    let lastHello = '', hiddenSent = true, settleUntil = 0, queuedHello = false;
    let overlayDirty = true, overlayElements = [], observer = null;
    let observedValue = false, valueEpoch = 0, valueCandidate = null, valueFrame = null, valueObserver = null, valuePosition = '';
    let activeValue = null;
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
    function collapseContentSlot() {
      if (surface !== 'news' && slot) { slot.hidden = true; slot.style.display = 'none'; }
    }
    // A quota cache is not evidence that the person saw a result. This bit is
    // document/account-local and is set only by the successful render callback.
    function hasValue() { return observedValue; }
    function accountIdentity() {
      const state = w.matchProfileState;
      if (state?.status === 'signedout' && w.isUserLoggedIn !== true && state.userId == null) return 'guest';
      // A verified SDK owner can see a genuine result while its profile is
      // still loading. Native retains entitlement ownership; slots wait below.
      return w.isUserLoggedIn === true && ['loading', 'ready', 'error'].includes(state?.status) && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(state.userId || '') ? state.userId : '';
    }
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
        return { chosen, card, title, source, titleText: title.textContent.trim(), sourceHref: source.href, account: accountIdentity(), run, epoch: valueEpoch };
      } catch (_) { return null; }
    }
    function scheduleValue() {
      if (!valueCandidate || valueFrame !== null || destroyed || suspended) return;
      valueFrame = w.requestAnimationFrame(() => { valueFrame = null; checkValue(); });
    }
    function checkValue() {
      const value = valueCandidate;
      if (!value || value.epoch !== valueEpoch || destroyed || suspended) return;
      const current = proof(value.chosen, value.card, value.run);
      if (!current || !current.account || current.account !== value.account || current.title !== value.title || current.source !== value.source || current.titleText !== value.titleText || current.sourceHref !== value.sourceHref) { clearValuePending(); return; }
      if (d.visibilityState !== 'visible' || !visibleElement(value.card) || !visibleElement(value.title) || d.fullscreenElement) { valuePosition = ''; return; }
      for (const modal of d.querySelectorAll('dialog[open],[aria-modal="true"],[role="dialog"]')) if (visibleElement(modal)) { valuePosition = ''; return; }
      const rect = rectangle(value.title), visual = w.visualViewport;
      const width = visual?.width || w.innerWidth, height = visual?.height || w.innerHeight;
      if (!rect || rect.width <= 0 || rect.height <= 0 || rect.x < 0 || rect.y < 0 || rect.x + rect.width > width || rect.y + rect.height > height || typeof d.elementFromPoint !== 'function') { valuePosition = ''; return; }
      const hit = d.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      if (!hit || (hit !== value.title && !value.title.contains(hit))) { valuePosition = ''; return; }
      const key = [rect.x, rect.y, rect.width, rect.height].map(n => Math.round(n * 2) / 2).join(':');
      if (key !== valuePosition) { valuePosition = key; scheduleValue(); return; }
      activeValue = current; observedValue = true; clearValuePending(); hello(true); invalidate();
    }
    function confirmValue(chosen, host, run) {
      if (destroyed || suspended) return false;
      const value = proof(chosen, host, run);
      if (!value?.account) return false;
      clearValuePending(); activeValue = null; hide(); clearSchedule(); valueCandidate = value;
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
      if (destroyed || suspended || stopped || !eligible || frame !== null || timer !== null) return;
      if (delay) timer = w.setTimeout(() => { timer = null; schedule(); }, delay);
      else frame = w.requestAnimationFrame(() => { frame = null; sample(); });
    }
    function currentValue() {
      if (surface === 'news' || surface === 'explore') return true;
      const value = activeValue, chosen = surface === 'home' ? 'one_match' : 'ebook';
      const current = value?.chosen === chosen && value.epoch === valueEpoch && proof(chosen, value.card, value.run);
      if (!current || !current.account || current.account !== value.account || current.title !== value.title || current.source !== value.source || current.titleText !== value.titleText || current.sourceHref !== value.sourceHref || !visibleElement(current.card)) { activeValue = null; return false; }
      return ['ready', 'signedout'].includes(w.matchProfileState?.status);
    }
    function placementAnchor() {
      if (surface === 'home' || surface === 'ebook') return currentValue() ? activeValue.card : null;
      if (surface === 'explore') {
        const topics = d.getElementById('explore-topics'), next = topics?.nextElementSibling, more = next === slot ? slot.nextElementSibling : next;
        return topics && more?.matches('.ref-explore-more') && visibleElement(topics) ? topics : null;
      }
      const feed = d.querySelector('[data-native-news-feed]'), articles = feed && Array.from(feed.children).filter(el => el.tagName === 'ARTICLE');
      return articles?.length >= 7 ? articles[5] : null;
    }
    function readOverlays() {
      if (overlayDirty) {
        overlayElements = Array.from(d.body.querySelectorAll('*')).filter(el => {
          if (el === slot || slot?.contains(el)) return false;
          const style = w.getComputedStyle(el);
          return style.position === 'fixed' || style.position === 'sticky' || (style.position === 'absolute' && Number(style.zIndex) > 0);
        });
        overlayDirty = false;
      }
      return overlayElements;
    }
    function fitsContentViewport(view) {
      if (surface === 'news') return true;
      let bands = [[INSET, view.height - INSET]];
      for (const el of readOverlays()) {
        if (!visibleElement(el) || !['fixed', 'sticky'].includes(w.getComputedStyle(el).position)) continue;
        const rect = rectangle(el);
        if (!rect || rect.width < Math.min(view.width, MAX_WIDTH) / 2 || rect.height <= 0 || rect.x >= view.width || rect.x + rect.width <= 0) continue;
        const start = rect.y - INSET, end = rect.y + rect.height + INSET;
        bands = bands.flatMap(([top, bottom]) => end <= top || start >= bottom ? [[top, bottom]] :
          [[top, Math.min(bottom, start)], [Math.max(top, end), bottom]].filter(([a, b]) => b > a));
      }
      return bands.some(([top, bottom]) => bottom - top >= slotHeight);
    }
    function mount(view) {
      if (!currentValue() || !fitsContentViewport(view)) return false;
      if (slot) {
        if (!slot.isConnected || !slotAnchor?.isConnected || (surface !== 'news' && slotAnchor !== placementAnchor())) return false;
        if (slot.hidden) {
          const anchorRect = rectangle(slotAnchor);
          if (!anchorRect || anchorRect.y + anchorRect.height < view.height + CONTROL_GAP) return false;
          slot.hidden = false; slot.style.removeProperty('display'); overlayDirty = true;
        }
        return true;
      }
      const anchor = placementAnchor();
      if (!anchor) return false;
      const container = surface === 'news' ? anchor.parentElement : anchor, containerRect = rectangle(container), anchorRect = rectangle(anchor);
      // Delayed consent must not insert inventory into content already being read.
      if (!containerRect || !anchorRect || containerRect.width < MIN_WIDTH || anchorRect.y + anchorRect.height < view.height + CONTROL_GAP) return false;
      slot = d.createElement('div'); slot.className = 'ma-native-news-slot'; slot.dataset.nativeNewsSlot = '';
      if (surface !== 'news') { slot.classList.add('ma-native-content-slot'); slot.dataset.nativePlacement = surface; }
      // Critical reservation is synchronous, including when the optional stylesheet fails.
      slot.style.cssText = 'box-sizing:border-box;grid-column:1 / -1;width:min(100%,640px);height:' + slotHeight + 'px;min-height:' + slotHeight + 'px;max-height:' + slotHeight + 'px;margin:' + (surface === 'news' ? 16 : CONTROL_GAP) + 'px auto;position:relative';
      if (surface !== 'news') {
        slot.style.setProperty('margin-top', CONTROL_GAP + 'px', 'important');
        slot.style.setProperty('margin-bottom', CONTROL_GAP + 'px', 'important');
      }
      fallback = d.createElement('p'); fallback.className = 'ma-native-news-neutral'; slot.append(fallback);
      translate(); showFallback(); slotAnchor = anchor; anchor.after(slot); overlayDirty = true;
      return true;
    }
    function visibleElement(el) {
      if (!el?.isConnected || el.hidden || el.closest('[hidden],[aria-hidden="true"]')) return false;
      if (typeof el.checkVisibility === 'function') {
        try { if (!el.checkVisibility({ visibilityProperty: true, opacityProperty: true })) return false; } catch (_) {}
      }
      // Some WebViews retain layout boxes for closed details content. Only
      // the first direct summary is rendered; every closed ancestor must agree.
      for (let parent = el.parentElement; parent; parent = parent.parentElement) {
        if (parent.tagName !== 'DETAILS' || parent.open) continue;
        const summary = Array.from(parent.children).find(child => child.tagName === 'SUMMARY');
        if (!summary?.contains(el)) return false;
      }
      const style = w.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.visibility !== 'collapse' && Number(style.opacity || 1) > .01 && el.getClientRects().length > 0;
    }
    function unobscured(rect) {
      if (d.fullscreenElement || typeof d.elementFromPoint !== 'function') return false;
      for (const modal of d.querySelectorAll('dialog[open],[aria-modal="true"],[role="dialog"]')) if (visibleElement(modal)) return false;
      for (const el of readOverlays()) {
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
    function separatedControls(rect) {
      if (surface === 'news') return true;
      const anchorRect = rectangle(slotAnchor), next = slot.nextElementSibling;
      if (!anchorRect || rect.y - (anchorRect.y + anchorRect.height) < CONTROL_GAP - .5) return false;
      if (next && visibleElement(next)) {
        const after = rectangle(next);
        if (after && after.y < rect.y + rect.height + CONTROL_GAP - .5) return false;
      }
      for (const control of d.querySelectorAll('button,a[href],input,select,textarea,summary,[role="button"]')) {
        if (slot.contains(control) || !visibleElement(control)) continue;
        const other = rectangle(control);
        if (other && other.width > 0 && other.height > 0 && other.x < rect.x + rect.width + CONTROL_GAP && other.x + other.width > rect.x - CONTROL_GAP && other.y < rect.y + rect.height + CONTROL_GAP - .5 && other.y + other.height > rect.y - CONTROL_GAP + .5) return false;
      }
      return true;
    }
    function sample() {
      if (destroyed || suspended || stopped || !eligible) return;
      if (!currentValue()) { hide(); collapseContentSlot(); return; }
      const view = viewport(w, slotHeight);
      if (!view || d.visibilityState !== 'visible' || pointers.size) { hide(); return; }
      if (Date.now() < settleUntil) { hide(); schedule(250); return; }
      if (!mount(view)) { hide(); return; }
      const rect = rectangle(slot);
      if (!rect || rect.width < MIN_WIDTH || rect.width > MAX_WIDTH + .5 || Math.abs(rect.height - slotHeight) > .5 || rect.x < INSET || rect.y < INSET || rect.x + rect.width > view.width - INSET || rect.y + rect.height > view.height - INSET || !unobscured(rect) || !separatedControls(rect)) { hide(); schedule(250); return; }
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
      // fail() reports eligible:false after an owned native load/creative
      // failure. Stop requests but retain the visible reservation to avoid CLS.
      if (surface !== 'news' && value.enabled && value.status === 'unavailable' && CONTENT_LOAD_FAILURES.has(value.reason) && dimensions(value, slotHeight) && value.placementsVersion === 1 && slot && !slot.hidden && seq > 0 && currentValue()) {
        eligible = false; stopped = true; hide(); clearSchedule(); return;
      }
      if (!value.enabled || !value.eligible || !dimensions(value, slotHeight)) { eligible = false; hide(); collapseContentSlot(); clearSchedule(); return; }
      // Older Android builds only own News. They must not reserve new boxes.
      if (surface !== 'news' && value.placementsVersion !== 1) { eligible = false; hide(); collapseContentSlot(); clearSchedule(); return; }
      eligible = true;
      if (value.status === 'unavailable') { stopped = true; hide(); clearSchedule(); return; }
      if (value.status === 'disposed') { eligible = false; hide(); clearSchedule(); return; }
      if (value.status === 'ready') showFallback(true);
      else showFallback();
      schedule();
    }
    function resetAccount() {
      if (destroyed) return;
      ++valueEpoch; observedValue = false; activeValue = null; clearValuePending();
      post('reset'); hide(); collapseContentSlot(); clearSchedule(); eligible = false; stopped = false; lastHello = ''; seq = 0; pointers.clear();
      requestId = uuid(w); w.MatchAppNativeNewsDocumentId = requestId;
      if (!requestId) { suspended = true; return; }
      // The existing auth callback clears token state; wait until it has returned.
      queueHello(true);
    }
    function suspend() {
      if (destroyed || suspended) return;
      ++valueEpoch; observedValue = false; activeValue = null; clearValuePending();
      hide(); collapseContentSlot(); post('dispose'); clearSchedule(); eligible = false; suspended = true;
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
      suspend(); destroyed = true; observer?.disconnect(); newsAccount?.dispose(); listeners.splice(0).forEach(remove => remove());
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
    {
      listen(w, 'scroll', invalidate, { passive: true, capture: true });
      listen(w, 'resize', invalidate, { passive: true });
      listen(d, 'visibilitychange', () => { if (d.visibilityState === 'visible') { hello(true); invalidate(); } else { hide(); clearSchedule(); } });
      listen(d, 'pointerdown', event => { pointers.add(event.pointerId); invalidate(); }, { passive: true, capture: true });
      for (const name of ['pointerup', 'pointercancel']) listen(d, name, event => { pointers.delete(event.pointerId); invalidate(); }, { passive: true, capture: true });
      for (const name of ['focusin', 'beforetoggle', 'toggle', 'fullscreenchange']) listen(d, name, invalidate, true);
      if (w.visualViewport) for (const name of ['resize', 'scroll']) listen(w.visualViewport, name, invalidate, { passive: true });
      if (typeof w.MutationObserver === 'function') {
        function faceAnimationOnly(record) {
          if (record.type !== 'attributes' || record.attributeName !== 'class') return false;
          const target = record.target;
          if (target.closest?.('.ja-premium-face')) return true;
          const before = String(record.oldValue || '').split(/\s+/).filter(Boolean);
          const after = String(target.getAttribute?.('class') || '').split(/\s+/).filter(Boolean);
          const layer = target.tagName === 'IMG' && target.parentElement?.matches('.ma-life') &&
            (before.includes('ma-lf') || after.includes('ma-lf'));
          const host = before.includes('ma-life') || after.includes('ma-life');
          if (!layer && !host) return false;
          const animationClasses = layer ? ['on'] : ['ma-smiling', 'ma-talking', 'ma-thinking'];
          const stableClasses = classes => classes.filter(name => !animationClasses.includes(name)).sort().join(' ');
          return stableClasses(before) === stableClasses(after);
        }
        observer = new w.MutationObserver(records => {
          // Ambient Jonas face blinks swap classes inside its avatar every few
          // seconds; they never change geometry, so they must not flash the ad.
          if (records.some(record => !slot || (record.target !== slot && !slot.contains(record.target) && !faceAnimationOnly(record)))) invalidate();
        });
        observer.observe(d.body, { subtree: true, childList: true, attributes: true, attributeOldValue: true, attributeFilter: ['hidden', 'open', 'aria-hidden', 'aria-modal', 'style', 'class'] });
      }
    }
    const controller = Object.freeze({ refresh: () => queueHello(true), confirmValue, dispose, get requestId() { return requestId; } });
    w.MatchAppNativeNewsSlot = controller; hello(); return controller;
  }
  return Object.freeze({ boot, bootNewsAccount, scope, language, viewport, languages: Object.freeze(Object.keys(FALLBACK)), fallback: FALLBACK, height: HEIGHT, contentHeight: CONTENT_HEIGHT, minWidth: MIN_WIDTH, maxWidth: MAX_WIDTH });
});
