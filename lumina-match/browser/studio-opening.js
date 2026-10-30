/* The studio ident is presentation only. Load before lumina-game.js so its
 * clicks cannot activate the game's music while the opening is visible. */
(function () {
  'use strict';
  if (window.LuminaStudioOpening || !document.body) return;

  var copy = {
    en: ['Skip', 'Play intro', 'Lumina Match introduction'],
    'pt-BR': ['Pular', 'Reproduzir introdução', 'Introdução do Lumina Match'],
    es: ['Saltar', 'Reproducir introducción', 'Introducción de Lumina Match'],
    fr: ['Passer', 'Lancer l’introduction', 'Introduction de Lumina Match'],
    de: ['Überspringen', 'Intro abspielen', 'Lumina Match – Einführung'],
    it: ['Salta', 'Riproduci introduzione', 'Introduzione di Lumina Match'],
    tr: ['Atla', 'Giriş videosunu oynat', 'Lumina Match giriş videosu'],
    ru: ['Пропустить', 'Смотреть заставку', 'Заставка Lumina Match'],
    ar: ['تخطي', 'تشغيل المقدمة', 'مقدمة Lumina Match'],
    hi: ['छोड़ें', 'परिचय चलाएँ', 'Lumina Match का परिचय'],
    id: ['Lewati', 'Putar intro', 'Intro Lumina Match'],
    ja: ['スキップ', 'イントロを再生', 'Lumina Matchのイントロ'],
    ko: ['건너뛰기', '인트로 재생', 'Lumina Match 인트로'],
    zh: ['跳过', '播放开场视频', 'Lumina Match 开场视频']
  };
  var script = document.currentScript;
  var videoSource = null;
  // Configure only after the actual Lumina introduction has been recovered.
  // No video is downloaded, replaced or fabricated when that asset is absent.
  try {
    var candidate = script && script.getAttribute('data-intro-video');
    if (candidate) {
      var url = new URL(candidate, location.href);
      if (url.origin === location.origin && /^\/lumina-match\/.*\.(mp4|webm)$/i.test(url.pathname)) videoSource = url.href;
    }
  } catch (_) {}
  var finished = false, stage = 'studio', video = null, attempt = 0;
  var timer = null, pending = null, deadline = 0, remaining = 0;
  var mediaTimer = null, mediaStarted = false;
  var previousFocus = document.activeElement;
  var app = document.getElementById('app');
  var previousInert = app ? app.inert : false;
  var reduced = new URLSearchParams(location.search).get('reducedMotion') === '1' ||
    document.documentElement.classList.contains('reduce-motion') ||
    !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var dialog = document.createElement('dialog');
  dialog.id = 'lumina-studio-opening';
  dialog.className = 'lm-studio-opening';
  dialog.dataset.stage = stage;
  dialog.dataset.next = videoSource ? 'video' : 'game';
  dialog.setAttribute('aria-labelledby', 'lumina-studio-credit');
  dialog.innerHTML = '<div class="lm-opening-shell">' +
    '<div class="lm-opening-controls"><button type="button" class="lm-opening-skip" data-studio-skip></button></div>' +
    '<div class="lm-studio-stage"><div class="lm-studio-halo" aria-hidden="true"></div>' +
    '<div class="lm-studio-lockup"><div class="lm-studio-sigil" aria-hidden="true"><i></i><i></i><i></i></div>' +
    '<h1 id="lumina-studio-credit" class="lm-studio-credit" dir="ltr">' +
    '<span class="lm-studio-name">Adv<span>_</span>Dev<span>_</span>Ops</span>' +
    ' <span class="lm-studio-byline">by Jonas Junior</span></h1>' +
    '<div class="lm-studio-rule" aria-hidden="true"></div></div></div>' +
    '<div class="lm-opening-foot" aria-hidden="true"><span></span></div>' +
    '<button type="button" class="lm-opening-play" data-studio-play hidden></button></div>';
  var skip = dialog.querySelector('[data-studio-skip]');
  var play = dialog.querySelector('[data-studio-play]');

  function localize(value) {
    var lang = String(value || 'en').toLowerCase();
    lang = lang.startsWith('pt') ? 'pt-BR' : lang.split('-')[0];
    if (!Object.prototype.hasOwnProperty.call(copy, lang)) lang = 'en';
    dialog.lang = lang;
    dialog.dir = lang === 'ar' ? 'rtl' : 'ltr';
    skip.textContent = copy[lang][0];
    play.textContent = copy[lang][1];
    if (video) video.setAttribute('aria-label', copy[lang][2]);
  }
  function clock() { return window.performance.now(); }
  function clearStep() { window.clearTimeout(timer); timer = null; pending = null; }
  function schedule(callback, delay) {
    clearStep(); pending = callback; remaining = delay;
    if (document.hidden) return;
    deadline = clock() + delay;
    timer = window.setTimeout(function () {
      timer = null; pending = null;
      if (!finished) callback();
    }, delay);
  }
  function clearMediaTimer() { window.clearTimeout(mediaTimer); mediaTimer = null; }
  function mediaDeadline() {
    clearMediaTimer();
    if (!finished && stage === 'video' && !document.hidden) {
      mediaTimer = window.setTimeout(function () { finish('media-timeout'); }, 15000);
    }
  }
  function finish(reason) {
    if (finished) return;
    finished = true; attempt++; clearStep(); clearMediaTimer();
    document.removeEventListener('click', openingClick, true);
    document.removeEventListener('keydown', openingKey, true);
    document.removeEventListener('focusin', containFocus, true);
    document.removeEventListener('visibilitychange', visibilityChanged);
    window.removeEventListener('message', parentMessage);
    window.removeEventListener('pagehide', pageHidden);
    dialog.removeEventListener('cancel', cancelled);
    dialog.removeEventListener('close', externallyClosed);
    if (video) {
      video.removeEventListener('ended', ended);
      video.removeEventListener('error', mediaError);
      video.removeEventListener('playing', playing);
      video.removeEventListener('timeupdate', progressed);
      video.removeEventListener('waiting', mediaDeadline);
      try { video.pause(); video.removeAttribute('src'); video.load(); } catch (_) {}
    }
    if (app) app.inert = previousInert;
    try { if (dialog.open && typeof dialog.close === 'function') dialog.close(); } catch (_) {}
    dialog.remove();
    // pagehide can put this document in BFCache. Do not steal focus on exit.
    if (reason !== 'pagehide') {
      var target = previousFocus && previousFocus.isConnected && previousFocus !== document.body ? previousFocus :
        document.querySelector('#app h1, #app button:not(:disabled)');
      if (target && typeof target.focus === 'function') target.focus({preventScroll: true});
    }
    window.dispatchEvent(new CustomEvent('lumina:opening-complete', {detail: {reason: reason}}));
  }
  function ended() { finish('finished'); }
  function mediaError() { finish('media-error'); }
  function playing() {
    if (finished || stage !== 'video') return;
    // A queued playing event can arrive after visibilitychange paused media.
    // Keep the resume action visible, and never restart sound in the background.
    if (document.hidden || video.paused) {
      if (document.hidden) video.pause();
      clearMediaTimer(); play.hidden = false; return;
    }
    mediaStarted = true; play.hidden = true; mediaDeadline();
  }
  function progressed() { if (mediaStarted && !video.paused) mediaDeadline(); }
  function playVideo() {
    if (finished || !video || stage !== 'video' || document.hidden) return;
    var token = ++attempt;
    play.hidden = true; mediaDeadline();
    try {
      var result = video.play();
      if (result && result.catch) result.catch(function () {
        if (finished || token !== attempt) return;
        clearMediaTimer(); play.hidden = false; play.focus({preventScroll: true});
      });
    } catch (_) { clearMediaTimer(); play.hidden = false; }
  }
  function beginVideo() {
    if (!videoSource) { finish('finished'); return; }
    stage = 'video'; dialog.dataset.stage = stage;
    video = document.createElement('video');
    video.className = 'lm-opening-video'; video.playsInline = true;
    video.preload = 'auto'; video.src = videoSource;
    video.addEventListener('ended', ended);
    video.addEventListener('error', mediaError);
    video.addEventListener('playing', playing);
    video.addEventListener('timeupdate', progressed);
    video.addEventListener('waiting', mediaDeadline);
    dialog.querySelector('.lm-opening-shell').appendChild(video);
    localize(dialog.lang);
    playVideo();
  }
  function fadeStudio() {
    stage = 'leaving'; dialog.dataset.stage = stage;
    schedule(beginVideo, reduced ? 0 : 500);
  }
  function openingClick(event) {
    if (finished) return;
    // Capture before the game's audio unlock listener. A Skip/Play gesture
    // belongs only to this opening; gameplay receives the next real gesture.
    event.stopImmediatePropagation();
    if (skip.contains(event.target)) finish('skipped');
    else if (play.contains(event.target)) playVideo();
  }
  function openingKey(event) {
    if (finished) return;
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopImmediatePropagation(); finish('skipped');
    } else if (event.key === 'Tab' && typeof dialog.showModal !== 'function') {
      event.preventDefault();
      if (!play.hidden && document.activeElement === skip) play.focus(); else skip.focus();
    }
  }
  function containFocus(event) {
    if (!finished && !dialog.contains(event.target)) skip.focus({preventScroll: true});
  }
  function cancelled(event) { event.preventDefault(); finish('skipped'); }
  function externallyClosed() { finish('skipped'); }
  function pageHidden() { finish('pagehide'); }
  function visibilityChanged() {
    dialog.classList.toggle('lm-opening-away', document.hidden);
    if (document.hidden) {
      if (timer !== null) {
        remaining = Math.max(0, deadline - clock()); window.clearTimeout(timer); timer = null;
      }
      clearMediaTimer();
      if (video) { attempt++; video.pause(); play.hidden = false; }
    } else if (pending) {
      schedule(pending, remaining);
    }
  }
  function parentMessage(event) {
    if (event.source === window.parent && event.origin === location.origin && event.data?.type === 'lumina:set-language') {
      localize(event.data.language);
    }
  }

  localize(new URLSearchParams(location.search).get('lang') || document.documentElement.lang);
  window.LuminaStudioOpening = Object.freeze({get active() { return !finished; }});
  document.body.appendChild(dialog);
  if (app) app.inert = true;
  document.addEventListener('click', openingClick, true);
  document.addEventListener('keydown', openingKey, true);
  document.addEventListener('focusin', containFocus, true);
  document.addEventListener('visibilitychange', visibilityChanged);
  window.addEventListener('message', parentMessage);
  window.addEventListener('pagehide', pageHidden);
  dialog.addEventListener('cancel', cancelled);
  dialog.addEventListener('close', externallyClosed);
  try {
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
    skip.focus({preventScroll: true});
    schedule(fadeStudio, reduced ? 2800 : 2600);
  } catch (_) { finish('unavailable'); }
})();
