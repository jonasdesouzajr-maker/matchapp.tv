/* Date-aware verified entertainment events. Home retains ended cards for 3 days at the row end; archive keeps history. */
(function(){'use strict';
  const DAY=86400000,RETAIN_ENDED_DAYS=3,RETAIN_ENDED_MS=RETAIN_ENDED_DAYS*DAY;
  function labelFor(state,start,end,now){
    if(state==='upcoming'){
      const ms=Math.max(0,start-now),days=Math.ceil(ms/DAY);
      if(ms<3600000)return 'Starts in <1h';
      if(ms<DAY)return 'Starts today';
      return 'Starts in '+days+' day'+(days===1?'':'s');
    }
    if(state==='live'){
      const days=Math.max(1,Math.ceil((end-now)/DAY));
      return 'Happening now · '+days+' day'+(days===1?'':'s')+' left';
    }
    return 'Ended';
  }
  function render(){
    const now=Date.now(),retainedEnded=[];
    document.querySelectorAll('[data-event-start]').forEach(card=>{
      const start=Date.parse(card.dataset.eventStart),end=Date.parse(card.dataset.eventEnd);
      if(!Number.isFinite(start)||!Number.isFinite(end))return;
      const state=now<start?'upcoming':now>end?'ended':'live';
      const badge=card.querySelector('[data-event-status]');
      if(badge){
        const fallback=state==='live'?'LIVE NOW':state==='ended'?'Ended':'Upcoming';
        badge.textContent=window.t?window.t('global.'+state)||fallback:fallback;
        badge.className='event-badge event-'+(state==='upcoming'?'soon':state);
      }
      const countdown=card.querySelector('[data-event-countdown]');
      if(countdown)countdown.textContent=labelFor(state,start,end,now);
      card.querySelectorAll('[data-event-date]').forEach(el=>{
        try{
          el.textContent=new Intl.DateTimeFormat(document.documentElement.lang||'en',{dateStyle:'medium',timeZone:card.dataset.eventZone||'UTC'}).format(new Date(el.dataset.eventDate));
        }catch(_){el.textContent=String(el.dataset.eventDate||'').slice(0,10);}
      });
      // Home keeps a finished event for 3 full days, marked Ended, then removes it from the row.
      // Public event guides remain indexed after the Home card disappears.
      const homeCard=card.closest('#global-events'),expired=state==='ended'&&now>end+RETAIN_ENDED_MS;
      if(homeCard){card.hidden=expired;if(state==='ended'&&!expired)retainedEnded.push(card);}
    });
    const home=document.getElementById('global-events');
    if(home){
      const grid=home.querySelector('.global-event-grid');
      if(grid)retainedEnded.sort((a,b)=>Date.parse(b.dataset.eventEnd)-Date.parse(a.dataset.eventEnd)).forEach(card=>grid.appendChild(card));
      const visible=[...home.querySelectorAll('article.global-event')].filter(x=>!x.hidden).length;
      const count=home.querySelector('.ge-sum-count');if(count)count.textContent=String(visible);
    }
  }
  function wireEventHandoff(){
    document.addEventListener('click',event=>{
      const link=event.target?.closest?.('.global-event a[href^="/events/"]');if(!link)return;
      try{
        const url=new URL(link.getAttribute('href'),location.origin);
        if(url.origin!==location.origin||!url.pathname.startsWith('/events/'))return;
        event.preventDefault();
        location.href='/discover.html?event='+encodeURIComponent(url.pathname)+'&focus=start&source=events';
      }catch(_){}
    },true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
  wireEventHandoff();
  document.addEventListener('matchapp:langchange',render);
  setInterval(render,60000);
})();