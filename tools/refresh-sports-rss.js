#!/usr/bin/env node
'use strict';
// Trusted sports RSS belongs to the existing news pipeline. Two scheduled
// refreshes populate this snapshot; hourly entertainment news reuses it.
// Only BBC Sport's RSS-provided headline, link and optional RSS media are used.
// Never scrape BBC article bodies, invent images, or use BBC branding.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.join(__dirname,'..'),OUTPUT=path.join(ROOT,'news','sports.json');
const FEEDS=[
 {url:'https://feeds.bbci.co.uk/sport/rss.xml',sport:'Sports'},
 {url:'https://feeds.bbci.co.uk/sport/football/rss.xml',sport:'Football'},
 {url:'https://feeds.bbci.co.uk/sport/formula1/rss.xml',sport:'Formula 1'},
 {url:'https://feeds.bbci.co.uk/sport/tennis/rss.xml',sport:'Tennis'}
];
const clean=value=>String(value||'')
 .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi,'$1')
 .replace(/<[^>]+>/g,' ')
 .replace(/&#x([a-f0-9]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)))
 .replace(/&#([0-9]+);/g,(_,n)=>String.fromCodePoint(parseInt(n,10)))
 .replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;/g,"'")
 .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ')
 .replace(/\s+/g,' ').trim();
const attr=(block,name)=>{const m=block.match(new RegExp('\\b'+name+'=["\\']([^"\\']+)["\\']','i'));return m?clean(m[1]):''};
const tag=(block,name)=>{const m=block.match(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+name+'>','i'));return m?clean(m[1]):''};
const allowed=url=>{
 try{const u=new URL(url);return u.protocol==='https:'&&
  (u.hostname==='bbc.co.uk'||u.hostname.endsWith('.bbc.co.uk')||u.hostname==='bbc.com'||u.hostname.endsWith('.bbc.com'))&&
  u.pathname.startsWith('/sport/');}catch(_){return false}
};
const media=block=>{
 for(const name of ['media:content','media:thumbnail','enclosure']){
  const re=new RegExp('<'+name+'\\b[^>]*>','i'),m=block.match(re);
  if(!m)continue;
  const url=attr(m[0],'url');
  try{const u=new URL(url);if(u.protocol==='https:'&&
    (u.hostname.endsWith('.bbci.co.uk')||u.hostname.endsWith('.bbc.co.uk')||
     u.hostname.endsWith('.bbc.com')))return u.href;}catch(_){}
 }
 return null;
};
async function fetchFeed(feed){
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),10000);
 try{
  const res=await fetch(feed.url,{signal:ac.signal,headers:{accept:'application/rss+xml,application/xml;q=0.9','user-agent':'MatchAppNewsBot/1.2 (+https://matchapp.tv/)'}});
  if(!res.ok)throw Error('HTTP '+res.status);
  const xml=await res.text(),blocks=xml.match(/<item\b[\s\S]*?<\/item>/gi)||[];
  const now=Date.now();
  const items=blocks.map(block=>{
   const title=tag(block,'title'),url=tag(block,'link');
   const d=new Date(tag(block,'pubDate')||tag(block,'published'));
   if(!allowed(url)||title.length<16||title.length>220||!Number.isFinite(d.valueOf())||
      d.valueOf()>now+3600000||now-d.valueOf()>72*3600000)return null;
   if(/\b(rumou?r|allegedly|speculation|unconfirmed)\b/i.test(title))return null;
   const id=crypto.createHash('sha256').update(url).digest('hex').slice(0,8);
   return {id,title,url,source:'BBC Sport',source_domain:new URL(url).hostname.replace(/^www\./,''),
    source_home:'https://www.bbc.com/sport',country:'GLOBAL',category:'sports',
    sport:feed.sport,event_type:feed.sport,published_at:d.toISOString(),image:media(block)};
  }).filter(Boolean);
  console.log('[sports] '+feed.sport+': '+items.length+' verified fresh RSS items');
  return items;
 }catch(e){console.warn('[sports] '+feed.sport+': '+e.message);return[]}
 finally{clearTimeout(timer)}
}
(async()=>{
 const parts=await Promise.all(FEEDS.map(fetchFeed)),unique=new Map(),titles=new Set();
 for(const i of parts.flat()){
  const key=i.title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  if(unique.has(i.id)||titles.has(key))continue;
  unique.set(i.id,i);titles.add(key);
 }
 const items=[...unique.values()].sort((a,b)=>b.published_at.localeCompare(a.published_at)).slice(0,12);
 // Keep the previously committed snapshot intact rather than wiping sports
 // when a publisher feed times out or has no qualifying recent headlines.
 if(items.length<3)throw Error('Only '+items.length+' fresh BBC Sport items; existing committed news remains intact');
 const output={updated_at:new Date().toISOString(),source_policy:'BBC Sport attributed RSS headlines; direct original links; RSS media only',items};
 fs.mkdirSync(path.dirname(OUTPUT),{recursive:true});
 fs.writeFileSync(OUTPUT,JSON.stringify(output,null,2)+'\n');
 console.log(JSON.stringify({ok:true,sports:items.length,updated_at:output.updated_at,sources:['BBC Sport']}));
})().catch(e=>{console.error('[sports] '+(e.stack||e.message));process.exitCode=1});
