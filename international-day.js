/* MatchApp TV Ai — data-driven International Day cards in the Events rail.
   Current day appears first. Ended days remain at the row end for 3 days, then disappear.
   A real event image is mandatory: no text-only/emoji placeholder posters are rendered. */
(function () {
  'use strict';

  var SRC='/data/international-day.json';
  var HISTORY_SRC='/data/international-day-history.json';
  var DAY=86400000,RETAIN_ENDED_DAYS=3;

  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function langKey(){var raw='en';try{raw=String(window.MATCH_LANG||localStorage.getItem('match_lang')||document.documentElement.lang||'en').toLowerCase();}catch(_){}
    if(raw.indexOf('pt')===0)return'pt-BR';if(raw.indexOf('es')===0)return'es';return'en';}
  function localize(data){var out={},key;for(key in data)if(Object.prototype.hasOwnProperty.call(data,key))out[key]=data[key];
    var loc=data&&data.i18n&&data.i18n[langKey()];if(loc)for(key in loc)if(Object.prototype.hasOwnProperty.call(loc,key))out[key]=loc[key];return out;}
  function todayISO(){var d=new Date(),m=String(d.getMonth()+1).padStart(2,'0'),n=String(d.getDate()).padStart(2,'0');return d.getFullYear()+'-'+m+'-'+n;}
  function dayNumber(iso){var n=Date.parse(String(iso||'')+'T12:00:00Z');return Number.isFinite(n)?Math.floor(n/DAY):NaN;}
  function lifecycle(day){var now=dayNumber(todayISO()),when=dayNumber(day.date);if(!Number.isFinite(now)||!Number.isFinite(when))return'expired';
    var diff=now-when;if(diff<0)return'upcoming';if(diff===0)return'today';if(diff<=RETAIN_ENDED_DAYS)return'ended';return'expired';}
  function prettyDate(iso){try{return new Intl.DateTimeFormat(document.documentElement.lang||'en',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(iso+'T12:00:00Z'));}catch(_){return iso;}}
  function askHref(day){var q=String(day.prompt||('What is '+(day.title||"today's international day")+', and how can I enjoy it tonight?')).slice(0,600);
    return'/discover.html?q='+encodeURIComponent(q)+'&focus=start';}

  function card(day,state){
    if(!day.image)return null;
    var href=askHref(day),label=state==='today'?'Today':state==='ended'?'Ended':prettyDate(day.date);
    var badgeClass=state==='today'?'event-live':state==='ended'?'event-ended':'event-soon';
    var article=document.createElement('article');
    article.className='premium-card global-event international-day'+(state==='ended'?' id-ended-retained':'');
    article.id=state==='today'?'international-day-card':'international-day-card-'+String(day.id||day.date).replace(/[^a-z0-9_-]+/gi,'-');
    article.setAttribute('data-international-day',esc(day.id||day.date||'1'));
    article.innerHTML=
      '<a class="id-art" href="'+esc(href)+'" aria-label="'+esc(day.title)+' — ask MatchApp Ai about this day">'+
      '<img src="'+esc(day.image)+'" alt="'+esc(day.imageAlt||day.title)+'" width="1024" height="1536" loading="lazy" decoding="async"></a>'+
      '<span class="event-badge '+badgeClass+'">'+esc(label)+'</span>'+
      '<h3><a href="'+esc(href)+'">'+esc(day.emoji?day.emoji+' ':'')+esc(day.title)+'</a></h3>'+
      '<p><span class="id-kicker">'+esc(day.kicker||'International day')+'</span>'+(day.place?'<br>'+esc(day.place):'')+'</p>'+
      '<p class="id-summary">'+esc(day.summary||'')+'</p>'+
      '<a class="gold-btn id-cta" href="'+esc(href)+'">✨ Ask MatchApp Ai</a>'+
      (day.officialUrl?'<a class="id-official" href="'+esc(day.officialUrl)+'" target="_blank" rel="noopener noreferrer">Official page</a>':'');
    var img=article.querySelector('img');if(img)img.addEventListener('error',function(){article.remove();},{once:true});
    return article;
  }

  function schema(day,state){
    var node=document.createElement('script');node.type='application/ld+json';
    node.id='international-day-schema-'+String(day.id||day.date).replace(/[^a-z0-9_-]+/gi,'-');
    node.textContent=JSON.stringify({
      '@context':'https://schema.org','@type':'Event',name:day.title,startDate:day.date,endDate:day.date,
      eventStatus:state==='ended'?'https://schema.org/EventCompleted':'https://schema.org/EventScheduled',
      eventAttendanceMode:'https://schema.org/OnlineEventAttendanceMode',description:day.summary||'',about:day.kicker||'International day',
      isAccessibleForFree:true,image:new URL(day.image,location.origin).href,
      location:{'@type':'VirtualLocation',url:new URL(askHref(day),location.origin).href},
      organizer:{'@type':'Organization',name:day.sourceName||'MatchApp TV Ai',url:day.officialUrl||'https://matchapp.tv/'},
      url:day.officialUrl||new URL(askHref(day),location.origin).href,
      keywords:Array.isArray(day.keywords)?day.keywords.join(', '):undefined,inLanguage:document.documentElement.lang||'en'
    });return node;
  }

  function seo(day){if(!Array.isArray(day.keywords)||!day.keywords.length)return;var meta=document.querySelector('meta[name="keywords"]');if(!meta)return;
    var have=String(meta.content||'').toLowerCase(),add=day.keywords.map(function(k){return String(k).trim();}).filter(function(k){return k&&have.indexOf(k.toLowerCase())===-1;});
    if(add.length)meta.content=(meta.content?meta.content+', ':'')+add.join(', ');
  }

  function mount(current,history){
    var grid=document.querySelector('#global-events .global-event-grid');if(!grid)return;
    var records=[],seen={};
    [current].concat(Array.isArray(history)?history:[]).forEach(function(raw){
      if(!raw||typeof raw!=='object'||!raw.title||!raw.date||!raw.image)return;
      var key=String(raw.id||raw.date+'-'+raw.title);if(seen[key])return;seen[key]=1;records.push(localize(raw));
    });
    var live=[],ended=[];
    records.forEach(function(day){var state=lifecycle(day);if(state==='expired')return;(state==='ended'?ended:live).push({day:day,state:state});});
    live.sort(function(a,b){return String(a.day.date).localeCompare(String(b.day.date));});
    ended.sort(function(a,b){return String(b.day.date).localeCompare(String(a.day.date));});
    live.forEach(function(item){var el=card(item.day,item.state);if(el)grid.insertBefore(el,grid.firstChild);});
    ended.forEach(function(item){var el=card(item.day,item.state);if(el)grid.appendChild(el);});
    live.concat(ended).forEach(function(item){
      var sid='international-day-schema-'+String(item.day.id||item.day.date).replace(/[^a-z0-9_-]+/gi,'-');
      if(!document.getElementById(sid))document.head.appendChild(schema(item.day,item.state));seo(item.day);
    });
    var count=document.querySelector('#global-events .ge-sum-count');if(count)count.textContent=String([...grid.querySelectorAll('.global-event')].filter(function(x){return!x.hidden;}).length);
  }

  function fetchJson(url,fallback){return fetch(url,{cache:'no-cache',credentials:'same-origin'}).then(function(r){return r.ok?r.json():fallback;}).catch(function(){return fallback;});}
  function boot(){
    if(location.pathname.indexOf('/kids')===0)return;
    if(!document.querySelector('#global-events .global-event-grid'))return;
    Promise.all([fetchJson(SRC,null),fetchJson(HISTORY_SRC,[])]).then(function(v){mount(v[0],v[1]);});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
