'use strict';
/* Source restrictions: The Conversation's known sport-specific French
 * topic feeds plus its official Australian edition's public Atom headlines,
 * filtered strictly to clearly sports-specific stories and canonical links. Do not copy full article text, third-party
 * images, ads, publisher logos or claim endorsement. Its attribution rules
 * are documented publicly. A separate sports site's public Terms expressly
 * prohibit commercial material reuse; omit it absent written permission.
 * These records are independent editorial link cards, not republication. */
const crypto=require('node:crypto');
const FEEDS=Object.freeze([
 {url:'https://theconversation.com/topics/sport-20624/articles.atom',domain:'theconversation.com',source:'The Conversation',category:'sport'},
 {url:'https://theconversation.com/topics/athletes-84090/articles.atom',domain:'theconversation.com',source:'The Conversation',category:'sport'},
 {url:'https://theconversation.com/topics/jeux-olympiques-jo-153405/articles.atom',domain:'theconversation.com',source:'The Conversation',category:'sport'},
 // Australian general feed is independently verified as a public Atom source.
 // It must pass explicit sport words, unlike the three sport-scoped feeds.
 {url:'https://theconversation.com/au/articles.atom',domain:'theconversation.com',source:'The Conversation',category:'general'},
 // U.S. general edition: admit only explicitly sports-specific headlines.
 {url:'https://theconversation.com/us/articles.atom',domain:'theconversation.com',source:'The Conversation',category:'general'}
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
 feed=FEEDS.find(f=>f.url===feed?.url&&f.source===feed?.source&&f.domain===feed?.domain);
 if(!feed)return [];
 const atom=/<feed\b/i.test(String(xml||'')),name=atom?'entry':'item';
 const blocks=String(xml||'').match(new RegExp('<'+name+'(?:\\s[^>]*)?>[\\s\\S]*?<\\/'+name+'>','gi'))||[];
 const out=new Map();
 for(const b of blocks){
  const title=tag(b,'title'),url=href(b,atom);
  const date=new Date(tag(b,atom?'published':'pubDate')||tag(b,'updated')||'');
  if(!allowed(url,feed.domain)||title.length<16||title.length>220||
   !Number.isFinite(date.valueOf())||date.valueOf()>now+3600000||
   now-date.valueOf()>96*3600000||GAMBLING.test(title+' '+url))continue;
  // Only the three exact sport-scoped topics bypass the lexical guard.
  // The Australian general feed never admits unrelated general news.
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
async function collectReport(fetchFn=fetch,now=Date.now()){
 const checks=[];
 const parts=await Promise.all(FEEDS.map(async feed=>{
  const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),7500);
  try{
   let destination=feed.url,res;
   for(let hop=0;hop<=3;hop++){
    res=await fetchFn(destination,{signal:ac.signal,redirect:'manual',headers:{
    accept:'application/atom+xml,application/rss+xml,application/xml;q=0.9',
    'user-agent':'MatchAppSportsDiscovery/1.0 (+https://matchapp.tv/)'
    }});
    if(![301,302,303,307,308].includes(res.status))break;
    try{
     const location=res.headers.get('location');
     const next=location&&new URL(location,destination).href;
     if(hop===3||!FEEDS.some(f=>f.url===next))throw Error('Unapproved feed redirect');
     destination=next;
    }finally{if(res.body)await res.body.cancel();}
   }
   if(!res.ok){
    if(res.body)await res.body.cancel();
    throw Error('HTTP '+res.status);
   }
   // An HTML error page with HTTP 200 is not a successful empty feed.
   const xml=await res.text();
   if(!/^\s*(?:<\?xml[^?]*\?>\s*)?<(feed|rss)\b[^>]*>[\s\S]*<\/\1>\s*$/i.test(xml))throw Error('Invalid RSS/Atom response');
   // Topic privileges belong to the final approved feed after redirects.
   const finalFeed=FEEDS.find(f=>f.url===(res.url||destination));
   if(!finalFeed)throw Error('Unapproved feed redirect');
   const items=parseFeed(xml,finalFeed,now);
   checks.push({url:feed.url,ok:true,items:items.length});
   console.log('[sports] '+feed.source+' '+feed.url.split('/').slice(-2)[0]+': '+items.length+' attributed current original-source links');
   return items;
  }catch(e){
   checks.push({url:feed.url,ok:false,error:String(e?.message||e)});
   console.warn('[sports] '+feed.source+' optional feed unavailable: '+String(e?.message||e));
   return [];
  }finally{clearTimeout(timer);ac.abort();}
 }));
 const seen=new Set(),out=[];
 for(const row of parts.flat().sort((a,b)=>b.published_at.localeCompare(a.published_at))){
  const key=norm(row.title);
  if(!key||seen.has(key))continue;
  seen.add(key);out.push(row);
 }
 return {items:out.slice(0,12),checks:checks.sort((a,b)=>a.url.localeCompare(b.url))};
}
async function collect(fetchFn=fetch){return (await collectReport(fetchFn)).items;}
module.exports={collect,collectReport,parseFeed,FEEDS,allowed};
