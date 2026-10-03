import fs from 'node:fs';
import path from 'node:path';

const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const CONFIG_FILES=['ai-check.html','reset.html','billing-check.html'];

function readPublicConfig(){
  for(const rel of CONFIG_FILES){
    const file=path.join(ROOT,rel);
    if(!fs.existsSync(file))continue;
    const src=fs.readFileSync(file,'utf8');
    const url=src.match(/SUPABASE_URL\s*=\s*["'](https:\/\/[^"']+\.supabase\.co)["']/)?.[1];
    const key=src.match(/SUPABASE_ANON_KEY\s*=\s*["']([^"']+)["']/)?.[1];
    if(url&&key)return {url,key};
  }
  throw new Error('Public Supabase client config not found in the existing browser config files.');
}

function assertFresh(rows,maxAgeHours=48){
  if(!Array.isArray(rows)||rows.length<8)throw new Error('Trending metadata returned fewer than 8 usable titles.');
  const newest=Math.max(...rows.map(r=>Date.parse(r.updated_at||0)).filter(Number.isFinite));
  if(!Number.isFinite(newest))throw new Error('Trending metadata has no valid update timestamp.');
  const age=(Date.now()-newest)/36e5;
  if(age>maxAgeHours)throw new Error(`Trending metadata is stale (${age.toFixed(1)}h old; limit ${maxAgeHours}h).`);
}

export function platformNames(row){
  const out=[];
  const a=row?.availability&&typeof row.availability==='object'?row.availability:{};
  for(const region of ['BR','US','GB','PT']){
    for(const name of a?.[region]?.stream||[])if(name&&!out.includes(name))out.push(name);
  }
  return out;
}

export function primaryPlatform(row){
  const names=platformNames(row);
  if(names.length)return names[0];
  const a=row?.availability&&typeof row.availability==='object'?row.availability:{};
  const cinema=['BR','US','GB','PT'].some(region=>Boolean(a?.[region]?.cinema_release_date));
  return cinema?'Cinemas':'';
}

export function primaryWatchUrl(row){
  const a=row?.availability&&typeof row.availability==='object'?row.availability:{};
  for(const region of ['BR','US','GB','PT'])if(/^https:\/\//.test(String(a?.[region]?.link||'')))return a[region].link;
  return /^https:\/\//.test(String(a?.source_page_url||''))?a.source_page_url:'';
}

export async function fetchLiveTrending(limit=20){
  const {url,key}=readPublicConfig();
  const fields=[
    'trending_rank','title','year','media_kind','tmdb_id','poster_url','poster_large_url','poster_original_url',
    'overview','genres','runtime_minutes','content_rating','vote_average','original_language','origin_countries',
    'cast_members','preview_url','preview_embed_url','availability','source_updated_at','updated_at'
  ].join(',');
  const endpoint=new URL('/rest/v1/catalog_media_metadata',url);
  endpoint.searchParams.set('is_trending','eq.true');
  endpoint.searchParams.set('select',fields);
  endpoint.searchParams.set('order','trending_rank.asc');
  endpoint.searchParams.set('limit',String(Math.max(8,Math.min(40,limit))));
  const res=await fetch(endpoint,{headers:{apikey:key,authorization:`Bearer ${key}`,accept:'application/json'}});
  if(!res.ok)throw new Error(`Supabase trending fetch failed: HTTP ${res.status}`);
  const raw=await res.json();
  const rows=(Array.isArray(raw)?raw:[]).filter(row=>
    Number.isInteger(Number(row?.trending_rank))&&
    row?.title&&
    ['movie','tv'].includes(row?.media_kind)&&
    Number.isInteger(Number(row?.tmdb_id))&&
    /^https:\/\/image\.tmdb\.org\/t\/p\/(?:w\d+|original)\/[A-Za-z0-9_.-]+$/.test(String(row?.poster_large_url||row?.poster_url||''))
  );
  assertFresh(rows);
  return rows.sort((a,b)=>Number(a.trending_rank)-Number(b.trending_rank));
}

export function countryName(code){
  return ({BR:'Brazil',US:'United States',GB:'United Kingdom',AU:'Australia',CA:'Canada',JP:'Japan',KR:'South Korea',MX:'Mexico',ES:'Spain',DE:'Germany',FR:'France',IT:'Italy',IN:'India',TR:'Turkey',SA:'Saudi Arabia',CN:'China',TW:'Taiwan',TH:'Thailand'})[code]||code||'';
}

export function youtubeId(url){
  return String(url||'').match(/[?&]v=([A-Za-z0-9_-]{6,32})/)?.[1]||'';
}
