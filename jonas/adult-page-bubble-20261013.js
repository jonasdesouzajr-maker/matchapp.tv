/* Shared wiring for the approved adult Jonas bubble. No independent chat engine. */
(function () {
  'use strict';
  if (/^\/kids(?:\/|$)/i.test(location.pathname) || window.__matchappAdultBubbleBootstrap) return;
  window.__matchappAdultBubbleBootstrap = true;
  function css(path) {
    if (document.querySelector('link[href^="' + path + '"]')) return;
    var link = document.createElement('link');link.rel = 'stylesheet';link.href = path;
    document.head.appendChild(link);
  }
  function script(path) {
    var existing = document.querySelector('script[src^="' + path.split('?')[0] + '"]');
    if (existing) return Promise.resolve(); // Existing defer scripts have run before DOMContentLoaded.
    return new Promise(function (resolve, reject) {
      var node = document.createElement('script');node.src = path;node.async = false;
      node.onload = resolve;node.onerror = function () { reject(new Error('Jonas dependency unavailable: ' + path)); };
      document.head.appendChild(node);
    });
  }
  async function mount() {
    css('/adult-ui-finish-20261014.css?v=2');
    await script('/adult-ui-finish-20261014.js?v=2');
    if (document.documentElement.hasAttribute('data-kids-mode') || document.body.matches('.page-kids,.kids-body,.kids-mode')) return;
    var root = document.getElementById('ma-jonas-home');
    var home = /^\/(?:index\.html)?$/.test(location.pathname);
    // Home keeps its approved markup, styles and initialization order.
    if (home && root) return;
    if (!root) {
      var controller = new AbortController(), timeout = setTimeout(function () { controller.abort(); }, 8000);
      try {
        var response = await fetch('/jonas/floating-shell-20261013.html?v=1', { signal: controller.signal, cache: 'no-cache' });
        if (!response.ok) throw new Error('Jonas shell HTTP ' + response.status);
        var template = document.createElement('template');template.innerHTML = await response.text();
        root = template.content.querySelector('#ma-jonas-home');
        if (!root) throw new Error('Jonas shell missing');
        if (document.getElementById('ma-jonas-home')) return;
        document.body.appendChild(root);
      } finally { clearTimeout(timeout); }
    }
    css('/jonas/floating-home-20261010-v3.css');
    css('/jonas/floating-chat.css?v=20261009-chat3');
    css('/jonas/ui-response-polish-20261013.css');
    css('/jonas/ambient-effects-20261013.css');
    await script('/jonas/locales-20261009-v2.js');
    await script('/jonas/male-voice-policy-20261010.js');
    await script('/jonas/secure-speech-20261010.js?v=20261011-final3');
    await script('/jonas/floating-home-20261010-v3.js?v=20261013-adult1&persistent=20261014-2');
    await script('/jonas/floating-voice-20261010-v5.js?v=20261013-human');
    await script('/jonas/ambient-effects-20261013.js');
    await script('/jonas/ambient-sounds-20261013.js');
  }
  function start() { mount().catch(function (error) { console.warn('Jonas bubble load failed; page remains available.', error.message); }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
