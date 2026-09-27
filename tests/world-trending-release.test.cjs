'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const ROOT=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const trackIds=[
 ['BbY WOW','3h5T5JypYU7huFiVYhv1dr'],
 ["Choosin' Texas",'65DbTqJKhbwqYbZ1Okr0rc'],
 ['Training Season','6Qb7YsAqH4wWFUMbGsCpap'],
 ['Dai Dai','0kosUz0jePvjiz4ctmR6wL'],
 ['Ordinary','6qqrTXSdwiJaq8SO0X2lSe'],
 ['Man I Need','1qbmS6ep2hbBRaEZFpn7BX']
];
function adultExtras(){
 const src=read('catalog-plus.js');
 const a=src.indexOf('const extra=['),b=src.lastIndexOf('];function merge');
 assert.ok(a>=0&&b>a,'adult catalog extraction signature');
 return vm.runInNewContext(src.slice(a+'const extra='.length,b+1));
}
test('verified adult Netflix and Spotify additions are deduplicated with authenticated original music art',()=>{
 const extras=adultExtras();
 for(const title of ['Gandhari','Physical 100: Mexico','Crew Girl','Not a Stranger','Fauda','KPop Demon Hunters']){
  const hit=extras.filter(x=>x.title===title);
  assert.equal(hit.length,1,title);
  assert.ok(hit[0].sourceUrl?.startsWith('https://'),'official source required');
  assert.equal(hit[0].platform,'Netflix');
 }
 for(const [title,id] of trackIds){
  const hits=extras.filter(x=>x.officialTitle===title&&x.cats?.includes('Spotify single'));
  assert.equal(hits.length,1,title);
  assert.equal(hits[0].watchUrl,'https://open.spotify.com/track/'+id);
  assert.match(hits[0].poster,/^https:\/\/i\.scdn\.co\/image\/[A-Za-z0-9]+$/);
  assert.deepEqual(Array.from(hits[0].moods),[],'no invented audio moods');
 }
 const keys=extras.map(e=>e.title.toLowerCase());
 assert.equal(new Set(keys).size,keys.length,'catalog extras must not self duplicate');
});
test('publisher-verified books have original summaries and no automatically invented audiobook links',()=>{
 const dom=new JSDOM('',{url:'https://matchapp.tv/',runScripts:'outside-only'});
 dom.window.eval(read('ebooks/catalog.js'));
 const list=dom.window.MATCHAPP_EBOOK_CATALOG;
 for(const title of ['Fury in Death','Burn of the Everflame','The Calamity Club','Double Tap','Taipei Story']){
  const match=list.filter(x=>x.title===title);
  assert.equal(match.length,1,title);
  assert.ok(match[0].publisherUrl?.startsWith('https://'));
  assert.ok(match[0].summary?.length>65);
  assert.ok(!match[0].access.includes('free'),'do not suggest free copyrighted editions');
 }
 const double=list.find(x=>x.title==='Double Tap');
 assert.equal(double.audioIsbn,'9781668108628');
 assert.ok(list.filter(x=>x.audioPublisherUrl).length>=1);
 dom.window.close();
 assert.doesNotMatch(read('ebooks/top-ebooks.js'),/market:'GLOBAL'/,'US charts are not global');
});
test('three substantial editorial guides are navigable, indexable and backed by accurate structured data',()=>{
 const paths=['what-to-watch-september-2026','global-music-september-2026','books-september-2026','filmes-series-em-alta-brasil-setembro-2026','peliculas-series-tendencia-mexico-septiembre-2026'];
 const html=read('index.html'),sitemap=read('tools/update-sitemap.js');
 for(const slug of paths){
  const doc=new JSDOM(read('guides/'+slug+'/index.html')).window.document;
  assert.equal(doc.querySelectorAll('h1').length,1);
  assert.equal(doc.querySelector('meta[name="robots"]').content.includes('index'),true);
  assert.equal(doc.querySelector('link[rel="canonical"]')?.href,'https://matchapp.tv/guides/'+slug+'/');
  assert.ok(doc.querySelector('meta[name="description"]')?.content.length>80);
  assert.ok(doc.body.textContent.length>1500,'substantive editorial content');
  const schema=JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent);
  assert.ok(schema['@graph'].some(row=>row['@type']==='CollectionPage'));
  assert.ok(schema['@graph'].some(row=>row['@type']==='BreadcrumbList'));
  assert.ok(html.includes('/guides/'+slug+'/'),'homepage needs actual internal link');
  assert.ok(sitemap.includes('/guides/'+slug+'/'),'sitemap generator needs guide');
 }
});
test('world news is gated to independent trusted publisher feeds and slots without displacing sports',()=>{
 const refresh=read('tools/refresh-news-rss.js'),latest=read('latest-news.js');
 for(const x of ['feeds.bbci.co.uk/news/world','feeds.bbci.co.uk/news/technology','feeds.bbci.co.uk/news/science_and_environment'])assert.ok(refresh.includes(x));
 assert.ok(refresh.includes("const TREND_GEOS=['BR','US','GB','MX','IN']"));
 assert.ok(refresh.includes("category:isWorld?'world':'entertainment'"));
 assert.ok(latest.includes('const MAX_WORLD=2'));
 assert.ok(latest.includes("item.category==='world'?'world':'entertainment'"));
 assert.ok(latest.includes("items.filter(i=>i.category==='sports')"));
 assert.ok(refresh.includes('World News'));
});
test('audiobook live audit waits for verified cover rather than accepting an unpainted placeholder',()=>{
 const s=read('tools/live-production-deep-matching.cjs');
 assert.ok(s.includes("await page.waitForFunction(()=>{"));
 assert.ok(s.includes("img.complete&&img.naturalWidth>0"));
 assert.ok(s.includes("record('LIVE audiobook original edition cover',cover,result.title)"));
 assert.match(read('tests/adsense-lock.test.cjs'),/initializer is byte-for-byte locked/);
});
