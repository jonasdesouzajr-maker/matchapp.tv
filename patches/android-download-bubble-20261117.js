/* Android download bubble — 2026-11-17
   Closeable floating bubble with Play Store + MatchApp icons.
   Positions near an existing ad unit on adult landing pages.
   Does not modify AdSense markup, IDs, or initialization. */
(function () {
  'use strict';
  if (window.top !== window) return;
  if (/MatchAppAiAndroid\//.test(navigator.userAgent)) return;
  if (/^\/(kids|private-voice|oauth)(\/|$)/.test(location.pathname)) return;
  if (document.getElementById('ma-android-bubble')) return;
  if (sessionStorage.getItem('ma-android-bubble-dismissed')) return;

  const isLanding = /^\/(?:index\.html|explore\.html)?$/.test(location.pathname);
  if (!isLanding) return;

  const storeUrl = 'https://play.google.com/store/apps/details?id=com.jonas.papercup';
  const iconUrl = '/assets/brand/matchapp-ai-icon-192.png';

  function inject() {
    const bubble = document.createElement('aside');
    bubble.id = 'ma-android-bubble';
    bubble.setAttribute('role', 'complementary');
    bubble.setAttribute('aria-label', 'Download MatchApp Ai on Google Play');
    bubble.innerHTML = `
      <button type="button" class="ma-ab-close" aria-label="Close">×</button>
      <div class="ma-ab-icons">
        <img class="ma-ab-app-icon" src="${iconUrl}" alt="MatchApp Ai" width="48" height="48">
        <svg class="ma-ab-play" viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
          <path fill="#4285F4" d="M3.6 2.4c-.4.3-.6.8-.6 1.4v16.4c0 .6.2 1.1.6 1.4l.1.1 9.2-9.2v-.2L3.7 2.3l-.1.1z"/>
          <path fill="#34A853" d="M16.4 14.1l-3.5-3.5v-.2l3.5-3.5.1.1 4.1 2.3c1.2.7 1.2 1.8 0 2.5l-4.1 2.3-.1 0z"/>
          <path fill="#FBBC04" d="M16.5 14.1l-3.6-3.6L3.6 21.6c.4.4 1.1.5 1.8.1l11.1-7.6z"/>
          <path fill="#EA4335" d="M16.5 9.9L5.4 2.3c-.7-.4-1.4-.3-1.8.1L12.9 12l3.6-3.1z"/>
        </svg>
      </div>
      <div class="ma-ab-copy">
        <strong>Get MatchApp Ai</strong>
        <span>The full app on Google Play</span>
      </div>
      <a class="ma-ab-cta" href="${storeUrl}" target="_blank" rel="noopener noreferrer">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path fill="#fff" d="M3.6 2.4c-.4.3-.6.8-.6 1.4v16.4c0 .6.2 1.1.6 1.4l.1.1 9.2-9.2v-.2L3.7 2.3l-.1.1z"/>
          <path fill="#fff" d="M16.4 14.1l-3.5-3.5v-.2l3.5-3.5.1.1 4.1 2.3c1.2.7 1.2 1.8 0 2.5l-4.1 2.3-.1 0z"/>
        </svg>
        Download on Play
      </a>
    `;

    const style = document.createElement('style');
    style.textContent = `
      #ma-android-bubble {
        position: fixed;
        bottom: 88px;
        right: 16px;
        z-index: 45;
        width: min(320px, calc(100vw - 32px));
        background: linear-gradient(145deg, rgba(24,14,40,.97), rgba(48,22,72,.97));
        border: 1px solid rgba(229,193,88,.45);
        border-radius: 20px;
        padding: 16px 16px 14px;
        color: #f8f1e0;
        font-family: Inter, system-ui, sans-serif;
        box-shadow: 0 12px 40px rgba(0,0,0,.45), 0 0 0 1px rgba(229,193,88,.15);
        display: flex;
        flex-direction: column;
        gap: 10px;
        animation: ma-ab-in .35s ease-out;
      }
      @keyframes ma-ab-in {
        from { opacity: 0; transform: translateY(12px) scale(.96); }
        to { opacity: 1; transform: none; }
      }
      #ma-android-bubble .ma-ab-close {
        position: absolute;
        top: 8px;
        right: 10px;
        background: transparent;
        border: 0;
        color: #f8f1e0;
        font-size: 20px;
        line-height: 1;
        cursor: pointer;
        padding: 4px 6px;
        border-radius: 8px;
      }
      #ma-android-bubble .ma-ab-close:hover { background: rgba(255,255,255,.1); }
      #ma-android-bubble .ma-ab-icons {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      #ma-android-bubble .ma-ab-app-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        object-fit: cover;
        box-shadow: 0 2px 8px rgba(0,0,0,.3);
      }
      #ma-android-bubble .ma-ab-play {
        flex-shrink: 0;
      }
      #ma-android-bubble .ma-ab-copy strong {
        display: block;
        font-size: 16px;
        font-weight: 800;
        color: #e5c158;
        letter-spacing: .01em;
      }
      #ma-android-bubble .ma-ab-copy span {
        display: block;
        font-size: 13px;
        opacity: .85;
        margin-top: 2px;
      }
      #ma-android-bubble .ma-ab-cta {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        background: linear-gradient(90deg, #1a73e8, #34a853);
        color: #fff;
        font-weight: 800;
        font-size: 15px;
        padding: 12px 16px;
        border-radius: 12px;
        text-decoration: none;
        box-shadow: 0 4px 16px rgba(26,115,232,.4);
        letter-spacing: .02em;
      }
      #ma-android-bubble .ma-ab-cta:hover { filter: brightness(1.08); }
      #ma-android-bubble .ma-ab-cta:active { transform: scale(.98); }
      @media (max-width: 480px) {
        #ma-android-bubble { bottom: 72px; right: 12px; left: 12px; width: auto; }
      }
      @media (prefers-reduced-motion: reduce) {
        #ma-android-bubble { animation: none; }
        #ma-android-bubble * { transition: none !important; }
      }
    `;

    document.head.appendChild(style);

    // Place near an existing ad if one is visible, otherwise fixed bottom-right.
    const ad = document.querySelector('ins.adsbygoogle[data-ad-slot]');
    if (ad && ad.getBoundingClientRect().height > 40) {
      ad.parentNode.insertBefore(bubble, ad.nextSibling);
      bubble.style.position = 'relative';
      bubble.style.bottom = 'auto';
      bubble.style.right = 'auto';
      bubble.style.margin = '16px auto';
    } else {
      document.body.appendChild(bubble);
    }

    bubble.querySelector('.ma-ab-close').addEventListener('click', () => {
      bubble.remove();
      try { sessionStorage.setItem('ma-android-bubble-dismissed', '1'); } catch (_) {}
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject, { once: true });
  } else {
    inject();
  }
})();
