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
const {collectReport:collectLicensedPartnerLinks}=require('./sports-partner-feed.js');
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
const PROMOTION=/(?:betting|gambling|casino|sportsbook|wager|moneyline|parlay|bookmaker|bonus bet|odds|picks for betting)/i;
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
     now-date.valueOf()>60*3600000||RUMOR.test(title)||PROMOTION.test(title+' '+url)||
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
    published_at:date.toISOString(),timestamp_kind:'discovered',image:null,
    discovery_source:'GDELT Project DOC 2.0'
  });
 }
 return [...found.values()].sort((a,b)=>b.published_at.localeCompare(a.published_at)).slice(0,12);
}
// Both inputs are already independently verified against their own publisher
// policy. A partial GDELT response must never be thrown away just because the
// separately permitted fallback returned another story.
function mergeVerifiedSourceRows(discovered=[],partner=[]){
 const urls=new Set(),headlines=new Set(),rows=[];
 for(const item of [...discovered,...partner]){
  if(!item||typeof item.url!=='string'||!item.url.startsWith('https://'))continue;
  const title=words(item.title).toLowerCase().normalize('NFD')
   .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  if(!title||urls.has(item.url)||headlines.has(title))continue;
  urls.add(item.url);headlines.add(title);rows.push(item);
 }
 return rows.sort((a,b)=>b.published_at.localeCompare(a.published_at)||a.url.localeCompare(b.url)).slice(0,12);
}

// GDELT DOC queries can legitimately take over 30s. Allow a bounded 45s
// HTTPS response window, then retry over IPv4 with certificate verification.
// Never downgrade to HTTP or bypass server identity checks. Never silently replace real
// headline data with guessed stories on network failure.
async function fetchGdelt(url){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),45000);
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
    '--connect-timeout','12','--max-time','45',
    '--header','Accept: application/json',url
   ],{encoding:'utf8',timeout:50000,maxBuffer:8*1024*1024});
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
function retainedRows(snapshot,now){
 return (Array.isArray(snapshot?.items)?snapshot.items:[]).filter(item=>{
  const time=Date.parse(item?.published_at);
  const partner=item?.discovery_source==='Authorized publisher RSS/Atom'&&
   domainOf(item.url)==='theconversation.com'&&item.source==='The Conversation'&&item.timestamp_kind==='published';
  const gdelt=item?.discovery_source==='GDELT Project DOC 2.0'&&publisher(item.url)?.source===item.source;
  return item?.category==='sports'&&item.image===null&&(partner||gdelt)&&
   Number.isFinite(time)&&time<=now+3600000&&now-time<=(partner?96:60)*3600000;
 });
}
function sameContent(a,b){
 const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)
  ?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
 return canonical(a)===canonical(b);
}
async function main({output=OUTPUT,now=Date.now(),discover=fetchGdelt,partners=collectLicensedPartnerLinks,summaryFile=null}={}){
 const u=new URL(API);
 u.searchParams.set('query','(football OR soccer OR basketball OR tennis OR "Formula 1" OR olympics OR futebol OR basquete)');
 u.searchParams.set('mode','artlist');
 u.searchParams.set('format','json');
 u.searchParams.set('timespan','48h');
 u.searchParams.set('sort','datedesc');
 u.searchParams.set('maxrecords','250');
 let rows=[],checks=[];
 try{
  const result=await discover(u.href);
  if(!Array.isArray(result?.articles))throw Error('GDELT response missing articles');
  rows=normalizeArticles(result.articles,now);
  checks.push({source:'GDELT',ok:true,items:rows.length});
 }catch(e){
  checks.push({source:'GDELT',ok:false,error:e.message});
  console.warn('[sports] GDELT unavailable; trying explicitly authorized publisher headlines: '+e.message);
 }
 if(rows.length<3){
  const fallback=await partners(undefined,now);
  checks.push(...fallback.checks);
  rows=mergeVerifiedSourceRows(rows,fallback.items);
 }
 if(!checks.some(check=>check.ok))throw Error('No verified sports source check succeeded; preserve previously committed news');
 let previous=null;
 try{previous=JSON.parse(fs.readFileSync(output,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 const degraded=checks.some(check=>!check.ok);
 if(degraded)rows=mergeVerifiedSourceRows(rows,retainedRows(previous,now));
 // Empty but successfully checked sources do not justify deleting last-good
 // data or inventing stories. Readers expire cards using the source dates.
 const policy=[...new Set(rows.map(row=>row.discovery_source))].sort().join(' plus ');
 const snapshot={updated_at:new Date(now).toISOString(),
  source_policy:policy+'; directly linked canonical URLs, no article-body/image republication and no betting guides',
  items:rows};
 const changed=rows.length>0&&!sameContent(previous?.items,rows);
 if(changed){
  fs.mkdirSync(path.dirname(output),{recursive:true});
  const temporary=output+'.'+process.pid+'.tmp';
  try{fs.writeFileSync(temporary,JSON.stringify(snapshot,null,2)+'\n');fs.renameSync(temporary,output);}
  finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
 }
 const report={ok:true,status:rows.length?(changed?'changed':'unchanged'):'checked-empty',degraded,
  checked_at:new Date(now).toISOString(),content_updated_at:changed?snapshot.updated_at:previous?.updated_at||null,
  run_id:process.env.GITHUB_RUN_ID||null,sha:process.env.GITHUB_SHA||null,
  sports:rows.length,sources:[...new Set(rows.map(i=>i.source))],checks};
 console.log(JSON.stringify(report));
 if(summaryFile)fs.appendFileSync(summaryFile,'\nSports source check (publication is verified separately):\n```json\n'+JSON.stringify(report,null,2)+'\n```\n');
 return report;
}
module.exports={normalizeArticles,publisher,dateOf,sportType,mergeVerifiedSourceRows,retainedRows,main};
if(require.main===module)main({summaryFile:process.env.GITHUB_STEP_SUMMARY}).catch(e=>{console.error('[sports] '+(e.stack||e.message));process.exitCode=1});
