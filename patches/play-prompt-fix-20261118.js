/* Corrected Play Store prompt.
   App is already available for all countries.
   Text follows the page language. */
(function () {
  'use strict';
  if (window.top !== window) return;
  if (/MatchAppAiAndroid\//.test(navigator.userAgent)) return;
  if (/^\/(kids|private-voice|oauth)(\/|$)/.test(location.pathname)) return;
  if (document.getElementById('ma-play-prompt')) return;
  if (sessionStorage.getItem('ma-play-prompt-dismissed')) return;

  const storeUrl = 'https://play.google.com/store/apps/details?id=com.jonas.papercup&referrer=' + encodeURIComponent('utm_source=matchapp.tv&utm_medium=website&utm_campaign=android_discovery');
  const iconUrl = '/assets/brand/matchapp-ai-icon-192.png';

  function lang() {
    var html = (document.documentElement.lang || '').toLowerCase();
    if (html.startsWith('pt')) return 'pt';
    if (html.startsWith('es')) return 'es';
    return 'en';
  }

  var copy = {
    en: { h: 'Get MatchApp Ai', s: 'The full app is on Google Play. Explore the full Android experience.', cta: 'Get on Play' },
    pt: { h: 'Baixe o MatchApp Ai', s: 'O app completo está no Google Play. Conheça a experiência completa no Android.', cta: 'Baixar no Play' },
    es: { h: 'Descarga MatchApp Ai', s: 'La app completa está en Google Play. Descubre la experiencia completa en Android.', cta: 'Obtener en Play' }
  };

  function inject() {
    var L = copy[lang()] || copy.en;
    var box = document.createElement('aside');
    box.id = 'ma-play-prompt';
    box.setAttribute('role', 'complementary');
    box.setAttribute('aria-label', L.h);
    box.innerHTML = '<button type="button" aria-label="Close" style="position:absolute;top:8px;right:8px;background:none;border:none;color:#f5f0e8;font-size:18px;cursor:pointer">×</button><div style="display:flex;gap:10px;align-items:center;margin-bottom:8px"><img src="' + iconUrl + '" width="36" height="36" alt=""><strong>' + L.h + '</strong></div><p style="margin:0 0 10px;font-size:13px;opacity:.85">' + L.s + '</p><a href="' + storeUrl + '" target="_blank" rel="noopener" style="display:block;text-align:center;background:#e5c158;color:#0d0614;padding:8px 12px;border-radius:10px;text-decoration:none;font-weight:700">' + L.cta + '</a>';
    box.style.cssText = 'position:fixed;bottom:max(16px,env(safe-area-inset-bottom));right:max(12px,env(safe-area-inset-right));left:auto;width:min(280px,calc(100vw - 32px));box-sizing:border-box;background:#1a1030;border:1px solid rgba(229,193,88,.4);border-radius:16px;padding:14px;z-index:40;color:#f5f0e8;font:14px/1.4 system-ui;box-shadow:0 8px 32px #0006';
    box.querySelector('button').onclick = function () { box.remove(); sessionStorage.setItem('ma-play-prompt-dismissed', '1'); };
    document.body.appendChild(box);
    // Keep the invitation available until dismissed; do not force a timed disappearance.
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(inject, 1500); });
  else setTimeout(inject, 1500);
})();
