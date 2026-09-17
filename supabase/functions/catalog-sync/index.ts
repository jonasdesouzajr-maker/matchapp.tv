import { createClient } from "npm:@supabase/supabase-js@2.105.0";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@6.1.0";

/*
 * MatchApp catalogue media sync.
 *
 * This is intentionally NOT a public scraper endpoint. GitHub Actions obtains
 * a short-lived OIDC token from GitHub and this function verifies issuer,
 * audience, repository and event claims before any database write occurs.
 * TMDB and Supabase admin credentials remain Supabase Edge Function secrets.
 *
 * Streaming availability comes from TMDB's official watch/providers endpoint
 * (whose provider data is supplied by JustWatch) rather than scraping
 * undocumented JustWatch/Cromai HTML.
 */

const REPOSITORY = "jonasdesouzajr-maker/matchapp.tv";
const OIDC_AUDIENCE = "matchapp-catalog-sync";
const GITHUB_ISSUER = "https://token.actions.githubusercontent.com";
const GITHUB_JWKS = createRemoteJWKSet(new URL(`${GITHUB_ISSUER}/.well-known/jwks`));
const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p";
const REGIONS = ["BR", "US", "GB", "PT"];
const MAX_CATALOG_PER_RUN = 72;
const MAX_TRENDING = 20;
const CONCURRENCY = 5;

const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false, autoRefreshToken: false } },
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function normalise(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function fullImage(path: unknown, size: string): string | null {
  return typeof path === "string" && /^\/[A-Za-z0-9_.-]+$/.test(path) ? `${IMG_BASE}/${size}${path}` : null;
}

async function authorize(req: Request) {
  const raw = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!raw) throw new Error("missing GitHub OIDC token");
  const { payload } = await jwtVerify(raw, GITHUB_JWKS, {
    issuer: GITHUB_ISSUER,
    audience: OIDC_AUDIENCE,
  });
  if (payload.repository !== REPOSITORY) throw new Error("repository claim rejected");
  if (!['schedule', 'workflow_dispatch'].includes(String(payload.event_name || ''))) throw new Error("event claim rejected");
  const workflowRef = String(payload.workflow_ref || "");
  if (!workflowRef.startsWith(`${REPOSITORY}/.github/workflows/scraper.yml@refs/heads/`)) throw new Error("workflow claim rejected");
  return payload;
}

async function tmdb(path: string, token: string): Promise<any | null> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 8000);
  try {
    const res = await fetch(`${TMDB_BASE}${path}`, {
      signal: ac.signal,
      headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    });
    if (!res.ok) {
      console.error(JSON.stringify({ event: "catalog-sync-tmdb-error", path: path.split("?")[0], status: res.status }));
      return null;
    }
    return await res.json();
  } catch (error) {
    console.error(JSON.stringify({ event: "catalog-sync-tmdb-fetch-failed", path: path.split("?")[0], error: String(error) }));
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function titleOf(row: any, kind: "movie" | "tv") {
  return String(kind === "movie" ? row?.title ?? "" : row?.name ?? "");
}
function originalTitleOf(row: any, kind: "movie" | "tv") {
  return String(kind === "movie" ? row?.original_title ?? "" : row?.original_name ?? "");
}
function yearOf(row: any, kind: "movie" | "tv") {
  const date = String(kind === "movie" ? row?.release_date ?? "" : row?.first_air_date ?? "");
  const year = Number(date.slice(0, 4));
  return Number.isInteger(year) && year >= 1888 && year <= 2100 ? year : null;
}

function chooseVideo(videos: any, kind: "movie" | "tv") {
  const rows = Array.isArray(videos?.results) ? videos.results : [];
  const priorities = kind === "tv" ? ["Trailer", "Teaser", "Clip", "Featurette"] : ["Trailer", "Teaser", "Featurette", "Clip"];
  const valid = rows.filter((v: any) => v?.site === "YouTube" && /^[A-Za-z0-9_-]{6,32}$/.test(String(v?.key || "")));
  valid.sort((a: any, b: any) => {
    const pa = priorities.indexOf(a.type); const pb = priorities.indexOf(b.type);
    const aa = pa < 0 ? 99 : pa; const bb = pb < 0 ? 99 : pb;
    if (aa !== bb) return aa - bb;
    if (Boolean(a.official) !== Boolean(b.official)) return a.official ? -1 : 1;
    return String(b.published_at || "").localeCompare(String(a.published_at || ""));
  });
  const chosen = valid[0];
  if (!chosen) return { preview_kind: null, preview_provider: null, preview_url: null, preview_embed_url: null };
  return {
    preview_kind: "video",
    preview_provider: "youtube",
    preview_url: `https://www.youtube.com/watch?v=${chosen.key}`,
    preview_embed_url: `https://www.youtube-nocookie.com/embed/${chosen.key}?rel=0&modestbranding=1`,
  };
}

function chooseRating(record: any, kind: "movie" | "tv") {
  const preferred = ["US", "BR", "GB", "PT"];
  if (kind === "movie") {
    const rows = Array.isArray(record?.release_dates?.results) ? record.release_dates.results : [];
    for (const region of preferred) {
      const item = rows.find((r: any) => r?.iso_3166_1 === region);
      const cert = item?.release_dates?.map((x: any) => String(x?.certification || "").trim()).find(Boolean);
      if (cert) return cert.slice(0, 24);
    }
  } else {
    const rows = Array.isArray(record?.content_ratings?.results) ? record.content_ratings.results : [];
    for (const region of preferred) {
      const rating = String(rows.find((r: any) => r?.iso_3166_1 === region)?.rating || "").trim();
      if (rating) return rating.slice(0, 24);
    }
  }
  return null;
}

function providerNames(rows: unknown) {
  if (!Array.isArray(rows)) return [];
  return rows.map((r: any) => String(r?.provider_name || "").trim()).filter(Boolean).slice(0, 20);
}

function availabilityFrom(record: any) {
  const source = record?.["watch/providers"]?.results || {};
  const out: Record<string, unknown> = { source: "tmdb-watch-providers", attribution: "JustWatch via TMDB" };
  for (const region of REGIONS) {
    const r = source?.[region];
    if (!r) continue;
    out[region] = {
      link: typeof r.link === "string" && /^https:\/\//.test(r.link) ? r.link : null,
      stream: [...providerNames(r.flatrate), ...providerNames(r.free), ...providerNames(r.ads)].filter((v, i, a) => a.indexOf(v) === i),
      rent: providerNames(r.rent),
      buy: providerNames(r.buy),
    };
  }
  return out;
}

async function details(tmdbId: number, kind: "movie" | "tv", token: string) {
  return await tmdb(`/${kind}/${tmdbId}?language=en-US&append_to_response=videos,watch%2Fproviders,release_dates,content_ratings`, token);
}

async function resolveTmdb(item: any, token: string) {
  const kind: "movie" | "tv" = item.media_kind === "movie" ? "movie" : "tv";
  const q = encodeURIComponent(String(item.title || "").trim());
  if (!q) return null;
  const yearKey = kind === "movie" ? "year" : "first_air_date_year";
  const yearParam = item.year ? `&${yearKey}=${encodeURIComponent(String(item.year))}` : "";
  const search = await tmdb(`/search/${kind}?query=${q}&include_adult=false&language=en-US${yearParam}`, token);
  const rows = Array.isArray(search?.results) ? search.results : [];
  const target = normalise(item.title);
  const exact = rows.find((r: any) => {
    if (r?.adult === true || !Number.isSafeInteger(r?.id)) return false;
    const titleMatch = [titleOf(r, kind), originalTitleOf(r, kind)].some(t => normalise(t) === target);
    if (!titleMatch) return false;
    if (!item.year) return true;
    const y = yearOf(r, kind);
    return y !== null && Math.abs(y - Number(item.year)) <= 1;
  });
  if (!exact) return null;
  const record = await details(exact.id, kind, token);
  if (!record || record.adult === true) return null;
  const title = titleOf(record, kind) || item.title;
  const year = yearOf(record, kind) || (item.year ? Number(item.year) : null);
  const runtime = kind === "movie" ? Number(record.runtime) : Number(record.episode_run_time?.[0]);
  return {
    source_key: `tmdb:${kind}:${record.id}`,
    title,
    normalized_title: normalise(item.title),
    year,
    media_kind: kind,
    tmdb_id: record.id,
    source: "tmdb",
    is_catalog_title: true,
    is_trending: false,
    trending_rank: null,
    kids_approved: item.kids_approved === true,
    kids_age_bands: Array.isArray(item.kids_age_bands) ? item.kids_age_bands.slice(0, 8) : [],
    poster_url: fullImage(record.poster_path, "w500"),
    poster_large_url: fullImage(record.poster_path, "w780"),
    poster_original_url: fullImage(record.poster_path, "original"),
    backdrop_url: fullImage(record.backdrop_path, "w1280"),
    overview: typeof record.overview === "string" ? record.overview.trim().slice(0, 4000) || null : null,
    genres: Array.isArray(record.genres) ? record.genres.map((g: any) => String(g?.name || "").trim()).filter(Boolean).slice(0, 20) : [],
    runtime_minutes: Number.isFinite(runtime) && runtime > 0 && runtime <= 1440 ? Math.round(runtime) : null,
    content_rating: chooseRating(record, kind),
    vote_average: Number.isFinite(Number(record.vote_average)) ? Math.max(0, Math.min(10, Number(record.vote_average))) : null,
    original_language: typeof record.original_language === "string" ? record.original_language.slice(0, 16) : null,
    ...chooseVideo(record.videos, kind),
    availability: availabilityFrom(record),
    source_updated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function resolveAudio(item: any) {
  const media = item.media_kind === "podcast" ? "podcast" : "music";
  const entity = item.media_kind === "podcast" ? "podcast" : "song";
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(item.title)}&media=${media}&entity=${entity}&limit=12&country=US`;
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const payload = await res.json();
    const rows = Array.isArray(payload?.results) ? payload.results : [];
    const target = normalise(item.title);
    const exact = rows.find((r: any) => [r.trackName, r.collectionName].some(v => normalise(v) === target));
    if (!exact) return null;
    const id = Number(exact.trackId || exact.collectionId);
    if (!Number.isSafeInteger(id) || id <= 0) return null;
    const artwork = String(exact.artworkUrl100 || "").replace(/100x100bb\./, "600x600bb.");
    const preview = typeof exact.previewUrl === "string" && /^https:\/\/audio-ssl\.itunes\.apple\.com\//.test(exact.previewUrl) ? exact.previewUrl : null;
    return {
      source_key: `itunes:${id}`,
      title: String(exact.trackName || exact.collectionName || item.title),
      normalized_title: normalise(item.title),
      year: item.year ? Number(item.year) : null,
      media_kind: item.media_kind || "audio",
      tmdb_id: null,
      source: "itunes",
      is_catalog_title: true,
      is_trending: false,
      trending_rank: null,
      kids_approved: item.kids_approved === true,
      kids_age_bands: Array.isArray(item.kids_age_bands) ? item.kids_age_bands.slice(0, 8) : [],
      poster_url: /^https:\/\/is\d+-ssl\.mzstatic\.com\//.test(artwork) ? artwork : null,
      poster_large_url: /^https:\/\/is\d+-ssl\.mzstatic\.com\//.test(artwork) ? artwork : null,
      poster_original_url: null,
      backdrop_url: null,
      overview: null,
      genres: exact.primaryGenreName ? [String(exact.primaryGenreName)] : [],
      runtime_minutes: Number(exact.trackTimeMillis) > 0 ? Math.max(1, Math.round(Number(exact.trackTimeMillis) / 60000)) : null,
      content_rating: null,
      vote_average: null,
      original_language: null,
      preview_kind: preview ? "audio" : null,
      preview_provider: preview ? "itunes" : null,
      preview_url: preview,
      preview_embed_url: null,
      availability: { source: "itunes", store_url: typeof exact.trackViewUrl === "string" ? exact.trackViewUrl : (exact.collectionViewUrl || null) },
      source_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error(JSON.stringify({ event: "catalog-sync-itunes-failed", title: item.title, error: String(error) }));
    return null;
  }
}

async function resolveCatalogItem(item: any, token: string) {
  if (!item || typeof item.title !== "string" || !item.title.trim()) return null;
  if (["movie", "tv"].includes(item.media_kind)) return await resolveTmdb(item, token);
  if (["music", "podcast", "audiobook", "audio"].includes(item.media_kind)) return await resolveAudio(item);
  return null;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      out[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return out;
}

async function trending(token: string) {
  const data = await tmdb(`/trending/all/day?language=en-US`, token);
  const items = (Array.isArray(data?.results) ? data.results : [])
    .filter((r: any) => ["movie", "tv"].includes(r?.media_type) && r?.adult !== true && Number.isSafeInteger(r?.id))
    .slice(0, MAX_TRENDING);
  const rows = await mapLimit(items, CONCURRENCY, async (r: any, index) => {
    const kind: "movie" | "tv" = r.media_type;
    const record = await details(r.id, kind, token);
    if (!record || record.adult === true) return null;
    const runtime = kind === "movie" ? Number(record.runtime) : Number(record.episode_run_time?.[0]);
    return {
      source_key: `tmdb:${kind}:${record.id}`,
      title: titleOf(record, kind),
      normalized_title: normalise(titleOf(record, kind)),
      year: yearOf(record, kind),
      media_kind: kind,
      tmdb_id: record.id,
      source: "tmdb",
      is_catalog_title: false,
      is_trending: true,
      trending_rank: index + 1,
      kids_approved: false,
      kids_age_bands: [],
      poster_url: fullImage(record.poster_path, "w500"),
      poster_large_url: fullImage(record.poster_path, "w780"),
      poster_original_url: fullImage(record.poster_path, "original"),
      backdrop_url: fullImage(record.backdrop_path, "w1280"),
      overview: typeof record.overview === "string" ? record.overview.trim().slice(0, 4000) || null : null,
      genres: Array.isArray(record.genres) ? record.genres.map((g: any) => String(g?.name || "").trim()).filter(Boolean).slice(0, 20) : [],
      runtime_minutes: Number.isFinite(runtime) && runtime > 0 && runtime <= 1440 ? Math.round(runtime) : null,
      content_rating: chooseRating(record, kind),
      vote_average: Number.isFinite(Number(record.vote_average)) ? Math.max(0, Math.min(10, Number(record.vote_average))) : null,
      original_language: typeof record.original_language === "string" ? record.original_language.slice(0, 16) : null,
      ...chooseVideo(record.videos, kind),
      availability: availabilityFrom(record),
      source_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });
  return rows.filter(Boolean) as any[];
}

function mergeRows(catalogRows: any[], trendingRows: any[]) {
  const map = new Map<string, any>();
  for (const row of [...catalogRows, ...trendingRows]) {
    if (!row?.source_key) continue;
    const prev = map.get(row.source_key);
    if (!prev) { map.set(row.source_key, row); continue; }
    map.set(row.source_key, {
      ...prev,
      ...row,
      is_catalog_title: prev.is_catalog_title === true || row.is_catalog_title === true,
      is_trending: prev.is_trending === true || row.is_trending === true,
      trending_rank: row.trending_rank ?? prev.trending_rank ?? null,
      kids_approved: prev.kids_approved === true || row.kids_approved === true,
      kids_age_bands: (prev.kids_age_bands?.length ? prev.kids_age_bands : row.kids_age_bands) || [],
      // A catalogue row carries the intentional normalized title used by the app.
      normalized_title: prev.is_catalog_title ? prev.normalized_title : row.normalized_title,
    });
  }
  return [...map.values()];
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const started = Date.now();
  try {
    const claims = await authorize(req);
    const tmdbToken = Deno.env.get("TMDB_API_KEY");
    if (!tmdbToken) return json({ error: "TMDB_API_KEY is not configured" }, 503);
    const body = await req.json().catch(() => ({}));
    const incoming = Array.isArray(body?.catalog) ? body.catalog : [];
    const clean = incoming
      .filter((x: any) => x && typeof x.title === "string" && x.title.trim().length > 0 && x.title.length <= 240)
      .map((x: any) => ({
        title: x.title.trim(),
        year: Number.isInteger(Number(x.year)) ? Number(x.year) : null,
        media_kind: ["movie", "tv", "music", "podcast", "audiobook", "audio", "other"].includes(x.media_kind) ? x.media_kind : "other",
        kids_approved: x.kids_approved === true,
        kids_age_bands: Array.isArray(x.kids_age_bands) ? x.kids_age_bands.map(String).slice(0, 8) : [],
      }));

    // Refresh the stalest subset first. The workflow sends the whole catalogue,
    // while the function keeps one daily run bounded and predictable.
    const keys = clean.map((x: any) => normalise(x.title));
    const { data: existing } = await admin
      .from("catalog_media_metadata")
      .select("normalized_title,updated_at")
      .in("normalized_title", keys.slice(0, 1000));
    const last = new Map((existing || []).map((r: any) => [r.normalized_title, Date.parse(r.updated_at || 0) || 0]));
    clean.sort((a: any, b: any) => (last.get(normalise(a.title)) || 0) - (last.get(normalise(b.title)) || 0));
    const selected = clean.slice(0, MAX_CATALOG_PER_RUN);

    const resolved = await mapLimit(selected, CONCURRENCY, (item) => resolveCatalogItem(item, tmdbToken));
    const catalogRows = resolved.filter(Boolean) as any[];
    const trendingRows = body?.include_trending === false ? [] : await trending(tmdbToken);
    const rows = mergeRows(catalogRows, trendingRows);

    if (trendingRows.length) {
      const { error } = await admin.from("catalog_media_metadata").update({ is_trending: false, trending_rank: null }).eq("is_trending", true);
      if (error) throw error;
    }
    if (rows.length) {
      const { error } = await admin.from("catalog_media_metadata").upsert(rows, { onConflict: "source_key" });
      if (error) throw error;
    }

    const summary = {
      ok: true,
      requested: clean.length,
      catalog_attempted: selected.length,
      catalog_resolved: catalogRows.length,
      trending_resolved: trendingRows.length,
      upserted: rows.length,
      duration_ms: Date.now() - started,
      ref: String(claims.ref || ""),
    };
    console.log(JSON.stringify({ event: "catalog-sync-summary", ...summary }));
    return json(summary);
  } catch (error) {
    console.error(JSON.stringify({ event: "catalog-sync-failed", duration_ms: Date.now() - started, error: String(error) }));
    return json({ error: "catalog sync rejected or failed" }, 403);
  }
});
