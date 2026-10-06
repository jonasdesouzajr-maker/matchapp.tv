'use strict';
const {JSDOM}=require('jsdom');
const SOURCES=[
 'https://newsroom.spotify.com/2026-09-16/taylor-swift-music-videos-catalog-spotify/',
 'https://newsroom.spotify.com/2026-09-25/mtv-vmas-partnership/',
 'https://newsroom.spotify.com/2026-07-15/music-video-debuts/'
];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function spotifyUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='open.spotify.com'&&/^\/(track|playlist|genre)\/[a-zA-Z0-9]{22}$/.test(u.pathname)?u.origin+u.pathname:null;}catch{return null;}}
function sourceUrl(value){return /^https:\/\/newsroom\.spotify\.com\/\d{4}-\d{2}-\d{2}\/[a-z0-9-]+\/$/.test(value);}
function parseAnnouncement(html,url,now=Date.now()){
 if(!sourceUrl(url))throw Error('Untrusted Spotify announcement');
 const dom=new JSDOM(html);
 try{
  const d=dom.window.document,article=d.querySelector('article');
  const title=d.querySelector('h1')?.textContent.trim()||d.title.replace(/ — Spotify$/,'');
  const announcedAt=d.querySelector('meta[property="article:published_time"]')?.content;
  if(!article||!/music videos?|video.*(?:VMA|performance)|(?:VMA|performance).*video|Watch.*(?:VMA|performance)/i.test(title)||/podcast/i.test(title)||!Number.isFinite(Date.parse(announcedAt))||Date.parse(announcedAt)>now)throw Error('Not a dated official music-video announcement');
  // Track links require explicit video context in the SAME paragraph, or an
  // individually titled video in a music-video roundup. Never infer video
  // availability from an artist profile, album, song search, Canvas or audio API.
  return [...article.querySelectorAll('a[href]')].flatMap(a=>{
   const target=spotifyUrl(a.href);if(!target)return [];
   const label=a.textContent.replace(/\s+/g,' ').replace(/[“”]/g,'').trim();
   const paragraph=a.closest('p'),heading=a.closest('h2,h3');
   const text=paragraph?.textContent||a.parentElement?.textContent||'';
   const type=new URL(target).pathname.split('/')[1];
   const explicit=type==='track'?(!!heading||/music video|official video|video.*(?:premier|debut)|(?:premier|debut).*video/i.test(text)):/video|VMA|central hub/i.test(label);
   if(!explicit||!label||label.length>130)return [];
   return [{url:target,title:label,kind:type==='track'?'music-video':'video-collection',source:url,sourceTitle:title,announcedAt}];
  }).filter((r,i,all)=>all.findIndex(x=>x.url===r.url)===i);
 }finally{dom.window.close();}
}
function discoverAnnouncements(xml){
 const dom=new JSDOM(xml,{contentType:'text/xml'});
 try{return [...dom.window.document.querySelectorAll('item')].filter(x=>/music videos?|(?:VMA|performance).*video|video.*(?:VMA|performance)/i.test(x.querySelector('title')?.textContent||'')&&!/podcast/i.test(x.querySelector('title')?.textContent||'')).map(x=>x.querySelector('link')?.textContent.trim()).filter(sourceUrl).slice(0,4);}finally{dom.window.close();}
}
function destinationMetadata(html,url){
 const dom=new JSDOM(html);
 try{
  const d=dom.window.document,rows=[];
  for(const script of d.querySelectorAll('script[type="application/ld+json"]')){try{const parsed=JSON.parse(script.textContent);rows.push(...(Array.isArray(parsed)?parsed:(parsed['@graph']||[parsed])));}catch{}}
  const recording=rows.find(r=>[].concat(r['@type']).includes('MusicRecording')&&(r.url===url||r['@id']===url));
  const v=rows.find(r=>r['@type']==='VideoObject'&&r.name&&Number.isFinite(Date.parse(r.uploadDate))&&Date.parse(r.uploadDate)<=Date.now()&&/^https:\/\/i\.scdn\.co\/image\/[a-zA-Z0-9]+$/.test([].concat(r.thumbnailUrl)[0]||''));
  if(!recording||!v)throw Error('Spotify has not confirmed an exact music video for this track');
  const artist=d.querySelector('meta[property="og:description"]')?.content.split('·')[0].trim()||'';
  return {title:recording.name,artist,video:{name:v.name,uploadDate:v.uploadDate,thumbnailUrl:[].concat(v.thumbnailUrl)[0],...(v.duration?{duration:v.duration}:{})}};
 }finally{dom.window.close();}
}
async function refreshSpotifyVideos(prior=[],request){
 const byUrl=new Map(prior.filter(r=>(r.kind==='video-collection'||r.video)&&spotifyUrl(r.url)&&sourceUrl(r.source)).map(r=>[r.url,r]));
 let found=[],remaining=24;try{found=discoverAnnouncements(await request('https://newsroom.spotify.com/feed/'));}catch(e){console.error('[Spotify videos] Discovery unavailable: '+e.message);}
 const sources=[...new Set([...found,...SOURCES,...prior.map(r=>r.source).filter(sourceUrl)])].slice(0,8);
 for(const url of sources){
  try{
   const candidates=parseAnnouncement(await request(url),url);
   for(const row of candidates.slice(0,12)){
    if(remaining--<=0)break;
    try{
     // Verify the destination exists through Spotify's public oEmbed endpoint.
     // Collections/hubs without an oEmbed stay source-only until verified.
     const page=await request(row.url);
     if(!/spotify/i.test(page)||/Page not found|This page is not available/i.test(page))throw Error('Spotify destination unavailable');
     let title=row.title,metadata={};
     if(row.kind==='music-video'){metadata=destinationMetadata(page,row.url);title=metadata.title;}
     if(new URL(row.url).pathname.startsWith('/playlist/')){
      const info=JSON.parse(await request('https://open.spotify.com/oembed?url='+encodeURIComponent(row.url)));
      if(!info.title)throw Error('Spotify collection identity unavailable');title=info.title;
     }
     const old=byUrl.get(row.url);
     if(!old||row.announcedAt>=old.announcedAt)byUrl.set(row.url,{...row,...metadata,title,verifiedAt:new Date().toISOString().slice(0,10),keywords:[title,...(metadata.artist?[metadata.artist,metadata.artist+' '+title+' Spotify music video']:[]),'Spotify music videos','official music videos on Spotify',row.kind==='music-video'?'watch music video on Spotify':'Spotify video collection']});
    }catch(e){console.error('[Spotify videos] '+row.title+': '+e.message);}
   }
  }catch(e){console.error('[Spotify videos] '+e.message);}
 }
 return [...byUrl.values()].sort((a,b)=>Date.parse(b.announcedAt)-Date.parse(a.announcedAt)).slice(0,16);
}
function spotifyKeywords(rows=[]){return [...new Set(rows.flatMap(r=>r.keywords||[]))];}
function renderSpotify(rows=[]){
 if(!rows.length)return '';
 const cards=rows.map(r=>`<li class="billboard-song"><span class="billboard-rank">Spotify</span>${r.video?.thumbnailUrl?`<a href="${esc(r.url)}" class="billboard-art" target="_blank" rel="noopener noreferrer"><img src="${esc(r.video.thumbnailUrl)}" alt="${esc([r.artist,r.title].filter(Boolean).join(' — '))}" width="480" height="360" loading="lazy" decoding="async"></a>`:''}<h3>${esc(r.title)}</h3>${r.artist?`<p>${esc(r.artist)}</p>`:''}<p data-bb-copy="${r.kind==='music-video'?'spotifyVideo':'spotifyCollection'}">${r.kind==='music-video'?'Official music video':'Official video collection'}</p><p class="billboard-release"><span data-bb-copy="announced">Announced</span> <time datetime="${esc(r.announcedAt)}">${esc(r.announcedAt.slice(0,10))}</time></p><p class="billboard-release"><span data-bb-copy="verified">Verified</span> <time datetime="${esc(r.verifiedAt)}">${esc(r.verifiedAt)}</time></p><a class="gold-btn billboard-watch" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer" data-bb-copy="openSpotify">Open in Spotify</a><p><a href="${esc(r.source)}" target="_blank" rel="noopener noreferrer" data-bb-copy="spotifySource">Spotify announcement</a></p></li>`).join('');
 const ld={'@context':'https://schema.org','@type':'ItemList',name:'Official Spotify music videos and video collections',url:'https://matchapp.tv/trending/this-week/#spotify-videos',numberOfItems:rows.length,itemListElement:rows.map((r,i)=>({'@type':'ListItem',position:i+1,item:{'@type':r.video?'VideoObject':'WebPage',...(r.video?{thumbnailUrl:r.video.thumbnailUrl,uploadDate:r.video.uploadDate,isAccessibleForFree:false,...(r.video.duration?{duration:r.video.duration}:{})}:{}),name:r.title,url:r.url,description:r.kind==='music-video'?'Official music video identified in a dated Spotify announcement.':'Official Spotify video destination identified in a dated Spotify announcement.',citation:r.source}}))};
 return `<details id="spotify-videos" class="billboard-chart"><summary><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4zM9 8v8l7-4z" fill="currentColor" fill-rule="evenodd"/></svg><span data-bb-copy="spotifyTitle">Spotify · Music videos</span><span class="billboard-arrow" aria-hidden="true">⌄</span></summary><div class="billboard-body"><p class="billboard-note" data-bb-copy="spotifyNote">Official videos and video collections confirmed by Spotify. Open a song and choose Switch to video when available. Premium, account and country availability apply.</p><ol class="billboard-list">${cards}</ol><p class="billboard-sources"><a href="/trending/this-week/#spotify-videos" data-bb-copy="guide">Music and entertainment guide</a></p></div></details><script type="application/ld+json" id="spotify-music-schema">${JSON.stringify(ld).replace(/</g,'\\u003c')}</script>`;
}
function paintHome(home,rows){
 const re=/<!-- SPOTIFY-MUSIC:START -->[\s\S]*?<!-- SPOTIFY-MUSIC:END -->/;
 const block='<!-- SPOTIFY-MUSIC:START -->\n'+renderSpotify(rows)+'\n<!-- SPOTIFY-MUSIC:END -->';
 if(re.test(home))return home.replace(re,block);
 const anchor='<section id="swifties-spotify"';if(!home.includes(anchor))throw Error('Spotify region anchor missing');return home.replace(anchor,block+'\n'+anchor);
}
module.exports={spotifyUrl,sourceUrl,parseAnnouncement,discoverAnnouncements,destinationMetadata,refreshSpotifyVideos,spotifyKeywords,renderSpotify,paintHome};
