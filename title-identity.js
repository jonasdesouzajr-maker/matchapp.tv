/* Bilingual display metadata only; recommendation identity and actions remain unchanged. */
(function(){'use strict';
 const states=new Map();
 const copy={en:['Original','Local title','Origin','Movie','Series','Book','Audiobook','Magazine','Music video','Title'],'pt-BR':['Original','Em português','Origem','Filme','Série','Livro','Audiolivro','Revista','Videoclipe','Título'],es:['Original','En español','Origen','Película','Serie','Libro','Audiolibro','Revista','Videoclip','Título'],fr:['Original','En français','Origine','Film','Série','Livre','Livre audio','Magazine','Clip musical','Titre'],de:['Original','Auf Deutsch','Herkunft','Film','Serie','Buch','Hörbuch','Zeitschrift','Musikvideo','Titel'],it:['Originale','In italiano','Origine','Film','Serie','Libro','Audiolibro','Rivista','Video musicale','Titolo'],tr:['Orijinal','Türkçe adı','Köken','Film','Dizi','Kitap','Sesli kitap','Dergi','Müzik videosu','Başlık'],ru:['Оригинал','На русском','Страна','Фильм','Сериал','Книга','Аудиокнига','Журнал','Музыкальное видео','Название'],ar:['الأصل','بالعربية','المنشأ','فيلم','مسلسل','كتاب','كتاب صوتي','مجلة','فيديو موسيقي','العنوان'],hi:['मूल','हिंदी में','देश','फ़िल्म','सीरीज़','पुस्तक','ऑडियोबुक','पत्रिका','संगीत वीडियो','शीर्षक'],id:['Asli','Dalam bahasa Indonesia','Asal','Film','Serial','Buku','Buku audio','Majalah','Video musik','Judul'],ja:['原題','日本語題','制作国','映画','シリーズ','本','オーディオブック','雑誌','ミュージックビデオ','タイトル'],ko:['원제','한국어 제목','제작 국가','영화','시리즈','책','오디오북','잡지','뮤직비디오','제목'],zh:['原名','中文名','来源国家','电影','剧集','书籍','有声书','杂志','音乐视频','标题']};
 const lang=()=>{let saved='';try{saved=localStorage.getItem('match_lang')||'';}catch(_){}return window.matchResultLanguage?.()||window.MATCH_LANG||saved||document.documentElement.lang||'en';};
 const kind=r=>r.kind||r._tmdbKind||r._tmdb?.kind||r._catalogMedia?.media_kind||r.media_kind||r.type||r.format||r.cats?.[0]||'';
 function typeIndex(type){return /audiobook/i.test(type)?6:/magazine/i.test(type)?7:/book|ebook/i.test(type)?5:/music.video|music/i.test(type)?8:/movie|film/i.test(type)?3:/tv|series|show|novela|drama|anime/i.test(type)?4:9;}
 function countries(r){const rows=r.originCountries||r.origin_countries||r._tmdb?.originCountries||r._catalogMedia?.origin_countries||[];return rows.length?rows:r.countryCode?[r.countryCode]:[];}
 function draw(node,r,L){
  const c=copy[L]||copy.en;let region;
  try{region=new Intl.DisplayNames([L],{type:'region'});}catch(_){}
  const origins=countries(r).filter(x=>/^[A-Z]{2}$/.test(x)).map(x=>region?.of(x)||x);
  const original=r.originalTitle||r.original_title||r.title||'',display=r.displayTitle||r.title||original;
  const values=[c[0]+': '+original,c[1]+': '+display,c[typeIndex(kind(r))]+(origins.length?' · '+c[2]+': '+origins.join(', '):'')];
  node.replaceChildren(...values.map(text=>{const span=document.createElement('span');span.textContent=text;return span;}));
 }
 async function paint(heading,record){
  if(!heading?.isConnected||!record?.title)return;
  let node=heading.nextElementSibling;
  if(!node?.classList.contains('matchapp-title-identity')){node=document.createElement('p');node.className='matchapp-title-identity';heading.insertAdjacentElement('afterend',node);}
  const L=lang(),state={heading,record,L};states.set(node,state);draw(node,record,L);
  let enriched={...record},type=kind(record);
  if(['movie','tv'].includes(type)&&window.tmdbLookup){
   try{const row=await window.tmdbLookup(record.title,{year:record.year||'',kind:type,cats:record.cats||[]});if(row){enriched={...enriched,originalTitle:row.originalTitle||record.originalTitle||record.title,displayTitle:row.title||record.displayTitle||record.title,originCountries:row.originCountries||countries(record),kind:type};}}catch(_){}
  }else if(typeIndex(type)===5||typeIndex(type)===6){
   // Book display names are translated separately; the original edition name stays visible.
   try{const original=record.originalTitle||record.title;const translated=await window.localizeMatchSynopsis?.(original,record.originalLanguage||'und',L);if(translated)enriched.displayTitle=translated;}catch(_){}
  }
  if(node.isConnected&&states.get(node)===state&&lang()===L)draw(node,enriched,L);
 }
 const scanned=new WeakSet();
 function scan(){document.querySelectorAll('.reading-ai-card h4').forEach(heading=>{if(scanned.has(heading))return;scanned.add(heading);const label=heading.closest('.reading-ai-card')?.querySelector('.reading-ai-label')?.textContent||'';paint(heading,{title:heading.textContent,kind:/MAGAZINE/i.test(label)?'magazine':/AUDIO/i.test(label)?'audiobook':'book'});});}
 function boot(){scan();const observer=new MutationObserver(rows=>{if(rows.some(r=>Array.from(r.addedNodes).some(n=>n.nodeType===1&&(n.matches?.('.reading-ai-card')||n.querySelector?.('.reading-ai-card')))))scan();});observer.observe(document.body,{childList:true,subtree:true});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
 window.MatchAppTitleIdentity={paint};
 document.addEventListener('matchapp:langchange',()=>{for(const [node,state] of states){if(!node.isConnected){states.delete(node);continue;}paint(state.heading,state.record);}});
})();
