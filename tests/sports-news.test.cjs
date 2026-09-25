'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const discover=require('../tools/refresh-sports-discovery.js');
const {EventEmitter}=require('node:events');
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
 assert.match(sport,/tools\/refresh-sports-discovery\.js/);
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
 assert.match(read('tools/update-sitemap.js'),/newsUrlsFromDisk/);
});

test('native HTTPS retries can recover publisher-link discovery without RSS syndication',async()=>{
 const fixture=[
 article('Football league results: Brazil domestic finals confirmed','https://g1.globo.com/esporte/futebol/serie-a/noticia/2026/09/25/exemplo.ghtml'),
 article('Basketball NBA season opens with major changes','https://www.reuters.com/sports/basketball/nba-season-2026-09-25/'),
 article('Formula 1 teams prepare for next Grand Prix','https://www.apnews.com/article/formula-1-qualifying-2026')
 ];
 const old=Date.now;let calls=0;
 try{
 Date.now=()=>now;
 const rows=await discover.discoverWithRetry(async url=>{
  calls++;
  assert.equal(url.protocol,'https:');
  assert.equal(url.hostname,'api.gdeltproject.org');
  assert.equal(url.searchParams.get('format'),'json');
  return {articles:fixture};
 });
 assert.equal(calls,1);
 assert.equal(rows.length,3);
 assert(rows.every(i=>i.image===null&&i.discovery_source==='GDELT Project DOC 2.0'));
 }finally{Date.now=old}
});
test('sports link request uses bounded native HTTPS and validates JSON before accepting it',async()=>{
 const native={
  get(url,opts,respond){
   assert.equal(url.hostname,'api.gdeltproject.org');
   assert.equal(opts.family,4);
   assert(opts.timeout>=20000&&opts.timeout<30000);
   const request=new EventEmitter();
   request.destroy=err=>request.emit('error',err);
   queueMicrotask(()=>{
    const response=new EventEmitter();
    response.statusCode=200;response.setEncoding=()=>{};
    respond(response);
    response.emit('data',JSON.stringify({articles:[]}));
    response.emit('end');
   });
   return request;
  }
 };
 const result=await discover.getGdeltJSON(discover.queryURL(10,'football'),native);
 assert.deepEqual(result,{articles:[]});
});
