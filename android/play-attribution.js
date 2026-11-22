/* Official Android store CTA: consent-respecting click measurement and Play referrer attribution.
 * Never include private invite tokens, query parameters, or personal information. */
(function (w, d) {
  'use strict';
  var cta = d.querySelector('main a.cta[href^="https://play.google.com/store/apps/details"]');
  if (!cta) return;
  var base = 'https://play.google.com/store/apps/details?id=com.jonas.papercup';
  var referrer = new URLSearchParams({
    utm_source: 'matchapp_tv',
    utm_medium: 'web_to_app',
    utm_campaign: 'android_landing',
    utm_content: 'primary_cta'
  });
  function analyticsAllowed() {
    try { if (w.localStorage.getItem('match_cookie_choice') === 'essential') return false; }
    catch (_) { return false; }
    var consent = 'denied';
    var queue = Array.isArray(w.dataLayer) ? w.dataLayer : [];
    queue.slice(-500).forEach(function (item) {
      if (item && item[0] === 'consent' &&
          (item[1] === 'default' || item[1] === 'update') && item[2] &&
          (item[2].analytics_storage === 'granted' || item[2].analytics_storage === 'denied')) {
        consent = item[2].analytics_storage;
      }
    });
    return consent === 'granted';
  }
  cta.addEventListener('click', function () {
    // Keep the original direct Play link as the no-JS fallback.
    var url = new URL(base);
    url.searchParams.set('referrer', referrer.toString());
    cta.href = url.href;
    if (!analyticsAllowed()) return;
    try {
      if (typeof w.gtag === 'function') {
        w.gtag('event', 'app_store_clicked', {
          growth_surface: 'android_landing',
          growth_campaign: 'android_landing',
          transport_type: 'beacon'
        });
      }
    } catch (_) { /* Never interrupt navigation on analytics failure. */ }
  });
})(window, document);
