'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module'),{JSDOM,VirtualConsole}=require('jsdom');
const root=path.join(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8'),images=require('../news-images.js');
function templates(){const file=path.join(root,'tools/refresh-news-rss.js'),source=read('tools/refresh-news-rss.js');return vm.runInNewContext(source.slice(0,source.indexOf('(async()=>{'))+';({page,hub})',{require:createRequire(file),__dirname:path.dirname(file),URL,Date,console});}
function story(extra={}){return {id:'image-fixture',title:'Original headline <test>',source:'BBC',source_domain:'bbc.com',source_home:'https://www.bbc.com',url:'https://www.bbc.com/news/articles/test',category:'world',event_type:'World',language:'en',published_at:'2026-10-30T10:00:00Z',discovered_at:'2026-10-30T10:01:00Z',description:'Source attribution unchanged.',matchapp_url:'https://matchapp.tv/news/articles/test/',landing_url:'https://matchapp.tv/?news=image-fixture#latest-news',seo:{meta_title:'Original | MatchApp Ai',meta_description:'Original source',keywords:['news'],short_tail:[],entity_keywords:[],trend_keywords:[],seo_generated_at:'2026-10-30T10:01:00Z'},...extra};}
function fixture(markup){const dom=new JSDOM('<html lang="en"><head></head><body>'+markup+'</body></html>',{url:'https://matchapp.tv/news/',runScripts:'outside-only',virtualConsole:new VirtualConsole()});dom.window.localStorage.setItem('match_lang','pt-BR');return dom;}

test('future browser hub and article templates keep source links but render owned labelled artwork',()=>{
 const t=templates(),items=[story({image:'https://publisher.example/exact-story.jpg?x=1&y=2'}),story({id:'sports',image:null,category:'sports',event_type:'Sports'})];
 const dom=new JSDOM(t.hub(items,'2026-10-30T10:01:00Z'));
 try{
  const cards=[...dom.window.document.querySelectorAll('[data-native-news-feed] > article')];assert.equal(cards.length,2);
  for(const card of cards)assert.equal(card.querySelectorAll('[data-news-media] img').length,1);
  assert.equal(cards[0].querySelector('img').getAttribute('src'),'/assets/news/topics/world.svg');
  assert.equal(cards[0].querySelector('[data-news-media]').dataset.newsSourceImage,items[0].image,'passive provenance is not an image request');
  assert.equal(cards[0].querySelector('[data-news-illustration-label]').hidden,false);
  assert.equal(cards[1].querySelector('img').getAttribute('src'),'/assets/news/topics/sports.svg');
  assert.equal(cards[1].querySelector('[data-news-illustration-label]').hidden,false);
  assert.equal(cards[0].querySelector('[data-news-source-title]').textContent,items[0].title);
  const article=new JSDOM(t.page(items[1]));try{assert.equal(article.window.document.querySelector('main [data-news-media] img').getAttribute('src'),'/assets/news/topics/sports.svg');}finally{article.window.close();}
 }finally{dom.window.close();}
});

test('all original topic illustrations exist and all fourteen languages explicitly label them',()=>{
 for(const item of [{category:'entertainment'},{category:'world'},{category:'sports'},{event_type:'Music'},{}]){
  const file=images.fallback(item);assert.match(file,/^\/assets\/news\/topics\/[^/]+\.svg$/);assert.match(read(file.slice(1)),/Representative illustration, not a photograph/);
 }
 for(const code of ['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh']){assert(images.label(code));assert(images.markup(story({image:null}),code).includes(images.label(code)));}
 for(const value of ['javascript:alert(1)','data:image/svg+xml,untrusted','https://user:password@example.org/picture.jpg'])assert.equal(images.source({image:value}),null);
});

test('browser source markup becomes owned artwork once without changing source identity or links',()=>{
 const item=story({image:'https://publisher.example/exact-photo.jpg'}),dom=fixture('<article><h2>Original source headline</h2>'+images.markup(item,'en',{native:true})+'<a href="https://publisher.example/original">Original source</a></article>'),w=dom.window;
 try{
  const img=w.document.querySelector('img'),anchor=w.document.querySelector('a'),title=w.document.querySelector('h2');
  Object.defineProperty(img,'complete',{value:false,configurable:true});w.eval(read('news-images.js'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  assert.equal(img.getAttribute('src'),'/assets/news/topics/world.svg');assert.equal(w.document.querySelector('figcaption').hidden,false);
  img.dispatchEvent(new w.Event('error'));assert.equal(img.getAttribute('src'),'/assets/news/topics/world.svg');
  assert.equal(w.document.querySelector('figcaption').hidden,false);assert.equal(w.document.querySelector('figcaption').textContent,'Ilustração');
  assert.equal(img.alt,'Ilustração');assert.equal(title.textContent,'Original source headline');assert.equal(anchor.href,'https://publisher.example/original');
  let writes=0;const set=img.setAttribute.bind(img);img.setAttribute=(name,value)=>{if(name==='src')writes++;set(name,value);};
  img.dispatchEvent(new w.Event('error'));w.MatchAppNewsImages.init(w);img.dispatchEvent(new w.Event('error'));assert.equal(writes,0,'a missing local fallback cannot create an image error loop');
  w.localStorage.setItem('match_lang','ja');w.document.dispatchEvent(new w.Event('matchapp:langchange'));assert.equal(img.alt,'イラスト');assert.equal(w.document.querySelector('figcaption').textContent,'イラスト');
 }finally{w.close();}
});

test('the shared runtime creates an original labelled fallback for a new snapshot/live card without fetching a logo',()=>{
 const dom=fixture(''),w=dom.window;try{w.eval(read('news-images.js'));const media=w.MatchAppNewsImages.create(w,{category:'entertainment'});w.document.body.append(media);assert.equal(media.querySelector('img').getAttribute('src'),'/assets/news/topics/entertainment.svg');assert.equal(media.querySelector('figcaption').textContent,'Ilustração');assert.equal(media.querySelector('figcaption').hidden,false);assert.equal(w.document.querySelectorAll('link[data-news-image-styles]').length,1);}finally{w.close();}
});

test('native news keeps its existing source presentation while browser source fields cannot enable remote photos',()=>{
 const item=story({image:'https://publisher.example/verified-identity.jpg',image_rights:{license:'claimed'}});
 const browser=fixture(images.markup(item)),native=fixture(images.markup(item));
 try{
  const b=browser.window,n=native.window;Object.defineProperty(n.navigator,'userAgent',{value:'MatchAppAiAndroid/1.1.71'});
  for(const w of [b,n]){Object.defineProperty(w.document.querySelector('img'),'complete',{value:false});w.eval(read('news-images.js'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));}
  assert.equal(b.document.querySelector('img').getAttribute('src'),'/assets/news/topics/world.svg');
  assert.equal(n.document.querySelector('img').getAttribute('src'),item.image);
  assert.equal(n.document.querySelector('figcaption').hidden,true);
  assert.equal(n.MatchAppNewsImages.create(n,item).querySelector('img').getAttribute('src'),item.image);
 }finally{browser.window.close();native.window.close();}
});
