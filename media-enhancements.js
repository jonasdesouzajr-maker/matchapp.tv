/* MatchApp progressive media enrichment.
 *
 * This layer is intentionally optional: if Supabase, TMDB-derived metadata or
 * a preview provider is unavailable, the existing MatchApp result UI continues
 * unchanged. No remote metadata may authorize a title or a Kids result.
 */
(function(){
  'use strict';

  const CACHE=new Map();
  const META_SELECT='source_key,title,normalized_title,year,media_kind,is_catalog_title,is_trending,kids_approved,kids_age_bands,poster_url,poster_large_url,poster_original_url,backdrop_url,overview,genres,runtime_minutes,content_rating,vote_average,original_language,preview_kind,preview_provider,preview_url,preview_embed_url';
  const SAFE_POSTER=/^https:\/\/(?:image\.tmdb\.org\/t\/p\/(?:w\d+|original)\/|is[1-5]-ssl\.mzstatic\.com\/)/i;
  const SAFE_AUDIO=/^https:\/\/(?:audio|video)-ssl\.itunes\.apple\.com\//i;
  const SAFE_EMBED=/^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{6,20}(?:\?[^\s#]*)?$/;

  const norm=value=>String(value||'').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();

  function generatedFallback(title){
    const safe=String(title||'MatchApp').slice(0,80).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#130734"/><stop offset="1" stop-color="#101010"/></linearGradient></defs><rect width="600" height="900" fill="url(#g)"/><circle cx="300" cy="320" r="92" fill="none" stroke="#E5C158" stroke-width="12"/><path d="M275 265v110l95-55z" fill="#E5C158"/><text x="300" y="520" text-anchor="middle" fill="#E5C158" font-family="Arial,sans-serif" font-size="28" font-weight="700">MatchApp TV</text><text x="300" y="590" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="24">${safe}</text></svg>`;
    return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);
  }

  function client(){return window.supabaseClient&&typeof window.supabaseClient.from==='function'?window.supabaseClient:null;}

  async function metadataFor(title){
    const key=norm(title); if(!key)return null;
    if(CACHE.has(key))return CACHE.get(key);
    const pending=(async()=>{
      const sb=client();if(!sb)return null;
      try{
        const {data,error}=await sb.from('catalog_media_metadata')
          .select(META_SELECT).eq('normalized_title',key)
          .order('is_catalog_title',{ascending:false}).order('is_trending',{ascending:false}).limit(8);
        if(error||!Array.isArray(data)||!data.length)return null;
        const exact=data.find(row=>norm(row.title)===key)||data[0];
        return exact||null;
      }catch(_){return null;}
    })();
    CACHE.set(key,pending);
    const value=await pending;CACHE.set(key,Promise.resolve(value));return value;
  }
  window.MatchAppMediaMetadata={get:metadataFor,normalize:norm};

  function trustedPoster(meta){
    for(const url of [meta?.poster_original_url,meta?.poster_large_url,meta?.poster_url]){
      if(typeof url==='string'&&SAFE_POSTER.test(url))return url;
    }
    return null;
  }
  function preload(url){return new Promise(resolve=>{const i=new Image();const timer=setTimeout(()=>resolve(false),5000);i.onload=()=>{clearTimeout(timer);resolve(true);};i.onerror=()=>{clearTimeout(timer);resolve(false);};i.src=url;});}

  async function recoverCover(img,title){
    if(!img||img.dataset.matchappRecovering==='1')return;
    img.dataset.matchappRecovering='1';
    const previous=img.currentSrc||img.src||'';
    const meta=await metadataFor(title);
    const candidate=trustedPoster(meta);
    if(candidate&&candidate!==previous&&await preload(candidate)){
      img.removeAttribute('srcset');img.src=candidate;img.style.visibility='visible';img.dataset.matchappRecovered='metadata';
      delete img.dataset.matchappRecovering;return;
    }
    // Existing MatchApp handlers may already have changed the src to a local or
    // generated cover while the metadata request was in flight. Keep that if it
    // is now usable; otherwise guarantee a local inline cover rather than a
    // browser broken-image icon.
    const now=img.currentSrc||img.src||'';
    if(now&&now!==previous&&(now.startsWith('data:image/')||now.startsWith('/kids/covers/'))){img.style.visibility='visible';delete img.dataset.matchappRecovering;return;}
    img.removeAttribute('srcset');img.src=generatedFallback(title);img.style.visibility='visible';img.dataset.matchappRecovered='generated';delete img.dataset.matchappRecovering;
  }

  function titleForImage(img){
    return img.dataset.title||img.closest?.('.kids-card')?.dataset.title||img.alt||document.getElementById('res-title')?.textContent||'';
  }
  document.addEventListener('error',event=>{
    const img=event.target;
    if(!(img instanceof HTMLImageElement))return;
    if(!img.matches('#res-poster-img,.marquee-item img[data-title],.kids-card img,.kids-feature img,[id^="kid-detail-"]'))return;
    const title=titleForImage(img);if(!title)return;
    img.style.visibility='hidden';queueMicrotask(()=>recoverCover(img,title));
  },true);

  const coverObserver=new MutationObserver(records=>records.forEach(record=>{
    const img=record.target;if(!(img instanceof HTMLImageElement)||img.id!=='res-poster-img')return;
    const src=img.getAttribute('src')||'';
    if(src.startsWith('data:image/'))recoverCover(img,document.getElementById('res-title')?.textContent||'');
  }));

  function chip(text){const s=document.createElement('span');s.textContent=text;return s;}
  function renderRichMeta(meta){
    const anchor=document.getElementById('res-factbar');if(!anchor)return;
    let host=document.getElementById('matchapp-rich-meta');
    if(!host){host=document.createElement('div');host.id='matchapp-rich-meta';host.className='matchapp-rich-meta';anchor.insertAdjacentElement('afterend',host);}
    host.replaceChildren();
    const values=[];
    if(meta?.year)values.push(String(meta.year));
    if(meta?.runtime_minutes)values.push(`${meta.runtime_minutes} min`);
    if(meta?.content_rating)values.push(meta.content_rating);
    if(Array.isArray(meta?.genres))values.push(...meta.genres.slice(0,3));
    if(Number(meta?.vote_average)>0)values.push(`TMDB ${Number(meta.vote_average).toFixed(1)}/10`);
    values.forEach(v=>host.appendChild(chip(v)));
    host.hidden=!host.childElementCount;
  }

  function clearPreview(container){container?.querySelector('.matchapp-preview-player')?.remove();}
  function renderPreview(container,meta,{kids=false}={}){
    if(!container)return false;clearPreview(container);
    let node=null;
    if(meta?.preview_kind==='video'&&SAFE_EMBED.test(String(meta.preview_embed_url||''))){
      node=document.createElement('div');node.className='matchapp-preview-player matchapp-preview-video';
      const frame=document.createElement('iframe');frame.src=meta.preview_embed_url;frame.title=`Preview: ${meta.title||'title'}`;frame.loading='lazy';frame.allow='accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-presentation allow-popups');node.appendChild(frame);
    }else if(meta?.preview_kind==='audio'&&SAFE_AUDIO.test(String(meta.preview_url||''))){
      node=document.createElement('div');node.className='matchapp-preview-player matchapp-preview-audio';
      const poster=trustedPoster(meta);if(poster){const img=document.createElement('img');img.src=poster;img.alt='';img.loading='lazy';node.appendChild(img);}
      const audio=document.createElement('audio');audio.controls=true;audio.preload='none';audio.src=meta.preview_url;audio.setAttribute('aria-label',`Audio preview: ${meta.title||'title'}`);node.appendChild(audio);
    }
    if(!node)return false;
    node.dataset.kids=kids?'1':'0';container.prepend(node);return true;
  }

  async function enhanceRegular(){
    const title=(document.getElementById('res-title')?.textContent||'').trim();if(!title||/^title$/i.test(title))return;
    const meta=await metadataFor(title);if(!meta)return;
    renderRichMeta(meta);
    const container=document.getElementById('res-trailer-container');
    renderPreview(container,meta);
    // Do not force the container visible: app.js owns result visibility and its
    // existing YouTube fallback. If it is already visible, the embedded preview
    // simply appears above that fallback.
    const img=document.getElementById('res-poster-img');
    if(img&&(!img.getAttribute('src')||String(img.getAttribute('src')).startsWith('data:image/')))recoverCover(img,title);
  }

  function kidsAgeAllowed(meta){
    if(meta?.kids_approved!==true)return false;
    let age='all';try{age=localStorage.getItem('match_kids_age_band')||'all';}catch(_){}
    const bands=Array.isArray(meta.kids_age_bands)?meta.kids_age_bands:[];
    return age==='all'?bands.includes('all'):bands.includes(age);
  }
  async function enhanceKids(){
    const dialog=document.getElementById('kids-watch-dialog');
    const title=(document.getElementById('kids-watch-name')?.textContent||'').trim();if(!dialog||!title)return;
    let host=document.getElementById('matchapp-kids-preview');
    if(!host){host=document.createElement('section');host.id='matchapp-kids-preview';host.className='matchapp-kids-preview';host.setAttribute('aria-label','Preview');const detail=document.getElementById('kids-match-detail');detail?.insertAdjacentElement('afterend',host);}
    host.replaceChildren();host.hidden=true;
    const meta=await metadataFor(title);
    if(!kidsAgeAllowed(meta))return;
    if(renderPreview(host,meta,{kids:true}))host.hidden=false;
  }

  function installStyles(){
    if(document.getElementById('matchapp-media-enhancement-style'))return;
    const s=document.createElement('style');s.id='matchapp-media-enhancement-style';s.textContent=`
      .matchapp-rich-meta{display:flex;flex-wrap:wrap;gap:7px;margin:-8px 0 18px}.matchapp-rich-meta[hidden]{display:none}
      .matchapp-rich-meta span{background:rgba(255,255,255,.06);border:1px solid rgba(229,193,88,.25);color:#d9d1e8;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:700}
      .matchapp-preview-player{width:min(100%,860px);margin:0 auto 14px;border:1px solid rgba(229,193,88,.32);border-radius:16px;overflow:hidden;background:#08060d;box-shadow:0 12px 35px rgba(0,0,0,.35)}
      .matchapp-preview-video{aspect-ratio:16/9}.matchapp-preview-video iframe{display:block;width:100%;height:100%;border:0}
      .matchapp-preview-audio{display:flex;align-items:center;gap:12px;padding:12px;box-sizing:border-box}.matchapp-preview-audio img{width:72px;height:72px;object-fit:cover;border-radius:10px}.matchapp-preview-audio audio{width:100%;min-width:0}
      .matchapp-kids-preview{margin:12px 0 18px}.matchapp-kids-preview[hidden]{display:none}
      .matchapp-kids-preview .matchapp-preview-player{border-color:rgba(229,193,88,.45)}
      @media(max-width:560px){.matchapp-preview-audio{align-items:stretch;flex-direction:column}.matchapp-preview-audio img{width:64px;height:64px}.matchapp-rich-meta{margin-bottom:14px}}
    `;document.head.appendChild(s);
  }

  function boot(){
    installStyles();
    const resultTitle=document.getElementById('res-title');if(resultTitle){new MutationObserver(()=>enhanceRegular()).observe(resultTitle,{childList:true,characterData:true,subtree:true});enhanceRegular();}
    const resultPoster=document.getElementById('res-poster-img');if(resultPoster)coverObserver.observe(resultPoster,{attributes:true,attributeFilter:['src']});
    const kidsName=document.getElementById('kids-watch-name');if(kidsName){new MutationObserver(()=>enhanceKids()).observe(kidsName,{childList:true,characterData:true,subtree:true});document.getElementById('kids-watch-dialog')?.addEventListener('close',()=>document.getElementById('matchapp-kids-preview')?.replaceChildren());}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
