'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const script=fs.readFileSync(path.join(__dirname,'../latest-news.js'),'utf8');
const tick=()=>new Promise(r=>setTimeout(r,40));
async function fixture(language,country,mode='normal'){
 const w=new JSDOM(`<html lang="${language}"><head></head><body><main><section id="ma-concierge"></section></main></body></html>`,{url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true}).window;
 w.MATCH_LANG=language;w.matchMedia=()=>({matches:true});
 const realTimer=w.setTimeout.bind(w);if(mode==='timeout')w.setTimeout=(fn,ms,...args)=>realTimer(fn,ms===10000?10:ms,...args);
 const row={id:'static',title:language==='pt'?'Cantora anuncia álbum':'Singer announces album',source:'BBC',source_domain:'bbc.com',url:'https://www.bbc.com/news/articles/static',category:'entertainment',event_type:'Music',country,language,published_at:'2026-10-25T10:00:00Z'};
 let resolveRegional;
 w.fetch=async(url,options)=>{
  if(String(url).includes('/cdn-cgi/trace'))return {ok:true,text:async()=>`loc=${country}\n`};
  if(String(url).includes('/news/data.json'))return {ok:true,json:async()=>({generated_at:'2026-10-25T10:00:00Z',feed_version:'fixture',items:[row]})};
  if(String(url).includes('regional-news-rss'))return new Promise((resolve,reject)=>{resolveRegional=payload=>resolve({ok:true,json:async()=>payload});options.signal.addEventListener('abort',()=>reject(new Error('Timed out')),{once:true});});
  throw Error('Unexpected request');
 };
 w.eval(script);await tick();await tick();return {w,resolveRegional};
}
for(const [language,country,missing] of [['en','US','Publication date unavailable'],['pt','BR','Data de publicação indisponível']]){
 test(`general-news hydration stays general with honest dates and original locale (${language}/${country})`,async()=>{
  const {w,resolveRegional}=await fixture(language,country);try{
   const shell=w.document.querySelector('.ma-news-carousel-shell');assert.ok(w.document.querySelector('[data-news-id="static"]'));
   resolveRegional({feed_version:'regional-fixture',items:[{id:'regional',title:'President wins election',url:'https://news.google.com/articles/election',source:'BBC',source_home:'https://www.bbc.com',provider:'Regional RSS',scope:'local',country,language,event_type:language==='pt'?'Notícias locais':'Local news',category:'general',published_at:null,discovered_at:'2026-10-25T12:00:00Z',timestamp_kind:'discovered'},{id:'wrong',title:'Wrong country',url:'https://news.google.com/articles/wrong',source:'BBC',source_home:'https://www.bbc.com',provider:'Regional RSS',scope:'local',country:'JP',language}]});
   await tick();await tick();const card=w.document.querySelector('[data-news-id="regional"]');assert.ok(card);assert.equal(card.dataset.newsCategory,'news');assert.equal(card.dataset.newsCountry,country);assert.equal(card.dataset.newsLanguage,language);assert.ok(card.querySelector('.ma-news-source').textContent.includes(missing));assert.doesNotMatch(card.textContent,/Awards|Entertainment/);assert.doesNotMatch(card.querySelector('img').alt,/Entertainment/);
   assert.equal(w.document.querySelector('.ma-news-carousel-shell'),shell);assert.equal(w.document.querySelector('[data-news-id="wrong"]'),null);
   for(const el of w.document.querySelectorAll('.ma-news-track,[class*="ma-news-arrow"]'))assert.doesNotMatch(el.getAttribute('aria-label')||'',/entertainment/i);
  }finally{w.close();}
 });
 for(const mode of ['empty','timeout'])test(`regional ${mode} keeps the last good snapshot (${language}/${country})`,async()=>{
  const {w,resolveRegional}=await fixture(language,country,mode);try{
   if(mode==='empty')resolveRegional({items:[]});await tick();await tick();
   assert.equal(w.document.querySelectorAll('.ma-news-carousel-shell').length,1);assert.ok(w.document.querySelector('[data-news-id="static"]'));assert.equal(w.document.querySelectorAll('.ma-news-card').length,1);
  }finally{w.close();}
 });
}
