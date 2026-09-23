/* First tap starts install. Never ask the user to tap Install twice. */
(function () {
  'use strict';
  if (window.__maOneTapInstall) return;
  window.__maOneTapInstall = true;

  function startMeter() {
    if (window.matchAppInstallProgress && typeof window.matchAppInstallProgress.start === 'function') {
      window.matchAppInstallProgress.start();
    }
  }

  document.addEventListener('click', function (e) {
    const btn = e.target && e.target.closest && e.target.closest('.install-btn, .ma-install-go, .chrome-install-now');
    if (!btn) return;
    startMeter();
    const pending = window.__maDeferredInstall;
    if (pending && typeof pending.prompt === 'function') {
      try { pending.prompt(); } catch (_) {}
    }
  }, true);
})();
