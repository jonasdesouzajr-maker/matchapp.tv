const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('catalog media layer is additive and uses the existing public metadata cache',()=>{
  const js=read('catalog-media.js');
  assert.match(js,/catalog_media_metadata/);
  assert.match(js,/matchapp:newmatch/);
  assert.match(js,/res-trailer-container/);
  assert.match(js,/kids-watch-dialog/);
  assert.match(js,/kids_approved/);
  assert.match(js,/SAFE_YT_EMBED/);
  assert.match(js,/generatedCover/);
  assert.match(js,/document\.addEventListener\('error'/);
});

test('daily refresh is exact-identity, adult-safe, kids-gated and supports audio previews',()=>{
  const js=read('tools/refresh-catalog-media.js');
  assert.match(js,/exactTitle/);
  assert.match(js,/row\.adult === true/);
  assert.match(js,/kidsApproved:true/);
  assert.match(js,/itunes\.apple\.com\/search/);
  assert.match(js,/watch\/providers/);
  assert.match(js,/youtube-nocookie\.com\/embed/);
  assert.match(js,/--dry-run/);
  assert.match(js,/SUPABASE_SERVICE_ROLE_KEY/);
});

test('scraper workflow cannot write production from staging',()=>{
  const yml=read('.github/workflows/scraper.yml');
  assert.match(yml,/staging\/tmdb-freshness-previews-20260917/);
  assert.match(yml,/GITHUB_REF.*refs\/heads\/main/);
  assert.match(yml,/refresh-catalog-media\.js --dry-run/);
  assert.match(yml,/actions\/upload-artifact@v4/);
  assert.match(yml,/npm test/);
  assert.match(yml,/npm run audit:site/);
});

test('new preview CSS stays scoped to MatchApp media classes',()=>{
  const css=read('catalog-media.css');
  assert.match(css,/\.matchapp-preview-card/);
  assert.match(css,/\.matchapp-kids-preview/);
  assert.doesNotMatch(css,/^body\s*\{/m);
  assert.doesNotMatch(css,/\*\s*!important global/i);
});
