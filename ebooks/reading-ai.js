/* Adult Ask AI reading source cards. The AI can converse, but retailer,
   edition, narrator, cover and availability claims come only from our
   curated bibliography and live exact-edition verification, never prose.
   No magazine or e-book result ever enters film/TV cards. */
(function(root){
'use strict';
if(String(root.location?.pathname||'').startsWith('/kids/'))return;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
let preparing=null;
async function prepare(){
 try{
  if(!root.MatchAppEbooks?.ready){
   if(!preparing)preparing=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.dataset.readingStateOnly='1';
    script.src='/ebooks/ebook-matcher.js?v=20261011-meta1&reliability=20261018-1&lifetime=20261019-1';
    const timer=setTimeout(()=>reject(Error('Reading history unavailable')),7000);
    script.onload=()=>{clearTimeout(timer);resolve();};script.onerror=()=>{clearTimeout(timer);reject(Error('Reading history unavailable'));};
    document.head.appendChild(script);
   }).finally(()=>{preparing=null;});
   await preparing;
  }
  return await root.MatchAppEbooks?.ready?.()===true;
 }catch(_){return false;}
}
function excludedTitles(){
 const all=[...(Array.isArray(root.MATCHAPP_EBOOK_CATALOG)?root.MATCHAPP_EBOOK_CATALOG:[]),...(root.MatchAppMagazines?.items||[])];
 const fresh=new Set(unexcluded(all).map(item=>item.id));
 return [...new Set(all.filter(item=>!fresh.has(item.id)).flatMap(item=>[item.title,item.originalTitle].filter(Boolean)))];
}
function locale(){
 const l=String(root.MATCH_LANG||root.navigator?.language||'en').toLowerCase();
 return l.startsWith('pt')?'pt':l.startsWith('es')?'es':l.startsWith('ja')?'ja':'en';
}
function market(){
 const country=root.MatchAppCountry||root.MatchAppCatalogMedia;
 if(typeof country?.regionCode==='function')return country.regionCode()||'';
 let saved='';
 try{saved=String(localStorage.getItem('match_user_country')||'').trim().toLowerCase()}catch(_){}
 // Compatibility for older shells; live adult pages use all 249 countries
 // from viewer-country.js. Browser or interface language never sets a store.
 return {br:'BR',brazil:'BR',brasil:'BR',gb:'GB',uk:'GB','united kingdom':'GB',
  ca:'CA',canada:'CA',au:'AU',australia:'AU',jp:'JP',japan:'JP',
  pt:'PT',portugal:'PT',us:'US','united states':'US',usa:'US'}[saved]||'';
}
const AMAZON_MARKETS=new Set(['BR','GB','CA','AU','JP','PT','US']);
function chooseCountry(){
 if(typeof root.MatchAppCountry?.chooseCountryMessage==='function')return root.MatchAppCountry.chooseCountryMessage(root.MATCH_LANG||document.documentElement.lang||root.navigator?.language||'en');
 return {en:'Choose your country in your profile to check local reading and listening editions.',
  pt:'Escolha seu país no perfil para consultar edições de leitura e áudio disponíveis na sua região.',
  es:'Elige tu país en el perfil para consultar las ediciones de lectura y audio de tu región.',
  ja:'地域の書籍・音声版を確認するには、プロフィールで国を選択してください。'}[locale()];
}
function mediaIntentQuestion(q) {
  // Only discard explicit *exclusions* of media at the end of a clause.
  // A negative mention is not a positive format request.
  return String(q||'').replace(/\b(?:do\s+not|don't|dont|avoid)\s+(?:recommend|suggest|include|show|give|offer)\s+(?:(?:me|any)\s+)*(?:e-?books?|books?|audio\s?books?|music|films?|movies?|tv\s+shows?|series|magazines?|podcasts?)(?:\s+(?:or|and)\s+(?:e-?books?|books?|audio\s?books?|music|films?|movies?|tv\s+shows?|series|magazines?|podcasts?))*(?=\s*(?:[.!?]|$))/gi,' ');
}
function intent(question){
 const q=mediaIntentQuestion(question);
 if(/\b(?:magazines?|revistas?)\b/i.test(q)||/雑誌/u.test(q))return'magazine';
 if(/\b(?:audiobooks?|audio\s?books?|audiolivros?|audiolibros?|hörbuch)\b/i.test(q)||/オーディオブック/u.test(q))return'audiobook';
 if(/\b(?:e-?book|books?|novels?|kindle|livros?|libros?|reading|read|leitura|livro|ler)\b/i.test(q))return'ebook';
 return'';
}
function unexcluded(items){
 const excluded=new Set();
 for(const key of ['match_ebook_saved_v1','match_ebook_disliked_v1','match_ebook_seen_v1']){
  try{const ids=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(ids))ids.forEach(id=>excluded.add(id));}catch(_){}
 }
 return items.filter(item=>!excluded.has(item.id));
}
const readingReference=q=>/\b(?:like|similar|semelhantes?|parecid[oa]s?|como|similares?|semblables?|similaires?|wie|ähnlich|simili?|gibi|seperti)\b|похож|مثل|जैस|のよう|に似|같은|비슷|类似|像/iu.test(String(q||''));
function selectMagazine(q,options={}){
 const api=root.MatchAppMagazines,all=api?.items||[];
 const eligible=root.MatchAppContentSafety?.safeEntries?.(all)||all;
 let safe=options.allowKnown?eligible:unexcluded(eligible);
 const text=norm(q),keywords=text.split(' ').filter(w=>w.length>=4);
 const named=eligible.find(m=>text.includes(norm(m.title))&&norm(m.title).length>=4);
 if(named&&!options.allowKnown&&readingReference(q))safe=safe.filter(item=>item.id!==named.id);
 else if(named)return safe.includes(named)?[named]:[];
 const topic=safe.filter(m=>m.genres.some(g=>keywords.includes(norm(g)))||
  (/\b(?:fashion|moda|style)\b/i.test(q)&&m.id==='mag-vogue')||
  (/\b(?:music|musica|música)\b/i.test(q)&&['mag-billboard','mag-rolling-stone'].includes(m.id))||
  (/\b(?:wildlife|animals?|animais|natureza|nature)\b/i.test(q)&&m.genres.includes('nature')));
 const country=market();
 const candidate=(topic.length?topic:safe).slice().sort((a,b)=>Number(b.region===country)-Number(a.region===country));
 return candidate.slice(0,3);
}
function selectBooks(q,options={}){
 const all=Array.isArray(root.MATCHAPP_EBOOK_CATALOG)?root.MATCHAPP_EBOOK_CATALOG:[];
 const eligible=root.MatchAppContentSafety?.safeEntries?.(all)||all;
 let safe=options.allowKnown?eligible:unexcluded(eligible);
 const text=norm(q),words=text.split(' ').filter(w=>w.length>3);
 const named=eligible.find(b=>text.includes(norm(b.title))&&norm(b.title).length>4);
 if(named&&!options.allowKnown&&readingReference(q))safe=safe.filter(item=>item.id!==named.id);
 else if(named)return safe.includes(named)?[named]:[];
 const topic=safe.filter(b=>b.genres?.some(g=>words.includes(norm(g)))||
  b.moods?.some(g=>words.includes(norm(g))));
 return (topic.length?topic:safe).slice(0,3);
}
function external(url,label,opts={}){
 if(!/^https:\/\//.test(String(url||''))||root.MatchAppContentSafety?.unsafeLink?.(url))return'';
 return '<a class="reading-source-link'+(opts.free?' reading-free':'')+
 '" href="'+esc(url)+'" target="_blank" rel="'+(opts.paid?'sponsored ':'')+
 'noopener noreferrer"'+(opts.affiliate?' data-reading-affiliate="amazon-br"':'')+'>'+esc(label)+' ↗</a>';
}
function magCard(m){
 const aff=root.MatchAppEbookAffiliate,region=market(),offers=root.MatchAppMagazines.buyLinks(m,region,AMAZON_MARKETS.has(region)?aff:null);
 const primary=offers.find(x=>x.name.startsWith('Amazon')),tagged=!!(primary&&aff?.isAffiliateLink(primary.url));
 return '<article class="reading-ai-card"><div class="reading-ai-icon"><img src="'+esc(m.icon)+
 '" alt="'+esc(m.title)+' official publisher icon" data-reading-publisher-icon loading="eager" decoding="async" hidden>'+ 
 '<span data-reading-publisher-name aria-hidden="true">'+esc(m.title)+'</span></div>'+
 '<div><span class="reading-ai-label">OFFICIAL MAGAZINE SOURCE</span><h4>'+esc(m.title)+'</h4>'+
 '<p class="reading-ai-description" data-source-lang="en">'+esc(m.summary)+'</p><div class="reading-ai-links">'+
 external(m.issues,'Original covers & issues')+
 external(m.site,'Official articles',{free:true})+
 (primary?external(primary.url,'Amazon — check availability',{paid:tagged,affiliate:tagged}):'')+
 external(m.subscription,'Publisher subscription')+'</div>'+
 '<small>Free articles and paid full issues are different. Availability, price and region vary.</small>'+
 (tagged?'<small>'+esc(aff.disclosure(locale()))+'</small>':'')+'</div></article>';
}
function bookCard(b,format){
 const audio=format==='audiobook';
 const aff=root.MatchAppEbookAffiliate;
 const region=market();
 const first=AMAZON_MARKETS.has(region)?aff?.amazonSearchUrl(b,region)||'':'';
 const tagged=!!aff?.isAffiliateLink(first);
 const q=encodeURIComponent(b.title+' '+b.author);
 const google='https://books.google.com/books?q='+q;
 let links=external(google,'Book details / preview')+
  (b.access.includes('free')?external('https://www.gutenberg.org/ebooks/search/?query='+q,'Check legal free editions',{free:true}):'');
 if(audio){
  const storefront=root.MatchAppAudiobooks?.appleStorefront?.(region)||'';
  if(storefront)links+=external('https://books.apple.com/'+storefront+'/search?term='+q,
    'Apple Books audio search (unverified)');
  const searches=root.MatchAppAudiobooks?.sourceSearches?.(b,region)||[];
  links+=searches.map(source=>external(source.url,source.label+' (unverified)')).join('');
 }else{
  links+=external(first,'Amazon — check edition',{paid:tagged,affiliate:tagged})+
   external('https://www.kobo.com/search?query='+q,'Kobo book search');
 }
 return '<article class="reading-ai-card"><div class="reading-ai-wordmark" aria-hidden="true">📚</div>'+
 '<div><span class="reading-ai-label">CURATED BOOK PROFILE · '+(audio?'AUDIO VERIFICATION REQUIRED':'E-BOOK')+
 '</span><h4>'+esc(b.title)+'</h4><p>by '+esc(b.author)+'</p><p class="reading-ai-description" data-source-lang="en">'+esc(b.summary)+'</p>'+
 '<div class="reading-ai-links">'+links+'</div>'+
 '<small>'+(audio?'An audiobook edition is not confirmed by a store search. Use Match E-books Ai to verify exact title and author.':'Stores and free edition eligibility vary by country.')+'</small>'+
 (tagged&&!audio?'<small>'+esc(aff.disclosure(locale()))+'</small>':'')+'</div></article>';
}
function render(question,host,options={}){
 if(!host)return 0;
 const mode=intent(question);
 if(!mode||root.MatchAppContentSafety?.isPornographicRequest?.(question))return 0;
 const results=mode==='magazine'?selectMagazine(question,options):selectBooks(question,options);
 return paintSources(mode,results,host);
}
function paintSources(mode,results,host){
 if(!results.length)return 0;
 const section=document.createElement('section');
 section.className='reading-ai-sources';
 section.setAttribute('aria-label','Source-checked reading suggestions');
 const heading=mode==='magazine'?'Publisher-verified magazines':mode==='audiobook'?
 'Real books · verify audiobook editions':'Curated e-books · official store searches';
 section.innerHTML='<h3>'+heading+'</h3><p class="reading-ai-note">Original publication and store pages, not generated or unlicensed downloads. Prices, free access and stock must be checked at the source.</p>'+
 (!market()?'<p class="reading-ai-note"><a href="/profile/profile.html" data-reading-choose-country>'+esc(chooseCountry())+'</a></p>':'')+
 results.map(r=>mode==='magazine'?magCard(r):bookCard(r,mode)).join('');
 host.appendChild(section);
 // A publisher may block off-site icons, so keep its real name visible
 // until genuine icon art loads; never leave an empty placeholder.
 section.querySelectorAll('[data-reading-publisher-icon]').forEach(img=>{img.addEventListener('error',()=>{img.src='/assets/brand/matchapp-ai-orbit-fullbleed.svg';img.hidden=false;},{once:true});
   const label=img.nextElementSibling;
   const sync=()=>{
     const loaded=img.complete&&img.naturalWidth>0;
     img.hidden=!loaded;
     if(label)label.hidden=loaded;
   };
   img.addEventListener('load',sync);
   img.addEventListener('error',sync);
   sync();
 });
 return results.length;
}
async function renderFresh(question,host,options={}){
 const mode=intent(question),current=()=>!!host?.isConnected&&(!options.current||options.current());
 if(!mode||root.MatchAppContentSafety?.isPornographicRequest?.(question)||!current()||!await prepare())return 0;
 const claims=[],accepted=[];
 try{
  const candidates=mode==='magazine'?selectMagazine(question):selectBooks(question);
  for(const item of candidates){
   if(!current())return 0;
   const claim=await root.MatchAppEbooks.claimSuggestion(item.id);
   if(claim)claims.push({item,claim});
  }
  if(!current())return 0;
  for(const {item,claim} of claims)if(root.MatchAppEbooks.finishSuggestion(claim))accepted.push(item);
  return paintSources(mode,accepted,host);
 }catch(_){return 0;}
 finally{for(const {claim} of claims)await root.MatchAppEbooks.releaseSuggestion(claim);}
}
root.MatchAppReadingAI=Object.freeze({intent,render,renderFresh,prepare,excludedTitles,selectMagazine,selectBooks});
})(window);
