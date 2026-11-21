'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=(p)=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('paused publisher review does not reserve empty ad inventory',()=>{
 const h=read('index.html');
 assert.ok(h.includes('pauseAdRequests = 1'));
 assert.ok(h.includes("document.documentElement.classList.add('ads-empty')"));
 assert.ok(h.includes('html.ads-empty body.page-home'));
 assert.ok(h.includes('ca-pub-9541435081010948'));
});
test('short generated awareness notices stay accessible but are not indexed',()=>{
 const bot=read('tools/awareness-bot.mjs'),urls=JSON.parse(read('tools/awareness-urls.json')),map=read('sitemap.xml');
 assert.ok(bot.includes('robots(file,false)'));
 assert.ok(!bot.includes('robots(file,true)'));
 assert.deepEqual(urls,[]);
 for(const route of ['world-aids-day-2026','world-braille-day-2027']){
  assert.ok(read('awareness/'+route+'/index.html').includes('name="robots" content="noindex,follow"'));
  assert.ok(!map.includes('https://matchapp.tv/awareness/'+route+'/'));
 }
});
test('compact narrow-screen assistant caption retains localized accessible name',()=>{
 const css=read('patches/reference-header.css'),js=read('patches/reference-header.js');
 assert.ok(css.includes('content:"Jonas AI"'));
 assert.ok(js.includes("bubble.setAttribute('aria-label',copy[0])"));
});
