'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const data=JSON.parse(read('data/october-trends-editorial.json'));
const route='/guides/streaming-music-books-october-2026/';
test('dated October editorial is crawlable, source-backed and distinct from old charts',()=>{
 const dom=new JSDOM(read(route.slice(1)+'index.html'));
 try{
  const d=dom.window.document,s=d.querySelector('#october-15-trends');
  assert.ok(s);assert.equal(s.querySelector('time').dateTime,'2026-10-15');
  assert.equal(d.querySelector('link[rel="canonical"]').href,'https://matchapp.tv'+route);
  assert.match(d.querySelector('meta[name="robots"]').content,/index,follow/);
  for(const url of Object.values(data.sources))assert.ok([...s.querySelectorAll('a')].some(a=>a.href===url),url);
  assert.match(s.textContent,/United States, not Brazil or the world/);
  assert.match(s.textContent,/not The Passenger \(2023\)/);
  assert.match(s.textContent,/does not confirm a streaming release for Other Mommy/);
  assert.match(s.textContent,/upcoming, not streaming now/);
  assert.match(s.textContent,/February 12, 2027/);assert.match(s.textContent,/April 2, 2027/);
  assert.match(s.textContent,/outside Kids Mode/);
  assert.equal(s.querySelectorAll('iframe').length,0);
  const queries=[...s.querySelectorAll('a[href^="/discover.html"]')].map(a=>new URL(a.href,'https://matchapp.tv').searchParams.get('q'));
  assert.deepEqual(queries,['Hocus Pocus 1993','The Nightmare Before Christmas 1993','Passenger 2026','Other Mommy 2026','East of Eden 2026 series']);
  assert.ok(s.querySelector('a[href="/ebooks/"]'));
  assert.ok(d.body.textContent.includes('Checked October 4, 2026.'),'prior dated chart sources retain their original check date');
  for(const script of d.querySelectorAll('script[type="application/ld+json"]'))JSON.parse(script.textContent);
  for(const a of s.querySelectorAll('a[href^="/"]')){
   const p=new URL(a.href,'https://matchapp.tv').pathname;
   assert.ok(fs.existsSync(path.join(root,p.endsWith('/')?p+'index.html':p)),p);
  }
 }finally{dom.window.close()}
});
test('all fourteen app languages have authored editorial copy and preserve exact title links',()=>{
 const languages=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
 assert.deepEqual(Object.keys(data.copy),languages);
 for(const lang of languages){
  const dom=new JSDOM(read(route.slice(1)+'index.html'),{url:'https://matchapp.tv'+route,runScripts:'outside-only'});
  try{
   const w=dom.window,links=[...w.document.querySelectorAll('#october-15-trends a')].map(a=>a.href);
   w.localStorage.setItem('match_lang',lang);w.MATCH_LANG='en';
   w.eval(read('patches/october-trends-locales.js'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
   const section=w.document.querySelector('#october-15-trends');
   assert.equal(section.lang,lang);assert.equal(section.dir,lang==='ar'?'rtl':'ltr');
   for(const el of section.querySelectorAll('[data-october-copy]')){
    const value=data.copy[lang][el.dataset.octoberCopy];assert.ok(value);assert.equal(el.textContent,value);
   }
   assert.deepEqual([...section.querySelectorAll('a')].map(a=>a.href),links);
   w.document.dispatchEvent(new w.CustomEvent('matchapp:langchange',{detail:{lang:'pt-BR'}}));
   assert.equal(section.querySelector('h2').textContent,data.copy['pt-BR'].heading);
   assert.equal(w.localStorage.getItem('match_lang'),lang,'editorial must not override the app preference');
  }finally{dom.window.close()}
 }
});
test('weekly generator retains the contextual guide link without changing the editorial feed',()=>{
 for(const file of ['trending/this-week/index.html','tools/refresh-trending.mjs']){
  const src=read(file);assert.ok(src.includes('href="'+route+'#october-15-trends"'));
  assert.equal((src.match(/data-october-guide-link/g)||[]).length,1);
  assert.ok(src.includes('/patches/october-trends-locales.js?v=20261027-1'));
 }
 const dom=new JSDOM(read('trending/this-week/index.html'),{url:'https://matchapp.tv/trending/this-week/',runScripts:'outside-only'});
 try{dom.window.localStorage.setItem('match_lang','pt-BR');dom.window.eval(read('patches/october-trends-locales.js'));dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));assert.equal(dom.window.document.querySelector('[data-october-guide-link] span').textContent,data.copy['pt-BR'].link)}finally{dom.window.close()}
 assert.ok(read('sitemap.xml').includes('https://matchapp.tv'+route));
});
