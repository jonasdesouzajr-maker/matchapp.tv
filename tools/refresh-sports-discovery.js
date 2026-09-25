#!/usr/bin/env node
'use strict';
/*
 * GDELT Project DOC 2.0 discovers original sports publisher URLs, twice daily.
 * This does not ingest publishers' RSS, scrape their pages, copy their images,
 * reprint article bodies, or claim permission to syndicate the original work.
 * Source links remain original HTTPS publisher URLs. No story is invented.
 * GDELT Project API is distinct from the separately licensed GDELT Cloud.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const ROOT=path.join(__dirname,'..'),OUTPUT=path.join(ROOT,'news','sports.json');
const API='https://api.gdeltproject.org/api/v2/doc/doc';
const DOMAINS=[
 {domain:'reuters.com',source:'Reuters'},
 {domain:'apnews.com',source:'AP News'},
 {domain:'g1.globo.com',source:'G1 Esportes'},
 {domain:'espn.com',source:'ESPN'},
 {domain:'espn.com.br',source:'ESPN Brasil'},
 {domain:'theguardian.com',source:'The Guardian'},
 {domain:'formula1.com',source:'Formula 1'},
 {domain:'nba.com',source:'NBA'}
];
const SUBJECT=/(?:\b(?:football|soccer|basketball|nba|wnba|tennis|golf|cycling|olympic|formula\s?1|grand prix|motorsport|hockey|cricket|rugby|volleyball|sport|world cup|champions league|premier league|f1)\b|futebol|basquete|tênis|tenis|esporte|olimpíad|campeonato|copa do mundo)/i;
const RUMOR=/(?:\b(?:rumou?r|allegedly|speculation|unconfirmed)\b|boato|supostamente)/i;
const words=s=>String(s||'').replace(/\s+/g,' ').trim();
const domainOf=url=>{try{
 const u=new URL(url);
 return u.protocol==='https:'?u.hostname.toLowerCase().replace(/^www\./,''):'';
}catch(_){return ''}};
const publisher=url=>{
 const d=domainOf(url);
 return DOMAINS.find(entry=>d===entry.domain||d.endsWith('.'+entry.domain))||null;
};
function sportType(title,url){
 const t=String(title||'')+' '+new URL(url).pathname.replace(/[\/_-]+/g,' ');
 if(/formula\s?1|\bf1\b|grand prix|motorsport/i.test(t))return 'Formula 1';
 if(/basketball|\bnba\b|\bwnba\b|basquete/i.test(t))return 'Basketball';
 if(/tennis|tênis|tenis/i.test(t))return 'Tennis';
 if(/football|soccer|futebol|world cup|champions league|premier league/i.test(t))return 'Football';
 if(/olympic|olimpíad/i.test(t))return 'Olympics';
 return 'Sports';
}
function dateOf(article){
 const raw=String(article?.seendate||article?.published_at||'');
 const compact=raw.match(/^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)Z?$/);
 return new Date(compact?compact.slice(1,7).reduce((s,v,i)=>s+v+[ '-', '-', 'T', ':', ':', 'Z' ][i],''):raw);
}
function normalizeArticles(articles,now=Date.now()){
 const found=new Map(),headlines=new Set();
 for(const article of articles||[]){
  const title=words(article?.title),url=String(article?.url||''),source=publisher(url),date=dateOf(article);
  if(!source||!title||title.length<16||title.length>220||
     !Number.isFinite(date.valueOf())||date.valueOf()>now+3600000||
     now-date.valueOf()>60*3600000||RUMOR.test(title)||
     !SUBJECT.test(title+' '+new URL(url).pathname.replace(/[-_/]+/g,' ')))continue;
  const normalized=title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
   .replace(/[^a-z0-9]+/g,' ').trim();
  if(headlines.has(normalized))continue;
  headlines.add(normalized);
  const id=crypto.createHash('sha256').update(url).digest('hex').slice(0,8);
  found.set(id,{
    id,title,url,source:source.source,source_domain:domainOf(url),
    source_home:'https://'+source.domain,country:source.domain==='g1.globo.com'||source.domain==='espn.com.br'?'BR':'GLOBAL',
    category:'sports',sport:sportType(title,url),event_type:sportType(title,url),
    published_at:date.toISOString(),image:null,
    discovery_source:'GDELT Project DOC 2.0'
  });
 }
 return [...found.values()].sort((a,b)=>b.published_at.localeCompare(a.published_at)).slice(0,12);
}
// GitHub runner DNS can favor broken IPv6 routes to GDELT. Use a strictly
// URL-pinned IPv4 curl fallback after bounded native fetch, preserving HTTPS
// certificate validation and JSON-only parsing. Never silently replace real
// headline data with guessed stories on network failure.
async function fetchGdelt(url){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),8500);
 try{
  const response=await fetch(url,{signal:controller.signal,headers:{
   accept:'application/json','user-agent':'MatchAppSportsDiscovery/1.0 (+https://matchapp.tv/)'
  }});
  if(!response.ok)throw Error('GDELT HTTP '+response.status);
  const json=await response.json();
  if(!Array.isArray(json?.articles))throw Error('GDELT response missing articles');
  return json;
 }catch(e){
  console.warn('[sports] GDELT primary transport failed: '+String(e?.message||e)+
   (e?.cause?' [cause: '+String(e.cause?.code||e.cause?.message||e.cause)+']':''));
  let raw;
  try{
   raw=execFileSync('curl',[
    '-4','--fail','--location','--silent','--show-error',
    '--retry','1','--retry-all-errors','--retry-delay','1',
    '--connect-timeout','6','--max-time','13',
    '--header','Accept: application/json',url
   ],{encoding:'utf8',timeout:17000,maxBuffer:8*1024*1024});
  }catch(curlError){
   console.error('[sports] GDELT IPv4 fallback failed: '+
    String(curlError?.message||curlError).slice(0,750));
   throw new Error('No verified sports data source reachable; preserve last committed news');
  }
  try{
   const json=JSON.parse(raw);
   if(!Array.isArray(json?.articles))throw Error('GDELT IPv4 returned no articles');
   console.log('[sports] GDELT recovered using HTTPS IPv4 transport');
   return json;
  }catch(parseError){
   throw new Error('GDELT fallback returned invalid JSON: '+parseError.message);
  }
 }finally{clearTimeout(timer)}
}
/* Optional commercially permitted provider fallback.
 * NewsData.io's free production use can be delayed ~12 hours. Never republish
 * article bodies or third-party photos; never trust a feed-provided source
 * label instead of the verified original publisher HTTPS hostname. */
function normalizeNewsData(records,now=Date.now()){
 const originals=[];
 for(const row of Array.isArray(records)?records:[]){
  if(!Array.isArray(row?.category)||!row.category.some(x=>String(x).toLowerCase()==='sports'))continue;
  const raw=String(row.pubDate||'').trim();
  const pubDate=/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(raw)?raw.replace(' ','T')+'Z':raw;
  const url=String(row.link||'');
  if(!publisher(url))continue;
  originals.push({title:row.title,url,seendate:pubDate});
 }
 return normalizeArticles(originals,now).map(row=>({
  ...row,discovery_source:'NewsData.io Latest News',
  date_provenance:'newsdata-supplied-publisher-time'
 }));
}
async function discoverNewsData(key,request=fetch,now=Date.now()){
 if(typeof key!=='string'||!key.trim())return [];
 const api='https://newsdata.io/api/1/latest';
 // Free keys return up to ten articles per request. Keep this bounded at
 // two requests per scheduled run, within the published free-tier allowance.
 const groups=[
  'reuters.com,espn.com,apnews.com,espn.com.br,theguardian.com',
  'g1.globo.com,formula1.com,nba.com'
 ];
 const results=new Map();
 for(const domains of groups){
  const u=new URL(api);
  u.searchParams.set('apikey',key);
  u.searchParams.set('category','sports');
  u.searchParams.set('language','en,pt');
  u.searchParams.set('domain',domains);
  u.searchParams.set('size','10');
  u.searchParams.set('removeduplicate','1');
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),16000);
  try{
   const response=await request(u,{signal:ctrl.signal,headers:{accept:'application/json'},redirect:'error'});
   if(!response.ok)throw Error('NewsData HTTP '+response.status);
   const payload=await response.json();
   if(payload?.status!=='success'||!Array.isArray(payload.results))throw Error('NewsData API unavailable');
   const verified=normalizeNewsData(payload.results,now);
   for(const row of verified)results.set(row.id,row);
   if(results.size>=3)break;
  }finally{clearTimeout(timer)}
 }
 return [...results.values()].sort((a,b)=>b.published_at.localeCompare(a.published_at)).slice(0,12);
}
async function main(){
 // A configured, expressly commercial-eligible API avoids dependence on
 // GitHub's currently failing TLS route to GDELT. Without a key, preserve
 // the original GDELT behavior; no sample or invented headlines.
 if(process.env.NEWSDATA_API_KEY){
  try{
   const rows=await discoverNewsData(process.env.NEWSDATA_API_KEY);
   if(rows.length>=3){
    const snapshot={updated_at:new Date().toISOString(),
     source_policy:'NewsData.io category=sports publisher-link index; verified original publisher HTTPS domains; no third-party images or article bodies',
     items:rows};
    fs.mkdirSync(path.dirname(OUTPUT),{recursive:true});
    fs.writeFileSync(OUTPUT,JSON.stringify(snapshot,null,2)+'\n');
    console.log(JSON.stringify({ok:true,sports:rows.length,discovery:'commercial-keyed-fallback',
      sources:[...new Set(rows.map(i=>i.source))]}));
    return;
   }
   console.warn('[sports] commercial fallback had fewer than three eligible current publisher links');
  }catch(e){
   // Do not log request URLs: NewsData embeds the key as a query parameter.
   console.warn('[sports] keyed provider unavailable: '+(e?.cause?.code||e?.code||'safe-source-check-failed'));
  }
 }
 const u=new URL(API);
 u.searchParams.set('query','(football OR soccer OR basketball OR tennis OR "Formula 1" OR olympics OR futebol OR basquete)');
 u.searchParams.set('mode','artlist');
 u.searchParams.set('format','json');
 u.searchParams.set('timespan','48h');
 u.searchParams.set('sort','datedesc');
 u.searchParams.set('maxrecords','250');
 const result=await fetchGdelt(u.href);
 const rows=normalizeArticles(result.articles);

 if(rows.length<3)throw Error('Only '+rows.length+' verified original sports links; preserve last committed snapshot');
 const snapshot={updated_at:new Date().toISOString(),
  source_policy:'GDELT Project DOC 2.0 publisher-link discovery; original HTTPS publisher links only; no RSS syndication or copied photography',
  items:rows};
 fs.mkdirSync(path.dirname(OUTPUT),{recursive:true});
 fs.writeFileSync(OUTPUT,JSON.stringify(snapshot,null,2)+'\n');
 console.log(JSON.stringify({ok:true,sports:rows.length,sources:[...new Set(rows.map(i=>i.source))]}));
}
module.exports={normalizeArticles,publisher,dateOf,sportType,normalizeNewsData,discoverNewsData};
if(require.main===module)main().catch(e=>{console.error('[sports] '+(e.stack||e.message));process.exitCode=1});
