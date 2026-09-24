#!/usr/bin/env node
'use strict';

/*
 * Builds the server-side enrichment input from MatchApp's existing catalogues
 * and invokes the existing Supabase catalog-media-ingest function using
 * GitHub's short-lived OIDC token. TMDB and Supabase admin credentials stay
 * inside Supabase; GitHub stores no long-lived backend secret.
 */
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const ROOT=path.join(__dirname,'..');
const SYNC_URL='https://zkymvqrmbabngsqblyye.supabase.co/functions/v1/catalog-media-ingest';
const AUDIENCE='matchapp-supabase-catalog-media';
const dry=process.argv.includes('--dry-run');

function read(rel){return fs.readFileSync(path.join(ROOT,rel),'utf8');}
function normalize(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');}
function parseArray(source,re,label){const m=source.match(re);if(!m)throw new Error(`${label} array not found`);return vm.runInNewContext(m[1],Object.create(null),{timeout:1500});}
function mainKind(entry){
  const cats=Array.isArray(entry.cats)?entry.cats.map(String):[];
  const joined=cats.join(' ').toLowerCase();
  if(cats.some(c=>/^(movie|short film)$/i.test(c))||/\b(movie|film|cinema|bollywood|nollywood)\b/.test(joined))return 'movie';
  if(/series|drama|novela|telenovela|dizi|anime|reality|documentary series/.test(joined))return 'tv';
  if(/podcast/.test(joined))return 'podcast';
  if(/audiobook/.test(joined))return 'audiobook';
  if(/playlist|album|single|music|classical|gospel|song|radio|concert/.test(joined))return 'music';
  return 'other';
}
function kidsKind(entry){
  const t=String(entry.type||'').toLowerCase();
  if(t==='movie'||/movie|film/.test(t))return 'movie';
  if(t==='tv'||/series|show|episode/.test(t))return 'tv';
  const cats=Array.isArray(entry.cats)?entry.cats.join(' ').toLowerCase():'';
  if(/movie|film/.test(cats))return 'movie';
  return 'tv';
}
function homepageTrending(){
  const html=read('index.html');
  const rail=html.match(/<div class="marquee-track" id="marquee-track">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/)?.[1]||'';
  const rows=[],seen=new Set();
  const re=/<div class="marquee-item"[^>]*>[\s\S]*?<img[^>]*data-title="([^"]+)"[^>]*src="([^"]+)"/g;
  let m;
  while((m=re.exec(rail))&&rows.length<10){
    const title=m[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&').trim();
    const key=normalize(title);if(!key||seen.has(key))continue;seen.add(key);
    const poster=String(m[2]||'').match(/image\.tmdb\.org\/t\/p\/(?:w\d+|original)(\/[^?"']+)/i)?.[1]||null;
    rows.push({title,year:null,media_kind:'other',poster_path:poster,homepage_trending:true,kids_approved:false,kids_age_bands:[]});
  }
  if(rows.length!==10)throw new Error(`Expected exactly 10 homepage trending titles, found ${rows.length}`);
  return rows;
}
function buildCatalog(){
  const content=parseArray(read('app.js'),/const CONTENT_CATALOG = (\[[\s\S]*?\n\]);/,'CONTENT_CATALOG');
  const kids=parseArray(read('kids/kids.js'),/const LIBRARY = (\[[\s\S]*?\n  \]);/,'Kids LIBRARY');
  const availability=JSON.parse(read('data/availability.json'));
  const exactIds=new Map();
  for(const [title,row] of Object.entries(availability?.titles||{})){
    const tmdbId=Number(row?.tmdbId),kind=row?.kind;
    if(Number.isSafeInteger(tmdbId)&&tmdbId>0&&['movie','tv'].includes(kind)){
      exactIds.set(normalize(title),{tmdb_id:tmdbId,media_kind:kind,year:Number.isInteger(Number(row?.year))?Number(row.year):null});
    }
  }
  const kidIndex=new Map();
  for(const k of kids){if(!k?.title)continue;const kind=kidsKind(k),year=Number.isInteger(Number(k.year))?Number(k.year):null,ages=Array.isArray(k.ages)?k.ages.map(String):[];kidIndex.set(`${normalize(k.title)}::${year||''}::${kind}`,ages);}
  const out=[],seen=new Set();
  for(const entry of content){
    if(!entry?.title)continue;
    let kind=mainKind(entry);
    const exact=exactIds.get(normalize(entry.title));
    if(exact&&['movie','tv'].includes(exact.media_kind))kind=exact.media_kind;
    if(kind==='other')continue;
    const year=Number.isInteger(Number(entry.year))?Number(entry.year):(exact?.year||null);
    const key=`${normalize(entry.title)}::${year||''}::${kind}`;
    if(seen.has(key))continue;
    seen.add(key);
    const ages=kidIndex.get(key)||[];
    out.push({
      title:String(entry.title),year,media_kind:kind,
      tmdb_id:exact?.tmdb_id||null,
      kids_approved:ages.length>0,kids_age_bands:ages
    });
  }
  for(const k of kids){
    if(!k?.title)continue;
    let kind=kidsKind(k);
    const exact=exactIds.get(normalize(k.title));
    if(exact&&['movie','tv'].includes(exact.media_kind))kind=exact.media_kind;
    const year=Number.isInteger(Number(k.year))?Number(k.year):(exact?.year||null);
    const key=`${normalize(k.title)}::${year||''}::${kind}`;
    if(seen.has(key))continue;
    seen.add(key);
    out.push({
      title:String(k.title),year,media_kind:kind,
      tmdb_id:exact?.tmdb_id||null,
      kids_approved:true,kids_age_bands:Array.isArray(k.ages)?k.ages.map(String):[]
    });
  }
  // Daily homepage titles join the same enrichment stream. When one already
  // has a verified availability identity, carry the numeric ID through too.
  for(const t of homepageTrending()){
    const duplicate=[...seen].some(k=>k.startsWith(normalize(t.title)+'::'));
    if(duplicate)continue;
    const exact=exactIds.get(normalize(t.title));
    if(exact){t.tmdb_id=exact.tmdb_id;t.media_kind=exact.media_kind;t.year=t.year||exact.year;}
    seen.add(`${normalize(t.title)}::${t.year||''}::${t.media_kind}`);
    out.push(t);
  }
  return out;
}
async function oidcToken(){
  const base=process.env.ACTIONS_ID_TOKEN_REQUEST_URL,bearer=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;if(!base||!bearer)throw new Error('GitHub OIDC environment is unavailable; run in GitHub Actions with id-token: write');
  const url=base+(base.includes('?')?'&':'?')+'audience='+encodeURIComponent(AUDIENCE),res=await fetch(url,{headers:{authorization:`Bearer ${bearer}`,accept:'application/json'}});if(!res.ok)throw new Error(`OIDC token request failed: ${res.status}`);const payload=await res.json();if(!payload?.value)throw new Error('OIDC response did not include a token');return payload.value;
}
function summaryMarkdown(catalog,result){return `## MatchApp catalog media refresh\n\n- Input titles: ${catalog.length}\n- Catalog attempted: ${result.catalog_attempted??'n/a'}\n- Catalog resolved: ${result.catalog_resolved??'n/a'}\n- Trending resolved: ${result.trending_resolved??'n/a'}\n- Rows upserted: ${result.upserted??'n/a'}\n- Duration: ${result.duration_ms??'n/a'} ms\n`;}
async function main(){
  const catalog=buildCatalog(),counts=catalog.reduce((m,x)=>(m[x.media_kind]=(m[x.media_kind]||0)+1,m),{});
  if(dry){console.log(JSON.stringify({ok:true,dry_run:true,titles:catalog.length,kids_approved:catalog.filter(x=>x.kids_approved).length,homepage_trending:catalog.filter(x=>x.homepage_trending).length,by_kind:counts},null,2));return;}
  const token=await oidcToken(),res=await fetch(SYNC_URL,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json',accept:'application/json'},body:JSON.stringify({catalog,include_trending:true})}),text=await res.text();let result;try{result=JSON.parse(text);}catch{throw new Error(`catalog-media-ingest returned non-JSON (${res.status})`);}if(!res.ok||result?.ok!==true)throw new Error(`catalog-media-ingest failed (${res.status}): ${result?.error||text.slice(0,200)}`);console.log(JSON.stringify(result,null,2));if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,summaryMarkdown(catalog,result));
}
main().catch(err=>{console.error(`[catalog-media-sync] ${err?.stack||err}`);process.exitCode=1;});
