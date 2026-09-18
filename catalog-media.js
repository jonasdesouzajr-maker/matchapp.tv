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
      let q=sb.from(TABLE).select('source_key,title,year,media_kind,tmdb_id,poster_url,poster_large_url,poster_original_url,backdrop_url,overview,genres,runtime_minutes,content_rating,vote_average,original_language,preview_kind,preview_provider,preview_url,preview_embed_url,availability,kids_approved,kids_age_bands,is_catalog_title,is_trending,updated_at').eq('normalized_title',normalise(title));
      if(opts.year)q=q.eq('year',Number(opts.year));if(opts.kind)q=q.eq('media_kind',opts.kind);if(opts.kids)q=q.eq('kids_approved',true);
      const {data,error}=await q.order('is_catalog_title',{ascending:false}).order('updated_at',{ascending:false}).limit(4);
      if(error||!Array.isArray(data)||!data.length){CACHE.set(key,null);return null;}
      const exact=data.find(r=>normalise(r.title)===normalise(title))||data[0];CACHE.set(key,exact);return exact;
    }catch(_){CACHE.set(key,null);return null;}finally{INFLIGHT.delete(key);}})();INFLIGHT.set(key,p);return p;
  }
  function safePoster(meta){return [meta?.poster_original_url,meta?.poster_large_url,meta?.poster_url].find(u=>TRUSTED_POSTER.test(String(u||'')))||null;}
  function regionCode(){
    const saved=String(localStorage.getItem('match_user_country')||'').trim().toLowerCase();
    if(/^(br|brasil|brazil)$/.test(saved))return 'BR';
    if(/^(pt|portugal)$/.test(saved))return 'PT';
    if(/^(gb|uk|united kingdom)$/.test(saved))return 'GB';
    if(/^(us|usa|united states)$/.test(saved))return 'US';
    const lang=window.MATCH_LANG||'en';
    return lang==='pt-BR'?'BR':'US';
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
    const streams=Array.isArray(row.stream)?row.stream.filter(Boolean):[];
    const cinemaDate=/^\d{4}-\d{2}-\d{2}$/.test(String(row.cinema_release_date||''))?String(row.cinema_release_date):'';
    let inCinemas=false;
    if(cinemaDate){
      const start=Date.parse(cinemaDate+'T00:00:00Z'),now=Date.now(),windowMs=120*86400000;
      inCinemas=Number.isFinite(start)&&now>=start-7*86400000&&now<=start+windowMs&&!streams.length;
    }
    return {region:code,streams,cinemaDate,inCinemas,guide:/^https:\/\//.test(String(row.link||''))?String(row.link):'',sourcePage:sourcePage(meta)};
  }
  function providerSearch(provider,title){
    const aliases={
      'Amazon Prime Video':'Prime Video','Prime Video':'Prime Video','Netflix':'Netflix','Disney Plus':'Disney+',
      'HBO Max':'Max','Max':'Max','Apple TV':'Apple TV+','Paramount Plus':'Paramount+','Hulu':'Hulu',
      'Peacock Premium':'Peacock','Peacock Premium Plus':'Peacock','Globoplay':'Globoplay',
      'Crunchyroll Amazon Channel':'Crunchyroll','Crunchyroll':'Crunchyroll','Rakuten Viki':'Viki'
    };
    const mapped=aliases[String(provider||'')]||String(provider||'');
    try{
      if(typeof platformSearchUrl==='function'&&mapped)return platformSearchUrl(mapped,title);
    }catch(_){}
    return '';
  }
  function viewingTarget(meta,title,region){
    const a=availability(meta,region);
    if(a.streams.length){
      const direct=providerSearch(a.streams[0],title);
      return {mode:'stream',href:direct||a.guide||a.sourcePage,provider:a.streams[0],availability:a};
    }
    if(a.inCinemas)return {mode:'cinema',href:a.sourcePage||a.guide,provider:'',availability:a};
    return {mode:'guide',href:a.guide||a.sourcePage,provider:'',availability:a};
  }

  function hardenImage(img,title,meta){
    if(!img)return;
    img.__matchappMediaMeta=meta||null;
    if(img.dataset.matchappMediaHardened==='1'){
      if(img.dataset.matchappMediaTitle!==String(title||'')){img.dataset.matchappMediaTitle=String(title||'');img.dataset.matchappFallbackStage='';}
      return;
    }
    img.dataset.matchappMediaHardened='1';img.dataset.matchappMediaTitle=String(title||'');img.dataset.matchappFallbackStage='';
    const fallback=localPoster(title);
    img.addEventListener('error',async()=>{
      const stage=img.dataset.matchappFallbackStage||'';
      if(stage==='local')return;
      if(stage!=='metadata'){
        const fromMeta=safePoster(img.__matchappMediaMeta||await lookup(img.dataset.matchappMediaTitle||title));
        if(fromMeta&&img.src!==fromMeta){img.dataset.matchappFallbackStage='metadata';img.src=fromMeta;return;}
      }
      img.dataset.matchappFallbackStage='local';img.src=localPoster(img.dataset.matchappMediaTitle||title)||fallback;
    });
    if(!img.getAttribute('src')){const fromMeta=safePoster(meta);if(fromMeta){img.dataset.matchappFallbackStage='metadata';img.src=fromMeta;}else{img.dataset.matchappFallbackStage='local';img.src=fallback;}}
  }

  function ensurePlayerHost(anchor,id){if(!anchor)return null;let host=document.getElementById(id);if(host)return host;host=document.createElement('section');host.id=id;host.className='matchapp-media-preview';host.hidden=true;anchor.insertAdjacentElement('afterend',host);return host;}
  function renderPreview(host,meta,{kids=false,title=''}={}){
    if(!host)return;host.replaceChildren();host.hidden=true;
    if(!meta||(kids&&meta.kids_approved!==true))return;
    const label=document.createElement('div');label.className='matchapp-media-preview-label';label.textContent=(typeof window.t==='function'&&window.t('discover.preview'))||'Preview';
    if(meta.preview_kind==='video'&&TRUSTED_EMBED.test(String(meta.preview_embed_url||''))){const frame=document.createElement('iframe');frame.src=meta.preview_embed_url;frame.title=`${title||meta.title} preview`;frame.loading='lazy';frame.allow='accelerometer; autoplay; encrypted-media; picture-in-picture';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';host.append(label,frame);host.hidden=false;return;}
    if(meta.preview_kind==='audio'&&TRUSTED_AUDIO.test(String(meta.preview_url||''))){const audio=document.createElement('audio');audio.controls=true;audio.preload='none';audio.src=meta.preview_url;audio.setAttribute('aria-label',`${title||meta.title} audio preview`);host.append(label,audio);host.hidden=false;}
  }
  function applyDetails(meta){
    const existing=document.getElementById('res-media-meta');
    if(!meta){existing?.remove();return;}
    const synopsis=document.getElementById('res-synopsis');if(synopsis&&(!synopsis.textContent||synopsis.textContent.trim().length<24)&&meta.overview)synopsis.textContent=meta.overview;
    const bits=[];if(meta.year)bits.push(meta.year);if(meta.runtime_minutes)bits.push(`${meta.runtime_minutes} min`);if(meta.content_rating)bits.push(meta.content_rating);if(meta.vote_average)bits.push(`★ ${Number(meta.vote_average).toFixed(1)}`);
    if(!bits.length){existing?.remove();return;}
    const badge=document.getElementById('res-platform-badge');if(!badge)return;
    const el=existing||document.createElement('span');el.id='res-media-meta';el.className='matchapp-media-meta';el.textContent=bits.join(' · ');if(!existing)badge.insertAdjacentElement('afterend',el);
  }

  async function enrichTrendingRail(){
    const cards=[...document.querySelectorAll('#marquee-track .marquee-item')];
    await Promise.all(cards.map(async card=>{
      const img=card.querySelector('img[data-title]'),title=img?.dataset?.title||'';
      if(!title)return;
      const meta=await lookup(title);
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
    }));
  }

  let mainSerial=0;
  async function enrichMain(){
    const titleEl=document.getElementById('res-title');if(!titleEl)return;const title=titleEl.textContent.trim();if(!title)return;const serial=++mainSerial;
    const host=ensurePlayerHost(document.getElementById('res-actions')||document.getElementById('res-synopsis')||titleEl,'matchapp-main-preview');
    const meta=await lookup(title);if(serial!==mainSerial)return;
    if(!meta){applyDetails(null);renderPreview(host,null,{title});const poster=document.getElementById('res-poster-img');if(poster)hardenImage(poster,title,null);return;}
    const poster=document.getElementById('res-poster-img');if(poster){poster.dataset.matchappMediaTitle=title;poster.dataset.matchappFallbackStage='';const p=safePoster(meta);if(p&&(!poster.src||poster.src.startsWith('data:')))poster.src=p;hardenImage(poster,title,meta);}
    applyDetails(meta);renderPreview(host,meta,{title});
  }

  let kidsSerial=0;
  async function enrichKids(){
    const name=document.getElementById('kids-watch-name');if(!name)return;const title=name.textContent.trim();if(!title)return;const serial=++kidsSerial;
    const meta=await lookup(title,{kids:true});if(serial!==kidsSerial)return;
    const dialog=document.getElementById('kids-watch-dialog'),host=ensurePlayerHost(document.getElementById('kids-watch-description')||name,'matchapp-kids-preview');renderPreview(host,meta,{kids:true,title});
    if(dialog&&meta)dialog.querySelectorAll('img[data-title],img[data-poster-title]').forEach(img=>hardenImage(img,title,meta));
  }

  function installStyle(){if(document.getElementById('matchapp-media-style'))return;const s=document.createElement('style');s.id='matchapp-media-style';s.textContent=`
    .matchapp-media-preview{margin:14px 0 4px;max-width:760px}.matchapp-media-preview[hidden]{display:none!important}
    .matchapp-media-preview-label{margin:0 0 7px;color:#E5C158;font:800 11px/1.2 Inter,Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase}
    .matchapp-media-preview iframe{display:block;width:100%;aspect-ratio:16/9;border:0;border-radius:14px;background:#000}
    .matchapp-media-preview audio{display:block;width:100%;min-height:44px}.matchapp-media-meta{display:inline-flex;margin-left:8px;color:#bdb4ca;font-size:12px}
    #matchapp-kids-preview{max-width:520px;margin-left:auto;margin-right:auto}#matchapp-kids-preview iframe{border-radius:18px}
    #marquee-track .marquee-item{position:relative}
    .matchapp-cinema-ribbon{position:absolute;z-index:8;top:10px;left:-5px;padding:6px 10px 6px 12px;border-radius:4px 8px 8px 4px;background:#d6253f;color:#fff;font:900 10px/1 Inter,Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;box-shadow:0 5px 14px rgba(214,37,63,.4);pointer-events:none}
    .matchapp-cinema-ribbon:after{content:"";position:absolute;left:0;bottom:-6px;border-top:6px solid #871427;border-left:6px solid transparent}
    @media(max-width:640px){.matchapp-media-meta{display:block;margin:6px 0 0}.matchapp-media-preview{width:100%}.matchapp-cinema-ribbon{top:7px;font-size:9px;padding:5px 8px 5px 10px}}
  `;document.head.appendChild(s);}
  function boot(){
    installStyle();document.querySelectorAll('img[data-title],img[data-poster-title],#res-poster-img,.kids-card img').forEach(img=>hardenImage(img,titleForImage(img)));
    const obs=new MutationObserver(records=>{let main=false,kids=false;for(const r of records){const el=r.target.nodeType===1?r.target:r.target.parentElement;if(el?.id==='res-title'||el?.closest?.('#result-card'))main=true;if(el?.id==='kids-watch-name'||el?.closest?.('#kids-watch-dialog'))kids=true;}if(main)queueMicrotask(enrichMain);if(kids)queueMicrotask(enrichKids);document.querySelectorAll('img[data-title]:not([data-matchapp-media-hardened]),img[data-poster-title]:not([data-matchapp-media-hardened]),#res-poster-img:not([data-matchapp-media-hardened]),.kids-card img:not([data-matchapp-media-hardened])').forEach(img=>hardenImage(img,titleForImage(img)));});
    obs.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:false});enrichMain();enrichKids();enrichTrendingRail();
    document.addEventListener('matchapp:langchange',enrichTrendingRail);
  }
  window.MatchAppCatalogMedia=Object.freeze({lookup,normalise,localPoster,enrichMain,enrichKids,enrichTrendingRail,renderPreview,availability,viewingTarget,sourcePage,regionCode});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
