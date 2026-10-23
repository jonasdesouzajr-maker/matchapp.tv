'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const start=app.indexOf('let CURATED_POSTERS_PROMISE = null;'),end=app.indexOf('async function getExactCatalogPoster(',start);
const code=app.slice(start,end)+'\ngetCuratedPoster';
const flush=async()=>{for(let n=0;n<30;n++)await Promise.resolve();};
const home={title:'Home Film',tmdbId:100,kind:'movie',year:2024,adult:false,
 posterLarge:'https://image.tmdb.org/t/p/w780/home-original.jpg'};
const watch={title:'Nimona',tmdbId:961323,kind:'movie',year:2023,source:'https://www.themoviedb.org/movie/961323',
 posterLarge:'https://image.tmdb.org/t/p/w780/nimona-original.jpg'};

function context(fetch){
 return {fetch,catalogIdentityKey:value=>String(value||'').toLowerCase().replace(/[^a-z0-9]/g,''),
  getCatalogTmdbIdentity:async title=>title==='Home Film'?{tmdbId:100,kind:'movie',year:2024}:{tmdbId:961323,kind:'movie',year:2023}};
}

test('an available Home poster never starts or waits for the optional watch snapshot',async()=>{
 const calls=[];
 const get=vm.runInNewContext(code,context(async url=>{
  calls.push(url);
  if(url.includes('watch-poster'))throw Error('Home art cannot depend on the optional watch snapshot');
  return {ok:true,json:async()=>[home]};
 }));
 assert.equal(await get('Home Film'),home.posterLarge);
 assert.equal(await get('Home Film'),home.posterLarge);
 assert.equal(calls.length,1,'the Home list remains cached without fetching the second snapshot');
});

test('watch fallback retains exact source, non-adult, kind, edition and poster validation',async()=>{
 for(const bad of [{tmdbId:999},{kind:'tv'},{year:1990},{year:'unknown'},{adult:true},
   {source:'https://example.com/movie/961323'},{posterLarge:'https://example.com/wrong.jpg'}]){
  const get=vm.runInNewContext(code,context(async url=>({ok:true,json:async()=>
   url.includes('watch-poster')?{entries:[{...watch,...bad}]}:[]})));
  assert.equal(await get('Nimona'),null,JSON.stringify(bad));
 }
});

test('a pending watch fallback for another title cannot delay an available Home poster',async()=>{
 let finishWatch;
 const calls=[];
 const get=vm.runInNewContext(code,context(async url=>{
  calls.push(url);
  if(url.includes('watch-poster'))return new Promise(resolve=>{finishWatch=resolve;});
  return {ok:true,json:async()=>[home]};
 }));
 const pending=get('Nimona');await flush();
 assert.equal(typeof finishWatch,'function','the missing title has a real pending fallback request');
 let rendered=null;
 const known=get('Home Film').then(value=>{rendered=value;});
 await flush();
 assert.equal(rendered,home.posterLarge,'Home must resolve before the unrelated watch request finishes');
 finishWatch({ok:true,json:async()=>({entries:[watch]})});
 assert.equal(await pending,watch.posterLarge);
 await known;
 assert.equal(calls.length,2);
 assert.equal(await get('Nimona'),watch.posterLarge);
 assert.equal(calls.length,2,'each snapshot is still fetched only once');
});
