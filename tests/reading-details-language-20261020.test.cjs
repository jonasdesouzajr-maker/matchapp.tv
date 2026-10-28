'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const languages=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
const keys=('detail.year|detail.pages|detail.ratings|detail.noRating|detail.audioWork|detail.sourceEdition|detail.sourceWork|detail.sourceSearch|detail.cover|reading.chooseCountry|reading.historyUnavailable|reading.publisherIcon|reading.magazineLabel|reading.originalIssues|reading.officialArticles|reading.amazonAvailability|reading.publisherSubscription|reading.magazineNote|reading.bookPreview|reading.freeEditions|reading.audioSearchUnverified|reading.amazonEdition|reading.koboSearch|reading.audioLabel|reading.ebookLabel|reading.by|reading.audioNote|reading.ebookNote|reading.sourcesAria|reading.magazineHeading|reading.audioHeading|reading.ebookHeading|reading.sourceNote|reading.sourceEnglish|audio.search|affiliate.disclosure|affiliate.paid').split('|');
function fixture(markup='<main id="host"></main>'){
 const dom=new JSDOM('<!doctype html><html lang="en"><body>'+markup+'</body></html>',{url:'https://matchapp.tv/ebooks/',runScripts:'outside-only'}),w=dom.window;
 w.eval(read('ebooks/locale.js'));w.eval(read('ebooks/locale-details.js'));
 const select=lang=>{w.localStorage.setItem('match_lang',lang);w.MATCH_LANG='en';w.document.dispatchEvent(new w.CustomEvent('matchapp:langchange',{detail:{lang}}));};
 return {dom,w,select};
}
test('all 14 reading detail dictionaries have the exact authored key and interpolation contract',t=>{
 const f=fixture();t.after(()=>f.dom.window.close());const {w}=f,api=w.MatchAppReadingDetailsCopy;
 const vars={year:1925,count:1234,rating:'4.3',source:'Apple Books',title:'Exact source title',author:'Exact source author',provider:'Kobo'};
 for(const lang of languages){
  f.select(lang);assert.equal(api.language(),lang);
  for(const key of keys){
   const raw=w.MatchAppBooksLocale.get(key,lang);assert.equal(typeof raw,'string',lang+'/'+key);assert(raw.trim(),lang+'/'+key);
   assert.equal(api.text(key,vars),raw.replace(/\{([\w]+)\}/g,(_,name)=>String(vars[name]??'')));
   assert.deepEqual((raw.match(/\{\w+\}/g)||[]).sort(),(w.MatchAppBooksLocale.get(key,'en').match(/\{\w+\}/g)||[]).sort(),lang+'/'+key+' placeholders');
  }
  if(lang!=='en')assert.notEqual(api.text('reading.sourceNote'),w.MatchAppBooksLocale.get('reading.sourceNote','en'),lang+' has its own explanation');
 }
 w.localStorage.setItem('match_lang','pt-PT');assert.equal(api.language(),'pt-BR');w.localStorage.setItem('match_lang','zh-Hant');assert.equal(api.language(),'zh');
 assert.equal(w.document.documentElement.lang,'en','display helper never mutates canonical language/dir');
 assert.equal(w.document.querySelectorAll('select,input').length,0,'copy bundle adds no language control');
});
test('the pure copy module honors saved choice and storage denial without a second engine',t=>{
 const dom=new JSDOM('<html lang="fr"></html>',{url:'https://matchapp.tv/',runScripts:'outside-only'});t.after(()=>dom.window.close());const w=dom.window;
 w.localStorage.setItem('match_lang','ar');w.MATCH_LANG='en';const before=Object.fromEntries(Object.keys(w.localStorage).map(k=>[k,w.localStorage.getItem(k)]));
 w.eval(read('ebooks/locale-details.js'));assert.equal(w.MatchAppReadingDetailsCopy.language(),'ar');assert.match(w.MatchAppReadingDetailsCopy.text('reading.by',{author:'Exact author'}),/Exact author/);
 assert.deepEqual(Object.fromEntries(Object.keys(w.localStorage).map(k=>[k,w.localStorage.getItem(k)])),before);
 Object.defineProperty(w,'localStorage',{get(){throw Error('storage denied');}});w.MATCH_LANG='ja';assert.equal(w.MatchAppReadingDetailsCopy.language(),'ja');
 assert.equal(typeof w.setLanguage,'undefined');assert.equal(w.document.documentElement.lang,'fr');
});
test('hydrated bibliographic facts repaint all locales without refetching or replacing source links and controls',async t=>{
 const markup=['store','work','search'].map(id=>'<article id="'+id+'"><div class="ebook-result-copy"><h3 data-book-identity>Original title</h3><button class="ebook-why">Existing action</button></div><div class="ebook-cover"></div></article>').join('');
 const f=fixture(markup);t.after(()=>f.dom.window.close());const {w}=f;f.select('pt-BR');let calls=0;
 const books=[{title:'Store Work',author:'Mira Example'},{title:'Library Work',author:'Mira Example'},{title:'Search Work',author:'Mira Example'}];
 const cover='https://covers.openlibrary.org/b/id/123456-L.jpg';
 const entries=books.map((b,i)=>({...b,source:i===0?'Apple Books':'Open Library',cover,year:1925,pages:275,rating:i===0?4.3:null,count:i===0?1234:null,url:i===0?'https://books.apple.com/us/book/exact-edition/id123456':i===1?'https://openlibrary.org/works/OL123W':null}));
 w.fetch=async url=>{calls++;assert.match(String(url),/^\/ebooks\/verified-book-index/);return{ok:true,json:async()=>({entries})};};
 w.eval(read('ebooks/book-details-20261011.js'));
 const hosts=['store','work','search'].map(id=>w.document.getElementById(id));
 for(let i=0;i<hosts.length;i++)await w.MatchAppBookDetails.hydrate(hosts[i],books[i],{format:'audiobook',verifiedAudio:true});
 const nodes=hosts.map(host=>({host,meta:host.querySelector('[data-book-verified-meta]'),children:[...host.querySelector('[data-book-verified-meta]').children],button:host.querySelector('button'),source:host.querySelector('[data-book-verified-meta] a'),href:host.querySelector('[data-book-verified-meta] a')?.href}));
 const requested=calls;let clicks=0;nodes[0].button.onclick=()=>{clicks++;};
 for(const lang of languages){
  f.select(lang);
  for(const row of nodes){assert.equal(row.host.querySelector('[data-book-verified-meta]'),row.meta);assert.deepEqual([...row.meta.children],row.children);assert.equal(row.host.querySelector('button'),row.button);assert.equal(row.source?.href,row.href);}
  assert.match(nodes[0].meta.textContent,/Apple Books/);assert(nodes[0].meta.textContent.includes(w.MatchAppReadingDetailsCopy.text('detail.audioWork')));
  assert(nodes[1].meta.textContent.includes(w.MatchAppReadingDetailsCopy.text('detail.noRating')));
  assert(nodes[1].meta.textContent.includes(w.MatchAppReadingDetailsCopy.text('detail.sourceWork',{source:'Open Library'})));
  assert(nodes[2].meta.textContent.includes(w.MatchAppReadingDetailsCopy.text('detail.sourceSearch',{source:'Open Library'})));
  assert.equal(calls,requested,'locale repaint does not repeat metadata lookup');
 }
 nodes[0].button.click();assert.equal(clicks,1);assert.equal(calls,1,'same-origin verified index fetched only once');
});
test('conflicting live Open Library work year is omitted without rewriting source facts or locale bindings',async t=>{
 const f=fixture('<article id="host"><div class="ebook-result-copy"><p class="ebook-kicker">1868 · Classics</p><h3 data-book-identity>Little Women</h3><button class="ebook-why">Existing action</button></div><div class="ebook-cover"></div></article>');
 t.after(()=>f.dom.window.close());const {w}=f;
 const book=Object.freeze({title:'Little Women',author:'Louisa May Alcott',year:1868});
 const row=Object.freeze({title:book.title,author_name:[book.author],first_publish_year:1848,number_of_pages_median:423,ratings_average:4.1,ratings_count:126,cover_i:123456,key:'/works/OL123W'});
 const originalRow=JSON.stringify(row),calls=[];
 w.fetch=async url=>{
  calls.push(String(url));
  if(String(url).startsWith('/ebooks/verified-book-index'))return {ok:true,json:async()=>({entries:[]})};
  const source=new URL(url);assert.equal(source.origin,'https://openlibrary.org');assert.equal(source.pathname,'/search.json');
  assert.equal(source.searchParams.get('title'),book.title);assert.equal(source.searchParams.get('author'),book.author);
  return {ok:true,json:async()=>({docs:[row]})};
 };
 w.eval(read('ebooks/book-details-20261011.js'));
 const api=w.MatchAppBookDetails,data=await api.lookup(book),originalData=JSON.stringify(data);
 assert.equal(data.year,1848);assert.equal(data.pages,423);assert.equal(data.rating,4.1);assert.equal(data.count,126);
 assert.equal(data.source,'Open Library');assert.equal(data.url,'https://openlibrary.org/works/OL123W');Object.freeze(data);
 const host=w.document.getElementById('host'),button=host.querySelector('button'),kicker=host.querySelector('.ebook-kicker');
 assert.equal(await api.hydrate(host,book,{format:'ebook'}),data);
 const meta=host.querySelector('[data-book-verified-meta]'),children=[...meta.children],source=meta.querySelector('a'),cover=host.querySelector('.ebook-cover img');
 assert.equal(cover.src,'https://covers.openlibrary.org/b/id/123456-L.jpg');
 for(const lang of languages){
  f.select(lang);
  const num=value=>new Intl.NumberFormat(lang).format(value),rating=new Intl.NumberFormat(lang,{minimumFractionDigits:1,maximumFractionDigits:1}).format(4.1);
  assert.deepEqual([...meta.querySelectorAll('span')].map(node=>node.textContent),[
   w.MatchAppReadingDetailsCopy.text('detail.pages',{count:num(423)}),
   w.MatchAppReadingDetailsCopy.text('detail.ratings',{rating,count:num(126),source:'Open Library'})
  ],lang+' retains pages/ratings and omits only the contradictory year');
  assert.equal(source.textContent,w.MatchAppReadingDetailsCopy.text('detail.sourceWork',{source:'Open Library'}));
  assert.equal(source.href,data.url);assert.equal(meta.querySelector('a'),source);assert.deepEqual([...meta.children],children);
  assert.equal(host.querySelector('button'),button);assert.equal(kicker.textContent,'1868 · Classics');assert.equal(host.querySelector('.ebook-cover img'),cover);
 }
 assert.equal(await api.lookup(book),data,'hydration and locale repaint preserve the original cache entry');
 assert.equal(data.year,1848);assert.equal(JSON.stringify(data),originalData);assert.equal(JSON.stringify(row),originalRow);assert.equal(book.year,1868);
 assert.equal(calls.length,2,'one index request and one exact work lookup, with no retries or locale refetch');
});
test('year display preserves equal or unknown canonical years and Apple editions across all locales',async t=>{
 const cases=[
  {id:'equal',source:'Open Library',canonical:1868,year:1868,shown:true},
  {id:'missing',source:'Open Library',year:1848,shown:true},
  {id:'null',source:'Open Library',canonical:null,year:1848,shown:true},
  {id:'string',source:'Open Library',canonical:'1868',year:1848,shown:true},
  {id:'fractional',source:'Open Library',canonical:1868.5,year:1848,shown:true},
  {id:'snapshot-conflict',source:'Open Library',canonical:1868,year:2000,shown:false},
  {id:'edition',source:'Apple Books',canonical:1868,year:2000,shown:true}
 ];
 const markup=cases.map(c=>'<article id="'+c.id+'"><div class="ebook-result-copy"></div><div class="ebook-cover"></div></article>').join('');
 const f=fixture(markup);t.after(()=>f.dom.window.close());const {w}=f;let calls=0;
 const books=cases.map(c=>({title:'Year display '+c.id,author:'Mira Example',year:c.canonical}));
 const entries=cases.map((c,i)=>({...books[i],source:c.source,year:c.year,pages:275,rating:null,count:null,cover:'https://covers.openlibrary.org/b/id/123456-L.jpg',url:c.source==='Apple Books'?'https://books.apple.com/us/book/exact-edition/id123456':'https://openlibrary.org/works/OL123W'}));
 w.fetch=async url=>{calls++;assert.match(String(url),/^\/ebooks\/verified-book-index/);return {ok:true,json:async()=>({entries})};};
 w.eval(read('ebooks/book-details-20261011.js'));
 const data=[];
 for(let i=0;i<cases.length;i++)data.push(await w.MatchAppBookDetails.hydrate(w.document.getElementById(cases[i].id),books[i],{format:'ebook'}));
 for(const lang of languages){
  f.select(lang);
  for(let i=0;i<cases.length;i++){
   const c=cases[i],meta=w.document.getElementById(c.id).querySelector('[data-book-verified-meta]');
   const year=w.MatchAppReadingDetailsCopy.text('detail.year',{year:c.year});
   assert.equal([...meta.querySelectorAll('span')].some(node=>node.textContent===year),c.shown,lang+'/'+c.id+': '+meta.textContent);
   assert.equal(data[i].year,c.year,'source year is never rewritten');assert.equal(meta.querySelector('a').href,entries[i].url);
   assert.equal(meta.querySelector('a').textContent,w.MatchAppReadingDetailsCopy.text(c.source==='Apple Books'?'detail.sourceEdition':'detail.sourceWork',{source:c.source}));
  }
 }
 assert.equal(calls,1,'all snapshot cases and language changes share the original index fetch');
});
test('Ask AI book, audio and magazine source cards retain identity, links and original text through all language switches',t=>{
 const f=fixture('<main id="book"></main><main id="audio"></main><main id="magazine"></main>');t.after(()=>f.dom.window.close());const {w}=f;
 const book={id:'exact-book',title:'Exact Source Book',author:'Mira Example',summary:'Original external English description.',access:['free','paid'],genres:['fantasy'],moods:['curious']};
 const magazine={id:'exact-magazine',title:'Exact Source Magazine',summary:'Original publisher English description.',icon:'https://publisher.invalid/icon.png',site:'https://publisher.invalid/',issues:'https://publisher.invalid/issues',subscription:'https://publisher.invalid/subscribe',genres:['nature'],region:'BR'};
 w.MATCHAPP_EBOOK_CATALOG=[book];w.MatchAppCountry={regionCode:()=> 'BR'};
 w.MatchAppMagazines={items:[magazine],buyLinks:(m,region,aff)=>[{name:'Amazon',url:aff.amazonMagazineSearchUrl(m,region)}]};
 let fetches=0;w.fetch=()=>{fetches++;throw Error('No provider requests are allowed');};
 for(const file of ['ebooks/affiliate-links.js','ebooks/audiobooks.js','ebooks/reading-ai.js'])w.eval(read(file));
 assert.equal(w.MatchAppReadingAI.render('Recommend an ebook',w.document.getElementById('book')),1);
 assert.equal(w.MatchAppReadingAI.render('Recommend an audiobook',w.document.getElementById('audio')),1);
 assert.equal(w.MatchAppReadingAI.render('Recommend a magazine',w.document.getElementById('magazine')),1);
 const sections=[...w.document.querySelectorAll('.reading-ai-sources')],cards=[...w.document.querySelectorAll('.reading-ai-card')],anchors=[...w.document.querySelectorAll('.reading-ai-card a')],hrefs=anchors.map(a=>a.href),sourceNodes=[...w.document.querySelectorAll('.reading-ai-description')],sourceTexts=sourceNodes.map(p=>p.textContent),identities=[...w.document.querySelectorAll('[data-book-identity]')],titles=identities.map(n=>n.textContent);
 const records=JSON.stringify({book,magazine});
 for(const lang of languages){
  f.select(lang);
  assert.deepEqual([...w.document.querySelectorAll('.reading-ai-sources')],sections);assert.deepEqual([...w.document.querySelectorAll('.reading-ai-card')],cards);assert.deepEqual([...w.document.querySelectorAll('.reading-ai-card a')],anchors);assert.deepEqual(anchors.map(a=>a.href),hrefs);
  assert.deepEqual([...w.document.querySelectorAll('.reading-ai-description')],sourceNodes);assert.deepEqual(sourceNodes.map(p=>p.textContent),sourceTexts);assert(sourceNodes.every(p=>p.lang==='en'&&p.hasAttribute('data-book-source-content')));
  assert.deepEqual(identities.map(n=>n.textContent),titles);assert.equal(JSON.stringify({book,magazine}),records);
  for(const node of w.document.querySelectorAll('.reading-ai-sources [data-book-copy]')){const vars=JSON.parse(node.getAttribute('data-book-vars')||'{}');assert.equal(node.textContent,w.MatchAppReadingDetailsCopy.text(node.getAttribute('data-book-copy'),vars),lang+'/'+node.getAttribute('data-book-copy'));}
  assert.equal(w.document.querySelector('.reading-source-language').textContent,w.MatchAppReadingDetailsCopy.text('reading.sourceEnglish'));
  assert.equal(sections[0].getAttribute('aria-label'),w.MatchAppReadingDetailsCopy.text('reading.sourcesAria'));assert.equal(fetches,0);
 }
 assert(anchors.some(a=>a.rel.includes('sponsored')),'existing Amazon BR disclosure/link policy remains');
 assert(!w.document.getElementById('audio').querySelector('[data-reading-affiliate]'),'audio searches stay untagged');
});
test('audio search labels and affiliate copy follow all14 saved choices without changing provider URLs or market flags',t=>{
 const f=fixture();t.after(()=>f.dom.window.close());const {w}=f;
 w.eval(read('ebooks/audiobooks.js'));w.eval(read('ebooks/affiliate-links.js'));const book={title:'Exact Source Work',author:'Mira Example'};
 const original=w.MatchAppAudiobooks.sourceSearches(book,'GB').map(({label,...record})=>record),affiliate=w.MatchAppEbookAffiliate.amazonSearchUrl(book,'BR');
 for(const lang of languages){f.select(lang);const searches=w.MatchAppAudiobooks.sourceSearches(book,'GB');assert.deepEqual(searches.map(({label,...record})=>record),original);for(const source of searches)assert.equal(source.label,w.MatchAppReadingDetailsCopy.text('audio.search',{provider:source.provider}));assert.equal(w.MatchAppEbookAffiliate.amazonSearchUrl(book,'BR'),affiliate);assert.equal(w.MatchAppEbookAffiliate.disclosure('en'),w.MatchAppReadingDetailsCopy.text('affiliate.disclosure'));assert.equal(w.MatchAppEbookAffiliate.paidLabel('en'),w.MatchAppReadingDetailsCopy.text('affiliate.paid'));}
 assert.equal(new URL(affiliate).searchParams.get('tag'),'matchapp06-20');assert.equal(w.MatchAppAudiobooks.appleStorefront('BR'),'');
});
