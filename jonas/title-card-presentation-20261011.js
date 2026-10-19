/* UI-only: surface an exact catalog title when Jonas supplies a conversational
 * recommendation without a structured title-card array. Never invent artwork,
 * availability, providers, prices or credits; reuse existing card renderer. */
(function(){
 'use strict';
 function key(v){return String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()}
 function candidates(answer){
  const text=String(answer||'').slice(0,1800),names=[],seen=new Set();
  function add(v){
   let title=String(v||'').replace(/^[\s*“”"'«»\u2018\u2019]+|[\s*“”"'«»\u2018\u2019.,!?]+$/g,'').trim();
   if(title.length<4||title.length>75||title.split(/\s+/).length>10||seen.has(key(title)))return;
   seen.add(key(title));names.push(title);
  }
  for(const re of [/\*\*([^*\n]{4,75})\*\*/g,/[“"]([^“”"\n]{4,75})[”"]/g,/[«]([^«»\n]{4,75})[»]/g,/[‘']([^‘’'\n]{4,75})[’']/g]){
   for(const m of text.matchAll(re)){add(m[1]);if(names.length>=7)break}
  }
  // Capture multiword names spoken without quotation marks (e.g. a TV
  // title containing a hyphen). Exact source identity is still required below.
  const capitalized=/\b([A-Z][\p{L}\d]*(?:[-’'][A-Za-z\d][\p{L}\d]*)?(?:\s+(?:[A-Z][\p{L}\d]*(?:[-’'][A-Za-z\d][\p{L}\d]*)?|and|of|the)){1,4})\b/gu;
  for(const m of text.matchAll(capitalized)){add(m[1]);for(const part of m[1].split(/\s+(?:and|or)\s+/))add(part);if(names.length>=10)break}
  // Conservative title-cased fallback for plain spoken prose: exact lookup
  // will reject phrases that aren't an actual movie or series identity.
  const named=/(?:\bThe|\bA|\bOs|\bAs|\bO|\bLa|\bEl|\bLe|\bLes|\bLos|\bLas)\s+(?:[A-ZÀ-Ý0-9][\p{L}\d'’-]*\s*){1,5}/gu;
  for(const m of text.matchAll(named)){add(m[0]);if(names.length>=10)break}
  try{
   if(typeof CONTENT_CATALOG!=='undefined'&&Array.isArray(CONTENT_CATALOG)){
    for(const title of CONTENT_CATALOG){
     const name=String(title?.title||'');
     if(name.length<6||name.length>75||seen.has(key(name)))continue;
     const at=text.toLocaleLowerCase().indexOf(name.toLocaleLowerCase());
     if(at>=0&&(!at||!/[\p{L}\d]/u.test(text[at-1]))&&!/[\p{L}\d]/u.test(text[at+name.length]||''))add(name);
     if(names.length>=12)break;
    }
   }
  }catch(_){}
  return names.slice(0,9);
 }
 async function withinBudget(work){
  if(typeof setTimeout!=='function')return work;
  let timer;
  try{return await Promise.race([work,new Promise(resolve=>{timer=setTimeout(()=>resolve(null),5000)})]);}
  finally{clearTimeout(timer);}
 }
 async function fromAnswers(answer,limit=3){
  const api=window.MatchAppCatalogMedia;
  if(!api?.lookup)return [];
  const found=[],seen=new Set(),max=Math.max(1,Math.min(3,Number(limit)||1));
  const resolved=await Promise.all(candidates(answer).map(async name=>{

   try{
    // Only show exact, source-identified titles; never infer regional streams.
    let meta=await api.lookup(name,{priority:true});
    if(!meta&&api.lookupLive)meta=await api.lookupLive(name,{priority:true});
    if(!meta)return null;
    const title=String(meta.title||meta.original_title||'');
    const accepted=[title,meta.original_title,meta.original_name,meta.name].filter(Boolean);
    if(!accepted.some(x=>key(x)===key(name)))return null;
    if(!['movie','tv'].includes(meta.media_kind))return null;
    return {
     title:title||name,year:meta.year||'',type:meta.media_kind==='tv'?'series':'movie',
     synopsis:meta.overview||'',synopsisLang:'en',platform:'',
     cats:[meta.media_kind==='tv'?'series':'movie',...(Array.isArray(meta.genres)?meta.genres:[])],
     realGenres:Array.isArray(meta.genres)?meta.genres:[],
     _catalogMedia:meta,_fromCatalog:true,_displayOnly:true
    };
   }catch(_){return null;}
  }).map(withinBudget));
  for(const item of resolved){
   if(!item||seen.has(key(item.title)))continue;
   seen.add(key(item.title));found.push(item);
   if(found.length>=max)break;
  }
  return found;
 }
 async function fromAnswer(answer){return (await fromAnswers(answer,1))[0]||null}
 window.MatchAppJonasTitlePresentation=Object.freeze({fromAnswer,fromAnswers,candidates});
})();
