/* One persistent adult companion; Home and native Android retain their existing owner. */
(function(){
 'use strict';
 if(window.top!==window||/^\/(kids|private-voice|oauth)(\/|$)/.test(location.pathname)||/\/(callback|confirm)\.html$/.test(location.pathname)||/^\/(?:index\.html)?$/.test(location.pathname)||/MatchAppAiAndroid\//.test(navigator.userAgent))return;
 if(window.__matchappAmbientJonas||document.getElementById('matchapp-ambient-jonas-script'))return;
 window.__MATCHAPP_AMBIENT_WEB__=true;
 var script=document.createElement('script');script.id='matchapp-ambient-jonas-script';script.defer=true;
 script.src='/jonas/android-ambient-assistant-20261011.js?v=corner20261020-1&voicepair=20261014-1&instant=20261015-1&stellar=20261020-1&header=20261020-1&resize=20261022-1&repair=20261023-1';
 document.head.appendChild(script);
})();
/* UI fixes 2026-10-23: pills, poster wall, logo, chat resize and close (all adult pages, web and Android). */
(function(){
 'use strict';
 if(/^\/(kids|private-voice|oauth)(\/|$)|^\/(callback|confirm)\.html$/.test(location.pathname)||document.getElementById('ma-ui-fixes-20261023-css'))return;
 var l=document.createElement('link');l.id='ma-ui-fixes-20261023-css';l.rel='stylesheet';l.href='/ui-fixes-20261023.css?v=20261024-1&repair=20261023-1&masthead=20261025-1';(document.head||document.documentElement).appendChild(l);
 var s=document.createElement('script');s.id='ma-ui-fixes-20261023-js';s.defer=true;s.src='/ui-fixes-20261023.js?v=20261024-1&masthead=20261025-1';(document.head||document.documentElement).appendChild(s);
})();
