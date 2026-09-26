'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const ROOT=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
function catalogs(){
 const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://matchapp.tv/',runScripts:'outside-only'});
 dom.window.eval(read('ebooks/catalog.js'));
 dom.window.eval(read('ebooks/magazines.js'));
 return dom;
}
test('expanded adult Bookworms is diverse, uniquely identified and explicit-safe without invented cover records',()=>{
 const dom=catalogs(),all=Array.from(dom.window.MATCHAPP_EBOOK_CATALOG),keys=new Set();
 assert(all.length>=151,'at least 151 individual curated adult book profiles');
 const genres=new Set(),moods=new Set();
 for(const b of all){
  assert.equal(typeof b.id,'string');assert(b.id&&b.title&&b.author);
  assert(b.summary&&b.summary.length>=30,`Missing editorial summary: ${b.title}`);
  assert(Number.isSafeInteger(b.year)&&b.year>0);
  assert(Array.isArray(b.access)&&b.access.length);
  assert(!/\\b(?:porn|xxx|hentai|erotica)\\b/i.test(b.title+' '+b.summary));
  assert.equal(keys.has(b.id),false,`Duplicate book: ${b.id}`);keys.add(b.id);
  assert(!('cover' in b)||/^https:\\/\\//.test(b.cover),
   'An original edition cover cannot be invented in the bibliography');
  b.genres.forEach(g=>genres.add(g));b.moods.forEach(m=>moods.add(m));
  if(b.moods.includes('cozy'))assert(!b.genres.some(g=>['horror','thriller','true-crime','dystopian'].includes(g)),
   `Cozy book violates the mood lock: ${b.title}`);
 }
 assert(genres.size>=20&&moods.size>=16,'substantive criteria diversity');
 for(const id of ['emma','wizard-oz','christmas-carol','quincas-borba','iracema']){
  assert(keys.has(id),'missing a region/genre classic '+id);
 }
 dom.window.close();
});
test('publisher checked adult magazines use official title and issue destinations, not fabricated issue covers',()=>{
 const dom=catalogs(),all=Array.from(dom.window.MatchAppMagazines.items);
 assert(all.length>=31,'expanded international original magazine identities');
 const ids=new Set();
 for(const m of all){
  assert(!ids.has(m.id),'duplicate magazine');ids.add(m.id);
  assert(m.title&&m.publisher&&m.summary&&m.genres.length&&m.moods.length);
  const site=new URL(m.site),issues=new URL(m.issues),sub=new URL(m.subscription);
  for(const u of [site,issues,sub])assert.equal(u.protocol,'https:');
  assert(!/[<>]/.test(m.title+' '+m.summary));
  assert(m.kind==='magazine'&&m.access.includes('paid'));
 }
 for(const id of ['mag-the-atlantic','mag-paris-review','mag-discover','mag-dwell',
  'mag-astronomy','mag-outside','mag-harpers'])assert(ids.has(id),id);
 const paris=all.find(m=>m.id==='mag-paris-review');
 assert.equal(new URL(paris.issues).pathname,'/back-issues');
 const archive=all.find(m=>m.id==='mag-outside');
 assert.equal(new URL(archive.issues).pathname,'/magazine-issues');
 dom.window.close();
});
test('audiobook official playable samples require exact verified edition, never store search',()=>{
 const a=require('../ebooks/audiobooks.js');
 const book={title:'The Wonderful Wizard of Oz',author:'L. Frank Baum'};
 const url='https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview/12345.m4a';
 const original={collectionName:book.title,artistName:book.author,
  collectionViewUrl:'https://books.apple.com/us/audiobook/the-wonderful-wizard-of-oz/id1234',
  previewUrl:url};
 assert.equal(a.safeApplePreview(url),url);
 for(const bad of ['https://evil.example/audio.m4a','http://audio-ssl.itunes.apple.com/itunes-assets/file.m4a',
  'https://audio-ssl.itunes.apple.com.evil.test/itunes-assets/file.m4a','https://audio-ssl.itunes.apple.com/other/file.m4a'])
  assert.equal(a.safeApplePreview(bad),null);
 const verified=a.verifyApple(book,[original],'US');
 assert.equal(verified.previewUrl,url);
 assert.equal(a.verifyApple(book,[{...original,artistName:'Different Author'}],'US'),null);
 assert.equal(a.verifyApple(book,[{...original,previewUrl:'https://evil.test/fake.mp3'}],'US').previewUrl,null);
 const ui=read('ebooks/ebook-matcher.js');
 assert.match(ui,/audio\\?\\.apple\\?\\.verified===true/);
 assert.match(ui,/safeApplePreview/);
 assert.match(ui,/<audio controls preload="none"/);
});
test('adult movies and music retain original-source gates and Kids remains independent',()=>{
 const app=read('app.js'),audio=read('ebooks/audiobooks.js'),kids=read('kids/source-rated-discovery.js');
 const kidsPage=read('kids/index.html'),home=read('index.html');
 assert(app.includes('discoverVerifiedExactTMDB')&&app.includes('moodFitsVerified'));
 assert(app.includes("if (['Spotify playlist','Spotify single'].includes(cat)) return null;"),
  'never label an unrelated Apple track as a Spotify playlist or single');
 assert(app.includes("if(cat==='music album')params.set('entity','album')"),
  'album requests must verify the exact source format');
 assert(app.includes("const limit=audioDiscovery?100:40"),'broaden source scans for audio without flooding movie results');
 assert(app.includes("if(audioDiscovery)params.set('country',region)"),'source-aware region');
 assert(app.includes("r.kind==='podcast'"),'podcasts must have source format evidence');
 assert(audio.includes("wanted==='free'?Promise.resolve()"));
 assert(kids.includes('MAX_CHECKS_PER_CLICK=18,MAX_SHOWN=48'));
 assert(kids.includes('agePolicy.exactRequestedTitle'));
 assert(!kidsPage.includes('/ebooks/catalog.js')&&!kidsPage.includes('/ebooks/magazines.js')&&!kidsPage.includes('/ebooks/audiobooks.js'));
 assert(home.indexOf('/ebooks/catalog.js')<home.indexOf('/ebooks/audiobooks.js'));
});
