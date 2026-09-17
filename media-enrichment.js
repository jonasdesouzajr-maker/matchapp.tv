/* MatchApp media enrichment: non-authoritative metadata/cache layer.
 * Loaded centrally after the existing app code. It never changes matching,
 * entitlements, catalogue membership or Kids approval.
 */
(function(){
  'use strict';
  const cache=new Map(),pending=new Map();
  const posterHosts=/^(image\.tmdb\.org|is[1-5]-ssl\.mzstatic\.com)$/i;
  const isKids=()=>location.pathname.startsWith('/kids/');
  const normalize=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();

  function posterUrl(row){
    for(const raw of [row?.poster_large_url,row?.poster_url,row?.poster_original_url]){
      try{const u=new URL(raw);if(u.protocol==='https:'&&posterHosts.test(u.hostname))return u.href;}catch(_){}
    }
    return '';
  }

  function fallback(title,year){
    const t=String(title||'MatchApp').slice(0,64).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const y=String(year||'').replace(/[^0-9]/g,'').slice(0,4);
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#130734"/><stop offset="1" stop-color="#101010"/></linearGradient></defs><rect width="600" height="900" fill="url(#g)"/><circle cx="300" cy="315" r="86" fill="none" stroke="#E5C158" stroke-width="9"/><path d="M276 264l92 51-92 51z" fill="#E5C158"/><text x="300" y="505" text-anchor="middle" fill="#E5C158" font-family="Arial,sans-serif" font-size="30" font-weight="700">${t}</text>${y?`<text x="300" y="553" text-anchor="middle" fill="#ddd6ec" font-family="Arial,sans-serif" font-size="22">${y}</text>`:''}<text x="300" y="790" text-anchor="middle" fill="#8f8877" font-family="Arial,sans-serif" font-size="20">matchapp.tv</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  }
  window.matchappDynamicCover=fallback;

  async function lookup(title,kind,year){
    if(!title||!window.supabaseClient)return null;
    const key=[normalize(title),kind||'',year||'',isKids()?'kids':'all'].join('::');
    if(cache.has(key))return cache.get(key);
    if(pending.has(key))return pending.get(key);
    const job=(async()=>{
      try{
        let q=window.supabaseClient.from('catalog_media_metadata').select('title,year,media_kind,tmdb_id,poster_url,poster_large_url,poster_original_url,backdrop_url,overview,genres,runtime_minutes,content_rating,vote_average,preview_kind,preview_provider,preview_url,preview_embed_url,availability,kids_approved,kids_age_bands,source_updated_at').eq('normalized_title',normalize(title)).eq('is_catalog_title',true).limit(8);
        if(kind&&['movie','tv','music','podcast','audiobook'].includes(kind))q=q.eq('media_kind',kind);
        const {data,error}=await q;
        if(error||!Array.isArray(data)){cache.set(key,null);return null;}
        let rows=data.filter(r=>!year||!r.year||Math.abs(Number(r.year)-Number(year))<=1);
        if(isKids())rows=rows.filter(r=>r.kids_approved===true);
        const row=rows[0]||null;cache.set(key,row);return row;
      }catch(_){cache.set(key,null);return null;}
      finally{pending.delete(key);}
    })();pending.set(key,job);return job;
  }
  window.matchappMediaLookup=lookup;

  function titleFromImage(img){
    return img.dataset.title||img.closest?.('[data-title]')?.dataset.title||img.getAttribute('alt')?.replace(/\s+(poster|cover|artwork)$/i,'').trim()||'';
  }
  function posterLike(img){
    if(!img||img.dataset.matchappFallbackDone==='1')return false;
    const id=img.id||'',cls=String(img.className||''),alt=img.alt||'';
    return /poster|cover|artwork|res-poster-img/i.test(`${id} ${cls} ${alt}`)&&!/logo|avatar|icon/i.test(`${id} ${cls} ${alt}`);
  }
  async function rescueImage(img){
    if(!posterLike(img))return;
    img.dataset.matchappFallbackDone='1';
    const title=titleFromImage(img)||window.globalMatchTitle||'';
    const year=img.dataset.year||'';
    const kind=img.dataset.mediaKind||'';
    const row=await lookup(title,kind,year);
    const remote=posterUrl(row);
    if(remote&&remote!==img.src){
      img.dataset.matchappFallbackDone='0';
      img.src=remote;img.style.display='';return;
    }
    img.onerror=null;img.src=fallback(title,year||row?.year);img.style.display='';
  }
  document.addEventListener('error',e=>{if(e.target instanceof HTMLImageElement)rescueImage(e.target);},true);

  // If an image is emitted with an empty src, there is no error event. Sweep
  // only poster-like elements and give them the same safe recovery path.
  function sweepImages(root=document){
    root.querySelectorAll?.('img').forEach(img=>{if(posterLike(img)&&(!img.getAttribute('src')||img.naturalWidth===0&&img.complete))rescueImage(img);});
  }

  function safeYoutubeEmbed(url){
    try{const u=new URL(url);return u.protocol==='https:'&&u.hostname==='www.youtube-nocookie.com'&&/^\/embed\/[A-Za-z0-9_-]{6,20}/.test(u.pathname)?u.href:'';}catch(_){return '';}
  }
  function safeAudio(url){
    try{const u=new URL(url);return u.protocol==='https:'&&/(mzstatic\.com|apple\.com)$/i.test(u.hostname)?u.href:'';}catch(_){return '';}
  }
  function previewHost(container){
    let host=container.querySelector?.('.matchapp-enriched-preview');
    if(host)return host;
    host=document.createElement('div');host.className='matchapp-enriched-preview';host.hidden=true;
    host.style.cssText='margin:0 0 24px;max-width:860px;margin-inline:auto';
    container.appendChild(host);return host;
  }
  function clearPreview(host){while(host.firstChild)host.removeChild(host.firstChild);host.hidden=true;}

  async function renderPreview(container,title,hints={}){
    if(!container||!title)return false;
    const host=previewHost(container);clearPreview(host);
    const row=await lookup(title,hints.kind,hints.year);
    if(!row)return false;
    if(isKids()&&row.kids_approved!==true)return false;
    if(row.preview_kind==='video'){
      const src=safeYoutubeEmbed(row.preview_embed_url);if(!src)return false;
      const frame=document.createElement('iframe');frame.src=src;frame.title=`${title} preview`;frame.loading='lazy';frame.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';frame.style.cssText='width:100%;aspect-ratio:16/9;border:0;border-radius:16px;background:#000';
      host.appendChild(frame);host.hidden=false;return true;
    }
    if(row.preview_kind==='audio'){
      const src=safeAudio(row.preview_url);if(!src)return false;
      const audio=document.createElement('audio');audio.controls=true;audio.preload='metadata';audio.src=src;audio.setAttribute('aria-label',`${title} audio preview`);audio.style.width='100%';host.appendChild(audio);host.hidden=false;return true;
    }
    return false;
  }
  window.matchappRenderPreview=renderPreview;

  async function renderMainResult(){
    const target=document.getElementById('res-trailer-container');
    const title=window.globalMatchTitle||document.getElementById('res-title')?.textContent?.trim();
    if(!target||!title)return;
    const poster=document.getElementById('res-poster-img');
    if(poster&&!poster.dataset.title)poster.dataset.title=title;
    await renderPreview(target,title,{});
  }

  async function renderKidsResults(root=document){
    if(!isKids())return;
    const cards=root.querySelectorAll?.('#kids-match-results [data-title], #kids-match-results .kids-result-card, .kids-match-results [data-title]')||[];
    for(const card of cards){
      if(card.dataset.matchappPreviewChecked==='1')continue;
      const title=card.dataset.title||card.querySelector('[data-title]')?.dataset.title||card.querySelector('h3,h2,strong')?.textContent?.trim();
      if(!title)continue;card.dataset.matchappPreviewChecked='1';
      await renderPreview(card,title,{});
    }
  }

  let mainTitle='';
  const observer=new MutationObserver(records=>{
    sweepImages();
    if(!isKids()){
      const title=window.globalMatchTitle||document.getElementById('res-title')?.textContent?.trim()||'';
      if(title&&title!==mainTitle){mainTitle=title;renderMainResult();}
    }else{
      for(const record of records)record.addedNodes?.forEach(node=>{if(node.nodeType===1)renderKidsResults(node);});
      renderKidsResults();
    }
  });
  function boot(){sweepImages();observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});if(isKids())renderKidsResults();else renderMainResult();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
