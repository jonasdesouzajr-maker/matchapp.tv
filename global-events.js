/* Date-aware editorial viewing guides. Their explicit official routes never use AI guesses. */
(function(){'use strict';
  function render(){
    document.querySelectorAll('[data-event-start]').forEach(card=>{
      const now=Date.now(),start=Date.parse(card.dataset.eventStart),end=Date.parse(card.dataset.eventEnd);
      const state=now<start?'upcoming':now>end?'ended':'live';
      const badge=card.querySelector('[data-event-status]');
      if(badge){badge.textContent=window.t?window.t('global.'+state):state;badge.className='event-badge event-'+(state==='upcoming'?'soon':state);}
      card.querySelectorAll('[data-event-date]').forEach(el=>{el.textContent=new Intl.DateTimeFormat(document.documentElement.lang||'en',{dateStyle:'medium',timeZone:card.dataset.eventZone||'UTC'}).format(new Date(el.dataset.eventDate));});
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
  document.addEventListener('matchapp:langchange',render);setInterval(render,60000);
})();
