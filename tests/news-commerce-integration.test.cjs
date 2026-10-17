'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module'),{JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,35));
function templates(){
  const file=path.join(root,'tools/refresh-news-rss.js'),source=read('tools/refresh-news-rss.js');
  const context={require:createRequire(file),__dirname:path.dirname(file),URL,console};
  vm.createContext(context);vm.runInContext(source.slice(0,source.indexOf('(async()=>{'))+'\nthis.render={page,hub};',context);
  return context.render;
}
function story(extra={}){
  return {id:'test-film',title:'Netflix shares a trailer for the new film',url:'https://www.hollywoodreporter.com/movies/movie-news/test-film/',source:'The Hollywood Reporter',source_domain:'hollywoodreporter.com',source_home:'https://www.hollywoodreporter.com/',description:'The studio released a new film trailer.',category:'entertainment',event_type:'Release',country:'US',language:'en',published_at:'2026-10-17T10:00:00Z',discovered_at:'2026-10-17T10:05:00Z',matchapp_url:'https://matchapp.tv/news/articles/test-film/',landing_url:'https://matchapp.tv/?news=test-film#latest-news',seo:{meta_title:'A film update | MatchApp Ai',meta_description:'Publisher context for a film update.',keywords:['film'],short_tail:['film'],entity_keywords:['Netflix'],trend_keywords:[],seo_generated_at:'2026-10-17T10:05:00Z'},...extra};
}

test('the sole news generator reserves contextual slots and preserves original source records',()=>{
  const render=templates(),item=story({title:'Netflix shares a trailer for the film "A & B"'}),html=render.page(item),d=new JSDOM(html).window.document;
  try{
    const card=d.querySelector('article'),slot=card.querySelector('[data-news-commerce-slot]');
    assert.ok(slot);assert.equal(card.dataset.newsTitle,item.title);assert.equal(card.dataset.newsCategory,'entertainment');assert.equal(card.dataset.newsSourceUrl,item.url);
    assert.equal(card.querySelector('h1').textContent,item.title);assert.equal(card.querySelector('p:nth-of-type(2)').textContent,item.description);
    assert.ok(Array.from(card.querySelectorAll('a')).some(anchor=>anchor.href===item.url));assert.ok(Array.from(card.querySelectorAll('a')).some(anchor=>anchor.href===item.landing_url));
    assert.equal(slot.querySelector('a').textContent,'Explore Netflix↗');assert.equal(slot.querySelector('[data-availability-checked]'),null);
    assert.ok(d.head.querySelector('link[href^="/news-monetization.css"]'));assert.ok(d.head.querySelector('script[defer][src^="/news-monetization.js"]'));
    assert.equal(d.querySelectorAll('a a,ins.adsbygoogle').length,0);
    for(const item of [story({category:'world'}),story({event_type:'Obituary'}),story({description:'The star has died.'}),story({url:'javascript:alert(1)'})]){
      const doc=new JSDOM(render.page(item)).window.document;assert.equal(doc.querySelector('[data-news-commerce-slot]'),null);assert.equal(doc.querySelector('script[src^="/news-monetization.js"]'),null);doc.defaultView.close();
    }
  }finally{d.defaultView.close();}
});

test('generated offers start with no assumed country and do not inherit an article market',()=>{
  const render=templates(),html=render.hub([story({country:'US'})],'2026-10-17T10:00:00Z'),d=new JSDOM(html).window.document;
  try{
    const host=d.querySelector('[data-news-local-offers]');assert.ok(host);
    assert.equal(host.querySelector('details').open,false);assert.equal(host.querySelector('select').value,'');assert.equal(host.querySelectorAll('.ma-news-offer-card').length,0);
    assert.equal(d.documentElement.dataset.newsCountry,undefined);
    assert.equal(d.querySelector('[data-news-commerce-card]').dataset.newsCategory,'entertainment');
  }finally{d.defaultView.close();}
});

test('the actual generator adds only a native hub marker and assets, preserving all article/source nodes',()=>{
  const render=templates(),items=Array.from({length:9},(_,index)=>story({id:'native-fixture-'+index,title:'Original headline '+index,url:'https://www.hollywoodreporter.com/report-'+index+'/'}));
  const d=new JSDOM(render.hub(items,'2026-10-17T10:00:00Z')).window.document;
  try{
    const feed=d.querySelector('[data-native-news-feed]');assert.ok(feed);assert.equal(feed.children.length,items.length);
    assert.equal(d.querySelector('[data-native-news-slot]'),null,'generated web HTML contains no advertising reservation');
    assert.ok(d.head.querySelector('script[defer][src^="/native-news-slot.js"]'));assert.ok(d.head.querySelector('link[href^="/native-news-slot.css"]'));
    assert.deepEqual([...feed.querySelectorAll('h2')].map(el=>el.textContent),items.map(item=>item.title));
    for(const item of items)assert.ok([...feed.querySelectorAll('a')].some(a=>a.href===item.url));
    const article=new JSDOM(render.page(items[0])).window.document;assert.equal(article.querySelector('[data-native-news-feed],script[src^="/native-news-slot.js"]'),null);article.defaultView.close();
    for(const name of ['index.html','ebooks/index.html']){const doc=new JSDOM(read(name)).window.document;assert.ok(doc.querySelector('script[defer][src^="/native-news-slot.js"]'));assert.equal(doc.querySelector('[data-native-news-slot],[data-native-news-feed]'),null);doc.defaultView.close();}
  }finally{d.defaultView.close();}
});

test('asynchronous Home news preserves its rail and source handler while new slots follow chosen language',async()=>{
  const w=new JSDOM('<html lang="en"><head></head><body class="page-home"><main><section id="ma-concierge"></section></main></body></html>',{url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true}).window;
  const calls=[],requests=[];let resolveRegional;
  w.matchMedia=()=>({matches:true});w.MATCH_LANG='en';w.dataLayer=calls;w.localStorage.setItem('match_user_region','US');
  const item=story();
  w.fetch=async input=>{
    const url=String(input);requests.push(url);
    if(url.includes('/cdn-cgi/trace'))return {ok:true,text:async()=> 'loc=US\n'};
    if(url.includes('/news/data.json'))return {ok:true,json:async()=>({generated_at:item.discovered_at,feed_version:'snapshot',items:[item,story({id:'sensitive',title:'Netflix film actor has died',event_type:'Obituary'})]})};
    if(url.includes('regional-news-rss'))return new Promise(resolve=>{resolveRegional=resolve;});
    throw Error('Unexpected request');
  };
  try{
    w.eval(read('news-monetization.js'));w.eval(read('latest-news.js'));await tick();await tick();
    const d=w.document,rail=d.querySelector('.ma-news-carousel-shell'),card=d.querySelector('[data-news-id="test-film"]');
    assert.ok(card.querySelector('[data-news-commerce-slot]'),'slot exists in the first snapshot while optional enrichment is unresolved');
    assert.equal(d.querySelector('[data-news-id="sensitive"] [data-news-commerce-slot]'),null);
    const anchor=card.querySelector('.ma-news-card-main'),poster=card.querySelector('img'),href=anchor.href,headline=card.querySelector('h3').textContent;
    anchor.addEventListener('click',event=>event.preventDefault());anchor.click();assert.ok(calls.some(row=>row.event==='latest_news_click'));
    w.MATCH_LANG='fr';d.dispatchEvent(new w.CustomEvent('matchapp:langchange'));
    assert.equal(card.querySelector('[data-news-commerce-slot] a').textContent,'Explorer Netflix↗');
    assert.equal(card.querySelector('img'),poster);assert.equal(card.querySelector('.ma-news-card-main'),anchor);assert.equal(anchor.href,href);assert.equal(card.querySelector('h3').textContent,headline);
    resolveRegional({ok:true,json:async()=>({items:[]})});await tick();await tick();
    assert.equal(d.querySelectorAll('.ma-news-carousel-shell').length,1);assert.equal(d.querySelector('.ma-news-carousel-shell'),rail);
    assert.equal(d.querySelector('[data-news-commerce-slot]').lang,'fr');
    assert.equal(requests.filter(url=>url.includes('/news/data.json')).length,1);assert.equal(requests.filter(url=>url.includes('regional-news-rss')).length,1);assert.ok(requests.every(url=>url.includes('/cdn-cgi/trace')||url.includes('/news/data.json')||url.includes('regional-news-rss')));
  }finally{w.close();}
});
