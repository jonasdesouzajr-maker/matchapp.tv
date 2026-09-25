'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const discover=require('../tools/refresh-sports-discovery.js');
const DATE='2026-09-25T10:30:00.000Z',now=Date.parse(DATE);
const article=(title,url,seendate='20260925T100000Z')=>({title,url,seendate});
test('only dated, directly linked, trusted HTTPS sports articles qualify',()=>{
 const articles=[
  article('Football league results: Brazil domestic finals confirmed','https://g1.globo.com/esporte/futebol/brasileirao/serie-a/noticia/2026/09/25/exemplo.ghtml'),
  article('Basketball NBA season opens with major changes','https://www.reuters.com/sports/basketball/nba-season-2026-09-25/'),
  article('Formula 1 teams prepare for next Grand Prix','https://www.apnews.com/article/formula-1-qualifying-2026'),
  article('Unconfirmed football speculation and rumor among fans','https://www.reuters.com/sports/football/rumor-2026-09-25/'),
  article('Football match recap: verified reporting','http://www.reuters.com/sports/football/test/'),
  article('Football match recap: suspicious untrusted domain','https://reuters.com.evil.example/sports/football/'),
  article('Football match recap from distant future','https://www.espn.com/soccer/story/_/id/34567/recap','20271225T100000Z'),
  article('Football match recap: old story','https://www.espn.com/soccer/story/_/id/34567/old','20250825T100000Z')
 ];
 const selected=discover.normalizeArticles(articles,now);
 assert.equal(selected.length,3);
 assert.deepEqual(selected.map(x=>x.source),['G1 Esportes','Reuters','AP News']);
 assert(selected.every(x=>x.category==='sports'&&x.image===null&&x.url.startsWith('https://')));
});
test('a GDELT first-seen timestamp is parsed exactly; no fabricated publication date',()=>{
 const v=discover.normalizeArticles([article('Football cup tournament: new verified report','https://www.theguardian.com/football/2026/sep/25/example')],now);
 assert.equal(v[0].published_at,'2026-09-25T10:00:00.000Z');
 assert.equal(v[0].discovery_source,'GDELT Project DOC 2.0');
 assert.equal(discover.publisher('https://reuters.com.attacker.invalid/sports/football'),null);
});
test('one sports snapshot, twice daily; serialize publishers and dispatch only after successful content push',()=>{
 const sport=read('.github/workflows/sports-refresh.yml'),hour=read('.github/workflows/news-refresh.yml');
 assert.match(sport,/cron: '17 11,23 \* \* \*'/);
 assert.match(sport,/push:[\s\S]*branches: \[main\][\s\S]*paths:[\s\S]*\.github\/workflows\/sports-refresh\.yml/);
 assert.doesNotMatch(sport,/push:[\s\S]*news\/\*\*/);
 assert.match(sport,/group: matchapp-content-publish/);
 assert.match(sport,/cancel-in-progress: false/);
 assert.match(sport,/node tools\/refresh-sports-discovery\.js/);
 assert.match(sport,/node tools\/refresh-news-rss\.js/);
 assert.match(sport,/node tools\/check-content-rotation\.js/);
 assert.match(sport,/if: steps\.publish\.outputs\.changed == '1'[\s\S]*gh workflow run pages-deploy\.yml --ref main/);
 assert.doesNotMatch(sport,/gh workflow run indexnow\.yml/);
 assert.match(hour,/cron: '37 \* \* \* \*'/);
});
test('sports reuse existing homepage click flow, real source links, semantic metadata, and no publisher photo copying',()=>{
 const front=read('latest-news.js'),news=read('tools/refresh-news-rss.js'),sports=read('tools/refresh-sports-discovery.js');
 assert.match(front,/MAX_TOTAL=10/);assert.match(front,/MAX_SPORTS=2/);
 assert.match(front,/requestedNewsId/);assert.match(front,/noopener noreferrer external/);
 assert.match(front,/sports_updated_at/);assert.match(news,/seoFor\(item,\[\],generated\)/);
 assert.match(news,/i\.category==='sports'/);assert.match(news,/itemListElement/);
 assert.doesNotMatch(news.split('const feedVersion=')[1].split(';')[0],/sportsSnapshot\.updated_at/);
 assert.match(news,/sports dates indicate when a story was indexed for discovery/i);
 assert.doesNotMatch(sports,/feeds\.bbci|sports\/rss\.xml|rss\.cnn/);
 assert.match(sports,/image:null/);
 assert.match(sports,/fetchGdelt/);
 assert.match(sports,/execFileSync\('curl'/);
 assert.match(sports,/--fail/);
 assert.match(read('.github/workflows/sports-refresh.yml'),/NODE_OPTIONS: --dns-result-order=ipv4first/);
 assert.match(read('tools/update-sitemap.js'),/newsUrlsFromDisk/);
});


test('explicitly authorized partner sports RSS is original-link only, date-bound and excludes gambling',()=>{
 const partner=require('../tools/sports-partner-feed.js');
 const f=partner.FEEDS.find(v=>v.source==='SportBusy'),time=Date.parse('2026-09-25T12:00:00Z');
 const xml='<rss><channel>'+
  '<item><title>Football club completes important new season announcement</title>'+
  '<link>https://www.sportbusy.com/news/football-season-announcement</link>'+
  '<pubDate>Fri, 25 Sep 2026 10:00:00 GMT</pubDate></item>'+
  '<item><title>Football betting odds and sportsbook promotion guide</title>'+
  '<link>https://www.sportbusy.com/news/betting-odds</link>'+
  '<pubDate>Fri, 25 Sep 2026 10:00:00 GMT</pubDate></item>'+
  '<item><title>Football title from an impostor domain must be rejected</title>'+
  '<link>https://sportbusy.com.evil.example/sport/test</link>'+
  '<pubDate>Fri, 25 Sep 2026 10:00:00 GMT</pubDate></item>'+
  '</channel></rss>';
 const items=partner.parseFeed(xml,f,time);
 assert.equal(items.length,1);
 assert.equal(items[0].title,'Football club completes important new season announcement');
 assert.equal(items[0].source,'SportBusy');
 assert.equal(items[0].timestamp_kind,'published');
 assert.equal(items[0].published_at,'2026-09-25T10:00:00.000Z');
 assert.equal(items[0].image,null);
 assert(partner.parseFeed(xml,{...f,domain:'sportsbusy.com'},time).length===0);
});
test('The Conversation approved sports Atom title retains original URL and source date without copied article body',()=>{
 const partner=require('../tools/sports-partner-feed.js');
 const feed=partner.FEEDS.find(v=>v.source==='The Conversation');
 const xml='<feed xmlns="http://www.w3.org/2005/Atom"><entry>'+
  '<title>Research explains the impact of exercise across generations</title>'+
  '<link rel="alternate" href="https://theconversation.com/research-explains-the-impact-of-exercise-246801" />'+
  '<published>2026-09-25T09:12:00Z</published>'+
  '<content>This article body must never be republished.</content>'+
  '</entry></feed>';
 const rows=partner.parseFeed(xml,feed,Date.parse('2026-09-25T10:00:00Z'));
 assert.equal(rows.length,1);
 assert.match(rows[0].url,/^https:\/\/theconversation\.com\//);
 assert.equal(rows[0].image,null);
 assert.equal(rows[0].timestamp_kind,'published');
 assert.doesNotMatch(JSON.stringify(rows),/article body/i);
});
test('source transport fallback is constrained to approved canonical sources without photos or gambling',()=>{
 const f=read('tools/refresh-sports-discovery.js'),p=read('tools/sports-partner-feed.js'),
  news=read('tools/refresh-news-rss.js'),home=read('latest-news.js');
 assert.match(f,/collectLicensedPartnerLinks/);
 assert.match(p,/GAMBLING/);
 assert.match(p,/image:null/);
 assert.match(news,/theconversation\.com/);
 assert.match(news,/sportbusy\.com/);
 assert.match(home,/theconversation\.com/);
 assert.match(home,/sportbusy\.com/);
 assert.match(news,/timestamp_kind/);
});
