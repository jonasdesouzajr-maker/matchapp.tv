import fs from 'node:fs';
import billboardMusic from './billboard-music.js';
import spotifyMusic from './spotify-music-videos.js';
import path from 'node:path';
import {fetchLiveTrending,primaryPlatform,platformNames,countryName} from './live-editorial-data.mjs';

const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uniq=a=>[...new Set(a.filter(Boolean))];
const isoDay=d=>new Date(d).toISOString().slice(0,10);

function mondayOfCurrentWeek(){
  const d=new Date(), day=(d.getUTCDay()+6)%7;
  d.setUTCDate(d.getUTCDate()-day);
  return d.toISOString().slice(0,10);
}
function readMusicVideos(){
  const p=path.join(ROOT,'data/music-video-releases.json');
  if(!fs.existsSync(p))return [];
  try{
    const data=JSON.parse(fs.readFileSync(p,'utf8'));
    const featured=new Set(Array.isArray(data.featuredIds)?data.featuredIds:[]);
    return (Array.isArray(data.items)?data.items:[])
      .filter(x=>x?.artist&&x?.title&&x?.poster&&Number.isFinite(Date.parse(x.publishedAt||''))&&Number.isSafeInteger(Number(x.viewCount))&&Number(x.viewCount)>=0&&/^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/.test(String(x.url||'')))
      .sort((a,b)=>(featured.has(b.id)-featured.has(a.id))||(Date.parse(b.publishedAt||0)-Date.parse(a.publishedAt||0)))
      .slice(0,4)
      .map((x,i)=>{
        const y=Number(String(x.publishedAt||'').slice(0,4))||new Date().getUTCFullYear();
        const title=`${x.artist} — ${x.title}`;
        const longTail=[
          `${x.artist} ${x.title} official music video YouTube`,
          `where to watch ${x.artist} ${x.title} music video`,
          `new ${x.artist} music video ${y}`
        ];
        return {
          title,kind:'music-video',year:y,origin:'',platform:'YouTube',tmdbId:null,
          poster:x.poster,url:x.url,artist:x.artist,songTitle:x.title,publishedAt:x.publishedAt||'',viewCount:Number(x.viewCount),viewCountCheckedAt:x.viewCountCheckedAt||'',channel:x.channel||'',channelUrl:x.channelUrl||'',
          description:x.seo?.description||`Official ${x.artist} music video for “${x.title}”, released on YouTube ${String(x.publishedAt||'').slice(0,10)} with ${Number(x.viewCount).toLocaleString('en-US')} verified views at the latest daily check.`,
          genre:['Music video'],inLanguage:'en',
          keywords:uniq([x.artist,x.title,'official music video','latest official music videos','YouTube music video',`${y} music releases`,`${x.artist} new music video`,...(x.keywords||[]),...(x.seo?.keywords||[])]),
          longTailKeywords:uniq([...longTail,`${x.artist} ${x.title} release date`,`${x.artist} ${x.title} YouTube views`]),
          seo:x.seo||{title:`${x.artist} – ${x.title} official music video | MatchApp Ai`,description:`Watch and discover the official ${x.artist} “${x.title}” music video, release date and latest verified YouTube views.`,keywords:uniq([...(x.keywords||[]),...longTail]),canonicalQuery:title},
          source:'verified-official-music-video',sourceRank:i+1
        };
      });
  }catch{return [];}
}
function rowToTitle(row){
  const genres=Array.isArray(row.genres)?row.genres.filter(Boolean):[];
  const cast=(Array.isArray(row.cast_members)?row.cast_members:[]).map(x=>x?.name).filter(Boolean).slice(0,4);
  const platforms=platformNames(row);
  const platform=primaryPlatform(row);
  const originCode=Array.isArray(row.origin_countries)?row.origin_countries[0]||'':'';
  const overview=String(row.overview||'').trim();
  const kindLabel=row.media_kind==='movie'?'movie':'series';
  const short=uniq([
    row.title,`${row.title} ${row.year||''}`.trim(),`where to watch ${row.title}`,
    ...genres.slice(0,3).map(g=>`${g} ${kindLabel}`),
    ...platforms.slice(0,2).map(p=>`${p} trending ${kindLabel}`),
    ...cast.slice(0,2)
  ]);
  const longTail=uniq([
    `where to watch ${row.title} ${row.year||''}`.trim(),
    `${row.title} streaming in Brazil and United States`,
    `${row.title} cast synopsis trailer and where to watch`,
    `what ${genres[0]||kindLabel} to watch this week`
  ]);
  return {
    title:row.title,kind:row.media_kind,year:row.year||'',origin:originCode,originName:countryName(originCode),
    platform,platforms,tmdbId:String(row.tmdb_id),poster:row.poster_large_url||row.poster_url||row.poster_original_url||'',
    description:overview,genre:genres,inLanguage:row.original_language||'en',cast,
    runtimeMinutes:Number(row.runtime_minutes)||null,contentRating:row.content_rating||'',voteAverage:row.vote_average==null?null:Number(row.vote_average),
    previewUrl:row.preview_url||'',availability:row.availability||{},sourceRank:Number(row.trending_rank),
    keywords:short,longTailKeywords:longTail,
    seo:{title:`Where to watch ${row.title} (${row.year||'current'}) | MatchApp Ai`,description:overview.slice(0,158)||`Discover ${row.title}, current viewing options and title details with MatchApp Ai.`,keywords:uniq([...short,...longTail]),canonicalQuery:row.title}
  };
}
function interleave(titles,videos){
  if(!videos.length)return titles;
  const base=titles.slice(0,Math.max(0,20-videos.length));
  const out=[],slots=new Set([3,7,11,15].slice(0,videos.length));
  let ti=0,vi=0;
  for(let pos=0;out.length<20&&(ti<base.length||vi<videos.length);pos++){
    if(slots.has(pos)&&vi<videos.length)out.push(videos[vi++]);
    else if(ti<base.length)out.push(base[ti++]);
    else if(vi<videos.length)out.push(videos[vi++]);
  }
  return out.slice(0,20);
}
function jsonLd(data){
  const list=data.titles.map((t,i)=>{
    let item;
    if(t.kind==='music-video'){
      const videoId=String(t.url||'').match(/[?&]v=([\w-]{11})/)?.[1]||'';
      item={'@type':'VideoObject',name:t.title,description:t.description,thumbnailUrl:`https://matchapp.tv${t.poster}`,url:t.url};
      if(videoId)item.embedUrl='https://www.youtube.com/embed/'+videoId;
      if(t.publishedAt)item.uploadDate=t.publishedAt;
      if(t.channel)item.creator={'@type':'MusicGroup',name:t.channel,...(t.channelUrl?{url:t.channelUrl}:{})};
      if(Number.isSafeInteger(Number(t.viewCount)))item.interactionStatistic={'@type':'InteractionCounter',interactionType:{'@type':'WatchAction'},userInteractionCount:Number(t.viewCount)};
      if(t.keywords?.length)item.keywords=t.keywords.join(', ');
    }else{
      item={'@type':t.kind==='movie'?'Movie':'TVSeries',name:t.title,description:t.description,image:t.poster};
      if(t.year)item.datePublished=String(t.year);
      if(t.genre?.length)item.genre=t.genre;
      if(t.originName)item.countryOfOrigin={'@type':'Country',name:t.originName};
    }
    return {'@type':'ListItem',position:i+1,item};
  });
  return {'@context':'https://schema.org','@graph':[
    {'@type':'WebPage','@id':'https://matchapp.tv/trending/this-week/#page',url:'https://matchapp.tv/trending/this-week/',name:'Movies, TV and music videos trending now | MatchApp Ai',description:'Fresh entertainment discovery from current movie and TV trend data plus verified official music-video releases.',dateModified:data.updated,isPartOf:{'@type':'WebSite',name:'MatchApp Ai',url:'https://matchapp.tv/'}},
    {'@type':'ItemList','@id':'https://matchapp.tv/trending/this-week/#list',name:'Latest titles trending right now',numberOfItems:data.titles.length,itemListElement:list}
  ]};
}
async function main(){
  const live=(await fetchLiveTrending(20)).map(rowToTitle);
  const music=readMusicVideos();
  const titles=interleave(live,music);
  if(titles.filter(x=>x.kind!=='music-video').length<12)throw new Error('Not enough verified live movie/TV titles to publish Top Titles.');

  const updated=new Date().toISOString();
  const data={
    schemaVersion:2,weekOf:mondayOfCurrentWeek(),updated,label:'Latest titles trending right now',
    sourceNote:'Movie and TV positions refresh from MatchApp’s current TMDB daily trend metadata; verified official music-video releases from monitored top-artist channels refresh daily with release dates, YouTube view counts, direct links, keywords and structured metadata. Availability can vary by country.',
    titles
  };
  fs.writeFileSync(path.join(ROOT,'data/trending-week.json'),JSON.stringify(data,null,2)+'\n');

  const musicInventory=JSON.parse(fs.readFileSync(path.join(ROOT,'data/music-video-releases.json'),'utf8'));
  const musicKeywords=[...billboardMusic.chartKeywords(musicInventory.billboard),...spotifyMusic.spotifyKeywords(musicInventory.spotifyVideos)];
  const short=uniq([...musicKeywords,...titles.flatMap(t=>t.keywords||[])]).slice(0,80);
  const longTail=uniq([...musicKeywords,...titles.flatMap(t=>t.longTailKeywords||[])]).slice(0,100);
  fs.writeFileSync(path.join(ROOT,'data/trending-keywords.json'),JSON.stringify({updated,source:'current MatchApp entertainment trend feed',short,longTail},null,2)+'\n');

  const headDescription='Discover movies, TV, Billboard Hot 100 songs and official YouTube and Spotify music videos with dated sources and where-to-watch links from MatchApp Ai.';
  const cards=titles.map((t,i)=>`<article class="trend-card"><a href="/discover.html?q=${encodeURIComponent(t.seo?.canonicalQuery||t.title)}"><img src="${esc(t.poster)}" alt="${esc(t.title)}" width="260" height="390" loading="${i<4?'eager':'lazy'}" decoding="async"></a><div><p class="rank">#${i+1} · ${esc(t.kind==='music-video'?'music video':t.kind)}${t.platform?' · '+esc(t.platform):''}</p><h2><a href="/discover.html?q=${encodeURIComponent(t.seo?.canonicalQuery||t.title)}">${esc(t.title)}</a></h2><p>${esc(t.description)}</p><p class="meta">${esc([t.year,t.originName||t.origin,(t.genre||[]).slice(0,3).join(' · ')].filter(Boolean).join(' · '))}</p>${t.kind==='music-video'&&t.url?`<p><a href="${esc(t.url)}" rel="noopener noreferrer" target="_blank">Official YouTube video</a></p>`:''}</div></article>`).join('\n');
  // Dated US editorial snapshot: automatically expires during the normal daily refresh.
  const bookSpotlight=Date.now()<Date.parse('2026-10-22T00:00:00Z')?"<section id=\"book-to-screen-trends\" class=\"reader-spotlight\" aria-labelledby=\"book-screen-heading\"><h2 id=\"book-screen-heading\">From page to screen · Reader trends</h2><p><strong>US Google Trends, October 7, 2026:</strong> searches around book adaptations featured <em>East of Eden</em>, <em>Verity</em> and <em>The Love Hypothesis</em>. For romance and yearning, audiences searched for <em>Heated Rivalry</em> and <em>The Notebook</em>; <em>Off Campus</em> drew book-related questions.</p><p>Explore the books, screen versions and their differences. A trending search does not mean a screen adaptation has been released or is available in your country.</p><p><a class=\"gold-btn\" href=\"/discover.html?q=Compare%20the%20book%20and%20screen%20versions%20of%20East%20of%20Eden%2C%20Verity%20and%20The%20Love%20Hypothesis.%20Which%20adaptations%20are%20actually%20released%20and%20available%20in%20my%20country%3F\">Explore book adaptations with Ask AI</a> <a href=\"/discover.html?q=Recommend%20romance%20movies%20and%20shows%20with%20yearning%20similar%20to%20The%20Notebook%20and%20Heated%20Rivalry%2C%20available%20in%20my%20country\">Find yearning romances</a></p><p class=\"meta\">Source: Google Trends daily newsletter · United States · October 7, 2026</p></section>":'';
  const ld=JSON.stringify(jsonLd(data)).replace(/</g,'\\u003c');
  const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Trending Movies, Billboard & Spotify Music Videos | MatchApp Ai</title>
<meta name="description" content="${esc(headDescription)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<link rel="canonical" href="https://matchapp.tv/trending/this-week/">\n<link rel="icon" href="/assets/brand/matchapp-favicon-32.png" type="image/png">
<meta property="og:type" content="website"><meta property="og:site_name" content="MatchApp Ai"><meta property="og:title" content="What’s Trending Now | MatchApp Ai"><meta property="og:description" content="${esc(headDescription)}"><meta property="og:url" content="https://matchapp.tv/trending/this-week/">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="What’s Trending Now | MatchApp Ai"><meta name="twitter:description" content="${esc(headDescription)}">
<script type="application/ld+json">${ld}</script>
<link rel="stylesheet" href="/brand.css?v=192"><link rel="stylesheet" href="/billboard-music.css?v=20261006-1"><script defer src="/billboard-music.js?v=20261006-1"></script><style>body{margin:0;background:#130734;color:#f7f3ff;font:16px/1.55 Inter,system-ui,sans-serif}main,header,footer{width:min(1040px,92%);margin:auto}header{padding:22px 0}a{color:#f4d87e}.intro{max-width:780px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin:24px 0}.trend-card{display:grid;grid-template-columns:110px 1fr;gap:15px;padding:14px;border:1px solid rgba(229,193,88,.22);border-radius:20px;background:rgba(38,24,58,.82)}.trend-card img{width:110px;height:auto;aspect-ratio:2/3;object-fit:contain;border-radius:13px;background:#090612}.trend-card h2{font-size:1.08rem;margin:.2rem 0}.trend-card p{margin:.35rem 0}.rank,.meta{font-size:.78rem;color:#cfc4dc}footer{padding:34px 0}.reader-spotlight{margin:22px 0;padding:18px;border:1px solid rgba(229,193,88,.28);border-radius:20px;background:rgba(38,24,58,.82)}.reader-spotlight h2{font-size:1.2rem;margin:.1rem 0 .6rem}.reader-spotlight p{margin:.65rem 0}.reader-spotlight .gold-btn{display:inline-block;margin:4px 10px 4px 0}.reader-spotlight .meta{opacity:.8}@media(max-width:520px){.trend-card{grid-template-columns:90px 1fr}.trend-card img{width:90px}}</style></head><body>
<header><a href="/" aria-label="MatchApp Ai home">MatchApp Ai</a></header><main><h1>Latest titles trending right now</h1><p class="intro">${esc(data.sourceNote)} Updated ${esc(isoDay(updated))}. Rankings are discovery signals, not endorsements; streaming availability changes by region.</p><section class="grid">${cards}</section>${bookSpotlight}${billboardMusic.renderBillboard(musicInventory.billboard,musicInventory.items,{fold:false})}${spotifyMusic.renderSpotify(musicInventory.spotifyVideos)}<p><a href="/#trending-rail">Browse Top Titles on the MatchApp Ai home page</a> · <a href="/discover.html">Ask MatchApp Ai what fits your mood</a></p></main><footer><a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a> · <a href="/cookies.html">Cookies</a></footer></body></html>`;
  fs.mkdirSync(path.join(ROOT,'trending/this-week'),{recursive:true});
  fs.writeFileSync(path.join(ROOT,'trending/this-week/index.html'),html);
  console.log(JSON.stringify({ok:true,updated,titles:titles.length,movieTv:live.length,musicVideos:music.length,top:titles.slice(0,5).map(x=>x.title)}));
}
main().catch(err=>{console.error('[refresh-trending] '+(err?.stack||err));process.exitCode=1;});
