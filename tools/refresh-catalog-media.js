#!/usr/bin/env node
/* ============================================================
   MatchApp catalog-media refresh

   Sources
   - TMDB: exact movie/TV identity, artwork, metadata, videos, trending and
     regional watch-provider availability (TMDB/JustWatch data).
   - iTunes Search API: artwork + short previews for audio/music entries.

   Production writes use a short-lived GitHub Actions OIDC token. The token is
   verified by Supabase Edge Function catalog-media-ingest; no Supabase
   service-role key is stored in GitHub. --dry-run never writes Supabase.
   ============================================================ */
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const TMDB='https://api.themoviedb.org/3';
const TMDB_READ_TOKEN=process.env.TMDB_READ_TOKEN||'';
const TMDB_API_KEY=process.env.TMDB_API_KEY||'';
const SUPABASE_URL=process.env.SUPABASE_URL||'https://zkymvqrmbabngsqblyye.supabase.co';
const GITHUB_OIDC_TOKEN=process.env.GITHUB_OIDC_TOKEN||'';
const DRY_RUN=process.argv.includes('--dry-run');
const REGIONS=['BR','US','GB','PT'];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ')}
function slug(v){return norm(v).replace(/\s+/g,'-')}

function loadMainCatalog(){
  const src=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');
  const a=src.indexOf('const CONTENT_CATALOG'),b=src.indexOf('const VERTICAL_DRAMA_TITLES');
  if(a<0||b<0)throw new Error('CONTENT_CATALOG boundaries not found');
  const box={};new Function('exports',src.slice(a,b)+';exports.value=CONTENT_CATALOG;')(box);
  return box.value.map(x=>({...x,isCatalog:true,kidsApproved:false,kidsAgeBands:[]}));
}
function loadKidsCatalog(){
  const src=fs.readFileSync(path.join(ROOT,'kids/kids.js'),'utf8'),marker='const LIBRARY = [';
  const start=src.indexOf(marker);if(start<0)throw new Error('Kids LIBRARY not found');
  const tail=src.slice(start+'const LIBRARY = '.length);let depth=0,quote=null,escaped=false,end=-1;
  for(let i=0;i<tail.length;i++){
    const ch=tail[i];
    if(quote){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch===quote)quote=null;continue}
    if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue}
    if(ch==='[')depth++;else if(ch===']'&&--depth===0){end=i+1;break}
  }
  if(end<0)throw new Error('Kids LIBRARY array end not found');
  return new Function(`return (${tail.slice(0,end)});`)().map(x=>({title:x.title,year:x.year?Number(x.year):null,type:x.type,platform:x.platform,cats:Array.isArray(x.cats)?x.cats:[],synopsis:x.desc||'',tmdb:x.tmdb!==false,isCatalog:true,kidsApproved:true,kidsAgeBands:Array.isArray(x.ages)?x.ages:[]}));
}
function mergeCatalogs(main,kids){
  const map=new Map();
  for(const item of [...main,...kids]){
    const key=`${norm(item.title)}::${item.year||''}`,p=map.get(key);
    if(!p)map.set(key,item);else map.set(key,{...p,kidsApproved:p.kidsApproved||item.kidsApproved,kidsAgeBands:[...new Set([...(p.kidsAgeBands||[]),...(item.kidsAgeBands||[])])],cats:[...new Set([...(p.cats||[]),...(item.cats||[])])],type:p.type||item.type,synopsis:p.synopsis||item.synopsis,tmdb:p.tmdb!==false&&item.tmdb!==false});
  }
  return [...map.values()];
}
function kindFor(item){
  const cats=(item.cats||[]).map(String),text=`${item.type||''} ${cats.join(' ')}`.toLowerCase();
  if(/podcast|music|album|single|playlist|audiobook|spotify/.test(text))return'audio';
  if(/^movie$/.test(String(item.type||'').toLowerCase())||cats.some(c=>/^(movie|short film)$/i.test(c)))return'movie';
  if(/series|drama|novela|telenovela|anime|reality|documentary/.test(text))return'tv';
  return item.tmdb===false?'audio':'tv';
}
async function tmdb(endpoint){
  const headers={Accept:'application/json'};let url=`${TMDB}${endpoint}`;
  if(TMDB_READ_TOKEN)headers.Authorization=`Bearer ${TMDB_READ_TOKEN}`;
  else if(TMDB_API_KEY)url+=`${endpoint.includes('?')?'&':'?'}api_key=${encodeURIComponent(TMDB_API_KEY)}`;
  else throw new Error('Missing TMDB_READ_TOKEN / TMDB_API_KEY');
  const res=await fetch(url,{headers});if(!res.ok)throw new Error(`TMDB ${res.status} for ${endpoint.split('?')[0]}`);return res.json();
}
function img(p,size){return p?`https://image.tmdb.org/t/p/${size}${p}`:null}
function exactTitle(item,row,kind){
  const names=kind==='movie'?[row.title,row.original_title]:[row.name,row.original_name];
  if(!names.some(n=>norm(n)===norm(item.title))||row.adult===true)return false;
  if(item.year){const d=kind==='movie'?row.release_date:row.first_air_date,y=Number(String(d||'').slice(0,4));if(!y||Math.abs(y-Number(item.year))>1)return false}
  return true;
}
async function findTmdb(item,kind){
  const year=item.year?(kind==='movie'?`&primary_release_year=${item.year}`:`&first_air_date_year=${item.year}`):'';
  const data=await tmdb(`/search/${kind}?query=${encodeURIComponent(item.title)}${year}&include_adult=false&language=en-US`);
  return(data.results||[]).find(r=>exactTitle(item,r,kind))||null;
}
function certification(d,kind){
  const bag=kind==='movie'?d.release_dates?.results:d.content_ratings?.results;if(!Array.isArray(bag))return null;
  for(const region of REGIONS){const row=bag.find(x=>x.iso_3166_1===region);if(!row)continue;if(kind==='movie'){const c=(row.release_dates||[]).map(x=>x.certification).find(Boolean);if(c)return c}else if(row.rating)return row.rating}return null;
}
function preview(d){
  const items=(d.videos?.results||[]).filter(v=>v?.site==='YouTube'&&/^[A-Za-z0-9_-]{6,}$/.test(String(v.key||'')));
  const rank=v=>(v.official?100:0)+({Trailer:40,Teaser:30,Clip:20,Featurette:10}[v.type]||0)+(v.size||0)/100;items.sort((a,b)=>rank(b)-rank(a));
  const v=items[0];return v?{preview_kind:'video',preview_provider:'YouTube / TMDB',preview_url:`https://www.youtube.com/watch?v=${v.key}`,preview_embed_url:`https://www.youtube-nocookie.com/embed/${v.key}`}:{preview_kind:null,preview_provider:null,preview_url:null,preview_embed_url:null};
}
function providerPack(d){
  const src=d['watch/providers']?.results||{},out={};
  for(const region of REGIONS){const r=src[region];if(!r)continue;const p={};if(r.flatrate?.length)p.stream=r.flatrate.map(x=>x.provider_name);if(r.rent?.length)p.rent=r.rent.map(x=>x.provider_name);if(r.buy?.length)p.buy=r.buy.map(x=>x.provider_name);if(r.link)p.link=r.link;if(Object.keys(p).length)out[region]=p}return out;
}
async function buildTmdbRow(item,trendingRank=null){
  const kind=kindFor(item);if(!['movie','tv'].includes(kind)||item.tmdb===false)return null;
  const hit=await findTmdb(item,kind);await sleep(90);if(!hit)return null;
  const append=kind==='movie'?'videos,release_dates,watch/providers':'videos,content_ratings,watch/providers';
  const d=await tmdb(`/${kind}/${hit.id}?language=en-US&append_to_response=${encodeURIComponent(append)}`);await sleep(90);
  if(!d||d.adult===true||!exactTitle(item,d,kind))return null;
  const date=kind==='movie'?d.release_date:d.first_air_date;
  return{source_key:`tmdb:${kind}:${d.id}`,title:kind==='movie'?d.title:d.name,normalized_title:norm(item.title),year:Number(String(date||item.year||'').slice(0,4))||null,media_kind:kind,tmdb_id:d.id,source:'TMDB',is_catalog_title:item.isCatalog===true,is_trending:trendingRank!=null,trending_rank:trendingRank,kids_approved:item.kidsApproved===true,kids_age_bands:item.kidsApproved?(item.kidsAgeBands||[]):[],poster_url:img(d.poster_path,'w500'),poster_large_url:img(d.poster_path,'w780'),poster_original_url:img(d.poster_path,'original'),backdrop_url:img(d.backdrop_path,'w1280'),overview:d.overview||item.synopsis||null,genres:(d.genres||[]).map(g=>g.name).filter(Boolean),runtime_minutes:kind==='movie'?(d.runtime||null):((d.episode_run_time||[])[0]||null),content_rating:certification(d,kind),vote_average:Number.isFinite(d.vote_average)?d.vote_average:null,original_language:d.original_language||null,...preview(d),availability:providerPack(d),source_updated_at:new Date().toISOString(),updated_at:new Date().toISOString()};
}
async function itunesAudio(item){
  const res=await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(item.title)}&limit=12&media=music`);if(!res.ok)return null;
  const data=await res.json(),hit=(data.results||[]).find(r=>[r.trackName,r.collectionName,r.artistName].some(n=>norm(n)===norm(item.title)))||null;if(!hit)return null;
  const artwork=String(hit.artworkUrl100||'').replace(/100x100bb\./,'600x600bb.');
  return{source_key:`itunes:${hit.trackId||hit.collectionId||slug(item.title)}`,title:item.title,normalized_title:norm(item.title),year:item.year||null,media_kind:'audio',tmdb_id:null,source:'iTunes Search API',is_catalog_title:true,is_trending:false,trending_rank:null,kids_approved:item.kidsApproved===true,kids_age_bands:item.kidsApproved?(item.kidsAgeBands||[]):[],poster_url:artwork||null,poster_large_url:artwork||null,poster_original_url:artwork||null,backdrop_url:null,overview:item.synopsis||null,genres:[hit.primaryGenreName].filter(Boolean),runtime_minutes:null,content_rating:null,vote_average:null,original_language:null,preview_kind:hit.previewUrl?'audio':null,preview_provider:hit.previewUrl?'Apple / iTunes':null,preview_url:hit.previewUrl||null,preview_embed_url:null,availability:{},source_updated_at:new Date().toISOString(),updated_at:new Date().toISOString()};
}
async function fetchTrending(){
  const out=[];for(const kind of['movie','tv']){const data=await tmdb(`/trending/${kind}/day?language=en-US`);await sleep(90);const results=(data.results||[]).slice(0,20);for(let i=0;i<results.length;i++){const r=results[i];if(r.adult===true)continue;out.push({title:kind==='movie'?r.title:r.name,year:Number(String(kind==='movie'?r.release_date:r.first_air_date).slice(0,4))||null,type:kind,cats:[kind],isCatalog:false,kidsApproved:false,kidsAgeBands:[],tmdb:true,trendingRank:(kind==='movie'?0:20)+i+1})}}return out;
}
async function upsertRows(rows){
  if(DRY_RUN)return;
  if(!GITHUB_OIDC_TOKEN)throw new Error('GITHUB_OIDC_TOKEN is required for live refresh');
  const res=await fetch(`${SUPABASE_URL}/functions/v1/catalog-media-ingest`,{method:'POST',headers:{Authorization:`Bearer ${GITHUB_OIDC_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({rows,resetTrending:true})});
  if(!res.ok)throw new Error(`catalog-media-ingest ${res.status}: ${await res.text()}`);
  const out=await res.json();if(!out?.ok||Number(out.rows)!==rows.length)throw new Error('catalog-media-ingest returned an unexpected result');
}
async function main(){
  const started=Date.now();if(!TMDB_READ_TOKEN&&!TMDB_API_KEY)throw new Error('TMDB credential missing');
  const catalog=mergeCatalogs(loadMainCatalog(),loadKidsCatalog()),trending=await fetchTrending(),rows=[],failures=[];let tmdbCount=0,audioCount=0;
  for(const item of[...catalog,...trending]){try{const kind=kindFor(item),row=kind==='audio'?await itunesAudio(item):await buildTmdbRow(item,item.trendingRank??null);if(row){rows.push(row);kind==='audio'?audioCount++:tmdbCount++}else failures.push({title:item.title,reason:'no confident metadata match'})}catch(e){failures.push({title:item.title,reason:e.message||String(e)})}}
  const deduped=[...new Map(rows.map(r=>[r.source_key,r])).values()];await upsertRows(deduped);
  const report={generated:new Date().toISOString(),dryRun:DRY_RUN,durationMs:Date.now()-started,catalogInputs:catalog.length,trendingInputs:trending.length,rows:deduped.length,tmdbRows:tmdbCount,audioRows:audioCount,withPoster:deduped.filter(r=>r.poster_large_url||r.poster_url).length,withPreview:deduped.filter(r=>r.preview_url||r.preview_embed_url).length,kidsApproved:deduped.filter(r=>r.kids_approved).length,failures:failures.slice(0,100)};
  fs.mkdirSync(path.join(ROOT,'data'),{recursive:true});fs.writeFileSync(path.join(ROOT,'data','catalog-media-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,`## MatchApp media refresh\n- Mode: ${DRY_RUN?'dry run':'live OIDC upsert'}\n- Inputs: ${report.catalogInputs} catalog + ${report.trendingInputs} trending\n- Rows: ${report.rows}\n- Posters: ${report.withPoster}\n- Previews: ${report.withPreview}\n- Kids-approved rows: ${report.kidsApproved}\n- Failures/skips: ${failures.length}\n- Duration: ${(report.durationMs/1000).toFixed(1)}s\n`);
}
main().catch(err=>{console.error(err.stack||err);process.exit(1)});
