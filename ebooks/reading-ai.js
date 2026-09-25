/* Adult Ask AI reading source cards. The AI can converse, but retailer,
   edition, narrator, cover and availability claims come only from our
   curated bibliography and live exact-edition verification, never prose.
   No magazine or e-book result ever enters film/TV cards. */
(function(root){
'use strict';
if(String(root.location?.pathname||'').startsWith('/kids/'))return;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function locale(){
 const l=String(root.MATCH_LANG||root.navigator?.language||'en').toLowerCase();
 return l.startsWith('pt')?'pt':l.startsWith('es')?'es':l.startsWith('ja')?'ja':'en';
}
function market(){
 let saved='';
 try{saved=String(localStorage.getItem('match_user_country')||'').trim().toLowerCase()}catch(_){}
 const l=String(root.navigator?.language||'').toLowerCase();
 if(['brazil','brasil','br'].includes(saved)||l.endsWith('-br'))return'BR';
 if(['australia','au'].includes(saved)||l.endsWith('-au'))return'AU';
 if(['japan','jp'].includes(saved)||l.endsWith('-jp'))return'JP';
 if(['uk','gb','united kingdom'].includes(saved)||l.endsWith('-gb'))return'GB';
 if(['ca','canada'].includes(saved)||l.endsWith('-ca'))return'CA';
 if(['pt','portugal'].includes(saved)||l.endsWith('-pt'))return'PT';
 return'US';
}
function intent(question){
 const q=String(question||'');
 if(/\b(?:magazine|magazines|revista|revistas|magazines?|雑誌)\b/i.test(q))return'magazine';
 if(/\b(?:audiobook|audio\s?book|audiolivro|audiolivros|audiolibro|audiolibros|hörbuch|オーディオブック)\b/i.test(q))return'audiobook';
 if(/\b(?:e-?book|books?|novels?|kindle|livros?|libros?|reading|read|leitura|livro|ler)\b/i.test(q))return'ebook';
 return'';
}
function selectMagazine(q){
 const api=root.MatchAppMagazines,all=api?.items||[];
 const safe=root.MatchAppContentSafety?.safeEntries?.(all)||all;
 const text=norm(q),keywords=text.split(' ').filter(w=>w.length>=4);
 const named=safe.find(m=>text.includes(norm(m.title))&&norm(m.title).length>=4);
 if(named)return [named];
 const topic=safe.filter(m=>m.genres.some(g=>keywords.includes(norm(g)))||
  (/\b(?:fashion|moda|style)\b/i.test(q)&&m.id==='mag-vogue')||
  (/\b(?:music|musica|música)\b/i.test(q)&&['mag-billboard','mag-rolling-stone'].includes(m.id))||
  (/\b(?:wildlife|animals?|animais|natureza|nature)\b/i.test(q)&&m.genres.includes('nature')));
 const country=market();
 const candidate=(topic.length?topic:safe).sort((a,b)=>Number(b.region===country)-Number(a.region===country));
 return candidate.slice(0,3);
}
function selectBooks(q){
 const all=Array.isArray(root.MATCHAPP_EBOOK_CATALOG)?root.MATCHAPP_EBOOK_CATALOG:[];
 const safe=root.MatchAppContentSafety?.safeEntries?.(all)||all;
 const text=norm(q),words=text.split(' ').filter(w=>w.length>3);
 const named=safe.find(b=>text.includes(norm(b.title))&&norm(b.title).length>4);
 if(named)return[named];
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
 const aff=root.MatchAppEbookAffiliate,offers=root.MatchAppMagazines.buyLinks(m,market(),aff);
 const primary=offers[0],tagged=!!aff?.isAffiliateLink(primary.url);
 return '<article class="reading-ai-card"><div class="reading-ai-icon"><img src="'+esc(m.icon)+
 '" alt="'+esc(m.title)+' official publisher icon" loading="lazy" decoding="async" onerror="this.hidden=true"></div>'+
 '<div><span class="reading-ai-label">OFFICIAL MAGAZINE SOURCE</span><h4>'+esc(m.title)+'</h4>'+
 '<p>'+esc(m.summary)+'</p><div class="reading-ai-links">'+
 external(m.issues,'Original covers & issues')+
 external(m.site,'Official articles',{free:true})+
 external(primary.url,'Amazon — check availability',{paid:tagged,affiliate:tagged})+
 external(m.subscription,'Publisher subscription')+'</div>'+
 '<small>Free articles and paid full issues are different. Availability, price and region vary.</small>'+
 (tagged?'<small>'+esc(aff.disclosure(locale()))+'</small>':'')+'</div></article>';
}
function bookCard(b,format){
 const audio=format==='audiobook';
 const aff=root.MatchAppEbookAffiliate;
 const region=market();
 const first=aff?.amazonSearchUrl(b,region)||'';
 const tagged=!!aff?.isAffiliateLink(first);
 const q=encodeURIComponent(b.title+' '+b.author);
 const google='https://books.google.com/books?q='+q;
 let links=external(google,'Book details / preview')+
  (b.access.includes('free')?external('https://www.gutenberg.org/ebooks/search/?query='+q,'Check legal free editions',{free:true}):'');
 if(audio){
  links+=external('https://books.apple.com/'+region.toLowerCase()+'/search?term='+q,
    'Apple Books audio search (unverified)');
  links+=external(region==='BR'?'https://www.audible.com.br/search?keywords='+q:'https://www.audible.com/search?keywords='+q,
    'Audible audio search (unverified)');
 }else{
  links+=external(first,'Amazon — check edition',{paid:tagged,affiliate:tagged})+
   external('https://www.kobo.com/search?query='+q,'Kobo book search');
 }
 return '<article class="reading-ai-card"><div class="reading-ai-wordmark" aria-hidden="true">📚</div>'+
 '<div><span class="reading-ai-label">CURATED BOOK PROFILE · '+(audio?'AUDIO VERIFICATION REQUIRED':'E-BOOK')+
 '</span><h4>'+esc(b.title)+'</h4><p>by '+esc(b.author)+'</p><p>'+esc(b.summary)+'</p>'+
 '<div class="reading-ai-links">'+links+'</div>'+
 '<small>'+(audio?'An audiobook edition is not confirmed by a store search. Use Match E-books Ai to verify exact title and author.':'Stores and free edition eligibility vary by country.')+'</small>'+
 (tagged&&!audio?'<small>'+esc(aff.disclosure(locale()))+'</small>':'')+'</div></article>';
}
function render(question,host){
 if(!host)return 0;
 const mode=intent(question);
 if(!mode||root.MatchAppContentSafety?.isPornographicRequest?.(question))return 0;
 const results=mode==='magazine'?selectMagazine(question):selectBooks(question);
 if(!results.length)return 0;
 const section=document.createElement('section');
 section.className='reading-ai-sources';
 section.setAttribute('aria-label','Source-checked reading suggestions');
 const heading=mode==='magazine'?'Publisher-verified magazines':mode==='audiobook'?
 'Real books · verify audiobook editions':'Curated e-books · official store searches';
 section.innerHTML='<h3>'+heading+'</h3><p class="reading-ai-note">Original publication and store pages, not generated or unlicensed downloads. Prices, free access and stock must be checked at the source.</p>'+
 results.map(r=>mode==='magazine'?magCard(r):bookCard(r,mode)).join('');
 host.appendChild(section);
 return results.length;
}
root.MatchAppReadingAI=Object.freeze({intent,render,selectMagazine,selectBooks});
})(window);
