const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('Latest News is homepage-only, folded by default and country-aware',()=>{
  const wiring=read('final-wiring.js'),src=read('latest-news.js');
  assert.match(wiring,/path==='\/'\|\|path==='\/index\.html'\)js\('\/latest-news\.js'\)/);
  assert.match(src,/section\.dataset\.open='false'/);
  assert.match(src,/aria-expanded=\"false\"/);
  assert.match(src,/\/cdn-cgi\/trace/);
  assert.match(src,/Around \$\{countryName\(country\)\}/);
  assert.match(src,/Global entertainment/);
  assert.match(src,/slice\(0,MAX\)/);
});

test('news cards preserve source security, accessibility, analytics and ad integration',()=>{
  const src=read('latest-news.js');
  assert.match(src,/target='_blank'/);
  assert.match(src,/noopener noreferrer/);
  assert.match(src,/img\.alt=/);
  assert.match(src,/scroll-snap-type:x mandatory/);
  assert.match(src,/latest_news_open/);
  assert.match(src,/latest_news_click/);
  assert.match(src,/data-ad-slot=\"2595698117\"/);
  assert.match(src,/fallbackImage/);
});

test('hourly generator uses trusted publishers and rejects rumor language',()=>{
  const src=read('tools/refresh-news.js');
  for(const d of ['reuters.com','cnn.com','hollywoodreporter.com','bbc.com','g1.globo.com']) assert.match(src,new RegExp(d.replace(/\./g,'\\.')));
  assert.match(src,/RUMOR=/);
  assert.match(src,/reportedly/);
  assert.match(src,/api\.gdeltproject\.org/);
  assert.match(src,/matchapp_url/);
  assert.match(src,/isBasedOn/);
  assert.doesNotMatch(src,/articleBody/);
});

test('hourly workflow and sitemap generator publish only generated news URLs',()=>{
  const yml=read('.github/workflows/news-refresh.yml'),sm=read('tools/update-sitemap.js'),urls=JSON.parse(read('tools/news-urls.json'));
  assert.match(yml,/cron: '11 \* \* \* \*'/);
  assert.match(yml,/node tools\/refresh-news\.js/);
  assert.match(yml,/node tools\/update-sitemap\.js/);
  assert.match(sm,/readList\('news-urls\.json'\)/);
  assert.ok(urls.includes('https://matchapp.tv/news/'));
});
