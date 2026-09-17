const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('daily enrichment never mutates recommendation membership',()=>{
  const s=read('tools/scrape-catalog.js');
  assert.match(s,/is_catalog_title: entry\.isCatalog !== false/);
  assert.match(s,/isCatalog: false, isTrending: true/);
  assert.match(s,/catalogKeys/);
  assert.match(s,/trend\.isCatalog = true/);
  assert.doesNotMatch(s,/CONTENT_CATALOG\.(?:push|splice|unshift)/);
  assert.match(s,/kids_approved: kidsApproved/);
  assert.match(s,/const kidsApproved = Boolean\(kid\)/);
});

test('catalog refresh uses secure server credentials and approved data sources',()=>{
  const s=read('tools/scrape-catalog.js');
  assert.match(s,/SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(s,/TMDB_BEARER_TOKEN/);
  assert.match(s,/headers\.Authorization = `Bearer \$\{TMDB_TOKEN\}`/);
  assert.match(s,/\/watch\/providers/);
  assert.match(s,/itunes\.apple\.com\/search/);
  assert.doesNotMatch(s,/apis\.justwatch\.com/);
});

test('front end always has a generated cover as the final image fallback',()=>{
  const source=read('media-enrichment.js');
  const dom=new JSDOM('<!doctype html><body></body>',{url:'https://matchapp.tv/',runScripts:'outside-only'});
  const w=dom.window;
  w.supabaseClient={from:()=>({select(){return this},eq(){return this},limit:async()=>({data:[],error:null})})};
  w.eval(source);
  const url=w.matchappDynamicCover('No Poster Available',2026);
  assert.match(url,/^data:image\/svg\+xml/);
  assert.ok(url.includes('No%20Poster%20Available'));
  dom.window.close();
});

test('new image rescue waits for the existing native fallback chain first',()=>{
  const s=read('media-enrichment.js');
  assert.match(s,/const failedSrc=img\.currentSrc\|\|img\.src/);
  assert.match(s,/img\.src!==failedSrc/);
  assert.match(s,/setTimeout/);
});

test('preview rendering is allow-listed and Kids requires explicit approval',()=>{
  const s=read('media-enrichment.js');
  assert.match(s,/www\.youtube-nocookie\.com/);
  assert.match(s,/row\.kids_approved!==true/);
  assert.match(s,/preview_kind==='audio'/);
  assert.match(s,/host\.hidden=true/);
  assert.match(s,/if\(shown&&target\.style\.display==='none'\)target\.style\.display='block'/);
  assert.doesNotMatch(s,/youtube\.com\/embed/);
});

test('central wiring adds enrichment only to app and Kids surfaces',()=>{
  const s=read('final-wiring.js');
  assert.match(s,/const kidsPages=/);
  assert.match(s,/if\(appPages\|\|kidsPages\)js\('\/media-enrichment\.js'\)/);
});

test('scraper source parses current catalog and Kids library shapes',()=>{
  const app=read('app.js');
  const cat=app.match(/const CONTENT_CATALOG = (\[[\s\S]*?\n\]);/);
  assert.ok(cat,'CONTENT_CATALOG parse contract changed');
  assert.ok(Array.isArray(vm.runInNewContext(cat[1],{}, {timeout:1500})));
  const kids=read('kids/kids.js');
  const lib=kids.match(/const LIBRARY = (\[[\s\S]*?\n  \]);/);
  assert.ok(lib,'Kids LIBRARY parse contract changed');
  assert.ok(Array.isArray(vm.runInNewContext(lib[1],{}, {timeout:1500})));
});
