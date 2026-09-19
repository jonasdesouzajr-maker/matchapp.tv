/* A localized name is requested by verified numeric identity, never guessed. */
(function(){'use strict';let records=null;const cache=new Map();
 const normalized=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 async function identities(){if(records)return records;try{const r=await fetch('/data/poster-identities.json');records=r.ok?await r.json():[];}catch(_){records=[];}return records;}
 window.localizedTitle=async function(title,hints={}){
  const language=window.MATCH_LANG||document.documentElement.lang||'en';if(language==='en'||!window.supabaseClient)return title;
  const entry=typeof CONTENT_CATALOG!=='undefined'?CONTENT_CATALOG.find(e=>normalized(e.title)===normalized(title)):null;
  hints={...hints,year:hints.year||entry?.year,cats:hints.cats||entry?.cats};
  const expectedKind=hints.kind||window.tmdbKindForCats?.(hints.cats)||'';
  const verified=record=>record&&record.adult!==true&&[record.title,record.originalTitle].some(n=>n&&normalized(n)===normalized(title))&&(!hints.year||String(hints.year)===String(record.year))&&(!expectedKind||record.kind===expectedKind);
  const key=language+'::'+title+'::'+(hints.year||'')+'::'+expectedKind;if(cache.has(key))return cache.get(key);
  const pending=(async()=>{
   if(entry&&typeof isHighRiskCategory==='function'&&entry.cats.some(c=>isHighRiskCategory(c,title)))return title;
   const supplied=hints.record;
   const approved=verified(supplied)?supplied:(await identities()).find(verified);
   let record=approved;
   if(!record&&window.tmdbLookup)record=await window.tmdbLookup(title,{...hints,lang:'en-US'});
   if(!verified(record)||!Number.isSafeInteger(record.tmdbId)||!['movie','tv'].includes(record.kind))return title;
   const locales={en:'en-US','pt-BR':'pt-BR',es:'es-ES',fr:'fr-FR',de:'de-DE',it:'it-IT',tr:'tr-TR',ru:'ru-RU',ar:'ar-SA',hi:'hi-IN',id:'id-ID',ja:'ja-JP',ko:'ko-KR',zh:'zh-CN'};
   try{const body={tmdb_id:record.tmdbId,kind:record.kind,lang:locales[language]||'en-US'}, {data,error}=await (window.requestTMDB?window.requestTMDB(body):window.supabaseClient.functions.invoke('tmdb-proxy',{body})),r=data?.results?.[0];
    if(!error&&r?.tmdbId===record.tmdbId&&r.kind===record.kind&&r.originalTitle===record.originalTitle&&r.year===record.year&&r.adult!==true&&typeof r.title==='string'&&r.title.trim())return r.title.trim();
   }catch(_){}return title;
  })();cache.set(key,pending);return pending;
 };
 let generation=0;
 async function paint(){const version=++generation;
  document.querySelectorAll('.marquee-item img[data-title]').forEach(async img=>{
   const tile=img.closest('.marquee-item');if(!tile||tile.getAttribute('aria-hidden')==='true')return;
   const caption=tile.querySelector('.marquee-title'),title=img.dataset.title;
   if(caption)caption.textContent=title;tile.setAttribute('role','button');tile.tabIndex=0;tile.setAttribute('aria-label',title);
   const name=await window.localizedTitle(title);if(version===generation&&tile.isConnected){if(caption)caption.textContent=name;tile.setAttribute('aria-label',name);}
  });
 }
 document.addEventListener('matchapp:langchange',paint);
 document.addEventListener('keydown',event=>{const tile=event.target.closest?.('.marquee-item[role=button]');if(tile&&['Enter',' '].includes(event.key)){event.preventDefault();tile.click();}});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',paint);else paint();
})();

/* Site-wide final audit layer. Keeping this loader here avoids adding another
   duplicated script tag to every HTML surface; this file is already part of
   the maintained shell on the main, profile, pricing and purchase flows. */
(function(){'use strict';
 const isHome=location.pathname==='/'||location.pathname==='/index.html';
 if(!isHome&&!document.querySelector('link[data-final-audit]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/final-audit.css?v=194';l.dataset.finalAudit='1';document.head.appendChild(l);}
 if(!document.querySelector('script[data-final-audit]')){const s=document.createElement('script');s.src='/final-audit.js?v=194';s.async=false;s.dataset.finalAudit='1';document.head.appendChild(s);}
})();
