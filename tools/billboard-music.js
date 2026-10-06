'use strict';
const {JSDOM}=require('jsdom');
const CHART_URL='https://www.billboard.com/charts/hot-100/';
const PUBLIC_URL='https://www.officialcharts.com/charts/billboard-hot-100-chart/';
const normalize=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function validateChart(chart,now=Date.now()){
 const time=Date.parse(chart?.chartDate+'T00:00:00Z');
 if(!Number.isFinite(time)||time>now+7*86400000||chart?.name!=='Billboard Hot 100'||chart?.region!=='US'||!Array.isArray(chart.entries)||chart.entries.length!==10)throw Error('Incomplete Billboard top ten or invalid chart date');
 if(![CHART_URL,PUBLIC_URL].includes(chart.sourceUrl)&&!/^https:\/\/www\.billboard\.com\/lists\/[a-z0-9-]+\/$/.test(chart.sourceUrl||''))throw Error('Untrusted chart source');
 const identities=new Set();
 chart.entries.forEach((r,i)=>{const key=normalize(r.artist)+':'+normalize(r.title);if(r.rank!==i+1||!r.artist?.trim()||!r.title?.trim()||identities.has(key))throw Error('Invalid or duplicate chart rank/identity');identities.add(key);});
 return chart;
}
function parseOfficialChart(html,now=Date.now()){
 const dom=new JSDOM(html);
 try{
  const d=dom.window.document;
  if(d.querySelector('h1')?.textContent.trim()!=='Billboard Hot 100')throw Error('Wrong chart identity');
  const text=d.body.textContent.replace(/\s+/g,' ');
  const date=text.match(/(\d{1,2} [A-Z][a-z]+ \d{4})\s*-\s*\d{1,2} [A-Z][a-z]+ \d{4}/)?.[1];
  const start=Date.parse(date+' UTC');if(!Number.isFinite(start))throw Error('Chart period unavailable');
  // Official Charts labels the Wednesday-to-Tuesday period; Billboard's issue
  // date is the Saturday within that exact published period, not crawl time.
  const issue=new Date(start);issue.setUTCDate(issue.getUTCDate()+(6-issue.getUTCDay()+7)%7);
  const entries=[...d.querySelectorAll('.chart-item')].flatMap(row=>{
   const title=row.querySelector('.chart-name span:last-child')?.textContent.trim();
   const artist=row.querySelector('.chart-artist')?.textContent.trim();
   const rank=Number(row.querySelector('.chart-key strong')?.textContent);
   return rank>=1&&rank<=10&&title&&artist?[{rank,title,artist}]:[];
  }).sort((a,b)=>a.rank-b.rank);
  return validateChart({name:'Billboard Hot 100',region:'US',chartDate:issue.toISOString().slice(0,10),periodStart:new Date(start).toISOString().slice(0,10),sourceUrl:PUBLIC_URL,chartUrl:CHART_URL,entries},now);
 }finally{dom.window.close();}
}
function parseBillboardChart(html,now=Date.now()){
 const dom=new JSDOM(html);
 try{
  const d=dom.window.document;
  if(!/Hot 100/.test(d.title))throw Error('Wrong Billboard chart');
  const date=d.querySelector('meta[property="og:url"]')?.content.match(/hot-100\/(\d{4}-\d{2}-\d{2})/)?.[1]||d.body.textContent.match(/Week of ([A-Z][a-z]+ \d{1,2}, \d{4})/)?.[1];
  const t=Date.parse(date);if(!Number.isFinite(t))throw Error('Public chart issue date unavailable');
  // Read only publicly returned chart rows. Never bypass a paywall or use a
  // subscriber API. Missing/truncated rows fail closed.
  const entries=[...d.querySelectorAll('.o-chart-results-list-row-container')].slice(0,10).map((row,i)=>({rank:i+1,title:row.querySelector('h3')?.textContent.trim(),artist:row.querySelector('h3')?.nextElementSibling?.textContent.trim()}));
  return validateChart({name:'Billboard Hot 100',region:'US',chartDate:new Date(t).toISOString().slice(0,10),sourceUrl:CHART_URL,chartUrl:CHART_URL,entries},now);
 }finally{dom.window.close();}
}
function matchVideo(entry,items){
 return items.find(v=>normalize(v.artist)===normalize(entry.artist)&&normalize(v.title)===normalize(entry.title)&&/^[\w-]{11}$/.test(v.id)&&v.url==='https://www.youtube.com/watch?v='+v.id&&v.poster==='/assets/music-videos/'+v.id+'.jpg'&&Number.isSafeInteger(v.viewCount)&&v.viewCount>=0&&Date.parse(v.publishedAt)<=Date.now()&&/^https:\/\/www\.youtube\.com\/(?:@|channel\/)/.test(v.channelUrl));
}
function attachVideos(chart,items){
 validateChart(chart);
 return {...chart,entries:chart.entries.map(({videoId,...entry})=>{const video=matchVideo(entry,items);return {...entry,...(video?{videoId:video.id}:{})};})};
}
async function refreshBillboard(prior,items,request){
 let best=prior?validateChart(prior):null,confirmed=false;
 for(const [url,parse] of [[CHART_URL,parseBillboardChart],[PUBLIC_URL,parseOfficialChart]]){
  try{const candidate=parse(await request(url));if(!best||candidate.chartDate>=best.chartDate){best=candidate;confirmed=true;}}
  catch(error){console.error('[Billboard] '+error.message);}
 }
 if(!best)throw Error('No verified Billboard chart; previous music inventory retained');
 return attachVideos({...best,verifiedAt:confirmed?new Date().toISOString().slice(0,10):best.verifiedAt},items);
}
function chartSchema(chart,items){
 return {'@context':'https://schema.org','@type':'ItemList',name:'Billboard Hot 100 songs with verified official music videos',description:`US song chart dated ${chart.chartDate}. Song positions are Billboard rankings, not video rankings.`,url:'https://matchapp.tv/trending/this-week/#billboard',numberOfItems:10,itemListElement:chart.entries.map(e=>{const v=matchVideo(e,items);return {'@type':'ListItem',position:e.rank,item:{'@type':'MusicRecording',name:e.title,byArtist:{'@type':'MusicGroup',name:e.artist},...(v?{subjectOf:{'@type':'VideoObject',name:v.artist+' — '+v.title,description:v.seo?.description||`Official ${v.artist} music video for ${v.title}.`,url:v.url,embedUrl:'https://www.youtube.com/embed/'+v.id,thumbnailUrl:'https://matchapp.tv'+v.poster,uploadDate:v.publishedAt}}:{})}};})};
}
function chartKeywords(chart){return chart?['Billboard Hot 100 official music videos',...chart.entries.flatMap(e=>[`${e.artist} ${e.title} official video`,`${e.artist} ${e.title} Billboard Hot 100`])]:[];}
function renderBillboard(chart,items,{fold=true}={}){
 if(!chart)return '';
 validateChart(chart);
 const cards=chart.entries.map(e=>{const v=matchVideo(e,items);return `<li class="billboard-song"><span class="billboard-rank">#${e.rank}</span>${v?`<a href="/discover.html?video=${esc(v.id)}&amp;focus=start" class="billboard-art"><img src="${esc(v.poster)}" alt="${esc(e.artist+' — '+e.title)}" width="480" height="360" loading="lazy" decoding="async"></a>`:''}<h3>${esc(e.title)}</h3><p>${esc(e.artist)}</p>${v?`<p class="billboard-release"><span data-bb-copy="release">Video released</span> <time datetime="${esc(v.publishedAt)}">${esc(v.publishedAt.slice(0,10))}</time></p><a class="gold-btn billboard-watch" href="${esc(v.url)}" target="_blank" rel="noopener noreferrer" data-bb-copy="watch">Watch official video</a>`:`<p class="billboard-unavailable" data-bb-copy="unavailable">Official video not verified</p>`}</li>`;}).join('');
 const heading='<span data-bb-copy="title">Billboard Hot 100 · Official music videos</span>';
 const summary=fold?`<summary><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18V9h3v9zm6 0V5h3v13zm6 0V2h3v16z" fill="currentColor"/></svg>${heading}<span class="billboard-arrow" aria-hidden="true">⌄</span></summary>`:`<h2>${heading}</h2>`;
 return `<${fold?'details':'section'} id="billboard" class="billboard-chart" data-chart-date="${esc(chart.chartDate)}">${summary}<div class="billboard-body"><p class="billboard-note" data-bb-copy="note">US song rankings, not a music-video chart. Checked daily against published chart sources.</p><p class="billboard-dates"><span data-bb-copy="week">Chart week</span>: <time datetime="${esc(chart.chartDate)}">${esc(chart.chartDate)}</time> · <span data-bb-copy="verified">Verified</span>: <time datetime="${esc(chart.verifiedAt)}">${esc(chart.verifiedAt)}</time> <span class="billboard-stale" hidden data-bb-copy="stale">Previous verified chart; awaiting a newer source.</span></p><ol class="billboard-list">${cards}</ol><p class="billboard-sources"><a href="${esc(chart.sourceUrl)}" target="_blank" rel="noopener noreferrer" data-bb-copy="source">Chart source</a> · <a href="${CHART_URL}" target="_blank" rel="noopener noreferrer">Billboard Hot 100</a> · <a href="/trending/this-week/#billboard" data-bb-copy="guide">Music and entertainment guide</a></p></div></${fold?'details':'section'}><script type="application/ld+json" id="billboard-music-schema">${JSON.stringify(chartSchema(chart,items)).replace(/</g,'\\u003c')}</script>`;
}
function paintHome(home,chart,items){
 const html=renderBillboard(chart,items);
 const re=/<!-- BILLBOARD-MUSIC:START -->[\s\S]*?<!-- BILLBOARD-MUSIC:END -->/;
 const block='<!-- BILLBOARD-MUSIC:START -->\n'+html+'\n<!-- BILLBOARD-MUSIC:END -->';
 if(re.test(home))return home.replace(re,block);
 const anchor='<section id="swifties-spotify"';if(!home.includes(anchor))throw Error('Music region anchor missing');
 return home.replace(anchor,block+'\n'+anchor);
}
module.exports={normalize,validateChart,parseOfficialChart,parseBillboardChart,matchVideo,attachVideos,refreshBillboard,chartSchema,chartKeywords,renderBillboard,paintHome};
