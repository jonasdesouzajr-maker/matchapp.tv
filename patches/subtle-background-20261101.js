/* Browser-only loader for the owner's subtle-background pass. */
(function(){
  'use strict';
  if(window.top!==window || /^\/(kids|private-voice|oauth|android-studio)(\/|$)/.test(location.pathname) || /\/(callback|confirm)\.html$/.test(location.pathname) || /MatchApp(?:TV|Ai)Android/i.test(navigator.userAgent||'') || document.documentElement.classList.contains('matchapp-android'))return;
  if(document.getElementById('ma-subtle-bg-20261101'))return;
  var link=document.createElement('link');
  link.id='ma-subtle-bg-20261101';link.rel='stylesheet';link.href='/patches/subtle-background-20261101.css?v=20261101-1';
  link.onload=function(){document.documentElement.dataset.maSubtleBrowser='true';};
  (document.head||document.documentElement).appendChild(link);
})();
