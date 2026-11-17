/* Android app download prompt — 2026-11-17
   Shown once on adult browser landing (index / explore) for non-Android-app users.
   Dismissible, respects reduced motion, uses existing visual tokens.
   Does not touch matching, ads, Kids, or protected surfaces. */
(function () {
  'use strict';
  if (window.top !== window) return;
  if (/MatchAppAiAndroid\//.test(navigator.userAgent)) return;
  if (/^\/(kids|private-voice|oauth)(\/|$)/.test(location.pathname)) return;
  if (document.getElementById('ma-android-prompt')) return;
  if (sessionStorage.getItem('ma-android-prompt-dismissed')) return;

  const isLanding = /^\/(?:index\.html|explore\.html)?$/.test(location.pathname);
  if (!isLanding) return;

  const isAndroid = /Android/i.test(navigator.userAgent);
  const storeUrl = 'https://play.google.com/store/apps/details?id=com.jonas.papercup';

  function inject() {
    const bar = document.createElement('div');
    bar.id = 'ma-android-prompt';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Get the MatchApp Ai Android app');
    bar.innerHTML = `
      <div class="ma-android-prompt-inner">
        <div class="ma-android-prompt-copy">
          <strong>Get the MatchApp Ai app</strong>
          <span>Faster matches, Jonas voice, and the full experience on Android.</span>
        </div>
        <a class="ma-android-prompt-cta" href="${storeUrl}" target="_blank" rel="noopener noreferrer">
          ${isAndroid ? 'Open in Play Store' : 'Get it on Google Play'}
        </a>
        <button type="button" class="ma-android-prompt-dismiss" aria-label="Dismiss">×</button>
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      #ma-android-prompt {
        position: sticky;
        top: 0;
        z-index: 40;
        background: linear-gradient(90deg, rgba(18,10,32,.96), rgba(40,20,60,.96));
        border-bottom: 1px solid rgba(229,193,88,.35);
        color: #f8f1e0;
        font-family: Inter, system-ui, sans-serif;
        font-size: 14px;
        box-shadow: 0 4px 20px rgba(0,0,0,.35);
      }
      #ma-android-prompt .ma-android-prompt-inner {
        display: flex;
        align-items: center;
        gap: 12px;
        max-width: 1200px;
        margin: 0 auto;
        padding: 10px 16px;
        flex-wrap: wrap;
      }
      #ma-android-prompt .ma-android-prompt-copy {
        flex: 1 1 220px;
        min-width: 0;
      }
      #ma-android-prompt .ma-android-prompt-copy strong {
        display: block;
        color: #e5c158;
        font-weight: 700;
        letter-spacing: .02em;
      }
      #ma-android-prompt .ma-android-prompt-cta {
        background: linear-gradient(90deg, #a86c24, #e5c158);
        color: #1a0f28;
        font-weight: 700;
        padding: 8px 16px;
        border-radius: 999px;
        text-decoration: none;
        white-space: nowrap;
        box-shadow: 0 2px 12px rgba(229,193,88,.4);
      }
      #ma-android-prompt .ma-android-prompt-cta:hover {
        filter: brightness(1.08);
      }
      #ma-android-prompt .ma-android-prompt-dismiss {
        background: transparent;
        border: 0;
        color: #f8f1e0;
        font-size: 22px;
        line-height: 1;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 8px;
      }
      #ma-android-prompt .ma-android-prompt-dismiss:hover {
        background: rgba(255,255,255,.1);
      }
      @media (max-width: 520px) {
        #ma-android-prompt .ma-android-prompt-inner { gap: 8px; padding: 8px 12px; }
        #ma-android-prompt .ma-android-prompt-cta { padding: 7px 12px; font-size: 13px; }
      }
      @media (prefers-reduced-motion: reduce) {
        #ma-android-prompt * { transition: none !important; }
      }
    `;

    document.head.appendChild(style);
    const header = document.querySelector('header, .matchapp-brand-bar, .ma-reference-header') || document.body.firstElementChild;
    if (header && header.parentNode) {
      header.parentNode.insertBefore(bar, header);
    } else {
      document.body.insertBefore(bar, document.body.firstChild);
    }

    bar.querySelector('.ma-android-prompt-dismiss').addEventListener('click', () => {
      bar.remove();
      try { sessionStorage.setItem('ma-android-prompt-dismissed', '1'); } catch (_) {}
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject, { once: true });
  } else {
    inject();
  }
})();
