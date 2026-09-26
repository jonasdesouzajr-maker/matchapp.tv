'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
function load(file,key){
 const sandbox={window:{},URL};
 vm.runInNewContext(read(file),sandbox,{filename:file});
 return Array.from(sandbox.window[key]?.items||sandbox.window[key]||[]);
}
test('adult editorial book profiles expand without duplicated work identities or unsupported entries',()=>{
 const books=load('ebooks/catalog.js','MATCHAPP_EBOOK_CATALOG');
 assert(books.length>=157,'expanded adult catalog must not silently shrink');
 assert.equal(new Set(books.map(b=>b.id)).size,books.length);
 assert.equal(new Set(books.map(b=>b.title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()+'|'+b.author.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase())).size,books.length);
 for(const b of books){
  assert(b.id&&b.title&&b.author&&b.summary?.length>28,b.id);
  assert(Number.isInteger(b.year)&&b.year>=-1000&&b.year<=2026,b.id);
  assert(b.moods.length&&b.genres.length&&b.keywords.length>2,b.id);
  assert(b.access.every(a=>['free','paid'].includes(a)),b.id);
  assert(!/\b(?:porn|xxx|erotica|hentai)\b/i.test(b.title+' '+b.summary),b.id);
 }
 const moods=new Set(books.flatMap(b=>b.moods));
 assert(['cozy','mysterious','romantic','cerebral','reflective','funny','adventurous'].every(x=>moods.has(x)));
 const formats=new Set(books.flatMap(b=>b.access));
 assert(formats.has('free')&&formats.has('paid'));
 const adultHome=read('index.html'),kids=read('kids/index.html');
 assert.match(adultHome,/\/ebooks\/catalog\.js/);
 assert.doesNotMatch(kids,/\/ebooks\/catalog\.js/);
});
test('magazine publishers expand with explicit source pages, region and editorial mood tags',()=>{
 const mags=load('ebooks/magazines.js','MatchAppMagazines');
 assert(mags.length>=37,'magazine identities must not silently shrink');
 assert.equal(new Set(mags.map(x=>x.id)).size,mags.length);
 for(const m of mags){
  assert(m.title&&m.publisher&&m.summary.length>20,m.id);
  for(const key of ['site','issues','subscription']){
   assert.equal(new URL(m[key]).protocol,'https:',m.id+' '+key);
  }
  assert(m.genres.length&&m.moods.length&&m.region,m.id);
 }
 assert(mags.some(x=>x.region==='BR')&&mags.some(x=>x.region==='JP'));
 const matcher=read('ebooks/ebook-matcher.js');
 assert(matcher.includes('Original issue covers, editions and current prices are available at the publisher.'));
 assert(matcher.includes("api.select(p,market(),excluded)"));
 assert.doesNotMatch(read('kids/index.html'),/\/ebooks\/magazines\.js/);
});
