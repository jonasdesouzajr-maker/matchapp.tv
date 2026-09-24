/* MatchApp E-books Ai — grown-up ebook matcher.
   Separate from movie/TV matching so book discovery cannot mutate CONTENT_CATALOG.
   Legal-source rule: MatchApp never hosts copyrighted ebook files. */
(function(){
'use strict';
if((location.pathname||'').toLowerCase().startsWith('/kids'))return;

const CAT=()=>Array.isArray(window.MATCHAPP_EBOOK_CATALOG)?window.MATCHAPP_EBOOK_CATALOG:[];
const K={saved:'match_ebook_saved_v1',disliked:'match_ebook_disliked_v1',seen:'match_ebook_seen_v1',prefs:'match_ebook_criteria_v1'};
const FIELDS={
 mood:[
  ['any','✨','Any mood'],['cozy','☕','Cozy'],['funny','😄','Funny'],['romantic','💘','Romantic'],
  ['hopeful','🌤️','Hopeful'],['emotional','💗','Emotional'],['mysterious','🕯️','Mysterious'],
  ['dark','🌑','Dark'],['scary','🦇','Scary'],['intense','⚡','Intense'],['adventurous','🧭','Adventurous'],
  ['cerebral','🧠','Cerebral'],['mind-bending','🌀','Mind-bending'],['reflective','🌙','Reflective']
 ],
 genre:[
  ['any','📚','Any genre'],['fantasy','🐉','Fantasy'],['science-fiction','🚀','Sci-fi'],['romance','💞','Romance'],
  ['mystery','🔎','Mystery'],['thriller','🗝️','Thriller'],['horror','🕸️','Horror'],['literary','✒️','Literary'],
  ['historical','🏛️','Historical'],['classics','🏺','Classics'],['memoir','🪞','Memoir'],['nonfiction','🧭','Nonfiction'],
  ['self-help','🌱','Self-help'],['science','🔭','Science'],['history','🗺️','History']
 ],
 pace:[['any','⏱️','Any pace'],['fast','💨','Fast'],['balanced','⚖️','Balanced'],['slow','🫖','Slow-burn']],
 length:[['any','📏','Any length'],['short','📗','Short'],['medium','📘','Medium'],['long','📙','Long']],
 era:[['any','🕰️','Any era'],['classic','🏺','Classic'],['modern','💿','1970–2014'],['recent','✨','2015+']],
 access:[['any','🌐','Free or paid'],['free','🆓','Legal free edition'],['paid','🛍️','Paid stores']]
};
const LABELS={
 en:{eyebrow:'FOR BOOKWORMS',title:'Match E-books Ai',intro:'Tell us the reading mood. MatchApp picks one e-book and shows legal free editions or official stores where you can get it.',match:'Match my e-book',another:'Match another',save:'Save book',saved:'Saved',nope:'Not for me',why:'Why this match',where:'Where to get it',free:'Legal free editions',stores:'Official e-book stores',preview:'Book info / preview',rights:'Free-edition availability depends on copyright rules in your country. MatchApp links to source pages and never hosts copyrighted book files.',empty:'No unseen book fits every choice. We kept your access preference and broadened secondary filters.',quota:'Your MatchApp match allowance is used here too.',savedBooks:'Saved e-books',noneSaved:'No saved e-books yet.',remove:'Remove',close:'Close',topTitle:'Top E-books right now',topSub:'Current reader favorites and chart leaders — open an official store or a legal free-edition source.',topFree:'Free edition',topBuy:'Get this e-book',topSource:'Chart source'},
 'pt-BR':{eyebrow:'PARA BOOKWORMS',title:'Match de E-books iA',intro:'Diga o clima de leitura. O MatchApp escolhe um e-book e mostra edições grátis legais ou lojas oficiais onde encontrá-lo.',match:'Encontrar meu e-book',another:'Outro e-book',save:'Salvar livro',saved:'Salvo',nope:'Não é para mim',why:'Por que combina',where:'Onde encontrar',free:'Edições grátis legais',stores:'Lojas oficiais de e-books',preview:'Informações / prévia',rights:'A disponibilidade gratuita depende das leis de direitos autorais do seu país. O MatchApp só direciona para fontes oficiais e não hospeda arquivos protegidos.',empty:'Nenhum livro ainda não visto combina com tudo. Mantivemos sua preferência de acesso e ampliamos filtros secundários.',quota:'Usa a mesma cota de matches do MatchApp.',savedBooks:'E-books salvos',noneSaved:'Nenhum e-book salvo ainda.',remove:'Remover',close:'Fechar',topTitle:'Top E-books agora',topSub:'Favoritos atuais e líderes de listas — abra uma loja oficial ou uma fonte legal de edição gratuita.',topFree:'Edição grátis',topBuy:'Encontrar e-book',topSource:'Fonte da lista'},
 es:{eyebrow:'PARA BOOKWORMS',title:'Match E-books IA',intro:'Elige el ambiente de lectura. MatchApp encuentra un e-book y muestra ediciones gratuitas legales o tiendas oficiales.',match:'Encontrar mi e-book',another:'Otro e-book',save:'Guardar libro',saved:'Guardado',nope:'No es para mí',why:'Por qué encaja',where:'Dónde conseguirlo',free:'Ediciones gratuitas legales',stores:'Tiendas oficiales',preview:'Información / vista previa',rights:'La disponibilidad gratuita depende del copyright de tu país. MatchApp no aloja archivos protegidos.',empty:'No hay un libro nuevo con todos los filtros. Mantuvimos tu opción de acceso y ampliamos filtros secundarios.',quota:'Usa la misma cuota de matches de MatchApp.',savedBooks:'E-books guardados',noneSaved:'Aún no hay e-books guardados.',remove:'Quitar',close:'Cerrar',topTitle:'Top E-books ahora',topSub:'Favoritos actuales y líderes de listas — abre una tienda oficial o una fuente legal de edición gratuita.',topFree:'Edición gratis',topBuy:'Conseguir e-book',topSource:'Fuente de la lista'},
 ja:{eyebrow:'本好きのために',title:'E-books Ai マッチ',intro:'読みたい気分を選ぶと、MatchApp が1冊を選び、合法的な無料版または公式ストアを案内します。',match:'E-bookをマッチ',another:'別の本',save:'保存',saved:'保存済み',nope:'好みではない',why:'おすすめの理由',where:'入手先',free:'合法的な無料版',stores:'公式E-bookストア',preview:'書籍情報 / プレビュー',rights:'無料で利用できるかは各国の著作権法によって異なります。MatchApp は著作権保護されたファイルをホストしません。',empty:'すべての条件に合う未表示の本がありません。入手方法の希望を維持し、その他の条件を広げました。',quota:'通常のMatchAppマッチ枠を使用します。',savedBooks:'保存したE-book',noneSaved:'保存したE-bookはまだありません。',remove:'削除',close:'閉じる',topTitle:'今人気のE-book',topSub:'現在の人気作品とランキング上位作品。公式ストアまたは合法的な無料版へ移動できます。',topFree:'無料版',topBuy:'E-bookを入手',topSource:'ランキング出典'}
};
function lang(){const raw=String(window.MATCH_LANG||document.documentElement.lang||navigator.language||'en');if(/^pt/i.test(raw))return'pt-BR';if(/^es/i.test(raw))return'es';if(/^ja/i.test(raw))return'ja';return'en';}
function tr(k){const l=LABELS[lang()]||LABELS.en;return l[k]||LABELS.en[k]||k;}
function read(key){try{const v=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(v)?v:[]}catch(_){return[]}}
function write(key,v){try{localStorage.setItem(key,JSON.stringify(v))}catch(_){}}
function prefs(){try{return Object.assign({mood:'any',genre:'any',pace:'any',length:'any',era:'any',access:'any'},JSON.parse(localStorage.getItem(K.prefs)||'{}'))}catch(_){return{mood:'any',genre:'any',pace:'any',length:'any',era:'any',access:'any'}}}
function savePrefs(v){try{localStorage.setItem(K.prefs,JSON.stringify(v))}catch(_){}}
function uniq(v){return [...new Set(v.filter(Boolean))]}
function idset(key){return new Set(read(key))}
function market(){
 const saved=String(localStorage.getItem('match_user_country')||'').trim().toLowerCase();
 const nav=String(navigator.language||'').toLowerCase();
 if(saved==='brazil'||saved==='brasil'||saved==='br'||nav.endsWith('-br'))return'BR';
 if(saved==='united kingdom'||saved==='uk'||saved==='gb'||nav.endsWith('-gb'))return'GB';
 if(saved==='canada'||saved==='ca'||nav.endsWith('-ca'))return'CA';
 if(saved==='australia'||saved==='au'||nav.endsWith('-au'))return'AU';
 if(saved==='japan'||saved==='jp'||nav.endsWith('-jp'))return'JP';
 if(saved==='portugal'||saved==='pt'||nav.endsWith('-pt'))return'PT';
 return'US';
}
function q(book){return encodeURIComponent(book.title+' '+book.author);}
function storeLinks(book){
 const m=market(), query=q(book);
 const amazon={BR:'amazon.com.br',GB:'amazon.co.uk',CA:'amazon.ca',AU:'amazon.com.au',JP:'amazon.co.jp',PT:'amazon.es',US:'amazon.com'}[m]||'amazon.com';
 const apple={BR:'br',GB:'gb',CA:'ca',AU:'au',JP:'jp',PT:'pt',US:'us'}[m]||'us';
 const kobo={BR:'br/pt',GB:'gb/en',CA:'ca/en',AU:'au/en',JP:'jp/ja',PT:'pt/pt',US:'us/en'}[m]||'us/en';
 const links=[
  ['Kindle','https://www.'+amazon+'/s?k='+query+'&i=digital-text'],
  ['Apple Books','https://books.apple.com/'+apple+'/search?term='+query],
  ['Google Play Books','https://play.google.com/store/search?q='+query+'&c=books'],
  ['Kobo','https://www.kobo.com/'+kobo+'/search?query='+query]
 ];
 if(m==='US')links.push(['NOOK','https://www.barnesandnoble.com/s/'+query+'?keyword='+query]);
 return links;
}
function freeLinks(book){
 if(!book.access.includes('free'))return[];
 const query=q(book);
 return[
  ['Project Gutenberg','https://www.gutenberg.org/ebooks/search/?query='+query],
  ['Standard Ebooks','https://standardebooks.org/ebooks?query='+query],
  ['Open Library','https://openlibrary.org/search?q='+query+'&mode=ebooks']
 ];
}
function bookInfo(book){return 'https://books.google.com/books?q='+q(book);}
function analytics(name,detail){try{window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:name,...detail})}catch(_){}}
function fits(book,p,omit){
 if(!omit.has('mood')&&p.mood!=='any'&&!book.moods.includes(p.mood))return false;
 if(!omit.has('genre')&&p.genre!=='any'&&!book.genres.includes(p.genre))return false;
 if(!omit.has('pace')&&p.pace!=='any'&&book.pace!==p.pace)return false;
 if(!omit.has('length')&&p.length!=='any'&&book.length!==p.length)return false;
 if(!omit.has('era')&&p.era!=='any'&&book.era!==p.era)return false;
 if(p.access!=='any'&&!book.access.includes(p.access))return false; // hard constraint
 return true;
}
function pool(p,omit,allowSeen){
 const saved=idset(K.saved),bad=idset(K.disliked),seen=idset(K.seen);
 return CAT().filter(b=>!saved.has(b.id)&&!bad.has(b.id)&&(allowSeen||!seen.has(b.id))&&fits(b,p,omit));
}
function choose(p){
 const relax=[[],['length'],['pace','length'],['mood','pace','length'],['era','mood','pace','length'],['genre','era','mood','pace','length']];
 for(const fields of relax){const a=pool(p,new Set(fields),false);if(a.length)return{book:a[Math.floor(Math.random()*a.length)],relaxed:fields.length>0};}
 // Exhausted fresh pool: repeat a previously shown book, never a saved/disliked one.
 for(const fields of relax){const a=pool(p,new Set(fields),true);if(a.length)return{book:a[Math.floor(Math.random()*a.length)],relaxed:true,recycled:true};}
 return null;
}
function why(book,p,relaxed){
 const bits=[];
 if(p.mood!=='any'&&book.moods.includes(p.mood))bits.push(p.mood);
 if(p.genre!=='any'&&book.genres.includes(p.genre))bits.push(p.genre);
 if(p.pace!=='any'&&book.pace===p.pace)bits.push(book.pace+' pace');
 if(p.length!=='any'&&book.length===p.length)bits.push(book.length+' read');
 if(!bits.length)bits.push(book.genres[0],book.moods[0]);
 return (relaxed?'Closest fresh fit · ':'Exact fit · ')+bits.slice(0,3).join(' · ');
}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function coverFallback(book){
 const initials=book.title.split(/\s+/).filter(Boolean).slice(0,3).map(x=>x[0]).join('').toUpperCase();
 return '<div class="ebook-cover-fallback"><span>'+esc(initials)+'</span><strong>'+esc(book.title)+'</strong><small>'+esc(book.author)+'</small></div>';
}
async function hydrateCover(book,img,fall){
 if(!img)return;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),3200);
 try{
  const u='https://openlibrary.org/search.json?title='+encodeURIComponent(book.title)+'&author='+encodeURIComponent(book.author)+'&limit=1&fields=title,author_name,cover_i';
  const r=await fetch(u,{signal:controller.signal,headers:{Accept:'application/json'}});
  if(!r.ok)throw Error('cover');
  const d=await r.json(),doc=d&&d.docs&&d.docs[0];
  if(!doc||!doc.cover_i)throw Error('cover');
  const returned=String(doc.title||'').toLowerCase(), first=book.title.toLowerCase().split(/\s+/).filter(x=>x.length>3)[0];
  if(first&&!returned.includes(first))throw Error('cover mismatch');
  img.onload=()=>{img.hidden=false;if(fall)fall.hidden=true};
  img.onerror=()=>{img.hidden=true;if(fall)fall.hidden=false};
  img.src='https://covers.openlibrary.org/b/id/'+encodeURIComponent(doc.cover_i)+'-L.jpg';
 }catch(_){img.hidden=true;if(fall)fall.hidden=false}finally{clearTimeout(timer)}
}
async function cloudSync(){
 const sb=window.supabaseClient;if(!sb)return;
 try{
  const a=await sb.auth.getUser(),u=a&&a.data&&a.data.user;if(!u)return;
  await sb.auth.updateUser({data:{match_ebook_saved:read(K.saved).slice(-120),match_ebook_disliked:read(K.disliked).slice(-240)}});
 }catch(_){}
}
async function cloudHydrate(){
 const sb=window.supabaseClient;if(!sb)return;
 try{
  const a=await sb.auth.getUser(),u=a&&a.data&&a.data.user;if(!u)return;
  const m=u.user_metadata||{};
  if(Array.isArray(m.match_ebook_saved))write(K.saved,uniq(read(K.saved).concat(m.match_ebook_saved)));
  if(Array.isArray(m.match_ebook_disliked))write(K.disliked,uniq(read(K.disliked).concat(m.match_ebook_disliked)));
 }catch(_){}
}
function optionButtons(field,current){
 return FIELDS[field].map(([value,icon,label])=>'<button type="button" class="ebook-chip'+(current===value?' is-on':'')+'" data-ebook-field="'+field+'" data-ebook-value="'+esc(value)+'" aria-pressed="'+(current===value?'true':'false')+'"><span aria-hidden="true">'+icon+'</span>'+esc(label)+'</button>').join('');
}
function topBooks(){return Array.isArray(window.MATCHAPP_TOP_EBOOKS)?window.MATCHAPP_TOP_EBOOKS:[];}
function renderTop(root){
 const host=root.querySelector('[data-ebook-top]');if(!host)return;
 const m=market(),items=topBooks().slice().sort((a,b)=>{const av=a.market===m?0:(a.market==='GLOBAL'?1:2),bv=b.market===m?0:(b.market==='GLOBAL'?1:2);return av-bv;});
 host.innerHTML=items.map((b,i)=>{
  const free=String(b.access||'').includes('free'),freeUrl=freeLinks({title:b.title,author:b.author,access:free?['free']:['paid']})[0]?.[1]||'';
  const buy=storeLinks(b)[0]?.[1]||bookInfo(b);
  return '<article class="ebook-top-card" data-ebook-top-card="'+i+'">'+
   '<div class="ebook-top-cover"><img data-top-cover alt="" hidden><div data-top-fallback>'+coverFallback(b)+'</div></div>'+
   '<div class="ebook-top-copy"><span class="ebook-top-badge">'+esc(b.badge||'Top e-book')+'</span><h3>'+esc(b.title)+'</h3><p class="ebook-top-author">'+esc(b.author)+'</p><p class="ebook-top-genre">'+esc(b.genre||'E-book')+'</p>'+
   '<div class="ebook-top-actions">'+
    (free&&freeUrl?'<a class="ebook-provider ebook-free" href="'+esc(freeUrl)+'" target="_blank" rel="noopener noreferrer" data-ebook-provider="Legal free edition">'+esc(tr('topFree'))+' ↗</a>':'')+
    '<a class="ebook-provider" href="'+esc(buy)+'" target="_blank" rel="noopener noreferrer" data-ebook-provider="E-book store">'+esc(tr('topBuy'))+' ↗</a>'+
    '<a class="ebook-top-source" href="'+esc(b.sourceUrl||'#')+'" target="_blank" rel="noopener noreferrer">'+esc(tr('topSource'))+' · '+esc(b.source||'')+'</a>'+
   '</div></div></article>';
 }).join('');
 const cards=[...host.querySelectorAll('.ebook-top-card')];
 const hydrate=card=>{if(card.dataset.coverHydrated==='1')return;card.dataset.coverHydrated='1';const i=Number(card.dataset.ebookTopCard),b=items[i];if(!b)return;hydrateCover(b,card.querySelector('[data-top-cover]'),card.querySelector('[data-top-fallback]'));};
 if('IntersectionObserver'in window){
  const io=new IntersectionObserver(entries=>entries.forEach(x=>{if(x.isIntersecting){hydrate(x.target);io.unobserve(x.target)}}),{rootMargin:'180px'});
  cards.forEach(c=>io.observe(c));
 }else cards.slice(0,6).forEach(hydrate);
}
function renderSaved(root){
 const host=root.querySelector('[data-ebook-saved-list]');if(!host)return;
 const ids=read(K.saved),books=ids.map(id=>CAT().find(b=>b.id===id)).filter(Boolean);
 root.querySelectorAll('[data-ebook-saved-count]').forEach(x=>x.textContent=String(books.length));
 host.innerHTML=books.length?books.map(b=>'<article><div><strong>'+esc(b.title)+'</strong><small>'+esc(b.author)+'</small></div><div><a href="'+esc(bookInfo(b))+'" target="_blank" rel="noopener noreferrer">Google Books ↗</a><button type="button" data-ebook-remove="'+esc(b.id)+'">'+esc(tr('remove'))+'</button></div></article>').join(''):'<p>'+esc(tr('noneSaved'))+'</p>';
}
function renderResult(root,book,p,relaxed){
 const host=root.querySelector('[data-ebook-result]');
 const free=freeLinks(book),stores=storeLinks(book);
 host.hidden=false;
 host.innerHTML='<div class="ebook-result-grid">'+
  '<div class="ebook-cover"><img data-ebook-cover alt="" hidden><div data-ebook-cover-fallback>'+coverFallback(book)+'</div></div>'+
  '<div class="ebook-result-copy"><p class="ebook-kicker">'+esc(book.year)+' · '+esc(book.genres.join(' · '))+'</p><h3>'+esc(book.title)+'</h3><p class="ebook-author">by '+esc(book.author)+'</p><p class="ebook-summary">'+esc(book.summary)+'</p>'+
  '<div class="ebook-why"><strong>'+esc(tr('why'))+'</strong><span>'+esc(why(book,p,relaxed))+'</span></div>'+
  '<div class="ebook-meta"><span>'+esc(book.length)+' read</span><span>'+esc(book.pace)+' pace</span><span>'+(book.access.includes('free')?'free option + stores':'paid stores')+'</span></div>'+
  '<div class="ebook-source-groups">'+
   (free.length?'<div><h4>'+esc(tr('free'))+'</h4><div class="ebook-provider-row">'+free.map(([n,u])=>'<a class="ebook-provider ebook-free" href="'+esc(u)+'" target="_blank" rel="noopener noreferrer" data-ebook-provider="'+esc(n)+'">'+esc(n)+' ↗</a>').join('')+'</div></div>':'')+
   '<div><h4>'+esc(tr('stores'))+'</h4><div class="ebook-provider-row">'+stores.map(([n,u])=>'<a class="ebook-provider" href="'+esc(u)+'" target="_blank" rel="noopener noreferrer" data-ebook-provider="'+esc(n)+'">'+esc(n)+' ↗</a>').join('')+'</div></div>'+
   '<a class="ebook-preview-link" href="'+esc(bookInfo(book))+'" target="_blank" rel="noopener noreferrer" data-ebook-provider="Google Books">'+esc(tr('preview'))+' ↗</a>'+
  '</div>'+
  '<div class="ebook-result-actions"><button type="button" class="ebook-save" data-ebook-save="'+esc(book.id)+'">☆ '+esc(tr('save'))+'</button><button type="button" class="ebook-nope" data-ebook-nope="'+esc(book.id)+'">× '+esc(tr('nope'))+'</button><button type="button" class="ebook-rematch" data-ebook-rematch>↻ '+esc(tr('another'))+'</button></div>'+
  '</div></div>';
 const img=host.querySelector('[data-ebook-cover]'),fall=host.querySelector('[data-ebook-cover-fallback]');
 hydrateCover(book,img,fall);
 host.scrollIntoView({behavior:(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)?'auto':'smooth',block:'nearest'});
 analytics('ebook_match_reveal',{ebook_id:book.id,ebook_title:book.title,ebook_access:p.access,relaxed:!!relaxed});
}
async function doMatch(root){
 const p=prefs(),pick=choose(p);
 const note=root.querySelector('[data-ebook-note]');
 if(!pick){if(note){note.hidden=false;note.textContent=tr('empty')}return;}
 // Same commercial meter as the main matcher; no charge when preflight found nothing.
 if(typeof window.checkDailyLimit==='function'){
  const allowed=await window.checkDailyLimit();
  if(!allowed)return;
 }
 if(note){note.hidden=!pick.relaxed;note.textContent=pick.relaxed?tr('empty'):''}
 const seen=uniq(read(K.seen).concat(pick.book.id)).slice(-300);write(K.seen,seen);
 renderResult(root,pick.book,p,pick.relaxed);
}
function bind(root){
 root.addEventListener('click',async e=>{
  const chip=e.target.closest('[data-ebook-field]');
  if(chip){
   const p=prefs();p[chip.dataset.ebookField]=chip.dataset.ebookValue;savePrefs(p);
   root.querySelectorAll('[data-ebook-field="'+chip.dataset.ebookField+'"]').forEach(b=>{const on=b.dataset.ebookValue===chip.dataset.ebookValue;b.classList.toggle('is-on',on);b.setAttribute('aria-pressed',String(on))});
   return;
  }
  if(e.target.closest('[data-ebook-match]')){e.preventDefault();await doMatch(root);return;}
  if(e.target.closest('[data-ebook-rematch]')){e.preventDefault();await doMatch(root);return;}
  const save=e.target.closest('[data-ebook-save]');
  if(save){const id=save.dataset.ebookSave;write(K.saved,uniq(read(K.saved).concat(id)));save.textContent='★ '+tr('saved');save.disabled=true;renderSaved(root);cloudSync();analytics('ebook_save',{ebook_id:id});return;}
  const nope=e.target.closest('[data-ebook-nope]');
  if(nope){const id=nope.dataset.ebookNope;write(K.disliked,uniq(read(K.disliked).concat(id)));cloudSync();analytics('ebook_not_for_me',{ebook_id:id});await doMatch(root);return;}
  const rm=e.target.closest('[data-ebook-remove]');
  if(rm){write(K.saved,read(K.saved).filter(x=>x!==rm.dataset.ebookRemove));renderSaved(root);cloudSync();return;}
  const provider=e.target.closest('[data-ebook-provider]');
  if(provider)analytics('ebook_provider_click',{provider:provider.dataset.ebookProvider});
 });
}
function markup(){
 const p=prefs();
 const field=(key,label)=>'<fieldset class="ebook-field"><legend>'+label+'</legend><div class="ebook-chips">'+optionButtons(key,p[key])+'</div></fieldset>';
 return '<details class="ebook-fold" open><summary><span class="ebook-summary-icon" aria-hidden="true">📚✦</span><span><small>'+esc(tr('eyebrow'))+'</small><strong>'+esc(tr('title'))+'</strong></span><span class="ebook-chevron" aria-hidden="true">⌄</span></summary>'+
 '<div class="ebook-panel"><div class="ebook-intro"><div><h2>'+esc(tr('title'))+'</h2><p>'+esc(tr('intro'))+'</p></div><a href="/ebooks/" class="ebook-guide-link">Bookworms hub ↗</a></div>'+
 '<div class="ebook-fields">'+field('mood','How should it feel?')+field('genre','Genre')+field('pace','Reading pace')+field('length','Length')+field('era','Era')+field('access','Access')+'</div>'+
 '<div class="ebook-match-row"><button type="button" class="ebook-match-cta" data-ebook-match>📖 '+esc(tr('match'))+'</button><span>'+esc(tr('quota'))+'</span></div>'+
 '<p class="ebook-note" data-ebook-note hidden></p><section class="ebook-result" data-ebook-result hidden aria-live="polite"></section>'+
 '<details class="ebook-saved"><summary>★ '+esc(tr('savedBooks'))+' <span data-ebook-saved-count>0</span></summary><div data-ebook-saved-list></div></details>'+
 '<p class="ebook-rights">'+esc(tr('rights'))+'</p></div></details>';
}
async function mount(){
 let root=document.getElementById('ebook-matcher-root');
 if(!root){
  root=document.createElement('section');root.id='ebook-matcher-root';root.className='ebook-matcher-root';
  const anchor=document.getElementById('search-box')||document.getElementById('questionnaire-box');
  if(anchor)anchor.insertAdjacentElement('afterend',root);else(document.querySelector('main')||document.body).appendChild(root);
 }
 if(root.dataset.ebookMounted==='1')return;
 root.dataset.ebookMounted='1';root.innerHTML=markup();bind(root);renderTop(root);await cloudHydrate();renderSaved(root);
 document.addEventListener('matchapp:langchange',()=>{const open=root.querySelector('.ebook-fold')?.open;root.innerHTML=markup();bind(root);renderTop(root);renderSaved(root);const fold=root.querySelector('.ebook-fold');if(fold)fold.open=open!==false;});
}
window.MatchAppEbooks={match:()=>{const r=document.getElementById('ebook-matcher-root');return r?doMatch(r):null},saved:()=>read(K.saved).slice(),disliked:()=>read(K.disliked).slice()};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
