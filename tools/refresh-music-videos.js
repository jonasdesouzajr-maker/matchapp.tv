#!/usr/bin/env node
'use strict';
// Official-channel Atom feeds only. No AI-generated identities or credits.
// Scheduled ownership: the daily Top Titles workflow runs this first; the standalone workflow is manual recovery only.
const fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const ROOT=path.join(__dirname,'..');
const billboardMusic=require('./billboard-music.js');
const spotifyMusic=require('./spotify-music-videos.js');
const OFFICIAL=/\b(?:official (?:music )?video|videoclipe oficial|video oficial)\b/i;
const EXCLUDE=/\b(?:lyric|lyrics|audio|visualizer|teaser|trailer|reaction|behind the scenes|live performance|live at|shorts)\b/i;
async function request(url,binary=false,timeoutMs=30000){
 const r=await fetch(url,{signal:AbortSignal.timeout(timeoutMs),headers:{'User-Agent':'Mozilla/5.0 (compatible; MatchAppEditorial/1.0)'}});
 if(!r.ok)throw Error('HTTP '+r.status+' '+url);
 return binary?Buffer.from(await r.arrayBuffer()):r.text();
}
function parseFeed(xml,channelId,now=Date.now()){
 const dom=new JSDOM(xml,{contentType:'text/xml'});
 try{return [...dom.window.document.querySelectorAll('entry')].flatMap(e=>{
  const value=(ns,tag)=>e.getElementsByTagNameNS(ns,tag)[0]?.textContent?.trim()||'';
  const id=value('http://www.youtube.com/xml/schemas/2015','videoId');
  const owner=value('http://www.youtube.com/xml/schemas/2015','channelId');
  const title=e.querySelector('title')?.textContent?.trim()||'';
  const publishedAt=e.querySelector('published')?.textContent||'';
  if(owner!==channelId||! /^[\w-]{11}$/.test(id)||!OFFICIAL.test(title)||EXCLUDE.test(title)||!Number.isFinite(Date.parse(publishedAt))||Date.parse(publishedAt)>now)return [];
  return [{id,rawTitle:title,publishedAt,channel:e.querySelector('author name')?.textContent||''}];
 });}finally{dom.window.close();}
}
function parseViewCount(html){
 const text=String(html||'');
 const patterns=[
  /itemprop=["']interactionCount["'][^>]*content=["'](\d+)["']/i,
  /content=["'](\d+)["'][^>]*itemprop=["']interactionCount["']/i,
  /"viewCount":"(\d+)"/
 ];
 for(const pattern of patterns){const m=text.match(pattern);if(m){const n=Number(m[1]);if(Number.isSafeInteger(n)&&n>=0)return n;}}
 return null;
}
function confirmExistingRelease(prior,row,artist,channelId,info,checkedAt){
 const author=String(info.author_url||'').replace(/\/$/,'').toLowerCase();
 if(![artist.channelUrl.toLowerCase(),'https://www.youtube.com/channel/'+channelId.toLowerCase()].includes(author)||info.title!==row.rawTitle)throw Error('Video author/title identity mismatch');
 if(!prior)return null;
 const names=String(prior.artist||'').split(/\s+(?:&|feat\.?|ft\.?)\s+/i);
 const sameDate=Date.parse(prior.publishedAt)===Date.parse(row.publishedAt)||(/^\d{4}-\d{2}-\d{2}$/.test(prior.publishedAt)&&new Date(row.publishedAt).toISOString().slice(0,10)===prior.publishedAt);
 if(prior.id!==row.id||!names.includes(artist.artist)||prior.channelUrl.toLowerCase()!==artist.channelUrl.toLowerCase()||!sameDate)throw Error('Existing release identity mismatch');
 return {...prior,publishedAt:row.publishedAt,verifiedAt:checkedAt};
}
function schema(items){return {'@context':'https://schema.org','@type':'ItemList',name:'Official music video releases on YouTube',numberOfItems:items.length,itemListElement:items.map((r,i)=>({'@type':'ListItem',position:i+1,item:{'@type':'VideoObject',name:r.artist+' — '+r.title,description:r.seo?.description||`${r.artist} official music video for ${r.title}. Released on YouTube ${r.publishedAt.slice(0,10)}.`,thumbnailUrl:['https://matchapp.tv'+r.poster],uploadDate:r.publishedAt,url:r.url,embedUrl:'https://www.youtube.com/embed/'+r.id,creator:{'@type':'MusicGroup',name:r.artist,url:r.channelUrl},keywords:(r.seo?.keywords||r.keywords).join(', '),isAccessibleForFree:true,...(r.durationSeconds?{duration:'PT'+r.durationSeconds+'S'}:{}),...(Number.isSafeInteger(Number(r.viewCount))?{interactionStatistic:{'@type':'InteractionCounter',interactionType:{'@type':'WatchAction'},userInteractionCount:Number(r.viewCount)}}:{})}}))};}
function seoForRelease(r){
 const day=String(r.publishedAt||'').slice(0,10),views=Number.isSafeInteger(Number(r.viewCount))?Number(r.viewCount):null;
 const keywords=[...new Set([...(r.keywords||[]),r.artist,r.title,`${r.artist} ${r.title} official music video`,`new ${r.artist} music video`,`${day.slice(0,4)} music video releases`,'latest official music videos','YouTube music video'].filter(Boolean))];
 return {title:`${r.artist} — ${r.title} official music video | MatchApp Ai`,description:`Official ${r.artist} music video for “${r.title}”, released on YouTube ${day}${views!==null?` with ${views.toLocaleString('en-US')} verified views at the latest daily check`:''}.`,keywords,canonicalQuery:`${r.artist} ${r.title} official music video`};
}
async function refresh(){
 const file=path.join(ROOT,'data/music-video-releases.json'),old=JSON.parse(fs.readFileSync(file,'utf8'));
 const channels=JSON.parse(fs.readFileSync(path.join(ROOT,'data/music-video-artists.json'),'utf8'));
 const byId=new Map(old.items.map(r=>[r.id,r]));let successes=0;
 // Small batches and finite requests; partial failures retain previous records.
 for(let i=0;i<channels.length;i+=3)await Promise.all(channels.slice(i,i+3).map(async artist=>{
  try{
   const page=await request(artist.channelUrl);
   const dom=new JSDOM(page);let channelId;
   try{const canonical=dom.window.document.querySelector('link[rel="canonical"]')?.href||'';channelId=canonical.match(/\/channel\/(UC[\w-]{22})/)?.[1]||dom.window.document.querySelector('meta[itemprop="channelId"]')?.content;}finally{dom.window.close();}
   if(!/^UC[\w-]{22}$/.test(channelId||''))throw Error('Official channel ID unavailable');
   const feedUrl='https://www.youtube.com/feeds/videos.xml?channel_id='+channelId;
   const rows=parseFeed(await request(feedUrl),channelId);successes++;
   for(const row of rows.filter((r,i)=>i<2||(old.billboard?.entries||[]).some(e=>billboardMusic.normalize(e.artist)===billboardMusic.normalize(artist.artist)&&billboardMusic.normalize(r.rawTitle.replace(/\s*[\[(]?(?:official (?:music )?video|videoclipe oficial|video oficial)[\])]?\s*/ig,' ').replace(new RegExp('^'+artist.artist.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*[-–—:]\\s*','i'),'').trim())===billboardMusic.normalize(e.title)))){
    const url='https://www.youtube.com/watch?v='+row.id;
    const info=JSON.parse(await request('https://www.youtube.com/oembed?url='+encodeURIComponent(url)+'&format=json'));
    const checkedAt=new Date().toISOString().slice(0,10);
    let viewCount=null;
    try{viewCount=parseViewCount(await request(url+'&hl=en'));}catch(_){/* Retain last verified count on a transient YouTube page failure. */}
    const existing=confirmExistingRelease(byId.get(row.id),row,artist,channelId,info,checkedAt);
    if(existing){byId.set(row.id,{...existing,...(viewCount!==null?{viewCount,viewCountCheckedAt:checkedAt}:{})});continue;}
    const thumbnail='https://i.ytimg.com/vi/'+row.id+'/hqdefault.jpg';let image;
    // YouTube's alternate image hosts serve the same exact video artwork.
    for(const host of ['i.ytimg.com','i9.ytimg.com','img.youtube.com']){
     try{const candidate=await request('https://'+host+'/vi/'+row.id+'/hqdefault.jpg',true);
      if(candidate.length>=3000&&candidate[0]===255&&candidate[1]===216){image=candidate;break;}
     }catch(_){/* Try the other exact-video image host within the finite budget. */}
    }
    if(!image)throw Error('Original thumbnail unavailable');
    const poster='/assets/music-videos/'+row.id+'.jpg';fs.mkdirSync(path.join(ROOT,'assets/music-videos'),{recursive:true});fs.writeFileSync(path.join(ROOT,poster),image);
    const title=row.rawTitle.replace(/\s*[\[(]?(?:official (?:music )?video|videoclipe oficial|video oficial)[\])]?\s*/ig,' ').replace(new RegExp('^'+artist.artist.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*[-–—:]\\s*','i'),'').trim();
    byId.set(row.id,{id:row.id,artist:artist.artist,title,album:'',publishedAt:row.publishedAt,director:'',cast:[],channel:info.author_name,channelUrl:artist.channelUrl,source:url,creditsSource:url,url,thumbnail,poster,verifiedAt:new Date().toISOString().slice(0,10),...(viewCount!==null?{viewCount,viewCountCheckedAt:checkedAt}:{}),keywords:[artist.artist,title,'official music video','YouTube music video',new Date(row.publishedAt).getUTCFullYear()+' music releases']});
   }
  }catch(error){console.error(artist.artist+': '+error.message);}
 }));
 // Chart hits can be older than the channel's Atom window. Recheck their
 // already verified exact IDs too; never replace them with a recent different song.
 const chartIds=[...new Set((old.billboard?.entries||[]).map(e=>e.videoId).filter(Boolean))].slice(0,10);
 for(let i=0;i<chartIds.length;i+=3)await Promise.all(chartIds.slice(i,i+3).map(async id=>{
  const r=byId.get(id);if(!r)return;
  try{
   const info=JSON.parse(await request('https://www.youtube.com/oembed?url='+encodeURIComponent(r.url)+'&format=json',false,10000));
   const title=info.title.replace(/\s*[\[(]?(?:official (?:music )?video|videoclipe oficial|video oficial)[\])]?\s*/ig,' ').replace(new RegExp('^'+r.artist.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*[-–—:]\\s*','i'),'').trim();
   if(info.author_url.toLowerCase()!==r.channelUrl.toLowerCase()||billboardMusic.normalize(title)!==billboardMusic.normalize(r.title)||!OFFICIAL.test(info.title)||EXCLUDE.test(info.title))throw Error('Chart video identity mismatch');
   const html=await request(r.url+'&hl=en',false,10000),dom=new JSDOM(html);let published;
   try{published=dom.window.document.querySelector('meta[itemprop="uploadDate"]')?.content;}finally{dom.window.close();}
   if(!published||new Date(published).toISOString().slice(0,10)!==new Date(r.publishedAt).toISOString().slice(0,10))throw Error('Chart video publication mismatch');
   const views=parseViewCount(html),checkedAt=new Date().toISOString().slice(0,10);
   byId.set(id,{...r,verifiedAt:checkedAt,...(views!==null?{viewCount:views,viewCountCheckedAt:checkedAt}:{})});
  }catch(error){console.error('[Billboard video] '+id+': '+error.message);}
 }));
 if(!successes)throw Error('All official feeds unavailable; previous inventory retained');
 const sorted=[...byId.values()].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).map(r=>{const next={...r,keywords:[...new Set((r.keywords||[]).filter(Boolean))]};return {...next,seo:seoForRelease(next)};});
 // Latest release per artist; retain older IDs for saved/deep-linked release cards.
 const seen=new Set(),featured=[];
 for(const r of sorted)if(Number.isSafeInteger(Number(r.viewCount))&&!seen.has(r.channelUrl.toLowerCase())&&featured.length<12){seen.add(r.channelUrl.toLowerCase());featured.push(r.id);}
 const billboard=await billboardMusic.refreshBillboard(old.billboard,sorted,url=>request(url,false,10000));
 const spotifyVideos=await spotifyMusic.refreshSpotifyVideos(old.spotifyVideos,url=>request(url,false,10000));
 const updated={...old,billboard,spotifyVideos,verifiedAt:new Date().toISOString().slice(0,10),items:sorted,featuredIds:featured};
 const homeFile=path.join(ROOT,'index.html'),home=fs.readFileSync(homeFile,'utf8');
 const marker=/<script\b(?=[^>]*\bid="music-video-releases-schema")[^>]*>[\s\S]*?<\/script>/;
 const replacement='<script type="application/ld+json" id="music-video-releases-schema">'+JSON.stringify(schema(sorted.filter(r=>featured.includes(r.id)))).replace(/</g,'\\u003c')+'</script>';
 if(!marker.test(home))throw Error('SEO ownership marker missing');
 fs.writeFileSync(homeFile,spotifyMusic.paintHome(billboardMusic.paintHome(home.replace(marker,replacement),billboard,sorted),spotifyVideos));
 fs.writeFileSync(file,JSON.stringify(updated,null,2)+'\n');
 console.log(`${successes}/${channels.length} official feeds checked; ${featured.length} featured videos; ${sorted.length} verified records.`);
}
module.exports={parseFeed,parseViewCount,schema,confirmExistingRelease,seoForRelease};
if(require.main===module)refresh().catch(e=>{console.error(e.message);process.exitCode=1;});
