/* Adult matching guard shared by desktop, phone, tablet and Android WebView.
   A verified match may take longer than 12 seconds; never spend quota twice. */
(function(){
  'use strict';
  const original=window.triggerMatch;
  if(typeof original!=='function'||original.__matchSpeedWrapped)return;
  const nativeSetTimeout=window.setTimeout.bind(window);
  const nativeClearTimeout=window.clearTimeout.bind(window);
  let activePromise=null,generation=0;
  function recover(reason){
    generation++;
    activePromise=null;
    const result=document.getElementById('result-box');
    if(result&&result.style.display!=='none'&&result.classList.contains('is-revealed'))return;
    window.__matchappMatchRunId=(Number(window.__matchappMatchRunId)||0)+1;
    if(window.__matchappActiveProgressTimer!=null){
      window.clearInterval(window.__matchappActiveProgressTimer);
      window.__matchappActiveProgressTimer=null;
    }
    document.body?.classList.remove('match-searching');
    document.getElementById('loading-box')?.style.setProperty('display','none');
    if(typeof window.goToQuestionnaire==='function')window.goToQuestionnaire();
    else{
      const q=document.getElementById('questionnaire-box'),s=document.getElementById('search-box');
      if(q)q.style.display='block';if(s)s.style.display='block';
    }
    window.showToast?.(reason==='error'
      ? 'Something interrupted that match. Your choices are saved — please try again.'
      : 'Source verification took too long. Your page is responsive — please try again.',true);
  }
  const wrapped=function(...args){
    if(activePromise)return activePromise;
    const myGeneration=++generation;
    let finished=false;
    // 50 s TMDB + 15 s iTunes + 50 s AI, plus allowance/rendering headroom.
    const watchdog=nativeSetTimeout(()=>{
      if(!finished&&myGeneration===generation){
        // Never reopen matching while an allowance debit is pending.
        if(window.__matchappMatchPhase==='quota'){
          window.showToast?.('Still confirming your match allowance. Please do not retry yet.',true);
          return;
        }
        recover('timeout');
      }
    },150000);
    activePromise=(async()=>{
      try{return await original.apply(this,args);}
      catch(e){
        console.error('[matchapp] Match interrupted:',e);
        if(myGeneration===generation)recover('error');
        return null;
      }finally{
        finished=true;
        nativeClearTimeout(watchdog);
        if(myGeneration===generation)activePromise=null;
      }
    })();
    return activePromise;
  };
  wrapped.__matchSpeedWrapped=true;
  wrapped.__original=original;
  window.triggerMatch=wrapped;
})();
