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
  const watchable=candidates.filter(t=>streamingChoice(t)||inCinemaWindow(t));
  const pool=watchable.length?watchable:candidates;
  const strong=pool.filter(t=>t.previewUrl&&(t.voteAverage==null||Number(t.voteAverage)>=5));
  return (strong.length?strong:pool)[0];
}
function buildPick(item,weekKey){
  const stream=streamingChoice(item),cinema=inCinemaWindow(item)&&!stream;
  const trailer=String(item.previewUrl||'').match(/[?&]v=([A-Za-z0-9_-]{6,32})/)?.[1]||'';
  const sourceUrl=item.availability?.source_page_url||`https://www.themoviedb.org/${item.kind==='movie'?'movie':'tv'}/${item.tmdbId}`;
  const releaseDate=firstCinemaDate(item.availability)||'';
  const cast=Array.isArray(item.cast)?item.cast.slice(0,10):[];
  const genres=Array.isArray(item.genre)?item.genre.slice(0,8):[];
  return {
    auto:true,weekKey,selectedAt:new Date().toISOString(),sourceRank:Number(item.sourceRank)||null,
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
  const meta=`This week’s MatchApp Ai choice is ${pick.title} (${pick.year}). Get verified title facts, cast and current where-to-watch guidance.`;
  const refreshed=new Date(pick.selectedAt||Date.now()).toISOString().slice(0,10);
  const genres=pick.genres.length?pick.genres.join(' and '):'movie';
  const castText=pick.cast.length?pick.cast.slice(0,6).join(', '):'Cast details are available through MatchApp Ai';
  const rankText=pick.sourceRank?`It appeared at #${pick.sourceRank} in the current movie and TV trend feed when this weekly choice was refreshed.`:'It appeared in the current verified movie and TV trend feed when this weekly choice was refreshed.';
  const viewingText=pick.inCinemas
    ? `Current verified metadata flags ${pick.title} for a theatrical window, with the earliest tracked cinema release date of ${pick.releaseDate||'this week'}. Exact cinemas and showtimes depend on location and can change during the day.`
    : pick.streaming?.name
      ? `Current verified metadata lists ${pick.streaming.name} as a streaming option in ${pick.streaming.region||'a supported region'}. Provider availability varies by country and can change.`
      : `Streaming, rent, buy and cinema availability can differ by country. MatchApp Ai checks region-aware viewing data instead of promising a provider that is not verified for the visitor.`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(pick.title)} — Top MatchApp Ai Choice This Week</title><meta name="description" content="${esc(meta)}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"><link rel="canonical" href="https://matchapp.tv/featured/this-week/"><link rel="icon" href="/assets/brand/matchapp-favicon-32.png" type="image/png"><meta property="og:type" content="video.movie"><meta property="og:site_name" content="MatchApp Ai"><meta property="og:title" content="${esc(pick.title)} — MatchApp Ai choice this week"><meta property="og:description" content="${esc(meta)}"><meta property="og:url" content="https://matchapp.tv/featured/this-week/"><meta property="og:image" content="${esc(pick.poster)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(pick.title)} — MatchApp Ai choice this week"><meta name="twitter:description" content="${esc(meta)}"><meta name="twitter:image" content="${esc(pick.poster)}"><script type="application/ld+json">${JSON.stringify(clean).replace(/</g,'\\u003c')}</script><link rel="stylesheet" href="/brand.css?v=192"><style>body{margin:0;background:#130734;color:#f7f3ff;font:16px/1.6 Inter,system-ui,sans-serif}header,main,footer{width:min(980px,92%);margin:auto}header{padding:22px 0}a{color:#f4d87e}.hero{display:grid;grid-template-columns:minmax(180px,300px) 1fr;gap:28px;padding:clamp(18px,3vw,30px);border:1px solid rgba(229,193,88,.25);border-radius:26px;background:rgba(42,26,64,.84)}.hero img{display:block;width:100%;height:auto;object-fit:contain;border-radius:18px}.eyebrow{color:#f4d87e;font-weight:900}.facts{display:flex;flex-wrap:wrap;gap:8px}.facts span{padding:6px 10px;border-radius:999px;background:rgba(229,193,88,.1);border:1px solid rgba(229,193,88,.2)}.button{display:inline-block;padding:11px 16px;border-radius:999px;background:#E5C158;color:#211426;font-weight:900;text-decoration:none}.guide{max-width:880px;margin:28px auto 0;padding:4px 4px 10px}.guide h2{color:#f4d87e;margin:26px 0 8px;font-size:clamp(1.25rem,3vw,1.7rem)}.guide p{color:#e4dbea;max-width:78ch}footer{padding:36px 0}@media(max-width:700px){.hero{grid-template-columns:1fr}.hero img{max-width:300px;margin:auto}}</style></head><body><header><a href="/">MatchApp Ai</a></header><main><article class="hero"><img src="${esc(pick.poster)}" alt="${esc(pick.title)} (${pick.year}) official poster" width="780" height="1170" fetchpriority="high" decoding="async"><div><p class="eyebrow">Top MatchApp Ai choice this week</p><h1>${esc(pick.title)} (${pick.year})</h1><p>${esc(pick.synopsis)}</p><div class="facts"><span>${pick.year}</span>${pick.country?`<span>${esc(pick.country)}</span>`:''}${pick.runtime?`<span>${pick.runtime} min</span>`:''}${pick.rating?`<span>${esc(pick.rating)}</span>`:''}${pick.genres.slice(0,4).map(g=>`<span>${esc(g)}</span>`).join('')}</div><p><strong>Cast:</strong> ${esc(castText)}</p><p><a class="button" href="${esc(discover)}">Where to watch ${esc(pick.title)}</a></p><p><a href="${esc(pick.sourceUrl)}" target="_blank" rel="noopener noreferrer">Verified title source: TMDB</a></p></div></article><section class="guide"><h2>Why ${esc(pick.title)} is this week’s choice</h2><p>MatchApp Ai selects the weekly spotlight from its refreshed entertainment trend data, then requires a verified poster, synopsis and a usable viewing path before a title can be promoted here. ${esc(rankText)} The selection stays stable for the week unless the viewing path becomes unusable, so the feature is current without changing unpredictably every time the page loads.</p><h2>What to know before watching</h2><p>${esc(pick.title)} is a ${esc(String(pick.year))} ${esc(genres)} title from ${esc(pick.country||'its listed production region')}. ${pick.runtime?`The verified runtime is ${pick.runtime} minutes. `:''}${pick.rating?`The current content rating is ${esc(pick.rating)}. `:''}The featured cast includes ${esc(castText)}. The synopsis and title facts above come from the same verified metadata used by MatchApp Ai’s matching and discovery experience rather than from an invented description.</p><h2>Where to watch this week</h2><p>${esc(viewingText)} Use the “Where to watch” button to ask MatchApp Ai for the current options in your country, including streaming, rental, purchase or nearby cinema information when available.</p><h2>How this page stays current</h2><p>This page was refreshed on ${esc(refreshed)}. MatchApp Ai rechecks current trend and availability metadata every day, rebuilds the SEO page and sitemap, and keeps the weekly selection tied to verified source data. Availability is a changing signal, so MatchApp Ai does not treat yesterday’s provider list as a permanent promise. You can also browse the <a href="/trending/this-week/">latest titles trending right now</a> or return to the <a href="/">MatchApp Ai home page</a> for mood-based matching.</p></section></main><footer><a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></footer></body></html>`;
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
  if(old?.weekKey===weekKey&&old?.title&&(old?.streaming?.url||old?.inCinemas)&&!process.env.FORCE_WEEKLY_PICK){
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
