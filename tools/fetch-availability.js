#!/usr/bin/env node
/* ============================================================
   Fetch real streaming availability from TMDB.

   Writes data/availability.json. Nothing else reads TMDB at build time, so
   this file is the single source of truth for every "where to watch" claim
   the site makes. If a title is absent from it, no availability page exists
   for that title — which is the point.

   WHY THIS RUNS IN CI AND NOT AT REQUEST TIME:
   availability changes slowly (weeks, not minutes) and the catalog is ~184
   titles. Fetching per visitor would mean thousands of identical API calls a
   day, a TMDB rate-limit problem and a slow page. A nightly job costs ~370
   calls and makes every page static.

   DATA HONESTY RULES, enforced here rather than trusted downstream:
     • Only providers TMDB actually returns are recorded.
     • Region is recorded with the data — availability is per-country and a
       page that omits the region is lying by omission.
     • A title TMDB cannot confidently match is skipped entirely rather than
       guessed at.
     • TMDB sources this from JustWatch and requires attribution; the page
       generator carries it.

   Requires: TMDB_API_KEY (a v3 API key) in the environment.
   Run: node tools/fetch-availability.js
   ============================================================ */

const fs = require('fs');
const path = require('path');
const {observationTime,httpsUrl} = require('./availability-evidence.cjs');

const ROOT = path.join(__dirname, '..');
const API = 'https://api.themoviedb.org/3';
const KEY = process.env.TMDB_API_KEY;
const READ_TOKEN = process.env.TMDB_READ_TOKEN;   // v4 bearer, preferred

// Regions to record. Brazil first — it is MatchApp's primary audience.
const REGIONS = ['BR', 'US', 'GB', 'PT'];

// TMDB asks for no more than ~50 requests/second; this is far below that and
// keeps us a good citizen on a free key.
const DELAY_MS = 120;

const sleep = ms => new Promise(r => setTimeout(r, ms));

function loadCatalog() {
    const src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    const start = src.indexOf('const CONTENT_CATALOG');
    const end = src.indexOf('const VERTICAL_DRAMA_TITLES');
    const sandbox = {};
    new Function('exports', src.slice(start, end) + ';exports.C = CONTENT_CATALOG;')(sandbox);
    return sandbox.C;
}

async function tmdb(pathname) {
    // Bearer auth, matching tmdb-proxy. Two reasons to prefer it over the
    // ?api_key= query parameter: a key in a URL ends up in proxy logs, CDN
    // logs and referrer headers, whereas a header does not; and using the
    // same credential style in both places means one less thing to get wrong
    // when someone later wonders which value goes where.
    //
    // Falls back to the v3 query-param key if only that is configured, so an
    // existing setup keeps working rather than failing on a silent 401.
    const headers = { Accept: 'application/json' };
    let url = `${API}${pathname}`;

    if (READ_TOKEN) {
        headers.Authorization = `Bearer ${READ_TOKEN}`;
    } else {
        const sep = pathname.includes('?') ? '&' : '?';
        url += `${sep}api_key=${KEY}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    let res;
    try { res = await fetch(url, { headers, signal: controller.signal }); }
    finally { clearTimeout(timeout); }
    if (!res.ok) {
        // 401 here almost always means a v3 key was supplied where a v4 read
        // token is expected, or vice versa — worth saying so rather than
        // returning a bare null and letting the caller guess.
        if (res.status === 401) {
            console.error('  TMDB returned 401 — check that TMDB_READ_TOKEN is the long eyJ... token, not the short v3 key.');
        }
        return null;
    }
    return res.json();
}

/* Only movies and scripted series have meaningful provider data. A YouTube
   channel, a podcast or a news feed does not "stream on Netflix" and asking
   TMDB about it returns noise at best. */
const ELIGIBLE = new Set(['movie', 'series', 'K-drama', 'anime', 'documentary', 'novela', 'telenovela']);
const isEligible = e => (e.cats || []).some(c => ELIGIBLE.has(c));

/* A match is only accepted when the normalised titles agree. TMDB's search is
   fuzzy and will happily return *something* for almost any string — accepting
   its first result unchecked is how a page ends up claiming the wrong film is
   on Netflix. */
const norm = s => String(s).toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]/gu, '');

// Source-confirmed numeric identities for catalog titles whose current TMDB
// display name intentionally differs from MatchApp's original/source title.
// Keep this list tiny: numeric identity is safer than weakening exact-name
// matching for every title. Laapataa Ladies is currently displayed by TMDB as
// "Lost Ladies"; TMDB movie 1163194 is the same 2024 Hindi film.
const EXACT_TMDB_IDENTITIES = new Map([
    ['laapataaladies', { id: 1163194, kind: 'movie', year: 2024 }]
]);

function selectExactIdentity(entry, results, kind) {
    const wanted = norm(entry.title);
    if (!wanted || !Array.isArray(results)) return null;
    return results.find(r => {
        if (!r || !Number.isSafeInteger(r.id) || r.id <= 0 || r.adult === true) return false;
        const name = norm(kind === 'movie' ? r.title : r.name);
        const year = String(kind === 'movie' ? r.release_date || '' : r.first_air_date || '').slice(0,4);
        return name === wanted && (!entry.year || (String(entry.year) === year && /^\d{4}$/.test(year)));
    }) || null;
}

async function findId(entry) {
    const kind = (entry.cats || []).includes('movie') ? 'movie' : 'tv';
    const pinned = EXACT_TMDB_IDENTITIES.get(norm(entry.title));
    if (pinned && pinned.kind === kind &&
        (!entry.year || !pinned.year || Number(entry.year) === Number(pinned.year))) {
        return { id: pinned.id, kind, tmdbTitle: entry.title };
    }
    const q = encodeURIComponent(entry.title);
    const yearParam = entry.year
        ? (kind === 'movie' ? `&primary_release_year=${entry.year}` : `&first_air_date_year=${entry.year}`)
        : '';
    const data = await tmdb(`/search/${kind}?query=${q}${yearParam}&include_adult=false`);
    if (!data || !data.results || !data.results.length) return null;

    const hit = selectExactIdentity(entry, data.results, kind);
    if (!hit) return null;                       // no confident match -> skip
    return { id: hit.id, kind, tmdbTitle: hit.title || hit.name };
}

function providersFromResponse(data, checkedAt) {
    if (!data || !data.results || typeof data.results !== 'object' || Array.isArray(data.results)) return null;
    const out = {};
    for (const region of REGIONS) {
        const r = data.results[region] || {};
        const pack = { checkedAt, status: 'not_reported' };
        for (const [source,target] of [['flatrate','stream'],['rent','rent'],['buy','buy'],['free','free'],['ads','ads']]) {
            const values = Array.isArray(r[source]) ? [...new Set(r[source].map(p=>p?.provider_name).filter(n=>typeof n==='string'&&n.trim()))] : [];
            if(values.length) { pack[target]=values; pack.status='available'; }
        }
        if (typeof r.link==='string') pack.link=r.link;
        out[region]=pack;
    }
    return out;
}

async function getProviders(id, kind) {
    const data = await tmdb(`/${kind}/${id}/watch/providers`);
    return providersFromResponse(data,new Date().toISOString());
}

// Absent regions are genuine observations, not source-backed offer records.
// Preserve them separately instead of inventing a regional source URL.
function partitionProviderObservations(providers) {
    const regions={},regionObservations={};
    for(const [code,raw] of Object.entries(providers||{})) {
        if(!REGIONS.includes(code)||!raw||typeof raw!=='object')throw new Error('Invalid provider observation');
        const record=structuredClone(raw),link=httpsUrl(record.link);
        const regional=link&&new URL(link).searchParams.get('locale')===code;
        const hasOffers=['stream','rent','buy','free','ads'].some(k=>Array.isArray(record[k])&&record[k].length);
        if(regional) { regions[code]=record; continue; }
        if(hasOffers||record.status!=='not_reported')throw new Error('Provider options require their original region-qualified source link');
        delete record.link;
        regionObservations[code]=record;
    }
    if(!Object.keys(regions).length)throw new Error('No source-backed regional record; preserve the last good title');
    return {regions,regionObservations};
}

function carryPrevious(previous) {
    const result={};
    for(const [title,info] of Object.entries(previous?.titles||{})) {
        if(!info || !['movie','tv'].includes(info.kind) || !Number.isSafeInteger(info.tmdbId))continue;
        const copy=structuredClone(info);
        copy.checkedAt=observationTime(copy.checkedAt,previous.generated);
        for(const region of [...Object.values(copy.regions||{}),...Object.values(copy.regionObservations||{})]) {
            region.checkedAt=observationTime(region.checkedAt,copy.checkedAt);
        }
        result[title]=copy;
    }
    return result;
}

async function main() {
    if (!READ_TOKEN && !KEY) {
        console.error('No TMDB credential found. Set TMDB_READ_TOKEN (preferred) or TMDB_API_KEY as a repository secret.');
        process.exit(1);
    }
    console.log(READ_TOKEN ? 'Auth: v4 read token (Bearer)' : 'Auth: v3 api_key (query param)');

    const catalog = loadCatalog().filter(isEligible);
    console.log(`${catalog.length} eligible titles (of ${loadCatalog().length} total)`);

    const dataFile=path.join(ROOT,'data','availability.json');
    let previous={};
    if(fs.existsSync(dataFile))previous=JSON.parse(fs.readFileSync(dataFile,'utf8'));
    const availability=carryPrevious(previous);
    let matched = 0, withProviders = 0, skipped = 0, sourceChecks = 0;
    const failed=(title)=>{if(availability[title])availability[title]={...availability[title],refreshStatus:'failed',refreshAttemptedAt:new Date().toISOString()};};

    for (const entry of catalog) {
        try {
            const found = await findId(entry);
            await sleep(DELAY_MS);
            if (!found) { failed(entry.title); skipped++; continue; }
            matched++;

            const providers = await getProviders(found.id, found.kind);
            await sleep(DELAY_MS);
            if (!providers) { failed(entry.title); continue; }

            const hasOptions=Object.values(providers).some(r=>r.status==='available');
            if(!hasOptions && !availability[entry.title])continue;

            const {regions,regionObservations}=partitionProviderObservations(providers);
            sourceChecks++;
            availability[entry.title] = {
                tmdbId: found.id,
                kind: found.kind,
                year: entry.year || null,
                checkedAt: Object.values(providers)[0].checkedAt,
                refreshStatus: 'confirmed',
                regions,
                ...(Object.keys(regionObservations).length?{regionObservations}:{})
            };
            withProviders++;
            console.log(`  ✓ ${entry.title} — ${Object.keys(providers).join(', ')}`);
        } catch (e) {
            failed(entry.title);
            console.log(`  ! ${entry.title}: source request could not be confirmed; prior observation retained`);
            skipped++;
        }
    }

    if (!sourceChecks) throw new Error('No provider responses were confirmed; the existing availability file has been preserved.');
    fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
    fs.writeFileSync(
        path.join(ROOT, 'data', 'availability.json'),
        JSON.stringify({ schemaVersion: 2, generated: new Date().toISOString(), source: 'TMDB / JustWatch', titles: availability }, null, 2)
    );

    console.log(`\nmatched: ${matched} | with provider data: ${withProviders} | skipped: ${skipped}`);
    console.log('-> data/availability.json');
}

if(require.main===module)main().catch(()=>{console.error('Availability refresh failed; inspect the source status. No credentials are logged.');process.exitCode=1;});
module.exports={providersFromResponse,partitionProviderObservations,carryPrevious,selectExactIdentity};
