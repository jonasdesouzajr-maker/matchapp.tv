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
 assert.match(news,/timestamp_kind!=='published'/);
 assert.match(news,/publisher-supplied publication times/i);
 assert.doesNotMatch(sports,/feeds\.bbci|sports\/rss\.xml|rss\.cnn/);
 assert.match(sports,/image:null/);
 assert.match(sports,/fetchGdelt/);
 assert.match(sports,/execFileSync\('curl'/);
 assert.match(sports,/--fail/);
 assert.match(read('.github/workflows/sports-refresh.yml'),/NODE_OPTIONS: --dns-result-order=ipv4first/);
 assert.match(read('tools/update-sitemap.js'),/newsUrlsFromDisk/);
});


test('non-licensed RSS sources never enter approved sports fallbacks',()=>{
 const partner=require('../tools/sports-partner-feed.js');
 const now=Date.parse('2026-09-25T12:00:00Z');
 const fake={url:'https://www.sportbusy.com/feed.xml',domain:'sportbusy.com',source:'SportBusy',category:'sports'};
 const xml='<rss><channel><item><title>Football team announces a new season lineup</title>'+
   '<link>https://www.sportbusy.com/news/football-season-announcement</link>'+
   '<pubDate>Fri, 25 Sep 2026 10:00:00 GMT</pubDate></item></channel></rss>';
 assert.deepEqual(partner.parseFeed(xml,fake,now),[]);
 assert.equal(partner.FEEDS.length,4);
 assert(partner.FEEDS.every(feed=>feed.source==='The Conversation'&&feed.domain==='theconversation.com'));
 assert(partner.FEEDS.filter(feed=>feed.category==='sport').length===3);
 assert(partner.FEEDS.some(feed=>feed.url==='https://theconversation.com/au/articles.atom'&&feed.category==='general'));
 assert.doesNotMatch(read('latest-news.js'),/sportbusy\.com/);
 assert.doesNotMatch(read('tools/refresh-news-rss.js'),/sportbusy\.com/);
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
 assert.doesNotMatch(news,/sportbusy\.com/);
 assert.match(home,/theconversation\.com/);
 assert.doesNotMatch(home,/sportbusy\.com/);
 assert.match(news,/timestamp_kind/);
});

test('regional sports topics and Australian feed preserve strict sport-only original links',()=>{
 const partner=require('../tools/sports-partner-feed.js'),time=Date.parse('2026-09-25T12:00:00Z');
 const dates='<published>2026-09-25T09:12:00Z</published>';
 const xml=(title,url)=>'<feed xmlns="http://www.w3.org/2005/Atom"><entry>'+
  '<title>'+title+'</title><link rel="alternate" href="'+url+'" />'+dates+
  '<content>Publisher article body must never be republished.</content></entry></feed>';
 const sportFeed=partner.FEEDS.find(f=>f.url.includes('athletes-84090'));
 const olympicFeed=partner.FEEDS.find(f=>f.url.includes('jeux-olympiques-jo-153405'));
 const general=partner.FEEDS.find(f=>f.category==='general');
 assert.equal(partner.parseFeed(xml('Sports science studies athlete recovery','https://theconversation.com/sports-science-210000'),sportFeed,time).length,1);
 assert.equal(partner.parseFeed(xml('Jeux Olympiques : nouvelles études et entraînement','https://theconversation.com/jeux-olympiques-science-210001'),olympicFeed,time).length,1);
 assert.deepEqual(partner.parseFeed(xml('Technology changes housing choices','https://theconversation.com/technology-housing-210002'),general,time),[]);
 const verified=partner.parseFeed(xml('Tennis and sport participation in Australia','https://theconversation.com/tennis-participation-210003'),general,time);
 assert.equal(verified.length,1);
 assert.equal(verified[0].image,null);
 assert.equal(verified[0].url,'https://theconversation.com/tennis-participation-210003');
 assert(!JSON.stringify(verified).includes('article body'));
 assert.deepEqual(partner.parseFeed(xml('Football betting odds and parlays','https://theconversation.com/football-betting-210004'),general,time),[]);
});
test('regional feed sources stay exactly allowlisted; no direct unlicensed sport feeds',()=>{
 const partner=require('../tools/sports-partner-feed.js');
 assert.deepEqual(partner.FEEDS.map(f=>new URL(f.url).hostname),Array(4).fill('theconversation.com'));
 const fake={...partner.FEEDS[0],url:'https://unlicensed-sport.example/rss'};
 const xml='<feed><entry><title>Soccer game updates and scores today</title>'+
 '<link rel="alternate" href="https://theconversation.com/soccer-2026" />'+
 '<published>2026-09-25T10:00:00Z</published></entry></feed>';
 assert.deepEqual(partner.parseFeed(xml,fake,Date.parse('2026-09-25T12:00:00Z')),[]);
});
