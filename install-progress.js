/* Install progress intentionally has no layout UI.
   Browser/PWA install APIs do not expose trustworthy byte progress. */
(function(){
'use strict';
const noop=()=>{};
window.matchAppInstallProgress=Object.freeze({
 start:noop,complete:noop,cancel:noop,updating:noop,downloadReady:noop,installingUpdate:noop,updated:noop
});
})();
