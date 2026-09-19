const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('Latest News is homepage-only, always open, country-aware and placed after premiere',()=>{
  const wiring=read('final-wiring.js'),src=read('latest-news.js');
  assert.match(wiring,/if\(path==='\/'\|\|path==='\/index\.html'\)\{[^}]*js\('\/latest-news\.js'\)/);
  assert.match(wiring,/js\('\/latest-news-image-guard\.js'\)/);
  assert.match(src,/document\.createElement\('details'\)/);
  assert.match(src,/section\.open=true/);
  assert.match(src,/document\.getElementById\('premiere-disclosure'\)/);
  assert.match(src,/premiere\.insertAdjacentElement\('afterend',section\)/);
  assert.match(src,/\/cdn-cgi\/trace/);
  assert.match(src,/MAX_LOCAL=5/);
  assert.match(src,/MAX_GLOBAL=5/);
  assert.match(src,/MAX_TOTAL=10/);
});

test('Latest News visibly auto-swipes left while permanently open without hover cancelling it',()=>{
  const src=read('latest-news.js');
  assert.match(src,/let combined=\[/);
  assert.match(src,/\.slice\(0,MAX_TOTAL\)/);
  assert.match(src,/ma-news-carousel-shell/);
  assert.match(src,/ma-news-track/);
  assert.match(src,/flex-wrap:nowrap/);
  assert.match(src,/flex:0 0 160px/);
  assert.match(src,/ma-news-arrow-prev/);
  assert.match(src,/ma-news-arrow-next/);
  assert.match(src,/AUTO_FIRST_MS=500/);
  assert.match(src,/AUTO_MS=1900/);
  assert.match(src,/setTimeout\(\(\)=>\{/);
  assert.match(src,/setInterval\(\(\)=>move\(1\),AUTO_MS\)/);
  assert.match(src,/dataset\.autoDirection='left'/);
  assert.match(src,/touchstart/);
  assert.match(src,/focusin/);
  assert.doesNotMatch(src,/pointerenter/);
});

test('new-content flag persists by feed version on the always-open news rail',()=>{
  const src=read('latest-news.js');
  assert.match(src,/matchapp\.latestNewsSeenVersion/);
  assert.match(src,/payload\.feed_version/);
  assert.match(src,/dataset\.hasNew='true'/);
  assert.match(src,/localStorage\.setItem\(SEEN_KEY,currentVersion\)/);
  assert.match(src,/ma-news-new/);
  assert.match(src,/role="status"/);
  assert.match(src,/M5 3h2v18H5V3/);
  assert.match(src,/latest_news_new_available/);
});

test('news deep links reveal the requested story inside always-open Latest News',()=>{
  const src=read('latest-news.js');
  assert.match(src,/new URLSearchParams\(location\.search\)\.get\('news'\)/);
  assert.match(src,/location\.hash==='#latest-news'/);
  assert.match(src,/function openAndReveal/);
  assert.match(src,/section\.open=true/);
  assert.match(src,/carousel\.reveal/);
  assert.match(src,/dataset\.newsId/);
  assert.match(src,/ma-news-card-target/);
});

test('news cards open the original source securely and preserve accessibility and analytics without direct ad monetization',()=>{
  const src=read('latest-news.js');
  assert.match(src,/a\.href=original\|\|'#'/);
  assert.match(src,/target='_blank'/);
  assert.match(src,/noopener noreferrer external/);
  assert.match(src,/img\.alt=/);
  assert.match(src,/scroll-snap-type:x proximity/);
  assert.match(src,/latest_news_open/);
  assert.match(src,/latest_news_click/);
  assert.doesNotMatch(src,/adsbygoogle|data-ad-slot=/);
  assert.match(src,/fallbackImage/);
  assert.match(src,/function newsImage/);
  assert.match(src,/item\?\.image_url/);
  assert.match(src,/primaryKeyword/);
  assert.doesNotMatch(src,/MatchApp summary/);
});

test('hourly generator polls trusted feeds, Google Trends and rejects rumor language',()=>{
  const src=read('tools/refresh-news-rss.js');
  for(const d of ['reuters.com','cnn.com','hollywoodreporter.com','bbc.com','g1.globo.com']) assert.match(src,new RegExp(d.replace(/\./g,'\\.')));
  assert.match(src,/trends\.google\.com\/trending\/rss/);
  assert.match(src,/RUMOR=/);
  assert.match(src,/supostamente/);
  assert.match(src,/RUMOR\.test\(r\.desc\)/);
  assert.match(src,/seoFor/);
  assert.match(src,/short_tail/);
  assert.match(src,/long_tail/);
  assert.match(src,/trend_keywords/);
  assert.match(src,/entity_keywords/);
  assert.match(src,/freshness_keywords/);
  assert.match(src,/source_keywords/);
  assert.match(src,/primary_keyword/);
  assert.match(src,/meta_title/);
  assert.match(src,/meta_description/);
  assert.match(src,/seo_generated_at/);
  assert.match(src,/feedVersion/);
  assert.match(src,/imageFromArticleHtml/);
  assert.match(src,/enrichMissingImages/);
  assert.match(src,/og:image/);
  assert.match(src,/landing_url/);
  assert.doesNotMatch(src,/articleBody/);
});

test('generated source wrappers are noindex and expose structured attribution and deep links',()=>{
  const src=read('tools/refresh-news-rss.js');
  assert.match(src,/meta name=\"description\"/);
  assert.match(src,/meta name=\"robots\" content=\"noindex,follow\"/);
  assert.match(src,/meta name=\"keywords\"/);
  assert.match(src,/property=\"og:title\"/);
  assert.match(src,/name=\"twitter:title\"/);
  assert.match(src,/BreadcrumbList/);
  assert.match(src,/citation:i\.url/);
  assert.match(src,/isBasedOn:i\.url/);
  assert.match(src,/mainEntity:sourceCreativeWork/);
  assert.match(src,/potentialAction/);
  assert.match(src,/Verified source:/);
  assert.match(src,/Open this story inside MatchApp Latest News/);
  assert.match(src,/rel=\"noopener noreferrer external\"/);
  assert.match(src,/does not republish the article body/);
});

test('news archive preserves stable SEO pages and original keyword snapshots over time',()=>{
  const src=read('tools/refresh-news-rss.js');
  assert.match(src,/ARCHIVE_LIMIT=1000/);
  assert.match(src,/readArchive/);
  assert.match(src,/archive\.json/);
  assert.match(src,/existing&&existing\.seo\?existing\.seo:seoFor/);
  assert.match(src,/news-sitemap-meta\.json/);
  assert.doesNotMatch(src,/rmSync\(ART/);
});

test('hourly workflow keeps only the curated news hub in the canonical sitemap',()=>{
  const yml=read('.github/workflows/news-refresh.yml'),sm=read('tools/update-sitemap.js'),urls=JSON.parse(read('tools/news-urls.json'));
  assert.match(yml,/cron: '11 \* \* \* \*'/);
  assert.match(yml,/node tools\/refresh-news-rss\.js/);
  assert.match(yml,/node tools\/update-sitemap\.js/);
  assert.match(yml,/news-sitemap-meta\.json/);
  assert.match(sm,/newsUrlsFromDisk\(\)/);
  assert.match(sm,/Only the curated news hub is indexable/);
  assert.match(sm,/readObject\('news-sitemap-meta\.json'\)/);
  assert.match(sm,/validLastmod/);
  assert.ok(urls.includes('https://matchapp.tv/news/'));
});
