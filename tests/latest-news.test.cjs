const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('Latest News is homepage-only, folded by default, country-aware and placed after premiere',()=>{
  const wiring=read('final-wiring.js'),src=read('latest-news.js');
  assert.match(wiring,/path==='\/'\|\|path==='\/index\.html'\)js\('\/latest-news\.js'\)/);
  assert.match(src,/document\.createElement\('details'\)/);
  assert.match(src,/section\.open=false/);
  assert.match(src,/document\.getElementById\('premiere-disclosure'\)/);
  assert.match(src,/premiere\.insertAdjacentElement\('afterend',section\)/);
  assert.match(src,/\/cdn-cgi\/trace/);
  assert.match(src,/MAX_LOCAL=5/);
  assert.match(src,/MAX_GLOBAL=5/);
  assert.match(src,/MAX_TOTAL=10/);
});

test('Latest News uses one compact ten-story auto-scrolling row with edge arrows',()=>{
  const src=read('latest-news.js');
  assert.match(src,/combined:\[/);
  assert.match(src,/\.slice\(0,MAX_TOTAL\)/);
  assert.match(src,/content|panel/);
  assert.match(src,/ma-news-carousel-shell/);
  assert.match(src,/ma-news-track/);
  assert.match(src,/flex-wrap:nowrap/);
  assert.match(src,/flex:0 0 160px/);
  assert.match(src,/ma-news-arrow-prev/);
  assert.match(src,/ma-news-arrow-next/);
  assert.match(src,/AUTO_MS=3600/);
  assert.match(src,/setInterval\(\(\)=>move\(1\),AUTO_MS\)/);
  assert.match(src,/scrollIntoView\(\{behavior:'smooth',block:'nearest'\}\)/);
  assert.match(src,/touchstart/);
  assert.match(src,/pointerenter/);
});

test('new-content indicator persists by feed version and clears on unfold',()=>{
  const src=read('latest-news.js');
  assert.match(src,/matchapp\.latestNewsSeenVersion/);
  assert.match(src,/payload\.feed_version/);
  assert.match(src,/dataset\.hasNew='true'/);
  assert.match(src,/localStorage\.setItem\(SEEN_KEY,currentVersion\)/);
  assert.match(src,/ma-news-new/);
  assert.match(src,/latest_news_new_available/);
});

test('news cards open the original source securely and preserve accessibility, analytics and ads',()=>{
  const src=read('latest-news.js');
  assert.match(src,/a\.href=original\|\|'#'/);
  assert.match(src,/target='_blank'/);
  assert.match(src,/noopener noreferrer/);
  assert.match(src,/img\.alt=/);
  assert.match(src,/scroll-snap-type:x proximity/);
  assert.match(src,/latest_news_open/);
  assert.match(src,/latest_news_click/);
  assert.match(src,/data-ad-slot=\"2595698117\"/);
  assert.match(src,/fallbackImage/);
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
  assert.match(src,/primary_keyword/);
  assert.match(src,/meta_title/);
  assert.match(src,/meta_description/);
  assert.match(src,/feed_version/);
  assert.match(src,/isBasedOn/);
  assert.doesNotMatch(src,/articleBody/);
});

test('generated pages expose unique SEO metadata without copying article bodies',()=>{
  const src=read('tools/refresh-news-rss.js');
  assert.match(src,/meta name=\"description\"/);
  assert.match(src,/meta name=\"keywords\"/);
  assert.match(src,/property=\"og:title\"/);
  assert.match(src,/twitter:card/);
  assert.match(src,/keywords:i\.seo\.keywords\.join/);
  assert.match(src,/about:uniq/);
  assert.match(src,/does not republish the article body/);
});

test('hourly workflow and sitemap generator publish only generated news URLs',()=>{
  const yml=read('.github/workflows/news-refresh.yml'),sm=read('tools/update-sitemap.js'),urls=JSON.parse(read('tools/news-urls.json'));
  assert.match(yml,/cron: '11 \* \* \* \*'/);
  assert.match(yml,/node tools\/refresh-news-rss\.js/);
  assert.match(yml,/node tools\/update-sitemap\.js/);
  assert.match(sm,/readList\('news-urls\.json'\)/);
  assert.ok(urls.includes('https://matchapp.tv/news/'));
});
