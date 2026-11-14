'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const data=JSON.parse(read('data/october-trends-editorial.json'));
test('editorial discovery links preserve exact identities without asserting popularity or availability',()=>{
 const dom=new JSDOM(read('trending/this-week/index.html'),{url:'https://matchapp.tv/trending/this-week/'});
 try{
  const d=dom.window.document,s=d.querySelector('#discovery-collections');
  assert.equal(d.querySelectorAll('#discovery-collections').length,1);
  assert.equal(s.closest('.grid'),null,'editorial links are not ranked feed entries');
  assert.deepEqual([...s.querySelectorAll('a[href^="/discover.html"]')].map(a=>new URL(a.href).searchParams.get('q')),['VisionQuest Paul Bettany','All’s Fair Kim Kardashian','Stick Owen Wilson']);
  assert.deepEqual([...s.querySelectorAll('a[href^="https:"]')].map(a=>a.href),['https://thewaltdisneycompany.com/news/marvel-television-visionquest-disney-plus/','https://press.hulu.com/shows/alls-fair/','https://www.apple.com/tv-pr/originals/stick/']);
  assert.doesNotMatch(s.textContent,/trending|worldwide|streaming now|season\s*2|#\d|2026/i);
  assert.equal(s.querySelectorAll('img,iframe,video').length,0);
  assert.ok(d.querySelector('[data-october-guide-link] a[href$="#october-30-book-screen"]'));
  const feedDate=JSON.parse(read('data/trending-week.json')).updated.slice(0,10);
  assert.ok(d.querySelector('.intro').textContent.includes(feedDate),'visible timestamp must retain the actual feed date');
  const generator=read('tools/refresh-trending.mjs');
  assert.equal((generator.match(/id="discovery-collections"/g)||[]).length,1);
  assert.ok(generator.includes(s.outerHTML),'daily publisher retains the same editorial section');
 }finally{dom.window.close()}
});
test('discovery labels honor all fifteen existing languages and keep exact query destinations',()=>{
 for(const lang of Object.keys(data.copy)){
  const dom=new JSDOM(read('trending/this-week/index.html'),{url:'https://matchapp.tv/trending/this-week/',runScripts:'outside-only'});
  try{
   const w=dom.window,s=w.document.querySelector('#discovery-collections'),before=[...s.querySelectorAll('a')].map(a=>a.href);
   w.localStorage.setItem('match_lang',lang);w.eval(read('patches/october-trends-locales.js'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
   for(const el of s.querySelectorAll('[data-october-copy]')){assert.ok(data.copy[lang][el.dataset.octoberCopy]);assert.equal(el.textContent,data.copy[lang][el.dataset.octoberCopy]);assert.equal(el.lang,lang);assert.equal(el.dir,lang==='ar'?'rtl':'ltr')}
   assert.deepEqual([...s.querySelectorAll('a')].map(a=>a.href),before);
   assert.equal(w.localStorage.getItem('match_lang'),lang);
  }finally{dom.window.close()}
 }
});
