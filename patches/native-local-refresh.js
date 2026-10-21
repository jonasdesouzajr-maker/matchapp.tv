/* Explicit adult Android refresh: repaint existing local data, never restart a match. */
(function () {
  'use strict';
  if (window.MatchAppLocalRefresh?.refresh) return;

  let pending = null;
  const unchanged = () => ({ refreshed: false, kind: 'unchanged' });

  function visible(node) {
    if (!node?.isConnected) return false;
    for (let current = node; current; current = current.parentElement) {
      if (current.hidden || current.getAttribute('aria-hidden') === 'true') return false;
      if (current.tagName === 'DETAILS' && !current.open) return false;
      const style = window.getComputedStyle(current);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
    }
    return true;
  }

  function currentView() {
    const history = document.getElementById('history-list');
    if (visible(history) && typeof window.MatchAppPortfolioHistory?.refresh === 'function') {
      return {
        host: history,
        count: document.getElementById('count-history'),
        kind: 'local-history',
        render: () => window.MatchAppPortfolioHistory.refresh() === true
      };
    }
    const activity = document.getElementById('activity-list');
    if (visible(activity) && typeof window.renderActivity === 'function' && typeof window.MatchActivity?.all === 'function') {
      return {
        host: activity,
        count: document.getElementById('activity-count'),
        kind: 'local-activity',
        render: () => { window.renderActivity(); return true; }
      };
    }
    return null;
  }

  function refreshCurrentView() {
    if (/^\/kids(?:\/|$)/.test(location.pathname)) return unchanged();
    const view = currentView();
    // A current result, edited profile, chat draft or static guide has no safe
    // read-only loader here. Leave it intact; do not claim that it was updated.
    if (!view || document.body?.classList.contains('match-searching')) return unchanged();
    if (view.host.contains(document.activeElement) || view.host.closest('[aria-busy="true"]') || view.host.querySelector('button:disabled')) return unchanged();

    const nodes = [view.host, view.count].filter(Boolean);
    const previous = nodes.map(node => ({ node, children: Array.from(node.childNodes) }));
    const scroll = [];
    for (let node = view.host; node; node = node.parentElement) {
      scroll.push({ node, top: node.scrollTop, left: node.scrollLeft });
    }
    const x = window.scrollX, y = window.scrollY;
    const restoreContents = () => previous.forEach(({ node, children }) => node.replaceChildren(...children));
    try {
      if (!view.render()) {
        restoreContents();
        return unchanged();
      }
      return { refreshed: true, kind: view.kind };
    } catch (_) {
      // The existing renderer may clear its host before an unavailable data or
      // artwork dependency throws. Retain the original nodes and their handlers.
      restoreContents();
      return { refreshed: false, kind: 'unavailable' };
    } finally {
      scroll.forEach(({ node, top, left }) => { node.scrollTop = top; node.scrollLeft = left; });
      if (window.scrollX !== x || window.scrollY !== y) window.scrollTo(x, y);
    }
  }

  window.MatchAppLocalRefresh = Object.freeze({
    refresh(_options = {}) {
      // Coalesce repeated taps. Renderers above are synchronous, local reads;
      // none generates recommendations, writes history or refreshes auth.
      if (!pending) pending = Promise.resolve().then(refreshCurrentView)
        .catch(() => ({ refreshed: false, kind: 'unavailable' }))
        .finally(() => { pending = null; });
      return pending;
    }
  });
})();
