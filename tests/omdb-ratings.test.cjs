'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

test('older clients receive a non-cacheable unavailable result without an OMDb lookup or credit debit', async () => {
  let handler;
  const source = fs.readFileSync('supabase/functions/omdb-ratings/index.ts', 'utf8');
  vm.runInNewContext(source, { Deno: { serve(fn) { handler = fn; } }, Response });
  for (const [method, origin, status] of [
    ['POST','https://matchapp.tv',200], ['POST','https://www.matchapp.tv',200],
    ['OPTIONS','https://matchapp.tv',204], ['POST','https://other.invalid',403],
    ['OPTIONS','https://other.invalid',403], ['GET','https://matchapp.tv',405]
  ]) {
    const req = new Request('https://example.invalid/functions/v1/omdb-ratings',{method,headers:{origin}});
    const result = await handler(req);
    assert.equal(result.status,status);
    assert.equal(result.headers.get('Cache-Control'),'no-store');
    assert.equal(result.headers.get('Access-Control-Allow-Origin'),origin==='https://other.invalid'?null:origin);
    if (method!=='OPTIONS') assert.deepEqual(await result.json(),{unavailable:true});
  }
});

test('browser clears old scores and preserves only the independently verified title link', () => {
  const dom = new JSDOM('<article id="result-box"><button id="result-dismiss"></button><div id="res-omdb-ratings">IMDb 9.3/10</div></article>',{runScripts:'outside-only',url:'https://matchapp.tv/'});
  try {
    const w=dom.window, host=w.document.getElementById('res-omdb-ratings');
    let calls=0;
    w.supabaseClient={functions:{invoke:()=>{calls++;return Promise.resolve({data:{ratings:{imdb:9.3,metacritic:82,rottenTomatoes:89}}});}}};
    w.eval(fs.readFileSync('omdb-ratings.js','utf8'));
    assert.equal(host.hidden,true);
    assert.equal(host.textContent,'');
    w.globalMatchTitle='The Shawshank Redemption';
    w.currentMatchIdentity={title:w.globalMatchTitle,imdbId:'tt0111161',kind:'movie',year:1994};
    w.document.dispatchEvent(new w.CustomEvent('matchapp:newmatch',{detail:w.currentMatchIdentity}));
    assert.equal(calls,0);
    assert.equal(host.children.length,1);
    assert.equal(host.firstElementChild.href,'https://www.imdb.com/title/tt0111161/');
    assert.equal(host.textContent,'IMDb ↗');
    w.document.getElementById('result-dismiss').click();
    assert.equal(host.hidden,true);
  } finally {dom.window.close();}
});

test('public shell and optional React adapter do not display stored OMDb scores or request more', () => {
  const html=fs.readFileSync('index.html','utf8'),react=fs.readFileSync('integrations/react/OMDbRatings.jsx','utf8');
  assert.match(html,/id="res-omdb-ratings"[^>]*hidden/);
  assert.doesNotMatch(html+react,/OMDB_API_KEY|Critical ratings from OMDb/);
  assert.doesNotMatch(react,/functions\.invoke|ratings\.(imdb|metacritic|rottenTomatoes)/);
  assert.match(react,/ratings: null/);
  assert.match(react,/https:\/\/www\.imdb\.com\/title\//);
});
