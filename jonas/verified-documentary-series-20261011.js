/* Verified documentary-series lookup for Ask AI. Strict source identity, no generative guesses. */
(function () {
  'use strict';
  const COUNTRY = Object.freeze({
    brazil:'BR',brasil:'BR',brazilian:'BR',brasileiro:'BR',brasileira:'BR',
    portugal:'PT',portuguese:'PT',unitedstates:'US',usa:'US',american:'US',
    unitedkingdom:'GB',british:'GB',canada:'CA',canadian:'CA',mexico:'MX',
    mexicoan:'MX',mexican:'MX',argentina:'AR',france:'FR',germany:'DE',
    italy:'IT',spain:'ES',japan:'JP',southkorea:'KR',india:'IN',australia:'AU'
  });
  function region(value) {
    if(typeof window.MatchAppCatalogMedia?.resolveCountryCode==='function')return window.MatchAppCatalogMedia.resolveCountryCode(value);
    const raw=String(value||'').trim();
    if(/^[A-Za-z]{2}$/.test(raw))return raw.toUpperCase();
    const compact=raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z]/g,'');
    return COUNTRY[compact]||'';
  }
  function explicitRegion(value){
    // A trailing service or sentence must not hide an explicitly named
    // viewing country ("in Norway on Netflix" / "in the United States").
    const words=String(value||'').trim().replace(/^the\s+/i,'').split(/\s+/);
    for(let length=words.length;length>0;length--){
      const found=region(words.slice(0,length).join(' '));
      if(found)return found;
    }
    return '';
  }
  function matches(question) {
    const q=String(question||'').toLowerCase();
    const documentary=/\b(?:document(?:ar(?:y|ies)|[aá]ri[oa]s?|ais|al)|docu[\s-]?series|docuseries|docus[eé]ries)\b/i.test(q);
    const series=/(?:\bseries\b|\bserie\b|\bshows?\b|\btv\b|s[eé]ries?|miniss[eé]ries?|mini[\s-]?series)/i.test(q);
    return documentary && series && !/\b(?:do not|don't|dont|not|no|sem|sin)\s+(?:(?:want|recommend|suggest|show|include)\s+)?(?:any\s+)?(?:documentaries|documentary|document[aá]rios?|docuseries)\b/i.test(q);
  }
  function originFilter(question) {
    const q=String(question||'').toLowerCase();
    if(/\b(?:brazilian|brasileir[oa]s?|do brasil|from brazil)\b/i.test(q))return 'BR';
    if(/\b(?:mexican|mexican[oa]s?|mexicanas?)\b/i.test(q))return 'MX';
    if(/\b(?:british)\b/i.test(q))return 'GB';
    return '';
  }
  function localeText(lang,key,count,location) {
    const l=String(lang||'en').toLowerCase(), where=location==='BR'?'Brazil':location;
    if(key==='empty')return l.startsWith('pt')?'Não consegui confirmar séries documentais reais e disponíveis para assistir na região solicitada. Não vou substituir por filmes, ficção ou links não verificados. Tente novamente em instantes.':
      l.startsWith('es')?'No pude verificar series documentales disponibles en la región solicitada. No mostraré películas, ficción ni enlaces sin verificar. Inténtalo de nuevo pronto.':
      'I could not verify documentary television series available to stream in the requested region just now. I will not substitute fictional shows, films or unverified watch links. Please try again shortly.';
    if(l.startsWith('pt'))return 'Confirmei '+count+' '+(count===1?'série documental real':'séries documentais reais')+' com pôster, sinopse e opções de streaming verificadas para '+(location==='BR'?'o Brasil':location)+'. Confira os provedores de cada título; a disponibilidade pode mudar.';
    if(l.startsWith('es'))return 'Verifiqué '+count+' '+(count===1?'serie documental real':'series documentales reales')+' con póster, sinopsis y opciones de streaming verificadas para '+where+'. Consulta los proveedores de cada título; la disponibilidad puede cambiar.';
    return 'I verified '+count+' '+(count===1?'real documentary series':'real documentary series')+' with genuine posters, synopses and streaming listings for '+where+'. Check the providers on each title card; availability can change.';
  }
  async function resolve(question,{lang='en',country=''}={}) {
    if(!matches(question))return null;
    const sb=window.supabaseClient,lookup=window.MatchAppCatalogMedia?.lookupLive;
    const q=String(question||''),origin=originFilter(q);
    const explicitStream=String(q).match(/\b(?:streaming|available|watch|assistir|dispon[ií]vel|ver)\s+(?:in|no|na|em|en)\s+([a-záéíóúç\s]{2,35})/i)?.[1]||'';
    // Origin is not viewing country: Brazilian productions may be watched in the US.
    const requestedRegion=explicitRegion(explicitStream) || window.MatchAppCatalogMedia?.regionCode?.() || region(country) || '';
    const empty={answer:localeText(lang,'empty',0,requestedRegion),results:[],_live:false,_docVerified:true};
    if(!requestedRegion || !sb?.functions?.invoke || typeof lookup!=='function')return empty;
    try {
      const discover={kind:'tv',genre_ids:[99],pages:2};
      if(origin==='BR')discover.original_language='pt';
      const {data,error}=await sb.functions.invoke('tmdb-proxy',{body:{discover,lang}});
      if(error||!Array.isArray(data?.results))return empty;
      const rows=data.results.filter(r=>r?.kind==='tv'&&Number.isSafeInteger(Number(r.tmdbId))&&
        Number(r.tmdbId)>0&&Array.isArray(r.genreIds)&&r.genreIds.includes(99)&&r.adult!==true);
      const verified=await Promise.all(rows.slice(0,12).map(async row=>{
        try {
          const meta=await lookup(row.title,{kind:'tv',tmdbId:Number(row.tmdbId),priority:true});
          if(!meta||meta.media_kind!=='tv'||Number(meta.tmdb_id)!==Number(row.tmdbId))return null;
          if(!Array.isArray(meta.genres)||!meta.genres.some(g=>String(g).toLowerCase().trim()==='documentary'))return null;
          if(origin&&!Array.isArray(meta.origin_countries))return null;
          if(origin&&!meta.origin_countries.includes(origin))return null;
          const streams=meta.availability?.[requestedRegion]?.stream;
          const direct=meta.availability?.[requestedRegion]?.link;
          if(!Array.isArray(streams)||!streams.length||!/^https:\/\//i.test(String(direct||'')))return null;
          if(!/^https:\/\/image\.tmdb\.org\//i.test(String(meta.poster_url||'')))return null;
          return {title:meta.title,year:String(meta.year||''),type:'series',cats:['Documentary','series'],
            synopsis:String(meta.overview||'').trim(),posterUrl:meta.poster_large_url||meta.poster_url,
            platform:streams[0],watchUrl:direct,_catalogMedia:{...meta,_verified_doc_region:requestedRegion},_verifiedDocRegion:requestedRegion};
        } catch (_) {return null;}
      }));
      const unique=new Set(),results=verified.filter(r=>{
        if(!r||unique.has(r.title.toLowerCase()))return false;
        unique.add(r.title.toLowerCase());return true;
      }).slice(0,4);
      return {answer:results.length?localeText(lang,'verified',results.length,requestedRegion):empty.answer,
        results,_live:false,_docVerified:true};
    }catch(_){return empty;}
  }
  window.MatchAppVerifiedDocumentaries=Object.freeze({matches,resolve});
})();
