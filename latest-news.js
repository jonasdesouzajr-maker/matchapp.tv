/* MatchApp Latest News — isolated homepage module. */
(function(){
  'use strict';
  const DATA='/news/data.json';
  const FALLBACK_COUNTRY='US';
  const MAX=5;
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl=u=>{try{const x=new URL(u,location.origin);return x.protocol==='https:'?x.href:null;}catch(_){return null;}};
  const countryName=code=>{try{return new Intl.DisplayNames([document.documentElement.lang||'en'],{type:'region'}).of(code)||code;}catch(_){return code;}};
  function track(event,data={}){try{window.dataLayer=window.dataLayer||[];window.dataLayer.push({event,...data});}catch(_){}}
  async function detectCountry(){
    try{const r=await fetch('/cdn-cgi/trace',{cache:'no-store'});if(r.ok){const m=(await r.text()).match(/^loc=([A-Z]{2})$/m);if(m)return m[1];}}catch(_){}
    try{const region=(navigator.language||'').split('-')[1];if(/^[A-Z]{2}$/i.test(region||''))return region.toUpperCase();}catch(_){}
    return FALLBACK_COUNTRY;
  }
  function fallbackImage(title){
    const text=esc(String(title||'News').slice(0,42));
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="720" height="405"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#130734"/><stop offset="1" stop-color="#402562"/></linearGradient></defs><rect width="720" height="405" fill="url(#g)"/><circle cx="360" cy="135" r="54" fill="none" stroke="#E5C158" stroke-width="8"/><path d="M342 106l66 29-66 29z" fill="#E5C158"/><text x="360" y="250" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="30" fill="#fff">${text}</text><text x="360" y="338" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="20" fill="#E5C158">MATCHAPP.TV NEWS</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  }
  function formatDate(v){try{return new Intl.DateTimeFormat(document.documentElement.lang||'en',{dateStyle:'medium'}).format(new Date(v));}catch(_){return String(v||'');}}
  function card(item){
    const original=safeUrl(item.url), summary=safeUrl(item.matchapp_url);
    const article=document.createElement('article');article.className='ma-news-card';article.dataset.newsId=item.id||'';
    const a=document.createElement('a');a.className='ma-news-card-main';a.href=original||'#';a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label',`Open ${item.title} at ${item.source}`);
    if(!original){a.removeAttribute('href');a.removeAttribute('target');}
    const img=document.createElement('img');img.loading='lazy';img.decoding='async';img.width=480;img.height=270;img.alt=item.person?`${item.person} — ${item.event_type||'entertainment news'}`:`Entertainment news: ${item.title}`;img.src=safeUrl(item.image)||fallbackImage(item.title);img.addEventListener('error',()=>{if(!img.src.startsWith('data:'))img.src=fallbackImage(item.title);},{once:true});
    const body=document.createElement('div');body.className='ma-news-card-body';
    const source=document.createElement('div');source.className='ma-news-source';source.textContent=`${item.source} · ${formatDate(item.published_at)}`;
    const h3=document.createElement('h3');h3.textContent=item.title;
    const p=document.createElement('p');p.textContent=item.description||`Verified entertainment coverage from ${item.source}.`;
    const tag=document.createElement('span');tag.className='ma-news-event';tag.textContent=item.event_type||'Entertainment';
    body.append(source,h3,p,tag);a.append(img,body);article.append(a);
    if(summary){const s=document.createElement('a');s.className='ma-news-summary';s.href=summary;s.textContent='MatchApp summary';s.addEventListener('click',e=>e.stopPropagation());article.append(s);}
    a.addEventListener('click',()=>track('latest_news_click',{news_id:item.id||'',news_source:item.source||'',news_country:item.country||'GLOBAL'}));
    return article;
  }
  function rail(title,items,id){
    const wrap=document.createElement('section');wrap.className='ma-news-rail';wrap.setAttribute('aria-labelledby',`${id}-title`);
    const head=document.createElement('div');head.className='ma-news-rail-head';
    const h=document.createElement('h3');h.id=`${id}-title`;h.textContent=title;
    const nav=document.createElement('div');nav.className='ma-news-nav';
    const prev=document.createElement('button');prev.type='button';prev.textContent='‹';prev.setAttribute('aria-label',`Previous ${title}`);
    const next=document.createElement('button');next.type='button';next.textContent='›';next.setAttribute('aria-label',`Next ${title}`);
    nav.append(prev,next);head.append(h,nav);
    const track=document.createElement('div');track.className='ma-news-track';track.setAttribute('role','list');items.forEach(i=>{const c=card(i);c.setAttribute('role','listitem');track.append(c);});
    const move=dir=>track.scrollBy({left:dir*Math.max(280,track.clientWidth*.82),behavior:'smooth'});prev.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));
    wrap.append(head,track);return wrap;
  }
  function installStyle(){if(document.getElementById('ma-latest-news-style'))return;const s=document.createElement('style');s.id='ma-latest-news-style';s.textContent=`
    .ma-news{width:min(100%,1280px);margin:22px auto;padding:0 16px;color:#f6efff}.ma-news-shell{border:1px solid rgba(229,193,88,.24);border-radius:22px;background:linear-gradient(145deg,rgba(19,7,52,.94),rgba(30,20,45,.94));box-shadow:0 16px 50px rgba(0,0,0,.22);overflow:hidden}.ma-news-toggle{width:100%;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:18px 20px;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer}.ma-news-kicker{display:block;color:#E5C158;font:800 11px/1.2 Inter,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;margin-bottom:4px}.ma-news-toggle h2{margin:0;font:800 clamp(22px,3vw,32px)/1.1 Outfit,Inter,sans-serif}.ma-news-toggle p{margin:6px 0 0;color:#cfc5df;font-size:14px}.ma-news-chevron{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;border:1px solid rgba(229,193,88,.35);color:#E5C158;font-size:20px;transition:transform .28s ease}.ma-news[data-open="true"] .ma-news-chevron{transform:rotate(180deg)}.ma-news-panel{display:grid;grid-template-rows:0fr;opacity:0;transition:grid-template-rows .34s ease,opacity .28s ease}.ma-news[data-open="true"] .ma-news-panel{grid-template-rows:1fr;opacity:1}.ma-news-panel-inner{min-height:0;overflow:hidden}.ma-news-content{padding:0 18px 20px}.ma-news-rail+.ma-news-rail{margin-top:22px}.ma-news-rail-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 2px 9px}.ma-news-rail-head h3{margin:0;font:800 16px/1.2 Outfit,Inter,sans-serif}.ma-news-nav{display:flex;gap:6px}.ma-news-nav button{width:34px;height:34px;border-radius:50%;border:1px solid rgba(229,193,88,.32);background:rgba(255,255,255,.04);color:#fff;font-size:22px;cursor:pointer}.ma-news-track{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(250px,32%);gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:thin;padding:3px 2px 10px;overscroll-behavior-inline:contain}.ma-news-card{scroll-snap-align:start;position:relative;border:1px solid rgba(255,255,255,.09);border-radius:16px;background:rgba(255,255,255,.045);overflow:hidden;transition:transform .2s ease,border-color .2s ease}.ma-news-card:hover{transform:translateY(-3px);border-color:rgba(229,193,88,.38)}.ma-news-card-main{display:block;color:inherit;text-decoration:none}.ma-news-card img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;background:#130734}.ma-news-card-body{padding:12px}.ma-news-source{font-size:11px;color:#b8adc8}.ma-news-card h3{font:800 16px/1.24 Outfit,Inter,sans-serif;margin:7px 0}.ma-news-card p{font-size:13px;line-height:1.45;color:#d8cee6;margin:0 0 9px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.ma-news-event{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#E5C158}.ma-news-summary{display:inline-block;margin:0 12px 12px;color:#E5C158;font-size:12px}.ma-news-ad{margin:20px 0 4px;text-align:center}.ma-news-ad-label{display:block;font-size:9px;color:#8f879c;margin-bottom:4px}.ma-news-empty{padding:18px;color:#cfc5df}.ma-news-updated{margin:14px 2px 0;font-size:11px;color:#968ca6}.ma-news-error{padding:0 18px 18px;color:#cfc5df;font-size:13px}
    @media(max-width:900px){.ma-news-track{grid-auto-columns:minmax(260px,62%)}}@media(max-width:600px){.ma-news{padding:0 10px}.ma-news-toggle{padding:16px}.ma-news-content{padding:0 12px 16px}.ma-news-track{grid-auto-columns:86%}.ma-news-nav{display:none}}@media(prefers-reduced-motion:reduce){.ma-news-panel,.ma-news-chevron,.ma-news-card{transition:none!important}.ma-news-track{scroll-behavior:auto!important}}
  `;document.head.appendChild(s);}
  function initAd(root){const slot=root.querySelector('.ma-news-ad ins');if(!slot||slot.dataset.maAdInit==='1')return;slot.dataset.maAdInit='1';try{(window.adsbygoogle=window.adsbygoogle||[]).push({});}catch(_){}}
  async function boot(){
    if(!['/','/index.html'].includes(location.pathname))return;
    installStyle();const main=document.querySelector('main');if(!main||document.getElementById('latest-news'))return;
    const section=document.createElement('section');section.id='latest-news';section.className='ma-news';section.dataset.open='false';section.innerHTML=`<div class="ma-news-shell"><button class="ma-news-toggle" type="button" aria-expanded="false" aria-controls="latest-news-panel"><span><span class="ma-news-kicker">Entertainment pulse</span><h2>Latest News</h2><p>Stay updated with the latest news about your favorite actors and singers.</p></span><span class="ma-news-chevron" aria-hidden="true">⌄</span></button><div id="latest-news-panel" class="ma-news-panel" aria-hidden="true"><div class="ma-news-panel-inner"><div class="ma-news-content"><div class="ma-news-empty">Loading verified entertainment headlines…</div></div></div></div></div>`;
    const footer=main.querySelector('footer');if(footer)main.insertBefore(section,footer);else main.append(section);
    const toggle=section.querySelector('.ma-news-toggle'),panel=section.querySelector('#latest-news-panel'),content=section.querySelector('.ma-news-content');
    toggle.addEventListener('click',()=>{const open=section.dataset.open!=='true';section.dataset.open=String(open);toggle.setAttribute('aria-expanded',String(open));panel.setAttribute('aria-hidden',String(!open));if(open){track('latest_news_open');initAd(section);}});
    try{
      const [country,res]=await Promise.all([detectCountry(),fetch(DATA,{cache:'no-store'})]);if(!res.ok)throw new Error('feed unavailable');const payload=await res.json();const items=Array.isArray(payload.items)?payload.items:[];
      const local=items.filter(i=>i.country===country).slice(0,MAX);const used=new Set(local.map(i=>i.id));const global=items.filter(i=>i.country==='GLOBAL'||!used.has(i.id)).filter(i=>!used.has(i.id)).slice(0,MAX);
      while(local.length<MAX){const extra=items.find(i=>!used.has(i.id)&&!local.includes(i));if(!extra)break;local.push(extra);used.add(extra.id);}
      content.replaceChildren();if(local.length)content.append(rail(`Around ${countryName(country)}`,local,'ma-news-local'));if(global.length)content.append(rail('Global entertainment',global,'ma-news-global'));
      if(!items.length){const e=document.createElement('div');e.className='ma-news-empty';e.textContent='Fresh headlines are being prepared. Check back shortly.';content.append(e);}
      const ad=document.createElement('div');ad.className='ma-news-ad';ad.innerHTML='<span class="ma-news-ad-label">SPONSORED</span><ins class="adsbygoogle" style="display:block;min-height:90px" data-ad-client="ca-pub-9541435081010948" data-ad-slot="2595698117" data-ad-format="auto" data-full-width-responsive="true"></ins>';content.append(ad);
      const u=document.createElement('div');u.className='ma-news-updated';u.textContent=`Updated ${formatDate(payload.generated_at||Date.now())} · Sources link directly to original reporting.`;content.append(u);
      track('latest_news_ready',{news_country:country,news_local_count:local.length,news_global_count:global.length});
    }catch(_){content.innerHTML='<div class="ma-news-error">Latest News is temporarily unavailable. The rest of MatchApp is unaffected.</div>';}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();