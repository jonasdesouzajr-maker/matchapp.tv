/* MatchApp Ai — data-driven International Day cards in the Events rail.
   Current day appears first. Ended days remain at the row end for 3 days, then disappear.
   A real event image is mandatory: no text-only/emoji placeholder posters are rendered. */
(function () {
  'use strict';

  var SRC='/data/international-day.json?v=20260924-maritime2';
  var HISTORY_SRC='/data/international-day-history.json?v=20260924-maritime2';
  var GRID='#global-events .global-event-grid, .event-archive-grid[data-international-day-host]';
  var DAY=86400000,RETAIN_ENDED_DAYS=3;
  var mounted=[],activeLanguage='';
  var COPY={
    en:{today:'Today',ended:'Ended',ask:'Ask MatchApp Ai',official:'Official page',day:'International day',about:'Ask MatchApp Ai about this day',prompt:'What is {title}, and how can I enjoy it tonight?'},
    'pt-BR':{today:'Hoje',ended:'Encerrado',ask:'Pergunte ao MatchApp Ai',official:'Página oficial',day:'Dia internacional',about:'Pergunte ao MatchApp Ai sobre esta data',prompt:'O que é {title} e como posso aproveitar esta noite?'},
    es:{today:'Hoy',ended:'Finalizado',ask:'Preguntar a MatchApp Ai',official:'Página oficial',day:'Día internacional',about:'Pregunta a MatchApp Ai sobre este día',prompt:'¿Qué es {title} y cómo puedo disfrutarlo esta noche?'},
    fr:{today:'Aujourd’hui',ended:'Terminé',ask:'Demander à MatchApp Ai',official:'Page officielle',day:'Journée internationale',about:'Demander à MatchApp Ai des informations sur cette journée',prompt:'Qu’est-ce que {title} et comment en profiter ce soir ?'},
    de:{today:'Heute',ended:'Beendet',ask:'MatchApp Ai fragen',official:'Offizielle Seite',day:'Internationaler Tag',about:'MatchApp Ai nach diesem Tag fragen',prompt:'Was ist {title} und wie kann ich den heutigen Abend passend dazu gestalten?'},
    it:{today:'Oggi',ended:'Concluso',ask:'Chiedi a MatchApp Ai',official:'Pagina ufficiale',day:'Giornata internazionale',about:'Chiedi a MatchApp Ai informazioni su questa giornata',prompt:'Che cos’è {title} e come posso celebrarla questa sera?'},
    tr:{today:'Bugün',ended:'Sona erdi',ask:'MatchApp Ai’a sor',official:'Resmî sayfa',day:'Uluslararası gün',about:'Bu gün hakkında MatchApp Ai’a sor',prompt:'{title} nedir ve bu akşam bu güne uygun neler yapabilirim?'},
    ru:{today:'Сегодня',ended:'Завершено',ask:'Спросить MatchApp Ai',official:'Официальная страница',day:'Международный день',about:'Спросить MatchApp Ai об этом дне',prompt:'Что такое {title} и как отметить этот день сегодня вечером?'},
    ar:{today:'اليوم',ended:'انتهى',ask:'اسأل MatchApp Ai',official:'الصفحة الرسمية',day:'يوم عالمي',about:'اسأل MatchApp Ai عن هذا اليوم',prompt:'ما هو {title} وكيف يمكنني الاحتفال به هذا المساء؟'},
    hi:{today:'आज',ended:'समाप्त',ask:'MatchApp Ai से पूछें',official:'आधिकारिक पृष्ठ',day:'अंतरराष्ट्रीय दिवस',about:'इस दिवस के बारे में MatchApp Ai से पूछें',prompt:'{title} क्या है और मैं आज शाम इसे कैसे मना सकता हूँ?'},
    id:{today:'Hari ini',ended:'Berakhir',ask:'Tanya MatchApp Ai',official:'Halaman resmi',day:'Hari internasional',about:'Tanya MatchApp Ai tentang hari ini',prompt:'Apa itu {title} dan bagaimana saya bisa merayakannya malam ini?'},
    ja:{today:'今日',ended:'終了',ask:'MatchApp Aiに聞く',official:'公式ページ',day:'国際デー',about:'この日についてMatchApp Aiに聞く',prompt:'{title}とは何ですか？今夜はどのように楽しめますか？'},
    ko:{today:'오늘',ended:'종료',ask:'MatchApp Ai에 물어보기',official:'공식 페이지',day:'국제 기념일',about:'이 기념일에 대해 MatchApp Ai에 물어보기',prompt:'{title}은 어떤 날이며 오늘 저녁에 어떻게 기념할 수 있나요?'},
    zh:{today:'今天',ended:'已结束',ask:'询问MatchApp Ai',official:'官方网站',day:'国际日',about:'向MatchApp Ai询问这个纪念日',prompt:'{title}是什么日子？今晚可以怎样庆祝？'}
  };

  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function normalizeLang(raw){var key=String(raw||'').trim().toLowerCase().replace(/_/g,'-').split('-')[0];if(key==='pt')key='pt-BR';return Object.prototype.hasOwnProperty.call(COPY,key)?key:'';}
  function langKey(){var saved='';try{saved=localStorage.getItem('match_lang');}catch(_){}
    return activeLanguage||normalizeLang(saved)||normalizeLang(window.MATCH_LANG)||normalizeLang(document.documentElement.lang)||'en';}
  function localize(data){var out={},key;for(key in data)if(Object.prototype.hasOwnProperty.call(data,key))out[key]=data[key];
    var loc=data&&data.i18n&&data.i18n[langKey()];if(loc)for(key in loc)if(Object.prototype.hasOwnProperty.call(loc,key))out[key]=loc[key];return out;}
  function todayISO(){var d=new Date(),m=String(d.getMonth()+1).padStart(2,'0'),n=String(d.getDate()).padStart(2,'0');return d.getFullYear()+'-'+m+'-'+n;}
  function dayNumber(iso){var n=Date.parse(String(iso||'')+'T12:00:00Z');return Number.isFinite(n)?Math.floor(n/DAY):NaN;}
  function lifecycle(day){var now=dayNumber(todayISO()),when=dayNumber(day.date);if(!Number.isFinite(now)||!Number.isFinite(when))return'expired';
    var diff=now-when;if(diff<0)return'upcoming';if(diff===0)return'today';if(diff<=RETAIN_ENDED_DAYS)return'ended';return'expired';}
  function prettyDate(iso){try{return new Intl.DateTimeFormat(langKey(),{dateStyle:'medium',timeZone:'UTC'}).format(new Date(iso+'T12:00:00Z'));}catch(_){return iso;}}
  function askHref(day){var copy=COPY[langKey()],q=String(day.prompt||copy.prompt.replace('{title}',function(){return day.title||copy.day;})).slice(0,600);
    return'/discover.html?q='+encodeURIComponent(q)+'&focus=start';}

  function card(day,state){
    if(!day.image)return null;
    var copy=COPY[langKey()],href=askHref(day),label=state==='today'?copy.today:state==='ended'?copy.ended:prettyDate(day.date);
    var badgeClass=state==='today'?'event-live':state==='ended'?'event-ended':'event-soon';
    var article=document.createElement('article');
    article.className='premium-card global-event international-day'+(state==='ended'?' id-ended-retained':'');
    article.id=state==='today'?'international-day-card':'international-day-card-'+String(day.id||day.date).replace(/[^a-z0-9_-]+/gi,'-');
    article.setAttribute('data-international-day',esc(day.id||day.date||'1'));
    article.innerHTML=
      '<a class="id-art" href="'+esc(href)+'" aria-label="'+esc(day.title+' — '+copy.about)+'">'+
      '<img src="'+esc(day.image)+'" alt="'+esc(day.imageAlt||day.title)+'" width="900" height="1200" loading="lazy" decoding="async"></a>'+
      '<span class="event-badge '+badgeClass+'">'+esc(label)+'</span>'+
      '<h3><a href="'+esc(href)+'">'+esc(day.emoji?day.emoji+' ':'')+esc(day.title)+'</a></h3>'+
      '<p><span class="id-kicker">'+esc(day.kicker||copy.day)+'</span>'+(day.place?'<br>'+esc(day.place):'')+'</p>'+
      '<p class="id-summary">'+esc(day.summary||'')+'</p>'+
      '<a class="gold-btn id-cta" href="'+esc(href)+'">✨ '+esc(copy.ask)+'</a>'+
      (day.officialUrl?'<a class="id-official" href="'+esc(day.officialUrl)+'" target="_blank" rel="noopener noreferrer">'+esc(copy.official)+'</a>':'');
    var img=article.querySelector('img');if(img)img.addEventListener('error',function(){article.remove();},{once:true});
    return article;
  }

  function schema(day,state){
    var node=document.createElement('script');node.type='application/ld+json';
    node.id='international-day-schema-'+String(day.id||day.date).replace(/[^a-z0-9_-]+/gi,'-');
    node.textContent=JSON.stringify({
      '@context':'https://schema.org','@type':'Event',name:day.title,startDate:day.date,endDate:day.date,
      eventStatus:state==='ended'?'https://schema.org/EventCompleted':'https://schema.org/EventScheduled',
      eventAttendanceMode:'https://schema.org/OnlineEventAttendanceMode',description:day.summary||'',about:day.kicker||COPY[langKey()].day,
      isAccessibleForFree:true,image:new URL(day.image,location.origin).href,
      location:{'@type':'VirtualLocation',url:new URL(askHref(day),location.origin).href},
      organizer:{'@type':'Organization',name:day.sourceName||'MatchApp Ai',url:day.officialUrl||'https://matchapp.tv/'},
      url:day.officialUrl||new URL(askHref(day),location.origin).href,
      keywords:Array.isArray(day.keywords)?day.keywords.join(', '):undefined,inLanguage:langKey()
    });return node;
  }

  function seo(day){if(!Array.isArray(day.keywords)||!day.keywords.length)return;var meta=document.querySelector('meta[name="keywords"]');if(!meta)return;
    var have=String(meta.content||'').toLowerCase(),add=day.keywords.map(function(k){return String(k).trim();}).filter(function(k){return k&&have.indexOf(k.toLowerCase())===-1;});
    if(add.length)meta.content=(meta.content?meta.content+', ':'')+add.join(', ');
  }

  function mount(current,history){
    var grid=document.querySelector(GRID);if(!grid)return;
    var records=[],seen={};
    [current].concat(Array.isArray(history)?history:[]).forEach(function(raw){
      if(!raw||typeof raw!=='object'||!raw.title||!raw.date||!raw.image)return;
      var key=String(raw.id||raw.date+'-'+raw.title);if(seen[key])return;seen[key]=1;records.push({raw:raw,day:localize(raw)});
    });
    var live=[],ended=[];
    records.forEach(function(record){var state=lifecycle(record.day);if(state==='expired')return;(state==='ended'?ended:live).push({raw:record.raw,day:record.day,state:state});});
    live.sort(function(a,b){return String(a.day.date).localeCompare(String(b.day.date));});
    ended.sort(function(a,b){return String(b.day.date).localeCompare(String(a.day.date));});
    live.forEach(function(item){var el=card(item.day,item.state);item.element=el;if(el)grid.insertBefore(el,grid.firstChild);});
    ended.forEach(function(item){var el=card(item.day,item.state);item.element=el;if(el)grid.appendChild(el);});
    live.concat(ended).forEach(function(item){
      var sid='international-day-schema-'+String(item.day.id||item.day.date).replace(/[^a-z0-9_-]+/gi,'-');
      item.schema=document.getElementById(sid);if(!item.schema){item.schema=schema(item.day,item.state);document.head.appendChild(item.schema);}seo(item.day);
    });
    mounted=live.concat(ended);
    var count=document.querySelector('#global-events .ge-sum-count');if(count)count.textContent=String([...grid.querySelectorAll('.global-event')].filter(function(x){return!x.hidden;}).length);
  }

  function repaint(event){var selected=normalizeLang(event&&event.detail&&event.detail.lang);if(selected)activeLanguage=selected;
    mounted.forEach(function(item){
    var article=item.element;if(!article||!article.isConnected)return;
    var day=localize(item.raw),copy=COPY[langKey()],href=askHref(day);
    var art=article.querySelector('.id-art');art.setAttribute('href',href);art.setAttribute('aria-label',day.title+' — '+copy.about);
    article.querySelector('img').alt=day.imageAlt||day.title;
    article.querySelector('.event-badge').textContent=item.state==='today'?copy.today:item.state==='ended'?copy.ended:prettyDate(day.date);
    var title=article.querySelector('h3 a');title.setAttribute('href',href);title.textContent=(day.emoji?day.emoji+' ':'')+day.title;
    article.querySelector('.id-kicker').parentNode.innerHTML='<span class="id-kicker">'+esc(day.kicker||copy.day)+'</span>'+(day.place?'<br>'+esc(day.place):'');
    article.querySelector('.id-summary').textContent=day.summary||'';
    var cta=article.querySelector('.id-cta');cta.setAttribute('href',href);cta.textContent='✨ '+copy.ask;
    var official=article.querySelector('.id-official');if(official)official.textContent=copy.official;
    if(item.schema)item.schema.textContent=schema(day,item.state).textContent;
  });}

  function fetchJson(url,fallback){return fetch(url,{cache:'no-cache',credentials:'same-origin'}).then(function(r){return r.ok?r.json():fallback;}).catch(function(){return fallback;});}
  function boot(){
    if(location.pathname.indexOf('/kids')===0)return;
    if(!document.querySelector(GRID))return;
    document.addEventListener('matchapp:langchange',repaint);
    Promise.all([fetchJson(SRC,null),fetchJson(HISTORY_SRC,[])]).then(function(v){mount(v[0],v[1]);});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
