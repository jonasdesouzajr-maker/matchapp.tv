/* Genuine public locale URLs; only a previously chosen app language is remembered. */
(function (w, d) {
  'use strict';
  var languages = ['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
  function normalize(value) {
    var code = String(value || '').replace(/_/g, '-').toLowerCase();
    if (/^pt(?:-|$)/.test(code)) return 'pt-BR';
    code = code.split('-')[0];
    return languages.indexOf(code) < 0 ? null : code;
  }
  function route(language) { return '/lumina-match/' + (language === 'en' ? '' : language.toLowerCase() + '/'); }
  var locale = normalize(d.documentElement.getAttribute('data-lumina-guide-locale'));
  var saved = null;
  var explicitChoice = null;
  try { saved = normalize(w.localStorage.getItem('match_lang')); } catch (_) {}
  // The fragment records an explicit language-link choice even for a new tab
  // or a browser context-menu action. It creates no duplicate crawlable URL.
  if (locale && w.location.hash === '#language-' + locale) {
    saved = locale;
    explicitChoice = locale;
    try { w.localStorage.setItem('match_lang', locale); } catch (_) {}
  }
  // A crawler or first visit receives the real authored language of this URL.
  // A returning user retains their own explicit language choice, never geo/UA detection.
  if (locale && saved && locale !== saved) {
    w.location.replace(route(saved) + w.location.hash);
    return;
  }
  if (locale) w.MATCH_LANG = locale;
  function preferred() {
    var value;
    try { value = w.localStorage.getItem('match_lang'); } catch (_) {}
    return explicitChoice || normalize(value) || normalize(w.MATCH_LANG) || locale || normalize(d.documentElement.lang) || 'en';
  }
  function links() {
    d.querySelectorAll('[data-lumina-guide-link]').forEach(function (link) { link.href = route(preferred()); });
  }
  d.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('[data-lumina-language], [data-lumina-play]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var selected = normalize(link.getAttribute('data-lumina-language') || locale);
    if (!selected) return;
    explicitChoice = selected;
    try { w.localStorage.setItem('match_lang', selected); } catch (_) {}
    w.MATCH_LANG = selected;
  });
  function changed(event) {
    if (event?.type === 'storage') explicitChoice = normalize(event.newValue);
    else if (normalize(event?.detail?.lang)) explicitChoice = normalize(event.detail.lang);
    if (locale && preferred() !== locale) w.location.assign(route(preferred()) + w.location.hash);
    else links();
  }
  d.addEventListener('matchapp:langchange', changed);
  d.addEventListener('matchapp:languagechange', changed);
  w.addEventListener('storage', function (event) { if (event.key === 'match_lang') changed(event); });
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', links, {once:true});
  else links();
})(window, document);
