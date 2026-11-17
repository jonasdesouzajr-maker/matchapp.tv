/* Set the page gutter only in the top-level browser. The shared stylesheet is already loaded. */
if (window.top === window && !window.MatchAppFx &&
    !/MatchApp(?:TV|Ai(?:Kids)?)Android\/|\bwv\b/i.test(navigator.userAgent)) {
  document.documentElement.classList.add('ma-browser-gutters');

}
/* One persistent adult companion; Home and native Android retain their existing owner. */
(function(){
 'use strict';
 if(window.top!==window||/^\/(kids|private-voice|oauth)(\/|$)/.test(location.pathname)||/\/(callback|confirm)\.html$/.test(location.pathname)||/^\/(?:index\.html)?$/.test(location.pathname)||/MatchAppAiAndroid\//.test(navigator.userAgent))return;
 if(window.__matchappAmbientJonas||document.getElementById('matchapp-ambient-jonas-script'))return;
 window.__MATCHAPP_AMBIENT_WEB__=true;
 var script=document.createElement('script');script.id='matchapp-ambient-jonas-script';script.defer=true;
 script.src='/jonas/android-ambient-assistant-20261011.js?v=corner20261020-1&voicepair=20261014-1&instant=20261015-1&stellar=20261020-1&header=20261020-1&resize=20261022-1&repair=20261023-1&perf=20261031-2&greeting=20261101-2&account=20261101-2';
 document.head.appendChild(script);
})();
/* UI fixes 2026-10-23: pills, poster wall, logo, chat resize and close (all adult pages, web and Android). */
(function(){
 'use strict';
 if(/^\/(kids|private-voice|oauth)(\/|$)|^\/(callback|confirm)\.html$/.test(location.pathname)||document.getElementById('ma-ui-fixes-20261023-css'))return;
 var l=document.createElement('link');l.id='ma-ui-fixes-20261023-css';l.rel='stylesheet';l.href='/ui-fixes-20261023.css?v=20261024-1&repair=20261023-1&masthead=20261025-1&refined=20261025-4';(document.head||document.documentElement).appendChild(l);
 var s=document.createElement('script');s.id='ma-ui-fixes-20261023-js';s.defer=true;s.src='/ui-fixes-20261023.js?v=20261024-1&masthead=20261025-1';(document.head||document.documentElement).appendChild(s);
})();
/* Subtle background and text links on adult web and Android WebView pages. */
(function(){
 'use strict';
 if(window.top!==window||/^\/(kids|private-voice|oauth|android-studio)(\/|$)|^\/(callback|confirm)\.html$/.test(location.pathname)||document.getElementById('ma-subtle-bg-20261101-script'))return;
 var s=document.createElement('script');s.id='ma-subtle-bg-20261101-script';s.defer=true;s.src='/patches/subtle-background-20261101.js?v=20261101-4';(document.head||document.documentElement).appendChild(s);
})();
/* Jonas guide (2026-10-31): pills, Back closes overlays. Adult pages only. */
(function(){
 if(!/^\/(kids|private-voice|oauth)(\/|$)/.test(location.pathname)&&!/\/(callback|confirm)\.html$/.test(location.pathname)&&!document.getElementById('ma-guide-20261031')){var g=document.createElement('script');g.id='ma-guide-20261031';g.defer=true;g.src='/jonas-guide-20261031.js?v=8';(document.head||document.documentElement).appendChild(g);}
})();

/* Load browser refinements after the existing companion and isolated-route guards. */
(function(){
  if (!document.documentElement.classList.contains('ma-browser-gutters') ||
      /^\/(kids|private-voice|oauth)(\/|$)|^\/(callback|confirm)\.html$/.test(location.pathname) ||
      document.getElementById('ma-browser-polish-20261111')) return;
  var finish=document.createElement('link');finish.id='ma-browser-polish-20261111';
  finish.rel='stylesheet';finish.href='/patches/browser-polish-20261111.css?v=3';
  document.head.appendChild(finish);
  if (/^\/(?:index\.html|explore\.html)?$/.test(location.pathname)) {
    var guide=document.createElement('script');guide.defer=true;
    guide.src='/patches/browser-guide-copy-20261111.js?v=1';document.head.appendChild(guide);
  }
})();

/* Consolidated latest — 2026-11-17 */
(function(){
  if (/^\/(kids|private-voice|oauth)(\/|$)|^\/(callback|confirm)\.html$/.test(location.pathname)) return;
  var head = document.head || document.documentElement;
  function load(id, src, isCss) {
    if (document.getElementById(id)) return;
    var el = document.createElement(isCss ? 'link' : 'script');
    el.id = id;
    if (isCss) { el.rel = 'stylesheet'; el.href = src; }
    else { el.defer = true; el.src = src; }
    head.appendChild(el);
  }
  load('ma-layout-force', '/patches/layout-force-20261117.css?v=1', true);
  load('ma-cwv', '/patches/cwv-optimize-20261117.js?v=1', false);
  load('ma-click', '/patches/click-response-20261117.js?v=1', false);
  load('ma-bubble', '/patches/android-download-bubble-20261117.js?v=1', false);
  if (/\/discover\.html$/i.test(location.pathname)) {
    load('ma-noindex', '/patches/discover-query-noindex-20261117.js?v=1', false);
  }
})();

/* Friday upgrade bubble — adult landing only. */
(function(){
  if (/^\/(kids|private-voice|oauth)(\/|$)|^\/(callback|confirm)\.html$/.test(location.pathname)) return;
  if (document.getElementById('ma-friday-bubble')) return;
  var s=document.createElement('script');
  s.id='ma-friday-bubble';
  s.defer=true;
  s.src='/patches/android-friday-bubble-20261117.js?v=1';
  (document.head||document.documentElement).appendChild(s);
})();

/* Layout force v2 — targets actual live elements. */
(function(){
  if (/^\/(kids|private-voice|oauth)(\/|$)|^\/(callback|confirm)\.html$/.test(location.pathname)) return;
  if (document.getElementById('ma-layout-v2')) return;
  var l=document.createElement('link');
  l.id='ma-layout-v2';
  l.rel='stylesheet';
  l.href='/patches/layout-force-v2-20261117.css?v=1';
  (document.head||document.documentElement).appendChild(l);
})();

/* Layout force v3. */
(function(){
  if (/^\/(kids|private-voice|oauth)(\/|$)|^\/(callback|confirm)\.html$/.test(location.pathname)) return;
  if (document.getElementById('ma-layout-v3')) return;
  var l=document.createElement('link');
  l.id='ma-layout-v3';
  l.rel='stylesheet';
  l.href='/patches/layout-force-v3-20261117.css?v=1';
  (document.head||document.documentElement).appendChild(l);
})();

/* Layout force v4 — matches home-fold-grid specificity. */
(function(){
  if (/^\/(kids|private-voice|oauth)(\/|$)|^\/(callback|confirm)\.html$/.test(location.pathname)) return;
  if (document.getElementById('ma-layout-v4')) return;
  var l=document.createElement('link');
  l.id='ma-layout-v4';
  l.rel='stylesheet';
  l.href='/patches/layout-force-v4-20261117.css?v=1';
  (document.head||document.documentElement).appendChild(l);
})();

/* Layout force JS. */
(function(){
  if (/^\/(kids|private-voice|oauth)(\/|$)|^\/(callback|confirm)\.html$/.test(location.pathname)) return;
  if (document.getElementById('ma-layout-js')) return;
  var s=document.createElement('script');
  s.id='ma-layout-js';
  s.defer=true;
  s.src='/patches/layout-force-js-20261117.js?v=1';
  (document.head||document.documentElement).appendChild(s);
})();

/* Dock clearance. */
(function(){
  if (/^\/(kids|private-voice|oauth)(\/|$)|^\/(callback|confirm)\.html$/.test(location.pathname)) return;
  if (document.getElementById('ma-dock-clearance')) return;
  var l=document.createElement('link');
  l.id='ma-dock-clearance';
  l.rel='stylesheet';
  l.href='/patches/dock-clearance-20261117.css?v=1';
  (document.head||document.documentElement).appendChild(l);
})();

/* Desktop spacing. */
(function(){
  if (/^\/(kids|private-voice|oauth)(\/|$)|^\/(callback|confirm)\.html$/.test(location.pathname)) return;
  if (document.getElementById('ma-desktop-spacing')) return;
  var l=document.createElement('link');
  l.id='ma-desktop-spacing';
  l.rel='stylesheet';
  l.href='/patches/desktop-spacing-20261117.css?v=1';
  (document.head||document.documentElement).appendChild(l);
})();

/* Center cards. */
(function(){
  if (/^\/(kids|private-voice|oauth)(\/|$)|^\/(callback|confirm)\.html$/.test(location.pathname)) return;
  if (document.getElementById('ma-center-cards')) return;
  var l=document.createElement('link');
  l.id='ma-center-cards';
  l.rel='stylesheet';
  l.href='/patches/center-cards-20261117.css?v=1';
  (document.head||document.documentElement).appendChild(l);
})();

/* Center and side ads. */
(function(){
  if (/^\/(kids|private-voice|oauth)(\/|$)|^\/(callback|confirm)\.html$/.test(location.pathname)) return;
  if (document.getElementById('ma-center-ads')) return;
  var l=document.createElement('link');
  l.id='ma-center-ads';
  l.rel='stylesheet';
  l.href='/patches/center-ads-desktop-20261117.css?v=1';
  (document.head||document.documentElement).appendChild(l);
})();

/* Fast posters. */
(function(){
  if (/^\/(kids|private-voice|oauth)(\/|$)|^\/(callback|confirm)\.html$/.test(location.pathname)) return;
  if (document.getElementById('ma-poster-fast')) return;
  var s=document.createElement('script');
  s.id='ma-poster-fast';
  s.defer=true;
  s.src='/patches/poster-fast-20261117.js?v=1';
  (document.head||document.documentElement).appendChild(s);
})();
