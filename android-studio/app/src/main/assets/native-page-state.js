/* Android recreation state: allowlisted choices and scroll only; no private fields or new matches. */
(function () {
  'use strict';
  if (window.top !== window || !window.MatchAppNativePageState ||
      !/^https:\/\/(?:www\.)?matchapp\.tv$/.test(location.origin) ||
      /^\/(?:kids|oauth|private-voice)(?:\/|$)/.test(location.pathname)) return;
  if (window.MatchAppNativePageCapture) {
    window.MatchAppNativePageCapture.restore();
    return;
  }
  var ids = {'q-category':'cat','q-mood':'mood','q-platform':'plat','q-genre':'genre',
    'q-vibe':'vibe','q-decade':'decade','q-rating':'rating'};
  var restoring = false, timer = 0, scrollTimer = 0, pendingScroll = null;

  function capture() {
    if (restoring || document.readyState === 'loading') return;
    var filters = {}, criteria = typeof window.getMatchCriteria === 'function' ? window.getMatchCriteria() : null;
    Object.keys(ids).forEach(function (id) {
      var select = document.getElementById(id);
      if (!select || select.tagName !== 'SELECT') return;
      var allowed = Array.from(select.options, function (option) { return option.value; });
      var values = criteria && Array.isArray(criteria[ids[id]]) ? criteria[ids[id]] :
        Array.from(select.selectedOptions, function (option) { return option.value; });
      filters[id] = values.filter(function (value) {
        return typeof value === 'string' && value.length <= 128 && allowed.indexOf(value) >= 0;
      }).slice(0, 40);
    });
    var state = {version:1,url:location.href,filters:filters,scrollX:Math.round(window.scrollX || 0),
      scrollY:Math.round(window.scrollY || 0),lang:String(window.MATCH_LANG || document.documentElement.lang || '')};
    try { window.MatchAppNativePageState.postMessage(JSON.stringify(state)); } catch (_) {}
  }

  function cancelRestore() {
    var wasPending = pendingScroll || window.__MATCHAPP_NATIVE_RESTORE__;
    delete window.__MATCHAPP_NATIVE_RESTORE__;
    pendingScroll = null;
    clearTimeout(scrollTimer);
    restoring = false;
    if (wasPending) capture();
  }

  function restoreScroll() {
    var pending = pendingScroll;
    if (!pending || document.readyState !== 'complete') return;
    if (pending.url !== location.href) { cancelRestore(); capture(); return; }
    if (!pending.deadline) pending.deadline = Date.now() + 1500;
    var root = document.scrollingElement || document.documentElement;
    var maxX = Math.max(0, root.scrollWidth - window.innerWidth);
    var maxY = Math.max(0, root.scrollHeight - window.innerHeight);
    // Images and asynchronous history rendering can add height after parsing.
    // Keep the snapshot until layout is ready, rather than capturing a clamp to 0.
    if ((pending.x > maxX || pending.y > maxY) && Date.now() < pending.deadline) {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(restoreScroll, 50);
      return;
    }
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (pendingScroll !== pending) return;
        if (pending.url !== location.href) { cancelRestore(); capture(); return; }
        window.scrollTo(pending.x, pending.y);
        pendingScroll = null;
        restoring = false;
        capture();
      });
    });
  }

  function restore() {
    if (document.readyState === 'loading') return;
    if (pendingScroll) { restoreScroll(); return; }
    var state = window.__MATCHAPP_NATIVE_RESTORE__;
    if (!state || state.version !== 1 || state.url !== location.href) { capture(); return; }
    delete window.__MATCHAPP_NATIVE_RESTORE__;
    restoring = true;
    pendingScroll = {url:state.url,x:Math.max(0, Number(state.scrollX) || 0),y:Math.max(0, Number(state.scrollY) || 0)};
    var patch = {};
    Object.keys(ids).forEach(function (id) {
      var select = document.getElementById(id), values = state.filters && state.filters[id];
      if (!select || select.tagName !== 'SELECT' || !Array.isArray(values)) return;
      var allowed = Array.from(select.options, function (option) { return option.value; });
      patch[ids[id]] = values.filter(function (value) { return allowed.indexOf(value) >= 0; });
      if (typeof window.setMatchCriteria !== 'function') {
        Array.from(select.options).forEach(function (option) { option.selected = patch[ids[id]].indexOf(option.value) >= 0; });
        select.dispatchEvent(new Event('change', {bubbles:true}));
      }
    });
    // The existing criteria owner applies presentation choices; it never generates a result.
    if (Object.keys(patch).length && typeof window.setMatchCriteria === 'function') window.setMatchCriteria(patch);
    restoreScroll();
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(capture, 120); }
  window.MatchAppNativePageCapture = {capture:capture,restore:restore,cancelRestore:cancelRestore,
    isRestoring:function () { return !!(restoring || pendingScroll || window.__MATCHAPP_NATIVE_RESTORE__); }};
  document.addEventListener('matchapp:criteriachange', capture);
  document.addEventListener('matchapp:langchange', capture);
  document.addEventListener('change', function (event) { if (event.target && ids[event.target.id]) schedule(); });
  window.addEventListener('scroll', schedule, {passive:true});
  ['pointerdown','touchstart','wheel','keydown'].forEach(function (type) {
    document.addEventListener(type, cancelRestore, {capture:true,passive:true});
  });
  window.addEventListener('popstate', cancelRestore);
  window.addEventListener('hashchange', cancelRestore);
  window.addEventListener('load', restoreScroll);
  window.addEventListener('pagehide', function () { cancelRestore(); capture(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) capture(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', restore, {once:true});
  else restore();
})();
