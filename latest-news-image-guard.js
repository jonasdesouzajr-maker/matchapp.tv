/* Latest News image guard — visual reliability only. Every news card always has a visible cover surface. */
(function(){
'use strict';
const STYLE_ID='matchapp-news-image-guard-style';
const GUARD='newsImageGuard';

const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function fallback(source,title){
  const src=esc(String(source||'Latest News').replace(/\s+/g,' ').trim().slice(0,30));
  const text=esc(String(title||'Latest News').replace(/\s+/g,' ').trim().slice(0,42));
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270" viewBox="0 0 480 270"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#1a0d31"/><stop offset=".55" stop-color="#3a2153"/><stop offset="1" stop-color="#5c356f"/></linearGradient><radialGradient id="r" cx="22%" cy="15%" r="80%"><stop stop-color="#e5c158" stop-opacity=".18"/><stop offset="1" stop-color="#e5c158" stop-opacity="0"/></radialGradient></defs><rect width="480" height="270" rx="18" fill="url(#g)"/><rect width="480" height="270" rx="18" fill="url(#r)"/><circle cx="61" cy="59" r="27" fill="#130a24" stroke="#e5c158" stroke-width="3"/><path d="M53 46l22 13-22 13z" fill="#e5c158"/><circle cx="82" cy="39" r="5" fill="#fff4b6"/><text x="104" y="54" font-family="Arial,sans-serif" font-weight="800" font-size="17" fill="#f2d77e">${src}</text><text x="28" y="139" font-family="Arial,sans-serif" font-weight="800" font-size="18" fill="#fff" textLength="424" lengthAdjust="spacingAndGlyphs">${text}</text><text x="28" y="224" font-family="Arial,sans-serif" font-weight="700" font-size="12" letter-spacing="1.5" fill="#d8cce5">LATEST NEWS</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
function ensureStyle(){
  if(document.getElementById(STYLE_ID))return;
  const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
    .ma-news-card img{background-color:#1a0d31;background-position:center;background-size:cover;background-repeat:no-repeat}
    .ma-news-card img.ma-news-source-logo{background-color:#1a0d31!important;background-size:cover!important;background-position:center!important;padding:18px!important;object-fit:contain!important}
  `;document.head.appendChild(s);
}
function labels(img){
  const card=img.closest('.ma-news-card');
  const source=card?.querySelector('.ma-news-source')?.textContent?.split('·')[0]?.trim()||'Latest News';
  const title=card?.querySelector('h3')?.textContent?.trim()||img.alt||'Latest News';
  return {source,title};
}
function protect(img){
  if(!(img instanceof HTMLImageElement)||img.dataset[GUARD]==='1')return;
  img.dataset[GUARD]='1';
  const {source,title}=labels(img);const safe=fallback(source,title);
  img.style.backgroundImage=`url("${safe}")`;
  const forceFallback=()=>{
    if(img.src===safe)return;
    img.classList.remove('ma-news-source-logo');
    img.style.padding='0';
    img.src=safe;
  };
  img.addEventListener('error',()=>{
    const failed=img.currentSrc||img.src;
    setTimeout(()=>{
      const now=img.currentSrc||img.src;
      if(!now||now===failed||(!img.complete||img.naturalWidth===0))forceFallback();
    },80);
  });
  img.addEventListener('load',()=>{
    if(img.naturalWidth===0||img.naturalHeight===0)forceFallback();
  });
  if(!img.getAttribute('src'))forceFallback();
  else if(img.complete&&img.naturalWidth===0)forceFallback();
}
function scan(root=document){root.querySelectorAll?.('.ma-news-card img').forEach(protect);}
function boot(){
  ensureStyle();scan();
  document.addEventListener('matchapp:news-rendered',e=>scan(e.detail?.section||document));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
