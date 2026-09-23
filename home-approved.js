/* Approved Home chrome — 2026-09-23 ui2. Idempotent overlay only. */
(function () {
  'use strict';
  if (!document.getElementById('ma-events-cover-css')) {
    var ev = document.createElement('link');
    ev.id = 'ma-events-cover-css';
    ev.rel = 'stylesheet';
    ev.href = '/events-cover.css?v=20260923-events1';
    (document.head || document.documentElement).appendChild(ev);
  }
  if (document.documentElement.getAttribute('data-ma-approved') === '2') return;
  document.documentElement.setAttribute('data-ma-approved', '2');
  if (!document.getElementById('ma-approved-css')) {
    var link = document.createElement('link');
    link.id = 'ma-approved-css';
    link.rel = 'stylesheet';
    link.href = '/home-approved.css?v=20260923-ui2';
    (document.head || document.documentElement).appendChild(link);
  }
  function kids() {
    return location.pathname.indexOf('/kids') === 0 || (document.body && document.body.classList.contains('kids-body'));
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
      var tab = document.getElementById('ma-tab-ask');
      if (tab) tab.click();
      var ask = document.querySelector('.ma-concierge, .top-ask-wrap, #top-ask');
      if (ask) ask.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  function mountInstall() {
    if (kids() || document.getElementById('ma-install-chip')) return;
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return;
    if (window.matchMedia && window.matchMedia('(min-width:901px)').matches) return;
    var chip = document.createElement('div');
    chip.id = 'ma-install-chip';
    chip.innerHTML = '<img src="/assets/brand/matchapp-ai-install-192.png" width="28" height="28" alt="">' +
      '<span>Install app</span><button type="button" class="ma-install-go">Install</button>';
    document.body.insertBefore(chip, document.body.firstChild);
    chip.querySelector('.ma-install-go').addEventListener('click', function () {
      var btn = document.querySelector('.chrome-install-now, .install-btn, #chrome-install-card button');
      if (btn) btn.click();
    });
  }
  function mountDock() {
    if (kids() || document.getElementById('ma-dock')) return;
    if (!document.body || !document.body.classList.contains('page-home')) return;
    var dock = document.createElement('nav');
    dock.id = 'ma-dock';
    dock.setAttribute('aria-label', 'MatchApp');
    dock.innerHTML =
      '<a class="ma-dock-home is-on" href="/">Home</a>' +
      '<button type="button" class="ma-dock-ask" id="ma-dock-ask">Ask</button>' +
      '<a class="ma-dock-together" href="/friends.html">Together</a>' +
      '<a class="ma-dock-you" href="/profile.html" id="ma-dock-you">You</a>';
    document.body.appendChild(dock);
    dock.querySelector('#ma-dock-ask').addEventListener('click', function () {
      var tab = document.getElementById('ma-tab-ask');
      if (tab) tab.click();
      var ask = document.querySelector('.ma-concierge, .top-ask-wrap');
      if (ask) ask.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  function boot() {
    mountHero();
    mountInstall();
    mountDock();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  window.addEventListener('load', boot, { once: true });
})();
