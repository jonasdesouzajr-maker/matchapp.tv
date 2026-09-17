#!/usr/bin/env node
'use strict';

/*
 * MatchApp public media enrichment pipeline.
 *
 * Sources:
 *   - TMDB API: film/TV identity, artwork, metadata, videos, trending and
 *     regional watch-provider data (TMDB attributes provider data to JustWatch).
 *   - Apple iTunes Search API: conservative exact-match audio artwork/previews.
 *
 * Deliberately NOT implemented: HTML scraping of JustWatch or other services.
 * The sync never inserts a remote title into CONTENT_CATALOG and never approves
 * Kids content. `kids_approved` is derived only from kids/kids.js.
 */

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const TMDB = 'https://api.themoviedb.org/3';
const TMDB_READ_TOKEN = process.env.TMDB_READ_TOKEN || '';
const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const REGIONS = ['BR', 'US', 'GB', 'PT'];
const DELAY_MS = Number(process.env.MATCHAPP_SYNC_DELAY_MS || 90);
const TRENDING_PER_KIND = Math.min(20, Math.max(5, Number(process.env.MATCHAPP_TRENDING_LIMIT || 20)));
const startedAt = new Date();

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const norm = value => String(value || '').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const compact = value => norm(value).replace(/\s+/g, '');

function requireConfig() {
  const missing = [];
  if (!TMDB_READ_TOKEN && !TMDB_API_KEY) missing.push('TMDB_READ_TOKEN or TMDB_API_KEY');
  if (!SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (missing.length) throw new Error(`Missing required environment: ${missing.join(', ')}`);
}

function loadCatalog() {
  const src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  const m = src.match(/const CONTENT_CATALOG = (\[[\s\S]*?\n\]);/);
  if (!m) throw new Error('CONTENT_CATALOG could not be parsed');
  return vm.runInNewContext(m[1], {}, { timeout: 1500 });
}

function loadKids() {
  const src = fs.readFileSync(path.join(ROOT, 'kids/kids.js'), 'utf8');
  const m = src.match(/const LIBRARY = (\[[\s\S]*?\n  \]);/);
  if (!m) throw new Error('Kids LIBRARY could not be parsed');
  return vm.runInNewContext(m[1], {}, { timeout: 1500 });
}

const VIDEO_CATS = new Set(['movie','series','K-drama','anime','documentary','novela','telenovela','reality show','limited series','dizi']);
const AUDIO_RE = /podcast|playlist|single|music album|audiobook|music|classical|gospel|radio/i;
function catalogKind(entry) {
  const cats = Array.isArray(entry.cats) ? entry.cats : [];
  if (cats.some(c => /^movie$/i.test(c))) return 'movie';
  if (cats.some(c => VIDEO_CATS.has(c))) return 'tv';
  if (AUDIO_RE.test(cats.join(' ')) || /spotify|apple podcasts|audible|youtube music/i.test(String(entry.platform || ''))) return 'audio';
  return 'other';
}

async function tmdb(pathname) {
  const headers = { Accept: 'application/json' };
  let url = `${TMDB}${pathname}`;
  if (TMDB_READ_TOKEN) headers.Authorization = `Bearer ${TMDB_READ_TOKEN}`;
  else url += `${pathname.includes('?') ? '&' : '?'}api_key=${encodeURIComponent(TMDB_API_KEY)}`;
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`TMDB ${pathname.split('?')[0]} -> ${res.status}`);
  return res.json();
}

function exactHit(results, title, year, kind) {
  const wanted = compact(title);
  const acceptable = (results || []).filter(r => compact(kind === 'movie' ? r.title : r.name) === wanted || compact(kind === 'movie' ? r.original_title : r.original_name) === wanted);
  if (!acceptable.length) return null;
  if (!year) return acceptable[0];
  return acceptable.find(r => {
    const date = kind === 'movie' ? r.release_date : r.first_air_date;
    const y = Number(String(date || '').slice(0, 4));
    return y && Math.abs(y - Number(year)) <= 1;
  }) || null;
}

async function resolveCatalogVideo(entry, kind) {
  const q = encodeURIComponent(entry.title);
  const year = Number(entry.year) || 0;
  const yearParam = year ? (kind === 'movie' ? `&primary_release_year=${year}` : `&first_air_date_year=${year}`) : '';
  const search = await tmdb(`/search/${kind}?query=${q}${yearParam}&include_adult=false&language=en-US`);
  const hit = exactHit(search.results, entry.title, year, kind);
  if (!hit || hit.adult === true || !Number.isSafeInteger(hit.id)) return null;
  await sleep(DELAY_MS);
  return fetchTmdbDetails(hit.id, kind, { catalogEntry: entry });
}

function chooseRating(details, kind) {
  if (kind === 'movie') {
    const groups = Array.isArray(details.release_dates?.results) ? details.release_dates.results : [];
    for (const region of ['US','BR','GB','PT']) {
      const group = groups.find(x => x.iso_3166_1 === region);
      const cert = group?.release_dates?.map(x => String(x.certification || '').trim()).find(Boolean);
      if (cert) return cert;
    }
  } else {
    const groups = Array.isArray(details.content_ratings?.results) ? details.content_ratings.results : [];
    for (const region of ['US','BR','GB','PT']) {
      const cert = groups.find(x => x.iso_3166_1 === region)?.rating;
      if (cert) return String(cert).trim();
    }
  }
  return null;
}

function chooseVideo(details, kind) {
  const videos = (Array.isArray(details.videos?.results) ? details.videos.results : [])
    .filter(v => v && v.site === 'YouTube' && /^[A-Za-z0-9_-]{6,20}$/.test(String(v.key || '')));
  const order = kind === 'tv' ? ['Clip','Trailer','Teaser'] : ['Trailer','Teaser','Clip'];
  videos.sort((a,b) => {
    const official = Number(Boolean(b.official)) - Number(Boolean(a.official));
    if (official) return official;
    const type = order.indexOf(a.type) - order.indexOf(b.type);
    if (type) return type;
    return String(b.published_at || '').localeCompare(String(a.published_at || ''));
  });
  const pick = videos.find(v => order.includes(v.type)) || videos[0];
  if (!pick) return { preview_kind:null, preview_provider:null, preview_url:null, preview_embed_url:null };
  return {
    preview_kind:'video', preview_provider:'YouTube',
    preview_url:`https://www.youtube.com/watch?v=${pick.key}`,
    preview_embed_url:`https://www.youtube-nocookie.com/embed/${pick.key}?rel=0`
  };
}

async function providerData(id, kind) {
  const data = await tmdb(`/${kind}/${id}/watch/providers`);
  const out = {};
  for (const region of REGIONS) {
    const r = data?.results?.[region];
    if (!r) continue;
    const item = {};
    if (Array.isArray(r.flatrate)) item.stream = r.flatrate.map(p => p.provider_name).filter(Boolean);
    if (Array.isArray(r.rent)) item.rent = r.rent.map(p => p.provider_name).filter(Boolean);
    if (Array.isArray(r.buy)) item.buy = r.buy.map(p => p.provider_name).filter(Boolean);
    if (typeof r.link === 'string' && /^https:\/\//.test(r.link)) item.link = r.link;
    if (Object.keys(item).length) out[region] = item;
  }
  return out;
}

function kidsApproval(title, year, kind, kids) {
  const expected = kind === 'movie' ? 'movie' : 'series';
  const hit = kids.find(item => compact(item.title) === compact(title)
    && (!year || !item.year || Math.abs(Number(item.year) - Number(year)) <= 1)
    && (item.type === expected || (kind === 'tv' && item.type === 'show')));
  return hit ? { kids_approved:true, kids_age_bands:Array.isArray(hit.ages) ? hit.ages : [] } : { kids_approved:false, kids_age_bands:[] };
}

async function fetchTmdbDetails(id, kind, context={}) {
  const append = kind === 'movie' ? 'videos,release_dates' : 'videos,content_ratings';
  const d = await tmdb(`/${kind}/${id}?language=en-US&append_to_response=${append}`);
  if (!d || d.adult === true) return null;
  await sleep(DELAY_MS);
  const availability = await providerData(id, kind);
  await sleep(DELAY_MS);
  const date = String(kind === 'movie' ? d.release_date || '' : d.first_air_date || '');
  const runtime = kind === 'movie' ? Number(d.runtime) : Number(Array.isArray(d.episode_run_time) ? d.episode_run_time[0] : 0);
  const title = String(kind === 'movie' ? d.title || '' : d.name || '').trim();
  if (!title) return null;
  return {
    source_key:`tmdb:${kind}:${id}`,
    title,
    normalized_title:norm(title),
    year:Number(date.slice(0,4)) || null,
    media_kind:kind,
    tmdb_id:id,
    source:'tmdb',
    is_catalog_title:Boolean(context.catalogEntry),
    is_trending:Boolean(context.trendingRank),
    trending_rank:context.trendingRank || null,
    kids_approved:false,
    kids_age_bands:[],
    poster_url:d.poster_path ? `https://image.tmdb.org/t/p/w500${d.poster_path}` : null,
    poster_large_url:d.poster_path ? `https://image.tmdb.org/t/p/w780${d.poster_path}` : null,
    poster_original_url:d.poster_path ? `https://image.tmdb.org/t/p/original${d.poster_path}` : null,
    backdrop_url:d.backdrop_path ? `https://image.tmdb.org/t/p/w1280${d.backdrop_path}` : null,
    overview:typeof d.overview === 'string' && d.overview.trim() ? d.overview.trim() : null,
    genres:(Array.isArray(d.genres) ? d.genres.map(g => g.name).filter(Boolean) : []),
    runtime_minutes:Number.isFinite(runtime) && runtime > 0 ? runtime : null,
    content_rating:chooseRating(d, kind),
    vote_average:Number.isFinite(Number(d.vote_average)) ? Number(Number(d.vote_average).toFixed(2)) : null,
    original_language:d.original_language || null,
    ...chooseVideo(d, kind),
    availability,
    source_updated_at:new Date().toISOString(),
    updated_at:new Date().toISOString()
  };
}

function safeAppleArtwork(url) {
  if (typeof url !== 'string' || !/^https:\/\/is[1-5]-ssl\.mzstatic\.com\//.test(url)) return null;
  return url.replace(/\/\d+x\d+bb(?:-[^.]*)?\./, '/600x600bb.');
}
function safeApplePreview(url) {
  return typeof url === 'string' && /^https:\/\/(?:audio|video)-ssl\.itunes\.apple\.com\//.test(url) ? url : null;
}

async function resolveAudio(entry) {
  const term = encodeURIComponent(entry.title);
  const res = await fetch(`https://itunes.apple.com/search?term=${term}&limit=12&media=all&country=US`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) return null;
  const body = await res.json();
  const wanted = compact(entry.title);
  const hit = (body.results || []).find(r => [r.trackName,r.collectionName,r.artistName].some(v => compact(v) === wanted));
  if (!hit) return null;
  const art = safeAppleArtwork(hit.artworkUrl100 || hit.artworkUrl60 || hit.artworkUrl30);
  const preview = safeApplePreview(hit.previewUrl);
  const id = hit.trackId || hit.collectionId || hit.artistId;
  if (!id) return null;
  const kindText = String(hit.kind || hit.wrapperType || '').toLowerCase();
  const mediaKind = /podcast/.test(kindText) ? 'podcast' : /audiobook/.test(kindText) ? 'audiobook' : 'music';
  return {
    source_key:`itunes:${mediaKind}:${id}`,
    title:String(hit.trackName || hit.collectionName || entry.title),
    normalized_title:norm(entry.title),
    year:Number(String(hit.releaseDate || '').slice(0,4)) || Number(entry.year) || null,
    media_kind:mediaKind,
    tmdb_id:null,
    source:'itunes',
    is_catalog_title:true,
    is_trending:false,
    trending_rank:null,
    kids_approved:false,
    kids_age_bands:[],
    poster_url:art,
    poster_large_url:art,
    poster_original_url:art,
    backdrop_url:null,
    overview:null,
    genres:[hit.primaryGenreName].filter(Boolean),
    runtime_minutes:null,
    content_rating:null,
    vote_average:null,
    original_language:null,
    preview_kind:preview ? 'audio' : null,
    preview_provider:preview ? 'Apple' : null,
    preview_url:preview,
    preview_embed_url:null,
    availability:{},
    source_updated_at:new Date().toISOString(),
    updated_at:new Date().toISOString()
  };
}

function mergeRow(previous, next) {
  if (!previous) return next;
  return {
    ...previous, ...next,
    is_catalog_title:previous.is_catalog_title || next.is_catalog_title,
    is_trending:previous.is_trending || next.is_trending,
    trending_rank:[previous.trending_rank,next.trending_rank].filter(Boolean).sort((a,b)=>a-b)[0] || null,
    kids_approved:previous.kids_approved || next.kids_approved,
    kids_age_bands:[...new Set([...(previous.kids_age_bands || []), ...(next.kids_age_bands || [])])]
  };
}

async function supabase(pathname, options={}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathname}`, {
    ...options,
    headers:{
      apikey:SUPABASE_SERVICE_ROLE_KEY,
      Authorization:`Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type':'application/json',
      ...(options.headers || {})
    },
    signal:AbortSignal.timeout(15000)
  });
  if (!res.ok) throw new Error(`Supabase ${options.method || 'GET'} ${pathname} -> ${res.status}: ${(await res.text()).slice(0,300)}`);
  return res;
}

async function writeRows(rows) {
  await supabase('catalog_media_metadata?is_trending=eq.true', {
    method:'PATCH', body:JSON.stringify({is_trending:false,trending_rank:null,updated_at:new Date().toISOString()}),
    headers:{Prefer:'return=minimal'}
  });
  const values = [...rows.values()];
  for (let i=0;i<values.length;i+=50) {
    await supabase('catalog_media_metadata?on_conflict=source_key', {
      method:'POST', body:JSON.stringify(values.slice(i,i+50)),
      headers:{Prefer:'resolution=merge-duplicates,return=minimal'}
    });
  }
  return values.length;
}

async function main() {
  requireConfig();
  const catalog = loadCatalog();
  const kids = loadKids();
  const rows = new Map();
  const stats = {catalog:catalog.length, videoRequested:0, videoMatched:0, audioRequested:0, audioMatched:0, trendingFetched:0, written:0, errors:[]};

  for (const entry of catalog) {
    const kind = catalogKind(entry);
    try {
      let row = null;
      if (kind === 'movie' || kind === 'tv') {
        stats.videoRequested++;
        row = await resolveCatalogVideo(entry, kind);
        if (row) stats.videoMatched++;
      } else if (kind === 'audio') {
        stats.audioRequested++;
        row = await resolveAudio(entry);
        if (row) stats.audioMatched++;
      }
      if (!row) continue;
      const kid = kidsApproval(entry.title, entry.year, kind, kids);
      row = {...row, ...kid, title:entry.title, normalized_title:norm(entry.title), is_catalog_title:true};
      rows.set(row.source_key, mergeRow(rows.get(row.source_key), row));
    } catch (error) {
      stats.errors.push({title:entry.title,error:String(error.message || error).slice(0,160)});
    }
    await sleep(DELAY_MS);
  }

  let trendRank = 0;
  for (const kind of ['movie','tv']) {
    try {
      const data = await tmdb(`/trending/${kind}/day?language=en-US`);
      const top = (data.results || []).filter(r => r && r.adult !== true && Number.isSafeInteger(r.id)).slice(0,TRENDING_PER_KIND);
      for (const hit of top) {
        trendRank++;
        try {
          const row = await fetchTmdbDetails(hit.id, kind, {trendingRank:trendRank});
          if (!row) continue;
          const existing = rows.get(row.source_key);
          // A trending title is never promoted into the recommendation catalog.
          // Kids approval can only survive when this exact identity was already
          // matched to an existing reviewed catalog row above.
          rows.set(row.source_key, mergeRow(existing, row));
          stats.trendingFetched++;
        } catch (error) {
          stats.errors.push({title:`trending:${kind}:${hit.id}`,error:String(error.message || error).slice(0,160)});
        }
        await sleep(DELAY_MS);
      }
    } catch (error) {
      stats.errors.push({title:`trending:${kind}`,error:String(error.message || error).slice(0,160)});
    }
  }

  stats.written = await writeRows(rows);
  stats.durationMs = Date.now() - startedAt.getTime();
  stats.generatedAt = new Date().toISOString();
  fs.mkdirSync(path.join(ROOT,'data'),{recursive:true});
  fs.writeFileSync(path.join(ROOT,'data','catalog-media-sync-summary.json'),JSON.stringify(stats,null,2));
  console.log(JSON.stringify({matchappCatalogMediaSync:stats}));
  if (stats.videoRequested && stats.videoMatched / stats.videoRequested < 0.45) {
    throw new Error(`TMDB exact-match rate unexpectedly low: ${stats.videoMatched}/${stats.videoRequested}`);
  }
  if (stats.errors.length > Math.max(10, Math.ceil(catalog.length * 0.2))) {
    throw new Error(`Too many source errors: ${stats.errors.length}`);
  }
}

if (require.main === module) {
  main().catch(error => { console.error('[catalog-media-sync]', error); process.exit(1); });
}

module.exports = {norm, compact, catalogKind, exactHit, chooseVideo, kidsApproval, safeAppleArtwork, safeApplePreview, mergeRow};
