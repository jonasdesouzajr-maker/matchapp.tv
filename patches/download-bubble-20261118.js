/* Intermittent download bubble. Closeable. Shows occasionally. */
(function () {
  'use strict';
  if (/^\/(kids|private-voice|oauth)(\/|$)/.test(location.pathname)) return;
  if (document.getElementById('ma-dl-bubble')) return;
  var KEY = 'ma-dl-bubble-last';
  var last = Number(localStorage.getItem(KEY) || 0);
  if (Date.now() - last < 3600000) return; // once per hour

  function show() {
    if (document.getElementById('ma-dl-bubble')) return;
    var box = document.createElement('div');
    box.id = 'ma-dl-bubble';
    box.style.cssText = 'position:fixed;bottom:20px;left:20px;max-width:280px;background:#1a1030;border-radius:14px;padding:12px 14px;z-index:45;color:#f5f0e8;font:13px/1.3 system-ui;box-shadow:0 6px 24px #0005;display:flex;gap:10px;align-items:center';
    box.innerHTML = '<img src="/assets/brand/matchapp-ai-mark.svg" width="36" height="36" alt=""><div><strong>Get MatchApp Ai</strong><br><span style="opacity:.8">Full app on Google Play</span></div><a href="https://play.google.com/store/apps/details?id=com.jonas.papercup" target="_blank" rel="noopener" style="background:#e5c158;color:#0d0614;padding:6px 10px;border-radius:8px;text-decoration:none;font-weight:700;font-size:12px">Get</a><button aria-label="Close" style="background:none;border:none;color:#f5f0e8;font-size:16px;cursor:pointer;margin-left:4px">×</button>';
    box.querySelector('button').onclick = function () { box.remove(); localStorage.setItem(KEY, String(Date.now())); };
    document.body.appendChild(box);
    setTimeout(function () { if (box.parentNode) { box.remove(); localStorage.setItem(KEY, String(Date.now())); } }, 10000);
  }

  setTimeout(show, 2000);
})();
