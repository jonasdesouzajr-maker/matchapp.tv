const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('catalog media enrichment is additive and exact-identity only',()=>{
  const src=read('catalog-media.js');
  assert.match(src,/from\(TABLE\)\.select/);
  assert.match(src,/\.eq\('normalized_title',normalise\(title\)\)/);
  assert.ok(src.includes("if(opts.kids)q=q.eq('kids_approved',true)"),'Kids lookup must require explicit server approval');
  assert.ok(src.includes('youtube-nocookie\\.com\\/embed'),'trusted YouTube privacy embed host is required');
  assert.ok(src.includes('audio-ssl\\.itunes\\.apple\\.com'),'trusted iTunes preview host is required');
  assert.match(src,/generateLocalPosterSVG/);
  assert.match(src,/data:image\/svg\+xml/);
  assert.match(src,/matchappFallbackStage='metadata'/);
  assert.match(src,/matchappFallbackStage='local'/);
  assert.doesNotMatch(src,/CONTENT_CATALOG\s*=/);
  assert.doesNotMatch(src,/LIBRARY\s*=/);
});

test('main and Kids surfaces load the same read-only media layer',()=>{
  const wiring=read('final-wiring.js'),kids=read('kids/account.js');
  assert.match(wiring,/js\('\/catalog-media\.js'\)/);
  assert.match(kids,/\/catalog-media\.js\?v=/);
  assert.match(kids,/data-kids-catalog-media/);
});

test('existing ingest function enriches server-side and verifies GitHub OIDC',()=>{
  const src=read('supabase/functions/catalog-media-ingest/index.ts');
  assert.match(src,/token\.actions\.githubusercontent\.com/);
  assert.match(src,/audience:OIDC_AUDIENCE/);
  assert.match(src,/payload\.repository!==REPOSITORY/);
  assert.match(src,/workflow_ref/);
  assert.match(src,/payload\.ref!=="refs\/heads\/main"/);
  assert.match(src,/Deno\.env\.get\("TMDB_API_KEY"\)/);
  assert.match(src,/Deno\.env\.get\("SUPABASE_SERVICE_ROLE_KEY"\)/);
  assert.doesNotMatch(src,/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  assert.match(src,/watch%2Fproviders/);
  assert.match(src,/JustWatch via TMDB/);
  assert.match(src,/itunes\.apple\.com\/search/);
  assert.match(src,/kids_approved:item\.kids_approved===true/);
});

test('daily workflow uses OIDC and contains no long-lived backend secret',()=>{
  const yml=read('.github/workflows/scraper.yml'),client=read('tools/sync-catalog-media.js');
  assert.match(yml,/schedule:/);
  assert.match(yml,/cron: '17 7 \* \* \*'/);
  assert.match(yml,/id-token: write/);
  assert.match(yml,/node tools\/sync-catalog-media\.js/);
  assert.doesNotMatch(yml,/SUPABASE_SERVICE_ROLE_KEY|TMDB_API_KEY|secrets\./);
  assert.match(client,/catalog-media-ingest/);
  assert.match(client,/matchapp-supabase-catalog-media/);
});

test('catalog extraction dry run parses the existing general and Kids catalogues',()=>{
  const out=cp.execFileSync(process.execPath,[path.join(root,'tools/sync-catalog-media.js'),'--dry-run'],{encoding:'utf8'});
  const data=JSON.parse(out);
  assert.equal(data.ok,true);
  assert.equal(data.dry_run,true);
  assert.ok(data.titles>50,`expected substantial catalog, got ${data.titles}`);
  assert.ok(data.kids_approved>20,`expected reviewed Kids titles, got ${data.kids_approved}`);
  assert.ok(data.by_kind.movie>0);
  assert.ok(data.by_kind.tv>0);
});

test('catalog metadata schema is public-read and server-write only',()=>{
  const sql=read('supabase/migrations/011_catalog_media_metadata.sql');
  assert.match(sql,/enable row level security/);
  assert.match(sql,/revoke all on table public\.catalog_media_metadata from anon, authenticated/);
  assert.match(sql,/grant select on table public\.catalog_media_metadata to anon, authenticated/);
  assert.match(sql,/grant all on table public\.catalog_media_metadata to service_role/);
  assert.match(sql,/Kids flags are derived exclusively from the reviewed local Kids allowlist/);
});

test('trending rows meet database constraints and preserve old data on failed upserts',()=>{
  const src=read('supabase/functions/catalog-media-ingest/index.ts');
  const trending=src.slice(src.indexOf('async function trending('),src.indexOf('function mergeRows('));
  const ingest=src.slice(src.indexOf('Deno.serve(async(req)=>'));
  assert.match(trending,/origin_countries:originCountries\(record\)/);
  assert.match(trending,/cast_members:castMembers\(record\)/);
  assert.match(trending,/TMDB trending feed unavailable/);
  assert.ok(ingest.indexOf('.upsert(rows,')>=0);
  assert.ok(ingest.indexOf('.upsert(rows,')<ingest.indexOf('.update({is_trending:false,trending_rank:null})'),'Do not clear trending before a successful upsert');
  assert.match(ingest,/\.not\("source_key","in"/);
  assert.match(ingest,/stage==="authorization"\?403:500/);
});
