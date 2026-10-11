/* Early Android WebView presentation guard. Use only verified app user-agent.
 * The browser site (including its Kids Mode) stays unchanged. */
(function(){
 'use strict';
 if(!/MatchAppAiAndroid\//i.test(navigator.userAgent||'')) return;
 var root=document.documentElement;
 if(!root) return;
 root.classList.add('matchapp-android','matchapp-ai-android');
 var style=document.createElement('style');
 style.id='matchapp-android-early-kids';
 style.textContent='html.matchapp-ai-android #matchapp-kids-entry,'+
  'html.matchapp-ai-android .ma-kids-mode-entry,'+
  'html.matchapp-ai-android a[href^="/kids"],'+
  'html.matchapp-ai-android a[href^="https://matchapp.tv/kids"],'+
  'html.matchapp-ai-android button[data-mode="kids"],'+
  'html.matchapp-ai-android [data-matchapp-kids-entry]{display:none!important}';
 (document.head||root).appendChild(style);
})();