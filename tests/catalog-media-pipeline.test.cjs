const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const sync=require('../tools/sync-catalog-media.js');

const tick=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function supabaseStub(row){
  return {from(table){assert.equal(table,'catalog_media_metadata');return {
    select(){return this;},eq(){return this;},order(){return this;},limit(){return Promise.resolve({data:row?[row]:[],error:null});}
  };}};
}

test('catalog sync uses approved APIs and never scrapes JustWatch HTML',()=>{
  const source=read('tools/sync-catalog-media.js');
  assert.match(source,/\/trending\/\$\{kind\}\/day/);
  assert.match(source,/\/watch\/providers/);
  assert.match(source,/itunes\.apple\.com\/search/);
  assert.doesNotMatch(source,/https:\/\/(?:www\.)?justwatch\./i);
  assert.doesNotMatch(source,/cheerio|puppeteer|playwright/i);
  assert.match(source,/never inserts a remote title into CONTENT_CATALOG/i);
});

test('TMDB identity helpers reject fuzzy or wrong-year matches',()=>{
  const rows=[
    {id:1,title:'Vale a Pena Ver de Novo',release_date:'2025-01-01'},
    {id:2,title:'Vale Tudo',release_date:'1988-05-16'}
  ];
  assert.equal(sync.exactHit(rows,'Vale Tudo',1988,'movie').id,2);
  assert.equal(sync.exactHit(rows,'Vale Tudo',2025,'movie'),null);
  assert.equal(sync.exactHit(rows,'Vale',1988,'movie'),null);
});

test('preview selection prefers official typed YouTube media',()=>{
  const details={videos:{results:[
    {site:'YouTube',type:'Teaser',official:false,key:'ABCDEF12345',published_at:'2026-09-01'},
    {site:'YouTube',type:'Trailer',official:true,key:'ZYXWVU98765',published_at:'2026-08-01'},
    {site:'Vimeo',type:'Trailer',official:true,key:'not-used'}
  ]}};
  const picked=sync.chooseVideo(details,'movie');
  assert.equal(picked.preview_kind,'video');
  assert.equal(picked.preview_provider,'YouTube');
  assert.match(picked.preview_embed_url,/^https:\/\/www\.youtube-nocookie\.com\/embed\/ZYXWVU98765/);
});

test('Kids approval can only come from the reviewed local allowlist',()=>{
  const kids=[{title:'Bluey',year:'2018',type:'series',ages:['all','3-5','6-8','9-12']}];
  assert.deepEqual(sync.kidsApproval('Bluey',2018,'tv',kids),{kids_approved:true,kids_age_bands:['all','3-5','6-8','9-12']});
  assert.deepEqual(sync.kidsApproval('Unreviewed Trending Hit',2026,'tv',kids),{kids_approved:false,kids_age_bands:[]});
  assert.deepEqual(sync.kidsApproval('Bluey',2018,'movie',kids),{kids_approved:false,kids_age_bands:[]});
});

test('Apple preview and artwork helpers admit only trusted media hosts',()=>{
  assert.ok(sync.safeAppleArtwork('https://is1-ssl.mzstatic.com/image/thumb/foo/100x100bb.jpg'));
  assert.equal(sync.safeAppleArtwork('https://evil.example/poster.jpg'),null);
  assert.equal(sync.safeApplePreview('https://audio-ssl.itunes.apple.com/itunes-assets/foo.m4a'),'https://audio-ssl.itunes.apple.com/itunes-assets/foo.m4a');
  assert.equal(sync.safeApplePreview('https://example.com/audio.mp3'),null);
});

test('database migration is read-only for browser roles and RLS protected',()=>{
  const sql=read('supabase/migrations/20260917143000_catalog_media_metadata.sql');
  assert.match(sql,/enable row level security/i);
  assert.match(sql,/grant select on table public\.catalog_media_metadata to anon, authenticated/i);
  assert.match(sql,/revoke insert, update, delete, truncate, references, trigger/i);
  assert.match(sql,/for select\s+to anon, authenticated\s+using \(true\)/i);
  assert.match(sql,/Kids flags are derived exclusively/i);
});

test('daily workflow is server-only, scheduled and observable',()=>{
  const yaml=read('.github/workflows/scraper.yml');
  assert.match(yaml,/cron: '17 4 \* \* \*'/);
  assert.match(yaml,/contents: read/);
  assert.match(yaml,/SUPABASE_SERVICE_ROLE_KEY: \$\{\{ secrets\.SUPABASE_SERVICE_ROLE_KEY \}\}/);
  assert.match(yaml,/TMDB_READ_TOKEN: \$\{\{ secrets\.TMDB_READ_TOKEN \}\}/);
  assert.match(yaml,/actions\/upload-artifact@v4/);
  assert.doesNotMatch(yaml,/justwatch\.com/i);
});

test('regular result gets a trusted embedded preview without replacing existing fallback link',async()=>{
  const dom=new JSDOM(`<!doctype html><body>
    <div id="res-factbar"></div><h2 id="res-title">Title</h2>
    <div id="res-trailer-container" style="display:block"><a id="yt-trailer-link" href="#">fallback</a></div>
  </body>`,{url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true});
  dom.window.supabaseClient=supabaseStub({
    title:'Bluey',normalized_title:'bluey',year:2018,media_kind:'tv',is_catalog_title:true,is_trending:false,
    kids_approved:true,kids_age_bands:['all'],poster_url:null,poster_large_url:null,poster_original_url:null,backdrop_url:null,
    overview:'',genres:['Animation'],runtime_minutes:7,content_rating:'TV-Y',vote_average:8.6,original_language:'en',
    preview_kind:'video',preview_provider:'YouTube',preview_url:'https://www.youtube.com/watch?v=ZYXWVU98765',preview_embed_url:'https://www.youtube-nocookie.com/embed/ZYXWVU98765?rel=0'
  });
  dom.window.eval(read('media-enhancements.js'));
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  dom.window.document.getElementById('res-title').textContent='Bluey';
  await tick(40);
  assert.match(dom.window.document.querySelector('.matchapp-preview-player iframe')?.src||'',/^https:\/\/www\.youtube-nocookie\.com\/embed\/ZYXWVU98765/);
  assert.ok(dom.window.document.getElementById('yt-trailer-link'),'existing YouTube fallback must remain');
  assert.match(dom.window.document.getElementById('matchapp-rich-meta')?.textContent||'',/7 min/);
  dom.window.close();
});

test('Kids preview requires both reviewed approval and selected age band',async()=>{
  const dom=new JSDOM(`<!doctype html><body>
    <dialog id="kids-watch-dialog"></dialog><h2 id="kids-watch-name">Waiting</h2><div id="kids-match-detail"></div>
  </body>`,{url:'https://matchapp.tv/kids/',runScripts:'outside-only',pretendToBeVisual:true});
  dom.window.localStorage.setItem('match_kids_age_band','3-5');
  dom.window.supabaseClient=supabaseStub({
    title:'Bluey',normalized_title:'bluey',year:2018,media_kind:'tv',is_catalog_title:true,is_trending:false,
    kids_approved:true,kids_age_bands:['all','3-5'],poster_url:null,poster_large_url:null,poster_original_url:null,backdrop_url:null,
    overview:'',genres:['Kids'],runtime_minutes:7,content_rating:'TV-Y',vote_average:8.6,original_language:'en',
    preview_kind:'video',preview_provider:'YouTube',preview_url:'https://www.youtube.com/watch?v=ZYXWVU98765',preview_embed_url:'https://www.youtube-nocookie.com/embed/ZYXWVU98765?rel=0'
  });
  dom.window.eval(read('media-enhancements.js'));
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  dom.window.document.getElementById('kids-watch-name').textContent='Bluey';
  await tick(40);
  assert.ok(dom.window.document.querySelector('#matchapp-kids-preview iframe'));
  dom.window.localStorage.setItem('match_kids_age_band','9-12');
  dom.window.document.getElementById('kids-watch-name').textContent='Bluey ';
  dom.window.document.getElementById('kids-watch-name').textContent='Bluey';
  await tick(40);
  assert.equal(dom.window.document.querySelector('#matchapp-kids-preview iframe'),null);
  dom.window.close();
});

test('final wiring loads enrichment only on MatchApp and Kids surfaces',()=>{
  const wiring=read('final-wiring.js');
  assert.match(wiring,/const kidsPage=/);
  assert.match(wiring,/if\(appPages\|\|kidsPage\)js\('\/media-enhancements\.js'\)/);
  assert.match(wiring,/if\(appPages\)\{js\('\/production-hardening\.js'\)/);
});
