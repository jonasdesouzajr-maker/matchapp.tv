/* Approved Home chrome — 2026-09-24 desktopscan1. Idempotent overlay only. */
(function () {
  'use strict';
  if (!document.getElementById('ma-discover-composer-css')) {
    var dc = document.createElement('link');
    dc.id = 'ma-discover-composer-css';
    dc.rel = 'stylesheet';
    dc.href = '/discover-composer.css?v=20260923-composer1';
    (document.head || document.documentElement).appendChild(dc);
  }
  if (!document.getElementById('ma-events-cover-css')) {
    var ev = document.createElement('link');
    ev.id = 'ma-events-cover-css';
    ev.rel = 'stylesheet';
    ev.href = '/events-cover.css?v=20260925-adult-ui2';
    (document.head || document.documentElement).appendChild(ev);
  }
  var approvedLink = document.getElementById('ma-approved-css');
  if (!approvedLink) {
    approvedLink = document.createElement('link');
    approvedLink.id = 'ma-approved-css';
    approvedLink.rel = 'stylesheet';
    (document.head || document.documentElement).appendChild(approvedLink);
  }
  approvedLink.href = '/home-approved.css?v=20260928-no-dock1';
  if (!document.getElementById('ma-install-onetap')) {
    var ot=document.createElement('script');
    ot.id='ma-install-onetap';
    ot.src='/install-onetap.js?v=20260923-onetap1';
    (document.head||document.documentElement).appendChild(ot);
  }

  function kids() {
    return location.pathname.indexOf('/kids') === 0 || (document.body && document.body.classList.contains('kids-body'));
  }
  function nativeShell() {
    return /MatchAppTVAndroid|MatchAppAiAndroid|MatchAppAiKidsAndroid/i.test(navigator.userAgent || '');
  }
  function standalone() {
    return navigator.standalone === true || !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  }
  function mountHero() {
    if (kids() || document.getElementById('ma-hero-ctas')) return;
    var host = document.querySelector('.home-hero') || (document.querySelector('h1.home-h1') && document.querySelector('h1.home-h1').parentElement);
    if (!host) return;
    var row = document.createElement('div');
    row.id = 'ma-hero-ctas';
    row.innerHTML = '<button type="button" class="ma-hero-match" id="ma-hero-match">Find my match</button>' +
      '<button type="button" class="ma-hero-ask" id="ma-hero-ask">Ask AI</button>';
    var sub = host.querySelector('.home-h1-sub') || host.querySelector('h1.home-h1');
    (sub || host).insertAdjacentElement('afterend', row);
    row.querySelector('#ma-hero-match').addEventListener('click', function () {
      var tab = document.getElementById('ma-tab-match');
      if (tab) tab.click();
      var box = document.getElementById('questionnaire-box');
      if (box) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    row.querySelector('#ma-hero-ask').addEventListener('click', function () {
      // Chat actions take precedence over the optional install promotion. A
      // regular Close tap here is session-only (never the permanent opt-out).
      document.getElementById('ma-install-offer')?.querySelector('.ma-offer-close')?.click();
      var concierge = document.getElementById('ma-concierge');
      // Previously the hero clicked a tab INSIDE a saved collapsed fold, then
      // tried to scroll to its display:none ancestor: nothing happened.
      if (concierge && concierge.classList.contains('lazy-foldable') &&
          !concierge.classList.contains('lazy-open')) {
        var fold = concierge.previousElementSibling;
        if (fold && fold.classList.contains('lazy-head')) fold.click();
        else concierge.classList.add('lazy-open');
      }
      var tab = document.getElementById('ma-tab-ask');
      if (tab) tab.click();
      var panel = document.getElementById('ma-panel-ask');
      var ask = panel && !panel.hidden
        ? (document.getElementById('search-box') || panel)
        : document.querySelector('.ma-concierge, .top-ask-wrap, #top-ask');
      if (tab && ask) {
        // Reveal the chat in the same tap. CSS/global smooth scrolling on
        // mobile used to leave the panel below the fold, appearing unresponsive.
        try { ask.scrollIntoView({ behavior: 'instant', block: 'start' }); }
        catch (_) { ask.scrollIntoView(); }
      } else {
        // If the dynamically mounted Home chat isn't present, the genuine
        // chat page still works. No dead button, even on partial mobile boot.
        window.location.assign('/discover.html');
      }
    });
  }

  // The screenshot's permanent strip is retired; the temporary visitor-only
  // choice is owned by browser-install-offer.js, never by the Android shell.
  function removeRetiredCards() {
    document.getElementById('ma-install-chip')?.remove();
    document.getElementById('chrome-install-card')?.remove();
  }

  function boot() {
    if (nativeShell()) document.documentElement.classList.add('ma-native-shell');
    if (standalone()) document.documentElement.classList.add('ma-installed');
    removeRetiredCards();
    mountHero();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  window.addEventListener('load', boot, { once: true });
})();
