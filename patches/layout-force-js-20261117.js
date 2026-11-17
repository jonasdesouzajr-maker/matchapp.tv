/* Layout force via script — overrides grid after load */
(function () {
  'use strict';
  if (/^\/(kids|private-voice|oauth)(\/|$)/.test(location.pathname)) return;
  function force() {
    var container = document.querySelector('section.container');
    if (container) {
      container.style.setProperty('display', 'flex', 'important');
      container.style.setProperty('flex-direction', 'column', 'important');
      container.style.setProperty('gap', '32px', 'important');
    }
    document.body.style.setProperty('padding-bottom', '180px', 'important');
    var halloween = document.getElementById('ma-halloween-promo');
    if (halloween) {
      halloween.style.setProperty('margin-bottom', '48px', 'important');
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', force);
  } else {
    force();
  }
  setTimeout(force, 500);
  setTimeout(force, 1500);
})();
