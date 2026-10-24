/* MatchApp Ai KIDS — playful interactions (2026-10-24). Additive, visual only.
   Never touches allowlist, age bands, guardian/PIN or content filters.
   Does nothing animated when reduced motion, Pause magic or .reduce-motion is on. */
(function () {
  'use strict';
  if (!document.body || !(document.body.classList.contains('page-kids') || document.body.classList.contains('kids-guide-page'))) return;
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function calm() {
    return (mq && mq.matches) || document.body.classList.contains('kids-paused') ||
      document.documentElement.classList.contains('reduce-motion');
  }
  var COLORS = ['#ffd65c', '#ff8fc8', '#6ff0ec', '#a8f06b', '#ffad5c', '#b79bff'];
  var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 1l2.6 8.4L23 12l-8.4 2.6L12 23l-2.6-8.4L1 12l8.4-2.6z"/></svg>';
  var live = 0;
  function burst(x, y) {
    if (calm() || live > 24) return;
    for (var i = 0; i < 8; i++) {
      var s = document.createElement('span');
      var a = (Math.PI * 2 * i) / 8 + Math.random() * 0.4;
      var d = 28 + Math.random() * 22;
      s.className = 'kp-spark';
      s.setAttribute('aria-hidden', 'true');
      s.style.left = x + 'px'; s.style.top = y + 'px';
      s.style.color = COLORS[i % COLORS.length];
      s.style.setProperty('--kx', Math.cos(a) * d + 'px');
      s.style.setProperty('--ky', Math.sin(a) * d + 'px');
      s.innerHTML = STAR;
      document.body.appendChild(s); live++;
      setTimeout(function (n) { return function () { n.remove(); live--; }; }(s), 800);
    }
  }
  var TARGETS = '.kids-chip,.kids-primary,#kids-match-submit,#kids-surprise,.kids-card button,.kids-guide-page .matcher-link,.kids-guide-page .kp-guide-nav a,.kids-guide-page .btn';
  // Mark the current page in the shared guide nav.
  var here = location.pathname;
  Array.prototype.forEach.call(document.querySelectorAll('.kp-guide-nav a'), function (a) {
    var h = a.getAttribute('href') || '';
    if (h.indexOf('#') < 0 && h === here) a.setAttribute('aria-current', 'page');
  });
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest(TARGETS) : null;
    if (!t || t.disabled) return;
    var r = t.getBoundingClientRect();
    burst(e.clientX || r.left + r.width / 2, e.clientY || r.top + r.height / 2);
  }, { passive: true });

  // Smoother discovery: gently pop new match/grid results and bring match results into view.
  function popChildren(kids) {
    if (calm()) return;
    var n = Math.min(kids.length, 12);
    for (var i = 0; i < n; i++) {
      (function (el, d) {
        el.classList.remove('kp-pop');
        el.style.animationDelay = d + 'ms';
        void el.offsetWidth;
        el.classList.add('kp-pop');
        setTimeout(function () { el.classList.remove('kp-pop'); el.style.animationDelay = ''; }, 500 + d);
      })(kids[i], i * 45);
    }
  }
  function watch(id, scroll) {
    var el = document.getElementById(id);
    if (!el || !window.MutationObserver) return;
    var timer = 0, added = [];
    new MutationObserver(function (recs) {
      recs.forEach(function (r) { for (var i = 0; i < r.addedNodes.length; i++) if (r.addedNodes[i].nodeType === 1) added.push(r.addedNodes[i]); });
      clearTimeout(timer);
      timer = setTimeout(function () {
        var fresh = added.filter(function (n) { return n.isConnected; }); added = [];
        if (!fresh.length) return;
        popChildren(fresh);
        if (scroll) {
          var r = el.getBoundingClientRect();
          if (r.top > window.innerHeight * 0.85 || r.bottom < 0) {
            el.scrollIntoView({ behavior: calm() ? 'auto' : 'smooth', block: 'nearest' });
          }
        }
      }, 60);
    }).observe(el, { childList: true });
  }
  watch('kids-match-results', true);
  watch('kids-grid', false);
  watch('kids-featured', false);
})();
