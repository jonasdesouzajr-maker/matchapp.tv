#!/usr/bin/env node
'use strict';
/*
 * GDELT Project DOC 2.0 discovers original sports publisher URLs, twice daily.
 * This does not ingest publishers' RSS, scrape their pages, copy their images,
 * reprint article bodies, or claim permission to syndicate the original work.
 * Source links remain original HTTPS publisher URLs. No story is invented.
 * GDELT Project API is distinct from the separately licensed GDELT Cloud.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),https=require('node:https');
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
// Native Node HTTPS avoids the built-in fetch transport's fixed 10-second
// connection timeout, which stopped the first GitHub Actions sports run before
// the function's 15-second AbortController expired. This is not a proxy,
// publisher scrape or alternate unapproved content provider.
const REQUEST_TIMEOUT_MS=26000,MAX_RESPONSE_BYTES=2*1024*1024;
function getGdeltJSON(url,httpsModule=https){
 return new Promise((resolve,reject)=>{
  let settled=false;
  function fail(error){if(!settled){settled=true;reject(error)}}
  const req=httpsModule.get(url,{
   family:4,timeout:REQUEST_TIMEOUT_MS,
   headers:{accept:'application/json','user-agent':'MatchAppSportsDiscovery/1.1 (+https://matchapp.tv/)'}
  },res=>{
   if(res.statusCode!==200){
    res.resume();
    fail(Error('GDELT API HTTP '+res.statusCode));
    return;
   }
   let content='';
   res.setEncoding('utf8');
   res.on('data',chunk=>{
    content+=chunk;
    if(content.length>MAX_RESPONSE_BYTES){
     req.destroy(Error('GDELT response exceeded safety limit'));
    }
   });
   res.on('error',fail);
   res.on('end',()=>{
    if(settled)return;
    try{
     const parsed=JSON.parse(content);
     if(!Array.isArray(parsed?.articles))throw Error('GDELT response has no article list');
     settled=true;resolve(parsed);
    }catch(e){fail(e)}
   });
  });
  req.on('timeout',()=>req.destroy(Error('GDELT HTTPS timeout')));
  req.on('error',fail);
 });
}
function queryURL(maxRecords,query){
 const u=new URL(API);
 u.searchParams.set('query',query);
 u.searchParams.set('mode','artlist');
 u.searchParams.set('format','json');
 u.searchParams.set('timespan','48h');
 u.searchParams.set('sort','datedesc');
 u.searchParams.set('maxrecords',String(maxRecords));
 return u;
}
async function discoverWithRetry(request=getGdeltJSON){
 const queries=[
  ['(football OR soccer OR basketball OR tennis OR "Formula 1" OR olympics OR futebol OR basquete)',150],
  ['(football OR soccer OR basketball OR tennis OR "Formula 1")',120],
  ['(football OR basketball OR tennis OR futebol)',100]
 ];
 let lastError=null;
 for(let attempt=0;attempt<queries.length;attempt++){
  const [query,limit]=queries[attempt];
  try{
   const result=await request(queryURL(limit,query));
   const rows=normalizeArticles(result.articles);
   if(rows.length>=3)return rows;
   lastError=Error('Only '+rows.length+' vetted original sports links on attempt '+(attempt+1));
   console.warn('[sports] '+lastError.message);
  }catch(e){
   lastError=e;
   // Keep diagnostics explicit: upstream DNS, TLS, HTTP 429, empty API
   // payloads and connect timeouts are different failures.
   console.warn('[sports] GDELT attempt '+(attempt+1)+'/'+queries.length+': '+(e?.cause?.code||e?.code||e?.message||'unknown'));
  }
  if(attempt<queries.length-1)await new Promise(resolve=>setTimeout(resolve,1500*(attempt+1)));
 }
 throw Error('GDELT source unavailable after bounded retries; prior committed news untouched: '+(lastError?.message||'no trusted results'));
}
async function main(){
 const rows=await discoverWithRetry();
 const snapshot={updated_at:new Date().toISOString(),
  source_policy:'GDELT Project DOC 2.0 publisher-link discovery; original HTTPS publisher links only; no RSS syndication or copied photography',
  items:rows};
 fs.mkdirSync(path.dirname(OUTPUT),{recursive:true});
 fs.writeFileSync(OUTPUT,JSON.stringify(snapshot,null,2)+'\n');
 console.log(JSON.stringify({ok:true,sports:rows.length,sources:[...new Set(rows.map(i=>i.source))]}));
}

module.exports={normalizeArticles,publisher,dateOf,sportType,queryURL,getGdeltJSON,discoverWithRetry};
if(require.main===module)main().catch(e=>{console.error('[sports] '+(e.stack||e.message));process.exitCode=1});
