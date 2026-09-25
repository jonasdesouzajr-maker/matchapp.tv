'use strict';
/* Feed owners publicly authorize headline-plus-canonical-link syndication:
 * The Conversation (CC BY-ND republishing terms) and SportBusy (partner feed).
 * Copy no article text, third-party photos, advertisements or betting guides.
 * Only these exact source/feed pairs can generate fallback news records. */
const crypto=require('node:crypto');
const FEEDS=Object.freeze([
 {url:'https://theconversation.com/topics/sport-20624/articles.atom',domain:'theconversation.com',source:'The Conversation',category:'sport'},
 {url:'https://www.sportbusy.com/feed.xml',domain:'sportbusy.com',source:'SportBusy',category:'sports'}
]);
const GAMBLING=/(?:betting|gambling|casino|sportsbook|wager|moneyline|parlay|bookmaker|bet slip|bonus bet|odds|picks for betting|predictions?\s+to\s+bet)/i;
const SUBJECT=/(?:football|soccer|basketball|nba|wnba|tennis|formula\s*1|f1\b|motor|olympi|hockey|rugby|cricket|volleyball|sport|baseball|futebol|esporte|tenis|tênis|atl[eé]ti)/i;
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function clean(v){
 return String(v||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi,'$1')
  .replace(/<[^>]*>/g,' ').replace(/&#x([a-f0-9]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)))
  .replace(/&#([0-9]+);/g,(_,n)=>String.fromCodePoint(parseInt(n,10)))
  .replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&apos;/gi,"'")
  .replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/\s+/g,' ').trim();
}
function tag(s,name){
 const m=String(s||'').match(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+name+'>','i'));
 return m?clean(m[1]):'';
}
function href(block,isAtom){
 if(!isAtom)return tag(block,'link');
 const nodes=String(block||'').match(/<link\b[^>]*>/gi)||[];
 const matches=nodes.filter(node=>/rel=["']alternate["']/i.test(node));
 for(const node of [...matches,...nodes]){
  const m=node.match(/\bhref=["']([^"']+)["']/i);if(m)return clean(m[1]);
 }
 return '';
}
function allowed(url,domain){
 try{
  const u=new URL(url),h=u.hostname.toLowerCase().replace(/^www\./,'');
  return u.protocol==='https:'&&(h===domain||h.endsWith('.'+domain))&&
   u.pathname!=='/'&&!GAMBLING.test(u.pathname);
 }catch(_){return false}
}
function parseFeed(xml,feed,now=Date.now()){
 if(!FEEDS.some(f=>f.url===feed?.url&&f.source===feed?.source&&f.domain===feed?.domain))return [];
 const atom=/<feed\b/i.test(String(xml||'')),name=atom?'entry':'item';
 const blocks=String(xml||'').match(new RegExp('<'+name+'(?:\\s[^>]*)?>[\\s\\S]*?<\\/'+name+'>','gi'))||[];
 const out=new Map();
 for(const b of blocks){
  const title=tag(b,'title'),url=href(b,atom);
  const date=new Date(tag(b,atom?'published':'pubDate')||tag(b,'updated')||'');
  if(!allowed(url,feed.domain)||title.length<16||title.length>220||
   !Number.isFinite(date.valueOf())||date.valueOf()>now+3600000||
   now-date.valueOf()>96*3600000||GAMBLING.test(title+' '+url))continue;
  // The Conversation's topic/atom is already sports-scoped; SportBusy's
  // general feed needs an explicit sports subject to omit unrelated ads.
  if(feed.category!=='sport'&&!SUBJECT.test(title+' '+new URL(url).pathname))continue;
  const id=crypto.createHash('sha256').update(url).digest('hex').slice(0,8);
  const sport=/formula\s*1|\bf1\b|grand prix/i.test(title)?'Formula 1':
   /football|soccer|futebol/i.test(title)?'Football':
   /basketball|\bnba\b|\bwnba\b/i.test(title)?'Basketball':
   /tennis|tenis|tênis/i.test(title)?'Tennis':'Sports';
  out.set(id,{id,title,url,source:feed.source,
   source_domain:new URL(url).hostname.replace(/^www\./,''),
   source_home:'https://'+feed.domain,country:'GLOBAL',
   category:'sports',sport,event_type:sport,published_at:date.toISOString(),
   timestamp_kind:'published',discovery_source:'Authorized publisher RSS/Atom',image:null});
 }
 return [...out.values()].sort((a,b)=>b.published_at.localeCompare(a.published_at)).slice(0,8);
}
async function collect(fetchFn=fetch){
 const parts=await Promise.all(FEEDS.map(async feed=>{
  const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),7500);
  try{
   const res=await fetchFn(feed.url,{signal:ac.signal,headers:{
    accept:'application/atom+xml,application/rss+xml,application/xml;q=0.9',
    'user-agent':'MatchAppSportsDiscovery/1.0 (+https://matchapp.tv/)'
   }});
   if(!res.ok)throw Error('HTTP '+res.status);
   const items=parseFeed(await res.text(),feed);
   console.log('[sports] '+feed.source+': '+items.length+' licensed, directly attributed current links');
   return items;
  }catch(e){
   console.warn('[sports] '+feed.source+' optional feed unavailable: '+String(e?.message||e));
   return [];
  }finally{clearTimeout(timer)}
 }));
 const seen=new Set(),out=[];
 for(const row of parts.flat().sort((a,b)=>b.published_at.localeCompare(a.published_at))){
  const key=norm(row.title);
  if(!key||seen.has(key))continue;
  seen.add(key);out.push(row);
 }
 return out.slice(0,12);
}
module.exports={collect,parseFeed,FEEDS,allowed};
