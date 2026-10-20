'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const sports=require('../tools/refresh-sports-discovery.js'),partner=require('../tools/sports-partner-feed.js');
const ROOT=path.resolve(__dirname,'..'),NOW=Date.parse('2026-10-19T17:30:00Z');
const row=(id='one',published_at='2026-10-19T09:00:00Z')=>({id,title:'Tennis participation research '+id,url:'https://theconversation.com/tennis-research-'+id,source:'The Conversation',source_domain:'theconversation.com',source_home:'https://theconversation.com',country:'GLOBAL',category:'sports',sport:'Tennis',event_type:'Tennis',published_at,timestamp_kind:'published',discovery_source:'Authorized publisher RSS/Atom',image:null});
function fixture(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'editorial-source-'));return {dir,output:path.join(dir,'sports.json'),close(){fs.rmSync(dir,{recursive:true,force:true});}};}
const failed=async()=>{throw Error('HTTP 429');};
const report=items=>({items,checks:[{url:partner.FEEDS[0].url,ok:true,items:items.length}]});
test('unchanged successful sports checks preserve snapshot bytes and original publication dates',async()=>{
 const f=fixture();try{
  const options={output:f.output,now:NOW,discover:failed,partners:async()=>report([row()])};
  assert.equal((await sports.main(options)).status,'changed');const first=fs.readFileSync(f.output,'utf8');
  const second=await sports.main({...options,now:NOW+3600000});
  assert.equal(second.status,'unchanged');assert.equal(second.checked_at,new Date(NOW+3600000).toISOString());
  assert.equal(second.content_updated_at,new Date(NOW).toISOString());assert.equal(second.degraded,true);
  assert.equal(fs.readFileSync(f.output,'utf8'),first);assert.equal(JSON.parse(first).items[0].published_at,row().published_at);
 }finally{f.close();}
});
test('partial sports source outage preserves independently verified, unexpired last-good rows',async()=>{
 const f=fixture();try{
  fs.writeFileSync(f.output,JSON.stringify({updated_at:new Date(NOW-3600000).toISOString(),items:[row('one'),row('two')]}));
  const result=await sports.main({output:f.output,now:NOW,discover:failed,partners:async()=>report([row('one')])});
  assert.equal(result.sports,2);assert.equal(result.status,'unchanged');
  const result2=await sports.main({output:f.output,now:NOW+97*3600000,discover:failed,partners:async()=>report([])});
  assert.equal(result2.status,'checked-empty');assert.equal(result2.sports,0);
  assert.equal(JSON.parse(fs.readFileSync(f.output)).items.length,2,'last good bytes remain; readers enforce real source age');
 }finally{f.close();}
});
test('empty successful checks and total source failure remain distinct; neither erases last good data',async()=>{
 const f=fixture();try{
  const before=JSON.stringify({updated_at:'2026-10-15T08:00:00Z',items:[row('old','2026-10-14T09:00:00Z')]});fs.writeFileSync(f.output,before);
  const result=await sports.main({output:f.output,now:NOW,discover:async()=>({articles:[]}),partners:async()=>report([])});
  assert.equal(result.status,'checked-empty');assert.equal(result.degraded,false);assert.equal(fs.readFileSync(f.output,'utf8'),before);
  await assert.rejects(sports.main({output:f.output,now:NOW,discover:failed,partners:async()=>({items:[],checks:[{ok:false,error:'timeout'}]})}),/No verified sports source check succeeded/);
  assert.equal(fs.readFileSync(f.output,'utf8'),before);
 }finally{f.close();}
});
test('retained sports never extend source expiry, trust unauthorized sources, or accept future dates',()=>{
 const retained=sports.retainedRows({items:[null,row(),row('old','2026-10-14T00:00:00Z'),row('future','2026-10-20T00:00:00Z'),row('betting'),{...row('bad'),url:'https://evil.example/sport'}]},NOW);
 assert.deepEqual(retained.map(r=>r.id),['one']);
});
test('sports topic privileges come from the exact approved feed, not supplied category metadata',()=>{
 const feed=partner.FEEDS.find(f=>f.category==='general');
 const xml='<feed><entry><title>Housing research changes city planning</title><link rel="alternate" href="https://theconversation.com/housing-research-123456"/><published>2026-10-19T10:00:00Z</published></entry></feed>';
 assert.deepEqual(partner.parseFeed(xml,{...feed,category:'sport'},NOW),[]);
});
test('sports checks distinguish valid empty feeds, HTML errors, and reject redirects before fetching unauthorized destinations',async()=>{
 const requests=[];
 const result=await partner.collectReport(async(url,options)=>{
  requests.push(url);assert.equal(options.redirect,'manual');
  if(url===partner.FEEDS[0].url)return {status:302,headers:new Headers({location:'https://unapproved.example/feed'})};
  return {ok:true,status:200,text:async()=>url===partner.FEEDS[1].url?'<html>Rate limited</html>':'<feed></feed>'};
 },NOW);
 assert.equal(requests.length,partner.FEEDS.length);assert.ok(requests.every(u=>u.startsWith('https://theconversation.com/')));
 assert.equal(result.checks.filter(c=>c.ok).length,3);assert.equal(result.checks.filter(c=>!c.ok).length,2);assert.deepEqual(result.items,[]);
});
const source=fs.readFileSync(path.join(ROOT,'tools/refresh-news-rss.js'),'utf8');
function newsDefinitions({filesystem=fs,now=NOW}={}){
 const start=source.search(/^\(async\b/m);
 class Clock extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
 return vm.runInNewContext(source.slice(0,start)+'\n;({iso,readSports,retainSeoTimestamp})',{
  __dirname:path.join(ROOT,'tools'),Date:Clock,URL,URLSearchParams,AbortController,Buffer,setTimeout,clearTimeout,console,
  require(name){if(name==='node:fs')return filesystem;if(name==='../news-monetization.js')return {};if(name==='./finalize-brand.js')return require('../tools/finalize-brand.js');return require(name);}
 });
}
test('missing, invalid, and future news dates are rejected rather than fabricated from crawl time',()=>{
 const api=newsDefinitions();for(const date of ['',null,undefined,'not a date','2026-10-20T00:00:00Z'])assert.equal(api.iso(date),null);
 assert.equal(api.iso('Mon, 19 Oct 2026 09:00:00 GMT'),'2026-10-19T09:00:00.000Z');
});
test('unchanged sports remain visible by genuine source age; old checks cannot extend expired articles',()=>{
 const snapshot={updated_at:'2026-10-16T08:00:00Z',items:[row(),row('expired','2026-10-14T00:00:00Z'),row('future','2026-10-20T00:00:00Z')]};
 const api=newsDefinitions({filesystem:{...fs,existsSync:()=>true,readFileSync:()=>JSON.stringify(snapshot)}});
 assert.deepEqual(Array.from(api.readSports().items,r=>r.id),['one']);
});
test('SEO is rebuilt but its modification timestamp changes only with actual metadata',()=>{
 const api=newsDefinitions(),prior={seo:{keywords:['tennis'],seo_generated_at:'2026-10-18T10:00:00Z'}};
 const item={seo:{keywords:['tennis'],seo_generated_at:'2026-10-19T10:00:00Z'}};
 api.retainSeoTimestamp(item,prior);assert.equal(item.seo.seo_generated_at,prior.seo.seo_generated_at);
 item.seo={keywords:['football'],seo_generated_at:'2026-10-19T10:00:00Z'};api.retainSeoTimestamp(item,prior);assert.equal(item.seo.seo_generated_at,'2026-10-19T10:00:00Z');
});
test('two identical full news generator executions produce byte-identical data, archive, HTML and sitemap manifest',async()=>{
 const f=fixture();try{
  fs.mkdirSync(path.join(f.dir,'tools'));fs.mkdirSync(path.join(f.dir,'news'));
  let now=NOW;
  const xml='<rss><channel>'+Array.from({length:6},(_,i)=>'<item><title>Official film premiere report number '+i+'</title><link>https://www.bbc.com/news/articles/fixture-'+i+'</link><pubDate>Mon, 19 Oct 2026 09:00:00 GMT</pubDate></item>').join('')+'</channel></rss>';
  class Clock extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
  const run=()=>vm.runInNewContext(source,{
   __dirname:path.join(f.dir,'tools'),Date:Clock,URL,URLSearchParams,AbortController,Buffer,setTimeout,clearTimeout,
   console:{log(){},warn(){},error(){}},process:{env:{},exit(code){throw Error('Generator exit '+code);}},
   fetch:async url=>({ok:true,status:200,text:async()=>String(url).includes('feeds.bbci')?xml:'<rss><channel></channel></rss>'}),
   require(name){if(name==='../news-monetization.js')return {eligibleArticle:()=>false,offers:[],offersMarkup:()=>''};if(name==='./finalize-brand.js')return require('../tools/finalize-brand.js');return require(name);}
  });
  const contents=()=>Object.fromEntries(fs.readdirSync(f.dir,{recursive:true}).filter(p=>fs.statSync(path.join(f.dir,p)).isFile()).map(p=>[p,fs.readFileSync(path.join(f.dir,p),'utf8')]));
  await run();const first=contents();assert.ok(Object.keys(first).length>6);now+=3600000;await run();assert.deepEqual(contents(),first);
 }finally{f.close();}
});
test('GDELT publisher allowlisting never admits gambling promotions as sports reporting',()=>{
 const articles=[{title:'Football betting odds and picks for tonight',url:'https://www.espn.com/football/betting/fixture',seendate:'20261019T090000Z'},
 {title:'Football tournament announces match schedule',url:'https://www.espn.com/football/fixture',seendate:'20261019T090000Z'}];
 const rows=sports.normalizeArticles(articles,NOW);assert.equal(rows.length,1);assert.equal(rows[0].timestamp_kind,'discovered');assert.ok(!rows[0].url.includes('betting'));
});
