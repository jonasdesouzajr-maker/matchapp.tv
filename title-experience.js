/* ============================================================
   MatchApp — title/event handoff and verified detail experience
   Scoped to existing result surfaces; no recommendation decisions here.
   ============================================================ */
(function(){
  'use strict';
  const titleUrl=title=>'/discover.html?title='+encodeURIComponent(String(title||'').trim())+'&focus=start';
  const eventUrl=path=>'/discover.html?event='+encodeURIComponent(String(path||'').trim())+'&focus=start';
  const esc=v=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function openTitle(title){
    title=String(title||'').trim();if(!title)return;
    location.href=titleUrl(title);
  }

  function installStyles(){
    if(document.getElementById('matchapp-title-experience-style'))return;
    const s=document.createElement('style');s.id='matchapp-title-experience-style';s.textContent=`
      #res-title.ma-title-link,.discover-card h3.ma-title-link{cursor:pointer;text-decoration:underline;text-decoration-color:rgba(229,193,88,.35);text-underline-offset:5px}
      #res-title.ma-title-link:focus-visible,.discover-card h3.ma-title-link:focus-visible{outline:2px solid #E5C158;outline-offset:4px;border-radius:6px}
      .discover-poster.ma-title-link{cursor:pointer}
      .discover-event-card{display:grid;grid-template-columns:minmax(150px,230px) 1fr;gap:22px;padding:20px;border:1px solid rgba(229,193,88,.32);border-radius:22px;background:rgba(27,13,54,.86);margin:14px 0}
      .discover-event-card img{width:100%;max-width:230px;border-radius:16px;object-fit:cover}
      .discover-event-card h2{margin:0 0 10px;color:#fff}.discover-event-meta{color:#cfc4dc;margin:0 0 10px}.discover-event-copy{color:#eee;line-height:1.65}
      .discover-event-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:14px}.discover-event-actions a,.discover-event-actions button{border:1px solid rgba(229,193,88,.45);background:rgba(229,193,88,.1);color:#f6df91;border-radius:999px;padding:9px 13px;text-decoration:none;font-weight:800;cursor:pointer}
      .discover-event-preview{margin-top:14px;aspect-ratio:16/9;width:100%;border:0;border-radius:14px;background:#000}
      @media(max-width:650px){.discover-event-card{grid-template-columns:1fr}.discover-event-card img{margin:auto}}
    `;document.head.appendChild(s);
  }

  function wireTrending(){
    document.addEventListener('click',ev=>{
      const card=ev.target?.closest?.('#marquee-track .marquee-item');if(!card)return;
      const vp=card.closest('.marquee-viewport');if(vp?.classList.contains('is-dragging'))return;
      const title=card.querySelector('img[data-title]')?.dataset?.title||card.querySelector('img')?.alt||'';
      if(!title)return;
      ev.preventDefault();ev.stopImmediatePropagation();openTitle(title);
    },true);
    document.addEventListener('keydown',ev=>{
      if(ev.key!=='Enter'&&ev.key!==' ')return;
      const card=ev.target?.closest?.('#marquee-track .marquee-item');if(!card)return;
      const title=card.querySelector('img[data-title]')?.dataset?.title||card.querySelector('img')?.alt||'';
      if(!title)return;ev.preventDefault();openTitle(title);
    });
  }

  function wireMainResult(){
    const title=document.getElementById('res-title');if(!title||title.dataset.maTitleLinked==='1')return;
    title.dataset.maTitleLinked='1';title.classList.add('ma-title-link');title.tabIndex=0;title.setAttribute('role','link');
    const go=()=>openTitle(window.globalMatchTitle||title.textContent);
    title.addEventListener('click',go);title.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}});
  }

  async function enhanceDiscoverCard(card){
    if(!card||card.dataset.maTitleEnhanced==='1')return;
    card.dataset.maTitleEnhanced='1';
    const h3=card.querySelector('h3');const title=String(h3?.dataset?.srcText||h3?.textContent||'').trim();if(!title)return;
    if(h3){h3.classList.add('ma-title-link');h3.tabIndex=0;h3.setAttribute('role','link');const go=()=>openTitle(title);h3.addEventListener('click',go);h3.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}});}
    const poster=card.querySelector('.discover-poster');if(poster){poster.classList.add('ma-title-link');poster.tabIndex=0;poster.setAttribute('role','link');poster.addEventListener('click',e=>{if(e.target.closest('a,button'))return;openTitle(title);});poster.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openTitle(title);}});}
    const api=window.MatchAppCatalogMedia;if(!api?.lookup)return;
    let meta=await api.lookup(title).catch(()=>null);
    if(meta&&api.refreshExact)meta=await api.refreshExact(meta).catch(()=>meta);
    // AI can surface a real title that is not yet in MatchApp's pre-ingested
    // catalog. Resolve exact TMDB identity as a fallback so we can still offer
    // the actual title page without ever embedding an unverified clip.
    if(!meta&&typeof window.tmdbLookup==='function'){
      const tmdb=await window.tmdbLookup(title,{}).catch(()=>null);
      if(tmdb&&Number.isSafeInteger(tmdb.tmdbId)&&['movie','tv'].includes(tmdb.kind)){
        meta={title:tmdb.title||title,tmdb_id:tmdb.tmdbId,media_kind:tmdb.kind,year:tmdb.year||null,genres:Array.isArray(tmdb.genres)?tmdb.genres:[],availability:{source_page_url:'https://www.themoviedb.org/'+tmdb.kind+'/'+tmdb.tmdbId}};
      }
    }
    if(!meta||!card.isConnected)return;
    const cats=card.querySelector('.discover-categories');
    if(Array.isArray(meta.genres)&&meta.genres.length){
      const html='<div class="discover-categories" aria-label="Genres">'+meta.genres.slice(0,8).map(g=>'<span class="discover-category">'+esc(g)+'</span>').join('')+'</div>';
      if(cats)cats.outerHTML=html;else card.querySelector('.discover-meta')?.insertAdjacentHTML('afterend',html);
    }
    let host=card.querySelector('.matchapp-card-availability');
    if(!host){host=document.createElement('div');host.className='matchapp-card-availability';host.hidden=true;const actions=card.querySelector('.discover-actions');(actions||card.querySelector('.discover-body'))?.insertAdjacentElement(actions?'beforebegin':'beforeend',host);}
    api.renderAvailability?.(host,meta,{title});
    let preview=card.querySelector('.discover-card-preview');
    if(preview&&!preview.querySelector('iframe,audio,a'))api.renderPreview?.(preview,meta,{title});
  }

  function wireDiscoverCards(){
    document.querySelectorAll('.discover-card').forEach(enhanceDiscoverCard);
  }

  function wireEvents(){
    document.addEventListener('click',ev=>{
      const a=ev.target?.closest?.('.global-event a[href^="/events/"]');if(!a)return;
      const u=new URL(a.getAttribute('href'),location.origin);if(u.origin!==location.origin||!u.pathname.startsWith('/events/'))return;
      ev.preventDefault();location.href=eventUrl(u.pathname);
    },true);
  }

  function saveEvent(data){
    try{
      const key='match_savedEvents',rows=JSON.parse(localStorage.getItem(key)||'[]'),arr=Array.isArray(rows)?rows:[];
      if(!arr.some(x=>x&&x.path===data.path))arr.unshift({title:data.title,path:data.path,image:data.image||'',savedAt:Date.now()});
      localStorage.setItem(key,JSON.stringify(arr.slice(0,100)));
      window.showToast?.('Event saved.');
    }catch(_){}
  }

  function youtubeEmbed(url){
    try{
      const u=new URL(url,location.origin);
      if(!/(^|\.)youtube\.com$/.test(u.hostname)&&u.hostname!=='youtu.be')return '';
      let id=u.hostname==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v');
      if(!/^[A-Za-z0-9_-]{6,32}$/.test(id||''))return '';
      return 'https://www.youtube-nocookie.com/embed/'+id;
    }catch(_){return '';}
  }

  async function renderEventQuery(){
    const raw=new URLSearchParams(location.search).get('event');if(!raw)return;
    let path='';try{const u=new URL(raw,location.origin);if(u.origin===location.origin&&u.pathname.startsWith('/events/'))path=u.pathname;}catch(_){}
    if(!path)return;
    try{
      const res=await fetch(path,{credentials:'same-origin'});if(!res.ok)throw new Error('event');
      const doc=new DOMParser().parseFromString(await res.text(),'text/html');
      const hero=doc.querySelector('.event-detail-hero'),title=doc.querySelector('h1')?.textContent?.trim()||'Event';
      const image=hero?.querySelector('img')?.getAttribute('src')||'';
      const paras=[...(hero?.querySelectorAll('p')||[])].map(p=>p.textContent.trim()).filter(Boolean);
      const meta=paras[0]||'',copy=paras.find(p=>p.length>80)||paras[1]||'';
      const links=[...doc.querySelectorAll('.global-event-links a[href]')].map(a=>({label:a.textContent.trim(),href:a.href})).filter(x=>/^https:\/\//.test(x.href));
      const preview=links.map(x=>youtubeEmbed(x.href)).find(Boolean)||'';
      document.title=title+' — MatchApp AI Concierge';
      document.getElementById('discover-empty')?.style.setProperty('display','none');
      document.getElementById('discover-loading')?.style.setProperty('display','none');
      const log=document.getElementById('chat-log');if(!log)return;
      log.innerHTML='';
      const wrap=document.createElement('section');wrap.className='discover-event-card';wrap.dataset.eventPath=path;
      wrap.innerHTML=(image?'<img src="'+esc(image)+'" alt="'+esc(title)+'" loading="eager">':'')+
        '<div><p style="color:#E5C158;font-weight:900;margin:0 0 8px">EVENT</p><h2>'+esc(title)+'</h2>'+
        (meta?'<p class="discover-event-meta">'+esc(meta)+'</p>':'')+
        (copy?'<p class="discover-event-copy">'+esc(copy)+'</p>':'')+
        (preview?'<iframe class="discover-event-preview" src="'+esc(preview)+'" title="'+esc(title)+' preview" loading="lazy" allow="accelerometer; autoplay; encrypted-media; picture-in-picture; web-share" allowfullscreen></iframe>':'')+
        '<div class="discover-event-actions"></div></div>';
      const actions=wrap.querySelector('.discover-event-actions');
      const page=document.createElement('a');page.href=path;page.textContent='Open event page';actions.appendChild(page);
      links.slice(0,8).forEach(link=>{const a=document.createElement('a');a.href=link.href;a.target='_blank';a.rel='noopener noreferrer';a.textContent=link.label||'Official link';actions.appendChild(a);});
      const save=document.createElement('button');save.type='button';save.textContent='Save event';save.addEventListener('click',()=>saveEvent({title,path,image}));actions.appendChild(save);
      log.appendChild(wrap);
      const input=document.getElementById('discover-new-input');if(input)input.placeholder='Ask a follow-up about '+title+'…';
    }catch(_){
      location.href=path;
    }
  }

  function boot(){
    installStyles();wireTrending();wireEvents();wireMainResult();wireDiscoverCards();setTimeout(wireMainResult,250);setTimeout(wireDiscoverCards,450);setTimeout(()=>{if(!window.__MATCHAPP_EVENT_RENDERED)renderEventQuery();},700);
    const obs=new MutationObserver(()=>{wireMainResult();wireDiscoverCards();});
    obs.observe(document.documentElement,{subtree:true,childList:true});
  }
  window.MatchAppTitleExperience=Object.freeze({openTitle});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();