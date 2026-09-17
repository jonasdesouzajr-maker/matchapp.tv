#!/usr/bin/env node
'use strict';

/*
 * Builds the server-side enrichment input from MatchApp's existing catalogues
 * and invokes Supabase catalog-sync using GitHub's short-lived OIDC token.
 * No TMDB token or Supabase admin key is stored in GitHub.
 */
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const ROOT=path.join(__dirname,'..');
const SYNC_URL='https://zkymvqrmbabngsqblyye.supabase.co/functions/v1/catalog-sync';
const AUDIENCE='matchapp-catalog-sync';
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
function buildCatalog(){
  const app=read('app.js');
  const content=parseArray(app,/const CONTENT_CATALOG = (\[[\s\S]*?\n\]);/,'CONTENT_CATALOG');
  const kidsSource=read('kids/kids.js');
  const kids=parseArray(kidsSource,/const LIBRARY = (\[[\s\S]*?\n  \]);/,'Kids LIBRARY');
  const kidIndex=new Map();
  for(const k of kids){
    if(!k?.title)continue;
    const kind=kidsKind(k),year=Number.isInteger(Number(k.year))?Number(k.year):null;
    const ages=Array.isArray(k.ages)?k.ages.map(String):[];
    kidIndex.set(`${normalize(k.title)}::${year||''}::${kind}`,ages);
  }
  const out=[],seen=new Set();
  for(const entry of content){
    if(!entry?.title)continue;
    const kind=mainKind(entry);if(kind==='other')continue;
    const year=Number.isInteger(Number(entry.year))?Number(entry.year):null;
    const key=`${normalize(entry.title)}::${year||''}::${kind}`;
    if(seen.has(key))continue;seen.add(key);
    const ages=kidIndex.get(key)||[];
    out.push({title:String(entry.title),year,media_kind:kind,kids_approved:ages.length>0,kids_age_bands:ages});
  }
  // Keep Kids-only titles eligible even if they are not in the adult/general catalogue.
  for(const k of kids){
    if(!k?.title)continue;
    const kind=kidsKind(k),year=Number.isInteger(Number(k.year))?Number(k.year):null;
    const key=`${normalize(k.title)}::${year||''}::${kind}`;if(seen.has(key))continue;seen.add(key);
    out.push({title:String(k.title),year,media_kind:kind,kids_approved:true,kids_age_bands:Array.isArray(k.ages)?k.ages.map(String):[]});
  }
  return out;
}

async function oidcToken(){
  const base=process.env.ACTIONS_ID_TOKEN_REQUEST_URL, bearer=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if(!base||!bearer)throw new Error('GitHub OIDC environment is unavailable; run this in GitHub Actions with id-token: write');
  const url=base+(base.includes('?')?'&':'?')+'audience='+encodeURIComponent(AUDIENCE);
  const res=await fetch(url,{headers:{authorization:`Bearer ${bearer}`,accept:'application/json'}});
  if(!res.ok)throw new Error(`OIDC token request failed: ${res.status}`);
  const payload=await res.json();if(!payload?.value)throw new Error('OIDC response did not include a token');return payload.value;
}

function summaryMarkdown(catalog,result){
  return `## MatchApp catalog media refresh\n\n- Input titles: ${catalog.length}\n- Catalog attempted: ${result.catalog_attempted??'n/a'}\n- Catalog resolved: ${result.catalog_resolved??'n/a'}\n- Trending resolved: ${result.trending_resolved??'n/a'}\n- Rows upserted: ${result.upserted??'n/a'}\n- Duration: ${result.duration_ms??'n/a'} ms\n`;
}
async function main(){
  const catalog=buildCatalog();
  const counts=catalog.reduce((m,x)=>(m[x.media_kind]=(m[x.media_kind]||0)+1,m),{});
  if(dry){console.log(JSON.stringify({ok:true,dry_run:true,titles:catalog.length,kids_approved:catalog.filter(x=>x.kids_approved).length,by_kind:counts},null,2));return;}
  const token=await oidcToken();
  const res=await fetch(SYNC_URL,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json',accept:'application/json'},body:JSON.stringify({catalog,include_trending:true})});
  const text=await res.text();let result;try{result=JSON.parse(text);}catch{throw new Error(`catalog-sync returned non-JSON (${res.status})`);}
  if(!res.ok||result?.ok!==true)throw new Error(`catalog-sync failed (${res.status}): ${result?.error||text.slice(0,200)}`);
  console.log(JSON.stringify(result,null,2));
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,summaryMarkdown(catalog,result));
}
main().catch(err=>{console.error(`[catalog-sync] ${err?.stack||err}`);process.exitCode=1;});
