/* Decorative real-art collage: never shown in the child-safe Kids area.
   The wall is a dense, tilted key-art grid that fills the viewport. It needs
   far more tiles than the original sixteen, so every reviewed poster the site
   already ships is pooled: the wall list, the identity list, the verified
   poster map in app.js and the covers already in the trending rail. All of it
   is MatchApp's own reviewed catalogue.

   Tiles are requested at background renditions (w154/w185) rather than the
   w500 the rail uses, so each one costs a fraction of a rail cover.

   Tile count is chosen per breakpoint: just enough to fill the rotated grid on
   that screen and no more, because the wall is pinned to the viewport and so
   every tile it creates is on screen. For the same reason the tiles load
   eagerly at low priority — inside a rotated, clipped container the lazy
   heuristic under-loads and leaves visible holes in the collage. */
(function(){'use strict';
  if(!document.getElementById('ma-wall-fill-20260923')){
    var s=document.createElement('style');
    s.id='ma-wall-fill-20260923';
    s.textContent="html body:not(.kids-body) .poster-wall{position:fixed!important;inset:0!important;width:100%!important;height:100%!important;min-height:100dvh!important;z-index:0!important;pointer-events:none!important;overflow:hidden!important}html body:not(.kids-body) .poster-wall-grid{position:absolute!important;inset:-36% -30%!important;display:grid!important;grid-template-columns:repeat(8,minmax(0,1fr))!important;gap:8px!important;transform:rotate(-11deg) scale(1.24)!important;opacity:.56!important;animation:none!important;will-change:auto!important}html body:not(.kids-body) .poster-wall-tile{position:relative!important;top:auto!important;left:auto!important;right:auto!important;bottom:auto!important;width:auto!important;aspect-ratio:2/3!important;opacity:1!important;transform:none!important;animation:none!important;will-change:auto!important}html body:not(.kids-body) .poster-wall-tile>img{width:100%!important;height:100%!important;object-fit:cover!important}@media(max-width:700px){html body:not(.kids-body) .poster-wall-grid{inset:-30% -42%!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;transform:rotate(-9deg) scale(1.32)!important;opacity:.48!important}}html body .install-btn{min-height:32px!important;height:32px!important;padding:0 12px!important;font-size:12px!important;border-radius:999px!important}@media(min-width:901px){html body .install-wrap{display:none!important}}";
    (document.head||document.documentElement).appendChild(s);
  }
  // Columns per breakpoint must match poster-wall.css.
 function tileTarget(){
  const w=window.innerWidth||1280,h=window.innerHeight||800;
  const cols=w<=700?4:(w<=1099?7:(w>=1800?14:11));
  const tile=(w*1.30/cols)*1.5;            // column width x 3:2 poster
  const rows=Math.ceil((h*1.70)/tile)+1;   // grid overscans for the rotation
  return Math.min(cols*rows,96);
 }
 const SAFE=/^https:\/\/image\.tmdb\.org\/t\/p\/[a-z0-9]+\/[A-Za-z0-9_.-]+$/;
 const FILE=/^https:\/\/image\.tmdb\.org\/t\/p\/[a-z0-9]+\/([A-Za-z0-9_.-]+)$/;
 function kids(){return location.pathname.startsWith('/kids/')||document.body.classList.contains('kids-body');}
 async function load(url){try{const r=await fetch(url,{cache:'force-cache'});return r.ok?await r.json():null;}catch(_){return null;}}
 async function boot(){
  // Home uses the same wall as the rest of the site: real title posters, one
  // node each, with all motion disabled by poster-wall.css.
  if(kids()||document.querySelector('.poster-wall'))return;
  try{
   const [wallList,identities]=await Promise.all([
    load('/data/poster-wall.json'),
    load('/data/poster-identities.json')
   ]);
   const seen=new Set(),files=[];
   const add=value=>{
    if(typeof value!=='string'||!SAFE.test(value))return;
    const match=FILE.exec(value);if(!match)return;
    if(seen.has(match[1]))return;
    seen.add(match[1]);files.push(match[1]);
   };
   (Array.isArray(wallList)?wallList:[]).forEach(entry=>{if(entry)add(entry.poster);});
   (Array.isArray(identities)?identities:[]).forEach(entry=>{if(entry&&entry.adult!==true)add(entry.poster);});
   try{if(typeof VERIFIED_POSTERS==='object'&&VERIFIED_POSTERS)Object.keys(VERIFIED_POSTERS).forEach(k=>add(VERIFIED_POSTERS[k]));}catch(_){}
   document.querySelectorAll('#trending-rail .marquee-item img[src]').forEach(img=>add(img.getAttribute('src')));
   if(!files.length)return;
   // Enough tiles to fill the tilted grid at every breakpoint. With the pooled
   // catalogue this is reached without repeating; the modulo only matters if a
   // source is unavailable.
   const posters=[],target=tileTarget();
   for(let i=0;i<target;i++)posters.push(files[i%files.length]);

   const wall=document.createElement('div');wall.className='poster-wall';wall.setAttribute('aria-hidden','true');wall.inert=true;
   const grid=document.createElement('div');grid.className='poster-wall-grid';
   wall.append(grid);document.body.prepend(wall);

   // Tiles are inserted in small batches across idle callbacks. Creating all of
   // them at once decodes dozens of images in a single task; filling in chunks
   // spreads that cost and keeps startup responsive. Bounded by construction:
   // a finite counter, no observer and no interval.
   const CHUNK=10;
   let cursor=0;
   function fillChunk(){
    const stop=Math.min(cursor+CHUNK,posters.length);
    const batch=document.createDocumentFragment();
    for(let i=cursor;i<stop;i++){
     const tile=document.createElement('div');tile.className='poster-wall-tile';
     const img=document.createElement('img');
     const base='https://image.tmdb.org/t/p/';
     // Background renditions only. The tiles sit at ~100-170px behind a scrim,
     // so w185 is the largest rendition worth fetching even on retina.
     img.src=base+'w154/'+posters[i];
     img.srcset=base+'w154/'+posters[i]+' 154w, '+base+'w185/'+posters[i]+' 185w';
     img.sizes='(max-width:700px) 22vw, (max-width:1099px) 15vw, 12vw';
     img.alt='';img.loading='eager';img.decoding='async';img.fetchPriority='low';
     img.onerror=()=>{tile.hidden=true;};
     tile.append(img);batch.append(tile);
    }
    grid.append(batch);
    cursor=stop;
    if(cursor<posters.length){
     if('requestIdleCallback' in window)requestIdleCallback(fillChunk);
     else setTimeout(fillChunk,32);
    }else document.dispatchEvent(new Event('matchapp:posterwall'));
   }
   fillChunk();
  }catch(_){/* The selected theme remains complete when decorative images cannot load. */}
 }
 function scheduleBoot(){
  const run=()=>boot();
  const queue=()=>setTimeout(()=>{
    if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:1600});
    else setTimeout(run,0);
  },250);
  // Decorative eager poster requests must never extend or compete with the
  // critical page load on a cache-bypassing refresh.
  if(document.readyState==='complete')queue();
  else window.addEventListener('load',queue,{once:true});
 }
 function loadShareGuard(){
  if(document.querySelector('script[data-share-guard]'))return;
  var el=document.createElement('script');
  el.src='/share-guard.js?v=20260923-share2';
  el.defer=true;
  el.setAttribute('data-share-guard','1');
  (document.body||document.documentElement).appendChild(el);
 }
 if(document.readyState==='complete')loadShareGuard();
 else window.addEventListener('load',loadShareGuard,{once:true});
 scheduleBoot();
})();
