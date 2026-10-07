/* MatchApp locale-aware live news bridge — overlays country + global headlines onto the existing Latest News rail. */
(function(){
  'use strict';
  const API='https://zkymvqrmbabngsqblyye.supabase.co/functions/v1/regional-news-rss';
  const MAX_LOCAL=5,MAX_GLOBAL=3,MAX_TOTAL=12,MAX_WORLD=2,MAX_SPORTS=2;
  const SEEN_KEY='matchapp.latestNewsSeenVersion.locale';
  const REFRESH_MS=30000;
  let staticCards=null,lastVersion='',timer=0,running=false;

  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl=u=>{try{const x=new URL(u,location.origin);return x.protocol==='https:'?x.href:null;}catch(_){return null;}};
  const domainOf=u=>{try{return new URL(u).hostname.toLowerCase().replace(/^www\./,'');}catch(_){return'';}};
  const trackEvent=(event,data={})=>{try{window.dataLayer=window.dataLayer||[];window.dataLayer.push({event,...data});}catch(_){}};

  function language(){
    let raw='';
    try{raw=String(window.MATCH_LANG||document.documentElement.lang||localStorage.getItem('match_lang')||navigator.language||'en');}catch(_){raw=String(window.MATCH_LANG||document.documentElement.lang||navigator.language||'en');}
    const base=raw.toLowerCase().split('-')[0];
    return ['en','pt','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'].includes(base)?base:'en';
  }

  async function country(){
    try{const r=await fetch('/cdn-cgi/trace',{cache:'no-store'});if(r.ok){const m=(await r.text()).match(/^loc=([A-Z]{2})$/m);if(m)return m[1];}}catch(_){}
    const region=(navigator.language||'').split('-')[1];
    return /^[A-Z]{2}$/i.test(region||'')?region.toUpperCase():'US';
  }

  function trusted(item){
    const provider=String(item?.provider||'');
    if(!['NewsData.io','GDELT Project','Regional RSS'].includes(provider))return false;
    const url=safeUrl(item.url);if(!url)return false;
    const linked=domainOf(url);
    if(provider==='Regional RSS')return linked==='news.google.com'&&Boolean(safeUrl(item.source_home));
    const declared=String(item.source_domain||'').toLowerCase().replace(/^www\./,'');
    return Boolean(linked&&declared&&(linked===declared||linked.endsWith('.'+declared)||declared.endsWith('.'+linked)));
  }

  function fallbackImage(source,title){
    const src=esc(String(source||'Trusted source').slice(0,28));
    const text=esc(String(title||'Latest News').slice(0,36));
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#130734"/><stop offset="1" stop-color="#402562"/></linearGradient></defs><rect width="480" height="270" fill="url(#g)"/><circle cx="240" cy="86" r="38" fill="none" stroke="#E5C158" stroke-width="5"/><path d="M220 86h40M240 66v40" stroke="#E5C158" stroke-width="5" stroke-linecap="round"/><text x="240" y="154" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" font-size="19" fill="#E5C158">${src}</text><text x="240" y="191" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="14" fill="#fff">${text}</text><text x="240" y="229" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" fill="#d9cfee">NEWS SOURCE</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  }

  function dateLabel(v){try{return new Intl.DateTimeFormat(document.documentElement.lang||'en',{month:'short',day:'numeric'}).format(new Date(v));}catch(_){return'';}}

  function newsImage(item){
    const media=item&&typeof item.media==='object'?item.media:{};
    const candidates=[
      item?.image,item?.image_url,item?.imageUrl,item?.thumbnail,item?.thumbnail_url,item?.thumbnailUrl,
      item?.cover,item?.cover_url,item?.coverUrl,item?.poster,item?.poster_url,item?.posterUrl,
      media.image,media.image_url,media.thumbnail,media.thumbnail_url
    ];
    for(const candidate of candidates){const u=safeUrl(candidate);if(u)return u;}
    return null;
  }

  function card(item,scope){
    const url=safeUrl(item.url);const source=String(item.source||item.source_name||item.source_domain||'News source');const title=String(item.title||'').trim();
    const provider=String(item.provider||'Live news');
    const article=document.createElement('article');article.className='ma-news-card';article.dataset.newsId=item.id||'';article.dataset.newsScope=scope;article.dataset.newsProvider=provider;article.dataset.newsCountry=String(item.country||'GLOBAL').toUpperCase();article.dataset.newsLanguage=String(item.language||'').toLowerCase().split('-')[0];if(item?.seo?.primary_keyword)article.dataset.primaryKeyword=String(item.seo.primary_keyword);
    const a=document.createElement('a');a.className='ma-news-card-main';a.href=url||'#';a.target='_blank';a.rel='noopener noreferrer external';a.setAttribute('aria-label',`Open ${title} at ${source}`);
    const img=document.createElement('img');img.loading='lazy';img.decoding='async';img.width=240;img.height=135;img.referrerPolicy='no-referrer';img.alt=`Latest news: ${title}`;
    const logo=(()=>{try{return new URL(safeUrl(item.source_home)||url).origin+'/favicon.ico';}catch(_){return null;}})();let logoTried=false;
    const brand=()=>{img.classList.add('ma-news-source-logo');img.src=fallbackImage(source,title);};
    img.addEventListener('error',()=>{if(logo&&!logoTried){logoTried=true;img.classList.add('ma-news-source-logo');img.src=logo;}else brand();});
    const image=newsImage(item);if(image)img.src=image;else if(logo){logoTried=true;img.classList.add('ma-news-source-logo');img.src=logo;}else brand();
    const body=document.createElement('div');body.className='ma-news-card-body';
    const src=document.createElement('div');src.className='ma-news-source';src.textContent=`${source} · ${dateLabel(item.published_at)}`;
    const h3=document.createElement('h3');h3.textContent=title;
    const p=document.createElement('p');p.className='ma-news-summary';p.textContent=String(item.description||'Open the original publisher for the full report.');
    const tag=document.createElement('span');tag.className='ma-news-event';tag.textContent=item.breaking?'Breaking':String(item.event_type||item.category||'News');
    body.append(src,h3,p,tag);a.append(img,body);article.append(a);
    a.addEventListener('click',()=>trackEvent('latest_news_click',{news_id:item.id||'',news_source:source,news_country:item.country||'GLOBAL',news_language:item.language||'und',news_scope:scope,news_provider:provider,news_breaking:Boolean(item.breaking)}));
    return article;
  }

  function choose(items,cc,lang){
    const compatible=items.filter(i=>String(i.language||lang).toLowerCase().split('-')[0]===lang);
    const local=compatible.filter(i=>String(i.country||'').toUpperCase()===cc).slice(0,MAX_LOCAL);
    const used=new Set(local.map(i=>i.id));
    const global=compatible.filter(i=>!used.has(i.id)&&String(i.country||'').toUpperCase()==='GLOBAL').slice(0,MAX_GLOBAL);
    return [...local.map(item=>({item,scope:'local'})),...global.map(item=>({item,scope:'global'}))].slice(0,MAX_TOTAL);
  }

  function ensureTrack(section){
    let track=section?.querySelector('.ma-news-track');
    if(track)return track;
    const panel=section?.querySelector('.ma-news-panel');
    if(!panel)return null;
    panel.querySelector('.ma-news-empty,.ma-news-error')?.remove();
    const shell=document.createElement('div');shell.className='ma-news-carousel-shell';shell.dataset.liveBootstrap='1';
    const prev=document.createElement('button');prev.className='ma-news-arrow ma-news-arrow-prev';prev.type='button';prev.textContent='‹';prev.setAttribute('aria-label','Previous news');
    const next=document.createElement('button');next.className='ma-news-arrow ma-news-arrow-next';next.type='button';next.textContent='›';next.setAttribute('aria-label','Next news');
    track=document.createElement('div');track.className='ma-news-track';track.setAttribute('role','list');track.setAttribute('aria-label','Latest local and global news');
    const step=()=>Math.max(140,track.querySelector('.ma-news-card')?.getBoundingClientRect().width||160)+8;
    const move=dir=>track.scrollBy({left:dir*step(),behavior:'smooth'});
    prev.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));
    shell.append(prev,track,next);
    const meta=panel.querySelector('.ma-news-meta');
    if(meta)panel.insertBefore(shell,meta);else panel.prepend(shell);
    return track;
  }

  async function refresh(force=false){
    if(running||(!force&&document.hidden))return;running=true;
    try{
      const section=document.getElementById('latest-news');if(!section)return;const track=ensureTrack(section);if(!track)return;
      if(!staticCards||!staticCards.length)staticCards=[...track.children].filter(el=>!el.dataset.newsProvider);
      const cc=await country(),lang=language();const r=await fetch(`${API}?country=${encodeURIComponent(cc)}&language=${encodeURIComponent(lang)}`,{cache:'no-store',headers:{accept:'application/json'}});if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const payload=await r.json();const items=(Array.isArray(payload.items)?payload.items:[]).filter(trusted);if(!items.length)return;
      const chosen=choose(items,cc,lang);const liveCards=chosen.map(({item,scope})=>card(item,scope));
      const requested=new URLSearchParams(location.search).get('news')||'';
      const fallback=staticCards.filter(el=>{
        if(liveCards.some(x=>x.dataset.newsId===el.dataset.newsId))return false;
        const ownLang=String(el.dataset.newsLanguage||'').toLowerCase().split('-')[0];
        if(ownLang&&ownLang!==lang)return false;
        if(el.dataset.newsScope==='local'&&String(el.dataset.newsCountry||'').toUpperCase()!==cc)return false;
        return true;
      });
      const requestedCard=requested?fallback.find(el=>el.dataset.newsId===requested):null;
      // The live regional feed must not evict the separate
      // trusted publisher world and twice-daily verified sports snapshots.
      // Preserve the original source card/link; never copy its photo.
      const reservedWorld=fallback.filter(el=>el.dataset.newsScope==='world').slice(0,MAX_WORLD);
      const reservedSports=fallback.filter(el=>el.dataset.newsScope==='sports').slice(0,MAX_SPORTS);
      const retained=new Set([...reservedWorld,...reservedSports,requestedCard].filter(Boolean));
      const ordered=[];if(requestedCard)ordered.push(requestedCard);
      ordered.push(...liveCards.slice(0,MAX_TOTAL-retained.size));
      for(const el of [...reservedWorld,...reservedSports,...fallback]){
        if(ordered.length>=MAX_TOTAL)break;
        if(!ordered.includes(el))ordered.push(el);
      }
      track.replaceChildren(...ordered.slice(0,MAX_TOTAL));
      lastVersion=String(payload.feed_version||payload.generated_at||'');let seen='';try{seen=localStorage.getItem(SEEN_KEY)||'';}catch(_){}
      if(lastVersion&&lastVersion!==seen&&!section.open)section.dataset.hasNew='true';
      const meta=section.querySelector('.ma-news-meta span');if(meta)meta.textContent=`Updated ${dateLabel(payload.generated_at||Date.now())}`;
      trackEvent('latest_news_live_ready',{news_provider:'regional-rss',news_country:cc,news_language:lang,news_live_count:liveCards.length,news_breaking_count:chosen.filter(x=>x.item.breaking).length,news_feed_version:lastVersion});
    }catch(e){trackEvent('latest_news_live_error',{news_provider:'regional-rss',news_error:String(e?.message||e).slice(0,120)});}
    finally{running=false;}
  }

  function attach(){
    const section=document.getElementById('latest-news');
    const panel=section?.querySelector('.ma-news-panel');
    if(!section||!panel)return false;
    if(section.dataset.newsdataBridge==='1'){refresh(true);return true;}
    section.dataset.newsdataBridge='1';
    section.addEventListener('toggle',()=>{if(section.open&&lastVersion){try{localStorage.setItem(SEEN_KEY,lastVersion);}catch(_){}section.dataset.hasNew='false';}});
    refresh(true);timer=window.setInterval(()=>refresh(false),REFRESH_MS);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh(true);});document.addEventListener('matchapp:langchange',()=>refresh(true));return true;
  }

  if(!attach()){
    const observer=new MutationObserver(()=>{if(attach())observer.disconnect();});observer.observe(document.documentElement,{childList:true,subtree:true});
    window.setTimeout(()=>observer.disconnect(),15000);
  }
})();