/* MatchApp cinema layer runtime. Visual + copy only. Kids Mode is skipped. */
(function () {
  'use strict';
  if (location.pathname.indexOf('/kids/') === 0) {
    document.documentElement.setAttribute('data-kids-mode', '1');
    return;
  }

  const COPY = {
    'home.h1': 'What should you watch tonight?',
    'home.h1sub': 'Tell us the mood. We bring one title, and where it plays.',
    'topask.placeholder': 'Ask in your own words\u2026',
    'marquee.title': 'Latest titles trending right now',
    'search.heading': 'Search any title',
    'search.hint': 'Type a title for a direct match \u2014 or ask a full question.',
    'search.voiceHint': 'Or tap the mic. It listens in your language.',
    'q.title': 'Find what to watch here',
    'q.category': 'A film, a series, or something short',
    'q.platform': 'What you already have',
    'q.mood': 'Mood',
    'q.vibe': 'Pace',
    'q.era': 'When it was made',
    'q.rating': 'Who is watching',
    'q.submit': 'Find My Match',
    'opt.surprise': 'I trust you',
    'spotlight.eyebrow': 'Most anticipated premiere',
    'jump.trending': 'See what\u2019s opening',
    'tg.eyebrow': 'New \u2014 Match together',
    'how.title': 'How it works',
    'how.s1.title': 'Set the mood',
    'how.s2.title': 'Get one title',
    'how.s3.title': 'Watch it',
    'how.cta': 'Find my match \u2014 it\u2019s free'
  };

  function applyCopy() {
    const lang = String(window.MATCH_LANG || document.documentElement.lang || 'en').toLowerCase();
    if (!lang.startsWith('en')) return;
    Object.keys(COPY).forEach(function (key) {
      document.querySelectorAll('[data-i18n="' + key + '"]').forEach(function (el) {
        el.textContent = COPY[key];
      });
      document.querySelectorAll('[data-i18n-placeholder="' + key + '"]').forEach(function (el) {
        el.setAttribute('placeholder', COPY[key]);
      });
      document.querySelectorAll('[data-i18n-html="' + key + '"]').forEach(function (el) {
        el.textContent = COPY[key];
      });
    });
    const h1 = document.querySelector('.home-h1');
    if (h1) h1.textContent = COPY['home.h1'];
    const sub = document.querySelector('.home-h1-sub');
    if (sub) sub.textContent = COPY['home.h1sub'];
  }

  function humanize(value) {
    return String(value || '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function tasteStrip() {
    if (document.querySelector('.ma-taste-strip')) return;
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem('match_criteria_v1') || 'null'); } catch (_) {}
    if (!saved) return;
    const bits = [];
    ['mood', 'cat', 'plat', 'vibe'].forEach(function (k) {
      (saved[k] || []).slice(0, 2).forEach(function (v) {
        if (v && v !== 'any') bits.push(humanize(v));
      });
    });
    if (!bits.length) return;
    const host = document.createElement('div');
    host.className = 'ma-taste-strip is-on';
    host.setAttribute('aria-label', 'Last taste');
    const label = document.createElement('span');
    label.className = 'ma-taste-label';
    label.textContent = 'Last night';
    host.appendChild(label);
    bits.slice(0, 5).forEach(function (b) {
      const chip = document.createElement('span');
      chip.className = 'ma-taste-chip';
      chip.textContent = b;
      host.appendChild(chip);
    });
    const hero = document.querySelector('.home-hero') || document.querySelector('.home-h1');
    if (hero && hero.parentNode) hero.parentNode.insertBefore(host, hero.nextSibling);
  }

  function posterWhy() {
    document.querySelectorAll('.marquee-item').forEach(function (item) {
      if (item.querySelector('.ma-poster-why')) return;
      const title = (item.getAttribute('onclick') || '').replace(/^selectMarqueeItem\((['"])([\s\S]*)\1\)$/, '$2')
        || (item.querySelector('.marquee-title') || {}).textContent
        || '';
      const clean = String(title).replace(/\\"/g, '"').replace(/&quot;/g, '"').trim();
      if (!clean) return;
      const why = document.createElement('span');
      why.className = 'ma-poster-why';
      why.textContent = clean;
      item.appendChild(why);
    });
  }

  function watchReveal() {
    const box = document.getElementById('result-box');
    if (!box || box.dataset.maReveal) return;
    box.dataset.maReveal = '1';
    const mark = function () {
      const shown = box.style.display === 'block' || (box.style.display !== 'none' && box.offsetParent !== null);
      box.classList.toggle('is-revealed', shown);
      if (shown) {
        box.style.opacity = '';
        box.style.visibility = 'visible';
      }
    };
    mark();
    new MutationObserver(mark).observe(box, { attributes: true, attributeFilter: ['style', 'class'] });
  }

  function replaceAskEmoji() {
    const icon = document.querySelector('.top-ask-icon');
    if (!icon || icon.dataset.maIcon) return;
    icon.dataset.maIcon = '1';
    icon.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 3a4 4 0 0 0-4 4v4a4 4 0 0 0 8 0V7a4 4 0 0 0-4-4Z"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>';
  }

  function boot() {
    applyCopy();
    tasteStrip();
    posterWhy();
    watchReveal();
    replaceAskEmoji();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  document.addEventListener('matchapp:langchange', function () { setTimeout(applyCopy, 30); });
  document.addEventListener('matchapp:criteriachange', function () {
    const old = document.querySelector('.ma-taste-strip');
    if (old) old.remove();
    tasteStrip();
  });
})();
