/* Premium matching presentation, 2026-10-26. No matching/progress/feedback owner changes. */
(function () {
  'use strict';
  if (/^\/kids(?:\/|$)/.test(location.pathname) || window.__maPremiumMatchAnimation) return;
  function init() {
    const box = document.getElementById('loading-box');
    if (!box || document.body.classList.contains('page-kids')) return;
    window.__maPremiumMatchAnimation = true;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const link = document.createElement('link');
    link.id = 'premium-match-animation-css';
    link.rel = 'stylesheet';
    link.href = '/patches/premium-match-animation-20261026.css?v=20261026-2';
    // Upgrade only after CSS loads, retaining the usable legacy loader on failure.
    link.onload = upgrade;
    document.head.appendChild(link);

    function upgrade() {
      const stage = document.createElement('div');
      stage.className = 'premium-match-stage';
      stage.setAttribute('aria-hidden', 'true');
      stage.innerHTML = '<canvas class="sparkle-canvas" id="match-sparkle-canvas"></canvas>' +
        '<div class="constellation-ring"></div>'.repeat(3) +
        '<div class="central-orb">✦</div>' + '<div class="orbit-star"></div>'.repeat(3);
      box.prepend(stage);
      // Keep the exact progress/text nodes: core code and translations own them.
      const bar = box.querySelector('#ai-progress-bar');
      const pct = box.querySelector('#meter-pct');
      const meter = bar && bar.parentElement;
      if (meter) { meter.classList.remove('meter-shell'); meter.classList.add('premium-meter'); }
      if (bar) { bar.classList.remove('meter-fill'); bar.classList.add('premium-meter-fill'); }
      if (pct) { pct.classList.remove('meter-pct'); pct.classList.add('premium-meter-pct'); }
      box.dataset.premiumInjected = '1';
      let frameId = null;
      let ctx = null;
      const canvas = stage.querySelector('canvas');
      const particles = Array.from({length: 32}, () => ({
        x: Math.random(), y: Math.random(), r: .5 + Math.random() * 1.6,
        vx: (Math.random() - .5) * .003, vy: (Math.random() - .5) * .003,
        phase: Math.random() * Math.PI * 2
      }));
      function reduced() { return motion.matches || document.documentElement.classList.contains('reduce-motion'); }
      function visible(el) {
        if (!el || el.hidden) return false;
        const style = getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && el.getClientRects().length > 0;
      }
      function stop() {
        if (frameId !== null) cancelAnimationFrame(frameId);
        frameId = null;
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      function frame() {
        const size = stage.clientWidth;
        const scale = Math.min(window.devicePixelRatio || 1, 2);
        if (canvas.width !== Math.round(size * scale)) {
          canvas.width = canvas.height = Math.round(size * scale);
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
          p.x += p.vx; p.y += p.vy; p.phase += .04;
          if (p.x < 0 || p.x > 1) p.vx *= -1;
          if (p.y < 0 || p.y > 1) p.vy *= -1;
          ctx.beginPath(); ctx.arc(p.x * canvas.width, p.y * canvas.height, p.r * scale, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(229,193,88,${.35 + Math.sin(p.phase) * .35})`; ctx.fill();
        });
        frameId = requestAnimationFrame(frame);
      }
      function sync() {
        const active = !document.hidden && visible(box) && !visible(document.getElementById('result-box'));
        if (box.classList.contains('premium-match-active') !== active) box.classList.toggle('premium-match-active', active);
        if (!active || reduced()) { stop(); return; }
        if (frameId !== null) return;
        try { ctx = canvas.getContext('2d'); } catch (_) { return; }
        if (ctx) frame();
      }
      // Existing deliberate-action and result cues already use playMatchAppSound
      // and the sole feedback owner's sound/haptic toggles. Do not double them.
      const observer = new MutationObserver(sync);
      [box, document.getElementById('result-box'), document.body, document.documentElement].filter(Boolean).forEach(el =>
        observer.observe(el, {attributes: true, attributeFilter: ['style', 'hidden', 'class']}));
      document.addEventListener('visibilitychange', sync);
      window.addEventListener('pageshow', sync);
      window.addEventListener('pagehide', stop);
      if (motion.addEventListener) motion.addEventListener('change', sync);
      else motion.addListener(sync);
      sync();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
  else init();
})();
