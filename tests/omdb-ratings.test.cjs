const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

test('OMDb normalizes three sources and rejects mismatched identity or malformed scores', async () => {
  const { parseRatings } = await import('../supabase/functions/omdb-ratings/ratings-core.mjs');
  const record = { Response:'True', imdbID:'tt0111161', Title:'The Shawshank Redemption', Year:'1994', Type:'movie',
    Ratings:[{Source:'Internet Movie Database', Value:'9.3/10'},{Source:'Rotten Tomatoes', Value:'89%'},{Source:'Metacritic', Value:'82/100'}] };
  const requested = { title:'The Shawshank Redemption', year:1994, kind:'movie' };
  assert.deepEqual(parseRatings(record, requested)?.ratings, {rottenTomatoes:89,metacritic:82,imdb:9.3});
  assert.equal(parseRatings(record,{...requested,year:2010}),null);
  assert.equal(parseRatings(record,{...requested,kind:'tv'}),null);
  assert.equal(parseRatings(record,{...requested,title:'Different film'}),null);
  assert.deepEqual(parseRatings({...record,Ratings:record.Ratings.slice(0,1)},requested)?.ratings,{rottenTomatoes:null,metacritic:null,imdb:9.3});
  assert.equal(parseRatings({...record,Ratings:[{Source:'Rotten Tomatoes',Value:'145%'}],imdbRating:'N/A'},requested),null);
});

test('result badge degrades silently for missing scores, errors and stale matches', async () => {
  const dom = new JSDOM('<article id="result-box"><button id="result-dismiss"></button><div id="res-omdb-ratings" hidden></div></article>',{runScripts:'outside-only',url:'https://matchapp.tv/'});
  const w=dom.window, host=w.document.getElementById('res-omdb-ratings');
  const finishes=[];
  w.tmdbKindForCats=()=> 'movie';
  w.supabaseClient={functions:{invoke:()=>new Promise(resolve=>{finishes.push(resolve);})}};
  w.eval(fs.readFileSync('omdb-ratings.js','utf8'));
  w.globalMatchTitle='First';
  w.document.dispatchEvent(new w.CustomEvent('matchapp:newmatch',{detail:{title:'First',year:1994,kind:'movie'}}));
  w.globalMatchTitle='Second';
  w.document.dispatchEvent(new w.CustomEvent('matchapp:newmatch',{detail:{title:'Second',year:1995,kind:'movie'}}));
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(finishes.length,2);
  finishes[1]({data:{title:'Second',year:1995,ratings:{rottenTomatoes:null,metacritic:76,imdb:7.5}}});
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(host.hidden,false);
  assert.match(host.textContent,/Metacritic76\/100/);
  assert.doesNotMatch(host.textContent,/Rotten Tomatoes|undefined/);
  finishes[0]({data:{title:'First',year:1994,ratings:{rottenTomatoes:100}}});
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.doesNotMatch(host.textContent,/Rotten Tomatoes/);
  w.document.getElementById('result-dismiss').click();
  assert.equal(host.hidden,true);
  dom.window.close();
});

test('commercial licensing flag guards the server and the secret is absent from public files', () => {
  const edge=fs.readFileSync('supabase/functions/omdb-ratings/index.ts','utf8');
  const html=fs.readFileSync('index.html','utf8');
  const js=fs.readFileSync('omdb-ratings.js','utf8');
  assert.match(edge,/OMDB_COMMERCIAL_USE_APPROVED.*!== "true"/);
  assert.match(edge,/Deno\.env\.get\("OMDB_API_KEY"\)/);
  assert.doesNotMatch(html+js,/OMDB_API_KEY|apikey=/);
  assert.match(html,/id="res-omdb-ratings"[^>]*hidden/);
  assert.match(js,/matchapp:newmatch/);
});
