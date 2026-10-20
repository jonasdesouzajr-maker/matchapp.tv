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
