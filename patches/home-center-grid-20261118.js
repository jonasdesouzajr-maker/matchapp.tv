/* Place the home grid last, inside ma-reference, so it beats layered !important rules. */
(function () {
  'use strict';
  var CSS = "/* Home center column. These rules live in ma-reference because that layer's\n   !important declarations beat every unlayered patch. Ad rail size, slots,\n   and initialization stay on the locked rules. */\n@layer ma-reference {\n  @media (min-width: 1180px) {\n    html.ma-reference body.page-home .main-layout.main-layout {\n      display: grid !important;\n    }\n    html.ma-reference body.page-home .main-layout > .container.container {\n      --home-grid-offset: 0px !important;\n      --home-grid-width: 100% !important;\n      overflow: visible !important;\n    }\n    html.ma-reference body.page-home .main-layout.main-layout > .container.container > :is(\n      .home-hero.home-hero,\n      .ma-cinema-section-heading.ma-cinema-section-heading,\n      #trending-rail#trending-rail,\n      #ma-concierge#ma-concierge,\n      #result-box#result-box,\n      #loading-box#loading-box\n    ) {\n      width: 100% !important;\n      max-width: 100% !important;\n      margin-inline-start: 0 !important;\n      margin-inline-end: 0 !important;\n      left: auto !important;\n    }\n  }\n  /* Home only. Explore still links to Lumina Match and Reels Forge. */\n  html.ma-reference body.page-home #lm-launch-grid#lm-launch-grid.lm-launch-grid,\n  html.ma-reference body.page-home #lm-launch-grid#lm-launch-grid #lm-launch#lm-launch.lm-launch {\n    display: none !important;\n  }\n}\n";
  function install() {
    if (/^\/(kids|private-voice|oauth)(\/|$)/.test(location.pathname)) return;
    var style = document.getElementById('ma-home-center-grid');
    if (!style) {
      style = document.createElement('style');
      style.id = 'ma-home-center-grid';
    }
    style.textContent = CSS;
    (document.body || document.documentElement).appendChild(style);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
  window.addEventListener('load', install);
})();
