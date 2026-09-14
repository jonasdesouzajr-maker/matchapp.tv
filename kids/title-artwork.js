(function(){
 'use strict';
 const allowedHost=url=>/^https:\/\/(image\.tmdb\.org|static\.tvmaze\.com|is[1-5]-ssl\.mzstatic\.com)\//.test(url);
 let age='all';try{age=localStorage.getItem('match_kids_age_band')||'all';}catch(_){}
 document.querySelectorAll('[data-ages]').forEach(el=>{if(age!=='all'&&!el.dataset.ages.split(',').includes(age)){el.hidden=true;const p=document.createElement('p');p.textContent='This title is outside your selected age band. Explore age-appropriate picks in Kids Mode.';el.after(p);}});
 fetch('/kids/artwork.json?v=5').then(r=>r.ok?r.json():null).then(data=>{
  document.querySelectorAll('[data-kids-title] img,[data-kids-art]').forEach(img=>{
   const container=img.closest('[data-kids-title]'),id=img.dataset.kidsArt || container?.dataset.kidsTitle,entry=data?.titles?.[id];
   if(!entry || !allowedHost(entry.poster) || (container&&(entry.title!==container.dataset.title||String(entry.year)!==container.dataset.year||entry.type!==container.dataset.type)))return;
   const fallback=img.getAttribute('src');img.onerror=()=>{img.onerror=null;img.src=fallback;};img.src=entry.poster;
  });
 }).catch(()=>{});
})();
