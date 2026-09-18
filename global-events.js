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
  function wireEventHandoff(){
    document.addEventListener('click',event=>{
      const link=event.target?.closest?.('.global-event a[href^="/events/"]');if(!link)return;
      try{
        const url=new URL(link.getAttribute('href'),location.origin);
        if(url.origin!==location.origin||!url.pathname.startsWith('/events/'))return;
        event.preventDefault();
        location.href='/discover.html?event='+encodeURIComponent(url.pathname)+'&focus=start';
      }catch(_){}
    },true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
  wireEventHandoff();
  document.addEventListener('matchapp:langchange',render);setInterval(render,60000);
})();
