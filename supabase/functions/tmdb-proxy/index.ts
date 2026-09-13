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
// WHAT THIS IS *NOT* USED FOR
//
// Streaming availability. TMDB has a /watch/providers endpoint, and it is
// regional, frequently stale, and licence-dependent. MatchApp's rule is that
// a platform is only ever shown as verified when a canonical source confirms
// it — so this returns artwork, titles, years, overviews and cast, and says
// nothing about where to watch. That decision stays with the catalogue.
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

Deno.serve(async (req: Request) => {
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
    if (!query) return json({ error: "query is required" }, 400);

    const year = typeof body?.year === "string" || typeof body?.year === "number"
      ? String(body.year).slice(0, 4) : "";
    // "movie" | "tv" | "" (both). The caller passes what the catalogue already
    // knows, which is the single biggest accuracy win available here: searching
    // a series against the film index is how a show ends up with a film's
    // poster.
    const kind = body?.kind === "movie" || body?.kind === "tv" ? body.kind : "";
    const lang = typeof body?.lang === "string" ? body.lang.slice(0, 8) : "en-US";

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
