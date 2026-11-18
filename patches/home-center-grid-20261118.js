/* Place the home grid last so it beats the inline display:block rule. */
(function () {
  'use strict';
  var CSS = '/* Desktop home: keep locked ad rails in their own columns.\n   Injected at the end of body so it wins over display:block !important. */\n@media (min-width: 1180px) {\n  html body.page-home .main-layout {\n    display: grid !important;\n    grid-template-columns: 160px minmax(0, 1fr) 160px !important;\n    column-gap: 24px !important;\n    row-gap: 0 !important;\n    align-items: start !important;\n    width: min(1280px, calc(100% - 24px)) !important;\n    max-width: 1280px !important;\n    margin: 0 auto !important;\n    padding: 12px 0 0 !important;\n    box-sizing: border-box !important;\n  }\n  html body.page-home .main-layout > .sidebar-ad-left {\n    grid-column: 1 !important;\n    grid-row: 1 !important;\n    width: 160px !important;\n    min-width: 160px !important;\n    max-width: 160px !important;\n    position: sticky !important;\n    top: 104px !important;\n    z-index: 2 !important;\n  }\n  html body.page-home .main-layout > .sidebar-ad-right {\n    grid-column: 3 !important;\n    grid-row: 1 !important;\n    width: 160px !important;\n    min-width: 160px !important;\n    max-width: 160px !important;\n    position: sticky !important;\n    top: 104px !important;\n    z-index: 2 !important;\n  }\n  html body.page-home .main-layout > .container {\n    grid-column: 2 !important;\n    grid-row: 1 !important;\n    width: 100% !important;\n    max-width: none !important;\n    min-width: 0 !important;\n    margin: 0 !important;\n    padding: 0 0 140px !important;\n    overflow: hidden !important;\n    box-sizing: border-box !important;\n  }\n  html body.page-home .main-layout > .container > * {\n    max-width: 100% !important;\n    box-sizing: border-box !important;\n  }\n  html body.page-home .home-hero {\n    width: 100% !important;\n    max-width: 100% !important;\n    margin-left: 0 !important;\n    margin-right: 0 !important;\n    overflow: hidden !important;\n    box-sizing: border-box !important;\n  }\n  html body.page-home .home-h1,\n  html body.page-home .home-hero h1 {\n    max-width: 100% !important;\n    overflow-wrap: anywhere !important;\n  }\n  html body.page-home .marquee-wrapper,\n  html body.page-home .marquee-viewport,\n  html body.page-home #trending-rail {\n    max-width: 100% !important;\n    overflow: hidden !important;\n  }\n}\n/* Home launcher only. Explore and the game stay available. */\nhtml body.page-home #lm-launch-grid,\nhtml body.page-home #lm-launch {\n  display: none !important;\n}\n';
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
