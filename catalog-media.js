/* ============================================================
   MatchApp — catalogue media enrichment
   ------------------------------------------------------------
   Read-only browser layer over public.catalog_media_metadata.
   It never decides what to recommend. The existing Match/Kids engines remain
   authoritative; this module only enriches a title AFTER the app selected it.

   Safety rules:
   - exact normalized-title lookup; no fuzzy identity swapping
   - remote media is optional and never blocks a result
   - Kids previews require server-derived kids_approved=true
   - only trusted poster/video/audio hosts are rendered
   - every poster failure falls back to metadata art, then local/generated art
   ============================================================ */
(function(){
  'use strict';

  const TABLE='catalog_media_metadata';
  const CACHE=new Map();
  const INFLIGHT=new Map();
  const LIVE_CACHE=new Map();
  let GENRE_INDEX=null;
  let GENRE_INFLIGHT=null;
  const TRUSTED_POSTER=/^https:\/\/(?:image\.tmdb\.org|is\d+-ssl\.mzstatic\.com)\//i;
  const TRUSTED_AUDIO=/^https:\/\/audio-ssl\.itunes\.apple\.com\//i;
  const TRUSTED_EMBED=/^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{6,32}(?:\?|$)/i;

  function normalise(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');}
  function esc(value){return String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function localPoster(title){
    try{if(typeof window.generateLocalPosterSVG==='function'){const result=window.generateLocalPosterSVG(title,{cats:[]});if(typeof result==='string'&&result)return result;}}catch(_){}
    const t=esc(String(title||'MatchApp').slice(0,52));
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#130734"/><stop offset="1" stop-color="#402562"/></linearGradient></defs><rect width="600" height="900" fill="url(#g)"/><circle cx="300" cy="300" r="92" fill="none" stroke="#E5C158" stroke-width="10"/><path d="M275 245l110 55-110 55z" fill="#E5C158"/><text x="300" y="510" fill="#fff" font-family="Arial,sans-serif" font-size="38" font-weight="700" text-anchor="middle">${t}</text><text x="300" y="770" fill="#E5C158" font-family="Arial,sans-serif" font-size="25" font-weight="700" text-anchor="middle">MATCHAPP.TV</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  }
  function titleForImage(img){return img?.dataset?.title||img?.dataset?.posterTitle||img?.closest?.('[data-title]')?.dataset?.title||(img?.id==='res-poster-img'?document.getElementById('res-title')?.textContent:'')||img?.alt?.replace(/\s+(?:poster|cover|artwork)$/i,'')||'MatchApp';}

  async function lookup(title,opts={}){
    const sb=window.supabaseClient;if(!sb||!title)return null;
    const key=[normalise(title),opts.year||'',opts.kind||'',opts.kids?'kids':'all'].join('::');
    if(CACHE.has(key))return CACHE.get(key);if(INFLIGHT.has(key))return INFLIGHT.get(key);
    const p=(async()=>{try{
      let q=sb.from(TABLE).select('source_key,title,year,media_kind,tmdb_id,poster_url,poster_large_url,poster_original_url,backdrop_url,overview,genres,runtime_minutes,content_rating,vote_average,original_language,origin_countries,cast_members,preview_kind,preview_provider,preview_url,preview_embed_url,availability,kids_approved,kids_age_bands,is_catalog_title,is_trending,updated_at').eq('normalized_title',normalise(title));
      if(opts.year)q=q.eq('year',Number(opts.year));if(opts.kind)q=q.eq('media_kind',opts.kind);if(opts.kids)q=q.eq('kids_approved',true);
      const {data,error}=await q.order('is_catalog_title',{ascending:false}).order('updated_at',{ascending:false}).limit(4);
      if(error||!Array.isArray(data)||!data.length){CACHE.set(key,null);return null;}
      const exact=data.find(r=>normalise(r.title)===normalise(title))||data[0];CACHE.set(key,exact);return exact;
    }catch(_){CACHE.set(key,null);return null;}finally{INFLIGHT.delete(key);}})();INFLIGHT.set(key,p);return p;
  }
  async function lookupLive(title,opts={}){
    if(!title||opts.kids)return null;
    const requestedId=Number(opts.tmdbId);
    const requestedKind=['movie','tv'].includes(opts.kind)?opts.kind:'';
    const canUseExact=Number.isSafeInteger(requestedId)&&requestedId>0&&requestedKind&&typeof window.tmdbDetails==='function';
    if(typeof window.tmdbLookup!=='function'&&!canUseExact)return null;
    const key=[normalise(title),opts.year||'',requestedKind,canUseExact?requestedId:''].join('::');
    if(LIVE_CACHE.has(key))return await LIVE_CACHE.get(key);
    const p=(async()=>{try{
      let found=null,details=null;
      if(canUseExact){
        details=await window.tmdbDetails(requestedId,requestedKind,{priority:opts.priority===true});
        if(details&&details.adult!==true&&Number(details.tmdbId)===requestedId&&details.kind===requestedKind)found=details;
      }
      if(!found){
        found=await window.tmdbLookup(title,{
          year:opts.year||'',kind:requestedKind,cats:opts.cats||[],
          priority:opts.priority===true
        });
        if(!found||found.adult===true||!Number.isSafeInteger(Number(found.tmdbId))||!['movie','tv'].includes(found.kind))return null;
        details=typeof window.tmdbDetails==='function'
          ? await window.tmdbDetails(Number(found.tmdbId),found.kind,{priority:opts.priority===true})
          : null;
      }
      const src=details||found;
      const tmdbId=Number(src?.tmdbId||found?.tmdbId||requestedId);
      const kind=src?.kind||found?.kind||requestedKind;
      if(!src||src.adult===true||!Number.isSafeInteger(tmdbId)||!['movie','tv'].includes(kind))return null;
      const availability=(src.availability&&typeof src.availability==='object')?src.availability:{
        source:'tmdb',
        source_page_url:'https://www.themoviedb.org/'+kind+'/'+tmdbId
      };
      return {
        source_key:'tmdb-live:'+kind+':'+tmdbId,
        title:String(src.title||found?.title||title),
        normalized_title:normalise(title),
        year:src.year?Number(src.year):(found?.year?Number(found.year):null),
        media_kind:kind,
        tmdb_id:tmdbId,
        poster_url:src.poster||found?.poster||null,
        poster_large_url:src.posterLarge||found?.posterLarge||src.poster||found?.poster||null,
        poster_original_url:src.posterOriginal||found?.posterOriginal||null,
        backdrop_url:src.backdrop||found?.backdrop||null,
        overview:String(src.overview||found?.overview||'').trim()||null,
        genres:Array.isArray(src.genres)?src.genres.filter(Boolean).slice(0,24):[],
        runtime_minutes:Number.isFinite(Number(src.runtimeMinutes))?Number(src.runtimeMinutes):null,
        content_rating:src.contentRating||null,
        vote_average:Number.isFinite(Number(src.voteAverage))?Number(src.voteAverage):null,
        original_language:src.originalLanguage||found?.originalLanguage||null,
        origin_countries:Array.isArray(src.originCountries)?src.originCountries.filter(Boolean).slice(0,12):[],
        cast_members:Array.isArray(src.cast)?src.cast.filter(x=>x&&x.name).slice(0,12):[],
        preview_kind:src.previewKind||null,
        preview_provider:src.previewProvider||null,
        preview_url:src.previewUrl||null,
        preview_embed_url:src.previewEmbedUrl||null,
        availability,
        kids_approved:false,
        kids_age_bands:[],
        is_catalog_title:false,
        is_trending:false,
        updated_at:new Date().toISOString()
      };
    }catch(_){return null;}})();
    LIVE_CACHE.set(key,p);
    const result=await p;
    if(result)LIVE_CACHE.set(key,result);else LIVE_CACHE.delete(key);
    return result;
  }

  async function refreshExact(meta){
    if(!meta||!Number.isSafeInteger(Number(meta.tmdb_id))||!['movie','tv'].includes(meta.media_kind)||typeof window.tmdbDetails!=='function')return meta;
    try{
      const d=await window.tmdbDetails(Number(meta.tmdb_id),meta.media_kind);
      if(!d)return meta;
      return {
        ...meta,
        title:String(d.title||meta.title||''),
        year:d.year?Number(d.year):meta.year,
        poster_url:d.poster||meta.poster_url,
        poster_large_url:d.posterLarge||d.poster||meta.poster_large_url||meta.poster_url,
        poster_original_url:d.posterOriginal||meta.poster_original_url,
        backdrop_url:d.backdrop||meta.backdrop_url,
        overview:String(d.overview||meta.overview||'').trim()||null,
        genres:Array.isArray(d.genres)&&d.genres.length?d.genres:meta.genres,
        runtime_minutes:Number.isFinite(Number(d.runtimeMinutes))?Number(d.runtimeMinutes):meta.runtime_minutes,
        content_rating:d.contentRating||meta.content_rating,
        vote_average:Number.isFinite(Number(d.voteAverage))?Number(d.voteAverage):meta.vote_average,
        original_language:d.originalLanguage||meta.original_language,
        origin_countries:Array.isArray(d.originCountries)&&d.originCountries.length?d.originCountries:(meta.origin_countries||[]),
        cast_members:Array.isArray(d.cast)&&d.cast.length?d.cast:(meta.cast_members||[]),
        preview_kind:d.previewKind||meta.preview_kind,
        preview_provider:d.previewProvider||meta.preview_provider,
        preview_url:d.previewUrl||meta.preview_url,
        preview_embed_url:d.previewEmbedUrl||meta.preview_embed_url,
        availability:d.availability&&typeof d.availability==='object'?d.availability:meta.availability,
        updated_at:new Date().toISOString()
      };
    }catch(_){return meta;}
  }

  function safePoster(meta){return [meta?.poster_original_url,meta?.poster_large_url,meta?.poster_url].find(u=>TRUSTED_POSTER.test(String(u||'')))||null;}
  const COUNTRY_CODES={
    argentina:'AR',australia:'AU',belgium:'BE',brazil:'BR',brasil:'BR',canada:'CA',chile:'CL',china:'CN',colombia:'CO',
    denmark:'DK',egypt:'EG',finland:'FI',france:'FR',germany:'DE',greece:'GR','hong kong':'HK',india:'IN',indonesia:'ID',
    ireland:'IE',israel:'IL',italy:'IT',japan:'JP','south korea':'KR',korea:'KR',mexico:'MX',netherlands:'NL','new zealand':'NZ',
    nigeria:'NG',norway:'NO',philippines:'PH',poland:'PL',portugal:'PT',russia:'RU','south africa':'ZA',spain:'ES',sweden:'SE',
    switzerland:'CH',taiwan:'TW',thailand:'TH',turkey:'TR',ukraine:'UA','united kingdom':'GB',uk:'GB','united states':'US',usa:'US',vietnam:'VN'
  };
  function regionCode(){
    const preferred=String(localStorage.getItem('match_user_region')||'').trim().toUpperCase();
    if(/^[A-Z]{2}$/.test(preferred))return preferred;
    const saved=String(localStorage.getItem('match_user_country')||'').trim();
    if(/^[A-Za-z]{2}$/.test(saved))return saved.toUpperCase();
    const mapped=COUNTRY_CODES[saved.toLowerCase()];
    if(mapped)return mapped;
    const lang=window.MATCH_LANG||'en';
    const fallback={'pt-BR':'BR',es:'MX',fr:'FR',de:'DE',it:'IT',tr:'TR',ru:'RU',ar:'EG',hi:'IN',id:'ID',ja:'JP',ko:'KR',zh:'CN'};
    return fallback[lang]||'US';
  }
  function countryName(code){
    code=String(code||'').toUpperCase();
    try{const dn=new Intl.DisplayNames([window.MATCH_LANG||'en'],{type:'region'});return dn.of(code)||code;}catch(_){return code;}
  }
  function sourcePage(meta){
    const explicit=String(meta?.availability?.source_page_url||'');
    if(/^https:\/\/www\.themoviedb\.org\/(movie|tv)\/\d+$/.test(explicit))return explicit;
    if(Number.isSafeInteger(Number(meta?.tmdb_id))&&['movie','tv'].includes(meta?.media_kind)){
      return 'https://www.themoviedb.org/'+meta.media_kind+'/'+meta.tmdb_id;
    }
    return '';
  }
  function availability(meta,region){
    const code=region||regionCode(),root=meta?.availability||{},row=root?.[code]||{};
    const uniq=list=>[...new Set((Array.isArray(list)?list:[]).map(v=>String(v||'').trim()).filter(Boolean))];
    const streams=uniq(row.stream),rent=uniq(row.rent),buy=uniq(row.buy);
    const cinemaDate=/^\d{4}-\d{2}-\d{2}$/.test(String(row.cinema_release_date||''))?String(row.cinema_release_date):'';
    let inCinemas=false;
    if(cinemaDate){
      const start=Date.parse(cinemaDate+'T00:00:00Z'),now=Date.now(),windowMs=120*86400000;
      // Theatrical and streaming windows can overlap. Do not hide cinema
      // availability just because a streaming provider is also present.
      inCinemas=Number.isFinite(start)&&now>=start-7*86400000&&now<=start+windowMs;
    }
    return {region:code,streams,rent,buy,cinemaDate,inCinemas,guide:/^https:\/\//.test(String(row.link||''))?String(row.link):'',sourcePage:sourcePage(meta)};
  }
  function providerSearch(provider,title){
    const raw=String(provider||'').trim();
    const aliases={
      'Amazon Prime Video':'Prime Video','Prime Video':'Prime Video','Amazon Video':'Prime Video',
      'Netflix':'Netflix','Netflix Kids':'Netflix','Netflix Standard with Ads':'Netflix',
      'Disney Plus':'Disney+','HBO Max':'Max','Max':'Max','Apple TV':'Apple TV+','Apple TV Store':'Apple TV+',
      'Paramount Plus':'Paramount+','Paramount Plus Basic with Ads':'Paramount+','Paramount Plus Essential':'Paramount+',
      'Paramount Plus Premium':'Paramount+','Hulu':'Hulu','Peacock Premium':'Peacock','Peacock Premium Plus':'Peacock',
      'Globoplay':'Globoplay','Crunchyroll Amazon Channel':'Crunchyroll','Crunchyroll':'Crunchyroll',
      'Rakuten Viki':'Viki','MUBI':'MUBI','Pure Flix':'Pure Flix','Angel Studios':'Angel Studios'
    };
    let mapped=aliases[raw]||raw;
    if(/amazon prime video|amazon channel|amazon video/i.test(raw))mapped='Prime Video';
    else if(/netflix/i.test(raw))mapped='Netflix';
    else if(/hbo max/i.test(raw))mapped='Max';
    else if(/apple tv/i.test(raw))mapped='Apple TV+';
    else if(/paramount/i.test(raw))mapped='Paramount+';
    else if(/crunchyroll/i.test(raw))mapped='Crunchyroll';
    try{
      if(typeof platformSearchUrl==='function'&&typeof PLATFORMS!=='undefined'&&PLATFORMS[mapped])return platformSearchUrl(mapped,title);
    }catch(_){}
    const q=encodeURIComponent(String(title||''));
    const direct={
      'Netflix':'https://www.netflix.com/search?q='+q,
      'Prime Video':'https://www.primevideo.com/search?phrase='+q,
      'Disney+':'https://www.disneyplus.com/search?q='+q,
      'Max':'https://www.max.com/search?q='+q,
      'Apple TV+':'https://tv.apple.com/search?term='+q,
      'Paramount+':'https://www.paramountplus.com/search/?q='+q,
      'Hulu':'https://www.hulu.com/search?q='+q,
      'Peacock':'https://www.peacocktv.com/search?q='+q,
      'Globoplay':'https://globoplay.globo.com/busca/?q='+q,
      'Crunchyroll':'https://www.crunchyroll.com/search?q='+q,
      'Viki':'https://www.viki.com/search?q='+q,
      'MUBI':'https://mubi.com/search/'+q,
      'Pure Flix':'https://pureflix.com/search?q='+q,
      'Angel Studios':'https://www.angel.com/search?q='+q,
      'BBC iPlayer':'https://www.bbc.co.uk/iplayer/search?q='+q,
      'ITVX':'https://www.itv.com/watch/search?q='+q,
      'ITVX Premium':'https://www.itv.com/watch/search?q='+q,
      'Channel 4':'https://www.channel4.com/search?q='+q,
      'The Roku Channel':'https://www.roku.com/whats-on/search?q='+q,
      'Tubi TV':'https://tubitv.com/search/'+q,
      'YouTube':'https://www.youtube.com/results?search_query='+q,
      'YouTube TV':'https://tv.youtube.com/search/'+q,
      'Fandango At Home':'https://athome.fandango.com/content/browse/search?searchString='+q
    };
    return direct[mapped]||direct[raw]||'';
  }

  function showtimesUrl(title){
    return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(String(title||'')+' movie showtimes');
  }

  function providerLinks(meta,title,region){
    const a=availability(meta,region),seen=new Set(),out=[];
    const add=(provider,mode)=>{
      const name=String(provider||'').trim();if(!name)return;
      const key=mode+'|'+name.toLowerCase();if(seen.has(key))return;seen.add(key);
      const direct=providerSearch(name,title);
      out.push({provider:name,mode,direct:!!direct,href:direct||a.guide||a.sourcePage});
    };
    a.streams.forEach(p=>add(p,'stream'));
    a.rent.forEach(p=>add(p,'rent'));
    a.buy.forEach(p=>add(p,'buy'));
    return out.filter(x=>/^https:\/\//.test(String(x.href||'')));
  }

  async function ensureGenreIndex(){
    if(GENRE_INDEX)return GENRE_INDEX;
    if(!GENRE_INFLIGHT)GENRE_INFLIGHT=(async()=>{
      try{
        const sb=window.supabaseClient;if(!sb)return new Map();
        const {data,error}=await sb.from(TABLE).select('normalized_title,genres').eq('is_catalog_title',true).limit(5000);
        if(error||!Array.isArray(data))return new Map();
        const idx=new Map();
        data.forEach(row=>{
          const key=String(row?.normalized_title||'');if(!key)return;
          const gs=new Set((Array.isArray(row?.genres)?row.genres:[]).map(g=>String(g||'').trim()).filter(Boolean));
          idx.set(key,gs);
        });
        return idx;
      }catch(_){return new Map();}
    })().then(idx=>{GENRE_INDEX=idx;GENRE_INFLIGHT=null;return idx;});
    GENRE_INDEX=await GENRE_INFLIGHT;
    return GENRE_INDEX;
  }

  async function availableGenres(){
    const idx=await ensureGenreIndex(),set=new Set();
    for(const gs of idx.values())for(const g of gs)if(g)set.add(g);
    return [...set].sort((a,b)=>a.localeCompare(b,undefined,{sensitivity:'base'}));
  }

  async function syncGenreFilter(){
    const sel=document.getElementById('q-genre');if(!sel)return;
    const genres=await availableGenres();if(!genres.length)return;
    const existing=new Set([...sel.options].map(o=>o.value));
    const missing=genres.filter(g=>!existing.has(g));if(!missing.length)return;
    let group=[...sel.querySelectorAll('optgroup')].find(g=>g.dataset.sourceGenres==='1');
    if(!group){group=document.createElement('optgroup');group.label='More verified source genres';group.dataset.sourceGenres='1';sel.appendChild(group);}
    missing.forEach(g=>{const o=document.createElement('option');o.value=g;o.textContent=g;group.appendChild(o);});
    document.dispatchEvent(new CustomEvent('matchapp:optionspruned'));
  }

  async function titleKeysForGenres(genres){
    const wanted=[...new Set((Array.isArray(genres)?genres:[genres]).map(g=>String(g||'').trim().toLowerCase()).filter(Boolean))];
    if(!wanted.length)return null;
    const idx=await ensureGenreIndex();
    const keys=new Set();
    for(const [key,gs] of idx.entries()){
      const lower=new Set([...gs].map(g=>String(g).toLowerCase()));
      if(wanted.some(g=>lower.has(g)))keys.add(key);
    }
    return keys;
  }
  function viewingTarget(meta,title,region){
    const a=availability(meta,region);
    if(a.streams.length){
      const direct=providerSearch(a.streams[0],title);
      return {mode:'stream',href:direct||a.guide,provider:a.streams[0],availability:a};
    }
    if(a.inCinemas)return {mode:'cinema',href:showtimesUrl(title),provider:'',availability:a};
    return {mode:'guide',href:'',provider:'',availability:a};
  }
  function streamingElsewhere(meta,region){
    const root=meta?.availability||{},here=String(region||regionCode()).toUpperCase(),rows=[];
    for(const [code,row] of Object.entries(root)){
      if(!/^[A-Z]{2}$/.test(code)||code===here||!row||typeof row!=='object')continue;
      const streams=[...new Set([...(Array.isArray(row.stream)?row.stream:[]),...(Array.isArray(row.free)?row.free:[])].map(v=>String(v||'').trim()).filter(Boolean))];
      if(streams.length)rows.push({region:code,country:countryName(code),providers:streams.slice(0,8),guide:/^https:\/\//.test(String(row.link||''))?String(row.link):''});
    }
    rows.sort((a,b)=>a.country.localeCompare(b.country));
    return rows;
  }

  // Adults only: exact-title poster recovery for Top Titles and the match result.
  // Retry the same TMDB artwork at different image sizes before attempting a
  // different image. Only metadata already bound to this exact title can add
  // another artwork identity; this never searches for unrelated artwork.
  function adultPosterSurface(img){
    return !!(img && (img.id==='res-poster-img'||img.closest?.('#marquee-track')));
  }
  function posterVariants(url){
    const safe=String(url||'');
    if(!TRUSTED_POSTER.test(safe))return [];
    const tmdb=/^(https:\/\/image\.tmdb\.org\/t\/p\/)(?:w[0-9]+|original)\/([A-Za-z0-9_.-]+)$/.exec(safe);
    if(!tmdb)return [safe];
    return [...new Set([safe,tmdb[1]+'w780/'+tmdb[2],tmdb[1]+'w500/'+tmdb[2],tmdb[1]+'original/'+tmdb[2]])];
  }
  function exactPosterCandidates(state){
    let registry='';
    try{registry=typeof window.getVerifiedPoster==='function'?window.getVerifiedPoster(state.title):'';}catch(_){}
    const meta=state.meta||{};
    const sources=[registry,state.preferred,meta.poster_large_url,meta.poster_url,meta.poster_original_url];
    return [...new Set(sources.flatMap(posterVariants))];
  }
  function posterImageLoads(url){
    return new Promise(resolve=>{
      const probe=new Image();
      probe.onload=()=>resolve(true);
      probe.onerror=()=>resolve(false);
      probe.src=url;
    });
  }
  async function repairAdultPoster(img,state){
    if(state.repairing)return;
    state.repairing=true;
    const title=state.title,identity=state;
    try{
      // If the curated rail's hard-coded source failed, an exact database
      // title is the only extra identity source; do not fall back to fuzzy AI.
      if(!state.meta){
        const found=await lookup(title);
        if(img.__matchappAdultPoster!==identity)return;
        if(found&&normalise(found.title)===normalise(title))state.meta=found;
      }
      for(const url of exactPosterCandidates(state)){
        if(state.failed.has(url))continue;
        state.failed.add(url);
        if(!(await posterImageLoads(url)))continue;
        if(img.__matchappAdultPoster!==identity||!img.isConnected)return;
        img.dataset.matchappFallbackStage='verified';
        img.src=url;
        if(img.id==='res-poster-img'&&window.globalMatchTitle===title)window.globalMatchPoster=url;
        return;
      }
    }finally{
      if(img.__matchappAdultPoster===identity)state.repairing=false;
    }
  }
  function recoverAdultPoster(img,title,meta,preferred){
    if(!adultPosterSurface(img)||!title)return;
    const name=String(title);
    let state=img.__matchappAdultPoster;
    if(!state||state.title!==name){
      state={title:name,meta:null,preferred:'',failed:new Set(),repairing:false};
      img.__matchappAdultPoster=state;
    }
    if(meta&&normalise(meta.title)===normalise(name))state.meta=meta;
    if(preferred&&posterVariants(preferred).length)state.preferred=preferred;
    img.dataset.matchappMediaTitle=name;
    if(img.dataset.matchappAdultPosterBound!=='1'){
      img.dataset.matchappAdultPosterBound='1';
      img.addEventListener('error',()=>{
        const active=img.__matchappAdultPoster;
        if(!active)return;
        const bad=img.currentSrc||img.src;
        if(bad)active.failed.add(bad);
        if(!String(img.src||'').startsWith('data:image/svg+xml')){
          img.dataset.matchappFallbackStage='local';
          img.src=localPoster(active.title);
        }
        void repairAdultPoster(img,active);
      });
    }
    const current=String(img.currentSrc||img.src||'');
    const originalLoaded=TRUSTED_POSTER.test(current)&&img.complete&&img.naturalWidth>0;
    if(originalLoaded)return; // Never replace a working original with placeholder art.
    if(current&&TRUSTED_POSTER.test(current)&&!img.complete)return; // Preserve in-flight remote loading.
    if(current&&TRUSTED_POSTER.test(current)&&img.complete&&img.naturalWidth===0)state.failed.add(current);
    if(!String(img.src||'').startsWith('data:image/svg+xml')&&
       (!img.getAttribute('src')||(img.complete&&img.naturalWidth===0))){
      img.dataset.matchappFallbackStage='local';
      img.src=localPoster(name);
    }
    void repairAdultPoster(img,state);
  }

  function localLikePoster(img){
    const raw=String(img?.getAttribute?.('src')||'');
    return !raw||raw.startsWith('data:image/svg+xml')||raw.includes('/kids/covers/');
  }
  function promotePoster(img,url,title){
    if(!img||!TRUSTED_POSTER.test(String(url||'')))return;
    const expected=String(title||'');
    const probe=new Image();
    probe.onload=()=>{
      if(!img.isConnected||img.dataset.matchappMediaTitle!==expected)return;
      img.dataset.matchappFallbackStage='metadata';
      img.src=url;
      if(img.id==='res-poster-img')window.globalMatchPoster=url;
    };
    probe.onerror=()=>{};
    probe.src=url;
  }
  function hardenImage(img,title,meta){
    if(!img)return;
    const name=String(title||'');
    const previous=img.dataset.matchappMediaTitle||'';
    if(meta)img.__matchappMediaMeta=meta;
    else if(!img.__matchappMediaMeta)img.__matchappMediaMeta=null;

    if(img.dataset.matchappMediaHardened==='1'){
      if(previous!==name){
        img.dataset.matchappMediaTitle=name;
        img.dataset.matchappFallbackStage='';
        img.__matchappMediaMeta=meta||null;
      }
      const verified=safePoster(meta);
      if(verified&&(localLikePoster(img)||img.dataset.matchappFallbackStage==='local'))promotePoster(img,verified,name);
      return;
    }

    img.dataset.matchappMediaHardened='1';
    img.dataset.matchappMediaTitle=name;
    img.dataset.matchappFallbackStage='';
    const fallback=localPoster(name);
    img.addEventListener('error',async()=>{
      const stage=img.dataset.matchappFallbackStage||'';
      if(stage==='local')return;
      if(stage!=='metadata'){
        const fromMeta=safePoster(img.__matchappMediaMeta||await lookup(img.dataset.matchappMediaTitle||name));
        if(fromMeta&&img.src!==fromMeta){
          img.dataset.matchappFallbackStage='metadata';
          img.src=fromMeta;
          return;
        }
      }
      img.dataset.matchappFallbackStage='local';
      img.src=localPoster(img.dataset.matchappMediaTitle||name)||fallback;
    });

    const verified=safePoster(meta);
    if(!img.getAttribute('src')){
      if(verified){
        img.dataset.matchappFallbackStage='metadata';
        img.src=verified;
      }else{
        img.dataset.matchappFallbackStage='local';
        img.src=fallback;
      }
    }else if(verified&&localLikePoster(img)){
      promotePoster(img,verified,name);
    }
  }

  function ensurePlayerHost(anchor,id){if(!anchor)return null;let host=document.getElementById(id);if(host)return host;host=document.createElement('section');host.id=id;host.className='matchapp-media-preview';host.hidden=true;anchor.insertAdjacentElement('afterend',host);return host;}
  function renderPreview(host,meta,{kids=false,title=''}={}){
    if(!host)return;
    const previewSignature=kids?[
      normalise(title||meta?.title||''),
      String(meta?.source_key||''),
      String(meta?.updated_at||''),
      String(meta?.preview_kind||''),
      String(meta?.preview_embed_url||meta?.preview_url||sourcePage(meta)||''),
      String(window.MATCH_LANG||'en')
    ].join('|'):'';
    // Kids result media used to rewrite this host every time its own
    // MutationObserver noticed the rewrite, creating a self-feeding loop.
    // Make the render idempotent as a second line of defence even if callers
    // accidentally request the same enrichment more than once.
    if(kids&&host.dataset.matchappPreviewSignature===previewSignature)return;
    host.replaceChildren();host.hidden=true;
    if(kids)host.dataset.matchappPreviewSignature=previewSignature;
    if(!meta||(kids&&meta.kids_approved!==true))return;
    const label=document.createElement('div');label.className='matchapp-media-preview-label';label.textContent=(typeof window.t==='function'&&window.t('discover.preview'))||'Preview';
    if(meta.preview_kind==='video'&&TRUSTED_EMBED.test(String(meta.preview_embed_url||''))){const frame=document.createElement('iframe');frame.src=meta.preview_embed_url;frame.title=`${title||meta.title} preview`;frame.loading='lazy';frame.allow='accelerometer; autoplay; encrypted-media; picture-in-picture; web-share';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';host.append(label,frame);host.hidden=false;return;}
    if(meta.preview_kind==='audio'&&TRUSTED_AUDIO.test(String(meta.preview_url||''))){const audio=document.createElement('audio');audio.controls=true;audio.preload='none';audio.src=meta.preview_url;audio.setAttribute('aria-label',`${title||meta.title} audio preview`);host.append(label,audio);host.hidden=false;return;}
    // Never embed a guessed/unrelated preview. If the verified metadata has no
    // playable preview, show a clean title-page button instead.
    const page=sourcePage(meta);
    if(page){
      const fallback=document.createElement('a');fallback.className='matchapp-title-page-btn';fallback.href=page;fallback.target='_blank';fallback.rel='noopener noreferrer';
      fallback.textContent=(typeof window.t==='function'&&window.t('discover.titlePage'))||'Open title page';
      host.append(label,fallback);host.hidden=false;
    }
  }

  function renderAvailability(host,meta,{title='',kids=false}={}){
    if(!host)return;host.replaceChildren();host.hidden=true;
    if(!meta||(kids&&meta.kids_approved!==true))return;
    const actualTitle=title||meta.title||'',a=availability(meta),links=providerLinks(meta,actualTitle,a.region);
    const genres=(Array.isArray(meta.genres)?meta.genres:[]).filter(Boolean);
    const wrap=document.createElement('div');wrap.className='matchapp-title-availability';
    if(genres.length){
      const row=document.createElement('div');row.className='matchapp-real-genres';
      const label=document.createElement('strong');label.textContent='Genres';row.appendChild(label);
      genres.slice(0,8).forEach(g=>{const chip=document.createElement('span');chip.textContent=g;row.appendChild(chip);});
      wrap.appendChild(row);
    }
    const status=document.createElement('div');status.className='matchapp-availability-status';
    const regionLabel=countryName(a.region);
    if(a.streams.length)status.textContent='Streaming in '+regionLabel+' now.';
    else if(a.inCinemas)status.textContent='In cinemas in '+regionLabel+'. Streaming is not listed there yet.';
    else status.textContent='Not currently listed for streaming in '+regionLabel+'.';
    wrap.appendChild(status);
    if(links.length){
      const row=document.createElement('div');row.className='matchapp-provider-actions';
      const label=document.createElement('strong');label.textContent='Watch options in '+regionLabel;row.appendChild(label);
      links.slice(0,16).forEach(link=>{
        const aEl=document.createElement('a');aEl.href=link.href;aEl.target='_blank';aEl.rel='noopener noreferrer';
        const prefix=link.direct?(link.mode==='rent'?'Rent · ':link.mode==='buy'?'Buy · ':'Watch · '):'Availability · ';
        aEl.textContent=prefix+link.provider;row.appendChild(aEl);
      });
      wrap.appendChild(row);
    }
    if(a.cinemaDate||a.inCinemas){
      const row=document.createElement('div');row.className='matchapp-cinema-actions';
      const when=document.createElement('span');when.textContent=(a.inCinemas?'In cinemas'+(a.cinemaDate?' · '+a.cinemaDate:''):'Cinema release · '+a.cinemaDate);row.appendChild(when);
      const nearby=document.createElement('a');nearby.href=showtimesUrl(actualTitle);nearby.target='_blank';nearby.rel='noopener noreferrer';nearby.textContent=a.inCinemas?'Cinemas & showtimes near me':'Cinema release & showtimes';row.appendChild(nearby);
      wrap.appendChild(row);
    }
    if(!a.streams.length){
      const elsewhere=streamingElsewhere(meta,a.region);
      if(elsewhere.length){
        const row=document.createElement('div');row.className='matchapp-other-countries';
        const label=document.createElement('strong');label.textContent='Streaming in other countries';row.appendChild(label);
        elsewhere.slice(0,18).forEach(item=>{
          const line=document.createElement('span');line.className='matchapp-country-availability';
          line.textContent=item.country+' · '+item.providers.join(', ');row.appendChild(line);
        });
        wrap.appendChild(row);
      }
      if(Number.isSafeInteger(Number(meta.tmdb_id))&&['movie','tv'].includes(meta.media_kind)){
        const follow=document.createElement('button');follow.type='button';follow.className='matchapp-follow-availability';
        follow.textContent='🔔 Notify me when it streams in '+regionLabel;
        follow.addEventListener('click',async()=>{
          if(!window.MatchNotifications?.followTitle){
            window.showToast?.('Sign in to follow streaming availability.');
            window.openAuthModal?.();return;
          }
          follow.disabled=true;
          const ok=await window.MatchNotifications.followTitle(meta,a.region).catch(()=>false);
          follow.disabled=false;
          if(ok){follow.textContent='✓ You’ll be notified in '+regionLabel;follow.classList.add('is-following');}
        });
        wrap.appendChild(follow);
      }
    }
    const page=a.sourcePage;
    if(page){
      const row=document.createElement('div');row.className='matchapp-title-page-row';
      const pageLink=document.createElement('a');pageLink.href=page;pageLink.target='_blank';pageLink.rel='noopener noreferrer';pageLink.textContent='Title details';row.appendChild(pageLink);wrap.appendChild(row);
    }
    if(wrap.childElementCount){host.appendChild(wrap);host.hidden=false;}
  }
  function renderTitleFacts(meta,{kids=false}={}){
    const id=kids?'matchapp-kids-title-facts':'res-title-facts';
    let host=document.getElementById(id);
    if(!meta){host?.remove();return;}
    const countries=(Array.isArray(meta.origin_countries)?meta.origin_countries:[])
      .map(countryName).filter(Boolean).slice(0,6);
    const cast=(Array.isArray(meta.cast_members)?meta.cast_members:[])
      .filter(x=>x&&x.name).slice(0,kids?6:10);
    if(!countries.length&&!cast.length){host?.remove();return;}
    if(!host){
      host=document.createElement('div');
      host.id=id;
      host.className='matchapp-title-facts';
      const anchor=kids
        ? (document.getElementById('kids-watch-description')||document.getElementById('kids-watch-name'))
        : (document.getElementById('res-synopsis')||document.getElementById('res-media-meta')||document.getElementById('res-title'));
      if(anchor)anchor.insertAdjacentElement('afterend',host);
    }
    if(!host)return;
    host.replaceChildren();
    if(countries.length){
      const row=document.createElement('div');
      row.className='matchapp-title-fact-row';
      const label=document.createElement('strong');
      label.textContent=countries.length>1?'Countries':'Country';
      const value=document.createElement('span');
      value.textContent=countries.join(', ');
      row.append(label,value);
      host.appendChild(row);
    }
    if(cast.length){
      const row=document.createElement('div');
      row.className='matchapp-title-fact-row';
      const label=document.createElement('strong');
      label.textContent='Cast';
      const value=document.createElement('span');
      value.textContent=cast.map(x=>x.character?x.name+' · '+x.character:x.name).join('  •  ');
      row.append(label,value);
      host.appendChild(row);
    }
  }

  function applyDetails(meta){
    const existing=document.getElementById('res-media-meta');
    if(!meta){existing?.remove();renderTitleFacts(null);return;}
    const synopsis=document.getElementById('res-synopsis');
    if(synopsis&&(!synopsis.textContent||synopsis.textContent.trim().length<24)&&meta.overview)synopsis.textContent=meta.overview;

    const bits=[];
    if(meta.year)bits.push(meta.year);
    if(meta.runtime_minutes)bits.push(`${meta.runtime_minutes} min`);
    if(meta.content_rating)bits.push('Rated '+meta.content_rating);
    if(meta.vote_average)bits.push(`TMDB ★ ${Number(meta.vote_average).toFixed(1)}`);
    (Array.isArray(meta.genres)?meta.genres:[]).slice(0,5).forEach(g=>bits.push(g));

    const badge=document.getElementById('res-platform-badge');
    if(bits.length&&badge){
      const el=existing||document.createElement('span');
      el.id='res-media-meta';
      el.className='matchapp-media-meta';
      el.textContent=bits.join(' · ');
      if(!existing)badge.insertAdjacentElement('afterend',el);
    }else existing?.remove();

    renderTitleFacts(meta);
  }

  async function enrichTrendingRail(){
    const cards=[...document.querySelectorAll('#marquee-track .marquee-item')];
    let next=0;
    const enrichCard=async card=>{
      const img=card.querySelector('img[data-title]'),title=img?.dataset?.title||'';
      if(!title)return;
      const meta=await refreshExact(await lookup(title));
      recoverAdultPoster(img,title,meta);
      const state=availability(meta);
      let ribbon=card.querySelector('.matchapp-cinema-ribbon');
      if(state.inCinemas){
        if(!ribbon){
          ribbon=document.createElement('span');
          ribbon.className='matchapp-cinema-ribbon';
          card.appendChild(ribbon);
        }
        ribbon.textContent=(typeof window.t==='function'&&window.t('discover.inCinemas'))||'In cinemas';
      }else ribbon?.remove();
    };
    const worker=async()=>{
      while(next<cards.length){
        const card=cards[next++];
        try{await enrichCard(card)}catch(_){}
      }
    };
    const TRENDING_CONCURRENCY=2;
    await Promise.all(Array.from({length:Math.min(TRENDING_CONCURRENCY,cards.length)},worker));
  }

  async function resolvePoster(title,opts={}){
    let meta=await lookup(title,opts);
    if(meta)meta=await refreshExact(meta);
    if(!safePoster(meta)){
      const live=await lookupLive(title,opts);
      if(live)meta=meta?{...meta,...live}:live;
    }
    return {url:safePoster(meta)||'',meta:meta||null};
  }

  let mainSerial=0;
  async function enrichMain(){
    const titleEl=document.getElementById('res-title');
    const resultRoot=document.getElementById('result-card')||document.getElementById('result-box');
    if(!titleEl||!resultRoot||resultRoot.hidden||resultRoot.style.display==='none')return;
    const title=String(window.globalMatchTitle||titleEl.textContent||'').trim();
    if(!title||title==='Title')return;
    const serial=++mainSerial;
    const anchor=document.getElementById('res-platform-badge')||document.getElementById('res-synopsis')||document.getElementById('res-actions')||titleEl;
    const availabilityHost=ensurePlayerHost(anchor,'matchapp-main-availability');
    const host=ensurePlayerHost(availabilityHost||anchor,'matchapp-main-preview');

    const identity=(window.currentMatchIdentity&&normalise(window.currentMatchIdentity.title)===normalise(title))
      ? window.currentMatchIdentity:{};
    let opts={
      year:identity.year||'',
      cats:Array.isArray(identity.cats)?identity.cats:[],
      kind:identity.kind||'',
      tmdbId:identity.tmdbId||null,
      priority:true
    };
    try{
      const entry=typeof CONTENT_CATALOG!=='undefined'?CONTENT_CATALOG.find(e=>e?.title===title):null;
      if(entry)opts={
        ...opts,
        year:opts.year||entry.year||'',
        cats:opts.cats.length?opts.cats:(entry.cats||[]),
        kind:opts.kind||(window.tmdbKindForCats?.(entry.cats||[])||'')
      };
    }catch(_){}

    const resolved=await resolvePoster(title,opts);
    if(serial!==mainSerial)return;
    const meta=resolved.meta;
    const poster=document.getElementById('res-poster-img');

    if(poster){
      poster.dataset.matchappMediaTitle=title;
      recoverAdultPoster(poster,title,meta,resolved.url);
    }
    if(!meta){
      applyDetails(null);
      renderPreview(host,null,{title});
      return;
    }
    applyDetails(meta);
    renderAvailability(availabilityHost,meta,{title});
    renderPreview(host,meta,{title});
  }

  let kidsSerial=0,kidsEnrichTimer=0;
  async function enrichKids(){
    const dialog=document.getElementById('kids-watch-dialog');
    if(!dialog||!dialog.open)return;
    const name=document.getElementById('kids-watch-name');if(!name)return;const title=name.textContent.trim();if(!title)return;const serial=++kidsSerial;
    const meta=await lookup(title,{kids:true});if(serial!==kidsSerial||!dialog.open)return;
    const host=ensurePlayerHost(document.getElementById('kids-watch-description')||name,'matchapp-kids-preview');
    renderPreview(host,meta,{kids:true,title});
    renderTitleFacts(meta,{kids:true});
    if(meta)dialog.querySelectorAll('img[data-title],img[data-poster-title]').forEach(img=>hardenImage(img,title,meta));
  }
  function queueKidsEnrich(){
    clearTimeout(kidsEnrichTimer);
    kidsEnrichTimer=setTimeout(()=>{
      const dialog=document.getElementById('kids-watch-dialog');
      hardenWithin(dialog||document);
      enrichKids().catch(()=>{});
    },0);
  }

  function installStyle(){if(document.getElementById('matchapp-media-style'))return;const s=document.createElement('style');s.id='matchapp-media-style';s.textContent=`
    .matchapp-media-preview{margin:14px 0 4px;max-width:760px}.matchapp-media-preview[hidden]{display:none!important}
    .matchapp-media-preview-label{margin:0 0 7px;color:#E5C158;font:800 11px/1.2 Inter,Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase}
    .matchapp-media-preview iframe,.discover-card-preview video{display:block;width:100%;aspect-ratio:16/9;border:0;border-radius:14px;background:#000}
    .matchapp-media-preview audio{display:block;width:100%;min-height:44px}.discover-card-preview video{margin:0 0 9px}.matchapp-title-page-btn{display:inline-flex;align-items:center;justify-content:center;padding:10px 14px;border:1px solid #E5C158;border-radius:999px;color:#E5C158;text-decoration:none;font-weight:800}.matchapp-media-meta{display:inline-flex;margin-left:8px;color:#bdb4ca;font-size:12px}.matchapp-title-facts{display:grid;gap:7px;margin:10px 0 2px;padding:10px 12px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.025)}.matchapp-title-fact-row{display:grid;grid-template-columns:minmax(64px,max-content) minmax(0,1fr);gap:10px;align-items:start;color:#d9d2e2;font-size:12px;line-height:1.5}.matchapp-title-fact-row strong{color:#E5C158;text-transform:uppercase;letter-spacing:.05em;font-size:10px}.matchapp-title-fact-row span{min-width:0;overflow-wrap:anywhere}
    .matchapp-title-availability{display:grid;gap:10px;margin:12px 0 16px;padding:13px;border:1px solid rgba(229,193,88,.18);border-radius:16px;background:linear-gradient(145deg,rgba(229,193,88,.045),rgba(111,71,158,.055))}.matchapp-real-genres,.matchapp-provider-actions,.matchapp-cinema-actions,.matchapp-title-page-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.matchapp-real-genres strong,.matchapp-provider-actions strong,.matchapp-other-countries strong{width:100%;color:#E5C158;font-size:12px;text-transform:uppercase;letter-spacing:.06em}.matchapp-real-genres span,.matchapp-title-availability a{padding:7px 10px;border-radius:999px;border:1px solid rgba(229,193,88,.35);background:rgba(229,193,88,.08);color:#f6e8ad;text-decoration:none;font-size:12px;font-weight:800}.matchapp-title-availability a:hover{background:rgba(229,193,88,.16)}.matchapp-cinema-actions span{color:#fff;font-size:13px;font-weight:800}.matchapp-availability-status{color:#eee;font-size:13px;line-height:1.55;padding:9px 11px;border:1px solid rgba(255,255,255,.09);border-radius:12px;background:rgba(255,255,255,.035)}.matchapp-other-countries{display:grid;gap:6px}.matchapp-country-availability{display:block;color:#cfc6dd;font-size:12px;line-height:1.4}.matchapp-follow-availability{justify-self:start;border:1px solid rgba(229,193,88,.55);background:linear-gradient(135deg,rgba(229,193,88,.18),rgba(117,71,159,.18));color:#ffe9a6;border-radius:999px;padding:10px 14px;font-weight:900;cursor:pointer}.matchapp-follow-availability.is-following{border-color:#48d597;color:#aef7d2}
    #matchapp-kids-preview{max-width:520px;margin-left:auto;margin-right:auto}#matchapp-kids-preview iframe{border-radius:18px}
    #marquee-track .marquee-item{position:relative}
    .matchapp-cinema-ribbon{position:absolute;z-index:8;top:10px;left:-5px;padding:6px 10px 6px 12px;border-radius:4px 8px 8px 4px;background:#d6253f;color:#fff;font:900 10px/1 Inter,Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;box-shadow:0 5px 14px rgba(214,37,63,.4);pointer-events:none}
    .matchapp-cinema-ribbon:after{content:"";position:absolute;left:0;bottom:-6px;border-top:6px solid #871427;border-left:6px solid transparent}
    @media(max-width:640px){.matchapp-media-meta{display:block;margin:6px 0 0}.matchapp-title-fact-row{grid-template-columns:1fr;gap:2px}.matchapp-media-preview{width:100%}.matchapp-cinema-ribbon{top:7px;font-size:9px;padding:5px 8px 5px 10px}}
  `;document.head.appendChild(s);}
  function hardenWithin(root){
    root?.querySelectorAll?.('img[data-title]:not([data-matchapp-media-hardened]),img[data-poster-title]:not([data-matchapp-media-hardened]),#res-poster-img:not([data-matchapp-media-hardened]),.kids-card img:not([data-matchapp-media-hardened])').forEach(img=>{
      const title=titleForImage(img);
      if(adultPosterSurface(img))recoverAdultPoster(img,title);
      else hardenImage(img,title);
    });
  }
  function boot(){
    installStyle();syncGenreFilter();hardenWithin(document);
    const result=document.getElementById('result-card')||document.getElementById('result-box');
    const kids=document.getElementById('kids-watch-dialog');
    // Result enrichment is event-driven on BOTH main and Kids surfaces.
    // Never observe either mutable result subtree and then rewrite it from the
    // observer callback: renderPreview()/renderAvailability() replace children
    // and would otherwise feed the observer forever.
    if(result&&result.style.display!=='none'&&!result.hidden)enrichMain();
    const isHome=location.pathname==='/'||location.pathname==='/index.html';
    if(isHome){
      // Do not start network/media enrichment while Home is still settling.
      // Arm it after load and only run when the rail is actually near view.
      const rail=document.getElementById('trending-rail');
      let started=false;
      const start=()=>{
        if(started)return;started=true;
        const later=()=>enrichTrendingRail();
        if('requestIdleCallback' in window)requestIdleCallback(later);
        else setTimeout(later,0);
      };
      const arm=()=>{
        if(!rail){return}
        if('IntersectionObserver' in window){
          const io=new IntersectionObserver(entries=>{
            if(entries.some(entry=>entry.isIntersecting)){io.disconnect();start()}
          },{rootMargin:'0px'});
          io.observe(rail);
        }else setTimeout(start,8000);
      };
      if(document.readyState==='complete')setTimeout(arm,800);
      else window.addEventListener('load',()=>setTimeout(arm,800),{once:true});
    }else enrichTrendingRail();
    document.addEventListener('matchapp:newmatch',()=>{hardenWithin(result||document);enrichMain();});
    document.addEventListener('matchapp:kids-result',queueKidsEnrich);
    document.addEventListener('matchapp:langchange',()=>{
      enrichTrendingRail();
      const host=document.getElementById('matchapp-kids-preview');
      if(host)delete host.dataset.matchappPreviewSignature;
      queueKidsEnrich();
    });
  }
  window.MatchAppCatalogMedia=Object.freeze({recoverAdultPoster,posterVariants,lookup,lookupLive,refreshExact,resolvePoster,normalise,localPoster,enrichMain,enrichKids,enrichTrendingRail,renderPreview,renderAvailability,availability,streamingElsewhere,viewingTarget,providerLinks,providerSearch,showtimesUrl,sourcePage,regionCode,countryName,titleKeysForGenres,availableGenres,syncGenreFilter});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
