/* Adult installed-app startup only. Home keeps loading independently. */
(function () {
  'use strict';
  var ua = navigator.userAgent || '';
  var native = /MatchApp(?:TV|Ai)Android/i.test(ua);
  var installed = navigator.standalone === true || (window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches);
  var handheld = /Android|iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  var home = /^\/(?:index\.html)?$/.test(location.pathname);
  if ((!native && (!installed || !handheld)) || !home) return;

  var SESSION_KEY = 'matchapp-launch-intro';
  var SEEN_KEY = 'matchapp-launch-intro-seen-v1';
  var REGISTERED_KEY = 'matchapp-launch-registered-v1';
  var authWatchAttached = false;

  function storageGet(key) {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  }
  function storageSet(key, value) {
    try { localStorage.setItem(key, value); } catch (_) {}
  }
  function hasRegistrationEvidence() {
    return storageGet(REGISTERED_KEY) === 'true' ||
      storageGet('match_profile_locked') === 'true' ||
      !!storageGet('match_portfolio_owner');
  }
  function markRegistered() {
    storageSet(REGISTERED_KEY, 'true');
    try {
      if (window.MatchAppNativeStartup && typeof window.MatchAppNativeStartup.markRegistered === 'function') {
        window.MatchAppNativeStartup.markRegistered();
      }
    } catch (_) {}
  }
  function rememberSeen() { storageSet(SEEN_KEY, 'true'); }

  function attachAuthWatcher() {
    if (authWatchAttached) return;
    var auth = window.supabaseClient && window.supabaseClient.auth;
    if (!auth) return;
    authWatchAttached = true;
    try {
      if (typeof auth.getSession === 'function') {
        Promise.resolve(auth.getSession()).then(function (result) {
          if (result && result.data && result.data.session && result.data.session.user) markRegistered();
        }).catch(function () {});
      }
      if (typeof auth.onAuthStateChange === 'function') {
        auth.onAuthStateChange(function (_event, session) {
          if (session && session.user) markRegistered();
        });
      }
    } catch (_) {}
  }
  if (hasRegistrationEvidence()) markRegistered();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachAuthWatcher, { once: true });
    window.addEventListener('load', attachAuthWatcher, { once: true });
  } else {
    attachAuthWatcher();
  }

  // Current native builds own their startup surface. This script still keeps
  // the registration flag in sync so later native launches can skip video.
  if (native && /MatchAppLaunchIntro\/1/i.test(ua)) return;

  try {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, 'played');
  } catch (_) { /* Storage restrictions cannot prevent startup. */ }

  function showLaunchTransition() {
    var overlay = document.createElement('div');
    overlay.id = 'matchapp-launch-transition';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:radial-gradient(circle at 50% 42%,#2a1550 0,#150a27 42%,#09060f 100%);display:flex;align-items:center;justify-content:center;opacity:1;';
    var mark = document.createElement('img');
    mark.src = '/assets/brand/matchapp-official-icon-192.png';
    mark.alt = '';
    mark.style.cssText = 'width:92px;height:92px;object-fit:contain;filter:drop-shadow(0 0 24px rgba(229,193,88,.24));';
    var style = document.createElement('style');
    style.textContent = '#matchapp-launch-transition img{animation:matchapp-launch-mark .44s cubic-bezier(.2,.75,.25,1) both}@keyframes matchapp-launch-mark{0%{opacity:0;transform:scale(.92)}100%{opacity:1;transform:scale(1)}}#matchapp-launch-transition.is-ready{opacity:0;transition:opacity .26s ease}@media(prefers-reduced-motion:reduce){#matchapp-launch-transition img{animation:none!important}#matchapp-launch-transition.is-ready{transition-duration:.01ms!important}}html.reduce-motion #matchapp-launch-transition img{animation:none!important}';
    overlay.append(style, mark);
    document.documentElement.appendChild(overlay);

    var done = false;
    var safety = setTimeout(finish, 2600);
    function finish() {
      if (done) return;
      done = true;
      clearTimeout(safety);
      overlay.classList.add('is-ready');
      setTimeout(function () { overlay.remove(); }, 300);
    }
    if (document.readyState === 'complete') {
      requestAnimationFrame(function () { requestAnimationFrame(finish); });
    } else {
      window.addEventListener('load', finish, { once: true });
    }
  }

  if (hasRegistrationEvidence() || storageGet(SEEN_KEY) === 'true') {
    showLaunchTransition();
    return;
  }

  var overlay = document.createElement('div');
  overlay.id = 'matchapp-launch-intro';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'MatchApp intro');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#101010;display:flex;align-items:center;justify-content:center;';
  var video = document.createElement('video');
  video.muted = true;
  video.autoplay = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.poster = '/assets/brand/matchapp-launch-intro-poster.jpg';
  video.setAttribute('playsinline', '');
  video.style.cssText = 'width:100%;height:100%;object-fit:cover;visibility:hidden;';
  var loading = document.createElement('img');
  loading.src = '/assets/brand/matchapp-official-icon-192.png';
  loading.alt = '';
  loading.setAttribute('aria-hidden', 'true');
  loading.style.cssText = 'position:absolute;width:96px;height:96px;object-fit:contain;animation:matchapp-intro-glow 1.4s ease-in-out infinite;';
  var style = document.createElement('style');
  style.textContent = '@keyframes matchapp-intro-glow{0%,100%{opacity:.75;transform:scale(.96)}50%{opacity:1;transform:scale(1)}}@media(prefers-reduced-motion:reduce){#matchapp-launch-intro img{animation:none!important}}html.reduce-motion #matchapp-launch-intro img{animation:none!important}';
  var skip = document.createElement('button');
  skip.type = 'button';
  skip.textContent = /^pt/i.test(navigator.language) ? 'Pular' : 'Skip';
  skip.style.cssText = 'position:absolute;right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));min-width:64px;min-height:44px;padding:8px 18px;border:1px solid #e5c158;border-radius:999px;background:linear-gradient(135deg,#fff0a0,#e5c158);color:#241400;font:700 15px system-ui;cursor:pointer;';

  var done = false;
  var startupDeadline;
  var playbackDeadline;
  function finish() {
    if (done) return;
    done = true;
    clearTimeout(startupDeadline);
    clearTimeout(playbackDeadline);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', finish);
    video.pause();
    video.removeAttribute('src');
    video.load();
    overlay.remove();
  }
  function onVisibility() { if (document.hidden) finish(); }

  video.addEventListener('playing', function () {
    rememberSeen();
    clearTimeout(startupDeadline);
    video.style.visibility = 'visible';
    loading.remove();
    var seconds = Number(video.duration);
    var failSafe = Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds * 1000) + 5000 : 20000;
    playbackDeadline = setTimeout(finish, failSafe);
  }, { once: true });
  skip.addEventListener('click', function () { rememberSeen(); finish(); });
  video.addEventListener('ended', finish, { once: true });
  video.addEventListener('error', finish, { once: true });
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', finish, { once: true });
  overlay.append(style, video, loading, skip);
  document.documentElement.appendChild(overlay);

  // This protects only media preparation. Once playback begins, the deadline
  // is replaced by a duration-aware stall failsafe so the film can finish.
  startupDeadline = setTimeout(finish, 8000);
  video.src = video.canPlayType('video/mp4; codecs="avc1.640029"')
    ? '/assets/brand/matchapp-launch-intro-hd.mp4'
    : '/assets/brand/matchapp-launch-intro-hd.webm';
  try {
    var playback = video.play();
    if (playback && playback.catch) playback.catch(finish);
  } catch (_) { finish(); }
})();
