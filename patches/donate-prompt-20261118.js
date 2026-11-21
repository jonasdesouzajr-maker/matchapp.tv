/* Opt-in voluntary support prompt. No page-load solicitation. */
(function () {
  'use strict';
  if (/^\/(kids|private-voice|oauth)(\/|$)/.test(location.pathname)) return;
  var KEY = 'ma-donate-shown';
  if (sessionStorage.getItem(KEY)) return;

  function show() {
    if (document.getElementById('ma-donate')) return;
    var box = document.createElement('div');
    box.id = 'ma-donate';
    box.style.cssText = 'position:fixed;bottom:24px;right:24px;max-width:320px;background:#1a1030;border:1px solid rgba(229,193,88,.4);border-radius:16px;padding:16px;z-index:50;color:#f5f0e8;font:14px/1.4 system-ui;box-shadow:0 8px 32px #0006';
    box.innerHTML = '<button aria-label="Close" style="position:absolute;top:8px;right:8px;background:none;border:none;color:#f5f0e8;font-size:18px;cursor:pointer">×</button><strong style="display:block;margin-bottom:6px">Support MatchApp Ai</strong><p style="margin:0 0 10px;opacity:.85">Help us improve and upgrade the apps and site. Donate via PIX to <strong>support@matchapp.tv</strong> (Jonas de Souza Nogueira Junior).</p><p style="margin:0;font-size:12px;opacity:.7">Every contribution helps.</p>';
    box.querySelector('button').onclick = function () { box.remove(); sessionStorage.setItem(KEY, '1'); };
    document.body.appendChild(box);
    setTimeout(function () { if (box.parentNode) { box.remove(); sessionStorage.setItem(KEY, '1'); } }, 12000);
  }

  // A voluntary support offer must never cover the page without a user gesture.
  // Existing in-page donation/support controls remain available independently.
  document.addEventListener('click', function(event) {
    var trigger=event.target && event.target.closest && event.target.closest('[data-ma-donate-prompt]');
    if(trigger)show();
  });
})();
