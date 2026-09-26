'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const normalize=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]/g,'');

test('the matched Roku film has a source-pinned real TMDB poster, year, and movie identity',()=>{
 const records=JSON.parse(read('data/poster-identities.json'));
 const availability=JSON.parse(read('data/availability.json')).titles['WEIRD: The Al Yankovic Story'];
 const row=records.find(r=>normalize(r.title)===normalize('WEIRD: The Al Yankovic Story'));
 assert.ok(row,'authentic poster identity must ship with the production data');
 assert.equal(row.adult,false);
 assert.equal(row.tmdbId,availability.tmdbId);
 assert.equal(row.kind,availability.kind);
 assert.equal(Number(row.year),availability.year);
 assert.match(row.posterLarge,/^https:\/\/image\.tmdb\.org\/t\/p\/w780\/[A-Za-z0-9_.-]+$/);
});

test('curated original is selected without waiting for TMDB proxy, never swapping a different movie',async()=>{
 const app=read('app.js'),start=app.indexOf('let CURATED_POSTERS_PROMISE = null;');
 const end=app.indexOf('async function getExactCatalogPoster(',start);
 assert.ok(start>=0&&end>start);
 const rows=JSON.parse(read('data/poster-identities.json'));
 const expected=rows.find(r=>r.tmdbId===928344);
 let identity={tmdbId:928344,kind:'movie',year:2022};
 let requests=0;
 const context={getCatalogTmdbIdentity:async()=>identity,catalogIdentityKey:normalize,
  fetch:async url=>{requests++;assert.equal(url,'/data/poster-identities.json');return {ok:true,json:async()=>rows};}};
 const get=vm.runInNewContext(app.slice(start,end)+'\ngetCuratedPoster',context);
 assert.equal(await get('WEIRD: The Al Yankovic Story'),expected.posterLarge);
 assert.equal(requests,1);
 identity={tmdbId:999999,kind:'movie',year:2022};
 assert.equal(await get('WEIRD: The Al Yankovic Story'),null,'never use artwork from another TMDB identity');
 identity={tmdbId:928344,kind:'tv',year:2022};
 assert.equal(await get('WEIRD: The Al Yankovic Story'),null,'film and television IDs must not be mixed');
 identity={tmdbId:928344,kind:'movie',year:1995};
 assert.equal(await get('WEIRD: The Al Yankovic Story'),null,'edition year must match');
 assert.equal(requests,1,'curated local data should only be downloaded once');
});

test('the visibly revealed adult match probes curated artwork before optional metadata completes',()=>{
 const app=read('app.js'),html=read('index.html');
 const reveal=app.indexOf('async function renderResult(');
 const first=app.indexOf('firstPoster.src = firstCover;',reveal);
 const pinned=app.indexOf('void getCuratedPoster(selected.title).then(url =>',reveal);
 const slow=app.indexOf('if (!meta && !skipLiveLookup && !verified)',reveal);
 assert(first>reveal&&pinned>first&&slow>pinned);
 assert.match(app.slice(pinned,slow),/probe\.onload[\s\S]*firstPoster\.src = url/);
 assert.match(app.slice(pinned,slow),/window\.setLoadedMatchPoster\(url, selected\.title\)/);
 assert.match(html,/app\.js\?v=20260926-sourceclean1/);
 assert.doesNotMatch(read('kids/index.html'),/20260926-catalogscale1|result-dismiss/);
});