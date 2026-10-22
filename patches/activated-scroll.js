/* Explicit destination navigation only. History restoration and conversation
 * follow-along keep their original owners. No scroll prototypes are replaced. */
(function () {
  'use strict';
  if (window.MatchAppActivatedScroll?.ready || /^\/(kids|private-voice|oauth|android-studio)(\/|$)/.test(location.pathname)) return;
  const queued = window.MatchAppActivatedScroll?.pending;
  let interacted = !!window.MatchAppActivatedScroll?.interacted;
  let active = null;
  const reduce = () => document.documentElement.classList.contains('reduce-motion') ||
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  function enabled() {
    try { return window.MatchAppScrollGate?.canAutoScroll?.() !== false; } catch (_) { return false; }
  }
  function restoring() {
    try {
      return !!window.__MATCHAPP_NATIVE_RESTORE__ || !!window.MatchAppNativePageCapture?.isRestoring?.() ||
        ['back_forward', 'reload'].includes(performance.getEntriesByType?.('navigation')?.[0]?.type);
    } catch (_) { return false; }
  }
  function resolve(target) {
    try { return typeof target === 'function' ? target() : typeof target === 'string' ? document.querySelector(target) : target; }
    catch (_) { return null; }
  }
  function visible(node) {
    if (!node?.isConnected) return false;
    for (let current = node; current; current = current.parentElement) {
      if (current.hidden || current.getAttribute('aria-hidden') === 'true') return false;
      if (current !== node && current.tagName === 'DETAILS' && !current.open && !current.querySelector('summary')?.contains(node)) return false;
      const style = getComputedStyle(current);
      if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
    }
    return node.getClientRects().length > 0;
  }
  function headerBottom() {
    const header = document.getElementById('ma-reference-header');
    if (header && visible(header)) return Math.max(0, header.getBoundingClientRect().bottom);
    let bottom = 0;
    document.querySelectorAll('#mh-topbox,#ref-explore-header,body > header').forEach(node => {
      const rect = node.getBoundingClientRect(), position = getComputedStyle(node).position;
      if (visible(node) && ['fixed', 'sticky'].includes(position) && rect.top <= 1) bottom = Math.max(bottom, rect.bottom);
    });
    return bottom;
  }
  function cancel(stopMotion = false) {
    if (!active) return;
    clearTimeout(active.timer);
    const previous = active;
    active = null;
    if (stopMotion) {
      previous.scrollers.forEach(node => node.scrollTo?.({ top: node.scrollTop, left: node.scrollLeft, behavior: 'instant' }));
      window.scrollTo({ top: window.scrollY, left: window.scrollX, behavior: 'instant' });
    }
  }
  function align(request, node, first) {
    const behavior = first && request.options.behavior !== 'auto' && request.options.behavior !== 'instant' && !reduce() ? 'smooth' : 'instant';
    const root = document.scrollingElement || document.documentElement;
    // Handle real nested vertical destinations without disturbing horizontal rails.
    for (let parent = node.parentElement; parent && parent !== root && parent !== document.body; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      if (!/(auto|scroll|overlay)/.test(style.overflowY) || parent.scrollHeight <= parent.clientHeight + 1) continue;
      const top = Math.max(0, parent.scrollTop + node.getBoundingClientRect().top - parent.getBoundingClientRect().top - parent.clientTop);
      if (Math.abs(parent.scrollTop - top) > 1) parent.scrollTo({ top, left: parent.scrollLeft, behavior });
      request.scrollers.add(parent);
    }
    // Absolute geometry avoids adding both CSS scroll-padding and scroll-margin.
    const rect = node.getBoundingClientRect();
    const desired = Math.max(0, Math.min(root.scrollHeight - window.innerHeight,
      window.scrollY + rect.top - headerBottom() - 8));
    if (Math.abs(window.scrollY - desired) > 1) window.scrollTo({ top: desired, left: window.scrollX, behavior });
    request.moved = true;
  }
  function step(request) {
    if (active !== request || !enabled() || (request.options.initial && restoring())) { if (active === request) cancel(); return; }
    const node = resolve(request.target), now = Date.now();
    if (visible(node)) {
      if (!request.moved || now >= request.correctAfter) {
        align(request, node, !request.moved);
        request.correctAfter = now + (request.moved && request.first ? 480 : 120);
        request.first = false;
      }
    }
    if (now < request.deadline) request.timer = setTimeout(() => { try { step(request); } catch (_) { cancel(); } }, 120);
    else cancel();
  }
  function toStart(target, options = {}) {
    if (!enabled() || (options.initial && (interacted || restoring()))) return true;
    cancel();
    const request = { target, options, deadline: Date.now() + 1800, correctAfter: 0, first: true, moved: false, scrollers: new Set() };
    active = request;
    try { step(request); } catch (_) { cancel(); }
    return true;
  }
  window.MatchAppActivatedScroll = Object.freeze({ ready: true, toStart, cancel: () => cancel(true), headerBottom });
  ['wheel', 'touchstart', 'pointerdown'].forEach(type => document.addEventListener(type, () => { interacted=true; cancel(true); }, { capture: true, passive: true }));
  document.addEventListener('keydown', event => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Tab', 'Escape'].includes(event.key)) { interacted=true; cancel(true); }
  }, true);
  window.addEventListener('popstate', () => cancel());
  window.addEventListener('pagehide', () => cancel());
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancel(); });
  // A second activation of the same fragment does not emit hashchange.
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    let url;
    try { url = new URL(link.href, location.href); } catch (_) { return; }
    if (!url.hash || url.hash === '#' || url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search) return;
    // Preserve the link's own route/reveal handler and the browser's hash entry.
    setTimeout(() => {
      if (typeof window.MatchCinemaShell?.revealHash === 'function') window.MatchCinemaShell.revealHash(false);
      else {
        let id; try { id = decodeURIComponent(url.hash.slice(1)); } catch (_) { return; }
        toStart(() => document.getElementById(id));
      }
    }, 0);
  });
  if (queued) toStart(queued.target, queued.options);
})();
