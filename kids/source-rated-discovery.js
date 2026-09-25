/* Bounded source-rated family discovery, separate from the manually reviewed
 * Kids LIBRARY. Verified source metadata is required before ANY card renders.
 * Never enable a language model to approve age bands or fake watch links. */
(function(){
 'use strict';
 const agePolicy=window.MatchAppKidsAgePolicy;
 const section=document.getElementById('kids-family-expansion');
 if(!section||!agePolicy)return;
 const input=document.getElementById('kids-family-search');
 const kindSel=document.getElementById('kids-family-format');
 const load=document.getElementById('kids-family-more');
 const search=document.getElementById('kids-family-find');
 const status=document.getElementById('kids-family-status');
 const grid=document.getElementById('kids-family-grid');
 const ageSel=document.getElementById('kids-age');
 if(!input||!kindSel||!load||!search||!status||!grid||!ageSel)return;
 const PAGE_BATCH=2,DETAIL_BATCH=3,MAX_CHECKS_PER_CLICK=18,MAX_SHOWN=48;
 let nextPage=1,busy=false,version=0;
 const seen=new Set(),verified=new Map(),detailCache=new Map();
 const locale=()=>String(document.getElementById('kids-lang')?.value||window.MATCH_LANG||'en');
 const pt=()=>locale().startsWith('pt'),es=()=>locale().startsWith('es');
 function say(en,br,esText){return pt()?br:es()?esText:en}
 function setStatus(str){status.textContent=str}
 function reset(){
   version++;nextPage=1;seen.clear();verified.clear();grid.replaceChildren();
   setStatus(say('Select Explore to load source-rated titles.','Selecione Explorar para buscar títulos classificados.','Selecciona Explorar para buscar títulos clasificados.'));
   load.textContent=say('Explore more verified ratings','Explorar mais classificações verificadas','Explorar más clasificaciones verificadas');
 }
 const legalLink=(url)=>{
   try{
     const u=new URL(url);
     return u.protocol==='https:'&&
       (u.hostname==='www.themoviedb.org'||u.hostname==='www.justwatch.com');
   }catch(_){return false}
 };
 function watchGuide(item){
   const region=/^(BR|US)$/.test(String(document.getElementById('kids-watch-region')?.value||''))?
     document.getElementById('kids-watch-region').value:'US';
   const candidate=item.availability?.[region]?.link;
   return legalLink(candidate)?candidate:item.source;
 }
 function card(item){
  if(verified.has(item.identity))return;
  verified.set(item.identity,item);
  if(verified.size>MAX_SHOWN)return;
  const figure=document.createElement('figure');figure.className='kids-source-card';
  figure.dataset.identity=item.identity;
  const wrap=document.createElement('div');wrap.className='kids-source-cover';
  const img=new Image();img.alt=item.title;img.loading='lazy';img.decoding='async';
  img.width=600;img.height=900;img.src=item.poster;
  // Unknown art is never replaced by a wrong-title or text-only poster.
  img.onerror=()=>{img.onerror=null;figure.remove();verified.delete(item.identity);
    setStatus(say('A cover was unavailable; that title was hidden.','Uma capa indisponível foi ocultada.','Una portada no disponible se ocultó.'));};
  wrap.appendChild(img);figure.appendChild(wrap);
  const body=document.createElement('figcaption');body.className='kids-source-body';
  const badge=document.createElement('span');badge.className='kids-source-badge';
  badge.textContent=say('Source-rated','Classificação de fonte','Clasificación de fuente')+' · '+item.rating;
  const heading=document.createElement('h3');heading.textContent=item.title+' ('+item.year+')';
  const synopsis=document.createElement('p');synopsis.className='kids-source-summary';synopsis.textContent=item.overview;
  const genre=document.createElement('p');genre.className='kids-source-genres';genre.textContent=item.genres.join(' · ');
  const caution=document.createElement('p');caution.className='kids-source-caution';
  caution.textContent=say('Not individually reviewed by MatchApp. Ask a grown-up to check this title and each episode. Ratings and availability vary by country.',
  'Ainda não revisado individualmente pelo MatchApp. Peça a um responsável para avaliar o título e cada episódio. Classificações e disponibilidade variam por país.',
  'MatchApp no lo ha revisado individualmente. Pide a un adulto que revise el título y cada episodio. Las clasificaciones y la disponibilidad varían por país.');
  const actions=document.createElement('div');actions.className='kids-source-actions';
  const detail=document.createElement('a');detail.href=item.source;
  detail.target='_blank';detail.rel='noopener noreferrer';
  detail.textContent=say('Check original title details ↗','Verificar título na fonte ↗','Consultar el título original ↗');
  detail.setAttribute('aria-label',detail.textContent+': '+item.title);
  actions.append(detail);
  const guide=watchGuide(item);
  if(guide!==item.source){
    const watch=document.createElement('a');watch.href=guide;
    watch.rel='noopener noreferrer';watch.target='_blank';
    watch.textContent=say('Regional viewing guide ↗','Guia de exibição regional ↗','Guía regional para verlo ↗');
    watch.setAttribute('aria-label',watch.textContent+': '+item.title);
    actions.append(watch);
  }
  body.append(badge,heading,genre,synopsis,caution,actions);figure.append(body);
  grid.append(figure);
 }
 async function safeDetail(candidate,age,token){
   const id=candidate?.tmdbId,kind=candidate?.kind;
   if(!Number.isSafeInteger(id)||!['movie','tv'].includes(kind)||candidate.adult===true)return null;
   const key=kind+':'+id;
   // Cache exact source responses only. Never cache errors or unsafe approvals.
   let detail=detailCache.get(key);
   if(!detail){
    try{detail=await window.tmdbDetails(id,kind);}
    catch(_){return null}
    if(!detail)return null;
    detailCache.set(key,detail);
    if(detailCache.size>180)detailCache.delete(detailCache.keys().next().value);
   }
   if(token!==version)return null;
   return agePolicy.verify(candidate,detail,age);
 }
 async function runFind(exact){
  if(busy)return;
  const token=++version;
  const age=ageSel.value||'all',wanted=kindSel.value||'';
  busy=true;load.disabled=true;search.disabled=true;
  try{
   if(!window.tmdbDetails||!window.tmdbDiscover){
     setStatus(say('The catalog is unavailable at the moment. Existing Kids picks still work.',
       'O catálogo está indisponível. A coleção Kids existente continua funcionando.',
       'El catálogo no está disponible. La colección Kids habitual sigue funcionando.'));
     return;
   }
   let candidates=[];
   if(exact){
     const query=input.value.trim().slice(0,90);
     if(query.length<3){setStatus(say('Type an exact movie or series title first.','Digite o título exato do filme ou série.','Escribe el título exacto primero.'));return;}
     setStatus(say('Checking this title’s original classification…','Verificando a classificação original…','Comprobando la clasificación original…'));
     let hit=null;
     try{hit=await window.tmdbLookup?.(query,{kind:wanted||''});}catch(_){}
     if(hit)candidates=[hit];
   }else{
     setStatus(say('Checking original ratings and artwork before showing titles…',
      'Verificando classificação e capas reais antes de exibir títulos…',
      'Comprobando clasificaciones y portadas reales antes de mostrar títulos…'));
     candidates=await window.tmdbDiscover({
       kind:wanted||'',genre_ids:[10751,16,10762],page_start:nextPage,
       pages:PAGE_BATCH
     });
     nextPage=Math.min(501,nextPage+PAGE_BATCH);
   }
   if(token!==version)return;
   const current=(Array.isArray(candidates)?candidates:[])
     .filter(c=>c&&c.adult!==true&&['movie','tv'].includes(c.kind)&&Number.isSafeInteger(c.tmdbId))
     .filter(c=>!seen.has(c.kind+':'+c.tmdbId))
     .slice(0,exact?1:MAX_CHECKS_PER_CLICK);
   current.forEach(c=>seen.add(c.kind+':'+c.tmdbId));
   const count=verified.size;
   for(let i=0;i<current.length;i+=DETAIL_BATCH){
      if(token!==version||ageSel.value!==age)break;
      const group=await Promise.all(current.slice(i,i+DETAIL_BATCH).map(c=>safeDetail(c,age,token)));
      for(const item of group){
       if(item&&token===version&&ageSel.value===age)card(item);
      }
      if(verified.size>=MAX_SHOWN)break;
   }
   if(token!==version)return;
   const found=verified.size-count;
   if(found){
    setStatus(say(found+' new source-rated title(s) checked for this age group. A grown-up should review each title.',
     found+' novo(s) título(s) classificado(s) para esta faixa etária. Um responsável deve revisar cada título.',
     found+' títulos clasificados nuevos para esta edad. Un adulto debe revisar cada título.'));
   }else{
    setStatus(say('No additional titles passed every age, identity and artwork check. Try more pages or an exact title.',
     'Nenhum novo título passou todas as verificações. Explore mais páginas ou busque um título exato.',
     'Ningún título nuevo superó todas las verificaciones. Explora más páginas o busca un título exacto.'));
   }
   load.hidden=nextPage>499||verified.size>=MAX_SHOWN;
  }catch(_){
   if(token===version)setStatus(say('The source is unavailable. Your approved Kids library is unaffected.',
    'A fonte está indisponível. A coleção Kids aprovada não foi alterada.',
    'La fuente no está disponible. La colección Kids aprobada sigue intacta.'));
  }finally{busy=false;load.disabled=false;search.disabled=false}
 }
 load.addEventListener('click',()=>runFind(false));
 search.addEventListener('click',()=>runFind(true));
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();runFind(true)}});
 ageSel.addEventListener('change',reset);
 kindSel.addEventListener('change',reset);
 document.getElementById('kids-lang')?.addEventListener('change',()=>{
  const heading=document.getElementById('kids-family-heading');
  if(heading)heading.textContent=say('More source-rated family discoveries','Mais descobertas familiares com classificação','Más descubrimientos familiares clasificados');
  search.textContent=say('Verify exact title','Verificar título exato','Verificar título exacto');
  reset();
 });
 reset();
})();