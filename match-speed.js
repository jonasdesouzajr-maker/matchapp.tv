/* MatchApp match-speed guard.
   Keeps the loading experience polished without making a ready answer wait for
   a theatrical timer, and guarantees a stalled request returns control to UI. */
(function(){
  'use strict';
  const original=window.triggerMatch;
  if(typeof original!=='function'||original.__matchSpeedWrapped)return;

  const nativeSetTimeout=window.setTimeout.bind(window);
  const nativeClearTimeout=window.clearTimeout.bind(window);
  let activePromise=null;

  function recover(){
    const loading=document.getElementById('loading-box');
    const questionnaire=document.getElementById('questionnaire-box');
    const search=document.getElementById('search-box');
    if(loading)loading.style.display='none';
    if(questionnaire)questionnaire.style.display='block';
    if(search)search.style.display='block';
    window.showToast?.('That match took longer than expected. Your page is still responsive — please try again.',true);
  }

  const wrapped=async function(...args){
    // A rapid double-click must not spend quota twice or launch competing renders.
    if(activePromise)return activePromise;

    let resultReady=false,finished=false;
    const onReady=()=>{resultReady=true;};
    document.addEventListener('matchapp:newmatch',onReady);

    // Use the native timer so this watchdog is never affected by our short
    // post-result delay below.
    const watchdog=nativeSetTimeout(()=>{if(!finished)recover();},18000);

    // app.js historically enforced 13.5s (3s VIP) after dispatching
    // matchapp:newmatch, even when the result was already computed. Before the
    // event, leave ALL timers untouched so network/request timeouts keep their
    // intended values. After the event, the expensive work is finished; cap
    // only that remaining presentation delay.
    const previousSetTimeout=window.setTimeout;
    window.setTimeout=function(fn,delay,...rest){
      const ms=Number(delay)||0;
      if(resultReady&&ms>500&&ms<=14000)return nativeSetTimeout(fn,Math.min(ms,350),...rest);
      return nativeSetTimeout(fn,ms,...rest);
    };

    activePromise=(async()=>{
      try{return await original.apply(this,args);}
      finally{
        finished=true;
        nativeClearTimeout(watchdog);
        document.removeEventListener('matchapp:newmatch',onReady);
        if(window.setTimeout!==previousSetTimeout)window.setTimeout=previousSetTimeout;
        activePromise=null;
      }
    })();
    return activePromise;
  };

  wrapped.__matchSpeedWrapped=true;
  wrapped.__original=original;
  window.triggerMatch=wrapped;
})();
