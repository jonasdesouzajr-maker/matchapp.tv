/* One persistent adult companion; Home and native Android retain their existing owner. */
(function(){
 'use strict';
 if(window.top!==window||location.pathname.startsWith('/kids')||/^\/(?:index\.html)?$/.test(location.pathname)||/MatchAppAiAndroid\//.test(navigator.userAgent))return;
 if(window.__matchappAmbientJonas||document.getElementById('matchapp-ambient-jonas-script'))return;
 window.__MATCHAPP_AMBIENT_WEB__=true;
 var script=document.createElement('script');script.id='matchapp-ambient-jonas-script';script.defer=true;
 script.src='/jonas/android-ambient-assistant-20261011.js?v=fullscreen20261014-dock1&voicepair=20261014-1';
 document.head.appendChild(script);
})();
