/* Optional adult-only independent TV source: TVmaze CC BY-SA.
 * A verified TVmaze record never proves streaming country, audience rating,
 * child suitability or editorial mood by itself. Those choices fail closed.
 * Source attribution stays attached to every displayed TVmaze result.
 * 2 paginated requests maximum per user action; no eager images or polling. */
(function(root, factory) {
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.MatchAppTVMazeSource=api;
})(typeof window!=='undefined'?window:null,function() {
 'use strict';
 const PAGES=new Map(),MAX_KEYS=64;
 const MAX_PAGE=160,MAX_REQUESTS=2,TIMEOUT_MS=5600;
 const clean=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const knownKey=s=>clean(s).replace(/\s+/g,'');
 const words=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
 const artwork=url=>{
  if(typeof url!=='string')return null;
  try{const u=new URL(url);return u.protocol==='https:'&&u.hostname==='static.tvmaze.com'&&
    /^\/uploads\/images\/(?:original|original_untouched|main|medium)\/\d+\/[a-z0-9_.-]+$/i.test(u.pathname)?u.href:null;}catch(_){return null}
 };
 const showUrl=(url,id)=>{
  if(typeof url!=='string'||!Number.isSafeInteger(id)||id<=0)return null;
  try{const u=new URL(url);return u.protocol==='https:'&&u.hostname==='www.tvmaze.com'&&
    new RegExp('^/shows/'+id+'(?:/|$)').test(u.pathname)?u.href:null;}catch(_){return null}
 };
 function select(shows,criteria,checks={}) {
  const moods=Array.isArray(criteria.moods)?criteria.moods:[];
  const cats=Array.isArray(criteria.cats)?criteria.cats:[];
  const genres=Array.isArray(criteria.genres)?criteria.genres:[];
  const decades=Array.isArray(criteria.decades)?criteria.decades:[];
  const known=checks.known instanceof Set?checks.known:new Set();
  const blockedGenres=checks.blockedGenres instanceof Set?checks.blockedGenres:new Set();
  // Do not silently claim a rating, territorial provider or user-defined vibe.
  if(criteria.platform?.length||criteria.ratings?.length||criteria.vibes?.length||checks.blockedCountries?.length)return null;
  if(cats.some(c=>!['series','reality show'].includes(c)))return null;
  // Mood/country semantics come from the same source-gating engine as TMDB.
  if(typeof checks.moodFits!=='function'||typeof checks.blockedText!=='function')return null;
  for(const show of Array.isArray(shows)?shows:[]) {
   const id=Number(show?.id),title=String(show?.name||'').trim();
   const poster=artwork(show?.image?.original||show?.image?.medium);
   const url=showUrl(show?.url,id),actualGenres=Array.isArray(show?.genres)?show.genres.filter(g=>typeof g==='string'):[];
   const synopsis=words(show?.summary),year=Number(String(show?.premiered||'').slice(0,4));
   if(!url||!poster||!title||!synopsis||synopsis.length<40||!Number.isInteger(year)||year<1930)continue;
   if(known.has(knownKey(title))||actualGenres.some(g=>blockedGenres.has(clean(g))))continue;
   // TVmaze gives network country, NOT country of production. Do not infer one.
   if(cats.includes('reality show')&&show.type!=='Reality')continue;
   if(genres.length&&!genres.some(g=>actualGenres.some(found=>clean(found)===clean(g))))continue;
   if(decades.length&&!decades.some(d=>{const start=Number(String(d).match(/\d{4}/)?.[0]);return start&&year>=start&&year<start+10}))continue;
   if(!checks.moodFits(moods,actualGenres,synopsis)||checks.blockedText([title,synopsis,...actualGenres].join(' ')))continue;
   if(checks.explicit?.({title,synopsis,cats:actualGenres}))continue;
   return {title,year,synopsis,platform:'any',platformVerified:false,
    cats:cats.length?cats:['series'],moods,vibes:[],ratings:[],source:'tvmaze-source-verified',
    _meta:{artwork:poster,sourceUrl:url,sourceName:'TVmaze',sourceLicense:'CC BY-SA',kind:'tv',year}};
  }
  return null;
 }
 async function discover(criteria,checks={},fetchFn=(typeof fetch==='function'?fetch:null)) {
  if(typeof fetchFn!=='function'||criteria.platform?.length||criteria.ratings?.length||criteria.vibes?.length||
     checks.blockedCountries?.length||criteria.cats?.some(c=>!['series','reality show'].includes(c)))return null;
  const k=JSON.stringify(criteria);
  const start=PAGES.get(k)||0;
  for(let step=0;step<MAX_REQUESTS;step++){
   const page=(start+step)%MAX_PAGE,ctrl=new AbortController();
   let timeout;
   try {
    timeout=setTimeout(()=>ctrl.abort(),TIMEOUT_MS);
    const response=await fetchFn('https://api.tvmaze.com/shows?page='+page,{signal:ctrl.signal,headers:{Accept:'application/json'}});
    if(!response?.ok)break; // network errors and 429 never certify no matches
    const rows=await response.json();
    if(!Array.isArray(rows)||rows.length===0){PAGES.delete(k);break;}
    const match=select(rows,criteria,checks);
    if(PAGES.size>=MAX_KEYS)PAGES.delete(PAGES.keys().next().value);
    PAGES.set(k,(page+1)%MAX_PAGE);
    if(match)return match;
   }catch(_){break;}finally{clearTimeout(timeout)}
  }
  return null;
 }
 return Object.freeze({select,discover,artwork,showUrl,clean});
});