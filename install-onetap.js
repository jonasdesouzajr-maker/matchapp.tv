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

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    window.__maDeferredInstall = e;
  });

  function promptNow() {
    const pending = window.__maDeferredInstall;
    if (!pending || window.__maPrompted || typeof pending.prompt !== 'function') return false;
    window.__maPrompted = true;
    try { pending.prompt(); } catch (_) {}
    return true;
  }

  document.addEventListener('click', function (e) {
    const btn = e.target && e.target.closest && e.target.closest('.install-btn, .ma-install-go, .chrome-install-now');
    if (!btn) return;
    startMeter();
    promptNow();
  }, true);

  function patch() {
    const orig = window.installMatchApp;
    if (!orig || orig.__onetap) return;
    window.installMatchApp = async function () {
      startMeter();
      if (promptNow() || window.__maPrompted) return;
      return orig.apply(this, arguments);
    };
    window.installMatchApp.__onetap = true;
  }
  patch();
  document.addEventListener('DOMContentLoaded', patch);
  window.addEventListener('load', patch);
})();
