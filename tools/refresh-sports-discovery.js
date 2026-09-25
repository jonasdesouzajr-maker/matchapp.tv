#!/usr/bin/env node
'use strict';
/*
 * GDELT Project DOC 2.0 discovers original sports publisher URLs, twice daily.
 * Uses original index links first; when unavailable, only approved publisher
 * feeds explicitly authorizing headline+canonical-link syndication can backfill.
 * Never copies article bodies, photos, promotional content or betting guides.
 * Source links remain original HTTPS publisher URLs. No story is invented.
 * GDELT Project API is distinct from the separately licensed GDELT Cloud.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {collect:collectLicensedPartnerLinks}=require('./sports-partner-feed.js');
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
async function main(){
 const u=new URL(API);
 u.searchParams.set('query','(football OR soccer OR basketball OR tennis OR "Formula 1" OR olympics OR futebol OR basquete)');
 u.searchParams.set('mode','artlist');
 u.searchParams.set('format','json');
 u.searchParams.set('timespan','48h');
 u.searchParams.set('sort','datedesc');
 u.searchParams.set('maxrecords','250');
 let rows=[],policy='GDELT Project DOC 2.0 publisher-link discovery';
 try{
  const result=await fetchGdelt(u.href);
  rows=normalizeArticles(result.articles);
 }catch(e){console.warn('[sports] GDELT unavailable; trying explicitly authorized publisher headlines: '+e.message)}
 if(rows.length<3){
  const fallback=await collectLicensedPartnerLinks();
  if(fallback.length){
   rows=fallback;
   policy='Explicitly authorized attributed original publisher RSS/Atom headlines';
  }
 }
 if(!rows.length)throw Error('No current source-verified sports stories accessible; preserve previously committed news');
 const snapshot={updated_at:new Date().toISOString(),
  source_policy:policy+'; directly linked canonical URLs, no article-body/image republication and no betting guides',
  items:rows};
 fs.mkdirSync(path.dirname(OUTPUT),{recursive:true});
 fs.writeFileSync(OUTPUT,JSON.stringify(snapshot,null,2)+'\n');
 console.log(JSON.stringify({ok:true,sports:rows.length,sources:[...new Set(rows.map(i=>i.source))]}));
}
module.exports={normalizeArticles,publisher,dateOf,sportType};
if(require.main===module)main().catch(e=>{console.error('[sports] '+(e.stack||e.message));process.exitCode=1});
