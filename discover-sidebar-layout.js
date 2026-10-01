/* Keep conversation controls below the responsive shared header. UI only. */
(function () {
  'use strict';
  function mount() {
    const body = document.body;
    const header = document.querySelector('header.app-header');
    if (!body?.classList.contains('ai-chat-page') || !header) return;
    let last = '';
    function measure() {
      const bottom = header.getBoundingClientRect().bottom;
      if (!Number.isFinite(bottom) || bottom <= 0) return;
      const next = Math.ceil(bottom + 8) + 'px';
      if (next !== last) {
        body.style.setProperty('--ai-sidebar-top', next);
        last = next;
      }
    }
    measure();
    if (typeof ResizeObserver === 'function') new ResizeObserver(measure).observe(header);
    window.addEventListener('resize', measure, { passive: true });
    document.addEventListener('matchapp:langchange', () => requestAnimationFrame(measure));
    requestAnimationFrame(measure);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
}());
