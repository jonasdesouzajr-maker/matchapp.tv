const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('Kids matcher is promoted directly below the hero without changing its form IDs',()=>{
  const src=read('kids/voice-feedback.js');
  assert.match(src,/hero\.insertAdjacentElement\('afterend',stage\)/);
  assert.match(src,/stage\.id='kids-match-stage'/);
  assert.match(src,/stage\.appendChild\(age\)/);
  assert.match(src,/stage\.appendChild\(match\)/);
  assert.match(src,/\.kids-match/);
  assert.match(src,/\.kids-age-wrap/);
});

test("Let's explore scrolls to and focuses the Kids matcher",()=>{
  const src=read('kids/voice-feedback.js');
  assert.match(src,/setAttribute\('href','#kids-match-stage'\)/);
  assert.match(src,/scrollIntoView/);
  assert.match(src,/querySelector\('select,button,input'\)\?\.focus/);
  assert.match(src,/kidsMatchScroll/);
});

test('Kids experience enhancer is static and contains no motion effects',()=>{
  const src=read('kids/voice-feedback.js');
  assert.doesNotMatch(src,/@keyframes|animation\s*:|requestAnimationFrame|setTimeout|kids-magic-|will-change/);
  assert.match(src,/behavior:'auto'/);
});

test('Kids title generator uses rich title-specific metadata and safe structured data',()=>{
  const src=read('tools/build-kids-pages.js');
  assert.match(src,/keywordSet/);
  assert.match(src,/age guide & where to watch/i);
  assert.match(src,/meta name=\"keywords\"/);
  assert.match(src,/max-image-preview:large/);
  assert.match(src,/twitter:title/);
  assert.match(src,/BreadcrumbList/);
  assert.match(src,/PeopleAudience/);
  assert.match(src,/isFamilyFriendly:true/);
  assert.match(src,/potentialAction/);
  assert.match(src,/Similar family picks/);
  assert.doesNotMatch(src,/AggregateRating|reviewRating|ratingValue/);
});

test('Kids generated pages stay free of the general GTM container',()=>{
  const src=read('tools/build-kids-pages.js');
  assert.doesNotMatch(src,/GTM-M7J3NNBN|googletagmanager\.com/);
  const hotfix=read('tools/apply-critical-hotfixes.js');
  assert.match(hotfix,/Kids SEO enriched and GTM removed/);
  assert.match(hotfix,/GTM-M7J3NNBN\|googletagmanager/);
});

test('Kids sitemap uses stable content revision dates instead of fake freshness',()=>{
  const builder=read('tools/build-kids-pages.js');
  const sitemap=read('tools/update-sitemap.js');
  assert.match(builder,/SEO_REVISION='2026-09-17'/);
  assert.match(builder,/kids-sitemap-meta\.json/);
  assert.match(sitemap,/readObject\('kids-sitemap-meta\.json'\)/);
  assert.match(sitemap,/kidsMeta\[loc\]/);
});

test('Kids SEO workflow rebuilds, validates and commits generated title surfaces',()=>{
  const yml=read('.github/workflows/kids-seo-refresh.yml');
  assert.match(yml,/node tools\/build-kids-pages\.js/);
  assert.match(yml,/node tools\/update-sitemap\.js/);
  assert.match(yml,/npm test/);
  assert.match(yml,/npm run audit:search/);
  assert.match(yml,/kids\/titles/);
  assert.match(yml,/tools\/kids-sitemap-meta\.json/);
});
