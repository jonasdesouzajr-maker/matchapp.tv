/* MatchApp match-speed guard.
   Prevents double-taps from launching two matches, and recovers if a match
   hangs. Never shortens the cinematic loading meter — that wait is the show. */
(function(){
  'use strict';
  const original=window.triggerMatch;
  if(typeof original!=='function'||original.__matchSpeedWrapped)return;

  const nativeSetTimeout=window.setTimeout.bind(window);
  const nativeClearTimeout=window.clearTimeout.bind(window);
  let activePromise=null;

  function recover(){
    document.body.classList.remove('match-searching');
    const loading=document.getElementById('loading-box');
    if(loading)loading.style.display='none';
    if(typeof window.goToQuestionnaire==='function') window.goToQuestionnaire();
    else {
      const questionnaire=document.getElementById('questionnaire-box');
      const search=document.getElementById('search-box');
      if(questionnaire)questionnaire.style.display='block';
      if(search)search.style.display='block';
    }
    window.showToast?.('That match took longer than expected. Your page is still responsive — please try again.',true);
  }

  const wrapped=async function(...args){
    // A rapid double-click must not spend quota twice or launch competing renders.
    if(activePromise)return activePromise;

    let finished=false;
    // 13.5s meter + artwork fetch. Only fire if the match is genuinely stuck.
    const watchdog=nativeSetTimeout(()=>{if(!finished)recover();},30000);

    activePromise=(async()=>{
      try{return await original.apply(this,args);}
      finally{
        finished=true;
        nativeClearTimeout(watchdog);
        activePromise=null;
      }
    })();
    return activePromise;
  };

  wrapped.__matchSpeedWrapped=true;
  wrapped.__original=original;
  window.triggerMatch=wrapped;
})();
