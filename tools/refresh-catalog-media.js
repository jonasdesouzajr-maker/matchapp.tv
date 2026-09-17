#!/usr/bin/env node
/* ============================================================
   MatchApp catalog-media refresh

   Sources
   - TMDB: canonical movie/TV identity, poster/backdrop, metadata, videos,
     trending and regional watch-provider availability (TMDB/JustWatch data).
   - iTunes Search API: artwork + short preview for audio/music entries.

   Writes
   - public.catalog_media_metadata (only with service_role credentials)
   - data/catalog-media-report.json (always; safe build artifact)

   Safety
   - exact normalized title match before accepting a TMDB identity
   - year must agree within 1 year when MatchApp knows it
   - adult TMDB records are always rejected
   - Kids approval comes ONLY from MatchApp's existing curated Kids library
   - --dry-run never writes Supabase
   ============================================================ */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const API = 'https://api.themoviedb.org/3';
const TMDB_READ_TOKEN = process.env.TMDB_READ_TOKEN || '';
const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zkymvqrmbabngsqblyye.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const DRY_RUN = process.argv.includes('--dry-run');
const REGIONS = ['BR', 'US', 'GB', 'PT'];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function normalizeTitle(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}
function slug(value) { return normalizeTitle(value).replace(/\s+/g, '-'); }

function loadMainCatalog() {
  const src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  const start = src.indexOf('const CONTENT_CATALOG');
  const end = src.indexOf('const VERTICAL_DRAMA_TITLES');
  if (start < 0 || end < 0) throw new Error('CONTENT_CATALOG boundaries not found');
  const box = {};
  new Function('exports', src.slice(start, end) + ';exports.value=CONTENT_CATALOG;')(box);
  return box.value.map(x => ({...x, isCatalog:true, kidsApproved:false, kidsAgeBands:[]}));
}

function loadKidsCatalog() {
  const src = fs.readFileSync(path.join(ROOT, 'kids/kids.js'), 'utf8');
  const marker = 'const LIBRARY = [';
  const start = src.indexOf(marker);
  if (start < 0) throw new Error('Kids LIBRARY not found');
  const tail = src.slice(start + 'const LIBRARY = '.length);
  let depth = 0, quote = null, escaped = false, end = -1;
  for (let i = 0; i < tail.length; i++) {
    const ch = tail[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '[') depth++;
    else if (ch === ']') { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  if (end < 0) throw new Error('Kids LIBRARY array end not found');
  const list = new Function(`return (${tail.slice(0, end)});`)();
  return list.map(x => ({
    title:x.title, year:x.year ? Number(x.year) : null, type:x.type, platform:x.platform,
    cats:Array.isArray(x.cats)?x.cats:[], synopsis:x.desc || '', tmdb:x.tmdb !== false,
    isCatalog:true, kidsApproved:true, kidsAgeBands:Array.isArray(x.ages)?x.ages:[]
  }));
}

function mergeCatalogs(main, kids) {
  const map = new Map();
  for (const item of [...main, ...kids]) {
    const key = `${normalizeTitle(item.title)}::${item.year || ''}`;
    const prior = map.get(key);
    if (!prior) map.set(key, item);
    else map.set(key, {
      ...prior,
      kidsApproved: prior.kidsApproved || item.kidsApproved,
      kidsAgeBands: Array.from(new Set([...(prior.kidsAgeBands || []), ...(item.kidsAgeBands || [])])),
      cats: Array.from(new Set([...(prior.cats || []), ...(item.cats || [])])),
      type: prior.type || item.type,
      synopsis: prior.synopsis || item.synopsis,
      tmdb: prior.tmdb !== false && item.tmdb !== false
    });
  }
  return [...map.values()];
}

function kindFor(item) {
  const cats = (item.cats || []).map(String);
  const text = `${item.type || ''} ${cats.join(' ')}`.toLowerCase();
  if (/podcast|music|album|single|playlist|audiobook|spotify/.test(text)) return 'audio';
  if (/^movie$/.test(String(item.type || '').toLowerCase()) || cats.some(c => /^(movie|short film)$/i.test(c))) return 'movie';
  if (/series|drama|novela|telenovela|anime|reality|documentary/.test(text)) return 'tv';
  return item.tmdb === false ? 'audio' : 'tv';
}

async function tmdb(pathname) {
  const headers = {Accept:'application/json'};
  let url = `${API}${pathname}`;
  if (TMDB_READ_TOKEN) headers.Authorization = `Bearer ${TMDB_READ_TOKEN}`;
  else if (TMDB_API_KEY) url += `${pathname.includes('?')?'&':'?'}api_key=${encodeURIComponent(TMDB_API_KEY)}`;
  else throw new Error('Missing TMDB_READ_TOKEN / TMDB_API_KEY');
  const res = await fetch(url, {headers});
  if (!res.ok) throw new Error(`TMDB ${res.status} for ${pathname.split('?')[0]}`);
  return res.json();
}

function image(pathname, size) { return pathname ? `https://image.tmdb.org/t/p/${size}${pathname}` : null; }
function exactTitle(item, row, kind) {
  const names = kind === 'movie' ? [row.title,row.original_title] : [row.name,row.original_name];
  if (!names.some(n => normalizeTitle(n) === normalizeTitle(item.title))) return false;
  if (row.adult === true) return false;
  if (item.year) {
    const date = kind === 'movie' ? row.release_date : row.first_air_date;
    const y = Number(String(date || '').slice(0,4));
    if (!y || Math.abs(y - Number(item.year)) > 1) return false;
  }
  return true;
}

async function findTmdb(item, kind) {
  const q = encodeURIComponent(item.title);
  const year = item.year ? (kind === 'movie' ? `&primary_release_year=${item.year}` : `&first_air_date_year=${item.year}`) : '';
  const data = await tmdb(`/search/${kind}?query=${q}${year}&include_adult=false&language=en-US`);
  return (data.results || []).find(r => exactTitle(item, r, kind)) || null;
}

function selectCertification(details, kind) {
  const bag = kind === 'movie' ? details.release_dates?.results : details.content_ratings?.results;
  if (!Array.isArray(bag)) return null;
  for (const region of ['US','BR','GB','PT']) {
    const row = bag.find(x => x.iso_3166_1 === region);
    if (!row) continue;
    if (kind === 'movie') {
      const cert = (row.release_dates || []).map(x => x.certification).find(Boolean);
      if (cert) return cert;
    } else if (row.rating) return row.rating;
  }
  return null;
}

function selectVideo(details) {
  const items = (details.videos?.results || []).filter(v => v && v.site === 'YouTube' && /^[A-Za-z0-9_-]{6,}$/.test(String(v.key || '')));
  const rank = v => (v.official ? 100 : 0) + ({Trailer:40,Teaser:30,Clip:20,Featurette:10}[v.type] || 0) + (v.size || 0)/100;
  items.sort((a,b)=>rank(b)-rank(a));
  const v = items[0];
  if (!v) return {preview_kind:null,preview_provider:null,preview_url:null,preview_embed_url:null};
  return {
    preview_kind:'video', preview_provider:'YouTube / TMDB',
    preview_url:`https://www.youtube.com/watch?v=${v.key}`,
    preview_embed_url:`https://www.youtube-nocookie.com/embed/${v.key}`
  };
}

function providerPack(details) {
  const src = details['watch/providers']?.results || {};
  const out = {};
  for (const region of REGIONS) {
    const r = src[region]; if (!r) continue;
    const pack = {};
    if (Array.isArray(r.flatrate) && r.flatrate.length) pack.stream = r.flatrate.map(x => x.provider_name);
    if (Array.isArray(r.rent) && r.rent.length) pack.rent = r.rent.map(x => x.provider_name);
    if (Array.isArray(r.buy) && r.buy.length) pack.buy = r.buy.map(x => x.provider_name);
    if (r.link) pack.link = r.link;
    if (Object.keys(pack).length) out[region] = pack;
  }
  return out;
}

async function buildTmdbRow(item, trendingRank=null) {
  const kind = kindFor(item);
  if (!['movie','tv'].includes(kind) || item.tmdb === false) return null;
  const hit = await findTmdb(item, kind); await sleep(90);
  if (!hit) return null;
  const append = kind === 'movie' ? 'videos,release_dates,watch/providers' : 'videos,content_ratings,watch/providers';
  const details = await tmdb(`/${kind}/${hit.id}?language=en-US&append_to_response=${encodeURIComponent(append)}`); await sleep(90);
  if (!details || details.adult === true || !exactTitle(item, details, kind)) return null;
  const date = kind === 'movie' ? details.release_date : details.first_air_date;
  const preview = selectVideo(details);
  return {
    source_key:`tmdb:${kind}:${details.id}`,
    title: kind === 'movie' ? details.title : details.name,
    normalized_title:normalizeTitle(item.title),
    year:Number(String(date || item.year || '').slice(0,4)) || null,
    media_kind:kind,
    tmdb_id:details.id,
    source:'TMDB',
    is_catalog_title:item.isCatalog === true,
    is_trending:trendingRank != null,
    trending_rank:trendingRank,
    kids_approved:item.kidsApproved === true,
    kids_age_bands:item.kidsApproved ? (item.kidsAgeBands || []) : [],
    poster_url:image(details.poster_path,'w500'),
    poster_large_url:image(details.poster_path,'w780'),
    poster_original_url:image(details.poster_path,'original'),
    backdrop_url:image(details.backdrop_path,'w1280'),
    overview:details.overview || item.synopsis || null,
    genres:(details.genres || []).map(g => g.name).filter(Boolean),
    runtime_minutes:kind === 'movie' ? (details.runtime || null) : ((details.episode_run_time || [])[0] || null),
    content_rating:selectCertification(details, kind),
    vote_average:Number.isFinite(details.vote_average) ? details.vote_average : null,
    original_language:details.original_language || null,
    ...preview,
    availability:providerPack(details),
    source_updated_at:new Date().toISOString(),
    updated_at:new Date().toISOString()
  };
}

async function itunesAudio(item) {
  const term = encodeURIComponent(item.title);
  const res = await fetch(`https://itunes.apple.com/search?term=${term}&limit=12&media=music`);
  if (!res.ok) return null;
  const data = await res.json();
  const hit = (data.results || []).find(r => [r.trackName,r.collectionName,r.artistName].some(n => normalizeTitle(n) === normalizeTitle(item.title))) || null;
  if (!hit) return null;
  const artwork = String(hit.artworkUrl100 || '').replace(/100x100bb\./,'600x600bb.');
  return {
    source_key:`itunes:${hit.trackId || hit.collectionId || slug(item.title)}`,
    title:item.title, normalized_title:normalizeTitle(item.title), year:item.year || null,
    media_kind:'audio', tmdb_id:null, source:'iTunes Search API', is_catalog_title:true,
    is_trending:false, trending_rank:null, kids_approved:item.kidsApproved === true,
    kids_age_bands:item.kidsApproved ? (item.kidsAgeBands || []) : [],
    poster_url:artwork || null, poster_large_url:artwork || null, poster_original_url:artwork || null,
    backdrop_url:null, overview:item.synopsis || null, genres:[hit.primaryGenreName].filter(Boolean),
    runtime_minutes:null, content_rating:null, vote_average:null, original_language:null,
    preview_kind:hit.previewUrl ? 'audio' : null, preview_provider:hit.previewUrl ? 'Apple / iTunes' : null,
    preview_url:hit.previewUrl || null, preview_embed_url:null, availability:{},
    source_updated_at:new Date().toISOString(), updated_at:new Date().toISOString()
  };
}

async function fetchTrending() {
  const out=[];
  for (const kind of ['movie','tv']) {
    const data = await tmdb(`/trending/${kind}/day?language=en-US`); await sleep(90);
    for (let i=0;i<(data.results || []).slice(0,20).length;i++) {
      const r=data.results[i]; if (r.adult === true) continue;
      const title=kind==='movie'?r.title:r.name;
      out.push({title,year:Number(String(kind==='movie'?r.release_date:r.first_air_date).slice(0,4))||null,type:kind,cats:[kind],isCatalog:false,kidsApproved:false,kidsAgeBands:[],tmdb:true,trendingRank:(kind==='movie'?0:20)+i+1});
    }
  }
  return out;
}

async function upsertRows(rows) {
  if (DRY_RUN) return;
  if (!SERVICE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for live refresh');
  const base = `${SUPABASE_URL}/rest/v1/catalog_media_metadata`;
  await fetch(`${base}?is_trending=eq.true`, {method:'PATCH',headers:{apikey:SERVICE_KEY,Authorization:`Bearer ${SERVICE_KEY}`,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({is_trending:false,trending_rank:null})}).then(async r=>{if(!r.ok)throw new Error(`Supabase trending reset ${r.status}: ${await r.text()}`)});
  for (let i=0;i<rows.length;i+=100) {
    const chunk=rows.slice(i,i+100);
    const res=await fetch(`${base}?on_conflict=source_key`,{method:'POST',headers:{apikey:SERVICE_KEY,Authorization:`Bearer ${SERVICE_KEY}`,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(chunk)});
    if(!res.ok) throw new Error(`Supabase upsert ${res.status}: ${await res.text()}`);
  }
}

async function main() {
  const started=Date.now();
  if (!TMDB_READ_TOKEN && !TMDB_API_KEY) throw new Error('TMDB credential missing');
  const catalog=mergeCatalogs(loadMainCatalog(),loadKidsCatalog());
  const trending=await fetchTrending();
  const combined=[...catalog,...trending];
  const rows=[]; const failures=[]; let tmdbCount=0,audioCount=0;
  for (const item of combined) {
    try {
      const kind=kindFor(item);
      const row=kind==='audio' ? await itunesAudio(item) : await buildTmdbRow(item,item.trendingRank ?? null);
      if (row) { rows.push(row); if(kind==='audio')audioCount++;else tmdbCount++; }
      else failures.push({title:item.title,reason:'no confident metadata match'});
    } catch (e) { failures.push({title:item.title,reason:e.message || String(e)}); }
  }
  const deduped=[...new Map(rows.map(r=>[r.source_key,r])).values()];
  await upsertRows(deduped);
  const report={generated:new Date().toISOString(),dryRun:DRY_RUN,durationMs:Date.now()-started,catalogInputs:catalog.length,trendingInputs:trending.length,rows:deduped.length,tmdbRows:tmdbCount,audioRows:audioCount,withPoster:deduped.filter(r=>r.poster_large_url||r.poster_url).length,withPreview:deduped.filter(r=>r.preview_url||r.preview_embed_url).length,kidsApproved:deduped.filter(r=>r.kids_approved).length,failures:failures.slice(0,100)};
  fs.mkdirSync(path.join(ROOT,'data'),{recursive:true});
  fs.writeFileSync(path.join(ROOT,'data','catalog-media-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,`## MatchApp media refresh\n- Mode: ${DRY_RUN?'dry run':'live upsert'}\n- Inputs: ${report.catalogInputs} catalog + ${report.trendingInputs} trending\n- Rows: ${report.rows}\n- Posters: ${report.withPoster}\n- Previews: ${report.withPreview}\n- Kids-approved rows: ${report.kidsApproved}\n- Failures/skips: ${failures.length}\n- Duration: ${(report.durationMs/1000).toFixed(1)}s\n`);
}

main().catch(err=>{console.error(err.stack||err);process.exit(1)});
