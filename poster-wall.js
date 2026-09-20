/* Decorative real-art collage: never shown in the child-safe Kids area. */
(function(){'use strict';
 function kids(){return location.pathname.startsWith('/kids/')||document.body.classList.contains('kids-body');}
 function home(){return location.pathname==='/'||location.pathname==='/index.html';}
 async function boot(){
  // Home uses the same lightweight wall as the rest of the site: eight real
  // title posters, one node each, with all motion disabled by poster-wall.css.
  if(kids()||document.querySelector('.poster-wall'))return;
  try{
   const response=await fetch('/data/poster-wall.json',{cache:'force-cache'});if(!response.ok)return;
   const posters=(await response.json()).filter(p=>/^https:\/\/image\.tmdb\.org\/t\/p\/[a-z0-9]+\/[A-Za-z0-9_.-]+$/.test(p.poster)).slice(0,16);
   if(!posters.length)return;
   const wall=document.createElement('div');wall.className='poster-wall';wall.setAttribute('aria-hidden','true');wall.inert=true;
   const grid=document.createElement('div');grid.className='poster-wall-grid';
   for(let i=0;i<posters.length;i++){
    const tile=document.createElement('div');tile.className='poster-wall-tile';
    const img=document.createElement('img');img.src=posters[i].poster;img.alt='';img.loading='lazy';img.decoding='async';img.fetchPriority='low';img.onerror=()=>tile.hidden=true;
    const badge=document.createElement('span');badge.className='poster-wall-brand';const logo=document.createElement('img');logo.src='/assets/brand/brandkit/app-icon.svg?v=20260919-brand1';logo.alt='';logo.width=22;logo.height=22;badge.append(logo,document.createTextNode('matchapp.tv'));
    tile.append(img,badge);grid.append(tile);
   }
   wall.append(grid);document.body.prepend(wall);document.dispatchEvent(new Event('matchapp:posterwall'));
  }catch(_){/* The selected theme remains complete when decorative images cannot load. */}
 }
 function scheduleBoot(){
  const run=()=>boot();
  setTimeout(()=>{
    if('requestIdleCallback' in window)requestIdleCallback(run);
    else run();
  },900);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scheduleBoot,{once:true});else scheduleBoot();
})();
