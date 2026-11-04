/* Web-only seasonal presentation. It never modifies matches, native UI, or editorial jobs. */
(function () {
  'use strict';
  const card = document.getElementById('ma-halloween-promo');
  if (!card) return;
  const expires = Date.parse('2026-11-18T03:00:00Z'); // November 18, 00:00 America/Sao_Paulo.
  const native = () => /MatchAppTVAndroid|MatchAppAiAndroid|MatchAppAiKidsAndroid/i.test(navigator.userAgent || '') ||
    Boolean(window.MatchAppNativeAuth || window.MatchAppNativeExperience || window.MatchAppNativePageState) ||
    document.documentElement.classList.contains('matchapp-android') ||
    new URLSearchParams(location.search).get('utm_source') === 'android_app';
  let expiryTimer;
  const events = ['matchapp:langchange', 'matchapp:languagechange', 'matchapp:language-changed'];
  function language() {
    let saved = '';
    try { saved = localStorage.getItem('match_lang') || ''; } catch (_) {}
    const value = String(saved || window.MATCH_LANG || document.documentElement.lang || 'en').replace(/_/g, '-');
    if (/^zh-(?:hant|tw|hk|mo)(?:-|$)/i.test(value)) return 'zh-TW';
    const base = value.toLowerCase().split('-')[0];
    return base === 'pt' ? 'pt-BR' : base;
  }
  function remove() {
    card.remove();
    clearTimeout(expiryTimer);
    for (const event of events) { document.removeEventListener(event, paint); window.removeEventListener(event, paint); }
    window.removeEventListener('pageshow', paint);
    window.removeEventListener('storage', paint);
    document.removeEventListener('visibilitychange', paint);
  }
  function paint() {
    if (!card.isConnected) return;
    if (native() || Date.now() >= expires || !/^\/(?:index\.html)?$/.test(location.pathname)) { remove(); return; }
    const key = language(), copy = window.MatchAppHalloweenPromo?.[key];
    if (!copy) { card.hidden = true; return; }
    card.lang = key;
    card.dir = key === 'ar' ? 'rtl' : 'ltr';
    card.querySelectorAll('[data-hw-promo]').forEach(node => { node.textContent = copy[node.dataset.hwPromo]; });
    const link = card.querySelector('a');
    link.href = '/halloween/' + (key === 'en' ? '' : key.toLowerCase() + '/');
    const art = card.querySelector('img');
    art.alt = copy.posterAlt;
    if (!art.getAttribute('src')) {
      art.srcset = art.dataset.srcset;
      art.src = art.dataset.src;
    }
    card.hidden = false;
  }
  paint();
  if (!card.isConnected) return;
  for (const event of events) { document.addEventListener(event, paint); window.addEventListener(event, paint); }
  window.addEventListener('pageshow', paint);
  window.addEventListener('storage', paint);
  document.addEventListener('visibilitychange', paint);
  expiryTimer = setTimeout(remove, Math.min(2147483647, Math.max(0, expires - Date.now())));
})();
