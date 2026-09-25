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

test('commercial-keyed secondary sports source accepts only original trusted publisher URLs and sport categories',()=>{
 const now=Date.parse('2026-09-25T10:30:00.000Z');
 const records=[
  {title:'Football league results: Brazil domestic finals confirmed',link:'https://g1.globo.com/esporte/futebol/serie-a/noticia/2026/09/25/exemplo.ghtml',pubDate:'2026-09-25 10:00:00',category:['sports']},
  {title:'Basketball NBA season opens with major changes',link:'https://www.reuters.com/sports/basketball/nba-season-2026-09-25/',pubDate:'2026-09-25 10:00:00',category:['sports']},
  {title:'Formula 1 teams prepare for next Grand Prix',link:'https://www.apnews.com/article/formula-1-qualifying-2026',pubDate:'2026-09-25 10:00:00',category:['sports']},
  {title:'Football league results: Brazil domestic finals confirmed',link:'https://g1.globo.com/esporte/futebol/serie-a/noticia/2026/09/25/exemplo.ghtml',pubDate:'2026-09-25 10:00:00',category:['sports']},
  {title:'Football news from a fake Reuters clone',link:'https://reuters.com.attacker.invalid/sports/football/news',pubDate:'2026-09-25 10:00:00',category:['sports']},
  {title:'Football story miscategorized as tech',link:'https://www.reuters.com/sports/football/some-news',pubDate:'2026-09-25 10:00:00',category:['technology']}
 ];
 const parsed=discover.normalizeNewsData(records,now);
 assert.equal(parsed.length,3);
 assert.deepEqual(parsed.map(x=>x.source),['G1 Esportes','Reuters','AP News']);
 assert(parsed.every(x=>x.category==='sports'&&x.image===null&&x.date_provenance==='newsdata-supplied-publisher-time'));
 assert(parsed.every(x=>x.discovery_source==='NewsData.io Latest News'));
});
test('commercial fallback needs a secret and makes at most two bounded original-source requests',async()=>{
 const fakeArticle=(title,link)=>({title,link,pubDate:'2026-09-25 10:00:00',category:['sports']});
 let calls=[];
 const mock=async(url)=>{
  const u=new URL(url);calls.push(u);
  assert.equal(u.hostname,'newsdata.io');
  assert.equal(u.pathname,'/api/1/latest');
  assert.equal(u.searchParams.get('apikey'),'test-local-do-not-use');
  assert.equal(u.searchParams.get('category'),'sports');
  assert.equal(u.searchParams.get('size'),'10');
  assert(u.searchParams.get('domain').split(',').length<=5);
  return {ok:true,json:async()=>({status:'success',results:calls.length===1?[
    fakeArticle('Football championship score results confirmed','https://www.reuters.com/sports/football/championship-2026-09-25/')
  ]:[
    fakeArticle('Basketball NBA league schedule announced','https://www.nba.com/news/league-schedule-2026'),
    fakeArticle('Formula 1 teams prepare for Grand Prix','https://www.formula1.com/en/latest/article/teams-practice-race-2026')
  ]})};
 };
 assert.deepEqual(await discover.discoverNewsData('',mock,Date.parse('2026-09-25T10:30:00Z')),[]);
 const rows=await discover.discoverNewsData('test-local-do-not-use',mock,Date.parse('2026-09-25T10:30:00Z'));
 assert.equal(calls.length,2);
 assert.equal(rows.length,3);
 assert(rows.every(row=>row.url.startsWith('https://')&&row.image===null));
});
test('scheduled sports workflow passes the optional secret only to discovery and safe regeneration',()=>{
 const workflow=read('.github/workflows/sports-refresh.yml');
 assert.equal((workflow.match(/NEWSDATA_API_KEY: \$\{\{ secrets.NEWSDATA_API_KEY \}\}/g)||[]).length,2);
 assert.match(workflow,/node tools\/refresh-sports-discovery\.js/);
 assert.match(read('tools/refresh-sports-discovery.js'),/newsdata\.io\/api\/1\/latest/);
});
