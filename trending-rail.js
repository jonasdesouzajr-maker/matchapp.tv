/* Top Titles: render weekly data only. app.js is the single owner of autoplay and native two-way swipe. */
(function(){
'use strict';
const HOME=location.pathname==='/'||location.pathname==='/index.html';
if(!HOME)return;
function card(item, copy){
  const el=document.createElement('div');
  el.className='marquee-item';
  el.dataset.loopCopy=copy?'1':'0';
  el.dataset.origin=item.origin||'';
  if(copy)el.setAttribute('aria-hidden','true');
  else{el.setAttribute('role','button');el.tabIndex=0;}
  const title=item.title||'';
  el.addEventListener('click',()=>{if(!copy&&window.selectMarqueeItem)window.selectMarqueeItem(title);});
  const img=document.createElement('img');
  img.alt=title;
  img.dataset.title=title;
  if(item.poster)img.src=item.poster;
  img.loading='lazy';
  img.decoding='async';
  el.appendChild(img);
  const cap=document.createElement('span');
  cap.className='marquee-title';
  cap.textContent=title;
  el.appendChild(cap);
  return el;
}
function paint(data){
  const track=document.getElementById('marquee-track');
  const rail=document.getElementById('trending-rail');
  if(!track||!rail||!data||!Array.isArray(data.titles)||!data.titles.length)return;
  // Music videos have their own verified portrait-card renderer with release
  // date, views and direct YouTube URL. Never render them through the generic
  // film/TV card path or users can see an image-only duplicate.
  const editorialTitles=data.titles.filter(item=>item?.kind!=='music-video');
  if(!editorialTitles.length)return;
  // The owner-curated 26 identities are Home's authority; daily trend data
  // belongs to the discovery guide and must not replace this complete rail.
  const committed=Array.from(track.querySelectorAll('img[data-title]'));
  if(committed.length===52){
    document.dispatchEvent(new CustomEvent('matchapp:trendingpainted',{detail:{count:26}}));
    return;
  }
  const weekLabel={en:'Top titles this week','pt-BR':'Títulos em alta nesta semana',es:'Títulos top de esta semana',fr:'Titres phares de la semaine',de:'Top-Titel dieser Woche',it:'Titoli top di questa settimana',tr:'Bu haftanın öne çıkanları',ru:'Главные названия недели',ar:'أبرز العناوين هذا الأسبوع',hi:'इस हफ्ते के शीर्ष शीर्षक',id:'Judul teratas minggu ini',ja:'今週の注目タイトル',ko:'이번 주 인기 작품',zh:'本周热门标题'};
  const lang=String(document.documentElement.lang||localStorage.getItem('match_lang')||'en');
  const shown=weekLabel[lang]||weekLabel[lang.slice(0,2)]||data.label||weekLabel.en;
  rail.setAttribute('aria-label',shown);
  let label=rail.querySelector('.trending-week-label');
  if(!label){label=document.createElement('p');label.className='trending-week-label';rail.insertBefore(label, rail.firstChild);}
  label.textContent=shown;
  track.replaceChildren();
  editorialTitles.forEach(item=>track.appendChild(card(item,false)));
  editorialTitles.forEach(item=>track.appendChild(card(item,true)));
  track.dataset.loopCount=String(editorialTitles.length);
  // app.js owns scroll state. Resync its invisible loop seam after a weekly repaint.
  requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
  document.dispatchEvent(new CustomEvent('matchapp:trendingpainted',{detail:{count:editorialTitles.length}}));
}
function boot(){
  // The committed rail is already usable; app.js owns all motion so Android never has two scroll writers fighting a finger swipe.
  Promise.all([
    fetch('/data/trending-week.json?v=20261002-week1',{cache:'no-store'}).then(r=>r.ok?r.json():null),
    fetch('/data/poster-identities.json?v=20261002-poster1',{cache:'force-cache'}).then(r=>r.ok?r.json():[]).catch(()=>[])
  ]).then(([data,identities])=>{
    if(!data||!Array.isArray(data.titles))return;
    const byTitle=new Map((Array.isArray(identities)?identities:[]).map(row=>[String(row?.title||'').trim().toLowerCase(),row]));
    const titles=data.titles.filter(item=>item?.kind!=='music-video').map(item=>{
      const exact=byTitle.get(String(item?.title||'').trim().toLowerCase());
      return Object.assign({},item,{poster:item?.poster||exact?.posterLarge||exact?.poster||exact?.posterOriginal||''});
    }).filter(item=>item.poster);
    // Never replace the working verified poster rail with mostly-empty refresh data.
    // Keep the committed rail until the weekly refresh has enough exact artwork.
    if(titles.length<6)return;
    paint(Object.assign({},data,{titles}));
  }).catch(()=>{});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
