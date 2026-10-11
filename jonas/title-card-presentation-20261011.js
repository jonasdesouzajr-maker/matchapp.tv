/* UI-only: surface an exact catalog title when Jonas supplies a conversational
 * recommendation without a structured title-card array. Never invent artwork,
 * availability, providers, prices or credits; reuse existing card renderer. */
(function(){
 'use strict';
 function key(v){return String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
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
 async function fromAnswer(answer){
  const api=window.MatchAppCatalogMedia;
  if(!api?.lookup)return null;
  for(const name of candidates(answer)){
   try{
    // Only show a real identified title. Never treat fuzzy text similarity as
    // proof, and never claim where it streams unless catalog verified it.
    let meta=await api.lookup(name,{});
    if(!meta&&api.lookupLive)meta=await api.lookupLive(name,{});
    if(!meta)continue;
    const title=String(meta.title||meta.original_title||'');
    const accepted=[title,meta.original_title,meta.original_name,meta.name].filter(Boolean);
    if(!accepted.some(x=>key(x)===key(name)))continue;
    if(!['movie','tv'].includes(meta.media_kind))continue;
    return {
     title:title||name,year:meta.year||'',type:meta.media_kind==='tv'?'series':'movie',
     synopsis:meta.overview||'',synopsisLang:'en',platform:'',
     _catalogMedia:meta,_fromCatalog:true,_displayOnly:true
    };
   }catch(_){}
  }
  return null;
 }
 window.MatchAppJonasTitlePresentation=Object.freeze({fromAnswer,candidates});
})();
