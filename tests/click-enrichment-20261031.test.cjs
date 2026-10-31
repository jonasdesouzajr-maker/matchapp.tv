'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

test('Worlds 2026 publishes eight source-backed local-time schedule entries and calendar events',()=>{
 const events=JSON.parse(read('tools/global-events.json'));
 const worlds=events.find(row=>row.slug==='worlds-2026');
 assert.ok(worlds);
 assert.equal(worlds.calendarDownload,true);
 assert.equal(worlds.scheduleEntries.length,8);
 assert.equal(worlds.updatedAt,'2026-10-31');
 assert.match(worlds.scheduleSource,/^https:\/\/lolesports\.com\//);
 const html=read('events/worlds-2026/index.html');
 assert.match(html,/Worlds 2026 remaining schedule/);
 assert.match(html,/class="event-local-time"/);
 assert.match(html,/worlds-2026\.ics/);
 for(const entry of worlds.scheduleEntries)assert.ok(html.includes(entry.start),entry.start+' missing from guide');
 const ics=fs.readFileSync(path.join(root,'events/worlds-2026/worlds-2026.ics'),'utf8');
 assert.equal((ics.match(/BEGIN:VEVENT/g)||[]).length,8);
 for(const start of ['20261031T170000Z','20261103T220000Z','20261104T220000Z','20261105T220000Z','20261106T220000Z','20261107T220000Z','20261108T220000Z','20261114T190000Z']) assert.ok(ics.includes('DTSTART:'+start),start);
 assert.ok(!/(^|[^\r])\n/.test(ics),'Worlds calendar must preserve CRLF');
});

test('A Different World answers the sequel intent without changing provider evidence ownership',()=>{
 const html=read('where-to-watch/a-different-world/index.html');
 assert.match(html,/Is A Different World \(2026\) the Netflix sequel\?/);
 assert.match(html,/September 24, 2026/);
 assert.match(html,/renewed for Season 2/);
 assert.match(html,/media\.netflix\.com\/en\/only-on-netflix\/81747525/);
 assert.match(html,/netflix\.com\/tudum\/articles\/a-different-world-season-2/);
 assert.match(html,/data-availability-state="available"/);
 const generator=read('tools/build-watch-pages.js');
 assert.match(generator,/function titleSearchContext/);
 assert.match(generator,/Number\(info\?\.tmdbId\) === 305357/);
});

test('where-to-watch directory supports local query search and OpenSearch discovery',()=>{
 const html=read('where-to-watch/index.html');
 assert.match(html,/rel="search" type="application\/opensearchdescription\+xml"/);
 assert.match(html,/id="watch-title-search"/);
 assert.match(html,/URLSearchParams\(location\.search\)\.get\('q'\)/);
 assert.match(html,/feeds\/discoveries-en\.xml/);
 assert.match(html,/feeds\/discoveries-pt-br\.xml/);
 const open=read('opensearch.xml');
 assert.match(open,/https:\/\/matchapp\.tv\/where-to-watch\/\?q=\{searchTerms\}/);
});

test('English and Brazilian Portuguese discovery feeds each expose twelve original MatchApp entries',()=>{
 for(const [file,lang] of [['feeds/discoveries-en.xml','en'],['feeds/discoveries-pt-br.xml','pt-BR']]){
  const xml=read(file);
  assert.equal((xml.match(/<item>/g)||[]).length,12,file);
  assert.ok(xml.includes('<language>'+lang+'</language>'),file);
  const links=[...xml.matchAll(/<link>(https:\/\/matchapp\.tv\/[^<]*)<\/link>/g)].map(m=>m[1]);
  assert.equal(links.length,13,file+' channel + 12 item links');
  assert.equal(new Set(links.slice(1)).size,12,file+' item links unique');
  assert.ok(!xml.includes('<script'),file+' must remain passive XML');
 }
});
