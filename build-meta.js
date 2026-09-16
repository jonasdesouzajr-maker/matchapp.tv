// Functional release identifier must match release.json.
window.MATCHAPP_BUILD = '2026.09.16.4';


/* HOME STARTUP SCHEDULER
   app.js registers several DOMContentLoaded jobs. Preserve every one, but
   spread them over short task boundaries so the first paint stays responsive.
   Unlike the emergency gate, this never drops poster/event/rail initialization. */
(function(){
  'use strict';
  const p=location.pathname;
  if(p!=='/'&&p!=='/index.html') return;
  if(window.__MATCHAPP_HOME_STARTUP_SCHEDULER__) return;
  window.__MATCHAPP_HOME_STARTUP_SCHEDULER__=true;
  const nativeAdd=Document.prototype.addEventListener;
  let slot=0;
  function patchedAdd(type,listener,options){
    const current=(document.currentScript&&document.currentScript.src)||'';
    const fromApp=type==='DOMContentLoaded'&&/\/app\.js(?:[?#]|$)/.test(current)&&typeof listener==='function';
    if(!fromApp) return nativeAdd.call(this,type,listener,options);
    const delay=Math.min(1500,60+(slot++*85));
    const wrapped=function(ev){
      const self=this;
      setTimeout(function(){
        try{listener.call(self,ev);}catch(err){console.error('[MatchApp startup]',err);}
      },delay);
    };
    return nativeAdd.call(this,type,wrapped,options);
  }
  Document.prototype.addEventListener=patchedAdd;
  window.addEventListener('load',function restoreNativeListener(){
    if(Document.prototype.addEventListener===patchedAdd) Document.prototype.addEventListener=nativeAdd;
  },{once:true});
})();
