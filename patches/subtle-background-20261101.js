/* Canonical subtle-background loader for adult web and Android WebView pages. */
(function(){
  'use strict';
  if(window.top!==window || /^\/(kids|private-voice|oauth|android-studio)(\/|$)/.test(location.pathname) || /\/(callback|confirm)\.html$/.test(location.pathname))return;
  if(document.getElementById('ma-subtle-bg-20261101'))return;
  var link=document.createElement('link');
  link.id='ma-subtle-bg-20261101';link.rel='stylesheet';link.href='/patches/subtle-background-20261101.css?v=20261101-4';
  link.onload=function(){document.documentElement.dataset.maSubtleActive='true';};
  (document.head||document.documentElement).appendChild(link);
})();
