/* Click responsiveness — 2026-11-17
   Removes 300ms tap delay, marks interactive targets, and defers non-critical work.
   Does not touch AdSense, matching, or protected surfaces. */
(function () {
  'use strict';
  if (window.top !== window) return;
  if (/^\/(kids|private-voice|oauth)(\/|$)/.test(location.pathname)) return;

  var style = document.createElement('style');
  style.textContent = `
    a, button, [role="button"], [data-click], .premium-card, [class*="cta"] {
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }
    a:active, button:active, [role="button"]:active {
      transform: scale(0.98);
    }
    @media (prefers-reduced-motion: reduce) {
      a:active, button:active { transform: none; }
    }
  `;
  document.head.appendChild(style);

  // Mark interactive elements early so the browser can optimize hit testing.
  function markInteractive() {
    var targets = document.querySelectorAll('a, button, [role="button"]');
    for (var i = 0; i < targets.length; i++) {
      if (!targets[i].hasAttribute('data-interactive')) {
        targets[i].setAttribute('data-interactive', '1');
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', markInteractive, { once: true });
  } else {
    markInteractive();
  }

  // Defer non-critical image decoding until idle.
  if ('requestIdleCallback' in window) {
    requestIdleCallback(function () {
      document.querySelectorAll('img[loading="lazy"]').forEach(function (img) {
        if (!img.complete) img.decoding = 'async';
      });
    }, { timeout: 2000 });
  }
})();
