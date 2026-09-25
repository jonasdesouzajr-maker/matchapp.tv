#!/usr/bin/env node
'use strict';
// Read-only gate. The dedicated editorial generators remain the only writers.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
function requireCondition(ok,detail){if(!ok)throw Error('[content-rotation] '+detail);}
const home=read('index.html');
const marquee=home.match(/<div class="marquee-track" id="marquee-track">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/)?.[1]||'';
const posters=[...marquee.matchAll(/<img[^>]*data-title="([^"]+)"[^>]*src="([^"]+)"/g)]
  .map(m=>({title:m[1],poster:m[2]}));
requireCondition(posters.length===20,'Home Top Titles rail must contain 10 editorial titles plus the identical scroll-loop duplicate');
const a=posters.slice(0,10),b=posters.slice(10);
requireCondition(new Set(a.map(x=>x.title)).size===10,'Home Top Titles must have exactly 10 unique identities');
requireCondition(a.every((p,i)=>p.title===b[i]?.title&&p.poster===b[i]?.poster),'Home Top Titles scroll-loop duplication is out of sync');
requireCondition(a.every(p=>/^https:\/\/image\.tmdb\.org\/t\/p\/(?:w\d+|original)\/[A-Za-z0-9_.-]+/.test(p.poster)),
  'Home Top Titles must retain verified TMDB artwork, never placeholder graphics');
const events=json('tools/global-events.json');
requireCondition(Array.isArray(events)&&events.length>0,'Verified global events inventory is empty');
requireCondition(new Set(events.map(e=>e.slug)).size===events.length,'Duplicated global event slugs');
for(const e of events){
  requireCondition(e.title&&e.slug&&e.official&&e.source&&e.poster,'Global event lacks essential official identity or artwork: '+e.slug);
  requireCondition(Number.isFinite(Date.parse(e.start))&&Number.isFinite(Date.parse(e.end))&&Date.parse(e.end)>=Date.parse(e.start),
    'Global event has invalid dates: '+e.slug);
}
const runtime=read('global-events.js');
requireCondition(/RETAIN_ENDED_DAYS=3/.test(runtime)&&/retainedEnded/.test(runtime),
  'Global Events must retain ended cards at the end of Home for 72 hours');
const dayRuntime=read('international-day.js');
requireCondition(/RETAIN_ENDED_DAYS=3/.test(dayRuntime)&&/ended\.forEach/.test(dayRuntime),
  'International Day cards must remain three days after ending');
const news=json('news/data.json');
requireCondition(Array.isArray(news.items)&&news.items.length>=5,'Do not deploy an empty/failed hourly news feed');
requireCondition(news.items.every(n=>n.title&&n.source&&n.url&&/^https:\/\//.test(n.url)),
  'News items must identify publisher and original HTTPS source');
const current=json('awareness/current.json').campaign;
const spotlight=home.match(/<!-- AWARENESS-SPOTLIGHT:START -->([\s\S]*?)<!-- AWARENESS-SPOTLIGHT:END -->/)?.[1]||'';
if(current){
  requireCondition(Number.isFinite(Date.parse(current.startDate))&&Date.parse(current.endExclusive)>Date.parse(current.startDate),
    'Awareness campaign dates invalid');
  requireCondition(spotlight.includes('data-awareness-start="'+current.startDate+'"')&&spotlight.includes('data-awareness-end="'+current.endExclusive+'"')&&
    spotlight.includes(current.pageUrl),'Home awareness spotlight differs from committed campaign state');
}else{
  requireCondition(!spotlight.includes('id="awareness-spotlight"'),'Expired awareness campaign remains in source homepage');
}
const sitemap=read('sitemap.xml');
requireCondition(sitemap.includes('https://matchapp.tv/news/')&&sitemap.includes('https://matchapp.tv/events-archive.html'),
  'Sitemap missing existing news/events hubs');
console.log(JSON.stringify({ok:true,topTitles:a.length,verifiedEvents:events.length,news:news.items.length,awareness:current?.id||null}));
