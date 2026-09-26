/* MatchApp E-books Ai — grown-up ebook matcher.
   Separate from movie/TV matching so book discovery cannot mutate CONTENT_CATALOG.
   Legal-source rule: MatchApp never hosts copyrighted ebook files. */
(function(){
'use strict';
if((location.pathname||'').toLowerCase().startsWith('/kids'))return;

const CAT=()=>window.MatchAppContentSafety?.safeEntries?.(window.MATCHAPP_EBOOK_CATALOG)|| (Array.isArray(window.MATCHAPP_EBOOK_CATALOG)?window.MATCHAPP_EBOOK_CATALOG:[]);
const MAG=()=>window.MatchAppContentSafety?.safeEntries?.(window.MatchAppMagazines?.items)||window.MatchAppMagazines?.items||[];
const K={saved:'match_ebook_saved_v1',disliked:'match_ebook_disliked_v1',seen:'match_ebook_seen_v1',prefs:'match_ebook_criteria_v1'};
const FIELDS={
 mood:[
  ['any','✨','Any mood'],['cozy','☕','Cozy'],['funny','😄','Funny'],['witty','💬','Witty'],['romantic','💘','Romantic'],
  ['hopeful','🌤️','Hopeful'],['emotional','💗','Emotional'],['mysterious','🕯️','Mysterious'],
  ['dark','🌑','Dark'],['scary','🦇','Scary'],['intense','⚡','Intense'],['adventurous','🧭','Adventurous'],
  ['cerebral','🧠','Cerebral'],['mind-bending','🌀','Mind-bending'],['reflective','🌙','Reflective'],
  ['inspiring','🌟','Inspiring'],['practical','🛠️','Practical'],['curious','🔍','Curious'],['awe','🌌','Awe'],
  ['quirky','🎭','Quirky'],['nostalgic','📻','Nostalgic'],['mythic','🏺','Mythic'],['glamorous','✨','Glamorous'],
  ['dreamy','☁️','Dreamy'],['epic','⚔️','Epic'],['melancholy','🌧️','Melancholy']
 ],
 genre:[
  ['any','📚','Any genre'],['fantasy','🐉','Fantasy'],['science-fiction','🚀','Sci-fi'],['romance','💞','Romance'],
  ['mystery','🔎','Mystery'],['thriller','🗝️','Thriller'],['horror','🕸️','Horror'],['gothic','🕯️','Gothic'],
  ['literary','✒️','Literary'],['contemporary','🏙️','Contemporary'],['historical','🏛️','Historical'],['classics','🏺','Classics'],
  ['adventure','🧭','Adventure'],['dystopian','👁️','Dystopian'],['magical-realism','🦋','Magical realism'],['comedy','😄','Comedy'],
  ['memoir','🪞','Memoir'],['biography','👤','Biography'],['nonfiction','📖','Nonfiction'],['true-crime','🧩','True crime'],
  ['self-help','🌱','Self-help'],['psychology','🧠','Psychology'],['philosophy','🏛️','Philosophy'],['business','💼','Business'],
  ['economics','📈','Economics'],['technology','💻','Technology'],['science','🔭','Science'],['history','🗺️','History'],['nature','🌿','Nature']
 ],
 pace:[['any','⏱️','Any pace'],['fast','💨','Fast'],['balanced','⚖️','Balanced'],['slow','🫖','Slow-burn']],
 length:[['any','📏','Any length'],['short','📗','Short'],['medium','📘','Medium'],['long','📙','Long']],
 era:[['any','🕰️','Any era'],['classic','🏺','Classic'],['modern','💿','1970–2014'],['recent','✨','2015+']],
 access:[['any','🌐','Free or paid'],['free','🆓','Legal free edition'],['paid','🛍️','Paid stores']],
 format:[['any','📚🎧','Read or listen'],['ebook','📖','E-book edition'],['audiobook','🎧','Audiobook only'],['magazine','📰','Magazine only']]
};
const LABELS={
 en:{eyebrow:'FOR BOOKWORMS',title:'Match E-books Ai',intro:'Pick a reading or listening mood. MatchApp matches a book and checks real audio editions in your country, with legal free sources and official stores.',match:'Match my e-book',another:'Match another',save:'Save book',saved:'Saved',nope:'Not for me',why:'Why this match',where:'Where to get it',free:'Legal free editions',stores:'Official e-book stores',preview:'Book info / preview',rights:'Free-edition availability depends on copyright rules in your country. MatchApp links to source pages and never hosts copyrighted book files.',empty:'No unseen book fits every choice. We kept your access preference and broadened secondary filters.',quota:'Your MatchApp match allowance is used here too.',savedBooks:'Saved books & audiobooks',noneSaved:'No saved books yet.',remove:'Remove',close:'Close',topTitle:'Top E-books right now',topSub:'Current reader favorites and chart leaders — open an official store or a legal free-edition source.',topFree:'Free edition',topBuy:'Get this e-book',topSource:'Chart source',audioTitle:'Audiobook editions',audioVerify:'Check verified audiobook edition',audioWaiting:'Checking exact title and author at official audio sources…',audioNone:'No matching audio edition was verified. Official store searches may still help.',audioLinks:'Verified audiobook editions',audioSearch:'Search other audio stores (edition not confirmed)',audioRights:'Free LibriVox recordings are US public domain. Outside the US, check your local copyright law before listening or downloading.',audioEmpty:'No verified audiobook passed your filters right now. Try e-book format, broader filters, or official audio stores.',audioOnly:'Verified audio required · availability varies by country'},
 'pt-BR':{eyebrow:'PARA BOOKWORMS',title:'Match de E-books iA',intro:'Escolha o clima de leitura ou de escuta. O MatchApp encontra livros e verifica audiolivros reais no seu país, com fontes legais e lojas oficiais.',match:'Encontrar meu e-book',another:'Outro e-book',save:'Salvar livro',saved:'Salvo',nope:'Não é para mim',why:'Por que combina',where:'Onde encontrar',free:'Edições grátis legais',stores:'Lojas oficiais de e-books',preview:'Informações / prévia',rights:'A disponibilidade gratuita depende das leis de direitos autorais do seu país. O MatchApp só direciona para fontes oficiais e não hospeda arquivos protegidos.',empty:'Nenhum livro ainda não visto combina com tudo. Mantivemos sua preferência de acesso e ampliamos filtros secundários.',quota:'Usa a mesma cota de matches do MatchApp.',savedBooks:'Livros e audiolivros salvos',noneSaved:'Nenhum livro salvo ainda.',remove:'Remover',close:'Fechar',topTitle:'Top E-books agora',topSub:'Favoritos atuais e líderes de listas — abra uma loja oficial ou uma fonte legal de edição gratuita.',topFree:'Edição grátis',topBuy:'Encontrar e-book',topSource:'Fonte da lista',audioTitle:'Edições em audiolivro',audioVerify:'Verificar edição em audiolivro',audioWaiting:'Verificando título e autor exatos nas fontes oficiais…',audioNone:'Não foi possível confirmar esta edição em áudio. Buscas nas lojas oficiais podem ajudar.',audioLinks:'Audiolivros confirmados',audioSearch:'Pesquisar outras lojas de áudio (edição não confirmada)',audioRights:'As gravações da LibriVox são de domínio público nos EUA. Em outros países, confira os direitos autorais antes de ouvir ou baixar.',audioEmpty:'Nenhum audiolivro confirmado passou nos filtros agora. Tente e-books, filtros mais amplos ou as lojas oficiais.',audioOnly:'Áudio confirmado obrigatório · a disponibilidade varia por país'},
 es:{eyebrow:'PARA BOOKWORMS',title:'Match E-books IA',intro:'Elige el ambiente para leer o escuchar. MatchApp encuentra libros y verifica ediciones de audiolibro en tu país, con fuentes legales y tiendas oficiales.',match:'Encontrar mi e-book',another:'Otro e-book',save:'Guardar libro',saved:'Guardado',nope:'No es para mí',why:'Por qué encaja',where:'Dónde conseguirlo',free:'Ediciones gratuitas legales',stores:'Tiendas oficiales',preview:'Información / vista previa',rights:'La disponibilidad gratuita depende del copyright de tu país. MatchApp no aloja archivos protegidos.',empty:'No hay un libro nuevo con todos los filtros. Mantuvimos tu opción de acceso y ampliamos filtros secundarios.',quota:'Usa la misma cuota de matches de MatchApp.',savedBooks:'Libros y audiolibros guardados',noneSaved:'Aún no hay libros guardados.',remove:'Quitar',close:'Cerrar',topTitle:'Top E-books ahora',topSub:'Favoritos actuales y líderes de listas — abre una tienda oficial o una fuente legal de edición gratuita.',topFree:'Edición gratis',topBuy:'Conseguir e-book',topSource:'Fuente de la lista',audioTitle:'Ediciones de audiolibro',audioVerify:'Verificar edición en audio',audioWaiting:'Comprobando título y autor exactos…',audioNone:'No se confirmó una edición en audio. Puedes buscar en las tiendas oficiales.',audioLinks:'Audiolibros confirmados',audioSearch:'Buscar en otras tiendas de audio (edición sin confirmar)',audioRights:'Las grabaciones de LibriVox son de dominio público en EE. UU. En otros países, comprueba los derechos de autor.',audioEmpty:'Ningún audiolibro confirmado cumple estos filtros ahora. Prueba otro formato o fuentes oficiales.',audioOnly:'Se requiere audio confirmado · disponibilidad regional'},
 ja:{eyebrow:'本好きのために',title:'E-books Ai マッチ',intro:'読書・朗読を聴きたい気分に合わせて本を選び、正規ストアで音声版のタイトル・著者を確認します。',match:'E-bookをマッチ',another:'別の本',save:'保存',saved:'保存済み',nope:'好みではない',why:'おすすめの理由',where:'入手先',free:'合法的な無料版',stores:'公式E-bookストア',preview:'書籍情報 / プレビュー',rights:'無料で利用できるかは各国の著作権法によって異なります。MatchApp は著作権保護されたファイルをホストしません。',empty:'すべての条件に合う未表示の本がありません。入手方法の希望を維持し、その他の条件を広げました。',quota:'通常のMatchAppマッチ枠を使用します。',savedBooks:'保存した本・オーディオブック',noneSaved:'保存した本はまだありません。',remove:'削除',close:'閉じる',topTitle:'今人気のE-book',topSub:'現在の人気作品とランキング上位作品。公式ストアまたは合法的な無料版へ移動できます。',topFree:'無料版',topBuy:'E-bookを入手',topSource:'ランキング出典',audioTitle:'オーディオブック版',audioVerify:'音声版を確認する',audioWaiting:'公式ストアで同一タイトルと著者を確認中…',audioNone:'音声版を確認できませんでした。公式ストアで検索できます。',audioLinks:'確認済みオーディオブック',audioSearch:'他のオーディオストアで検索（未確認）',audioRights:'LibriVox は米国内でパブリックドメインです。他の国では著作権をご確認ください。',audioEmpty:'条件を満たす確認済み音声版がありません。読書形式や検索条件を変更してください。',audioOnly:'確認済み音声版のみ・国によって異なります'}
};
function lang(){const raw=String(window.MATCH_LANG||document.documentElement.lang||navigator.language||'en');if(/^pt/i.test(raw))return'pt-BR';if(/^es/i.test(raw))return'es';if(/^ja/i.test(raw))return'ja';return'en';}
function tr(k){const l=LABELS[lang()]||LABELS.en;return l[k]||LABELS.en[k]||k;}
function read(key){try{const v=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(v)?v:[]}catch(_){return[]}}
function write(key,v){try{localStorage.setItem(key,JSON.stringify(v))}catch(_){}}
function prefs(){try{return Object.assign({mood:'any',genre:'any',pace:'any',length:'any',era:'any',access:'any',format:'any'},JSON.parse(localStorage.getItem(K.prefs)||'{}'))}catch(_){return{mood:'any',genre:'any',pace:'any',length:'any',era:'any',access:'any',format:'any'}}}
function savePrefs(v){try{localStorage.setItem(K.prefs,JSON.stringify(v))}catch(_){}}
function uniq(v){return [...new Set(v.filter(Boolean))]}
function idset(key){return new Set(read(key))}
function market(){
 let saved='';
 try{saved=String(localStorage.getItem('match_user_country')||'').trim().toLowerCase()}catch(_){}
 // Incognito/storage-denied mobile WebViews must not crash the matcher.
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
 const affiliate=window.MatchAppEbookAffiliate;
 const kindle=affiliate?affiliate.amazonSearchUrl(book,m):'https://www.'+amazon+'/s?k='+query+'&i=digital-text';
 const apple={BR:'br',GB:'gb',CA:'ca',AU:'au',JP:'jp',PT:'pt',US:'us'}[m]||'us';
 const kobo={BR:'br/pt',GB:'gb/en',CA:'ca/en',AU:'au/en',JP:'jp/ja',PT:'pt/pt',US:'us/en'}[m]||'us/en';
 const links=[
  ['Kindle',kindle],
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
// The e-book catalogue is a set of book profiles, not a list of confirmed
// audio editions. Verify an exact commercial or eligible public-domain audio
// record before spending a match on "Audiobook only".
async function chooseVerifiedAudio(p,onProgress){
 const verify=window.MatchAppAudiobooks?.verify;
 if(typeof verify!=='function')return null;
 const country=market();
 if(p.access==='free'&&country!=='US')return null; // jurisdiction-specific free rights
 const relax=[[],['length'],['pace','length'],['mood','pace','length'],
  ['era','mood','pace','length'],['genre','era','mood','pace','length']];
 let tries=0;const tested=new Set(),started=Date.now();
 for(const fields of relax){
  const options=pool(p,new Set(fields),false).sort(()=>Math.random()-.5);
  for(const book of options){
   if(tested.has(book.id))continue;
   // Longer bounded source search: eight distinct legitimate candidates,
   // never an arbitrary "nearby" title returned when sources are down.
   if(tries>=8||Date.now()-started>55000)return null;
   tested.add(book.id);tries++;
   try{onProgress?.(tries,8)}catch(_){}
   let found=null;
   try{found=await verify(book,country,p.access)}catch(_){continue}
   if(!found)continue;
   if((p.access==='free'&&found.free)||
      (p.access==='paid'&&found.apple)||
      (p.access==='any'&&(found.apple||found.free)))
    return {book,audio:found,relaxed:fields.length>0};
  }
 }
 return null;
}
function chooseMagazine(p){
 const api=window.MatchAppMagazines;if(!api)return null;
 const excluded=new Set([...read(K.saved),...read(K.disliked),...read(K.seen)]);
 const magazine=api.select(p,market(),excluded)||
   api.select(p,market(),new Set([...read(K.saved),...read(K.disliked)]));
 return magazine?{book:magazine,magazine:true,relaxed:false}:null;
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
// Genuine publisher/catalogue edition art only. Open Library first, then
// Google Books with exact work and full author verification. Network/source
// failures never become permanent "no cover" cache entries.
const BOOK_COVER_IDENTITY=new Map(),BOOK_COVER_INFLIGHT=new Map();
async function coverJSON(url){
 const ctrl=new AbortController();let timer;
 const deadline=new Promise((_,reject)=>{
  timer=setTimeout(()=>{ctrl.abort();reject(Error('Cover source timed out'));},6000);
 });
 try{
  const request=(async()=>{
   const response=await fetch(url,{signal:ctrl.signal,headers:{Accept:'application/json'}});
   if(!response.ok)throw Error('Cover source unavailable');
   return response.json();
  })();
  return await Promise.race([request,deadline]);
 }finally{clearTimeout(timer)}
}
async function sourceCover(book,source){
 const key=book.title+'::'+book.author+'::'+source;
 if(BOOK_COVER_IDENTITY.has(key))return BOOK_COVER_IDENTITY.get(key);
 if(BOOK_COVER_INFLIGHT.has(key))return BOOK_COVER_INFLIGHT.get(key);
 const job=(async()=>{
  if(source==='openlibrary'){
   const url='https://openlibrary.org/search.json?title='+encodeURIComponent(book.title)+'&author='+encodeURIComponent(book.author)+'&limit=8&fields=title,author_name,cover_i,first_publish_year';
   const d=await coverJSON(url);
   const approvedId=window.MatchAppBookCoverIdentity?.verifiedCoverId(book,d?.docs);
   return Number.isSafeInteger(approvedId)&&approvedId>0
    ?'https://covers.openlibrary.org/b/id/'+encodeURIComponent(approvedId)+'-L.jpg':null;
  }
  if(source==='google'){
   const term='intitle:"'+book.title+'" inauthor:"'+book.author+'"';
   const url='https://www.googleapis.com/books/v1/volumes?q='+encodeURIComponent(term)+'&maxResults=10&printType=books&projection=lite';
   const d=await coverJSON(url);
   return window.MatchAppBookCoverIdentity?.verifiedGoogleCoverUrl(book,d?.items)||null;
  }
  return null;
 })().then(url=>{if(url)BOOK_COVER_IDENTITY.set(key,url);return url})
  .catch(()=>null).finally(()=>BOOK_COVER_INFLIGHT.delete(key));
 BOOK_COVER_INFLIGHT.set(key,job);
 return job;
}
function showVerifiedCover(img,fall,url){
 if(!url||!img?.isConnected)return Promise.resolve(false);
 return new Promise(resolve=>{
  let finished=false,timer;
  const settle=good=>{
   if(finished)return;
   finished=true;clearTimeout(timer);img.onload=null;img.onerror=null;
   const valid=good&&img.isConnected&&img.naturalWidth>0;
   img.hidden=!valid;if(fall)fall.hidden=valid;
   resolve(valid);
  };
  img.onload=()=>settle(true);img.onerror=()=>settle(false);
  timer=setTimeout(()=>settle(false),7000);
  img.src=url;
  if(img.complete&&img.naturalWidth>0)settle(true);
 });
}
async function hydrateCover(book,img,fall,audio){
 if(!img)return;
 img.hidden=true;if(fall)fall.hidden=false;
 // A source-verified Apple audio record carries its own genuine edition art.
 if(audio?.apple?.coverUrl&&await showVerifiedCover(img,fall,audio.apple.coverUrl))return;
 for(const source of ['openlibrary','google']){
  const url=await sourceCover(book,source);
  if(url&&await showVerifiedCover(img,fall,url))return;
 }
 img.hidden=true;if(fall)fall.hidden=false;
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
  const aff=window.MatchAppEbookAffiliate,paid=!!(aff&&aff.isAffiliateLink(buy));
  return '<article class="ebook-top-card" data-ebook-top-card="'+i+'">'+
   '<div class="ebook-top-cover"><img data-top-cover alt="" hidden><div data-top-fallback>'+coverFallback(b)+'</div></div>'+
   '<div class="ebook-top-copy"><span class="ebook-top-badge">'+esc(b.badge||'Top e-book')+'</span><h3>'+esc(b.title)+'</h3><p class="ebook-top-author">'+esc(b.author)+'</p><p class="ebook-top-genre">'+esc(b.genre||'E-book')+'</p>'+
   '<div class="ebook-top-actions">'+
    (free&&freeUrl?'<a class="ebook-provider ebook-free" href="'+esc(freeUrl)+'" target="_blank" rel="noopener noreferrer" data-ebook-provider="Legal free edition">'+esc(tr('topFree'))+' ↗</a>':'')+
    '<a class="ebook-provider" href="'+esc(buy)+'" target="_blank" rel="'+(paid?'sponsored ':'')+'noopener noreferrer" data-ebook-provider="E-book store"'+(paid?' data-ebook-affiliate="amazon-br"':'')+'>'+esc(tr('topBuy'))+(paid?' · '+esc(aff.paidLabel(lang())):'')+' ↗</a>'+
    (paid?'<small class="ebook-rights">'+esc(aff.disclosure(lang()))+'</small>':'')+
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
function audioLinksHTML(audio){
 const verified=[audio?.apple,audio?.free].filter(Boolean);
 const vlinks=verified.map(item=>'<a class="ebook-provider ebook-audio-verified" href="'+esc(item.url)+
  '" target="_blank" rel="noopener noreferrer" data-ebook-provider="'+esc(item.provider)+'">'+
  esc(item.provider)+' · '+esc(item.title)+' ✓ ↗</a>').join('');
 const searches=Array.isArray(audio?.searches)?audio.searches:[];
 return (vlinks?'<h5>'+esc(tr('audioLinks'))+'</h5><div class="ebook-provider-row">'+vlinks+'</div>':
  '<p class="ebook-audio-note">'+esc(tr('audioNone'))+'</p>')+
  '<h5>'+esc(tr('audioSearch'))+'</h5><div class="ebook-provider-row">'+
  searches.map(item=>'<a class="ebook-provider ebook-audio-search" href="'+esc(item.url)+
   '" target="_blank" rel="noopener noreferrer" data-ebook-provider="'+esc(item.provider)+'">'+
   esc(item.label)+' ↗</a>').join('')+'</div>'+
  (audio?.free?'<p class="ebook-rights">'+esc(tr('audioRights'))+'</p>':'');
}
function paintAudio(root,book,audio){
 const host=root.querySelector('[data-ebook-audio-options]');
 const wrapper=root.querySelector('[data-ebook-audio]');
 if(!host||!wrapper||!audio)return;
 host.innerHTML=audioLinksHTML(audio);
 wrapper.querySelector('[data-ebook-check-audio]')?.remove();
 analytics('audiobook_sources_checked',{ebook_id:book.id,verified:Number(!!audio.apple)+Number(!!audio.free),country:market()});
}
function renderSaved(root){
 const host=root.querySelector('[data-ebook-saved-list]');if(!host)return;
 const ids=read(K.saved),books=ids.map(id=>CAT().concat(MAG()).find(b=>b.id===id)).filter(Boolean);
 root.querySelectorAll('[data-ebook-saved-count]').forEach(x=>x.textContent=String(books.length));
 host.innerHTML=books.length?books.map(b=>{
  const magazine=b.kind==='magazine';
  const url=magazine?b.issues:bookInfo(b);
  const author=magazine?b.publisher:b.author;
  return '<article><div><strong>'+esc(b.title)+'</strong><small>'+esc(author)+'</small></div><div>'+
    '<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+(magazine?'Official publisher &amp; covers':'Google Books')+' ↗</a>'+
    (magazine?'':'<button type="button" data-ebook-saved-audio="'+esc(b.id)+'">🎧 '+esc(tr('audioVerify'))+'</button>')+
    '<button type="button" data-ebook-remove="'+esc(b.id)+'">'+esc(tr('remove'))+'</button>'+
    '<div class="ebook-saved-audio" data-ebook-saved-audio-result></div></div></article>';
 }).join(''):'<p>'+esc(tr('noneSaved'))+'</p>';
}
function renderMagazineResult(root,mag,p){
 const host=root.querySelector('[data-ebook-result]');
 if(!host)return;
 const affiliate=window.MatchAppEbookAffiliate;
 const offers=window.MatchAppMagazines?.buyLinks(mag,market(),affiliate)||[];
 const tagged=offers.some(x=>affiliate?.isAffiliateLink(x.url));
 const links=offers.map(({name,url})=>{
  const paid=!!affiliate?.isAffiliateLink(url);
  return '<a class="ebook-provider" href="'+esc(url)+'" target="_blank" rel="'+(paid?'sponsored ':'')+
   'noopener noreferrer" data-ebook-provider="'+esc(name)+'"'+(paid?' data-ebook-affiliate="amazon-br"':'')+'>'+
   esc(name)+(paid?' · '+esc(affiliate.paidLabel(lang())):'')+' ↗</a>';
 }).join('');
 host.hidden=false;
 host.innerHTML='<div class="ebook-result-grid magazine-result-grid">'+
 '<div class="ebook-cover magazine-official-art">'+
 '<img data-magazine-publisher-icon src="'+esc(mag.icon)+'" alt="Official '+esc(mag.title)+' publisher icon" loading="lazy" decoding="async" hidden>'+
 '<div data-magazine-brand><small>ORIGINAL PUBLISHER</small><strong>'+esc(mag.title)+'</strong><span>'+esc(mag.publisher)+'</span></div></div>'+
 '<div class="ebook-result-copy"><p class="ebook-kicker">📰 MAGAZINE · '+esc(mag.region==='GLOBAL'?'Worldwide':mag.region)+'</p>'+
 '<h3>'+esc(mag.title)+'</h3><p class="ebook-author">Published by '+esc(mag.publisher)+'</p>'+
 '<p class="ebook-summary">'+esc(mag.summary)+'</p>'+
 '<p class="magazine-original-note">Original issue covers, editions and current prices are available at the publisher. This identity tile does not imitate an issue cover.</p>'+
 '<div class="ebook-source-groups"><div><h4>Original issues and covers</h4><div class="ebook-provider-row">'+
 '<a class="ebook-provider" href="'+esc(mag.issues)+'" target="_blank" rel="noopener noreferrer" data-ebook-provider="Official issues">Original covers &amp; issues ↗</a></div></div>'+
 (p.access==='paid'?'':'<div><h4>Legally free publisher pages</h4><div class="ebook-provider-row">'+
 '<a class="ebook-provider ebook-free" href="'+esc(mag.site)+'" target="_blank" rel="noopener noreferrer" data-ebook-provider="Publisher free articles">Publisher articles ↗</a></div>'+
 '<p class="ebook-rights">Free articles vary. This is not a free full-issue download, and some articles may require a subscription.</p></div>')+
 '<div><h4>Purchase &amp; subscriptions</h4><div class="ebook-provider-row">'+links+'</div>'+
 (tagged?'<p class="ebook-rights">'+esc(affiliate.disclosure(lang()))+'</p>':'')+
 '<p class="ebook-rights">Amazon is a search, not a verified issue, current price, or guaranteed affiliate commission.</p></div></div>'+
 '<div class="ebook-result-actions"><button type="button" class="ebook-save" data-ebook-save="'+esc(mag.id)+'">☆ '+esc(tr('save'))+'</button>'+
 '<button type="button" class="ebook-nope" data-ebook-nope="'+esc(mag.id)+'">× '+esc(tr('nope'))+'</button>'+
 '<button type="button" class="ebook-rematch" data-ebook-rematch>↻ '+esc(tr('another'))+'</button></div></div></div>';
 const img=host.querySelector('[data-magazine-publisher-icon]');
 const fallback=host.querySelector('[data-magazine-brand]');
 if(img){
  img.onload=()=>{if(img.naturalWidth>0){img.hidden=false;fallback.hidden=true}};
  img.onerror=()=>{img.hidden=true;fallback.hidden=false};
  if(img.complete&&img.naturalWidth>0){img.hidden=false;fallback.hidden=true}
 }
 host.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'});
 analytics('ebook_match_reveal',{ebook_id:mag.id,ebook_title:mag.title,ebook_access:p.access,ebook_format:'magazine'});
}
function renderResult(root,book,p,relaxed,audio,magazine){
 if(magazine){renderMagazineResult(root,book,p);return;}
 const host=root.querySelector('[data-ebook-result]');
 const free=freeLinks(book),stores=storeLinks(book);
 const aff=window.MatchAppEbookAffiliate,paid=!!(aff&&stores.some(([,u])=>aff.isAffiliateLink(u)));
 host.hidden=false;
 host.innerHTML='<div class="ebook-result-grid">'+
  '<div class="ebook-cover"><img data-ebook-cover alt="" hidden><div data-ebook-cover-fallback>'+coverFallback(book)+'</div></div>'+
  '<div class="ebook-result-copy"><p class="ebook-kicker">'+esc(book.year)+' · '+esc(book.genres.join(' · '))+'</p><h3>'+esc(book.title)+'</h3><p class="ebook-author">by '+esc(book.author)+'</p><p class="ebook-summary">'+esc(book.summary)+'</p>'+
  '<div class="ebook-why"><strong>'+esc(tr('why'))+'</strong><span>'+esc(why(book,p,relaxed))+'</span></div>'+
  '<div class="ebook-meta"><span>'+esc(book.length)+' read</span><span>'+esc(book.pace)+' pace</span><span>'+(book.access.includes('free')?'free option + stores':'paid stores')+'</span></div>'+
  '<div class="ebook-source-groups">'+
   (free.length?'<div><h4>'+esc(tr('free'))+'</h4><div class="ebook-provider-row">'+free.map(([n,u])=>'<a class="ebook-provider ebook-free" href="'+esc(u)+'" target="_blank" rel="noopener noreferrer" data-ebook-provider="'+esc(n)+'">'+esc(n)+' ↗</a>').join('')+'</div></div>':'')+
   '<div><h4>'+esc(tr('stores'))+'</h4><div class="ebook-provider-row">'+stores.map(([n,u])=>{const tagged=!!(aff&&aff.isAffiliateLink(u));return '<a class="ebook-provider" href="'+esc(u)+'" target="_blank" rel="'+(tagged?'sponsored ':'')+'noopener noreferrer" data-ebook-provider="'+esc(n)+'"'+(tagged?' data-ebook-affiliate="amazon-br"':'')+'>'+esc(n)+(tagged?' · '+esc(aff.paidLabel(lang())):'')+' ↗</a>'}).join('')+'</div>'+(paid?'<p class="ebook-rights">'+esc(aff.disclosure(lang()))+'</p>':'')+'</div>'+
   '<a class="ebook-preview-link" href="'+esc(bookInfo(book))+'" target="_blank" rel="noopener noreferrer" data-ebook-provider="Google Books">'+esc(tr('preview'))+' ↗</a>'+
  '</div>'+
  '<div class="ebook-audio" data-ebook-audio aria-live="polite"><h4>🎧 '+esc(tr('audioTitle'))+'</h4><p class="ebook-audio-note">'+esc(tr('audioOnly'))+'</p>'+
    '<div data-ebook-audio-options></div>'+
    (audio?'':'<button type="button" class="ebook-audio-check" data-ebook-check-audio="'+esc(book.id)+'">'+esc(tr('audioVerify'))+'</button>')+
  '</div>'+
  '<div class="ebook-result-actions"><button type="button" class="ebook-save" data-ebook-save="'+esc(book.id)+'">☆ '+esc(tr('save'))+'</button><button type="button" class="ebook-nope" data-ebook-nope="'+esc(book.id)+'">× '+esc(tr('nope'))+'</button><button type="button" class="ebook-rematch" data-ebook-rematch>↻ '+esc(tr('another'))+'</button></div>'+
  '</div></div>';
 const img=host.querySelector('[data-ebook-cover]'),fall=host.querySelector('[data-ebook-cover-fallback]');
 hydrateCover(book,img,fall,audio);
 if(audio)paintAudio(root,book,audio);
 host.scrollIntoView({behavior:(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)?'auto':'smooth',block:'nearest'});
 analytics('ebook_match_reveal',{ebook_id:book.id,ebook_title:book.title,ebook_access:p.access,ebook_format:p.format,relaxed:!!relaxed});
}
async function doMatch(root){
 // One in-flight search includes source preflight and shared Match allowance.
 // Double taps in every format must never charge a second credit.
 if(root.dataset.audioBusy==='1')return;
 root.dataset.audioBusy='1';
 root.querySelectorAll('[data-ebook-match],[data-ebook-rematch]').forEach(b=>b.disabled=true);
 const p=prefs(),note=root.querySelector('[data-ebook-note]');
 try{
  let pick;
  if(p.format==='audiobook'){
   if(note){note.hidden=false;note.textContent=tr('audioWaiting')}
   pick=await chooseVerifiedAudio(p,(tried,total)=>{
    if(note?.isConnected)note.textContent=tr('audioWaiting')+' ('+tried+'/'+total+')';
   });
  }else if(p.format==='magazine')pick=chooseMagazine(p);
  else pick=choose(p);
  if(!pick){if(note){note.hidden=false;note.textContent=p.format==='audiobook'?tr('audioEmpty'):tr('empty')}return;}
  // If no authentic source was found, spend nothing.
  if(typeof window.checkDailyLimit!=='function'){
   if(window.showToast)window.showToast('E-book matching is available from the main MatchApp experience.',true);
   return;
  }
  const allowed=await window.checkDailyLimit();
  if(!allowed)return;
  if(note){note.hidden=!pick.relaxed;note.textContent=pick.relaxed?tr('empty'):''}
  const seen=uniq(read(K.seen).concat(pick.book.id)).slice(-300);write(K.seen,seen);
  renderResult(root,pick.book,p,pick.relaxed,pick.audio||null,pick.magazine===true);
 }catch(e){
  console.warn('[MatchApp E-books] Match/source error:',e);
  if(note){note.hidden=false;note.textContent=tr(p.format==='audiobook'?'audioEmpty':'empty')}
 }finally{
  root.dataset.audioBusy='0';
  root.querySelectorAll('[data-ebook-match],[data-ebook-rematch]').forEach(b=>b.disabled=false);
 }
}
function bind(root){
 root.addEventListener('click',async e=>{
  const chip=e.target.closest('[data-ebook-field]');
  if(chip){
   const p=prefs();p[chip.dataset.ebookField]=chip.dataset.ebookValue;savePrefs(p);
   root.querySelectorAll('[data-ebook-field="'+chip.dataset.ebookField+'"]').forEach(b=>{const on=b.dataset.ebookValue===chip.dataset.ebookValue;b.classList.toggle('is-on',on);b.setAttribute('aria-pressed',String(on))});
   return;
  }
  const audioCheck=e.target.closest('[data-ebook-check-audio]');
  if(audioCheck){
   const book=CAT().find(b=>b.id===audioCheck.dataset.ebookCheckAudio);
   if(!book||typeof window.MatchAppAudiobooks?.verify!=='function')return;
   audioCheck.disabled=true;audioCheck.textContent=tr('audioWaiting');
   const audio=await window.MatchAppAudiobooks.verify(book,market(),'any');
   paintAudio(root,book,audio);
   return;
  }
  if(e.target.closest('[data-ebook-match]')){e.preventDefault();await doMatch(root);return;}
  if(e.target.closest('[data-ebook-rematch]')){e.preventDefault();await doMatch(root);return;}
  const savedAudio=e.target.closest('[data-ebook-saved-audio]');
  if(savedAudio){
   const book=CAT().find(b=>b.id===savedAudio.dataset.ebookSavedAudio);
   const host=savedAudio.closest('article')?.querySelector('[data-ebook-saved-audio-result]');
   if(!book||!host||typeof window.MatchAppAudiobooks?.verify!=='function')return;
   savedAudio.disabled=true;savedAudio.textContent=tr('audioWaiting');
   try{
    const audio=await window.MatchAppAudiobooks.verify(book,market(),'any');
    host.innerHTML=audioLinksHTML(audio);
   }finally{savedAudio.textContent=tr('audioVerify');savedAudio.disabled=false}
   return;
  }
  const save=e.target.closest('[data-ebook-save]');
  if(save){const id=save.dataset.ebookSave;write(K.saved,uniq(read(K.saved).concat(id)));save.textContent='★ '+tr('saved');save.disabled=true;renderSaved(root);cloudSync();analytics('ebook_save',{ebook_id:id});return;}
  const nope=e.target.closest('[data-ebook-nope]');
  if(nope){const id=nope.dataset.ebookNope;write(K.disliked,uniq(read(K.disliked).concat(id)));cloudSync();analytics('ebook_not_for_me',{ebook_id:id});await doMatch(root);return;}
  const rm=e.target.closest('[data-ebook-remove]');
  if(rm){write(K.saved,read(K.saved).filter(x=>x!==rm.dataset.ebookRemove));renderSaved(root);cloudSync();return;}
  const provider=e.target.closest('[data-ebook-provider]');
  if(provider){
   analytics('ebook_provider_click',{provider:provider.dataset.ebookProvider});
   if(provider.dataset.ebookAffiliate==='amazon-br')analytics('ebook_affiliate_click',{provider:'Amazon Brazil',surface:provider.closest('.ebook-top-card')?'top_ebooks':'ebook_match'});
  }
 });
}
function markup(){
 const p=prefs();
 // The dedicated reading hub remains expanded; adult Home starts as a compact disclosure.
 const initiallyOpen=!(document.body.classList.contains('page-home')||location.pathname==='/'||location.pathname==='/index.html')||location.hash==='#ebook-matcher-root';
 const field=(key,label)=>'<fieldset class="ebook-field"><legend>'+label+'</legend><div class="ebook-chips">'+optionButtons(key,p[key])+'</div></fieldset>';
 return '<details class="ebook-fold"'+(initiallyOpen?' open':'')+'><summary><span class="ebook-summary-icon" aria-hidden="true">📚✦</span><span><small>'+esc(tr('eyebrow'))+'</small><strong>'+esc(tr('title'))+'</strong></span><span class="ebook-chevron" aria-hidden="true">⌄</span></summary>'+
 '<div class="ebook-panel"><div class="ebook-intro"><div><h2>'+esc(tr('title'))+'</h2><p>'+esc(tr('intro'))+'</p></div><a href="/ebooks/" class="ebook-guide-link">Bookworms hub ↗</a></div>'+
 '<div class="ebook-fields">'+field('mood','How should it feel?')+field('genre','Genre')+field('pace','Reading pace')+field('length','Length')+field('era','Era')+field('access','Access')+field('format','Reading, listening or magazines')+'</div>'+
 '<div class="ebook-match-row"><button type="button" class="ebook-match-cta" data-ebook-match>📚🎧 '+esc(tr('match'))+'</button><span>'+esc(tr('quota'))+'</span></div>'+
 '<p class="ebook-note" data-ebook-note hidden></p><section class="ebook-result" data-ebook-result hidden aria-live="polite"></section>'+
 '<section class="ebook-top-section" aria-labelledby="ebook-top-title"><div class="ebook-top-head"><div><small>BOOKWORMS PICKS</small><h3 id="ebook-top-title">'+esc(tr('topTitle'))+'</h3><p>'+esc(tr('topSub'))+'</p></div><span>Updated Sep 24, 2026</span></div><div class="ebook-top-rail" data-ebook-top></div></section>'+
 '<details class="ebook-saved"><summary>★ '+esc(tr('savedBooks'))+' <span data-ebook-saved-count>0</span></summary><div data-ebook-saved-list></div></details>'+
 '<p class="ebook-rights">'+esc(tr('rights'))+'</p></div></details>';
}
// Ask AI deep links retain the selected reading medium rather than defaulting
// magazine and audiobook users to the regular e-book-only selector.
function consumeReadingDeepLink(){
 try{
  const url=new URL(location.href),format=url.searchParams.get('reading');
  if(!['ebook','audiobook','magazine'].includes(format))return'';
  const p=prefs();p.format=format;savePrefs(p);
  url.searchParams.delete('reading');
  history.replaceState(history.state,'',url.pathname+url.search+url.hash);
  return format;
 }catch(_){return''}
}
async function mount(){
 const requestedFormat=consumeReadingDeepLink();
 let root=document.getElementById('ebook-matcher-root');
 if(!root){
  root=document.createElement('section');root.id='ebook-matcher-root';root.className='ebook-matcher-root';
  const anchor=document.getElementById('search-box')||document.getElementById('questionnaire-box');
  if(anchor)anchor.insertAdjacentElement('afterend',root);else(document.querySelector('main')||document.body).appendChild(root);
 }
 // Defensive recovery for already-cached Home HTML: this belongs after Ask AI,
 // not between the watch questionnaire and its loading/result components.
 if(document.body.classList.contains('page-home')){
  const search=document.getElementById('search-box');
  if(search&&root.previousElementSibling!==search)search.insertAdjacentElement('afterend',root);
 }
 if(root.dataset.ebookMounted==='1')return;
 root.dataset.ebookMounted='1';root.innerHTML=markup();bind(root);renderTop(root);await cloudHydrate();renderSaved(root);
 if(location.hash==='#ebook-matcher-root')requestAnimationFrame(()=>root.scrollIntoView({behavior:'auto',block:'start'}));
 // Reveal collapsed Home controls when an already open page receives a reading deep link.
 window.addEventListener('hashchange',()=>{if(location.hash!=='#ebook-matcher-root')return;const fold=root.querySelector('.ebook-fold');if(fold)fold.open=true;root.scrollIntoView({behavior:'auto',block:'start'});});
 document.addEventListener('matchapp:langchange',()=>{const open=root.querySelector('.ebook-fold')?.open;root.innerHTML=markup();/* root delegated click handler already installed: re-binding duplicated network lookups and Match credits after language changes. */renderTop(root);renderSaved(root);const fold=root.querySelector('.ebook-fold');if(fold)fold.open=open!==false;if(root.dataset.audioBusy==='1')root.querySelectorAll('[data-ebook-match],[data-ebook-rematch]').forEach(b=>b.disabled=true);});
}
window.MatchAppEbooks={match:()=>{const r=document.getElementById('ebook-matcher-root');return r?doMatch(r):null},saved:()=>read(K.saved).slice(),disliked:()=>read(K.disliked).slice()};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
