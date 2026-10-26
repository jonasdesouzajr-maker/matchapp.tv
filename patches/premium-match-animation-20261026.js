/* Premium Matching Search Animation — 2026-10-26
   Injects new markup, handles sparkles, vibration. Respects existing sound system and reduced motion.
   Does not touch matching logic. */
(function() {
  'use strict';

  function matchVibrate(pattern) {
    if (!navigator.vibrate) return;
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      navigator.vibrate(pattern);
    } catch (_) {}
  }

  let sparkleAnim = null;
  function startMatchSparkles() {
    const canvas = document.getElementById('match-sparkle-canvas');
    if (!canvas) return;
    const stage = canvas.parentElement;
    function resize() {
      canvas.width = stage.offsetWidth || 220;
      canvas.height = stage.offsetHeight || 220;
    }
    resize();
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;
    const particles = Array.from({length: 32}, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.6 + 0.5,
      vx: (Math.random() - 0.5) * 0.7,
      vy: (Math.random() - 0.5) * 0.7,
      phase: Math.random() * Math.PI * 2
    }));
    function frame() {
      ctx2d.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.phase += 0.04;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        const alpha = 0.35 + Math.sin(p.phase) * 0.35;
        ctx2d.beginPath();
        ctx2d.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx2d.fillStyle = `rgba(229,193,88,${alpha})`;
        ctx2d.fill();
      });
      sparkleAnim = requestAnimationFrame(frame);
    }
    if (sparkleAnim) cancelAnimationFrame(sparkleAnim);
    frame();
  }
  function stopMatchSparkles() {
    if (sparkleAnim) { cancelAnimationFrame(sparkleAnim); sparkleAnim = null; }
    const canvas = document.getElementById('match-sparkle-canvas');
    if (canvas) {
      const c = canvas.getContext('2d');
      if (c) c.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function injectPremiumMarkup() {
    const loadBox = document.getElementById('loading-box');
    if (!loadBox || loadBox.dataset.premiumInjected) return;
    loadBox.dataset.premiumInjected = '1';
    loadBox.innerHTML = `
      <div class="premium-match-stage">
        <canvas class="sparkle-canvas" id="match-sparkle-canvas"></canvas>
        <div class="constellation-ring"></div>
        <div class="constellation-ring"></div>
        <div class="constellation-ring"></div>
        <div class="central-orb">✨</div>
        <div class="orbit-star"></div>
        <div class="orbit-star"></div>
        <div class="orbit-star"></div>
      </div>
      <h3 id="loading-headline" data-i18n="match.loading" class="shimmer-text">Scanning the global catalog…</h3>
      <p id="loading-substep" data-i18n="match.wait">Reading your mood profile</p>
      <div class="premium-meter">
        <div id="ai-progress-bar" class="premium-meter-fill"></div>
        <span id="meter-pct" class="premium-meter-pct">0%</span>
      </div>
      <p class="loading-adnote" data-i18n="match.wait">Your next pick is on its way.</p>
    `;
  }

  function observeLoading() {
    const loadBox = document.getElementById('loading-box');
    if (!loadBox) return;
    const observer = new MutationObserver(() => {
      if (loadBox.style.display !== 'none' && loadBox.style.display !== '') {
        injectPremiumMarkup();
        if (window.playMatchAppSound) window.playMatchAppSound('primary');
        matchVibrate([40, 20, 40]);
        startMatchSparkles();
      } else {
        stopMatchSparkles();
      }
    });
    observer.observe(loadBox, { attributes: true, attributeFilter: ['style', 'hidden'] });
  }

  function observeResult() {
    const resultBox = document.getElementById('result-box');
    if (!resultBox) return;
    const observer = new MutationObserver(() => {
      if (resultBox.style.display === 'block' || !resultBox.hidden) {
        stopMatchSparkles();
        if (window.playMatchAppSound) window.playMatchAppSound('result');
        matchVibrate([60, 40, 60, 40, 100]);
      }
    });
    observer.observe(resultBox, { attributes: true, attributeFilter: ['style', 'hidden', 'class'] });
  }

  function init() {
    injectPremiumMarkup();
    observeLoading();
    observeResult();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
