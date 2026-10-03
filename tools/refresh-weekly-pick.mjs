import fs from 'node:fs';
import path from 'node:path';

const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uniq=a=>[...new Set(a.filter(Boolean))];

function isoWeekKey(date=new Date()){
  const d=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()));
  const day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()+4-day);
  const y0=new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const week=Math.ceil((((d-y0)/86400000)+1)/7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2,'0')}`;
}
function current(){
  const p=path.join(ROOT,'data/weekly-pick.json');
  if(!fs.existsSync(p))return null;
  try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}
}
function firstCinemaDate(availability){
  const dates=['BR','US','GB','PT'].map(r=>availability?.[r]?.cinema_release_date).filter(Boolean).sort();
  return dates[0]||'';
}
function streamingChoice(item){
  const a=item.availability||{};
  for(const region of ['BR','US','GB','PT']){
    const names=Array.isArray(a?.[region]?.stream)?a[region].stream:[];
    if(names.length&&/^https:\/\//.test(String(a?.[region]?.link||'')))return {name:names[0],url:a[region].link,region};
  }
  return null;
}
function inCinemaWindow(item){
  const dates=['BR','US','GB','PT'].map(r=>item.availability?.[r]?.cinema_release_date).filter(Boolean).map(Date.parse).filter(Number.isFinite);
  if(!dates.length)return false;
  const now=Date.now(),span=21*86400000;
  return dates.some(d=>d>=now-span&&d<=now+span);
}
function choose(data){
  const candidates=(data.titles||[]).filter(t=>t.kind==='movie'&&t.tmdbId&&t.poster&&t.description&&t.sourceRank);
  if(!candidates.length)throw new Error('No verified current movie candidate is available for the weekly choice.');
  const strong=candidates.filter(t=>t.previewUrl&&(t.voteAverage==null||Number(t.voteAverage)>=5));
  return (strong.length?strong:candidates)[0];
}
function buildPick(item,weekKey){
  const stream=streamingChoice(item),cinema=inCinemaWindow(item)&&!stream;
  const trailer=String(item.previewUrl||'').match(/[?&]v=([A-Za-z0-9_-]{6,32})/)?.[1]||'';
  const sourceUrl=item.availability?.source_page_url||`https://www.themoviedb.org/${item.kind==='movie'?'movie':'tv'}/${item.tmdbId}`;
  const releaseDate=firstCinemaDate(item.availability)||'';
  const cast=Array.isArray(item.cast)?item.cast.slice(0,10):[];
  const genres=Array.isArray(item.genre)?item.genre.slice(0,8):[];
  return {
    auto:true,weekKey,selectedAt:new Date().toISOString(),
    title:item.title,year:Number(item.year)||new Date().getUTCFullYear(),
    country:item.originName||item.origin||'',countryCode:item.origin||'',kind:'movie',
    tmdbId:Number(item.tmdbId),imdbId:'',director:'',author:'',cast,
    runtime:Number(item.runtimeMinutes)||null,rating:item.contentRating||'',distributor:'',
    releaseDate,inCinemas:cinema,platform:stream?.name||(cinema?'Cinemas':item.platform||''),
    streaming:stream?{name:stream.name,url:stream.url,region:stream.region}:null,
    poster:item.poster,watchUrl:stream?.url||'',sourceUrl,sourceLabel:'TMDB',
    previewId:trailer,synopsis:item.description,
    cats:['movie'],moods:[],vibes:genres.map(g=>String(g).toLowerCase()),ratings:[],
    genres,keywords:uniq([item.title,`${item.title} ${item.year||''}`.trim(),`where to watch ${item.title}`,...(item.keywords||[]),...(item.longTailKeywords||[])]).slice(0,30)
  };
}
function page(pick){
  const query=`Tell me about ${pick.title} (${pick.year}) and where I can watch it in my country. Include synopsis, cast, trailer and current streaming, rent, buy or cinema options.`;
  const discover='/discover.html?q='+encodeURIComponent(query);
  const ld={'@context':'https://schema.org','@graph':[
    {'@type':'WebPage','@id':'https://matchapp.tv/featured/this-week/#page',url:'https://matchapp.tv/featured/this-week/',name:`${pick.title} — MatchApp Ai choice this week`,description:pick.synopsis,dateModified:pick.selectedAt,isPartOf:{'@type':'WebSite',name:'MatchApp Ai',url:'https://matchapp.tv/'}},
    {'@type':'Movie','@id':'https://matchapp.tv/featured/this-week/#movie',name:pick.title,datePublished:pick.releaseDate||String(pick.year),description:pick.synopsis,image:pick.poster,genre:pick.genres,actor:pick.cast.map(name=>({'@type':'Person',name})),countryOfOrigin:pick.country?{'@type':'Country',name:pick.country}:undefined,sameAs:[pick.sourceUrl]}
  ]};
  const clean=JSON.parse(JSON.stringify(ld));
  const meta=`This week’s MatchApp Ai choice is ${pick.title} (${pick.year}). Read the synopsis, cast and discover where to watch it in your country.`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(pick.title)} — Top MatchApp Ai Choice This Week</title><meta name="description" content="${esc(meta)}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"><link rel="canonical" href="https://matchapp.tv/featured/this-week/"><meta property="og:type" content="video.movie"><meta property="og:site_name" content="MatchApp Ai"><meta property="og:title" content="${esc(pick.title)} — MatchApp Ai choice this week"><meta property="og:description" content="${esc(meta)}"><meta property="og:url" content="https://matchapp.tv/featured/this-week/"><meta property="og:image" content="${esc(pick.poster)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(pick.title)} — MatchApp Ai choice this week"><meta name="twitter:description" content="${esc(meta)}"><meta name="twitter:image" content="${esc(pick.poster)}"><script type="application/ld+json">${JSON.stringify(clean).replace(/</g,'\\u003c')}</script><link rel="stylesheet" href="/brand.css?v=192"><style>body{margin:0;background:#130734;color:#f7f3ff;font:16px/1.6 Inter,system-ui,sans-serif}header,main,footer{width:min(980px,92%);margin:auto}header{padding:22px 0}a{color:#f4d87e}.hero{display:grid;grid-template-columns:minmax(180px,300px) 1fr;gap:28px;padding:clamp(18px,3vw,30px);border:1px solid rgba(229,193,88,.25);border-radius:26px;background:rgba(42,26,64,.84)}.hero img{display:block;width:100%;height:auto;object-fit:contain;border-radius:18px}.eyebrow{color:#f4d87e;font-weight:900}.facts{display:flex;flex-wrap:wrap;gap:8px}.facts span{padding:6px 10px;border-radius:999px;background:rgba(229,193,88,.1);border:1px solid rgba(229,193,88,.2)}.button{display:inline-block;padding:11px 16px;border-radius:999px;background:#E5C158;color:#211426;font-weight:900;text-decoration:none}footer{padding:36px 0}@media(max-width:700px){.hero{grid-template-columns:1fr}.hero img{max-width:300px;margin:auto}}</style></head><body><header><a href="/">MatchApp Ai</a></header><main><article class="hero"><img src="${esc(pick.poster)}" alt="${esc(pick.title)} (${pick.year}) official poster" width="780" height="1170" fetchpriority="high" decoding="async"><div><p class="eyebrow">Top MatchApp Ai choice this week</p><h1>${esc(pick.title)} (${pick.year})</h1><p>${esc(pick.synopsis)}</p><div class="facts"><span>${pick.year}</span>${pick.country?`<span>${esc(pick.country)}</span>`:''}${pick.genres.slice(0,4).map(g=>`<span>${esc(g)}</span>`).join('')}</div>${pick.cast.length?`<p><strong>Cast:</strong> ${esc(pick.cast.slice(0,6).join(', '))}</p>`:''}<p><a class="button" href="${esc(discover)}">Where to watch ${esc(pick.title)}</a></p><p><a href="${esc(pick.sourceUrl)}" target="_blank" rel="noopener noreferrer">Verified title source: TMDB</a></p></div></article></main><footer><a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></footer></body></html>`;
}
function write(pick){
  fs.mkdirSync(path.join(ROOT,'data'),{recursive:true});
  fs.writeFileSync(path.join(ROOT,'data/weekly-pick.json'),JSON.stringify(pick,null,2)+'\n');
  fs.writeFileSync(path.join(ROOT,'weekly-pick-data.js'),`/* Generated by tools/refresh-weekly-pick.mjs. */\nwindow.__MATCHAPP_WEEKLY_PICK__=${JSON.stringify(pick)};\n`);
  fs.mkdirSync(path.join(ROOT,'featured/this-week'),{recursive:true});
  fs.writeFileSync(path.join(ROOT,'featured/this-week/index.html'),page(pick));
}
function main(){
  const weekKey=isoWeekKey(),old=current();
  if(old?.weekKey===weekKey&&old?.title&&!process.env.FORCE_WEEKLY_PICK){
    write(old);
    console.log(JSON.stringify({ok:true,changed:false,weekKey,title:old.title}));
    return;
  }
  const trend=JSON.parse(fs.readFileSync(path.join(ROOT,'data/trending-week.json'),'utf8'));
  const fresh=Date.parse(trend.updated||0);
  if(!Number.isFinite(fresh)||Date.now()-fresh>48*3600000)throw new Error('Top Titles data is stale; refusing to choose a weekly title from it.');
  const pick=buildPick(choose(trend),weekKey);
  write(pick);
  console.log(JSON.stringify({ok:true,changed:true,weekKey,title:pick.title,tmdbId:pick.tmdbId}));
}
try{main();}catch(err){console.error('[refresh-weekly-pick] '+(err?.stack||err));process.exitCode=1;}
