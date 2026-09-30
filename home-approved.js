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
  approvedLink.href = '/home-approved.css?v=20260929-hide-hero';
  if (!document.getElementById('ma-install-onetap')) {
    var ot=document.createElement('script');
    ot.id='ma-install-onetap';
    ot.src='/install-onetap.js?v=20260930-install-recovery1';
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
    // The Home hero action row was retired; discovery stays in the main matcher and AI composer.
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  window.addEventListener('load', boot, { once: true });
})();
