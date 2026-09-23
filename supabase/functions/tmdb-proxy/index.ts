// ============================================================
// MatchApp — tmdb-proxy Edge Function
// ------------------------------------------------------------
// Covers and metadata from The Movie Database.
//
// WHY A PROXY AND NOT A DIRECT CALL FROM THE BROWSER
//
// The TMDB v4 token is a credential. Anything in browser JavaScript is
// public — "minified" is not "hidden", and a key in client code is scraped
// within days and then rate-limits (or bills) the owner. It lives in Edge
// Function secrets and never crosses the network to a user's device.
//
// The proxy also lets us do three things a direct call could not:
//   · cache responses at the edge, so the same cover is not fetched again
//     for every visitor who gets the same match,
//   · return a NORMALISED shape, so app.js does not carry TMDB's response
//     schema and can keep its existing fallback chain untouched,
//   · apply the same origin allow-list and rate limiting as gemini-proxy.
//
// VERIFIED DETAIL MODE
//
// Search stays artwork/identity focused. Once an exact TMDB ID has been
// established, callers may request details for that exact identity. Detail
// mode returns TMDB genres, official YouTube trailers/teasers, theatrical
// dates and regional provider data (JustWatch attribution as supplied by
// TMDB). Availability remains region-qualified and is never inferred from a
// title name or an AI answer.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.0";

const adminDb = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

// LEGACY ORIGINS — matchapp.cc entries are intentional and temporary.
//
// matchapp.cc 301-redirects to matchapp.tv, so a normal visitor never sends
// a .cc Origin: the redirect happens before any API call. These two entries
// exist only for clients that predate the redirect and still run with a .cc
// origin — a PWA installed from the old domain, or a tab left open. Removing
// them would make the AI silently fail for those users with a CORS error and
// no visible reason.
//
// SAFE TO DELETE once Search Console and analytics show no .cc traffic for
// a full month. They are not a security risk in the meantime: both are our
// own domains, and every other protection (JWT check, rate limit) is
// unchanged by their presence.
const ALLOWED_ORIGINS = new Set([
  "https://matchapp.tv",
  "https://www.matchapp.tv",
  "https://matchapp.cc",
  "https://www.matchapp.cc",
  "http://localhost:8899",
  "http://127.0.0.1:8899",
]);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (ALLOWED_ORIGINS.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p";
const TIMEOUT_MS = 6_000;

// Artwork is immutable once published, so a long browser cache costs nothing
// and removes a round trip for every repeat viewer of the same title.
const CACHE_CONTROL = "public, max-age=86400, s-maxage=604800";

const MAX_QUERY_CHARS = 120;
const RATE_LIMIT = 60; // per minute — covers are fetched more often than AI calls

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Same metering as gemini-proxy. TMDB is free but rate-limited per key, so an
// abusive caller does not cost money here — it costs everyone else their
// covers, which is worse.
async function checkRateLimit(req: Request): Promise<boolean> {
  try {
    const fwd = req.headers.get("x-forwarded-for") || "";
    const ip = (fwd.split(",")[0] || req.headers.get("cf-connecting-ip") || "unknown").trim();
    const salt = Deno.env.get("RATE_LIMIT_SALT") || "matchapp-default-salt";
    const key = `tmdb:${await sha256Hex(salt + ip)}`;
    const { data, error } = await adminDb.rpc("check_ai_rate_limit", { p_key: key, p_limit: RATE_LIMIT });
    if (error) return true; // fail open — a broken meter must not hide every cover
    return (data as { allowed?: boolean } | null)?.allowed !== false;
  } catch {
    return true;
  }
}

function fullImage(path: string | null | undefined, size: string): string | null {
  return path ? `${IMG_BASE}/${size}${path}` : null;
}

// TMDB returns movies and TV in different shapes. One normalised record keeps
// that difference out of app.js entirely.
function normalise(r: Record<string, unknown>, kind: "movie" | "tv"): Record<string, unknown> {
  const date = String((kind === "movie" ? r.release_date : r.first_air_date) ?? "");
  return {
    tmdbId: r.id,
    kind,
    title: String((kind === "movie" ? r.title : r.name) ?? ""),
    originalTitle: String((kind === "movie" ? r.original_title : r.original_name) ?? ""),
    year: date ? date.slice(0, 4) : null,
    overview: typeof r.overview === "string" && r.overview.trim() ? r.overview.trim() : null,
    poster: fullImage(r.poster_path as string, "w500"),
    posterLarge: fullImage(r.poster_path as string, "w780"),
    posterOriginal: fullImage(r.poster_path as string, "original"),
    backdrop: fullImage(r.backdrop_path as string, "w1280"),
    popularity: typeof r.popularity === "number" ? r.popularity : 0,
    voteAverage: typeof r.vote_average === "number" ? r.vote_average : null,
    originalLanguage: r.original_language ?? null,
    // TMDB's own adult flag. MatchApp filters again on the client with its own
    // rules, but discarding what the source already tells us would be careless.
    adult: r.adult === true,
  };
}

function providerNames(rows: unknown): string[] {
  return Array.isArray(rows)
    ? rows.map((r) => String((r as Record<string, unknown>)?.provider_name || "").trim()).filter(Boolean).slice(0, 24)
    : [];
}

function chooseVideo(record: Record<string, unknown>): Record<string, unknown> {
  const bag = record.videos as { results?: unknown } | undefined;
  const rows = Array.isArray(bag?.results) ? bag!.results as Array<Record<string, unknown>> : [];
  const priorities = ["Trailer", "Teaser", "Clip", "Featurette"];
  const valid = rows.filter((v) => v?.site === "YouTube" && /^[A-Za-z0-9_-]{6,32}$/.test(String(v?.key || "")));
  valid.sort((a, b) => {
    const ai = priorities.indexOf(String(a.type || "")), bi = priorities.indexOf(String(b.type || ""));
    const ap = ai < 0 ? 99 : ai, bp = bi < 0 ? 99 : bi;
    if (ap !== bp) return ap - bp;
    if (Boolean(a.official) !== Boolean(b.official)) return a.official ? -1 : 1;
    return String(b.published_at || "").localeCompare(String(a.published_at || ""));
  });
  const v = valid[0];
  if (!v) return { previewKind: null, previewProvider: null, previewUrl: null, previewEmbedUrl: null };
  const key = String(v.key);
  return {
    previewKind: "video",
    previewProvider: "youtube",
    previewUrl: `https://www.youtube.com/watch?v=${key}`,
    previewEmbedUrl: `https://www.youtube-nocookie.com/embed/${key}?rel=0&modestbranding=1`,
  };
}

function cinemaReleaseDate(record: Record<string, unknown>, region: string): string | null {
  const bag = record.release_dates as { results?: unknown } | undefined;
  const rows = Array.isArray(bag?.results) ? bag!.results as Array<Record<string, unknown>> : [];
  const entry = rows.find((r) => r?.iso_3166_1 === region);
  const dates = Array.isArray(entry?.release_dates) ? entry!.release_dates as Array<Record<string, unknown>> : [];
  const theatrical = dates
    .filter((r) => [2, 3].includes(Number(r?.type)) && typeof r?.release_date === "string")
    .map((r) => String(r.release_date).slice(0, 10))
    .filter((v) => /^\d{4}-\d{2}-\d{2}$/.test(v))
    .sort();
  return theatrical[0] || null;
}

function detailRating(record: Record<string, unknown>, kind: "movie" | "tv"): string | null {
  if (kind === "tv") {
    const bag = record.content_ratings as { results?: unknown } | undefined;
    const rows = Array.isArray(bag?.results) ? bag!.results as Array<Record<string, unknown>> : [];
    for (const region of ["US", "BR", "GB", "PT"]) {
      const row = rows.find((r) => r?.iso_3166_1 === region && String(r?.rating || "").trim());
      if (row) return String(row.rating).trim().slice(0, 32);
    }
    return null;
  }
  const bag = record.release_dates as { results?: unknown } | undefined;
  const rows = Array.isArray(bag?.results) ? bag!.results as Array<Record<string, unknown>> : [];
  for (const region of ["US", "BR", "GB", "PT"]) {
    const entry = rows.find((r) => r?.iso_3166_1 === region);
    const dates = Array.isArray(entry?.release_dates) ? entry!.release_dates as Array<Record<string, unknown>> : [];
    const cert = dates.map((r) => String(r?.certification || "").trim()).find(Boolean);
    if (cert) return cert.slice(0, 32);
  }
  return null;
}

function availabilityFrom(record: Record<string, unknown>, kind: "movie" | "tv"): Record<string, unknown> {
  const providerBag = record["watch/providers"] as { results?: Record<string, unknown> } | undefined;
  const source = providerBag?.results || {};
  const id = Number(record.id);
  const releaseBag = record.release_dates as { results?: unknown } | undefined;
  const releaseRegions = Array.isArray(releaseBag?.results)
    ? (releaseBag!.results as Array<Record<string, unknown>>).map((r)=>String(r?.iso_3166_1||"").toUpperCase()).filter((r)=>/^[A-Z]{2}$/.test(r))
    : [];
  const regions = [...new Set([...Object.keys(source), ...releaseRegions])]
    .filter((r)=>/^[A-Z]{2}$/.test(r))
    .sort();
  const out: Record<string, unknown> = {
    source: "tmdb-watch-providers",
    attribution: "JustWatch via TMDB",
    source_page_url: Number.isSafeInteger(id) && id > 0 ? `https://www.themoviedb.org/${kind}/${id}` : null,
  };
  for (const region of regions) {
    const row = source?.[region] as Record<string, unknown> | undefined;
    const stream = [...providerNames(row?.flatrate), ...providerNames(row?.free), ...providerNames(row?.ads)]
      .filter((v, i, a) => a.indexOf(v) === i);
    const cinema = kind === "movie" ? cinemaReleaseDate(record, region) : null;
    if (!row && !cinema) continue;
    out[region] = {
      link: typeof row?.link === "string" && /^https:\/\//.test(row.link) ? row.link : null,
      stream,
      rent: providerNames(row?.rent),
      buy: providerNames(row?.buy),
      cinema_release_date: cinema,
    };
  }
  return out;
}
function detailMetadata(record: Record<string, unknown>, kind: "movie" | "tv"): Record<string, unknown> {
  const runtime = kind === "movie" ? Number(record.runtime)
    : Number(Array.isArray(record.episode_run_time) ? record.episode_run_time[0] : NaN);
  return {
    genres: Array.isArray(record.genres)
      ? (record.genres as Array<Record<string, unknown>>).map((g) => String(g?.name || "").trim()).filter(Boolean).slice(0, 24)
      : [],
    runtimeMinutes: Number.isFinite(runtime) && runtime > 0 && runtime <= 1440 ? Math.round(runtime) : null,
    contentRating: detailRating(record, kind),
    cast: Array.isArray((record.credits as { cast?: unknown } | undefined)?.cast)
      ? ((record.credits as { cast?: Array<Record<string, unknown>> }).cast || []).filter((p)=>p?.adult!==true&&String(p?.name||"").trim()).slice(0,12).map((p)=>({name:String(p.name||"").trim(),character:String(p.character||"").trim()}))
      : [],
    originCountries: Array.isArray(record.production_countries)
      ? (record.production_countries as Array<Record<string, unknown>>).map((x)=>String(x?.iso_3166_1||"").toUpperCase()).filter(Boolean)
      : (Array.isArray(record.origin_country) ? (record.origin_country as unknown[]).map((x)=>String(x||"").toUpperCase()).filter(Boolean) : []),
    availability: availabilityFrom(record, kind),
    ...chooseVideo(record),
  };
}

async function tmdbFetch(path: string, token: string): Promise<Record<string, unknown> | null> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${TMDB_BASE}${path}`, {
      signal: ac.signal,
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!res.ok) {
      console.error(`[tmdb-proxy] ${path.split("?")[0]} -> ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error("[tmdb-proxy] fetch failed:", e instanceof Error ? e.message : String(e));
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function pickDirector(record: Record<string, unknown>, kind: "movie" | "tv"): { id: number; name: string } | null {
  const credits = record.credits as { crew?: Array<Record<string, unknown>> } | undefined;
  const crew = Array.isArray(credits?.crew) ? credits!.crew! : [];
  const dir = crew.find((c) => c && c.job === "Director" && Number.isSafeInteger(c.id) && (c.id as number) > 0);
  if (dir) return { id: dir.id as number, name: String(dir.name || "") };
  if (kind === "tv") {
    const created = Array.isArray(record.created_by) ? record.created_by as Array<Record<string, unknown>> : [];
    const c = created.find((p) => p && Number.isSafeInteger(p.id) && (p.id as number) > 0);
    if (c) return { id: c.id as number, name: String(c.name || "") };
  }
  return null;
}

function listFrom(arr: unknown, kind: "movie" | "tv", skipId: number): Record<string, unknown>[] {
  if (!Array.isArray(arr)) return [];
  return (arr as Record<string, unknown>[])
    .slice(0, 12)
    .map((r) => {
      const row = normalise(r, kind);
      row.why = "idea";
      return row;
    })
    .filter((r) => r.adult !== true && r.poster && r.title && r.tmdbId !== skipId);
}

function directorWorks(credits: Record<string, unknown> | null, skipId: number): Record<string, unknown>[] {
  if (!credits) return [];
  const crew = Array.isArray(credits.crew) ? credits.crew as Array<Record<string, unknown>> : [];
  return crew
    .filter((w) =>
      w &&
      (w.job === "Director" || w.job === "Creator") &&
      w.adult !== true &&
      w.id !== skipId &&
      w.poster_path &&
      Number.isSafeInteger(w.id)
    )
    .sort((a, b) => (Number(b.popularity) || 0) - (Number(a.popularity) || 0))
    .slice(0, 10)
    .map((w) => {
      const thisKind: "movie" | "tv" = w.media_type === "tv" ? "tv" : "movie";
      const row = normalise(w, thisKind);
      row.why = "director";
      return row;
    })
    .filter((r) => r.adult !== true && r.poster && r.title);
}

function mergeRelated(...lists: Record<string, unknown>[][]): Record<string, unknown>[] {
  const seen = new Set<number>();
  const out: Record<string, unknown>[] = [];
  for (const list of lists) {
    for (const r of list) {
      const id = r.tmdbId;
      if (typeof id !== "number" || !Number.isSafeInteger(id) || seen.has(id) || r.adult === true || !r.poster) continue;
      seen.add(id);
      out.push(r);
    }
  }
  return out;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) return new Response(JSON.stringify({error:"Origin not allowed"}), {status:403,headers:{"Content-Type":"application/json","Vary":"Origin"}});
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }

  const json = (body: unknown, status = 200, cache = false) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        ...corsHeaders(req),
        "Content-Type": "application/json",
        ...(cache ? { "Cache-Control": CACHE_CONTROL } : {}),
      },
    });

  try {
    if (!(await checkRateLimit(req))) {
      return json({ error: "Too many requests" }, 429);
    }

    const token = Deno.env.get("TMDB_API_KEY");
    if (!token) {
      // Missing config must degrade to "no cover from this source", never to a
      // broken page — app.js still has iTunes, TVMaze and the generated cover
      // behind this.
      console.error("[tmdb-proxy] TMDB_API_KEY is not set");
      return json({ results: [], unavailable: true });
    }

    const body = await req.json().catch(() => ({}));
    const query = typeof body?.query === "string" ? body.query.trim().slice(0, MAX_QUERY_CHARS) : "";

    const year = typeof body?.year === "string" || typeof body?.year === "number"
      ? String(body.year).slice(0, 4) : "";
    // "movie" | "tv" | "" (both). The caller passes what the catalogue already
    // knows, which is the single biggest accuracy win available here: searching
    // a series against the film index is how a show ends up with a film's
    // poster.
    const kind = body?.kind === "movie" || body?.kind === "tv" ? body.kind : "";
    const lang = typeof body?.lang === "string" ? body.lang.slice(0, 8) : "en-US";

    // Locale lookup is restricted to a typed numeric TMDB identity. No arbitrary
    // endpoint/URL can be supplied, and adult records are never returned.
    if (body?.tmdb_id !== undefined) {
      if (!Number.isSafeInteger(body.tmdb_id) || body.tmdb_id <= 0 || !kind) return json({error:"Invalid identity"},400);
      const wantRelated = body.related === true;
      const wantDetails = body.details === true;
      const append = new Set<string>();
      if (wantRelated) ["credits", "similar", "recommendations"].forEach((v) => append.add(v));
      if (wantDetails) {
        ["videos", "watch/providers", "credits"].forEach((v) => append.add(v));
        append.add(kind === "movie" ? "release_dates" : "content_ratings");
      }
      const extra = append.size ? "&append_to_response=" + encodeURIComponent([...append].join(",")) : "";
      const record = await tmdbFetch(`/${kind}/${body.tmdb_id}?language=${encodeURIComponent(lang)}${extra}`, token);
      if (!record || record.adult === true) return json({results:[]});
      const primary = {
        ...normalise(record, kind),
        ...(wantDetails ? detailMetadata(record, kind) : {}),
      };
      if (!wantRelated) return json({results:[primary]},200,true);

      const director = pickDirector(record, kind);
      let sameDirector: Record<string, unknown>[] = [];
      if (director && Number.isSafeInteger(director.id) && director.id > 0) {
        const person = await tmdbFetch(`/person/${director.id}/combined_credits?language=${encodeURIComponent(lang)}`, token);
        sameDirector = directorWorks(person, body.tmdb_id);
      }
      const similarBag = record.similar as { results?: unknown } | undefined;
      const recBag = record.recommendations as { results?: unknown } | undefined;
      const similar = listFrom(similarBag?.results, kind, body.tmdb_id);
      const recs = listFrom(recBag?.results, kind, body.tmdb_id);
      const related = mergeRelated(sameDirector, similar, recs).slice(0, 8);
      return json({ results: [primary], director, related }, 200, true);
    }
    if (body?.discover && typeof body.discover === "object") {
      const d = body.discover as Record<string, unknown>;
      const kinds: Array<"movie"|"tv"> = d.kind === "movie" ? ["movie"] : d.kind === "tv" ? ["tv"] : ["movie","tv"];
      const genreIds = Array.isArray(d.genre_ids) ? (d.genre_ids as unknown[]).map(Number).filter((n)=>Number.isSafeInteger(n)&&n>0) : [];
      const decade = Number(d.decade_start);
      const pages = Math.min(20, Math.max(1, Number(d.pages)||1));
      const pageStart = Math.min(500, Math.max(1, Number(d.page_start)||1));
      const originalLanguage = typeof d.original_language === "string" && /^[a-z]{2}$/i.test(d.original_language) ? d.original_language.toLowerCase() : "";
      const region = typeof d.region === "string" && /^[A-Z]{2}$/i.test(d.region) ? d.region.toUpperCase() : "";
      const provider = typeof d.provider === "string" ? d.provider.toLowerCase().replace(/[^a-z0-9+ ]/g, "").trim() : "";
      const providerIds: Record<string,string> = { "netflix":"8" };
      const providerId = providerIds[provider] || "";
      const out: Record<string, unknown>[] = [];
      for (const k of kinds) {
        for (let page=pageStart; page<=Math.min(500,pageStart+pages-1); page++) {
          const params = new URLSearchParams();
          params.set("include_adult","false");
          params.set("sort_by","popularity.desc");
          params.set("page",String(page));
          params.set("vote_count.gte","20");
          params.set("language",lang);
          if (originalLanguage) params.set("with_original_language", originalLanguage);
          if (providerId && region) { params.set("with_watch_providers", providerId); params.set("watch_region", region); params.set("with_watch_monetization_types", "flatrate|free|ads"); }
          if (genreIds.length) params.set("with_genres",genreIds.join("|"));
          if (Number.isSafeInteger(decade) && decade >= 1900 && decade <= 2100) {
            if (k === "movie") {
              params.set("primary_release_date.gte",decade+"-01-01");
              params.set("primary_release_date.lte",(decade+9)+"-12-31");
            } else {
              params.set("first_air_date.gte",decade+"-01-01");
              params.set("first_air_date.lte",(decade+9)+"-12-31");
            }
          }
          const data = await tmdbFetch(`/discover/${k}?${params.toString()}`, token);
          const rows = Array.isArray(data?.results) ? data!.results as Array<Record<string, unknown>> : [];
          rows.forEach((row)=>{const n=normalise(row,k);if(n.adult!==true&&n.poster&&n.title)out.push(n);});
        }
      }
      out.sort((a,b)=>(Number(b.popularity)||0)-(Number(a.popularity)||0));
      return json({results:out.slice(0,400)},200,true);
    }

    if (!query) return json({ error: "query is required" }, 400);

    const q = encodeURIComponent(query);
    const langParam = `&language=${encodeURIComponent(lang)}`;
    const paths: string[] = [];

    if (kind === "movie") {
      paths.push(`/search/movie?query=${q}${year ? `&primary_release_year=${year}` : ""}&include_adult=false${langParam}`);
    } else if (kind === "tv") {
      paths.push(`/search/tv?query=${q}${year ? `&first_air_date_year=${year}` : ""}&include_adult=false${langParam}`);
    } else {
      // Unknown type: ask both indexes and let the caller's relevance scoring
      // decide. Concurrent, so this costs one round trip, not two.
      paths.push(`/search/movie?query=${q}&include_adult=false${langParam}`);
      paths.push(`/search/tv?query=${q}&include_adult=false${langParam}`);
    }

    const responses = await Promise.all(paths.map((p) => tmdbFetch(p, token)));

    let results: Record<string, unknown>[] = [];
    responses.forEach((data, i) => {
      const arr = Array.isArray(data?.results) ? (data!.results as Record<string, unknown>[]) : [];
      const thisKind: "movie" | "tv" =
        kind === "tv" ? "tv" : kind === "movie" ? "movie" : (i === 0 ? "movie" : "tv");
      results = results.concat(arr.slice(0, 8).map((r) => normalise(r, thisKind)));
    });

    // Belt and braces on top of include_adult=false, and drop anything with no
    // artwork — a result with no poster is of no use to the only caller.
    results = results.filter((r) => r.adult !== true && r.poster);

    // Most popular first. TMDB's own relevance ordering is per-index, and we
    // may have merged two of them, so this is what makes the merge sane.
    results.sort((a, b) => (b.popularity as number) - (a.popularity as number));

    return json({ results: results.slice(0, 10) }, 200, true);
  } catch (e) {
    console.error("[tmdb-proxy] unhandled:", e instanceof Error ? e.stack || e.message : String(e));
    return json({ error: "Internal error" }, 500);
  }
});
