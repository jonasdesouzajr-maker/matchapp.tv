const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const base=path.resolve(__dirname,'..');const read=p=>fs.readFileSync(path.join(base,p),'utf8');

test('News shows exact trusted static publisher card before a stalled regional source finishes',async()=>{
 const dom=new JSDOM('<!doctype html><html lang="en"><body><main><section id="ma-concierge"><div id="ebook-matcher-root"></div></section><details id="premiere-disclosure"></details></main></body></html>',{url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;w.requestAnimationFrame=fn=>{fn();return 1};
 w.matchMedia=()=>({matches:true,addListener(){},removeListener(){}});
 let unblockRegional;
 w.fetch=async url=>{
  const u=String(url);
  if(u.includes('/cdn-cgi/trace'))return {ok:false};
  if(u.includes('/news/data.json'))return {ok:true,json:async()=>({
   feed_version:'source-snapshot-a',generated_at:'2026-10-11T12:00:00Z',items:[
    {id:'verified-one',title:'An independently verified publisher report',source:'Reuters',source_domain:'reuters.com',
     url:'https://www.reuters.com/world/',published_at:'2026-10-11T12:00:00Z',country:'US',category:'entertainment',event_type:'Entertainment'}
   ]
  })};
  return new Promise(resolve=>{unblockRegional=resolve});
 };
 try{
  w.eval(read('latest-news.js'));
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  const news=w.document.getElementById('latest-news');
  assert.ok(news);news.querySelector('summary').click();
  for(let i=0;i<40 && !news.querySelector('.ma-news-card-main');i++)await new Promise(r=>setTimeout(r,5));
  assert.equal(news.open,true);
  assert.equal(news.dataset.newsStaticPainted,'true');
  assert.equal(news.querySelector('.ma-news-card-main')?.getAttribute('href'),'https://www.reuters.com/world/');
  assert.ok(typeof unblockRegional==='function','the regional request is still pending');
  assert.ok(!news.querySelector('.ma-news-empty'),'no endless loading label when verified cards exist');
  unblockRegional({ok:false});
  await new Promise(r=>setTimeout(r,25));
  assert.equal(news.querySelector('.ma-news-card-main')?.getAttribute('href'),'https://www.reuters.com/world/');
 }finally{dom.window.close()}
});

test('static-first news keeps country, language, source and ad protections',()=>{
 const source=read('latest-news.js');const before=source.indexOf('const staticChoice=chooseItems('),paint=source.indexOf('section.dataset.newsStaticPainted'),regional=source.indexOf('const regional=await fetchRegional(',before);
 assert.ok(before>0 && before<paint && paint<regional);
 assert.match(source.slice(before,regional),/rail\(staticChoice.combined\)/);
 assert.match(source,/\.filter\(trustedItem\)/);
 assert.doesNotMatch(source,/adsbygoogle|data-ad-slot=/);
 assert.match(source,/mergeRegionalItems\(regional.items,staticChoice,country,language/);
});
