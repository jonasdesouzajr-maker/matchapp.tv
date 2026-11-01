/* Self-loading subtle background and pill fix 2026-11-01. */
(function(){
  if(/^\/(kids|private-voice|oauth)(\/|$)|^\/(callback|confirm)\.html$/.test(location.pathname)) return;
  if(document.getElementById('ma-subtle-bg-20261101')) return;
  var s = document.createElement('style');
  s.id = 'ma-subtle-bg-20261101';
  s.textContent = `html body:not(.kids-body) .poster-wall .poster-wall-grid{opacity:.28!important;filter:blur(1px) saturate(1.05)!important}@media(max-width:700px){html body:not(.kids-body) .poster-wall .poster-wall-grid{opacity:.22!important}}html body:not(.kids-body) .poster-wall::after{background:radial-gradient(ellipse at 50% 40%,rgba(13,8,32,.15),rgba(13,8,32,.45) 70%)!important}html body:not(.kids-body) :is(.card,.tile,.poster,.result-card,.global-event,.marquee-item,.premium-card) a:not([class*=btn]):not([class*=button]):not([class*=pill]):not(.gold-btn):not([data-ma-control-pill]):not(:has(img,picture,video)){display:inline-flex!important;align-items:center;justify-content:center;min-height:32px;padding:4px 12px!important;border-radius:999px!important;background:rgba(28,18,36,.75)!important;border:1px solid rgba(230,195,106,.4)!important;color:#f6e7c4!important;text-decoration:none!important;font-weight:600;font-size:12px}`;
  (document.head||document.documentElement).appendChild(s);
})();
