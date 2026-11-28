/* Smart Android Play Store prompt — 2026-11-23
   Appears periodically or after engagement while browsing the web version.
   Positions near the current viewport / recent interaction.
   Official logo + artwork, strong CTA, dismissible with X.
   Does not touch AdSense, matching logic, or protected systems. */
(function () {
  'use strict';
  if (window.top !== window) return;
  if (/MatchApp(?:TV|Ai(?:Kids)?)Android\//.test(navigator.userAgent)) return;
  if (/^\/(kids|private-voice|oauth)(\/|$)|^\/(callback|confirm)\.html$/.test(location.pathname)) return;
  if (document.getElementById('ma-smart-play-prompt')) return;
  // Home already owns a localized, accessibility-tested Google Play invitation.
  // Keep a single CTA owner; this richer prompt serves Explore and other adult pages.
  if (/^\/(?:index\.html)?$/.test(location.pathname) &&
      document.querySelector('script[data-browser-install-offer="1"]')) return;

  const STORE = 'https://play.google.com/store/apps/details?id=com.jonas.papercup';
  const ICON = '/assets/brand/matchapp-ai-icon-192.png';
  const KEY = 'ma-smart-play-v1';
  const MAX_SHOWS = 4;
  const COOLDOWNS = [0, 4 * 60 * 1000, 12 * 60 * 1000, 25 * 60 * 1000]; // ms after each dismiss

  let state = { shows: 0, next: 0 };
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) || '{}');
    if (saved && Number.isFinite(saved.shows)) state.shows = Math.min(MAX_SHOWS, saved.shows);
    if (Number.isFinite(saved.next)) state.next = saved.next;
  } catch (_) {}

  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {} }
  function now() { return Date.now(); }
  function isAndroid() {
    const ua=navigator.userAgent||'',platform=navigator.platform||'';
    if(/Android/i.test(ua)||navigator.userAgentData?.platform==='Android')return true;
    return /Linux/i.test(ua)&&/Chrome\//i.test(ua)&&/^Linux (?:arm|aarch64)/i.test(platform)&&Number(navigator.maxTouchPoints||0)>1&&!!window.matchMedia?.('(pointer: coarse)').matches;
  }
  if (!isAndroid()) return; // Focus on Android web visitors

  let clicks = 0;
  let lastClick = null;
  let timer = null;
  let shown = false;

  function hasVisibleDialog() {
    // Hidden modal shells remain in the live page DOM with role="dialog".
    // Only a dialog that is actually visible should suppress the promotion.
    const candidates = document.querySelectorAll('dialog[open], [role="dialog"]:not([hidden])');
    return Array.from(candidates).some(dialog => {
      for (let node = dialog; node && node.nodeType === 1; node = node.parentElement) {
        if (node.hasAttribute('hidden') || node.hasAttribute('inert')) return false;
        const style = window.getComputedStyle(node);
        const opacity = Number.parseFloat(style.opacity);
        if (style.display === 'none' || style.visibility === 'hidden' ||
            style.visibility === 'collapse' || (Number.isFinite(opacity) && opacity <= 0)) return false;
      }
      return true;
    });
  }

  function canShow() {
    return state.shows < MAX_SHOWS && now() >= state.next && !shown &&
      document.visibilityState === 'visible' && !hasVisibleDialog();
  }

  function positionNear(el) {
    // Prefer near recent click if in viewport, else bottom-right of current view
    const vw = window.innerWidth, vh = window.innerHeight;
    let bottom = 24, right = 16;
    if (lastClick && lastClick.time > now() - 8000) {
      const y = lastClick.y;
      if (y > 120 && y < vh - 180) {
        bottom = Math.max(16, vh - y - 40);
      }
    }
    // Avoid header and any dock
    const header = document.querySelector('.app-header, #ma-reference-header, header');
    if (header) {
      const hb = header.getBoundingClientRect().bottom;
      if (hb > vh - bottom - 120) bottom = Math.max(16, vh - hb - 140);
    }
    return { bottom, right };
  }

  function show() {
    if (!canShow() || document.getElementById('ma-smart-play-prompt')) return;
    shown = true;
    state.shows++;
    save();

    const pos = positionNear();
    const bubble = document.createElement('aside');
    bubble.id = 'ma-smart-play-prompt';
    bubble.setAttribute('role', 'complementary');
    bubble.setAttribute('aria-label', 'Download the official MatchApp Ai Android app');
    bubble.innerHTML = `
      <button type="button" class="ma-spp-close" aria-label="Close">×</button>
      <div class="ma-spp-art">
        <img src="${ICON}" alt="MatchApp Ai official app icon" width="56" height="56">
        <div class="ma-spp-playbadge" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22"><path fill="#4285F4" d="M3.6 2.4c-.4.3-.6.8-.6 1.4v16.4c0 .6.2 1.1.6 1.4l.1.1 9.2-9.2v-.2L3.7 2.3l-.1.1z"/><path fill="#34A853" d="M16.4 14.1l-3.5-3.5v-.2l3.5-3.5.1.1 4.1 2.3c1.2.7 1.2 1.8 0 2.5l-4.1 2.3-.1 0z"/><path fill="#FBBC04" d="M16.5 14.1l-3.6-3.6L3.6 21.6c.4.4 1.1.5 1.8.1l11.1-7.6z"/><path fill="#EA4335" d="M16.5 9.9L5.4 2.3c-.7-.4-1.4-.3-1.8.1L12.9 12l3.6-3.1z"/></svg>
        </div>
      </div>
      <div class="ma-spp-copy">
        <strong>Maximize your MatchApp Ai</strong>
        <span>Official Android app · Smoother matching · Richer Jonas voice · Offline posters · Full cinematic experience</span>
      </div>
      <a class="ma-spp-cta" href="${STORE}" target="_blank" rel="noopener noreferrer">
        Get it free on Google Play
      </a>
    `;

    const style = document.createElement('style');
    style.textContent = `
      #ma-smart-play-prompt {
        position: fixed;
        z-index: 48;
        bottom: ${pos.bottom}px;
        right: ${pos.right}px;
        width: min(340px, calc(100vw - 32px));
        background: linear-gradient(160deg, rgba(18,10,32,.96), rgba(42,18,62,.96));
        border: 1px solid rgba(229,193,88,.5);
        border-radius: 22px;
        padding: 18px 16px 16px;
        color: #f9f3e6;
        font-family: Inter, system-ui, sans-serif;
        box-shadow: 0 16px 48px rgba(0,0,0,.5), 0 0 0 1px rgba(229,193,88,.2);
        display: flex;
        flex-direction: column;
        gap: 12px;
        animation: ma-spp-pop .4s cubic-bezier(.2,.8,.2,1);
        backdrop-filter: blur(8px);
      }
      @keyframes ma-spp-pop {
        from { opacity: 0; transform: translateY(20px) scale(.94); }
        to { opacity: 1; transform: none; }
      }
      #ma-smart-play-prompt .ma-spp-close {
        position: absolute; top: 10px; right: 12px;
        background: transparent; border: 0; color: #f9f3e6;
        font-size: 22px; line-height: 1; cursor: pointer; padding: 6px 8px; border-radius: 10px;
      }
      #ma-smart-play-prompt .ma-spp-close:hover { background: rgba(255,255,255,.12); }
      #ma-smart-play-prompt .ma-spp-art {
        display: flex; align-items: center; gap: 12px;
      }
      #ma-smart-play-prompt .ma-spp-art img {
        width: 56px; height: 56px; border-radius: 14px; object-fit: cover;
        box-shadow: 0 4px 12px rgba(0,0,0,.35);
      }
      #ma-smart-play-prompt .ma-spp-playbadge { flex-shrink: 0; }
      #ma-smart-play-prompt .ma-spp-copy strong {
        display: block; font-size: 17px; font-weight: 800; color: #e5c158; letter-spacing: .01em;
      }
      #ma-smart-play-prompt .ma-spp-copy span {
        display: block; font-size: 13.5px; line-height: 1.4; opacity: .9; margin-top: 4px;
      }
      #ma-smart-play-prompt .ma-spp-cta {
        display: block; text-align: center;
        background: linear-gradient(90deg, #1a73e8, #34a853);
        color: #fff; font-weight: 800; font-size: 15.5px;
        padding: 13px 16px; border-radius: 14px; text-decoration: none;
        box-shadow: 0 6px 20px rgba(26,115,232,.45); letter-spacing: .02em;
      }
      #ma-smart-play-prompt .ma-spp-cta:hover { filter: brightness(1.1); }
      #ma-smart-play-prompt .ma-spp-cta:active { transform: scale(.98); }
      @media (max-width: 520px) {
        #ma-smart-play-prompt { left: 12px; right: 12px; width: auto; bottom: 20px; }
      }
      @media (prefers-reduced-motion: reduce) {
        #ma-smart-play-prompt { animation: none; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(bubble);

    bubble.querySelector('.ma-spp-close').addEventListener('click', () => {
      bubble.remove();
      shown = false;
      state.next = now() + (COOLDOWNS[state.shows] || 30 * 60 * 1000);
      save();
      schedule();
    }, { once: true });

    // Auto-schedule next if not closed
    setTimeout(() => {
      if (bubble.isConnected) {
        bubble.remove();
        shown = false;
        state.next = now() + (COOLDOWNS[state.shows] || 30 * 60 * 1000);
        save();
        schedule();
      }
    }, 18000);
  }

  function schedule() {
    clearTimeout(timer);
    if (state.shows >= MAX_SHOWS) return;
    const delay = Math.max(8000, state.next - now());
    timer = setTimeout(() => { if (canShow()) show(); else schedule(); }, delay);
  }

  // Engagement triggers
  document.addEventListener('click', (e) => {
    if (e.target.closest('#ma-smart-play-prompt')) return;
    clicks++;
    lastClick = { x: e.clientX, y: e.clientY, time: now() };
    if (clicks >= 7 && canShow()) {
      clicks = 0;
      setTimeout(show, 600);
    }
  }, { passive: true, capture: true });

  // Start schedule
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { setTimeout(schedule, 2000); }, { once: true });
  } else {
    setTimeout(schedule, 2000);
  }

  window.addEventListener('appinstalled', () => { state.shows = MAX_SHOWS; save(); clearTimeout(timer); });
})();
