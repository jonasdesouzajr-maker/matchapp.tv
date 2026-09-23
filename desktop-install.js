/* Desktop OS-aware install. Phones stay on the existing PWA path. */
(function () {
  'use strict';
  if (window.__maDesktopInstall) return;
  window.__maDesktopInstall = true;
  function kidsPath() {
    return location.pathname.indexOf('/kids') === 0;
  }
  function desktopOS() {
    var ua = navigator.userAgent || '';
    var iPad = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
    if (/Windows NT/i.test(ua)) return 'windows';
    if ((/Mac OS X|Macintosh/i.test(ua)) && !iPad) return 'macos';
    return 'other';
  }
  function isDesktop() {
    return window.matchMedia && window.matchMedia('(min-width:901px)').matches && desktopOS() !== 'other';
  }
  function dest() {
    var os = desktopOS();
    if (kidsPath()) {
      if (os === 'windows') return '/kids/desktop/windows.html';
      if (os === 'macos') return '/kids/desktop/macos.html';
      return '/kids/';
    }
    if (os === 'windows') return '/desktop/windows.html';
    if (os === 'macos') return '/desktop/macos.html';
    return '/';
  }
  document.addEventListener('click', function (e) {
    if (!isDesktop()) return;
    var btn = e.target && e.target.closest && e.target.closest('.install-btn, .chrome-install-now, .ma-install-go');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    location.href = dest();
  }, true);
})();
