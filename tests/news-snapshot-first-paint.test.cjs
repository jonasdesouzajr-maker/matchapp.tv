'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const script=fs.readFileSync(path.join(__dirname,'..','latest-news.js'),'utf8');
const tick=()=>new Promise(r=>setTimeout(r,35));
async function fixture(){
 const w=new JSDOM('<html lang="pt-BR"><head></head><body><main><section id="ma-concierge"></section></main></body></html>',{url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true}).window;
 w.matchMedia=()=>({matches:true});w.MATCH_LANG='pt-BR';
 let resolveRegional,requested=false;
 const row=(id,country,language)=>({id,title:'Verified publisher '+id,url:'https://www.reuters.com/world/'+id,source:'Reuters',source_domain:'reuters.com',country,language,category:'entertainment',published_at:'2026-10-12T10:00:00Z'});
 w.fetch=async url=>{if(String(url).includes('/cdn-cgi/trace'))return {ok:true,text:async()=> 'loc=BR\n'};
 if(String(url).includes('/news/data.json'))return {ok:true,json:async()=>({generated_at:'2026-10-12T10:00:00Z',feed_version:'snapshot',items:[row('br','BR','pt'),row('wrong-country','US','pt'),row('wrong-language','GLOBAL','en')]})};
 if(String(url).includes('regional-news-rss')){requested=true;return new Promise(resolve=>{resolveRegional=resolve})}throw Error('Unexpected request '+url)};
 w.eval(script);await tick();await tick();return {w,resolve:payload=>resolveRegional({ok:true,json:async()=>payload}),requested:()=>requested};
}
test('verified snapshot renders while optional regional request is unresolved and keeps locale rules',async()=>{
 const f=await fixture();try{assert.ok(f.requested());const cards=[...f.w.document.querySelectorAll('.ma-news-card')];assert.equal(cards.length,1);assert.equal(cards[0].dataset.newsId,'br');assert.equal(cards[0].dataset.newsCountry,'BR');assert.equal(cards[0].dataset.newsLanguage,'pt');assert.equal(cards[0].querySelector('a').href,'https://www.reuters.com/world/br');}finally{f.w.close()}
});
test('regional response updates the same carousel while keeping verified snapshot fallback',async()=>{
 const f=await fixture();try{const shell=f.w.document.querySelector('.ma-news-carousel-shell');f.resolve({ok:true,feed_version:'regional',country:'BR',language:'pt',items:[{id:'regional',title:'Verified regional headline',url:'https://news.google.com/articles/example',source:'Named publisher',source_home:'https://www.reuters.com/',provider:'Regional RSS',country:'BR',language:'pt',scope:'local',published_at:'2026-10-12T11:00:00Z'}]});await tick();await tick();
 assert.equal(f.w.document.querySelectorAll('.ma-news-carousel-shell').length,1);assert.equal(f.w.document.querySelector('.ma-news-carousel-shell'),shell);assert.ok(f.w.document.querySelector('[data-news-id="regional"]'));assert.ok(f.w.document.querySelector('[data-news-id="br"]'));assert.equal(f.w.document.querySelectorAll('.ma-news-meta').length,1);
 }finally{f.w.close()}
});
test('empty regional response preserves snapshot and does not create a second carousel',async()=>{
 const f=await fixture();try{const shell=f.w.document.querySelector('.ma-news-carousel-shell');f.resolve({items:[]});await tick();await tick();assert.equal(f.w.document.querySelector('.ma-news-carousel-shell'),shell);assert.equal(f.w.document.querySelectorAll('.ma-news-card').length,1);assert.equal(f.w.document.querySelector('.ma-news-card').dataset.newsId,'br');}finally{f.w.close()}
});
