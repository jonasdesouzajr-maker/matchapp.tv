/* Lumina Match — swipe-to-wind field effect on home screen only.
   Lightweight canvas particles that follow pointer velocity.
   Respects prefers-reduced-motion. */
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.documentElement.classList.contains('reduce-motion')) return;

  const app = document.getElementById('app');
  let canvas, ctx, particles = [], isSwiping = false, lastX = 0, lastY = 0, lastTime = 0;
  let raf = 0;

  function ensureCanvas() {
    if (canvas && canvas.isConnected) return;
    canvas = document.createElement('canvas');
    canvas.id = 'lm-wind';
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;';
    const stage = app.querySelector(':scope > .screen') || app;
    stage.style.position = stage.style.position || 'relative';
    stage.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resize();
  }

  function resize() {
    if (!canvas) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }

  function spawn(x, y, vx, vy) {
    const mag = Math.hypot(vx, vy);
    const count = Math.min(10, Math.max(2, mag / 6));
    for (let i = 0; i < count; i++) {
      const angle = Math.atan2(vy, vx) + (Math.random() - 0.5) * 0.7;
      const speed = mag * (0.35 + Math.random() * 0.5) + 0.8;
      particles.push({
        x: x + (Math.random() - 0.5) * 24,
        y: y + (Math.random() - 0.5) * 16,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.4,
        life: 1,
        decay: 0.01 + Math.random() * 0.008,
        size: 2.5 + Math.random() * 5,
        hue: Math.random() > 0.5 ? 270 : 180,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.18,
        leaf: Math.random() > 0.55
      });
    }
  }

  function tick() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles = particles.filter(p => p.life > 0);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.035;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.life -= p.decay;
      p.rot += p.rotSpeed;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, p.life * 0.85);
      const color = `hsla(${p.hue},70%,70%,${p.life * 0.7})`;
      if (p.leaf) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 1.3, p.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = color;
        ctx.shadowBlur = 6;
        ctx.shadowColor = `hsla(${p.hue},80%,70%,0.6)`;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    raf = requestAnimationFrame(tick);
  }

  function pointerPos(e) {
    const rect = (canvas || app).getBoundingClientRect();
    const pt = e.touches ? e.touches[0] : e;
    return { x: pt.clientX - rect.left, y: pt.clientY - rect.top };
  }

  function onDown(e) {
    if (app.dataset.screen !== 'home') return;
    isSwiping = true;
    const p = pointerPos(e);
    lastX = p.x; lastY = p.y; lastTime = performance.now();
    ensureCanvas();
    if (!raf) tick();
    if (e.pointerId != null) canvas?.setPointerCapture?.(e.pointerId);
  }

  function onMove(e) {
    if (!isSwiping || app.dataset.screen !== 'home') return;
    const p = pointerPos(e);
    const now = performance.now();
    const dt = Math.max(12, now - lastTime);
    const vx = (p.x - lastX) / dt * 14;
    const vy = (p.y - lastY) / dt * 14;
    if (Math.hypot(vx, vy) > 1.2) spawn(p.x, p.y, vx, vy);
    lastX = p.x; lastY = p.y; lastTime = now;
  }

  function onUp(e) {
    if (!isSwiping) return;
    isSwiping = false;
    const p = pointerPos(e);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      spawn(p.x, p.y, Math.cos(a) * 3.5, Math.sin(a) * 3.5);
    }
  }

  function mount() {
    if (app.dataset.screen !== 'home') {
      if (canvas) canvas.style.display = 'none';
      return;
    }
    ensureCanvas();
    canvas.style.display = '';
    resize();
  }

  const obs = new MutationObserver(mount);
  obs.observe(app, { attributes: true, attributeFilter: ['data-screen'], childList: true });

  app.addEventListener('pointerdown', onDown);
  app.addEventListener('pointermove', onMove);
  app.addEventListener('pointerup', onUp);
  app.addEventListener('pointercancel', () => isSwiping = false);
  window.addEventListener('resize', resize);
  window.addEventListener('pagehide', () => { cancelAnimationFrame(raf); obs.disconnect(); });

  mount();
})();
