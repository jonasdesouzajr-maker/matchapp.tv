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
    ev.href = '/events-cover.css?v=20260923-events2';
    (document.head || document.documentElement).appendChild(ev);
  }
  var approvedLink = document.getElementById('ma-approved-css');
  if (!approvedLink) {
    approvedLink = document.createElement('link');
    approvedLink.id = 'ma-approved-css';
    approvedLink.rel = 'stylesheet';
    (document.head || document.documentElement).appendChild(approvedLink);
  }
  approvedLink.href = '/home-approved.css?v=20260924-equalstack1';
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
  function ptBr() {
    var lang = String(document.documentElement.lang || navigator.language || 'en').toLowerCase();
    return lang.indexOf('pt') === 0;
  }
  function appName() {
    return ptBr() ? 'MatchApp iA' : 'MatchApp Ai';
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

  function triggerInstall() {
    if (typeof window.installMatchApp === 'function') {
      window.installMatchApp();
      return;
    }
    var real = document.querySelector('.install-btn:not(.ma-install-go)');
    if (real) real.click();
  }

  function mountInstall() {
    if (kids()) {
      var gone = document.getElementById('ma-install-chip');
      if (gone) gone.remove();
      return;
    }
    var installed = !!(standalone() || nativeShell() || (window.matchAppInstallState && window.matchAppInstallState.isInstalled()));
    var chip = document.getElementById('ma-install-chip');
    if (!chip) {
      chip = document.createElement('div');
      chip.id = 'ma-install-chip';
      chip.innerHTML = '<img src="/assets/brand/matchapp-ai-install-192.png?v=20260923-icon4" width="28" height="28" alt="">' +
        '<span></span><button type="button" class="ma-install-go install-btn">Install</button>';
      document.body.insertBefore(chip, document.body.firstChild);
    }
    var label = chip.querySelector('span');
    if (label) label.textContent = appName();
    var go = chip.querySelector('.ma-install-go');
    if (go) go.textContent = installed ? (ptBr() ? 'Atualizar' : 'Update') : (ptBr() ? 'Instalar' : 'Install');
    if (go && !go.dataset.wired) {
      go.dataset.wired = '1';
      go.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (installed && typeof window.updateMatchAppNow === 'function') window.updateMatchAppNow();
        else triggerInstall();
      });
    }
  }

  function mountDock() {
    if (kids() || document.getElementById('ma-dock')) return;
    if (!document.body || !document.body.classList.contains('page-home')) return;
    var dock = document.createElement('nav');
    dock.id = 'ma-dock';
    dock.setAttribute('aria-label', 'MatchApp');
    dock.innerHTML =
      '<a class="ma-dock-home is-on" href="/">Home</a>' +
      '<a class="ma-dock-ask" href="/discover.html">Ask</a>' +
      '<a class="ma-dock-together" href="/friends.html">Together</a>' +
      '<a class="ma-dock-you" href="/profile/profile.html">You</a>';
    document.body.appendChild(dock);
  }

  function boot() {
    if (nativeShell()) document.documentElement.classList.add('ma-native-shell');
    if (standalone()) document.documentElement.classList.add('ma-installed');
    function killBanner(){
      var banner=document.getElementById('chrome-install-card');
      if(!banner) return;
      banner.hidden=true;
      banner.setAttribute('hidden','');
      banner.style.setProperty('display','none','important');
      banner.style.setProperty('visibility','hidden','important');
    }
    killBanner();
    [50,200,600,1200,2500].forEach(function(ms){ setTimeout(killBanner, ms); });
    if(!document.getElementById('ma-install-pop-inline')){
      var st=document.createElement('style');
      st.id='ma-install-pop-inline';
      st.textContent='html body #chrome-install-card,html body aside#chrome-install-card{display:none!important;visibility:hidden!important;height:0!important;margin:0!important;padding:0!important}html body .install-btn,html body .ma-install-go{transform:translateZ(0) scale(1.08);box-shadow:0 0 0 2px rgba(229,193,88,.65),0 10px 26px rgba(229,193,88,.42)!important}';
      (document.head||document.documentElement).appendChild(st);
    }
    mountHero();
    mountInstall();
    mountDock();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  window.addEventListener('load', boot, { once: true });
})();
