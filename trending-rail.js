/* Top Titles: render the weekly file, auto-swipe left, stay clickable and swipeable. */
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
  const weekLabel={en:'Top titles this week','pt-BR':'Títulos em alta nesta semana',es:'Títulos top de esta semana',fr:'Titres phares de la semaine',de:'Top-Titel dieser Woche',it:'Titoli top di questa settimana',tr:'Bu haftanın öne çıkanları',ru:'Главные названия недели',ar:'أبرز العناوين هذا الأسبوع',hi:'इस हफ्ते के शीर्ष शीर्षक',id:'Judul teratas minggu ini',ja:'今週の注目タイトル',ko:'이번 주 인기 작품',zh:'本周热门标题'};
  const lang=String(document.documentElement.lang||localStorage.getItem('match_lang')||'en');
  const shown=weekLabel[lang]||weekLabel[lang.slice(0,2)]||data.label||weekLabel.en;
  rail.setAttribute('aria-label',shown);
  let label=rail.querySelector('.trending-week-label');
  if(!label){label=document.createElement('p');label.className='trending-week-label';rail.insertBefore(label, rail.firstChild);}
  label.textContent=shown;
  track.replaceChildren();
  data.titles.forEach(item=>track.appendChild(card(item,false)));
  data.titles.forEach(item=>track.appendChild(card(item,true)));
  track.dataset.loopCount=String(data.titles.length);
  start(document.getElementById('marquee-viewport'));
}
function start(vp){
  if(!vp||vp.dataset.weekAuto==='1')return;
  vp.dataset.weekAuto='1';
  vp.style.overflowX='auto';
  vp.style.touchAction='pan-x';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let hold=0,hover=false;
  const step=()=>{
    if(reduced||hover||Date.now()<hold||document.hidden)return;
    const max=vp.scrollWidth/2;
    vp.scrollLeft+=1.1;
    if(max>40&&vp.scrollLeft>=max)vp.scrollLeft-=max;
  };
  const timer=setInterval(()=>{if(document.hidden||document.documentElement.classList.contains('reduce-motion'))return;if(!vp.isConnected){clearInterval(timer);return;}step();},48);
  vp.addEventListener('mouseenter',()=>{hover=true;});
  vp.addEventListener('mouseleave',()=>{hover=false;});
  vp.addEventListener('touchstart',()=>{hold=Date.now()+6000;},{passive:true});
  vp.addEventListener('wheel',()=>{hold=Date.now()+4000;},{passive:true});
  window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
}
function boot(){
  fetch('/data/trending-week.json?v=20261002-week1',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(paint).catch(()=>{});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
