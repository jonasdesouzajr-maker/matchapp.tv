#!/usr/bin/env node
'use strict';

/*
 * MatchApp entertainment-news refresh.
 * Uses GDELT only as a discovery index; every displayed URL must belong to an
 * explicit trusted publisher allowlist and links directly to that publisher.
 * We do not copy article bodies. MatchApp pages contain a short factual source
 * summary and canonical link to the original report.
 */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const ROOT=path.join(__dirname,'..');
const NEWS=path.join(ROOT,'news');
const ARTICLES=path.join(NEWS,'articles');
const SITE='https://matchapp.tv';
const MAX_ITEMS=40;
const LOOKBACK='48h';
const SOURCES={
  'reuters.com':'Reuters',
  'cnn.com':'CNN',
  'hollywoodreporter.com':'The Hollywood Reporter',
  'bbc.com':'BBC',
  'g1.globo.com':'G1'
};
const COUNTRY_BY_SOURCE={'g1.globo.com':'BR','cnn.com':'US','hollywoodreporter.com':'US','bbc.com':'GB','reuters.com':'GLOBAL'};
const COUNTRY_NAMES={Brazil:'BR','UnitedStates:'US','UnitedKingdom:'GB',Canada:'CA',Australia:'AU',Portugal:'PT',Spain:'ES',France:'FR',Germany:'DE',Italy:'IT',Mexico:'MX',Argentina:'AR',India:'IN',Japan:'JP',SouthKorea:'KR'};
const TERMS='(actor OR actress OR singer OR musician OR movie OR film OR television OR streaming OR album OR song OR concert OR celebrity OR awards)';
const RUMOR=/\b(rumou?r|reportedly|allegedly|speculation|unconfirmed|sources say|might be|could be|is said to|insider claims?)\b/i;
const NON_NEWS=/\b(opinion|review roundup|shopping|deal|coupon|horoscope|quiz)\b/i;

function clean(s){return String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();}
function domainOf(url){try{return new URL(url).hostname.toLowerCase().replace(/^www\./,'');}catch(_){return '';}}
function trusted(url){const d=domainOf(url);return Object.keys(SOURCES).find(x=>d===x||d.endsWith('.'+x))||null;}
function slug(s){return clean(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,82)||'entertainment-news';}
function idFor(url){return crypto.createHash('sha256').update(url).digest('hex').slice(0,16);}
function iso(v){const s=String(v||'');const m=s.match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?(\d{2})?/);if(!m)return new Date().toISOString();return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]||'00'}:${m[5]||'00'}:${m[6]||'00'}Z`).toISOString();}
function country(row,source){const raw=String(row.sourcecountry||'').replace(/\s+/g,'');return COUNTRY_NAMES[raw]||COUNTRY_BY_SOURCE[source]||'GLOBAL';}
function eventType(title){const t=title.toLowerCase();if(/\b(dies|died|dead|death|obituary|remembering)\b/.test(t))return'Obituary';if(/\b(cast|joins|role|stars in|to star)\b/.test(t))return'Casting';if(/\b(album|single|song|tour|concert|music video|ep\b)\b/.test(t))return'Music';if(/\b(release|premiere|debut|trailer|opens|launch)\b/.test(t))return'Release';if(/\b(award|emmy|oscar|grammy|wins|nomination|nominated)\b/.test(t))return'Awards';if(/\b(interview|says|talks|speaks)\b/.test(t))return'Interview';return'Entertainment';}
function personFrom(title){const m=clean(title).match(/^([A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ][\p{L}'’.-]+(?:\s+[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ][\p{L}'’.-]+){1,3})\b/u);return m?m[1]:'';}
function summary(item){const who=item.person?`${item.person}: `:'';return `${who}${item.event_type.toLowerCase()} update covered by ${item.source}. Open the original report for the full context.`;}
function safeImage(u){try{const x=new URL(u);return x.protocol==='https:'?x.href:null;}catch(_){return null;}}
function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function queryDomain(domain){
  const q=`${TERMS} domain:${domain}`;
  const url=`https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(q)}&mode=artlist&maxrecords=40&format=json&sort=datedesc&timespan=${LOOKBACK}`;
  const ac=new AbortController();const timer=setTimeout(()=>ac.abort(),12000);
  try{const r=await fetch(url,{signal:ac.signal,headers:{accept:'application/json','user-agent':'MatchAppNewsBot/1.0 (+https://matchapp.tv/)'}});if(!r.ok)throw new Error(`${r.status}`);const j=await r.json();return Array.isArray(j.articles)?j.articles:[];}catch(e){console.warn(`[news] ${domain}: ${e.message}`);return [];}finally{clearTimeout(timer);}
}
function pageFor(item){
  const title=escapeHtml(item.title),desc=escapeHtml(item.description),source=escapeHtml(item.source),original=escapeHtml(item.url),canonical=escapeHtml(item.matchapp_url),date=escapeHtml(item.published_at),image=item.image?`<meta property="og:image" content="${escapeHtml(item.image)}">`:'';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | Entertainment News | MatchApp TV</title><meta name="description" content="${desc}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${canonical}"><meta property="og:type" content="article"><meta property="og:site_name" content="MatchApp TV Ai"><meta property="og:title" content="${title}"><meta property="og:description" content="${desc}"><meta property="og:url" content="${canonical}">${image}<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'WebPage',name:item.title,url:item.matchapp_url,datePublished:item.published_at,dateModified:item.published_at,description:item.description,isBasedOn:item.url,publisher:{'@type':'Organization',name:'MatchApp TV Ai',url:SITE},about:item.person||item.event_type})}</script><link rel="stylesheet" href="/style.css?v=187"><link rel="stylesheet" href="/brand.css?v=20260917-news1"></head><body><main style="max-width:780px;margin:40px auto;padding:20px"><article class="premium-card" style="padding:24px"><p style="color:#E5C158;font-weight:800">LATEST NEWS · ${escapeHtml(item.event_type)}</p><h1>${title}</h1><p>${desc}</p><p style="color:#aaa">${source} · <time datetime="${date}">${new Date(item.published_at).toLocaleDateString('en-US',{dateStyle:'long'})}</time></p><p><a href="${original}" target="_blank" rel="noopener noreferrer" style="color:#E5C158;font-weight:800">Read the original report at ${source} ↗</a></p><hr style="border-color:rgba(255,255,255,.1)"><p style="font-size:13px;color:#aaa">MatchApp links to the original publisher and does not republish the article body.</p><p><a href="/news/">More entertainment news</a> · <a href="/">Back to MatchApp</a></p></article></main></body></html>`;
}
function hubFor(items,generated){const cards=items.slice(0,24).map(i=>`<article style="padding:16px;border:1px solid rgba(255,255,255,.1);border-radius:14px"><p style="font-size:12px;color:#E5C158">${escapeHtml(i.source)} · ${escapeHtml(i.event_type)}</p><h2 style="font-size:19px"><a href="${escapeHtml(i.matchapp_url)}">${escapeHtml(i.title)}</a></h2><p>${escapeHtml(i.description)}</p><a href="${escapeHtml(i.url)}" target="_blank" rel="noopener noreferrer">Original source ↗</a></article>`).join('');return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Latest Entertainment News | Actors & Singers | MatchApp TV</title><meta name="description" content="Verified entertainment headlines about actors, singers, films and music from trusted publishers, refreshed hourly by MatchApp TV."><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${SITE}/news/"><link rel="stylesheet" href="/style.css?v=187"><link rel="stylesheet" href="/brand.css?v=20260917-news1"><script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'CollectionPage',name:'Latest Entertainment News',url:`${SITE}/news/`,dateModified:generated,description:'Verified entertainment headlines linked to original publishers.'})}</script></head><body><main style="max-width:1120px;margin:36px auto;padding:18px"><header><a href="/" style="color:#E5C158">← MatchApp</a><h1>Latest Entertainment News</h1><p>Actors, singers, releases and major entertainment updates from trusted publishers. Updated hourly.</p></header><section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px">${cards||'<p>Fresh headlines are being prepared.</p>'}</section></main></body></html>`;}
async function main(){
  const rows=(await Promise.all(Object.keys(SOURCES).map(queryDomain))).flat();
  const seen=new Set();const items=[];
  for(const row of rows){const url=String(row.url||'');const src=trusted(url);const title=clean(row.title);if(!src||!title||title.length<18||title.length>220||RUMOR.test(title)||NON_NEWS.test(title))continue;const key=title.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();if(seen.has(key))continue;seen.add(key);const id=idFor(url),baseSlug=slug(title),matchapp_url=`${SITE}/news/articles/${baseSlug}-${id.slice(0,6)}/`;const item={id,title,url,source:SOURCES[src],source_domain:src,country:country(row,src),published_at:iso(row.seendate),event_type:eventType(title),person:personFrom(title),description:'',image:safeImage(row.socialimage),matchapp_url};item.description=summary(item);items.push(item);if(items.length>=MAX_ITEMS)break;}
  items.sort((a,b)=>String(b.published_at).localeCompare(String(a.published_at)));
  const generated=new Date().toISOString();fs.mkdirSync(NEWS,{recursive:true});fs.rmSync(ARTICLES,{recursive:true,force:true});fs.mkdirSync(ARTICLES,{recursive:true});
  for(const item of items){const folder=path.join(ARTICLES,new URL(item.matchapp_url).pathname.split('/').filter(Boolean).pop());fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,'index.html'),pageFor(item));}
  fs.writeFileSync(path.join(NEWS,'data.json'),JSON.stringify({generated_at:generated,source_policy:'trusted-publisher-allowlist',items},null,2)+'\n');
  fs.writeFileSync(path.join(NEWS,'index.html'),hubFor(items,generated));
  const urls=[`${SITE}/news/`,...items.slice(0,30).map(x=>x.matchapp_url)];fs.writeFileSync(path.join(ROOT,'tools','news-urls.json'),JSON.stringify(urls,null,2)+'\n');
  console.log(JSON.stringify({ok:true,generated_at:generated,items:items.length,countries:[...new Set(items.map(i=>i.country))],sources:[...new Set(items.map(i=>i.source))]}));
  if(items.length<5)process.exitCode=2;
}
main().catch(e=>{console.error(e);process.exit(1);});