/* MatchApp E-books Ai — grown-up ebook matcher.
   Separate from movie/TV matching so book discovery cannot mutate CONTENT_CATALOG.
   Legal-source rule: MatchApp never hosts copyrighted ebook files. */
(function(){
'use strict';
if((location.pathname||'').toLowerCase().startsWith('/kids'))return;
const stateOnly=document.currentScript?.dataset?.readingStateOnly==='1';
if(stateOnly&&window.MatchAppEbooks?.ready)return;

const CAT=()=>window.MatchAppContentSafety?.safeEntries?.(window.MATCHAPP_EBOOK_CATALOG)|| (Array.isArray(window.MATCHAPP_EBOOK_CATALOG)?window.MATCHAPP_EBOOK_CATALOG:[]);
const MAG=()=>window.MatchAppContentSafety?.safeEntries?.(window.MatchAppMagazines?.items)||window.MatchAppMagazines?.items||[];
const K={saved:'match_ebook_saved_v1',disliked:'match_ebook_disliked_v1',seen:'match_ebook_seen_v1',prefs:'match_ebook_criteria_v1'};
const READING_OWNER='match_ebook_owner_v1';
let readingOwner='guest';
try{readingOwner=localStorage.getItem(READING_OWNER)||localStorage.getItem('match_portfolio_owner')||'guest';}catch(_){}
let readingEpoch=0,readingHydrating=null,readingFlushing=null;
const readingClaims=new Map();
const guestReadingClaimsKey='match_ebook_guest_claims_v1';
const readingMemory=new Map(),unwritableReading=new Set(),importedOwners=new Set();
const pendingKey=owner=>'match_ebook_pending_v2_'+owner;
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
 en:{eyebrow:'FOR BOOKWORMS',title:'Match E-books Ai',homeTitle:'Find what to read here',topFold:'Browse top e-books',intro:'Pick a reading or listening mood. MatchApp matches a book and checks real audio editions in your country, with legal free sources and official stores.',match:'Match my e-book',another:'Match another',save:'Save book',saved:'Saved',nope:'Not for me',why:'Why this match',where:'Where to get it',free:'Legal free editions',stores:'Official e-book stores',preview:'Book info / preview',rights:'Free-edition availability depends on copyright rules in your country. MatchApp links to source pages and never hosts copyrighted book files.',empty:'No exact new match; MatchApp suggests the closest source-catalogued options and explains differences.',quota:'Your MatchApp match allowance is used here too.',savedBooks:'Saved books & audiobooks',noneSaved:'No saved books yet.',remove:'Remove',close:'Close',topTitle:'Top E-books right now',topSub:'Current reader favorites and chart leaders — open an official store or a legal free-edition source.',topFree:'Free edition',topBuy:'Get this e-book',topSource:'Chart source',audioTitle:'Audiobook editions',audioVerify:'Check verified audiobook edition',audioWaiting:'Checking exact title and author at official audio sources…',audioNone:'No matching audio edition was verified. Official store searches may still help.',audioLinks:'Verified audiobook editions',audioSearch:'Search other audio stores (edition not confirmed)',audioRights:'Free LibriVox recordings are US public domain. Outside the US, check your local copyright law before listening or downloading.',audioEmpty:'No verified audiobook passed your filters right now. Try e-book format, broader filters, or official audio stores.',audioOnly:'Verified audio required · availability varies by country'},
 'pt-BR':{eyebrow:'PARA BOOKWORMS',title:'Match de E-books iA',homeTitle:'Encontre o que ler aqui',topFold:'Ver e-books em destaque',intro:'Escolha o clima de leitura ou de escuta. O MatchApp encontra livros e verifica audiolivros reais no seu país, com fontes legais e lojas oficiais.',match:'Encontrar meu e-book',another:'Outro e-book',save:'Salvar livro',saved:'Salvo',nope:'Não é para mim',why:'Por que combina',where:'Onde encontrar',free:'Edições grátis legais',stores:'Lojas oficiais de e-books',preview:'Informações / prévia',rights:'A disponibilidade gratuita depende das leis de direitos autorais do seu país. O MatchApp só direciona para fontes oficiais e não hospeda arquivos protegidos.',empty:'Sem resultado novo exato: o MatchApp mostra alternativas reais e indica os critérios diferentes.',quota:'Usa a mesma cota de matches do MatchApp.',savedBooks:'Livros e audiolivros salvos',noneSaved:'Nenhum livro salvo ainda.',remove:'Remover',close:'Fechar',topTitle:'Top E-books agora',topSub:'Favoritos atuais e líderes de listas — abra uma loja oficial ou uma fonte legal de edição gratuita.',topFree:'Edição grátis',topBuy:'Encontrar e-book',topSource:'Fonte da lista',audioTitle:'Edições em audiolivro',audioVerify:'Verificar edição em audiolivro',audioWaiting:'Verificando título e autor exatos nas fontes oficiais…',audioNone:'Não foi possível confirmar esta edição em áudio. Buscas nas lojas oficiais podem ajudar.',audioLinks:'Audiolivros confirmados',audioSearch:'Pesquisar outras lojas de áudio (edição não confirmada)',audioRights:'As gravações da LibriVox são de domínio público nos EUA. Em outros países, confira os direitos autorais antes de ouvir ou baixar.',audioEmpty:'Nenhum audiolivro confirmado passou nos filtros agora. Tente e-books, filtros mais amplos ou as lojas oficiais.',audioOnly:'Áudio confirmado obrigatório · a disponibilidade varia por país'},
 es:{eyebrow:'PARA BOOKWORMS',title:'Match E-books IA',homeTitle:'Encuentra qué leer aquí',topFold:'Explorar e-books destacados',intro:'Elige el ambiente para leer o escuchar. MatchApp encuentra libros y verifica ediciones de audiolibro en tu país, con fuentes legales y tiendas oficiales.',match:'Encontrar mi e-book',another:'Otro e-book',save:'Guardar libro',saved:'Guardado',nope:'No es para mí',why:'Por qué encaja',where:'Dónde conseguirlo',free:'Ediciones gratuitas legales',stores:'Tiendas oficiales',preview:'Información / vista previa',rights:'La disponibilidad gratuita depende del copyright de tu país. MatchApp no aloja archivos protegidos.',empty:'Sin coincidencia exacta nueva: mostramos opciones del catálogo e indicamos los filtros diferentes.',quota:'Usa la misma cuota de matches de MatchApp.',savedBooks:'Libros y audiolibros guardados',noneSaved:'Aún no hay libros guardados.',remove:'Quitar',close:'Cerrar',topTitle:'Top E-books ahora',topSub:'Favoritos actuales y líderes de listas — abre una tienda oficial o una fuente legal de edición gratuita.',topFree:'Edición gratis',topBuy:'Conseguir e-book',topSource:'Fuente de la lista',audioTitle:'Ediciones de audiolibro',audioVerify:'Verificar edición en audio',audioWaiting:'Comprobando título y autor exactos…',audioNone:'No se confirmó una edición en audio. Puedes buscar en las tiendas oficiales.',audioLinks:'Audiolibros confirmados',audioSearch:'Buscar en otras tiendas de audio (edición sin confirmar)',audioRights:'Las grabaciones de LibriVox son de dominio público en EE. UU. En otros países, comprueba los derechos de autor.',audioEmpty:'Ningún audiolibro confirmado cumple estos filtros ahora. Prueba otro formato o fuentes oficiales.',audioOnly:'Se requiere audio confirmado · disponibilidad regional'},
 ja:{eyebrow:'本好きのために',title:'E-books Ai マッチ',homeTitle:'読みたい本を見つける',topFold:'注目の電子書籍',intro:'読書・朗読を聴きたい気分に合わせて本を選び、正規ストアで音声版のタイトル・著者を確認します。',match:'E-bookをマッチ',another:'別の本',save:'保存',saved:'保存済み',nope:'好みではない',why:'おすすめの理由',where:'入手先',free:'合法的な無料版',stores:'公式E-bookストア',preview:'書籍情報 / プレビュー',rights:'無料で利用できるかは各国の著作権法によって異なります。MatchApp は著作権保護されたファイルをホストしません。',empty:'完全一致がない場合、条件に近い候補と異なる条件を表示します。',quota:'通常のMatchAppマッチ枠を使用します。',savedBooks:'保存した本・オーディオブック',noneSaved:'保存した本はまだありません。',remove:'削除',close:'閉じる',topTitle:'今人気のE-book',topSub:'現在の人気作品とランキング上位作品。公式ストアまたは合法的な無料版へ移動できます。',topFree:'無料版',topBuy:'E-bookを入手',topSource:'ランキング出典',audioTitle:'オーディオブック版',audioVerify:'音声版を確認する',audioWaiting:'公式ストアで同一タイトルと著者を確認中…',audioNone:'音声版を確認できませんでした。公式ストアで検索できます。',audioLinks:'確認済みオーディオブック',audioSearch:'他のオーディオストアで検索（未確認）',audioRights:'LibriVox は米国内でパブリックドメインです。他の国では著作権をご確認ください。',audioEmpty:'条件を満たす確認済み音声版がありません。読書形式や検索条件を変更してください。',audioOnly:'確認済み音声版のみ・国によって異なります'}
};
const FALLBACK_COPY={
 en:{closest:'Closest available source match.',miss:'Not matched:',recycled:'Previously suggested because no fresh, compatible title remains.',unsupported:'Magazine publishers do not confirm:',browse:'No unexcluded catalogued title remains. Browse these source searches instead; results are not verified matches and no credit is used.',bookProfile:'Closest source-catalogued book profile; audio edition not verified.',freeCheck:'These links search legitimate catalogues. A free edition and local copyright eligibility must still be checked.',sourceCheck:'Source searches (results unverified)'},
 'pt-BR':{closest:'Opção mais próxima no catálogo.',miss:'Critérios não atendidos:',recycled:'Já sugerido antes porque não restaram títulos novos compatíveis.',unsupported:'Editoras não confirmam os seguintes dados:',browse:'Não restam títulos do catálogo que você não excluiu. Consulte estas buscas externas; os resultados não estão verificados e nenhum crédito foi usado.',bookProfile:'Livro do catálogo mais próximo das preferências; edição em áudio não confirmada.',freeCheck:'Estes links pesquisam catálogos legítimos. Confirme a edição grátis e os direitos autorais no seu país.',sourceCheck:'Buscas em fontes (resultados não confirmados)'},
 es:{closest:'Opción más cercana en el catálogo.',miss:'Criterios no cumplidos:',recycled:'Ya recomendado; no quedan títulos nuevos compatibles.',unsupported:'No se confirman estos datos de las revistas:',browse:'No quedan títulos no excluidos en el catálogo. Consulta estas búsquedas externas; los resultados no están verificados y no se consumió ningún crédito.',bookProfile:'Libro del catálogo más cercano; edición en audio no verificada.',freeCheck:'Estos enlaces buscan en catálogos legítimos. Comprueba la edición gratuita y los derechos locales.',sourceCheck:'Búsquedas de fuentes (resultados sin verificar)'},
 ja:{closest:'条件に最も近いカタログ候補です。',miss:'一致しなかった条件:',recycled:'新しい候補がないため以前の作品を再提案しています。',unsupported:'雑誌について確認できない項目:',browse:'除外されていない候補が残っていません。以下の公式ソースを検索してください。未検証の検索結果であり、マッチ枠は消費しません。',bookProfile:'条件に近い書籍です。音声版の在庫は未確認です。',freeCheck:'公式カタログの検索リンクです。無料版とお住まいの国の著作権を確認してください。',sourceCheck:'ソース検索（結果未確認）'}
};
function fallbackCopy(key){return window.MatchAppBooksLocale?window.MatchAppBooksLocale.t('fallback.'+key):(FALLBACK_COPY[lang()]||FALLBACK_COPY.en)[key]||FALLBACK_COPY.en[key]}
function selectionName(p,key){
 const item=FIELDS[key]?.find(opt=>opt[0]===p[key]);
 return item?choice(key,item[0]):String(p[key]||key);
}
function matchNote(p,pick){
 if(!pick)return'';
 const missing=Array.isArray(pick.mismatched)?pick.mismatched:[];
 const unsupported=p.format==='magazine'?['pace','length','era'].filter(key=>p[key]!=='any'):[];
 const notes=[];
 if(missing.length)notes.push(fallbackCopy('closest')+' '+fallbackCopy('miss')+' '+missing.map(key=>selectionName(p,key)).join(', ')+'.');
 if(unsupported.length)notes.push(fallbackCopy('unsupported')+' '+unsupported.map(key=>selectionName(p,key)).join(', ')+'.');
 if(pick.recycled)notes.push(fallbackCopy('recycled'));
 return notes.join(' ');
}
function discoverySearches(p,book){
 const term=book?book.title+' '+book.author:[p.genre,p.mood].filter(x=>x&&x!=='any').join(' ')||'books';
 const q=encodeURIComponent(term),audio=p.format==='audiobook',region=market();
 if(audio&&p.access==='free')return[
   [ui('libriVoxSearch','LibriVox (US rights; check locally)'),'https://librivox.org/search?q='+q],
   [ui('worldcatAudio','WorldCat (check local library audio)'),'https://search.worldcat.org/search?q='+q]
 ];
 if(audio){
  const storefront=window.MatchAppAudiobooks?.appleStorefront?.(region)||'';
  const sources=window.MatchAppAudiobooks?.sourceSearches?.(book||{title:term,author:''},region)||[];
  return sources.map(s=>[s.label,s.url]).concat(storefront?
    [['Apple Books','https://books.apple.com/'+storefront+'/search?term='+q]]:[]);
 }
 if(p.format==='magazine')return[
   [ui('magazinePublisherSearch','Search official magazine publishers'),'https://www.google.com/search?q='+encodeURIComponent(term+' magazine official publisher')],
   [ui('worldcatMagazines','WorldCat magazine catalogues'),'https://search.worldcat.org/search?q='+encodeURIComponent(term+' magazine')]
 ];
 if(p.access==='free')return[
   ['Project Gutenberg','https://www.gutenberg.org/ebooks/search/?query='+q],
   ['Standard Ebooks','https://standardebooks.org/ebooks?query='+q],
   ['Open Library','https://openlibrary.org/search?q='+q+'&mode=ebooks']
 ];
 return[
   ['Google Books','https://books.google.com/books?q='+q],
   ['Apple Books',appleBookSearch(region,q)]
 ];
}
function renderReadingDiscovery(root,p){
 const host=root.querySelector('[data-ebook-result]');if(!host)return;
 const links=discoverySearches(p,null);
 host.hidden=false;
 host.innerHTML='<div class="ebook-result-copy ebook-audio-discovery"><h3>📚 '+esc(fallbackCopy('sourceCheck'))+'</h3>'+
   '<p class="ebook-audio-note">'+esc(fallbackCopy('browse'))+'</p>'+
   chooseCountryLink()+
   '<div class="ebook-provider-row">'+links.map(([name,url])=>'<a class="ebook-provider" href="'+esc(url)+
      '" target="_blank" rel="noopener noreferrer">'+esc(name)+' ↗</a>').join('')+'</div>'+
   '<p class="ebook-rights">'+esc(tr('rights'))+'</p></div>';
 localize(root);
 host.scrollIntoView?.({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'});
}
function lang(){if(window.MatchAppBooksLocale)return window.MatchAppBooksLocale.lang();let saved='';try{saved=localStorage.getItem('match_lang')||'';}catch(_){}const raw=String(saved||window.MATCH_LANG||document.documentElement.lang||navigator.language||'en').toLowerCase();if(/^pt/.test(raw))return'pt-BR';const base=raw.split('-')[0];return ['en','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'].includes(base)?base:'en';}
function tr(k){if(window.MatchAppBooksLocale)return window.MatchAppBooksLocale.t('ui.'+k);const l=LABELS[lang()]||LABELS.en;return l[k]||LABELS.en[k]||k;}
function ui(key,english,params){if(window.MatchAppBooksLocale)return window.MatchAppBooksLocale.t('ui.'+key,params);return String(english).replace(/\{(\w+)\}/g,(all,name)=>params?.[name]===undefined?all:String(params[name]));}
function choice(field,value){return window.MatchAppBooksLocale?window.MatchAppBooksLocale.choice(field,value):(FIELDS[field]?.find(row=>row[0]===value)?.[2]||String(value||''));}
function genre(value){return window.MatchAppBooksLocale?.genreToken(value)||String(value||'');}
function sourceSummary(book){return '<small class="ebook-source-language" data-book-copy="ui.sourceEnglish">'+esc(ui('sourceEnglish','Original description · English'))+'</small><p class="ebook-summary" lang="en" data-book-source-content>'+esc(book.summary)+'</p>';}
function fieldLabel(key,english){return window.MatchAppBooksLocale?window.MatchAppBooksLocale.t('field.'+key+'.label'):english;}
function paintNote(note,render){if(!note)return;note.__bookCopy=render;const text=render();if(note.textContent!==text){if(note.childNodes.length===1&&note.firstChild.nodeType===3)note.firstChild.nodeValue=text;else note.textContent=text;}}

function read(key){try{if(!unwritableReading.has(key)){const v=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(v)?v:[]}}catch(_){}return readingMemory.get(key)||[];}
function write(key,v){
 const put=name=>{readingMemory.set(name,v);try{const value=JSON.stringify(v);localStorage.setItem(name,value);if(localStorage.getItem(name)!==value)throw Error('Reading history unavailable');unwritableReading.delete(name);return true;}catch(_){unwritableReading.add(name);return false;}};
 const stored=put(key),owned=[K.saved,K.disliked,K.seen].includes(key)?put(key+'_owner_'+readingOwner):true;
 return stored&&owned;
}
function switchReadingOwner(next){
 next=next||'guest';
 if(next===readingOwner)return;
 const previous=readingOwner;
 const guestPending=previous==='guest'?read(pendingKey(previous)):[];
 const current=Object.fromEntries([K.saved,K.disliked,K.seen].map(k=>[k,read(k)]));
 for(const k of Object.keys(current))try{localStorage.setItem(k+'_owner_'+previous,JSON.stringify(current[k]))}catch(_){}
 readingOwner=next;
 readingEpoch++;
 for(const k of Object.keys(current)){
  const owned=read(k+'_owner_'+next);
  // The first signed-in account may adopt this browser's guest choices;
  // later accounts must never inherit another member's reading portfolio.
  write(k,uniq(owned.concat(previous==='guest'&&next!=='guest'?current[k]:[])));
 }
 try{localStorage.setItem(READING_OWNER,next)}catch(_){}
 if(previous==='guest'&&next!=='guest'&&guestPending.length){
  write(pendingKey(next),read(pendingKey(next)).concat(guestPending));
  try{localStorage.removeItem(pendingKey(previous))}catch(_){}
 }
 if(previous==='guest'&&next!=='guest')for(const k of Object.keys(current))try{localStorage.removeItem(k+'_owner_guest')}catch(_){}
}
const BOOK_CONFLICTS={cozy:['thriller','horror','true-crime','dystopian'],funny:['thriller','horror','true-crime'],hopeful:['horror','true-crime']};
function bookIncompatible(field,value,p){
 const mood=field==='mood'?value:p.mood,genre=field==='genre'?value:p.genre;
 return (BOOK_CONFLICTS[mood]||[]).includes(genre);
}
function normalizeBookPrefs(p){if(bookIncompatible('genre',p.genre,p))p.genre='any';return p}
function prefs(){try{return normalizeBookPrefs(Object.assign({mood:'any',genre:'any',pace:'any',length:'any',era:'any',access:'any',format:'any'},JSON.parse(localStorage.getItem(K.prefs)||'{}')))}catch(_){return{mood:'any',genre:'any',pace:'any',length:'any',era:'any',access:'any',format:'any'}}}
function savePrefs(v){normalizeBookPrefs(v);try{localStorage.setItem(K.prefs,JSON.stringify(v))}catch(_){}}
function uniq(v){return [...new Set(v.filter(Boolean))]}
function idset(key){return new Set(read(key))}
function market(){
 const country=window.MatchAppCountry||window.MatchAppCatalogMedia;
 if(typeof country?.regionCode==='function')return country.regionCode()||'';
 let saved='';
 try{saved=String(localStorage.getItem('match_user_country')||'').trim().toLowerCase()}catch(_){return ''}
 // A chosen country is independent of app language and book origin.
 return {br:'BR',brazil:'BR',brasil:'BR',gb:'GB',uk:'GB','united kingdom':'GB',
  ca:'CA',canada:'CA',au:'AU',australia:'AU',jp:'JP',japan:'JP',
  pt:'PT',portugal:'PT',us:'US','united states':'US',usa:'US'}[saved]||'';
}
const APPLE_BOOK_MARKETS=new Set('AT AU BE BR CA CH DE DK ES FI FR GB GR IE IT JP LU NL NO NZ PT SE US'.split(' '));
function appleBookSearch(region,query){return APPLE_BOOK_MARKETS.has(region)?'https://books.apple.com/'+region.toLowerCase()+'/search?term='+query:'https://books.apple.com/';}
function chooseCountryLink(){
 if(market())return '';
 const label=ui('chooseCountry','Choose your country in your profile to check local reading and listening editions.');
 return '<p class="ebook-audio-note"><a class="ebook-provider" data-ebook-choose-country href="/profile/profile.html">'+esc(label)+'</a></p>';
}
function q(book){return encodeURIComponent(book.title+' '+book.author);}
function storeLinks(book){
 const m=market(), query=q(book);
 const amazon={BR:'amazon.com.br',GB:'amazon.co.uk',CA:'amazon.ca',AU:'amazon.com.au',JP:'amazon.co.jp',PT:'amazon.es',US:'amazon.com'}[m];
 const affiliate=window.MatchAppEbookAffiliate;
 const kindle=amazon?(affiliate?affiliate.amazonSearchUrl(book,m):'https://www.'+amazon+'/s?k='+query+'&i=digital-text'):'';
 const kobo={BR:'br/pt',GB:'gb/en',CA:'ca/en',AU:'au/en',JP:'jp/ja',PT:'pt/pt',US:'us/en'}[m];
 const links=[
  ...(kindle?[['Kindle',kindle]]:[]),
  ['Apple Books',appleBookSearch(m,query)],
  ['Google Play Books','https://play.google.com/store/search?q='+query+'&c=books'],
  ['Kobo','https://www.kobo.com/'+(kobo?kobo+'/':'')+'search?query='+query]
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
 // A closest fit must never turn a gentle/funny mood into horror or a thriller.
 if((BOOK_CONFLICTS[p.mood]||[]).some(g=>book.genres.includes(g)))return false;
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
// AI orders only already-curated, criteria-compatible source records. It can
// never create a fictional book, narrating edition, purchase link or magazine.
async function rankBooks(approved,p){
 if(!Array.isArray(approved)||!approved.length)return null;
 const ranker=window.MatchAppAIRank?.rank;
 if(typeof ranker!=='function')return null;
 const set=approved.slice(0,20);
 const annotated=set.map((pick,i)=>{
    const b=pick.book;
    return {id:'c'+i,title:b.title,format:p.format,
      genres:(b.genres||[]).join(', '),mood:(b.moods||[]).join(', '),
      synopsis:b.summary||'',country:b.region||''};
 });
 const row=await ranker(annotated,{format:p.format,genre:p.genre,mood:p.mood,
   pace:p.pace,country:market(),era:p.era});
 const index=row?.id&&/^c\d+$/.test(row.id)?Number(row.id.slice(1)):-1;
 return set[index]||null;
}
// Always try exact, fresh catalogued works first. With no exact fit,
// score close matches without weakening access, safety or user exclusions.
const BOOK_SOFT_FIELDS=['mood','genre','pace','length','era'];
const BOOK_WEIGHTS={genre:80,mood:70,pace:12,length:10,era:8};
function matchesCriterion(book,p,key){
 if(!p[key]||p[key]==='any')return true;
 if(key==='mood')return Array.isArray(book.moods)&&book.moods.includes(p.mood);
 if(key==='genre')return Array.isArray(book.genres)&&book.genres.includes(p.genre);
 return book[key]===p[key];
}
function bookCandidates(p,allowSeen){
 const seen=idset(K.seen);
 return pool(p,new Set(BOOK_SOFT_FIELDS),allowSeen).map(book=>{
   const mismatched=BOOK_SOFT_FIELDS.filter(key=>!matchesCriterion(book,p,key));
   const weight=BOOK_SOFT_FIELDS.reduce((sum,key)=>sum+
     (p[key]!=='any'&&matchesCriterion(book,p,key)?BOOK_WEIGHTS[key]:0),0);
   return {book,relaxed:mismatched.length>0,recycled:allowSeen&&seen.has(book.id),
     mismatched,weight:weight+(mismatched.length===0?1000:0)};
 }).sort((a,b)=>b.weight-a.weight);
}
function bestBookChoices(p){
 // An exhausted catalogue is an uncharged source-search state. A request
 // for another match must never quietly recycle a previously shown work.
 const ranked=bookCandidates(p,false);
 if(!ranked.length)return [];
 const best=ranked[0].weight;
 return ranked.filter(row=>row.weight===best).slice(0,12);
}
function choose(p){
 const shortlisted=bestBookChoices(p);
 return shortlisted.length?shortlisted[Math.floor(Math.random()*shortlisted.length)]:null;
}
// The e-book catalogue is a set of book profiles, not a list of confirmed
// audio editions. Verify an exact commercial or eligible public-domain audio
// record before spending a match on "Audiobook only".
async function chooseVerifiedAudio(p,onProgress){
 const verify=window.MatchAppAudiobooks?.verify;
 if(typeof verify!=='function')return null;
 const country=market();
 // Do not label US public-domain audio "verified free" abroad without rights.
 if(p.access==='free'&&country!=='US')return null;
 const tested=new Set(),started=Date.now(),limit=24;
 // Search fresh compatible source records in preference order. A verified edition
 // in the selected country and access tier is mandatory before spending quota.
 for(const allowSeen of [false]){
   const options=bookCandidates(p,allowSeen).filter(row=>!tested.has(row.book.id));
   for(let offset=0;offset<options.length;offset+=4){
     if(tested.size>=limit||Date.now()-started>55000)return null;
     const batch=options.slice(offset,offset+Math.min(4,limit-tested.size));
     batch.forEach(row=>{tested.add(row.book.id);try{onProgress?.(tested.size,limit)}catch(_){}});
     const checked=await Promise.all(batch.map(async row=>{
       try{
         const audio=await verify(row.book,country,p.access);
         return audio&&((p.access==='free'&&audio.free)||
           (p.access==='paid'&&audio.apple)||
           (p.access==='any'&&(audio.apple||audio.free)))?{...row,audio}:null;
       }catch(_){return null}
     }));
     const verified=checked.filter(Boolean);
     if(verified.length)return verified.some(row=>row.relaxed||row.recycled)?verified[0]:
       (await rankBooks(verified,p)||verified[0]);
   }
 }
 return null;
}
async function chooseMagazine(p){
 const safe=MAG(),excluded=new Set([...read(K.saved),...read(K.disliked)]);
 // Magazine publisher profiles have topics and moods, but do not establish
 // issue pace, length or era. Unsupported criteria are disclosed in the note.
 for(const allowSeen of [false]){
  const seen=idset(K.seen);
  const candidates=safe.filter(m=>!excluded.has(m.id)&&(allowSeen||!seen.has(m.id))&&
    (p.access==='any'||m.access.includes(p.access)));
  if(!candidates.length)continue;
  const ranked=candidates.map(book=>{
    const mismatched=['genre','mood'].filter(k=>!matchesCriterion(book,p,k));
    const weight=(p.genre!=='any'&&book.genres.includes(p.genre)?80:0)+
      (p.mood!=='any'&&book.moods.includes(p.mood)?70:0)+
      (book.region===market()?1:0);
    return {book,magazine:true,relaxed:mismatched.length>0,
      recycled:allowSeen&&seen.has(book.id),mismatched,
      weight:weight+(mismatched.length===0?1000:0)};
  }).sort((a,b)=>b.weight-a.weight);
  const top=ranked[0].weight,shortlist=ranked.filter(row=>row.weight===top).slice(0,12);
  const localPick=shortlist[Math.floor(Math.random()*shortlist.length)];
  return shortlist.some(row=>row.relaxed||row.recycled)?localPick:(await rankBooks(shortlist,p)||localPick);
 }
 return null;
}
function why(book,p,relaxed){
 const bits=[];
 if(p.mood!=='any'&&book.moods.includes(p.mood))bits.push(choice('mood',p.mood));
 if(p.genre!=='any'&&book.genres.includes(p.genre))bits.push(choice('genre',p.genre));
 if(p.pace!=='any'&&book.pace===p.pace)bits.push(ui('paceValue','{value} pace',{value:choice('pace',book.pace)}));
 if(p.length!=='any'&&book.length===p.length)bits.push(ui('readLength','{value} read',{value:choice('length',book.length)}));
 if(!bits.length)bits.push(genre(book.genres[0]),choice('mood',book.moods[0]));
 return (relaxed?ui('closestFit','Closest catalogued fit'):ui('exactFit','Exact fit'))+' · '+bits.slice(0,3).join(' · ');
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
  if(source==='apple'){
   // Apple is a late, bounded last resort only after the established work-level
   // sources failed. It is never used for guessed music/audio edition art.
   const region=market();if(!APPLE_BOOK_MARKETS.has(region))return null;
   const u=new URL('https://itunes.apple.com/search');
   u.searchParams.set('term',book.title+' '+book.author);
   u.searchParams.set('media','ebook');u.searchParams.set('entity','ebook');
   u.searchParams.set('country',region.toLowerCase());
   u.searchParams.set('limit','10');u.searchParams.set('explicit','No');
   const d=await coverJSON(u.href);
   return window.MatchAppBookCoverIdentity?.verifiedAppleBookCoverUrl(book,d?.results,region)||null;
  }
  return null;
 })().then(url=>{if(url)BOOK_COVER_IDENTITY.set(key,url);return url})
  .catch(()=>null).finally(()=>BOOK_COVER_INFLIGHT.delete(key));
 BOOK_COVER_INFLIGHT.set(key,job);
 return job;
}
// BookDetails hydrates the same image independently. A shared, exact-source
// marker prevents generic loaded placeholders or stale errors winning a handoff.
function coverURL(img){return String(img?.currentSrc||img?.src||'')}
function prepareBookArtwork(img,book,audioURL){
 const normalize=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
 const identity=normalize(book.title)+'\n'+normalize(book.author)+(audioURL?'\naudio:'+audioURL:'');
 if(img.__matchappBookCover?.identity!==identity)img.__matchappBookCover={identity,pending:null,verified:null};
 img.alt=ui(audioURL?'audioCover':'sourceCover',audioURL?'{title} — {author} (audio edition cover)':'{title} — {author} (source cover)',{title:book.title,author:book.author});
 return img.__matchappBookCover;
}
function hasUsableCover(img){
 const state=img?.__matchappBookCover,url=coverURL(img);
 return !!(state?.verified&&state.verified===url&&img.isConnected&&!img.hidden&&img.complete&&img.naturalWidth>30&&img.style.opacity!=='0'&&img.dataset?.maFallback!=='1'&&!/^data:/i.test(url));
}
function showVerifiedCover(img,fall,url,timeout=7000,replaceURL=null,currentRun=()=>true){
 if(!url||!img?.isConnected||/^data:/i.test(url)||!currentRun())return Promise.resolve(false);
 if(hasUsableCover(img)&&coverURL(img)!==replaceURL)return Promise.resolve(true);
 const state=img.__matchappBookCover||(img.__matchappBookCover={identity:'',pending:null,verified:null});
 return new Promise(resolve=>{
  let finished=false,timer;
  const settle=good=>{
   if(finished)return;
   finished=true;clearTimeout(timer);
   if(img.onload===onLoad)img.onload=null;if(img.onerror===onError)img.onerror=null;
   const current=coverURL(img),same=img.__matchappBookCover===state&&currentRun();
   const loaded=good&&same&&img.isConnected&&current===url&&img.naturalWidth>30&&img.dataset?.maFallback!=='1';
   if(loaded){state.verified=url;state.pending=null;if(img.dataset){img.dataset.bookCoverVerified=url;delete img.dataset.bookCoverPending;delete img.dataset.maFallback}}
   const valid=hasUsableCover(img)||loaded;
   if(valid){img.hidden=false;img.style.opacity='1';if(fall)fall.hidden=true}
   else if(same&&(!state.pending||state.pending===url)){
    state.pending=null;if(img.dataset)delete img.dataset.bookCoverPending;
    img.hidden=true;img.style.opacity='0';if(fall)fall.hidden=false;
   }
   resolve(valid);
  };
  const onLoad=()=>settle(true),onError=()=>settle(false);
  img.onload=onLoad;img.onerror=onError;
  timer=setTimeout(()=>settle(false),timeout);
  const pending=state.pending===url&&coverURL(img)===url;
  state.pending=url;if(img.dataset){img.dataset.bookCoverPending=url;delete img.dataset.maFallback;delete img.dataset.bookCoverVerified}
  img.loading='eager';img.decoding='async';img.style.opacity='0';img.hidden=false;
  if(!pending)img.src=url;
  if(img.complete&&img.naturalWidth>30&&coverURL(img)===url)settle(true);
 });
}
function showExactCoverRenditions(img,fall,url,sharp){
 if(!url||!img?.isConnected||/^data:/i.test(url))return Promise.resolve(false);
 // The compact rendition is derived only from the strict verifier's 600px
 // result. All three URLs retain the exact original asset and edition path.
 let preview=null;
 if(sharp){const compact=new URL(sharp);compact.pathname=compact.pathname.replace(/\/600x600bb\.jpg$/,'/300x300bb.jpg');preview=compact.href}
 const candidates=[...new Set([sharp,preview,url].filter(Boolean))].map(src=>({src,loader:null,failed:false,ready:false}));
 const state=img.__matchappBookCover||(img.__matchappBookCover={identity:'',pending:null,verified:null});
 if(hasUsableCover(img)&&!candidates.some(item=>item.src===coverURL(img)))return Promise.resolve(true);
 state.sourceRun?.cancel?.();
 const run={active:true};state.sourceRun=run;
 if(!hasUsableCover(img))img.style.opacity='0';
 const current=()=>run.active&&img.isConnected&&img.__matchappBookCover===state&&state.sourceRun===run;
 return new Promise(resolve=>{
  let finished=false,handoff=null,displayedRank=hasUsableCover(img)?candidates.findIndex(item=>item.src===coverURL(img)):Infinity;
  const detach=()=>{if(!handoff)return;if(img.onload===handoff.onLoad)img.onload=null;if(img.onerror===handoff.onError)img.onerror=null;handoff=null};
  const finish=()=>{
   if(finished)return;finished=true;
   const same=current();let valid=same&&hasUsableCover(img);
   detach();
   // A destination cache handoff may still be pending at the deadline. Restore
   // only pixels this exact run already displayed, rather than losing its preview.
   const previous=candidates[displayedRank];
   if(same&&!valid&&previous?.ready&&!previous.failed&&state.verified===previous.src){
    img.src=previous.src;state.pending=null;
    if(img.dataset){img.dataset.bookCoverVerified=previous.src;delete img.dataset.bookCoverPending}
    img.hidden=false;img.style.opacity='1';if(fall)fall.hidden=true;valid=true;
   }
   run.active=false;clearTimeout(deadline);
   for(const candidate of candidates)if(candidate.loader){candidate.loader.onload=candidate.loader.onerror=null;candidate.loader.removeAttribute('src')}
   if(same&&!valid){
    if(candidates.some(item=>item.src===state.pending)){state.pending=null;if(img.dataset)delete img.dataset.bookCoverPending}
    img.hidden=true;img.style.opacity='0';if(fall)fall.hidden=false;
   }
   resolve(valid);
  };
  // Keep the existing finite budget; a preview never cancels the sharper work.
  const deadline=setTimeout(finish,sharp?9500:7000);run.cancel=finish;
  const present=index=>{
   const candidate=candidates[index];
   if(finished||!current()){finish();return}
   if(index>=Math.min(displayedRank,handoff?.index??Infinity))return;
   // A separately hydrated, verified work cover still owns its handoff.
   if(hasUsableCover(img)&&!candidates.some(item=>item.src===coverURL(img))){finish();return}
   const visible=hasUsableCover(img);detach();
   const pending={index,onLoad:null,onError:null};handoff=pending;
   pending.onLoad=()=>{
    if(finished||!current()){finish();return}
    if(handoff!==pending||coverURL(img)!==candidate.src||img.naturalWidth<=30||img.dataset?.maFallback==='1')return;
    state.verified=candidate.src;state.pending=null;
    if(img.dataset){img.dataset.bookCoverVerified=candidate.src;delete img.dataset.bookCoverPending;delete img.dataset.maFallback}
    img.hidden=false;img.style.opacity='1';if(fall)fall.hidden=true;
    displayedRank=index;detach();pump();
   };
   pending.onError=()=>{
    if(finished||!current()){finish();return}
    if(handoff!==pending||coverURL(img)!==candidate.src)return;
    candidate.failed=true;displayedRank=Infinity;detach();pump();
   };
   img.onload=pending.onLoad;img.onerror=pending.onError;
   state.pending=candidate.src;
   if(img.dataset){img.dataset.bookCoverPending=candidate.src;delete img.dataset.maFallback;delete img.dataset.bookCoverVerified}
   img.loading='eager';img.decoding='async';img.hidden=false;img.style.opacity=visible?'1':'0';
   if(coverURL(img)!==candidate.src)img.src=candidate.src;
   if(img.complete&&img.naturalWidth>30)pending.onLoad();
  };
  const pump=()=>{
   if(finished||!current()){finish();return}
   const best=candidates.findIndex(item=>item.ready&&!item.failed);
   if(best>=0&&best<Math.min(displayedRank,handoff?.index??Infinity)){present(best);return}
   if(handoff)return;
   if(hasUsableCover(img)&&(displayedRank===0||candidates.slice(0,displayedRank).every(item=>item.failed))){finish();return}
   // Never upscale the 100px source while either high-quality rendition can win.
   const last=candidates.length-1;
   if(candidates.slice(0,last).every(item=>item.failed))start(last);
   if(candidates.every(item=>item.failed))finish();
  };
  const start=index=>{
   const candidate=candidates[index];
   if(finished||!candidate||candidate.loader)return;
   if(!current()){finish();return}
   const loader=candidate.loader=new window.Image();loader.loading='eager';loader.decoding='async';
   const failed=()=>{
    if(finished||candidate.failed)return;
    if(!current()){finish();return}
    candidate.failed=true;pump();
   };
   const ready=()=>{
    if(finished||candidate.preparing||!loader.complete||loader.naturalWidth<=30)return;
    if(!current()){finish();return}
    candidate.preparing=true;
    Promise.resolve().then(()=>typeof loader.decode==='function'?loader.decode():null)
     .then(()=>{if(finished||!current()){finish();return}candidate.ready=true;pump()},failed);
   };
   loader.onload=ready;loader.onerror=failed;loader.src=candidate.src;
   if(loader.complete&&loader.naturalWidth>30)ready();
  };
  start(0);if(sharp)start(1);
 });
}
async function showSourceCover(img,fall,url){
 const sharp=window.MatchAppBookCoverIdentity?.sharpAppleCoverUrl(url);
 return sharp?showExactCoverRenditions(img,fall,url,sharp):showVerifiedCover(img,fall,url);
}
function showVerifiedAudioCover(img,fall,url){
 const sharp=window.MatchAppBookCoverIdentity?.sharpAppleCoverUrl(url);
 return showExactCoverRenditions(img,fall,url,sharp);
}
async function hydrateCover(book,img,fall,audio){
 if(!img)return;
 prepareBookArtwork(img,book,audio?.apple?.coverUrl);
 // Verified audio owns its edition art before any work-level cover recovery.
 if(audio?.apple){
  img.hidden=true;if(fall)fall.hidden=false;
  if(audio.apple.coverUrl)await showVerifiedAudioCover(img,fall,audio.apple.coverUrl);
  // E-book/work-level art is a different edition, not an audio-source fallback.
  return;
 }
 if(hasUsableCover(img))return;
 img.hidden=true;if(fall)fall.hidden=false;
 const local=await window.MatchAppBookDetails?.verifiedCover?.(book);
 if(local?.cover&&await showSourceCover(img,fall,local.cover))return;
 const sourceJobs=['openlibrary','google','apple'].map(source=>sourceCover(book,source));
 for(const job of sourceJobs){
  const url=await job;
  if(url&&await showSourceCover(img,fall,url))return;
 }
 if(hasUsableCover(img)||img.__matchappBookCover?.pending)return;
 img.hidden=true;if(fall)fall.hidden=false;
}
function boundedReading(job,ms=6500){
 return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Reading history unavailable')),ms);Promise.resolve(job).then(resolve,reject).finally(()=>clearTimeout(timer));});
}
async function readingRPC(action,payload,owner){
 const sb=window.supabaseClient;if(typeof sb?.rpc!=='function')throw Error('Reading history unavailable');
 const {data,error}=await boundedReading(sb.rpc('portfolio_action',{p_action:'reading_'+action,p_payload:{...payload,ownerId:owner}}));
 if(error||!data||!['saved','disliked','seen','reserved','restored'].every(k=>Array.isArray(data[k])))throw Error('Reading history unavailable');
 return data;
}
function applyReadingAction(event){
 const {id,action}=event;
 if(action==='forget'){
  for(const key of [K.saved,K.disliked])write(key,read(key).filter(x=>x!==id));
  // Removing a preference never makes an already presented work fresh again.
  write(K.seen,uniq(read(K.seen).concat(id)));
  readingClaims.delete(readingOwner+':'+id);
 }
 else{
  const key=action==='save'?K.saved:action==='dislike'?K.disliked:K.seen;
  write(key,uniq(read(key).concat(id)));
  if(action==='save')write(K.disliked,read(K.disliked).filter(x=>x!==id));
  if(action==='dislike')write(K.saved,read(K.saved).filter(x=>x!==id));
 }
}
function queueReading(id,action,legacy=false){
 const event={id,action,legacy,token:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)};
 write(pendingKey(readingOwner),read(pendingKey(readingOwner)).concat(event));
 if(readingOwner==='guest'){
  // The committed reservation remains exclusive while this asynchronous
  // settlement starts. Never clear its active receipt before scheduling it.
  try{Promise.resolve(window.MatchAppGuestReservations?.settle({scope:'reading',keys:[id],state:action==='forget'?'lifetime':'shown'})).catch(()=>{});}catch(_){}
  write(guestReadingClaimsKey,read(guestReadingClaimsKey).filter(claim=>claim.id!==id));
 }
 applyReadingAction(event);
 return event;
}
function applyReadingCloud(data){
 write(K.saved,uniq(data.saved));write(K.disliked,uniq(data.disliked));write(K.seen,uniq(data.seen.concat(data.reserved)));
 const restored=new Set(data.restored);
 for(const event of read(pendingKey(readingOwner)))if(!event.legacy||!restored.has(event.id))applyReadingAction(event);
}
async function cloudSync(){
 if(readingOwner==='guest')return true;
 const owner=readingOwner,epoch=readingEpoch;
 if(readingFlushing?.owner===owner&&readingFlushing.epoch===epoch)return readingFlushing.promise;
 const job=(async()=>{
  try{
   while(owner===readingOwner&&epoch===readingEpoch){
    const queued=read(pendingKey(owner));if(!queued.length)return true;
    const first=queued[0],batch=first.action==='forget'?[first]:queued.slice(0,500).filter((event,index,all)=>event.action!=='forget'&&!all.slice(0,index).some(e=>e.action==='forget'));
    const data=await readingRPC(first.action==='forget'?'forget':'remember',first.action==='forget'?{id:first.id}:{items:batch.map(({id,action,legacy})=>({id,action,legacy}))},owner);
    if(owner!==readingOwner||epoch!==readingEpoch)return false;
    const sent=new Set(batch.map(event=>event.token));write(pendingKey(owner),read(pendingKey(owner)).filter(event=>!sent.has(event.token)));
    applyReadingCloud(data);
   }
  }catch(_){}
  return false;
 })();
 readingFlushing={owner,epoch,promise:job};
 try{return await job}finally{if(readingFlushing?.promise===job)readingFlushing=null;}
}
async function cloudHydrate(){
 const sb=window.supabaseClient;if(!sb)return true;
 const initialEpoch=readingEpoch;
 if(readingHydrating?.epoch===initialEpoch)return readingHydrating.promise;
 const job=(async()=>{
  try{
   // The SDK reports getUser() without a session as AuthSessionMissingError.
   // A confirmed empty restored session is a guest, not a history outage.
   if(typeof sb.auth?.getSession==='function'){
    const session=await boundedReading(sb.auth.getSession());
    if(initialEpoch!==readingEpoch||session?.error)return false;
    if(session?.data?.session===null){switchReadingOwner('guest');return true;}
   }
   const a=await boundedReading(sb.auth.getUser());if(initialEpoch!==readingEpoch||a?.error)return false;
   const u=a?.data?.user;switchReadingOwner(u&&!u.is_anonymous?u.id:'guest');
   if(!u||u.is_anonymous)return true;
   const owner=readingOwner,epoch=readingEpoch,data=await readingRPC('list',{},owner);
   if(owner!==readingOwner||epoch!==readingEpoch)return false;
   const imported='match_ebook_imported_v2_'+owner;
   let alreadyImported=importedOwners.has(owner);try{alreadyImported=alreadyImported||!!localStorage.getItem(imported)}catch(_){}
   if(!alreadyImported){
    const restored=new Set(data.restored),hard=new Set(data.saved.concat(data.disliked));
    for(const [key,action,remote] of [[K.seen,'seen',data.seen.concat(data.reserved)],[K.saved,'save',data.saved],[K.disliked,'dislike',data.disliked]]){
     const known=new Set(remote);
     for(const id of read(key))if(!restored.has(id)&&!known.has(id)&&!hard.has(id))queueReading(id,action,true);
    }
    importedOwners.add(owner);try{localStorage.setItem(imported,'1')}catch(_){}
   }
   applyReadingCloud(data);
   return await cloudSync();
  }catch(_){return false;}
 })();
 readingHydrating={epoch:initialEpoch,promise:job};
 try{return await job}finally{if(readingHydrating?.promise===job)readingHydrating=null;}
}
async function claimReading(id){
 const owner=readingOwner,epoch=readingEpoch;
 const token=window.crypto?.randomUUID?.().replace(/-/g,'')||Date.now().toString(36)+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2);
 if(owner!=='guest'){
  // Retain the token before the request so an uncertain network reply can
  // release this unused reservation without touching a newer device's claim.
  readingClaims.set(owner+':'+id,token);
  let data;
  try{data=await readingRPC('claim',{id,token},owner);}
  catch(error){await releaseReading(id,owner,epoch,token);throw error;}
  if(owner!==readingOwner||epoch!==readingEpoch)return false;
  applyReadingCloud(data);if(data.claimed!==true)readingClaims.delete(owner+':'+id);return data.claimed===true;
 }
 const coordinator=window.MatchAppGuestReservations;
 if(!coordinator?.reserve||!coordinator?.settle||!coordinator?.release)throw Error('Reading history unavailable');
 const reservation=await coordinator.reserve({scope:'reading',keys:[id],token});
 if(reservation?.claimed!==true)return false;
 let settled=false;
 try{
  if(owner!==readingOwner||epoch!==readingEpoch)return false;
  // IndexedDB owns exclusivity. Keep the legacy history mirror durable too,
  // and reconcile only exact, released, never-presented reservation receipts.
  for(const key of [K.saved,K.disliked,K.seen,guestReadingClaimsKey,pendingKey(owner)]){
   const values=JSON.parse(localStorage.getItem(key)||'[]');
   if(!Array.isArray(values)||values.some(value=>[K.saved,K.disliked,K.seen].includes(key)?typeof value!=='string'||!value:
    !value||typeof value.id!=='string'||!value.id||typeof value.token!=='string'||!value.token||
    (key===pendingKey(owner)&&!['seen','save','dislike','forget'].includes(value.action))))throw Error('Reading history unavailable');
  }
  const pending=read(pendingKey(owner)),confirmed=pending.some(event=>event?.id===id&&['seen','save','dislike','forget'].includes(event.action));
  const released=new Set(reservation.releasedTokens||[]),receipts=read(guestReadingClaimsKey);
  if(!confirmed&&receipts.some(claim=>claim?.id===id&&released.has(claim.token))){
   if(!write(K.seen,read(K.seen).filter(value=>value!==id))||!write(guestReadingClaimsKey,receipts.filter(claim=>claim?.id!==id||!released.has(claim.token))))throw Error('Reading history unavailable');
  }
  if(confirmed||[K.saved,K.disliked,K.seen].some(key=>read(key).includes(id))){
   settled=await coordinator.settle({scope:'reading',keys:[id],state:pending.some(event=>event?.id===id&&event.action==='forget')?'lifetime':'shown'})===true;
   if(owner!==readingOwner||epoch!==readingEpoch)return false;
   if(settled&&!write(K.seen,uniq(read(K.seen).concat(id))))throw Error('Reading history unavailable');
   return false;
  }
  if(!write(guestReadingClaimsKey,read(guestReadingClaimsKey).filter(claim=>claim?.id!==id).concat({id,token}))||!write(K.seen,uniq(read(K.seen).concat(id))))throw Error('Reading history unavailable');
  readingClaims.set(owner+':'+id,token);settled=true;return true;
 }finally{if(!settled)await coordinator.release({scope:'reading',keys:[id],token});}
}
async function releaseReading(id,owner,epoch,token){
 // A durable reserved receipt cannot prove that an earlier document never
 // displayed the work after a failed history write/settlement. Only this
 // document's still-active, exact unused claim may be released.
 if(owner!==readingOwner||epoch!==readingEpoch||readingClaims.get(owner+':'+id)!==token)return;
 if(owner==='guest'){
  const pending=read(pendingKey(owner)),confirmed=pending.some(event=>event?.id===id&&['seen','save','dislike','forget'].includes(event.action));
  if(confirmed||[K.saved,K.disliked].some(key=>read(key).includes(id))){
   try{await window.MatchAppGuestReservations?.settle({scope:'reading',keys:[id],state:pending.some(event=>event?.id===id&&event.action==='forget')?'lifetime':'shown'});}catch(_){}
   if(readingClaims.get(owner+':'+id)===token)readingClaims.delete(owner+':'+id);return;
  }
  try{if(await window.MatchAppGuestReservations?.release({scope:'reading',keys:[id],token})!==true)return;}catch(_){return;}
  if(owner!==readingOwner||epoch!==readingEpoch)return;
  // A newer transaction may already own this work after the release commit.
  const receipts=read(guestReadingClaimsKey);
  if(receipts.some(claim=>claim?.id===id&&claim.token===token)&&!read(pendingKey(owner)).some(event=>event?.id===id&&['seen','save','dislike','forget'].includes(event.action))){
   write(K.seen,read(K.seen).filter(value=>value!==id));
   write(guestReadingClaimsKey,receipts.filter(claim=>claim?.id!==id||claim.token!==token));
  }
  if(readingClaims.get(owner+':'+id)===token)readingClaims.delete(owner+':'+id);return;
 }
 try{const data=await readingRPC('release',{id,token},owner);if(owner===readingOwner&&epoch===readingEpoch){applyReadingCloud(data);readingClaims.delete(owner+':'+id);}}catch(_){}
}
function readingHistoryNotice(root){
 const messages={en:'We could not sync your match history. Please try again.',
  pt:'Não foi possível sincronizar seu histórico de matches. Tente novamente.',
  es:'No pudimos sincronizar tu historial de matches. Inténtalo de nuevo.',
  fr:'Impossible de synchroniser votre historique de recommandations. Veuillez réessayer.',
  de:'Dein Empfehlungsverlauf konnte nicht synchronisiert werden. Bitte versuche es erneut.',
  it:'Non è stato possibile sincronizzare la cronologia dei consigli. Riprova.',
  tr:'Öneri geçmişiniz eşitlenemedi. Lütfen tekrar deneyin.',
  ru:'Не удалось синхронизировать историю рекомендаций. Попробуйте ещё раз.',
  ar:'تعذّرت مزامنة سجل توصياتك. يُرجى المحاولة مرة أخرى.',
  hi:'आपकी सुझाव सूची सिंक नहीं हो सकी। कृपया फिर से कोशिश करें।',
  id:'Riwayat rekomendasi tidak dapat disinkronkan. Silakan coba lagi.',
  ja:'おすすめ履歴を同期できませんでした。もう一度お試しください。',
  ko:'추천 기록을 동기화하지 못했습니다. 다시 시도해 주세요.',
  zh:'无法同步你的推荐记录，请重试。'};
 const selected=lang().toLowerCase().split('-')[0];
 const note=root.querySelector('[data-ebook-note]');if(note){note.hidden=false;paintNote(note,()=>window.MatchAppBooksLocale?tr('historyError'):messages[lang().toLowerCase().split('-')[0]]||messages.en);}
}
function optionButtons(field,current,p){
 return FIELDS[field].map(([value,icon,label])=>'<button type="button" class="ebook-chip'+(current===value?' is-on':'')+'" data-ebook-field="'+field+'" data-ebook-value="'+esc(value)+'" aria-pressed="'+(current===value?'true':'false')+'"'+(value!==current&&bookIncompatible(field,value,p)?' disabled aria-disabled="true" title="'+esc(ui('conflict','Conflicts with your selected mood or genre'))+'"':'')+'><span aria-hidden="true">'+icon+'</span>'+esc(choice(field,value))+'</button>').join('');
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
   '<div class="ebook-top-copy"><span class="ebook-top-badge">'+esc(b.badge||ui('topEbook','Top e-book'))+'</span><h3>'+esc(b.title)+'</h3><p class="ebook-top-author">'+esc(b.author)+'</p><p class="ebook-top-genre">'+esc(b.genre?b.genre.split(' · ').map(genre).join(' · '):ui('ebook','E-book'))+'</p>'+
   '<div class="ebook-top-actions">'+
    (free&&freeUrl?'<a class="ebook-provider ebook-free" href="'+esc(freeUrl)+'" target="_blank" rel="noopener noreferrer" data-ebook-provider="Legal free edition">'+esc(tr('topFree'))+' ↗</a>':'')+
    '<a class="ebook-provider" href="'+esc(buy)+'" target="_blank" rel="'+(paid?'sponsored ':'')+'noopener noreferrer" data-ebook-provider="E-book store"'+(paid?' data-ebook-affiliate="amazon-br"':'')+'>'+esc(tr('topBuy'))+(paid?' · '+esc(aff.paidLabel(lang())):'')+' ↗</a>'+
    (paid?'<small class="ebook-rights">'+esc(aff.disclosure(lang()))+'</small>':'')+
    '<a class="ebook-top-source" href="'+esc(b.sourceUrl||'#')+'" target="_blank" rel="noopener noreferrer">'+esc(tr('topSource'))+' · '+esc(b.source||'')+'</a>'+
   '</div></div></article>';
 }).join('');
 const cards=[...host.querySelectorAll('.ebook-top-card')];
 const hydrate=card=>{if(card.dataset.coverHydrated==='1')return;card.dataset.coverHydrated='1';const i=Number(card.dataset.ebookTopCard),b=items[i];if(!b)return;hydrateCover(b,card.querySelector('[data-top-cover]'),card.querySelector('[data-top-fallback]'));window.MatchAppBookDetails?.hydrate?.(card,b,{format:'ebook'});};
 localize(root);
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
 // Only a source-verified audiobook edition may provide an embedded preview.
 // Search URLs and matching e-book records are NEVER audio preview evidence.
 const preview=audio?.apple?.verified&&audio.apple.previewUrl?
  '<label class="ebook-audio-preview-label">'+esc(ui('audioSample','Official audiobook sample'))+'</label>'+
  '<audio class="ebook-audio-preview" controls preload="none" src="'+esc(audio.apple.previewUrl)+'"></audio>':'';
 const edition=audio?.apple?.verified?audio.apple:null;
 const minutes=edition?.durationSeconds?Math.round(edition.durationSeconds/60):null;
 const details=[minutes?'<span data-book-copy="ui.duration" data-book-vars="'+esc(JSON.stringify({minutes}))+'">'+esc(ui('duration','Duration: {minutes} min',{minutes}))+'</span>':null,
  edition?.releaseYear?'<span data-book-copy="ui.editionYear" data-book-vars="'+esc(JSON.stringify({year:edition.releaseYear}))+'">'+esc(ui('editionYear','Edition year {year}',{year:edition.releaseYear}))+'</span>':null].filter(Boolean);
 const editionFacts=details.length?'<p class="ebook-audio-note">'+details.join(' · ')+' · Apple Books</p>':'';
 return (vlinks?'<h5>'+esc(tr('audioLinks'))+'</h5><div class="ebook-provider-row">'+vlinks+'</div>':
  '<p class="ebook-audio-note">'+esc(tr('audioNone'))+'</p>')+
  editionFacts+preview+'<h5>'+esc(tr('audioSearch'))+'</h5><div class="ebook-provider-row">'+
  searches.map(item=>'<a class="ebook-provider ebook-audio-search" href="'+esc(item.url)+
   '" target="_blank" rel="noopener noreferrer" data-ebook-provider="'+esc(item.provider)+'">'+
   esc(ui('searchAudio','Search {provider} audio editions',{provider:item.provider}))+' ↗</a>').join('')+'</div>'+
  (audio?.free?'<p class="ebook-rights">'+esc(tr('audioRights'))+'</p>':'');
}
function paintAudio(root,book,audio){
 const host=root.querySelector('[data-ebook-audio-options]');
 const wrapper=root.querySelector('[data-ebook-audio]');
 if(!host||!wrapper||!audio)return;
 host.innerHTML=audioLinksHTML(audio);localize(root);
 wrapper.querySelector('[data-ebook-check-audio]')?.remove();localize(root);
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
  return '<article><div data-book-identity><strong>'+esc(b.title)+'</strong><small>'+esc(author)+'</small></div><div>'+
    '<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+(magazine?esc(ui('coversIssues','Original covers & issues')):'Google Books')+' ↗</a>'+
    (magazine?'':'<button type="button" data-ebook-saved-audio="'+esc(b.id)+'">🎧 '+esc(tr('audioVerify'))+'</button>')+
    '<button type="button" data-ebook-remove="'+esc(b.id)+'">'+esc(tr('remove'))+'</button>'+
    '<div class="ebook-saved-audio" data-ebook-saved-audio-result></div></div></article>';
 }).join(''):'<p>'+esc(tr('noneSaved'))+'</p>';localize(root);
}
function renderMagazineResult(root,mag,p,pick){
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
 '<img data-magazine-publisher-icon src="'+esc(mag.icon)+'" alt="'+esc(ui('publisherIcon','{title} publisher icon',{title:mag.title}))+'" loading="eager" decoding="async" hidden>'+
 '<div data-magazine-brand><small data-book-copy="ui.originalPublisher">'+esc(ui('originalPublisher','ORIGINAL PUBLISHER'))+'</small><strong>'+esc(mag.title)+'</strong><span>'+esc(mag.publisher)+'</span></div></div>'+
 '<div class="ebook-result-copy"><p class="ebook-kicker">📰 '+esc(ui('magazine','MAGAZINE'))+' · '+esc(mag.region==='GLOBAL'?ui('worldwide','Worldwide'):mag.region)+'</p>'+
 '<h3 data-book-identity>'+esc(mag.title)+'</h3><p class="ebook-author" data-book-copy="ui.publishedBy" data-book-vars="'+esc(JSON.stringify({publisher:mag.publisher}))+'">'+esc(ui('publishedBy','Published by {publisher}',{publisher:mag.publisher}))+'</p>'+
 sourceSummary(mag)+
 (pick&&matchNote(p,pick)?'<p class="ebook-rights ebook-match-disclosure">'+esc(matchNote(p,pick))+'</p>':'')+
 '<p class="magazine-original-note">'+esc(ui('originalIssueNote','Original issue covers, editions and current prices are available at the publisher. This identity tile does not imitate an issue cover.'))+'</p>'+
 '<div class="ebook-source-groups"><div><h4>'+esc(ui('issuesHeading','Original issues and covers'))+'</h4><div class="ebook-provider-row">'+
 '<a class="ebook-provider" href="'+esc(mag.issues)+'" target="_blank" rel="noopener noreferrer" data-ebook-provider="Official issues">'+esc(ui('coversIssues','Original covers & issues'))+' ↗</a></div></div>'+
 (p.access==='paid'?'':'<div><h4>'+esc(ui('freePublisherPages','Legally free publisher pages'))+'</h4><div class="ebook-provider-row">'+
 '<a class="ebook-provider ebook-free" href="'+esc(mag.site)+'" target="_blank" rel="noopener noreferrer" data-ebook-provider="Publisher free articles">'+esc(ui('publisherArticles','Publisher articles'))+' ↗</a></div>'+
 '<p class="ebook-rights">'+esc(ui('articleRights','Free articles vary. This is not a free full-issue download, and some articles may require a subscription.'))+'</p></div>')+
 '<div><h4>'+esc(ui('purchaseSubscriptions','Purchase & subscriptions'))+'</h4><div class="ebook-provider-row">'+links+'</div>'+
 (tagged?'<p class="ebook-rights">'+esc(affiliate.disclosure(lang()))+'</p>':'')+
 '<p class="ebook-rights">'+esc(ui('amazonDisclaimer','Amazon is a search, not a verified issue, current price, or guaranteed affiliate commission.'))+'</p></div></div>'+
 '<div class="ebook-result-actions"><button type="button" class="ebook-save" data-ebook-save="'+esc(mag.id)+'">☆ '+esc(tr('save'))+'</button>'+
 '<button type="button" class="ebook-nope" data-ebook-nope="'+esc(mag.id)+'">× '+esc(tr('nope'))+'</button>'+
 '<button type="button" class="ebook-rematch" data-ebook-rematch>↻ '+esc(tr('another'))+'</button></div></div></div>';
 window.MatchAppGuestShare?.decorateBookResult?.(host,mag.title,'magazine');
 const img=host.querySelector('[data-magazine-publisher-icon]');
 const fallback=host.querySelector('[data-magazine-brand]');
 if(img){
  img.onload=()=>{if(img.naturalWidth>0){img.hidden=false;fallback.hidden=true}};
  img.onerror=()=>{img.hidden=true;fallback.hidden=false};
  if(img.complete&&img.naturalWidth>0){img.hidden=false;fallback.hidden=true}
 }
 host.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'});
 bindResultCopy(host,mag,p,pick?.relaxed,pick,true);localize(root);
 window.MatchAppTitleIdentity?.paint(host.querySelector('.ebook-result-copy h3'),{...mag,kind:'magazine',countryCode:mag.region});
 analytics('ebook_match_reveal',{ebook_id:mag.id,ebook_title:mag.title,ebook_access:p.access,ebook_format:'magazine'});
}
function renderResult(root,book,p,relaxed,audio,magazine,pick){
 if(magazine){renderMagazineResult(root,book,p,pick);return;}
 const host=root.querySelector('[data-ebook-result]');
 const free=freeLinks(book),stores=storeLinks(book);
 const aff=window.MatchAppEbookAffiliate,paid=!!(aff&&stores.some(([,u])=>aff.isAffiliateLink(u)));
 host.hidden=false;
 host.innerHTML='<div class="ebook-result-grid">'+
  '<div class="ebook-cover"><img data-ebook-cover alt="" hidden><div data-ebook-cover-fallback>'+coverFallback(book)+'</div></div>'+
  '<div class="ebook-result-copy"><p class="ebook-kicker">'+esc(book.year)+' · '+esc(book.genres.map(genre).join(' · '))+'</p><h3 data-book-identity>'+esc(book.title)+'</h3><p class="ebook-author" data-book-copy="ui.by" data-book-vars="'+esc(JSON.stringify({author:book.author}))+'">'+esc(ui('by','by {author}',{author:book.author}))+'</p>'+sourceSummary(book)+
  '<div class="ebook-why"><strong>'+esc(tr('why'))+'</strong><span>'+esc(why(book,p,relaxed))+'</span></div>'+
  (pick&&matchNote(p,pick)?'<p class="ebook-rights ebook-match-disclosure">'+esc(matchNote(p,pick))+'</p>':'')+
  '<div class="ebook-meta"><span>'+esc(ui('readLength','{value} read',{value:choice('length',book.length)}))+'</span><span>'+esc(ui('paceValue','{value} pace',{value:choice('pace',book.pace)}))+'</span><span>'+esc(book.access.includes('free')?ui('freePlusStores','free option + stores'):ui('paidStores','paid stores'))+'</span></div>'+
  '<div class="ebook-source-groups">'+
   chooseCountryLink()+
   (free.length?'<div><h4>'+esc(tr('free'))+'</h4><div class="ebook-provider-row">'+free.map(([n,u])=>'<a class="ebook-provider ebook-free" href="'+esc(u)+'" target="_blank" rel="noopener noreferrer" data-ebook-provider="'+esc(n)+'">'+esc(n)+' ↗</a>').join('')+'</div><p class="ebook-rights">'+esc(fallbackCopy('freeCheck'))+'</p></div>':'')+
   '<div><h4>'+esc(tr('stores'))+'</h4><div class="ebook-provider-row">'+stores.map(([n,u])=>{const tagged=!!(aff&&aff.isAffiliateLink(u));return '<a class="ebook-provider" href="'+esc(u)+'" target="_blank" rel="'+(tagged?'sponsored ':'')+'noopener noreferrer" data-ebook-provider="'+esc(n)+'"'+(tagged?' data-ebook-affiliate="amazon-br"':'')+'>'+esc(n)+(tagged?' · '+esc(aff.paidLabel(lang())):'')+' ↗</a>'}).join('')+'</div>'+(paid?'<p class="ebook-rights">'+esc(aff.disclosure(lang()))+'</p>':'')+'</div>'+
   '<a class="ebook-preview-link" href="'+esc(bookInfo(book))+'" target="_blank" rel="noopener noreferrer" data-ebook-provider="Google Books">'+esc(tr('preview'))+' ↗</a>'+
  '</div>'+
  '<div class="ebook-audio" data-ebook-audio aria-live="polite"><h4>🎧 '+esc(tr('audioTitle'))+'</h4><p class="ebook-audio-note">'+esc(tr('audioOnly'))+'</p>'+
    '<div data-ebook-audio-options></div>'+
    (audio?'':'<button type="button" class="ebook-audio-check" data-ebook-check-audio="'+esc(book.id)+'">'+esc(tr('audioVerify'))+'</button>')+
  '</div>'+
  '<div class="ebook-result-actions"><button type="button" class="ebook-save" data-ebook-save="'+esc(book.id)+'">☆ '+esc(tr('save'))+'</button><button type="button" class="ebook-nope" data-ebook-nope="'+esc(book.id)+'">× '+esc(tr('nope'))+'</button><button type="button" class="ebook-rematch" data-ebook-rematch>↻ '+esc(tr('another'))+'</button></div>'+
  '</div></div>';
 bindResultCopy(host,book,p,relaxed,pick,false);localize(root);
 window.MatchAppTitleIdentity?.paint(host.querySelector('.ebook-result-copy h3'),{...book,kind:audio?'audiobook':'book',originCountries:book.originCountries||[]});
 window.MatchAppGuestShare?.decorateBookResult?.(host,book.title,p.format);
 const img=host.querySelector('[data-ebook-cover]'),fall=host.querySelector('[data-ebook-cover-fallback]');
 hydrateCover(book,img,fall,audio);
 window.MatchAppBookDetails?.hydrate?.(host,book,{format:audio?'audiobook':'ebook',verifiedAudio:!!audio?.apple});
 if(audio)paintAudio(root,book,audio);
 host.scrollIntoView({behavior:(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)?'auto':'smooth',block:'nearest'});
 analytics('ebook_match_reveal',{ebook_id:book.id,ebook_title:book.title,ebook_access:p.access,ebook_format:p.format,relaxed:!!relaxed});
}
// Honest fallback: no verified audio means no Match credit is used.
function renderAudioDiscovery(root,p){
 const host=root.querySelector('[data-ebook-result]');if(!host)return;
 const country=market(),foreign=p.access==='free'&&country!=='US';
 const reason=foreign?
   ui('rightsUnverified','Free recordings are not yet rights-verified for your country. US public-domain rights may not apply locally.'):
   tr('audioEmpty');
 // Respect the selected free/paid tier even for unverified discovery links.
 // Unverified source discovery must not present an unclaimed book profile.
 const searches=discoverySearches(p,null).map(([provider,url])=>({provider,url}));
 const disclosure=fallbackCopy('sourceCheck');
 host.hidden=false;
 host.innerHTML='<div class="ebook-result-copy ebook-audio-discovery"><h3>🎧 '+esc(tr('audioTitle'))+'</h3>'+
   '<p class="ebook-audio-note">'+esc(reason)+'</p>'+
   chooseCountryLink()+
   (disclosure?'<p class="ebook-audio-note">'+esc(disclosure)+'</p>':'')+
   '<div class="ebook-provider-row">'+searches.map(item=>'<a class="ebook-provider ebook-audio-search" href="'+esc(item.url)+
     '" target="_blank" rel="noopener noreferrer">'+esc(item.provider)+' · '+esc(ui('unverified','unverified search'))+' ↗</a>').join('')+'</div>'+
   '<div class="ebook-result-actions"><button type="button" class="ebook-rematch" data-ebook-switch-format="ebook">'+
     esc(ui('compatibleEbook','Match a compatible e-book'))+'</button>'+
   '<button type="button" class="ebook-rematch" data-ebook-switch-access="any">'+
     esc(ui('includeAudio','Include official audio stores'))+'</button></div>'+
   '<p class="ebook-rights">'+esc(ui('noCredit','No Match credit was consumed. Search links do not confirm edition availability.'))+'</p></div>';
 const locale=window.MatchAppBooksLocale;if(locale)host.querySelectorAll('.ebook-audio-search').forEach((link,index)=>locale.bindValue(link,()=>{const label=discoverySearches(p,null)[index]?.[0]||searches[index].provider;return label+' · '+ui('unverified','unverified search')+' ↗';}));
 localize(root);
 host.scrollIntoView?.({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'});
}
async function doMatch(root){
 // One in-flight search includes source preflight and shared Match allowance.
 // Double taps in every format must never charge a second credit.
 if(root.dataset.audioBusy==='1')return;
 root.dataset.audioBusy='1';
 root.querySelectorAll('[data-ebook-match],[data-ebook-rematch]').forEach(b=>b.disabled=true);
 const p=prefs(),note=root.querySelector('[data-ebook-note]');
 const tokenContext=window.MatchAppTokens?.createContext?.('ebook');
 let matchOwner,matchEpoch,reservedId='',reservedToken='';
 try{
  // Auth/profile restoration may finish after the first paint. Read account
  // exclusions before choosing, so an early tap cannot replay a saved book.
  if(!await cloudHydrate()){readingHistoryNotice(root);return;}
  matchOwner=readingOwner;matchEpoch=readingEpoch;
  const tokenPreflight=await window.MatchAppTokens?.beforeLookup?.('match',tokenContext);
  if(tokenPreflight===false||matchOwner!==readingOwner||matchEpoch!==readingEpoch)return;
  let pick;
  for(let attempt=0;attempt<3;attempt++){
  if(p.format==='audiobook'){
   if(note){note.hidden=false;paintNote(note,()=>tr('audioWaiting'));}
   pick=await chooseVerifiedAudio(p,(tried,total)=>{
    if(note?.isConnected)paintNote(note,()=>tr('audioWaiting')+' ('+tried+'/'+total+')');
   });
  }else if(p.format==='magazine')pick=await chooseMagazine(p);
  else {
   const shortlist=bestBookChoices(p);
   // The model may only order already-curated equally compatible records.
   // A transient upstream error never discards valid local suggestions.
   try{pick=shortlist.some(row=>row.relaxed||row.recycled)?choose(p):
     (window.MatchAppAIRank?.rank?(await rankBooks(shortlist,p)||choose(p)):choose(p));}
   catch(_){pick=choose(p);}
  }
  if(matchOwner!==readingOwner||matchEpoch!==readingEpoch)return;
  if(!pick)break;
  // Recheck after ranking/source awaits, then reserve before spending quota.
  if([K.saved,K.disliked,K.seen].some(k=>read(k).includes(pick.book.id))){pick=null;continue;}
  try{
   if(await claimReading(pick.book.id)){reservedId=pick.book.id;reservedToken=readingClaims.get(matchOwner+':'+reservedId)||'';break;}
  }catch(_){readingHistoryNotice(root);return;}
  pick=null;
  }
  if(!pick){
   if(p.format==='audiobook')renderAudioDiscovery(root,p);
   else renderReadingDiscovery(root,p);
   if(note){note.hidden=true;note.textContent='';}
   return; // No curated title or verified audio: never spend quota.
  }
  if(matchOwner!==readingOwner||matchEpoch!==readingEpoch)return;
  // If no authentic source was found, spend nothing.
  if(typeof window.checkDailyLimit!=='function'){
   await releaseReading(reservedId,matchOwner,matchEpoch,reservedToken);reservedId='';
   if(window.showToast)window.showToast('E-book matching is available from the main MatchApp experience.',true);
   return;
  }
  const allowed=await window.checkDailyLimit('match',tokenContext);
  if(!allowed){await releaseReading(reservedId,matchOwner,matchEpoch,reservedToken);reservedId='';}
  if(!allowed)return;
  if(matchOwner!==readingOwner||matchEpoch!==readingEpoch)return;
  // A preference removal or dismissal may arrive while the shared allowance
  // is pending. Never reveal a now-excluded or no-longer-owned reservation.
  if([K.saved,K.disliked].some(k=>read(k).includes(pick.book.id))||readingClaims.get(matchOwner+':'+pick.book.id)!==reservedToken){
   await window.MatchAppTokens?.noteUnconfirmed?.('ebook',tokenContext?.runId);
   const result=root.querySelector('[data-ebook-result]');if(result)result.hidden=true;
   readingHistoryNotice(root);return;
  }
  if(note){const message=matchNote(p,pick);note.hidden=!message;paintNote(note,()=>matchNote(p,pick));}
  queueReading(pick.book.id,'seen');readingClaims.delete(matchOwner+':'+pick.book.id);reservedId='';
  renderResult(root,pick.book,p,pick.relaxed,pick.audio||null,pick.magazine===true,pick);
  void cloudSync();
  try{window.MatchAppTokens?.confirmResult?.('ebook',root.querySelector('[data-ebook-result]'),tokenContext?.runId);}catch(_){}
 }catch(e){
  await window.MatchAppTokens?.noteUnconfirmed?.('ebook',tokenContext?.runId);
  console.warn('[MatchApp E-books] Match/source error:',e);
  window.showToast?.(ui('sourceUnavailable','Reading sources are temporarily unavailable. You can explore the source links below or retry shortly.'),true,{recovery:true});
  // Upstream/source faults still offer a usable, uncharged discovery route.
  if(p.format==='audiobook')renderAudioDiscovery(root,p);
  else renderReadingDiscovery(root,p);
  if(note){note.hidden=true;note.textContent='';}
 }finally{
  if(reservedId)await releaseReading(reservedId,matchOwner,matchEpoch,reservedToken);
  root.dataset.audioBusy='0';
  root.querySelectorAll('[data-ebook-match],[data-ebook-rematch]').forEach(b=>b.disabled=false);
 }
}
function syncBookControls(root,p){
 root.querySelectorAll('[data-ebook-select]').forEach(s=>[...s.options].forEach(o=>{o.disabled=o.value!==p[s.dataset.ebookSelect]&&bookIncompatible(s.dataset.ebookSelect,o.value,p)}));
 root.querySelectorAll('[data-ebook-field]').forEach(b=>{
  b.disabled=b.dataset.ebookValue!==p[b.dataset.ebookField]&&bookIncompatible(b.dataset.ebookField,b.dataset.ebookValue,p);
  b.title=b.disabled?ui('conflict','Conflicts with your selected mood or genre'):'';
 });
}
function bind(root){
 // Home dropdowns and /ebooks/ chip buttons persist to one preference model.
 root.addEventListener('change',e=>{
  const select=e.target.closest('[data-ebook-select]');
  if(!select||!root.contains(select))return;
  const field=select.dataset.ebookSelect;
  if(!Object.prototype.hasOwnProperty.call(FIELDS,field))return;
  if(!FIELDS[field].some(option=>option[0]===select.value))return;
  const p=prefs();if(bookIncompatible(field,select.value,p)){select.value=p[field];return;}p[field]=select.value;savePrefs(p);syncBookControls(root,p);
 });
 root.addEventListener('click',async e=>{
  const chip=e.target.closest('[data-ebook-field]');
  if(chip){
   const p=prefs();if(bookIncompatible(chip.dataset.ebookField,chip.dataset.ebookValue,p))return;p[chip.dataset.ebookField]=chip.dataset.ebookValue;savePrefs(p);syncBookControls(root,p);
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
  const switcher=e.target.closest('[data-ebook-switch-format],[data-ebook-switch-access]');
  if(switcher){
   e.preventDefault();
   const p=prefs();
   if(switcher.dataset.ebookSwitchFormat)p.format=switcher.dataset.ebookSwitchFormat;
   if(switcher.dataset.ebookSwitchAccess)p.access=switcher.dataset.ebookSwitchAccess;
   savePrefs(p);
   root.querySelectorAll('[data-ebook-select]').forEach(sel=>{sel.value=p[sel.dataset.ebookSelect]});
   root.querySelectorAll('[data-ebook-field]').forEach(b=>{
    const on=p[b.dataset.ebookField]===b.dataset.ebookValue;
    b.classList.toggle('is-on',on);b.setAttribute('aria-pressed',String(on));
   });
   syncBookControls(root,p);
   const result=root.querySelector('[data-ebook-result]');if(result)result.hidden=true;
   await doMatch(root);return;
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
    host.innerHTML=audioLinksHTML(audio);localize(root);
   }finally{savedAudio.textContent=tr('audioVerify');savedAudio.disabled=false}
   return;
  }
  const save=e.target.closest('[data-ebook-save]');
  if(save){const id=save.dataset.ebookSave;queueReading(id,'save');save.textContent='★ '+tr('saved');save.disabled=true;renderSaved(root);void cloudSync();analytics('ebook_save',{ebook_id:id});return;}
  const nope=e.target.closest('[data-ebook-nope]');
  if(nope){const id=nope.dataset.ebookNope;queueReading(id,'dislike');const result=root.querySelector('[data-ebook-result]');if(result)result.hidden=true;renderSaved(root);void cloudSync();analytics('ebook_not_for_me',{ebook_id:id});await doMatch(root);return;}
  const rm=e.target.closest('[data-ebook-remove]');
  if(rm){queueReading(rm.dataset.ebookRemove,'forget');renderSaved(root);void cloudSync();return;}
  const provider=e.target.closest('[data-ebook-provider]');
  if(provider){
   analytics('ebook_provider_click',{provider:provider.dataset.ebookProvider});
   if(provider.dataset.ebookAffiliate==='amazon-br')analytics('ebook_affiliate_click',{provider:'Amazon Brazil',surface:provider.closest('.ebook-top-card')?'top_ebooks':'ebook_match'});
  }
 });
}
function localize(root){
 const locale=window.MatchAppBooksLocale;if(!locale||!root)return;
 root.querySelectorAll('[data-ebook-field]').forEach(button=>{
  const text=Array.from(button.childNodes).find(node=>node.nodeType===3&&node.nodeValue.trim());
  if(text)locale.bind(text,'field.'+button.dataset.ebookField+'.'+button.dataset.ebookValue);
  if(button.disabled)button.title=ui('conflict','Conflicts with your selected mood or genre');
 });
 root.querySelectorAll('[data-ebook-select]').forEach(select=>{
  locale.bind(select,'field.'+select.dataset.ebookSelect+'.label',null,'aria-label');
  Array.from(select.options).forEach(option=>{if(option.firstChild)locale.bind(option.firstChild,'field.'+select.dataset.ebookSelect+'.'+option.value);});
 });
 root.querySelectorAll('[data-ebook-top-card]').forEach(card=>{
  const book=topBooks().find(item=>item.title===card.querySelector('h3')?.textContent);if(!book)return;
  locale.bindValue(card.querySelector('.ebook-top-genre'),()=>book.genre?book.genre.split(' · ').map(genre).join(' · '):ui('ebook','E-book'));
  const img=card.querySelector('[data-top-cover]');if(img)locale.bind(img,'ui.sourceCover',{title:book.title,author:book.author},'alt');
 });
 root.querySelectorAll('.ebook-audio-search[data-ebook-provider]').forEach(link=>{const provider=link.dataset.ebookProvider;locale.bindValue(link,()=>ui('searchAudio','Search {provider} audio editions',{provider})+' ↗');});
 root.querySelectorAll('[data-book-copy="ui.updated"]').forEach(node=>{node.dataset.bookVars=JSON.stringify({date:new Intl.DateTimeFormat(lang(),{year:'numeric',month:'short',day:'numeric'}).format(new Date('2026-09-24T12:00:00Z'))});});
 locale.paint(root);
 const note=root.querySelector('[data-ebook-note]');if(note&&!note.hidden&&note.__bookCopy)paintNote(note,note.__bookCopy);
}
function bindResultCopy(host,book,p,relaxed,pick,magazine){
 const locale=window.MatchAppBooksLocale;if(!locale)return;
 const image=host.querySelector('[data-ebook-cover]');if(image)locale.bindValue(image,()=>ui(image.__matchappBookCover?.identity?.includes('\naudio:')?'audioCover':'sourceCover','{title} — {author} (source cover)',{title:book.title,author:book.author}),'alt');
 locale.bindValue(host.querySelector('.ebook-why span'),()=>why(book,p,relaxed));
 locale.bindValue(host.querySelector('.ebook-match-disclosure'),()=>matchNote(p,pick));
 locale.bindValue(host.querySelector('.ebook-kicker'),()=>magazine?'📰 '+ui('magazine','MAGAZINE')+' · '+(book.region==='GLOBAL'?ui('worldwide','Worldwide'):book.region):book.year+' · '+book.genres.map(genre).join(' · '));
 if(!magazine){const meta=host.querySelectorAll('.ebook-meta span');
  locale.bindValue(meta[0],()=>ui('readLength','{value} read',{value:choice('length',book.length)}));
  locale.bindValue(meta[1],()=>ui('paceValue','{value} pace',{value:choice('pace',book.pace)}));
  locale.bindValue(meta[2],()=>book.access.includes('free')?ui('freePlusStores','free option + stores'):ui('paidStores','paid stores'));
 }
}
function markup(){
 const p=prefs();
 // The dedicated reading hub remains expanded; adult Home starts as a compact disclosure.
 const initiallyOpen=!(document.body.classList.contains('page-home')||location.pathname==='/'||location.pathname==='/index.html')||location.hash==='#ebook-matcher-root';
 const home=document.body.classList.contains('page-home')||location.pathname==='/'||location.pathname==='/index.html';
 const field=(key,label)=>{
  label=fieldLabel(key,label);
  if(!home)return '<fieldset class="ebook-field"><legend data-book-copy="field.'+key+'.label">'+esc(label)+'</legend><div class="ebook-chips">'+optionButtons(key,p[key],p)+'</div></fieldset>';
  return '<label class="ebook-select-field"><span data-book-copy="field.'+key+'.label">'+esc(label)+'</span><select class="ebook-select" data-ebook-select="'+key+'" aria-label="'+esc(label)+'">'+
   FIELDS[key].map(([value,,name])=>'<option value="'+esc(value)+'"'+(p[key]===value?' selected':'')+(value!==p[key]&&bookIncompatible(key,value,p)?' disabled':'')+'>'+esc(choice(key,value))+'</option>').join('')+'</select></label>';
 };
 return '<details class="ebook-fold"'+(initiallyOpen?' open':'')+'><summary><span class="ebook-summary-icon" aria-hidden="true">'+(home?'<img class="ebook-brand-crest" src="/assets/brand/matchapp-bookworms-crest.svg" width="64" height="64" alt="" decoding="async">':'📚✦')+'</span><span><small>'+esc(tr('eyebrow'))+'</small><strong>'+esc(home?tr('homeTitle'):tr('title'))+'</strong></span><span class="ebook-chevron" aria-hidden="true">⌄</span></summary>'+
 '<div class="ebook-panel"><div class="ebook-intro"><div><h2>'+esc(tr('title'))+'</h2><p>'+esc(tr('intro'))+'</p></div><a href="/ebooks/" class="ebook-guide-link">'+esc(ui('bookwormsHub','Bookworms hub'))+' ↗</a></div>'+
 '<div class="ebook-fields">'+field('format','E-book, audiobook or magazine')+field('mood','Reading mood')+field('genre','Genre')+field('pace','Reading pace')+field('length','Length')+field('era','Era')+field('access','Free or paid')+'</div>'+
 '<div class="ebook-match-row"><button type="button" class="ebook-match-cta" data-ebook-match>📚🎧 '+esc(tr('match'))+'</button><span>'+esc(tr('quota'))+'</span></div>'+
 '<p class="ebook-note" data-ebook-note hidden></p><section class="ebook-result" data-ebook-result hidden aria-live="polite"></section>'+
 (home?'<details class="ebook-home-picks"><summary>'+esc(tr('topFold'))+' <span aria-hidden="true">⌄</span></summary>':'')+
 '<section class="ebook-top-section" aria-labelledby="ebook-top-title"><div class="ebook-top-head"><div><small data-book-copy="ui.picks">'+esc(ui('picks','BOOKWORMS PICKS'))+'</small><h3 id="ebook-top-title">'+esc(tr('topTitle'))+'</h3><p>'+esc(tr('topSub'))+'</p></div><span data-book-copy="ui.updated" data-book-vars="'+esc(JSON.stringify({date:new Intl.DateTimeFormat(lang(),{year:'numeric',month:'short',day:'numeric'}).format(new Date('2026-09-24T12:00:00Z'))}))+'">'+esc(ui('updated','Updated {date}',{date:new Intl.DateTimeFormat(lang(),{year:'numeric',month:'short',day:'numeric'}).format(new Date('2026-09-24T12:00:00Z'))}))+'</span></div><div class="ebook-top-rail" data-ebook-top></div></section>'+
 (home?'</details>':'')+
 '<details class="ebook-saved"><summary><img class="ebook-saved-crest" src="/assets/brand/matchapp-fold-saved.svg" width="36" height="36" alt="" aria-hidden="true" decoding="async"> '+esc(tr('savedBooks'))+' <span data-ebook-saved-count>0</span></summary><div data-ebook-saved-list></div></details>'+
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
  const anchor=document.getElementById('ma-concierge')||document.getElementById('questionnaire-box');
  if(anchor)anchor.insertAdjacentElement('afterend',root);else(document.querySelector('main')||document.body).appendChild(root);
 }
 // Old cached Home HTML may still put Bookworms beneath Search/Ask AI.
 // Keep reading independent of both tabs and the outer Watch/Ask fold.
 if(document.body.classList.contains('page-home')){
  const watch=document.getElementById('ma-concierge')||document.getElementById('questionnaire-box');
  if(watch&&root.previousElementSibling!==watch)watch.insertAdjacentElement('afterend',root);
 }
 if(root.dataset.ebookMounted==='1')return;
 root.dataset.ebookMounted='1';root.innerHTML=markup();bind(root);syncBookControls(root,prefs());renderTop(root);await cloudHydrate();renderSaved(root);localize(root);
 if(location.hash==='#ebook-matcher-root')requestAnimationFrame(()=>root.scrollIntoView({behavior:'auto',block:'start'}));
 // Reveal collapsed Home controls when an already open page receives a reading deep link.
 window.addEventListener('hashchange',()=>{if(location.hash!=='#ebook-matcher-root')return;const fold=root.querySelector('.ebook-fold');if(fold)fold.open=true;root.scrollIntoView({behavior:'auto',block:'start'});});
 document.addEventListener('matchapp:langchange',()=>localize(root));
 window.addEventListener('storage',event=>{if(event.key==='match_lang')localize(root);});
}
document.addEventListener('matchapp:authchange',()=>{readingEpoch++;const root=document.getElementById('ebook-matcher-root'),result=root?.querySelector('[data-ebook-result]');if(result)result.hidden=true;void cloudHydrate().then(()=>{if(root)renderSaved(root);});});
window.addEventListener('online',()=>{void cloudHydrate().then(()=>{const root=document.getElementById('ebook-matcher-root');if(root)renderSaved(root);});});
window.addEventListener('storage',event=>{const root=document.getElementById('ebook-matcher-root');if(root&&[K.saved,K.disliked,K.seen].includes(event.key))renderSaved(root);});
window.MatchAppEbooks={match:()=>{const r=document.getElementById('ebook-matcher-root');return r?doMatch(r):null},saved:()=>read(K.saved).slice(),disliked:()=>read(K.disliked).slice(),
 ready:cloudHydrate,
 async claimSuggestion(id){const owner=readingOwner,epoch=readingEpoch;if(!await claimReading(id))return null;return {id,owner,epoch,token:readingClaims.get(owner+':'+id)};},
 finishSuggestion(claim){if(!claim||claim.owner!==readingOwner||claim.epoch!==readingEpoch||readingClaims.get(claim.owner+':'+claim.id)!==claim.token||[K.saved,K.disliked].some(k=>read(k).includes(claim.id)))return false;queueReading(claim.id,'seen');readingClaims.delete(claim.owner+':'+claim.id);void cloudSync();return true;},
 releaseSuggestion:claim=>claim?releaseReading(claim.id,claim.owner,claim.epoch,claim.token):Promise.resolve()
};
if(!stateOnly){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();}
})();
