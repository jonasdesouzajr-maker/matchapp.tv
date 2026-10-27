'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('Home search metadata no longer promises the removed custom avatar feature',()=>{
 const dom=new JSDOM(read('index.html'));
 try{
  const app=[...dom.window.document.querySelectorAll('script[type="application/ld+json"]')].map(s=>JSON.parse(s.textContent)).find(s=>s['@type']==='SoftwareApplication');
  assert.ok(app);assert.ok(app.featureList.length>0);
  assert.doesNotMatch(app.featureList.join(' '),/custom.*avatar/i);
  assert.ok(app.featureList.includes('Match Together joint recommendations'));
 }finally{dom.window.close();}
});
test('event search snippets distinguish current, future and archived editions with verified dates',()=>{
 const cases=[['tokyo-international-film-festival-2026',/Tokyo Film Festival 2026/,/26 October–4 November 2026/],['ccxp-2026',/CCXP 2026 \(CCXP26\)/,/3–6 December 2026/],['brasil-game-show-2026',/Event Archive/,/ran 9–12 October/]];
 for(const [slug,title,desc]of cases){
  const dom=new JSDOM(read(`events/${slug}/index.html`));
  try{
   const d=dom.window.document;assert.match(d.title,title);assert.ok(d.title.length<75);
   const description=d.querySelector('meta[name="description"]').content;assert.match(description,desc);assert.ok(description.length<160);
   assert.equal(d.querySelector('meta[property="og:description"]').content,description);
   assert.equal(d.querySelector('meta[name="twitter:description"]').content,description);
   if(slug==='tokyo-international-film-festival-2026'){
    assert.ok(d.querySelector('a[href="https://2026.tiff-jp.net/en/schedule/list/"]'));
    assert.ok(d.querySelector('a[href="https://2026.tiff-jp.net/en/ticket/"]'));
   }
   if(slug==='brasil-game-show-2026')assert.equal(d.querySelector('[data-event-status]').textContent,'Ended');
  }finally{dom.window.close();}
 }
});
test('SBT metadata dates its selection instead of promising a freshly checked catalogue',()=>{
 const dom=new JSDOM(read('platforms/plus-sbt/index.html'));
 try {const description=dom.window.document.querySelector('meta[name="description"]').content;assert.match(description,/4 de outubro de 2026/);assert.doesNotMatch(description,/catálogo atual/);assert.match(description,/confirme a disponibilidade/);}finally{dom.window.close();}
});
test('Halloween trend addition is attributed, dated and authored for every app language',()=>{
 const data=JSON.parse(read('data/october-trends-editorial.json'));
 assert.equal(data.sources.frightgeist,'https://blog.google/products-and-platforms/products/search/frightgeist-halloween-trends-2026/');
 for(const [lang,copy]of Object.entries(data.copy)){assert.ok(copy.searchTrends.length>40,lang);assert.match(copy.searchTrends,/2019/,lang);}
 assert.match(data.copy.en.searchTrends,/not a Google ranking/);
 const dom=new JSDOM(read('guides/streaming-music-books-october-2026/index.html'));
 try{assert.equal(dom.window.document.querySelector('[data-october-copy="searchTrends"]').textContent,data.copy.en.searchTrends);assert.equal(dom.window.document.querySelectorAll('script[src^="/patches/october-trends-locales.js"]').length,1);}finally{dom.window.close();}
});
