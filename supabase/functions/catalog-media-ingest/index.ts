import { createClient } from "npm:@supabase/supabase-js@2.105.0";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@6.1.0";

/*
 * MatchApp catalogue media ingest/enrichment.
 * GitHub Actions sends only catalogue identities plus a short-lived OIDC JWT.
 * TMDB and Supabase admin credentials stay inside Supabase Function secrets.
 * Provider availability is read from TMDB watch/providers (JustWatch data via
 * TMDB), avoiding brittle or undocumented HTML scraping.
 */
const REPOSITORY="jonasdesouzajr-maker/matchapp.tv";
const OIDC_AUDIENCE="matchapp-supabase-catalog-media";
const GITHUB_ISSUER="https://token.actions.githubusercontent.com";
const GITHUB_JWKS=createRemoteJWKSet(new URL(`${GITHUB_ISSUER}/.well-known/jwks`));
const TMDB_BASE="https://api.themoviedb.org/3",IMG_BASE="https://image.tmdb.org/t/p";
const REGIONS=["BR","US","GB","PT"],MAX_CATALOG_PER_RUN=72,MAX_TRENDING=20,CONCURRENCY=5;
const admin=createClient(Deno.env.get("SUPABASE_URL")??"",Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"",{auth:{persistSession:false,autoRefreshToken:false}});
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const normalise=(v:unknown)=>String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^\p{L}\p{N}]/gu,"");
const fullImage=(p:unknown,size:string)=>typeof p==="string"&&/^\/[A-Za-z0-9_.-]+$/.test(p)?`${IMG_BASE}/${size}${p}`:null;

async function authorize(req:Request){
  const raw=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"")??"";if(!raw)throw Error("missing GitHub OIDC token");
  const {payload}=await jwtVerify(raw,GITHUB_JWKS,{issuer:GITHUB_ISSUER,audience:OIDC_AUDIENCE});
  if(payload.repository!==REPOSITORY)throw Error("repository claim rejected");
  const event=String(payload.event_name||"");if(!["schedule","workflow_dispatch","push"].includes(event))throw Error("event claim rejected");
  const workflowRef=String(payload.workflow_ref||"");if(!workflowRef.startsWith(`${REPOSITORY}/.github/workflows/scraper.yml@refs/heads/`))throw Error("workflow claim rejected");
  if(event==="push"&&payload.ref!=="refs/heads/main")throw Error("push ref rejected");
  return payload;
}
async function tmdb(path:string,token:string):Promise<any|null>{
  const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),8000);
  try{const res=await fetch(`${TMDB_BASE}${path}`,{signal:ac.signal,headers:{authorization:`Bearer ${token}`,accept:"application/json"}});if(!res.ok){console.error(JSON.stringify({event:"catalog-media-tmdb-error",path:path.split("?")[0],status:res.status}));return null;}return await res.json();}
  catch(error){console.error(JSON.stringify({event:"catalog-media-tmdb-fetch-failed",path:path.split("?")[0],error:String(error)}));return null;}finally{clearTimeout(timer);}
}
const titleOf=(r:any,k:"movie"|"tv")=>String(k==="movie"?r?.title??"":r?.name??"");
const originalTitleOf=(r:any,k:"movie"|"tv")=>String(k==="movie"?r?.original_title??"":r?.original_name??"");
function yearOf(r:any,k:"movie"|"tv"){const d=String(k==="movie"?r?.release_date??"":r?.first_air_date??""),y=Number(d.slice(0,4));return Number.isInteger(y)&&y>=1888&&y<=2100?y:null;}
function chooseVideo(videos:any,kind:"movie"|"tv"){
  const rows=Array.isArray(videos?.results)?videos.results:[],priorities=kind==="tv"?["Trailer","Teaser","Clip","Featurette"]:["Trailer","Teaser","Featurette","Clip"];
  const valid=rows.filter((v:any)=>v?.site==="YouTube"&&/^[A-Za-z0-9_-]{6,32}$/.test(String(v?.key||"")));
  valid.sort((a:any,b:any)=>{const pa=priorities.indexOf(a.type),pb=priorities.indexOf(b.type),aa=pa<0?99:pa,bb=pb<0?99:pb;if(aa!==bb)return aa-bb;if(Boolean(a.official)!==Boolean(b.official))return a.official?-1:1;return String(b.published_at||"").localeCompare(String(a.published_at||""));});
  const v=valid[0];return v?{preview_kind:"video",preview_provider:"youtube",preview_url:`https://www.youtube.com/watch?v=${v.key}`,preview_embed_url:`https://www.youtube-nocookie.com/embed/${v.key}?rel=0&modestbranding=1`}:{preview_kind:null,preview_provider:null,preview_url:null,preview_embed_url:null};
}
function chooseRating(record:any,kind:"movie"|"tv"){
  const pref=["US","BR","GB","PT"];
  if(kind==="movie"){const rows=Array.isArray(record?.release_dates?.results)?record.release_dates.results:[];for(const region of pref){const item=rows.find((r:any)=>r?.iso_3166_1===region),cert=item?.release_dates?.map((x:any)=>String(x?.certification||"").trim()).find(Boolean);if(cert)return cert.slice(0,24);}}
  else{const rows=Array.isArray(record?.content_ratings?.results)?record.content_ratings.results:[];for(const region of pref){const rating=String(rows.find((r:any)=>r?.iso_3166_1===region)?.rating||"").trim();if(rating)return rating.slice(0,24);}}
  return null;
}
const providerNames=(rows:unknown)=>Array.isArray(rows)?rows.map((r:any)=>String(r?.provider_name||"").trim()).filter(Boolean).slice(0,20):[];
function cinemaReleaseDate(record:any,region:string){const rows=Array.isArray(record?.release_dates?.results)?record.release_dates.results:[],entry=rows.find((r:any)=>r?.iso_3166_1===region),dates=Array.isArray(entry?.release_dates)?entry.release_dates:[];const theatrical=dates.filter((r:any)=>[2,3].includes(Number(r?.type))&&typeof r?.release_date==="string").map((r:any)=>String(r.release_date).slice(0,10)).filter((v:string)=>/^\\d{4}-\\d{2}-\\d{2}$/.test(v)).sort();return theatrical[0]||null;}
function availabilityFrom(record:any,kind:"movie"|"tv"){const source=record?.["watch/providers"]?.results||{},out:Record<string,unknown>={source:"tmdb-watch-providers",attribution:"JustWatch via TMDB",source_page_url:Number.isSafeInteger(record?.id)?"https://www.themoviedb.org/"+kind+"/"+record.id:null};for(const region of REGIONS){const r=source?.[region],cinema=kind==="movie"?cinemaReleaseDate(record,region):null;if(!r&&!cinema)continue;out[region]={link:typeof r?.link==="string"&&/^https:\/\//.test(r.link)?r.link:null,stream:[...providerNames(r?.flatrate),...providerNames(r?.free),...providerNames(r?.ads)].filter((v,i,a)=>a.indexOf(v)===i),rent:providerNames(r?.rent),buy:providerNames(r?.buy),cinema_release_date:cinema};}return out;}
const details=(id:number,kind:"movie"|"tv",token:string)=>tmdb(`/${kind}/${id}?language=en-US&append_to_response=videos,watch%2Fproviders,release_dates,content_ratings`,token);

async function resolveTmdb(item:any,token:string,forcedKind?:"movie"|"tv"){
  const kind:"movie"|"tv"=forcedKind||(item.media_kind==="movie"?"movie":"tv"),q=encodeURIComponent(String(item.title||"").trim());if(!q)return null;
  const yearKey=kind==="movie"?"year":"first_air_date_year",yearParam=item.year?"&"+yearKey+"="+encodeURIComponent(String(item.year)):"";
  const search=await tmdb("/search/"+kind+"?query="+q+"&include_adult=false&language=en-US"+yearParam,token),rows=Array.isArray(search?.results)?search.results:[],target=normalise(item.title);
  const exact=rows.find((r:any)=>{
    if(r?.adult===true||!Number.isSafeInteger(r?.id))return false;
    const ok=[titleOf(r,kind),originalTitleOf(r,kind)].some(t=>normalise(t)===target);if(!ok)return false;
    if(item.poster_path&&String(r?.poster_path||"")!==String(item.poster_path))return false;
    if(!item.year)return true;const y=yearOf(r,kind);return y!==null&&Math.abs(y-Number(item.year))<=1;
  });
  if(!exact)return null;
  const record=await details(exact.id,kind,token);if(!record||record.adult===true)return null;const runtime=kind==="movie"?Number(record.runtime):Number(record.episode_run_time?.[0]);
  return {source_key:"tmdb:"+kind+":"+record.id,title:titleOf(record,kind)||item.title,normalized_title:normalise(item.title),year:yearOf(record,kind)||(item.year?Number(item.year):null),media_kind:kind,tmdb_id:record.id,source:"tmdb",is_catalog_title:true,is_trending:item.homepage_trending===true,trending_rank:null,kids_approved:item.kids_approved===true,kids_age_bands:Array.isArray(item.kids_age_bands)?item.kids_age_bands.slice(0,8):[],poster_url:fullImage(record.poster_path,"w500"),poster_large_url:fullImage(record.poster_path,"w780"),poster_original_url:fullImage(record.poster_path,"original"),backdrop_url:fullImage(record.backdrop_path,"w1280"),overview:typeof record.overview==="string"?record.overview.trim().slice(0,4000)||null:null,genres:Array.isArray(record.genres)?record.genres.map((g:any)=>String(g?.name||"").trim()).filter(Boolean).slice(0,20):[],runtime_minutes:Number.isFinite(runtime)&&runtime>0&&runtime<=1440?Math.round(runtime):null,content_rating:chooseRating(record,kind),vote_average:Number.isFinite(Number(record.vote_average))?Math.max(0,Math.min(10,Number(record.vote_average))):null,original_language:typeof record.original_language==="string"?record.original_language.slice(0,16):null,...chooseVideo(record.videos,kind),availability:availabilityFrom(record,kind),source_updated_at:new Date().toISOString(),updated_at:new Date().toISOString()};
}
async function resolveUnknownTmdb(item:any,token:string){
  const rows=(await Promise.all([resolveTmdb(item,token,"movie"),resolveTmdb(item,token,"tv")])).filter(Boolean);
  if(item.poster_path)return rows[0]||null;
  return rows.length===1?rows[0]:null;
}
async function resolveAudio(item:any){
  const media=item.media_kind==="podcast"?"podcast":"music",entity=item.media_kind==="podcast"?"podcast":"song",url=`https://itunes.apple.com/search?term=${encodeURIComponent(item.title)}&media=${media}&entity=${entity}&limit=12&country=US`;
  try{const res=await fetch(url,{headers:{accept:"application/json"}});if(!res.ok)return null;const payload=await res.json(),rows=Array.isArray(payload?.results)?payload.results:[],target=normalise(item.title),exact=rows.find((r:any)=>[r.trackName,r.collectionName].some(v=>normalise(v)===target));if(!exact)return null;const id=Number(exact.trackId||exact.collectionId);if(!Number.isSafeInteger(id)||id<=0)return null;const artwork=String(exact.artworkUrl100||"").replace(/100x100bb\./,"600x600bb."),preview=typeof exact.previewUrl==="string"&&/^https:\/\/audio-ssl\.itunes\.apple\.com\//.test(exact.previewUrl)?exact.previewUrl:null;return {source_key:`itunes:${id}`,title:String(exact.trackName||exact.collectionName||item.title),normalized_title:normalise(item.title),year:item.year?Number(item.year):null,media_kind:item.media_kind||"audio",tmdb_id:null,source:"itunes",is_catalog_title:true,is_trending:false,trending_rank:null,kids_approved:item.kids_approved===true,kids_age_bands:Array.isArray(item.kids_age_bands)?item.kids_age_bands.slice(0,8):[],poster_url:/^https:\/\/is\d+-ssl\.mzstatic\.com\//.test(artwork)?artwork:null,poster_large_url:/^https:\/\/is\d+-ssl\.mzstatic\.com\//.test(artwork)?artwork:null,poster_original_url:null,backdrop_url:null,overview:null,genres:exact.primaryGenreName?[String(exact.primaryGenreName)]:[],runtime_minutes:Number(exact.trackTimeMillis)>0?Math.max(1,Math.round(Number(exact.trackTimeMillis)/60000)):null,content_rating:null,vote_average:null,original_language:null,preview_kind:preview?"audio":null,preview_provider:preview?"itunes":null,preview_url:preview,preview_embed_url:null,availability:{source:"itunes",store_url:typeof exact.trackViewUrl==="string"?exact.trackViewUrl:(exact.collectionViewUrl||null)},source_updated_at:new Date().toISOString(),updated_at:new Date().toISOString()};}catch(error){console.error(JSON.stringify({event:"catalog-media-itunes-failed",title:item.title,error:String(error)}));return null;}
}
async function resolveCatalogItem(item:any,token:string){if(!item||typeof item.title!=="string"||!item.title.trim())return null;if(["movie","tv"].includes(item.media_kind))return resolveTmdb(item,token);if(item.media_kind==="other")return resolveUnknownTmdb(item,token);if(["music","podcast","audiobook","audio"].includes(item.media_kind))return resolveAudio(item);return null;}
async function mapLimit<T,R>(items:T[],limit:number,fn:(item:T,index:number)=>Promise<R>):Promise<R[]>{const out=new Array<R>(items.length);let cursor=0;await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{while(true){const index=cursor++;if(index>=items.length)return;out[index]=await fn(items[index],index);}}));return out;}
async function trending(token:string){const data=await tmdb(`/trending/all/day?language=en-US`,token),items=(Array.isArray(data?.results)?data.results:[]).filter((r:any)=>["movie","tv"].includes(r?.media_type)&&r?.adult!==true&&Number.isSafeInteger(r?.id)).slice(0,MAX_TRENDING);const rows=await mapLimit(items,CONCURRENCY,async(r:any,index)=>{const kind:"movie"|"tv"=r.media_type,record=await details(r.id,kind,token);if(!record||record.adult===true)return null;const runtime=kind==="movie"?Number(record.runtime):Number(record.episode_run_time?.[0]);return {source_key:`tmdb:${kind}:${record.id}`,title:titleOf(record,kind),normalized_title:normalise(titleOf(record,kind)),year:yearOf(record,kind),media_kind:kind,tmdb_id:record.id,source:"tmdb",is_catalog_title:false,is_trending:true,trending_rank:index+1,kids_approved:false,kids_age_bands:[],poster_url:fullImage(record.poster_path,"w500"),poster_large_url:fullImage(record.poster_path,"w780"),poster_original_url:fullImage(record.poster_path,"original"),backdrop_url:fullImage(record.backdrop_path,"w1280"),overview:typeof record.overview==="string"?record.overview.trim().slice(0,4000)||null:null,genres:Array.isArray(record.genres)?record.genres.map((g:any)=>String(g?.name||"").trim()).filter(Boolean).slice(0,20):[],runtime_minutes:Number.isFinite(runtime)&&runtime>0&&runtime<=1440?Math.round(runtime):null,content_rating:chooseRating(record,kind),vote_average:Number.isFinite(Number(record.vote_average))?Math.max(0,Math.min(10,Number(record.vote_average))):null,original_language:typeof record.original_language==="string"?record.original_language.slice(0,16):null,...chooseVideo(record.videos,kind),availability:availabilityFrom(record,kind),source_updated_at:new Date().toISOString(),updated_at:new Date().toISOString()};});return rows.filter(Boolean) as any[];}
function mergeRows(catalogRows:any[],trendingRows:any[]){const map=new Map<string,any>();for(const row of [...catalogRows,...trendingRows]){if(!row?.source_key)continue;const prev=map.get(row.source_key);if(!prev){map.set(row.source_key,row);continue;}map.set(row.source_key,{...prev,...row,is_catalog_title:prev.is_catalog_title===true||row.is_catalog_title===true,is_trending:prev.is_trending===true||row.is_trending===true,trending_rank:row.trending_rank??prev.trending_rank??null,kids_approved:prev.kids_approved===true||row.kids_approved===true,kids_age_bands:(prev.kids_age_bands?.length?prev.kids_age_bands:row.kids_age_bands)||[],normalized_title:prev.is_catalog_title?prev.normalized_title:row.normalized_title});}return [...map.values()];}

Deno.serve(async(req)=>{
  if(req.method!=="POST")return json({error:"Method not allowed"},405);const started=Date.now();
  try{const claims=await authorize(req),tmdbToken=Deno.env.get("TMDB_API_KEY");if(!tmdbToken)return json({error:"TMDB_API_KEY is not configured"},503);const body=await req.json().catch(()=>({})),incoming=Array.isArray(body?.catalog)?body.catalog:[],clean=incoming.filter((x:any)=>x&&typeof x.title==="string"&&x.title.trim().length>0&&x.title.length<=240).map((x:any)=>({title:x.title.trim(),year:Number.isInteger(Number(x.year))?Number(x.year):null,media_kind:["movie","tv","music","podcast","audiobook","audio","other"].includes(x.media_kind)?x.media_kind:"other",poster_path:typeof x.poster_path==="string"&&/^\/[A-Za-z0-9_.-]+$/.test(x.poster_path)?x.poster_path:null,homepage_trending:x.homepage_trending===true,kids_approved:x.kids_approved===true,kids_age_bands:Array.isArray(x.kids_age_bands)?x.kids_age_bands.map(String).slice(0,8):[]}));
    const keys=clean.map((x:any)=>normalise(x.title));let existing:any[]=[];if(keys.length){const result=await admin.from("catalog_media_metadata").select("normalized_title,updated_at").in("normalized_title",keys.slice(0,1000));if(result.error)throw result.error;existing=result.data||[];}
    const last=new Map(existing.map((r:any)=>[r.normalized_title,Date.parse(r.updated_at||0)||0]));clean.sort((a:any,b:any)=>(last.get(normalise(a.title))||0)-(last.get(normalise(b.title))||0));const selected=clean.slice(0,MAX_CATALOG_PER_RUN),resolved=await mapLimit(selected,CONCURRENCY,item=>resolveCatalogItem(item,tmdbToken)),catalogRows=resolved.filter(Boolean) as any[],trendingRows=body?.include_trending===false?[]:await trending(tmdbToken),rows=mergeRows(catalogRows,trendingRows);
    if(trendingRows.length){const {error}=await admin.from("catalog_media_metadata").update({is_trending:false,trending_rank:null}).eq("is_trending",true);if(error)throw error;}if(rows.length){const {error}=await admin.from("catalog_media_metadata").upsert(rows,{onConflict:"source_key"});if(error)throw error;}
    const summary={ok:true,requested:clean.length,catalog_attempted:selected.length,catalog_resolved:catalogRows.length,trending_resolved:trendingRows.length,upserted:rows.length,duration_ms:Date.now()-started,ref:String(claims.ref||"")};console.log(JSON.stringify({event:"catalog-media-summary",...summary}));return json(summary);
  }catch(error){console.error(JSON.stringify({event:"catalog-media-failed",duration_ms:Date.now()-started,error:String(error)}));return json({error:"catalog media sync rejected or failed"},403);}
});
