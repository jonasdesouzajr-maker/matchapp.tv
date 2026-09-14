/* A localized name is requested by verified numeric identity, never guessed. */
(function(){'use strict';let records=null;const cache=new Map();
 const normalized=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 async function identities(){if(records)return records;try{const r=await fetch('/data/poster-identities.json');records=r.ok?await r.json():[];}catch(_){records=[];}return records;}
 window.localizedTitle=async function(title,hints={}){
  const language=window.MATCH_LANG||document.documentElement.lang||'en';if(language==='en'||!window.supabaseClient)return title;
  const key=language+'::'+title+'::'+(hints.year||'');if(cache.has(key))return cache.get(key);
  const pending=(async()=>{
   if(typeof CONTENT_CATALOG!=='undefined'){const entry=CONTENT_CATALOG.find(e=>normalized(e.title)===normalized(title));if(entry&&typeof isHighRiskCategory==='function'&&entry.cats.some(c=>isHighRiskCategory(c,title)))return title;}
   const supplied=hints.record;
   const approved=supplied&&supplied.adult!==true&&[supplied.title,supplied.originalTitle].some(n=>normalized(n)===normalized(title))&&(!hints.year||String(hints.year)===supplied.year)?supplied:(await identities()).find(r=>normalized(r.title)===normalized(title)&&(!hints.year||String(hints.year)===r.year));
   let record=approved;
   if(!record&&window.tmdbLookup)record=await window.tmdbLookup(title,{...hints,lang:'en-US'});
   if(!record||!Number.isSafeInteger(record.tmdbId)||!['movie','tv'].includes(record.kind))return title;
   const locales={en:'en-US','pt-BR':'pt-BR',es:'es-ES',fr:'fr-FR',de:'de-DE',it:'it-IT',tr:'tr-TR',ru:'ru-RU',ar:'ar-SA',hi:'hi-IN',id:'id-ID',ja:'ja-JP',ko:'ko-KR',zh:'zh-CN'};
   try{const body={tmdb_id:record.tmdbId,kind:record.kind,lang:locales[language]||'en-US'}, {data,error}=await (window.requestTMDB?window.requestTMDB(body):window.supabaseClient.functions.invoke('tmdb-proxy',{body})),r=data?.results?.[0];
    if(!error&&r?.tmdbId===record.tmdbId&&r.kind===record.kind&&r.originalTitle===record.originalTitle&&r.year===record.year&&r.adult!==true&&typeof r.title==='string'&&r.title.trim())return r.title.trim();
   }catch(_){}return title;
  })();cache.set(key,pending);return pending;
 };
 let generation=0;
 async function paint(){const version=++generation;
  document.querySelectorAll('.marquee-item img[data-title]').forEach(async img=>{
   const caption=img.closest('.marquee-item')?.querySelector('.marquee-title');if(!caption)return;
   const title=img.dataset.title,tile=img.closest('.marquee-item');caption.textContent=title;tile.setAttribute('role','button');tile.tabIndex=0;tile.setAttribute('aria-label',title);
   const name=await window.localizedTitle(title);if(version===generation&&caption.isConnected){caption.textContent=name;img.closest('.marquee-item').setAttribute('aria-label',name);}
  });
 }
 document.addEventListener('matchapp:langchange',paint);
 document.addEventListener('keydown',event=>{const tile=event.target.closest?.('.marquee-item[role=button]');if(tile&&['Enter',' '].includes(event.key)){event.preventDefault();tile.click();}});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',paint);else paint();
})();
