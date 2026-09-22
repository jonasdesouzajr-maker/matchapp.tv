/* ============================================================
   MatchApp Kids joy (2026-09-22): a short, playful celebration when a
   Kids match opens, plus a quick wiggle on the match buttons.
   Bounded by design: 16 small CSS shapes, transform/opacity only,
   ~1.2 s, removed after 1.7 s or immediately when the result closes.
   No requestAnimationFrame, no loops, no observers. Skipped for reduced
   motion, the "pause the magic" switch and hidden tabs. The Kids-wide
   stability lock in kids.css stays in place; only these classes animate.
   ============================================================ */
(function () {
  'use strict';
  if (window.__kidsJoy) return;
  window.__kidsJoy = true;
  const BITS = 16;
  const COLORS = ['#ffcf3f', '#ff7ab6', '#58d6ff', '#7cf29a', '#b58cff', '#ff9f45'];
  const SHAPES = ['star', 'dot', 'bar'];
  let clearTimer = null, rollTimer = null;
  function calm() {
    try {
      return document.hidden
        || document.body.classList.contains('kids-paused')
        || document.documentElement.classList.contains('reduce-motion')
        || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (_) { return true; }
  }
  function installStyles() {
    if (document.getElementById('kids-joy-style')) return;
    const s = document.createElement('style');
    s.id = 'kids-joy-style';
    s.textContent = [
      '.kids-watch-dialog .kids-joy{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:4;contain:strict}',
      '.kids-watch-dialog .kids-joy .kids-joy-bit{position:absolute;left:50%;top:var(--oy,210px);width:12px;height:12px;border-radius:3px;opacity:0;transform:translate(-50%,-50%) scale(.2);animation:kidsJoyBurst 1.2s cubic-bezier(.18,.72,.25,1) both!important}',
      '.kids-watch-dialog .kids-joy .kids-joy-dot{border-radius:50%}',
      '.kids-watch-dialog .kids-joy .kids-joy-bar{width:7px;height:16px;border-radius:4px}',
      '.kids-watch-dialog .kids-joy .kids-joy-star{width:17px;height:17px;border-radius:0;clip-path:polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)}',
      '@keyframes kidsJoyBurst{0%{opacity:0;transform:translate(-50%,-50%) scale(.2) rotate(0deg)}12%{opacity:1}72%{opacity:1}100%{opacity:0;transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(1) rotate(var(--r))}}',
      '.kids-watch-dialog .kids-result-art.kids-joy-pop{transform-origin:50% 60%;animation:kidsJoyPop .56s cubic-bezier(.2,.9,.3,1.3) both!important}',
      '@keyframes kidsJoyPop{0%{transform:scale(.86)}60%{transform:scale(1.04)}100%{transform:scale(1)}}',
      '.kids-watch-dialog #kids-watch-name.kids-joy-hop{display:inline-block;animation:kidsJoyHop .6s ease-out 2!important}',
      '@keyframes kidsJoyHop{0%,100%{transform:translateY(0)}40%{transform:translateY(-7px)}}',
      'body #kids-match-submit.kids-joy-roll,body #kids-surprise.kids-joy-roll{animation:kidsJoyRoll .7s ease-in-out both!important}',
      '@keyframes kidsJoyRoll{0%,100%{transform:rotate(0deg) scale(1)}20%{transform:rotate(-3deg) scale(1.04)}45%{transform:rotate(3deg) scale(1.06)}70%{transform:rotate(-2deg) scale(1.03)}}',
      '@media (prefers-reduced-motion:reduce){.kids-watch-dialog .kids-joy{display:none!important}.kids-watch-dialog .kids-result-art.kids-joy-pop,.kids-watch-dialog #kids-watch-name.kids-joy-hop,body #kids-match-submit.kids-joy-roll,body #kids-surprise.kids-joy-roll{animation:none!important}}',
      'body.kids-paused .kids-watch-dialog .kids-joy{display:none!important}',
      'body.kids-paused .kids-watch-dialog .kids-result-art.kids-joy-pop,body.kids-paused .kids-watch-dialog #kids-watch-name.kids-joy-hop,body.kids-paused #kids-match-submit.kids-joy-roll,body.kids-paused #kids-surprise.kids-joy-roll{animation:none!important}'
    ].join('\n');
    document.head.appendChild(s);
  }
  function clear() {
    if (clearTimer) { clearTimeout(clearTimer); clearTimer = null; }
    document.querySelectorAll('.kids-joy').forEach(n => n.remove());
    document.querySelectorAll('.kids-joy-pop').forEach(n => n.classList.remove('kids-joy-pop'));
    document.querySelectorAll('.kids-joy-hop').forEach(n => n.classList.remove('kids-joy-hop'));
  }
  function burst() {
    clear();
    if (calm()) return;
    const dialog = document.getElementById('kids-watch-dialog');
    if (!dialog || !dialog.open) return;
    const art = dialog.querySelector('.kids-result-art');
    const originY = art ? Math.round(art.offsetTop + Math.min(art.offsetHeight || 0, 320) / 2) : 210;
    const layer = document.createElement('div');
    layer.className = 'kids-joy';
    layer.setAttribute('aria-hidden', 'true');
    layer.style.setProperty('--oy', Math.max(90, originY) + 'px');
    for (let i = 0; i < BITS; i++) {
      const bit = document.createElement('i');
      bit.className = 'kids-joy-bit kids-joy-' + SHAPES[i % SHAPES.length];
      const angle = (i / BITS) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
      const dist = 70 + Math.random() * 80;
      bit.style.setProperty('--dx', (Math.cos(angle) * dist).toFixed(1) + 'px');
      bit.style.setProperty('--dy', (Math.sin(angle) * dist - 24).toFixed(1) + 'px');
      bit.style.setProperty('--r', Math.round((Math.random() - 0.5) * 300) + 'deg');
      bit.style.background = COLORS[i % COLORS.length];
      bit.style.animationDelay = ((i % 4) * 45) + 'ms';
      layer.appendChild(bit);
    }
    dialog.appendChild(layer);
    if (art) art.classList.add('kids-joy-pop');
    const name = document.getElementById('kids-watch-name');
    if (name) name.classList.add('kids-joy-hop');
    clearTimer = setTimeout(clear, 1700);
  }
  function roll(button) {
    if (!button || calm()) return;
    button.classList.remove('kids-joy-roll');
    void button.offsetWidth; // restart the one-shot wiggle
    button.classList.add('kids-joy-roll');
    clearTimeout(rollTimer);
    rollTimer = setTimeout(() => button.classList.remove('kids-joy-roll'), 760);
  }
  function boot() {
    installStyles();
    document.addEventListener('matchapp:kids-result', () => { try { burst(); } catch (_) { clear(); } });
    const dialog = document.getElementById('kids-watch-dialog');
    if (dialog) dialog.addEventListener('close', clear);
    document.addEventListener('submit', e => { if (e.target && e.target.id === 'kids-match-form') roll(document.getElementById('kids-match-submit')); }, true);
    document.addEventListener('click', e => { const b = e.target && e.target.closest ? e.target.closest('#kids-surprise') : null; if (b) roll(b); }, true);
    document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
    addEventListener('pagehide', clear);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
