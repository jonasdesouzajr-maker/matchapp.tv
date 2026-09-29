'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {JSDOM} = require('jsdom');

const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
const hydrateSource = (() => {
  const source = read('app.js');
  const start = source.indexOf('async function hydrateTitleFacts(');
  const end = source.indexOf('\n}', start) + 2;
  assert(start >= 0 && end > start);
  return source.slice(start, end);
})();

async function renderResult({desktop = true, android = false} = {}) {
  const dom = new JSDOM(`<!doctype html><html><body class="page-home">
    <main class="page-wrapper"><article id="result-box" style="display:block" hidden>
      <div class="res-media-row"><div class="res-info-col" id="res-info-col">
        <span id="res-platform-badge">Netflix</span><h2 id="res-title">YES DAY</h2>
        <div id="res-factbar"></div>
      </div></div>
      <p id="res-synopsis">A family comedy.</p><p id="res-cast"></p>
    </article></main></body></html>`, {
    url: 'https://matchapp.tv/', runScripts: 'outside-only'
  });
  const w = dom.window;
  w.matchMedia = () => ({matches: desktop});
  if (android) w.document.documentElement.classList.add('matchapp-android');
  w.MATCH_LANG = 'en';
  w.currentMatchIdentity = {title: 'YES DAY', year: 2011, kind: 'movie', tmdbId: 638597};
  w.globalMatchTitle = 'YES DAY';
  const query = {select(){return this},eq(){return this},order(){return this},
    async limit(){return {data: [], error: null}}};
  w.supabaseClient = {from(){return query}};
  w.tmdbDetails = async () => ({
    title: 'YES DAY', kind: 'movie', tmdbId: 638597, adult: false,
    year: 2021, genres: ['Family', 'Comedy'], originCountries: ['US'],
    cast: [{name: 'Jennifer Garner', character: 'Allison Torres'}],
    poster: 'https://image.tmdb.org/t/p/w500/yesday.jpg',
    overview: 'A family comedy.'
  });
  w.eval(read('catalog-media.js'));
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));

  const hydrate = vm.runInNewContext('(' + hydrateSource + ')', {
    window: w, document: w.document, sanitizeDisplayText: value => String(value),
    fetchTitleMeta: async () => ({
      year: '2011', country: 'United States', genres: ['Drama'],
      cast: ['Wrong actor'], synopsis: 'Wrong work description.'
    })
  });
  await hydrate({title: 'YES DAY', cats: ['movie']},
    {year: 2011, country: 'United States', kind: 'movie', cats: ['movie']});

  const root = w.document.getElementById('result-box');
  root.hidden = false;
  await w.MatchAppCatalogMedia.enrichMain();
  return dom;
}

test('desktop shows verified facts and title before availability and preview', async () => {
  const dom = await renderResult();
  const d = dom.window.document;
  const bar = d.getElementById('res-factbar');
  const facts = d.getElementById('res-title-facts');
  const synopsis = d.getElementById('res-synopsis');
  const availability = d.getElementById('matchapp-main-availability');
  const preview = d.getElementById('matchapp-main-preview');
  assert.match(bar.textContent, /2021.*United States.*Family.*Comedy/);
  assert.doesNotMatch(bar.textContent, /2011|Drama/);
  assert.equal(facts.previousElementSibling, synopsis);
  assert.equal(availability.previousElementSibling, facts);
  assert.equal(preview.previousElementSibling, availability);
  assert.equal(availability.parentElement, synopsis.parentElement);
  assert.equal(d.getElementById('res-title').parentElement.id, 'res-info-col');
  dom.window.close();
});

test('phone and Android keep their existing result host order', async () => {
  for (const options of [{desktop: false}, {desktop: true, android: true}]) {
    const dom = await renderResult(options);
    const d = dom.window.document;
    const availability = d.getElementById('matchapp-main-availability');
    assert.equal(availability.parentElement.id, 'res-info-col');
    assert.equal(availability.previousElementSibling.id, 'res-media-meta');
    assert.equal(availability.previousElementSibling.previousElementSibling.id, 'res-platform-badge');
    dom.window.close();
  }
});
