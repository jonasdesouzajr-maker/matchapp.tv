/* MatchApp Latest News — compact homepage carousel under the premiere field. */
(function(){
  'use strict';

  const DATA='/news/data.json';
  const FALLBACK_COUNTRY='US';
  const MAX_LOCAL=5;
  const MAX_GLOBAL=5;
  const MAX_TOTAL=10;
  const SEEN_KEY='matchapp.latestNewsSeenVersion';
  const AUTO_FIRST_MS=3500;
  const AUTO_MS=6500;
  const TRUSTED_DOMAINS=['reuters.com','reutersagency.com','cnn.com','hollywoodreporter.com','bbc.com','bbc.co.uk','g1.globo.com'];

  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl=u=>{try{const x=new URL(u,location.origin);return x.protocol==='https:'?x.href:null;}catch(_){return null;}};
  function decodeEntities(value){
    const raw=String(value||'');
    if(!raw.includes('&'))return raw;
    const el=document.createElement('textarea');
    el.innerHTML=raw;
    return el.value.replace(/\s+/g,' ').trim();
  }
  function domainOf(u){try{return new URL(u,location.origin).hostname.toLowerCase().replace(/^www\./,'');}catch(_){return'';}}
  function trustedDomain(d){return TRUSTED_DOMAINS.some(x=>d===x||d.endsWith('.'+x));}
  function trustedItem(item){
    const declared=String(item?.source_domain||'').toLowerCase().replace(/^www\./,'');
    const linked=domainOf(item?.url||'');
    return Boolean(declared&&linked&&trustedDomain(declared)&&trustedDomain(linked));
  }
  function track(event,data={}){try{window.dataLayer=window.dataLayer||[];window.dataLayer.push({event,...data});}catch(_){}}

  function deepLinkState(){
    let requestedNewsId='';
    try{requestedNewsId=new URLSearchParams(location.search).get('news')||'';}catch(_){}
    return {requestedNewsId,shouldOpen:location.hash==='#latest-news'||Boolean(requestedNewsId)};
  }

  async function detectCountry(){
    try{
      const r=await fetch('/cdn-cgi/trace',{cache:'no-store'});
      if(r.ok){const m=(await r.text()).match(/^loc=([A-Z]{2})$/m);if(m)return m[1];}
    }catch(_){}
    try{
      const region=(navigator.language||'').split('-')[1];
      if(/^[A-Z]{2}$/i.test(region||''))return region.toUpperCase();
    }catch(_){}
    return FALLBACK_COUNTRY;
  }

  function fallbackImage(source,title){
    const src=esc(decodeEntities(source||'Trusted source').slice(0,28));
    const text=esc(decodeEntities(title||'Entertainment News').slice(0,36));
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#130734"/><stop offset="1" stop-color="#402562"/></linearGradient></defs><rect width="480" height="270" fill="url(#g)"/><circle cx="240" cy="86" r="38" fill="none" stroke="#E5C158" stroke-width="5"/><path d="M220 86h40M240 66v40" stroke="#E5C158" stroke-width="5" stroke-linecap="round"/><text x="240" y="154" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" font-size="19" fill="#E5C158">${src}</text><text x="240" y="191" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="14" fill="#fff">${text}</text><text x="240" y="229" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" fill="#d9cfee">VERIFIED PUBLISHER</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  }

  function publisherLogo(item){
    try{
      const home=safeUrl(item.source_home)||safeUrl(item.url);
      if(!home)return null;
      const origin=new URL(home).origin;
      return `${origin}/favicon.ico`;
    }catch(_){return null;}
  }

  function formatDate(v){
    try{return new Intl.DateTimeFormat(document.documentElement.lang||'en',{month:'short',day:'numeric'}).format(new Date(v));}
    catch(_){return String(v||'');}
  }

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
    const original=safeUrl(item.url);
    const seo=item.seo||{};
    const title=decodeEntities(item.title);
    const sourceName=decodeEntities(item.source);
    const summary=decodeEntities(item.description)||`${decodeEntities(item.event_type||'Entertainment')} update from ${sourceName}. Tap to read the full verified report.`;
    const article=document.createElement('article');
    article.className='ma-news-card';
    article.dataset.newsId=item.id||'';
    article.dataset.newsScope=scope;
    if(seo.primary_keyword)article.dataset.primaryKeyword=decodeEntities(seo.primary_keyword);

    const a=document.createElement('a');
    a.className='ma-news-card-main';
    a.href=original||'#';
    a.target='_blank';
    a.rel='noopener noreferrer external';
    a.setAttribute('aria-label',`Open ${title} at ${sourceName}`);
    if(!original){a.removeAttribute('href');a.removeAttribute('target');}

    const img=document.createElement('img');
    img.loading='lazy';
    img.decoding='async';
    img.width=240;
    img.height=135;
    img.referrerPolicy='no-referrer';
    img.alt=item.person?`${decodeEntities(item.person)} — ${decodeEntities(item.event_type||'entertainment news')}`:(seo.primary_keyword?`${decodeEntities(seo.primary_keyword)}: ${title}`:`Entertainment news: ${title}`);
    const logo=publisherLogo(item);
    const branded=()=>{img.classList.add('ma-news-source-logo');img.src=fallbackImage(sourceName,title);};
    const useLogo=()=>{
      if(logo&&img.dataset.logoTried!=='1'){
        img.dataset.logoTried='1';
        img.classList.add('ma-news-source-logo');
        img.src=logo;
      }else branded();
    };
    img.addEventListener('error',useLogo);
    const articleImage=newsImage(item);
    if(articleImage)img.src=articleImage;
    else useLogo();

    const body=document.createElement('div');
    body.className='ma-news-card-body';
    const source=document.createElement('div');
    source.className='ma-news-source';
    source.textContent=`${sourceName} · ${formatDate(item.published_at)}`;
    const h3=document.createElement('h3');
    h3.textContent=title;
    const brief=document.createElement('p');
    brief.className='ma-news-summary';
    brief.textContent=summary;
    const tag=document.createElement('span');
    tag.className='ma-news-event';
    tag.textContent=decodeEntities(item.event_type||'Entertainment');
    body.append(source,h3,brief,tag);
    a.append(img,body);
    article.append(a);

    a.addEventListener('click',()=>track('latest_news_click',{
      news_id:item.id||'',news_source:sourceName,news_country:item.country||'GLOBAL',news_scope:scope,news_keyword:decodeEntities(seo.primary_keyword||'')
    }));
    return article;
  }

  function rail(items){
    const wrap=document.createElement('div');
    wrap.className='ma-news-carousel-shell';
    wrap.dataset.autoDirection='left';

    const prev=document.createElement('button');
    prev.className='ma-news-arrow ma-news-arrow-prev';
    prev.type='button';
    prev.textContent='‹';
    prev.setAttribute('aria-label','Previous entertainment news');

    const next=document.createElement('button');
    next.className='ma-news-arrow ma-news-arrow-next';
    next.type='button';
    next.textContent='›';
    next.setAttribute('aria-label','Next entertainment news');

    const trackEl=document.createElement('div');
    trackEl.className='ma-news-track';
    trackEl.setAttribute('role','list');
    trackEl.setAttribute('aria-label','Latest entertainment news');
    items.forEach(({item,scope})=>{const c=card(item,scope);c.setAttribute('role','listitem');trackEl.append(c);});

    let autoTimer=0;
    let paused=false;
    let inView=false;
    const reduced=()=>window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const step=()=>{const first=trackEl.querySelector('.ma-news-card');return first?first.getBoundingClientRect().width+8:168;};
    const maxScroll=()=>Math.max(0,trackEl.scrollWidth-trackEl.clientWidth);
    const updateArrows=()=>{
      const max=maxScroll();
      prev.disabled=trackEl.scrollLeft<=2;
      next.disabled=trackEl.scrollLeft>=max-2;
      prev.setAttribute('aria-disabled',prev.disabled?'true':'false');
      next.setAttribute('aria-disabled',next.disabled?'true':'false');
    };
    const move=dir=>{
      if(!trackEl.children.length)return;
      const target=Math.max(0,Math.min(maxScroll(),trackEl.scrollLeft+dir*step()));
      trackEl.scrollTo({left:target,behavior:reduced()?'auto':'smooth'});
      window.setTimeout(updateArrows,reduced()?0:260);
    };
    const stopAuto=()=>{if(autoTimer){clearTimeout(autoTimer);autoTimer=0;}};
    const scheduleAuto=(delay=AUTO_MS)=>{
      stopAuto();
      if(paused||!inView||document.hidden||reduced()||items.length<2)return;
      autoTimer=window.setTimeout(()=>{
        autoTimer=0;
        if(paused||!inView||document.hidden)return;
        if(trackEl.scrollLeft>=maxScroll()-2)trackEl.scrollTo({left:0,behavior:'smooth'});
        else move(1);
        scheduleAuto(AUTO_MS);
      },delay);
    };
    const pause=()=>{paused=true;stopAuto();};
    const resume=()=>{paused=false;scheduleAuto(AUTO_FIRST_MS);};

    prev.addEventListener('click',()=>{move(-1);scheduleAuto(AUTO_FIRST_MS);});
    next.addEventListener('click',()=>{move(1);scheduleAuto(AUTO_FIRST_MS);});
    trackEl.addEventListener('scroll',updateArrows,{passive:true});
    wrap.addEventListener('keydown',e=>{
      if(e.key==='ArrowLeft'){e.preventDefault();move(-1);}
      if(e.key==='ArrowRight'){e.preventDefault();move(1);}
    });
    wrap.addEventListener('mouseenter',pause);
    wrap.addEventListener('mouseleave',resume);
    wrap.addEventListener('focusin',pause);
    wrap.addEventListener('focusout',e=>{if(!wrap.contains(e.relatedTarget))resume();});
    wrap.addEventListener('touchstart',pause,{passive:true});
    wrap.addEventListener('touchend',()=>{paused=false;scheduleAuto(AUTO_FIRST_MS);},{passive:true});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAuto();else scheduleAuto(AUTO_FIRST_MS);});
    if('IntersectionObserver' in window){
      const io=new IntersectionObserver(entries=>{
        inView=entries.some(entry=>entry.isIntersecting&&entry.intersectionRatio>.15);
        if(inView)scheduleAuto(AUTO_FIRST_MS);else stopAuto();
      },{threshold:[0,.15]});
      io.observe(wrap);
    }else{inView=true;scheduleAuto(AUTO_FIRST_MS);}

    wrap.append(prev,trackEl,next);
    requestAnimationFrame(updateArrows);
    wrap.startAuto=()=>scheduleAuto(AUTO_FIRST_MS);
    wrap.stopAuto=stopAuto;
    wrap.reveal=id=>{
      if(!id)return false;
      const target=[...trackEl.querySelectorAll('.ma-news-card')].find(el=>el.dataset.newsId===id);
      if(!target)return false;
      target.classList.add('ma-news-card-target');
      try{target.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'nearest',inline:'center'});}catch(_){}
      window.setTimeout(()=>target.classList.remove('ma-news-card-target'),3200);
      return true;
    };
    return wrap;
  }

  function installStyle(){
    if(document.getElementById('ma-latest-news-style'))return;
    const s=document.createElement('style');
    s.id='ma-latest-news-style';
    s.textContent=`
      .ma-news.premiere-disclosure{width:100%;max-width:none;margin-top:10px;margin-bottom:14px;box-sizing:border-box}
      .ma-news>summary{display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:default}
      .ma-news-summary-main{display:flex;min-width:0;align-items:baseline;gap:10px;flex-wrap:wrap}
      .ma-news-title{font:inherit;color:inherit}.ma-news-description{font-size:11px;font-weight:500;letter-spacing:0;text-transform:none;color:#bfb4cf;opacity:.95}
      .ma-news-new{display:none;align-items:center;gap:5px;padding:4px 7px;border-radius:999px;background:rgba(229,193,88,.12);border:1px solid rgba(229,193,88,.35);color:#E5C158;font:800 9px/1 Inter,Arial,sans-serif;text-transform:uppercase;letter-spacing:.07em;animation:maNewsPulse 2s ease-in-out infinite}
      .ma-news[data-has-new="true"]:not([open]) .ma-news-new{display:inline-flex}.ma-news-new svg{width:13px;height:13px}.ma-news-new-dot{fill:#ff5d73}
      .ma-news-panel{padding:10px 8px 9px}.ma-news-carousel-shell{position:relative;width:100%;padding:2px 34px 4px;box-sizing:border-box;overflow:hidden}
      .ma-news-track{display:flex;flex-wrap:nowrap;gap:8px;overflow-x:auto;scroll-snap-type:x proximity;scrollbar-width:none;-ms-overflow-style:none;overscroll-behavior-inline:contain;padding:2px 0 5px}.ma-news-track::-webkit-scrollbar{display:none}
      .ma-news-card{flex:0 0 160px;min-width:0;scroll-snap-align:start;border:1px solid rgba(255,255,255,.09);border-radius:10px;background:rgba(255,255,255,.035);overflow:hidden;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}.ma-news-card:hover{transform:translateY(-2px);border-color:rgba(229,193,88,.4)}.ma-news-card-target{border-color:#E5C158;box-shadow:0 0 0 2px rgba(229,193,88,.24),0 0 22px rgba(229,193,88,.2)}
      .ma-news-card-main{display:block;height:100%;color:inherit;text-decoration:none}.ma-news-card img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;background:#130734}.ma-news-card img.ma-news-source-logo{object-fit:contain;padding:20px;background:#fff}
      .ma-news-card-body{padding:7px 7px 8px}.ma-news-source{font:600 9px/1.25 Inter,Arial,sans-serif;color:#a99eb9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ma-news-card h3{margin:4px 0 4px;font:750 12px/1.22 Outfit,Inter,Arial,sans-serif;color:#f8f5ff;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:29px}
      .ma-news-summary{margin:0 0 6px;font:500 9.5px/1.28 Inter,Arial,sans-serif;color:#d6cee1;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:24px}.ma-news-event{display:block;font:750 8px/1.1 Inter,Arial,sans-serif;text-transform:uppercase;letter-spacing:.06em;color:#E5C158;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .ma-news-arrow{position:absolute;top:50%;z-index:3;width:28px;height:42px;transform:translateY(-50%);border:1px solid rgba(229,193,88,.42);border-radius:9px;background:rgba(19,7,52,.92);color:#E5C158;font:700 25px/1 Arial,sans-serif;display:grid;place-items:center;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.3)}.ma-news-arrow:hover,.ma-news-arrow:focus-visible{background:rgba(229,193,88,.13);outline:none;border-color:#E5C158}.ma-news-arrow-prev{left:2px}.ma-news-arrow-next{right:2px}
      .ma-news-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:5px 35px 0;font-size:9px;color:#8f849d}.ma-news-empty,.ma-news-error{padding:10px 36px 12px;color:#cfc5df;font-size:11px}
      @keyframes maNewsPulse{0%,100%{box-shadow:0 0 0 0 rgba(229,193,88,.28)}50%{box-shadow:0 0 0 5px rgba(229,193,88,0)}}
      @media(max-width:900px){.ma-news-card{flex-basis:150px}.ma-news-description{display:none}}@media(max-width:600px){.ma-news-panel{padding-left:3px;padding-right:3px}.ma-news-carousel-shell{padding-left:31px;padding-right:31px}.ma-news-card{flex-basis:132px}.ma-news-card h3{font-size:11px;min-height:27px}.ma-news-summary{font-size:9px}.ma-news-arrow{width:26px;height:38px}.ma-news-meta{margin-left:32px;margin-right:32px}.ma-news-new span{display:none}}@media(prefers-reduced-motion:reduce){.ma-news-card,.ma-news-new{transition:none!important;animation:none!important}.ma-news-track{scroll-behavior:auto!important}}
    `;
    document.head.appendChild(s);
  }

  function chooseItems(items,country,requestedNewsId=''){
    const local=items.filter(i=>i.country===country).slice(0,MAX_LOCAL);
    const used=new Set(local.map(i=>i.id));
    while(local.length<MAX_LOCAL){const extra=items.find(i=>!used.has(i.id)&&i.country!=='GLOBAL');if(!extra)break;local.push(extra);used.add(extra.id);}
    const global=items.filter(i=>!used.has(i.id)&&i.country==='GLOBAL').slice(0,MAX_GLOBAL);
    global.forEach(i=>used.add(i.id));
    while(global.length<MAX_GLOBAL){const extra=items.find(i=>!used.has(i.id));if(!extra)break;global.push(extra);used.add(extra.id);}
    let combined=[...local.map(item=>({item,scope:'local'})),...global.map(item=>({item,scope:'global'}))];
    if(requestedNewsId){const requested=items.find(i=>i.id===requestedNewsId);if(requested){const requestedScope=requested.country===country?'local':requested.country==='GLOBAL'?'global':'linked';combined=[{item:requested,scope:requestedScope},...combined.filter(x=>x.item.id!==requested.id)];}}
    return {local,global,combined:combined.slice(0,MAX_TOTAL)};
  }

  async function boot(){
    if(!['/','/index.html'].includes(location.pathname))return;
    installStyle();
    const main=document.querySelector('main');
    const premiere=document.getElementById('premiere-disclosure');
    if(!main||document.getElementById('latest-news'))return;

    const deep=deepLinkState();
    const section=document.createElement('details');
    section.id='latest-news';section.className='ma-news premiere-disclosure ma-static-news';section.open=true;section.dataset.hasNew='false';
    section.innerHTML=`<summary><span class="ma-news-summary-main"><span class="ma-news-title">Latest News</span><span class="ma-news-description">Verified entertainment headlines · 5 local + 5 global</span></span><span class="ma-news-new" role="status" aria-label="New entertainment news available"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 3h2v18H5V3Zm3 2h10.4l-1.9 4 1.9 4H8V5Z"/><circle class="ma-news-new-dot" cx="19" cy="5" r="3"/></svg><span>New</span></span></summary><div class="ma-news-panel"><div class="ma-news-empty">Loading verified entertainment headlines…</div></div>`;
    const swift=document.getElementById('swifties-spotify');const anchor=swift||premiere;if(anchor)anchor.insertAdjacentElement('afterend',section);else main.prepend(section);

    const panel=section.querySelector('.ma-news-panel');let currentVersion='';let carousel=null;
    function openAndReveal(id=''){if(!section.open)section.open=true;window.setTimeout(()=>{const revealed=carousel&&carousel.reveal?carousel.reveal(id):false;if(!revealed){try{section.scrollIntoView({behavior:'smooth',block:'nearest'});}catch(_){}}if(carousel&&carousel.startAuto)carousel.startAuto();},220);}

    section.addEventListener('toggle',()=>{
      if(section.open){if(currentVersion){try{localStorage.setItem(SEEN_KEY,currentVersion);}catch(_){}section.dataset.hasNew='false';}track('latest_news_open',{news_feed_version:currentVersion});window.setTimeout(()=>{try{section.scrollIntoView({behavior:'smooth',block:'nearest'});}catch(_){}if(carousel&&carousel.startAuto)carousel.startAuto();},180);}
      else if(carousel&&carousel.stopAuto)carousel.stopAuto();
    });
    window.addEventListener('hashchange',()=>{if(location.hash==='#latest-news')openAndReveal(deepLinkState().requestedNewsId);});

    try{
      const [country,res]=await Promise.all([detectCountry(),fetch(DATA,{cache:'no-store'})]);
      if(!res.ok)throw new Error('feed unavailable');
      const payload=await res.json();
      const items=(Array.isArray(payload.items)?payload.items:[]).filter(trustedItem);
      currentVersion=String(payload.feed_version||'');
      let seen='';try{seen=localStorage.getItem(SEEN_KEY)||'';}catch(_){}
      if(currentVersion&&currentVersion!==seen){section.dataset.hasNew='true';track('latest_news_new_available',{news_feed_version:currentVersion});}

      const chosen=chooseItems(items,country,deep.requestedNewsId);panel.replaceChildren();
      if(chosen.combined.length){carousel=rail(chosen.combined);panel.append(carousel);}else{const e=document.createElement('div');e.className='ma-news-empty';e.textContent='Fresh verified headlines are being prepared. Check back shortly.';panel.append(e);}

      const meta=document.createElement('div');meta.className='ma-news-meta';meta.innerHTML=`<span>Updated ${esc(formatDate(payload.generated_at||Date.now()))}</span><span>Tap a story to open its original source</span>`;panel.append(meta);
      if(deep.shouldOpen)openAndReveal(deep.requestedNewsId);else if(section.open&&carousel&&carousel.startAuto)window.setTimeout(()=>carousel.startAuto(),180);
      track('latest_news_ready',{news_country:country,news_local_count:chosen.combined.filter(x=>x.scope==='local').length,news_global_count:chosen.combined.filter(x=>x.scope==='global').length,news_total_count:chosen.combined.length,news_feed_version:currentVersion,news_deep_link:Boolean(deep.requestedNewsId)});
    }catch(_){panel.innerHTML='<div class="ma-news-error">Latest News is temporarily unavailable. The rest of MatchApp is unaffected.</div>';}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();