/* Adult installed-app startup only. Home keeps loading independently. */
(function () {
  'use strict';
  var ua = navigator.userAgent || '';
  var native = /MatchApp(?:TV|Ai)Android/i.test(ua);
  var installed = navigator.standalone === true || (window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches);
  var handheld = /Android|iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  if ((!native && (!installed || !handheld)) || !/^\/(?:index\.html)?$/.test(location.pathname)) return;
  // New native builds play the bundled intro; never play it twice.
  if (native && /MatchAppLaunchIntro\/1/i.test(ua)) return;
  try {
    if (sessionStorage.getItem('matchapp-launch-intro')) return;
    sessionStorage.setItem('matchapp-launch-intro', 'played');
  } catch (_) { /* Storage restrictions cannot prevent startup. */ }
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
  // Show the actual intro frame while the browser fetches/decodes the video.
  video.poster = '/assets/brand/matchapp-launch-intro-poster.jpg';
  video.setAttribute('playsinline', '');
  video.style.cssText = 'width:100%;height:100%;object-fit:cover;visibility:hidden;';
  var loading = document.createElement('img');
  loading.src = '/assets/brand/matchapp-ai-install-192.png?v=20261003-premiumicon1';
  loading.alt = '';
  loading.setAttribute('aria-hidden', 'true');
  loading.style.cssText = 'position:absolute;width:112px;height:112px;object-fit:contain;animation:matchapp-intro-glow 1.4s ease-in-out infinite;';
  var style = document.createElement('style');
  style.textContent = '@keyframes matchapp-intro-glow{0%,100%{opacity:.75;transform:scale(.96)}50%{opacity:1;transform:scale(1)}}@media(prefers-reduced-motion:reduce){#matchapp-launch-intro img{animation:none!important}}html.reduce-motion #matchapp-launch-intro img{animation:none!important}';
  video.addEventListener('playing', function () {
    video.style.visibility = 'visible';
    loading.remove();
  }, { once: true });
  var skip = document.createElement('button');
  skip.type = 'button';
  skip.textContent = /^pt/i.test(navigator.language) ? 'Pular' : 'Skip';
  skip.style.cssText = 'position:absolute;right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));min-width:64px;min-height:44px;padding:8px 18px;border:1px solid #e5c158;border-radius:999px;background:linear-gradient(135deg,#fff0a0,#e5c158);color:#241400;font:700 15px system-ui;cursor:pointer;';
  var done = false;
  var deadline;
  function finish() {
    if (done) return;
    done = true;
    clearTimeout(deadline);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', finish);
    video.pause();
    video.removeAttribute('src');
    video.load();
    overlay.remove();
  }
  function onVisibility() { if (document.hidden) finish(); }
  skip.addEventListener('click', finish);
  video.addEventListener('ended', finish, { once: true });
  video.addEventListener('error', finish, { once: true });
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', finish, { once: true });
  overlay.append(style, video, loading, skip);
  document.documentElement.appendChild(overlay);
  // Finite wall-clock deadline includes download, decoding and stalled playback.
  deadline = setTimeout(finish, 6500);
  // Check the actual H.264 profile, not just the MP4 container.
  video.src = video.canPlayType('video/mp4; codecs="avc1.640029"')
    ? '/assets/brand/matchapp-launch-intro-hd.mp4'
    : '/assets/brand/matchapp-launch-intro-hd.webm';
  try {
    var playback = video.play();
    if (playback && playback.catch) playback.catch(finish);
  } catch (_) { finish(); }
})();
