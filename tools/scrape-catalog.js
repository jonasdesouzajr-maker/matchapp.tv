#!/usr/bin/env node
'use strict';

/*
 * Daily MatchApp catalogue enrichment.
 *
 * Sources:
 * - TMDB: movie/TV identity, posters, backdrops, overviews, ratings, trailers,
 *   trending titles and regional watch-provider data (the provider data is
 *   supplied by TMDB's JustWatch partnership and must retain attribution).
 * - iTunes Search API: music/podcast artwork and 30-second preview URLs.
 *
 * Safety rules:
 * - Existing MatchApp catalogue remains authoritative. Trending rows are
 *   metadata-only and are NEVER inserted into CONTENT_CATALOG.
 * - Kids approval comes only from kids/kids.js. TMDB ratings cannot authorize
 *   a title for Kids Mode.
 * - Exact normalized title + media type + compatible year are required before
 *   metadata is accepted.
 * - Secrets stay server-side. The script prefers GitHub Actions secrets; if the
 *   TMDB token is absent it can read TMDB_BEARER_TOKEN from runtime_secrets,
 *   but only with the Supabase service-role key.
 */

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const TMDB = 'https://api.themoviedb.org/3';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zkymvqrmbabngsqblyye.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const REGIONS = ['BR', 'US', 'GB', 'PT'];
const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT = Number(process.env.CATALOG_REFRESH_LIMIT || 0);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const norm = value => String(value || '').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

function loadCatalog() {
  const source = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  const match = source.match(/const CONTENT_CATALOG = (\[[\s\S]*?\n\]);/);
  if (!match) throw new Error('CONTENT_CATALOG could not be parsed');
  return vm.runInNewContext(match[1], {}, { timeout: 1500 });
}

function loadKidsLibrary() {
  const source = fs.readFileSync(path.join(ROOT, 'kids/kids.js'), 'utf8');
  const match = source.match(/const LIBRARY = (\[[\s\S]*?\n  \]);/);
  if (!match) return new Map();
  const rows = vm.runInNewContext(match[1], {}, { timeout: 1500 });
  return new Map(rows.map(row => [norm(row.title), row]));
}

function mediaKind(entry) {
  const cats = (entry.cats || []).map(x => String(x).toLowerCase());
  if (cats.some(x => /podcast/.test(x))) return 'podcast';
  if (cats.some(x => /audiobook/.test(x))) return 'audiobook';
  if (cats.some(x => /music|album|playlist|single|classical|gospel/.test(x))) return 'music';
  if (cats.some(x => /movie|film|cinema/.test(x))) return 'movie';
  if (cats.some(x => /series|drama|novela|telenovela|dizi|anime|reality|documentary/.test(x))) return 'tv';
  return 'other';
}

async function supabase(pathname, options = {}) {
  if (!SERVICE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for database writes');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathname}`, {
    ...options,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!res.ok) throw new Error(`Supabase ${pathname.split('?')[0]} -> ${res.status}: ${await res.text()}`);
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function loadTmdbToken() {
  if (process.env.TMDB_READ_TOKEN) return process.env.TMDB_READ_TOKEN;
  if (process.env.TMDB_BEARER_TOKEN) return process.env.TMDB_BEARER_TOKEN;
  if (!SERVICE_KEY) return '';
  const rows = await supabase('runtime_secrets?select=secret_value&key=eq.TMDB_BEARER_TOKEN&limit=1');
  return rows?.[0]?.secret_value || '';
}

let TMDB_TOKEN = '';
async function tmdb(pathname) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 10000);
  try {
    const headers = { Accept: 'application/json' };
    let url = `${TMDB}${pathname}`;
    if (TMDB_TOKEN) headers.Authorization = `Bearer ${TMDB_TOKEN}`;
    else if (process.env.TMDB_API_KEY) url += `${pathname.includes('?') ? '&' : '?'}api_key=${encodeURIComponent(process.env.TMDB_API_KEY)}`;
    else throw new Error('No TMDB credential is available');
    const res = await fetch(url, { headers, signal: ac.signal });
    if (!res.ok) throw new Error(`TMDB ${pathname.split('?')[0]} -> ${res.status}`);
    return res.json();
  } finally { clearTimeout(timer); }
}

const img = (posterPath, size) => posterPath ? `https://image.tmdb.org/t/p/${size}${posterPath}` : null;
const yearOf = (r, kind) => Number(String(kind === 'movie' ? r.release_date : r.first_air_date || '').slice(0, 4)) || null;

function exactResult(entry, kind, results) {
  const wanted = norm(entry.title);
  return (results || []).find(r => {
    if (r.adult === true) return false;
    const title = kind === 'movie' ? r.title : r.name;
    const original = kind === 'movie' ? r.original_title : r.original_name;
    if (![title, original].some(v => norm(v) === wanted)) return false;
    if (!entry.year) return true;
    const y = yearOf(r, kind);
    return y && Math.abs(Number(entry.year) - y) <= 1;
  }) || null;
}

async function findTmdb(entry, kind) {
  const year = entry.year ? (kind === 'movie' ? `&primary_release_year=${entry.year}` : `&first_air_date_year=${entry.year}`) : '';
  const data = await tmdb(`/search/${kind}?query=${encodeURIComponent(entry.title)}&include_adult=false${year}&language=en-US`);
  return exactResult(entry, kind, data.results);
}

function pickVideo(videos, kidsApproved) {
  const safe = (videos?.results || []).filter(v => v.site === 'YouTube' && /^[A-Za-z0-9_-]{6,20}$/.test(String(v.key || '')))
    .filter(v => !kidsApproved || !/red band|restricted|uncensored|nsfw/i.test(`${v.name || ''} ${v.type || ''}`));
  safe.sort((a, b) => {
    const score = v => (v.type === 'Trailer' ? 40 : v.type === 'Teaser' ? 25 : 0) + (v.official ? 20 : 0) + (/en/i.test(v.iso_639_1 || '') ? 5 : 0);
    return score(b) - score(a);
  });
  const v = safe[0];
  if (!v) return {};
  return {
    preview_kind: 'video',
    preview_provider: 'YouTube',
    preview_url: `https://www.youtube.com/watch?v=${v.key}`,
    preview_embed_url: `https://www.youtube-nocookie.com/embed/${v.key}?rel=0&modestbranding=1`
  };
}

function ratingFrom(details, kind) {
  const bag = kind === 'movie' ? details.release_dates?.results : details.content_ratings?.results;
  if (!Array.isArray(bag)) return null;
  const preferred = ['BR', 'US', 'GB', 'PT'];
  for (const region of preferred) {
    const row = bag.find(x => x.iso_3166_1 === region);
    if (!row) continue;
    const value = kind === 'movie'
      ? row.release_dates?.map(x => x.certification).find(Boolean)
      : row.rating;
    if (value) return String(value).slice(0, 20);
  }
  return null;
}

async function availability(id, kind) {
  const data = await tmdb(`/${kind}/${id}/watch/providers`);
  const out = {};
  for (const region of REGIONS) {
    const row = data.results?.[region];
    if (!row) continue;
    const pack = {};
    if (row.flatrate?.length) pack.stream = row.flatrate.map(x => x.provider_name);
    if (row.free?.length) pack.free = row.free.map(x => x.provider_name);
    if (row.ads?.length) pack.ads = row.ads.map(x => x.provider_name);
    if (row.rent?.length) pack.rent = row.rent.map(x => x.provider_name);
    if (row.buy?.length) pack.buy = row.buy.map(x => x.provider_name);
    if (row.link) pack.link = row.link;
    if (Object.keys(pack).length) out[region] = pack;
  }
  return out;
}

async function screenRow(entry, found, kind, kids) {
  const id = found.id;
  const append = kind === 'movie' ? 'videos,release_dates' : 'videos,content_ratings';
  const details = await tmdb(`/${kind}/${id}?language=en-US&append_to_response=${append}`);
  const providers = await availability(id, kind);
  const kid = kids.get(norm(entry.title));
  const kidsApproved = Boolean(kid);
  const title = kind === 'movie' ? details.title : details.name;
  const original = kind === 'movie' ? details.original_title : details.original_name;
  return {
    source_key: `tmdb:${kind}:${id}`,
    title: entry.title || title,
    normalized_title: norm(entry.title || title),
    year: yearOf(details, kind) || entry.year || null,
    media_kind: kind,
    tmdb_id: id,
    source: 'tmdb',
    is_catalog_title: entry.isCatalog !== false,
    is_trending: Boolean(entry.isTrending),
    trending_rank: entry.trendingRank || null,
    kids_approved: kidsApproved,
    kids_age_bands: kidsApproved && Array.isArray(kid.ages) ? kid.ages : [],
    poster_url: img(details.poster_path, 'w500'),
    poster_large_url: img(details.poster_path, 'w780'),
    poster_original_url: img(details.poster_path, 'original'),
    backdrop_url: img(details.backdrop_path, 'w1280'),
    overview: String(details.overview || '').trim() || null,
    genres: (details.genres || []).map(g => g.name).filter(Boolean),
    runtime_minutes: kind === 'movie' ? details.runtime || null : details.episode_run_time?.[0] || null,
    content_rating: ratingFrom(details, kind),
    vote_average: Number.isFinite(details.vote_average) ? details.vote_average : null,
    original_language: details.original_language || null,
    ...pickVideo(details.videos, kidsApproved),
    availability: providers,
    source_updated_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

async function itunesRow(entry, kind, kids) {
  const entity = kind === 'podcast' ? 'podcast' : kind === 'audiobook' ? 'audiobook' : 'song';
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(entry.title)}&entity=${entity}&limit=12&country=US`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) return null;
  const data = await res.json();
  const hit = (data.results || []).find(r => norm(r.trackName || r.collectionName) === norm(entry.title));
  if (!hit) return null;
  const key = hit.trackId || hit.collectionId;
  if (!key) return null;
  const kid = kids.get(norm(entry.title));
  const cover = String(hit.artworkUrl100 || '').replace(/100x100bb/, '600x600bb') || null;
  return {
    source_key: `itunes:${kind}:${key}`,
    title: entry.title,
    normalized_title: norm(entry.title),
    year: Number(String(hit.releaseDate || '').slice(0, 4)) || entry.year || null,
    media_kind: kind,
    tmdb_id: null,
    source: 'itunes',
    is_catalog_title: true,
    is_trending: false,
    trending_rank: null,
    kids_approved: Boolean(kid),
    kids_age_bands: kid?.ages || [],
    poster_url: cover,
    poster_large_url: cover,
    poster_original_url: cover,
    backdrop_url: null,
    overview: null,
    genres: [hit.primaryGenreName].filter(Boolean),
    runtime_minutes: hit.trackTimeMillis ? Math.max(1, Math.round(hit.trackTimeMillis / 60000)) : null,
    content_rating: hit.contentAdvisoryRating || null,
    vote_average: null,
    original_language: null,
    preview_kind: hit.previewUrl ? 'audio' : null,
    preview_provider: hit.previewUrl ? 'Apple' : null,
    preview_url: hit.previewUrl || null,
    preview_embed_url: null,
    availability: {},
    source_updated_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

async function trendingEntries() {
  const out = [];
  for (const kind of ['movie', 'tv']) {
    const data = await tmdb(`/trending/${kind}/day?language=en-US`);
    (data.results || []).slice(0, 20).forEach((r, i) => out.push({
      title: kind === 'movie' ? r.title : r.name,
      year: yearOf(r, kind), cats: [kind === 'movie' ? 'movie' : 'series'],
      isCatalog: false, isTrending: true, trendingRank: i + 1, _tmdb: r, _kind: kind
    }));
  }
  return out;
}

async function upsert(rows) {
  if (DRY_RUN) return;
  const batchSize = 50;
  for (let i = 0; i < rows.length; i += batchSize) {
    await supabase('catalog_media_metadata?on_conflict=source_key', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(rows.slice(i, i + batchSize))
    });
  }
}

async function main() {
  TMDB_TOKEN = await loadTmdbToken();
  if (!TMDB_TOKEN && !process.env.TMDB_API_KEY) throw new Error('TMDB credential missing');
  if (!DRY_RUN && !SERVICE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing');

  const kids = loadKidsLibrary();
  const catalog = loadCatalog();
  const work = [...catalog.map(x => ({ ...x, isCatalog: true })), ...(await trendingEntries())];
  const selected = LIMIT > 0 ? work.slice(0, LIMIT) : work;
  const rows = [];
  const metrics = { attempted: selected.length, enriched: 0, skipped: 0, errors: 0, tmdb: 0, itunes: 0, previews: 0, posters: 0, providers: 0 };

  for (const entry of selected) {
    const kind = entry._kind || mediaKind(entry);
    try {
      let row = null;
      if (kind === 'movie' || kind === 'tv') {
        const found = entry._tmdb || await findTmdb(entry, kind);
        if (found) row = await screenRow(entry, found, kind, kids);
        metrics.tmdb += Boolean(row);
      } else if (['music', 'podcast', 'audiobook'].includes(kind) && entry.isCatalog !== false) {
        row = await itunesRow(entry, kind, kids);
        metrics.itunes += Boolean(row);
      }
      if (!row) { metrics.skipped++; continue; }
      rows.push(row); metrics.enriched++;
      if (row.preview_url || row.preview_embed_url) metrics.previews++;
      if (row.poster_url) metrics.posters++;
      if (row.availability && Object.keys(row.availability).length) metrics.providers++;
      await sleep(80);
    } catch (error) {
      metrics.errors++;
      console.error(`[catalog-refresh] ${entry.title}: ${error.message}`);
    }
  }

  await upsert(rows);
  console.log(JSON.stringify({ ...metrics, dryRun: DRY_RUN, written: DRY_RUN ? 0 : rows.length, finishedAt: new Date().toISOString() }));
  if (metrics.errors > Math.max(5, Math.floor(metrics.attempted * 0.15))) process.exitCode = 2;
}

main().catch(error => { console.error(`[catalog-refresh] fatal: ${error.message}`); process.exitCode = 1; });
