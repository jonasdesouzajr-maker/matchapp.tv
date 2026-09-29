import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.0";
import { parseRatings } from "./ratings-core.mjs";

const origins = new Set(["https://matchapp.tv", "https://www.matchapp.tv", "http://localhost:8899", "http://127.0.0.1:8899"]);
const db = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
const cache = new Map<string, { expires: number; data: unknown }>();
const json = (req: Request, data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Vary": "Origin",
    ...(origins.has(req.headers.get("origin") || "") ? { "Access-Control-Allow-Origin": req.headers.get("origin")! } : {}),
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS" }
});

Deno.serve(async req => {
  if (req.method === "OPTIONS") return origins.has(req.headers.get("origin") || "") ? json(req, {}, 200) : json(req, {}, 403);
  if (req.method !== "POST") return json(req, { unavailable: true }, 405);
  if (!origins.has(req.headers.get("origin") || "")) return json(req, { unavailable: true }, 403);
  const apiKey = Deno.env.get("OMDB_API_KEY");
  if (!apiKey) return json(req, { unavailable: true }, 503);
  let input: Record<string, unknown>;
  try { input = await req.json(); } catch { return json(req, { unavailable: true }, 400); }
  if (!input || typeof input !== "object" || Array.isArray(input)) return json(req, { unavailable: true }, 400);
  const imdbId = typeof input.imdbId === "string" && /^tt\d{7,10}$/.test(input.imdbId) ? input.imdbId : "";
  const title = typeof input.title === "string" && input.title.trim().length <= 120 ? input.title.trim() : "";
  const kind = input.kind === "movie" || input.kind === "tv" ? input.kind : "";
  const year = Number.isInteger(input.year) && Number(input.year) >= 1888 && Number(input.year) <= 2100 ? Number(input.year) : 0;
  if ((!imdbId && (!title || title.length < 2)) || (input.imdbId && !imdbId) || (input.title && !title)) return json(req, { unavailable: true }, 400);
  const key = JSON.stringify([imdbId, title.toLowerCase(), kind, year]);
  const prior = cache.get(key);
  if (prior && prior.expires > Date.now()) return json(req, prior.data);
  try {
    const ip = (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
    const salt = Deno.env.get("RATE_LIMIT_SALT") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + ip));
    const hash = [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, "0")).join("");
    const { data: limit, error } = await db.rpc("check_ai_rate_limit", { p_key: `omdb:${hash}`, p_limit: 20 });
    if (error || (limit as { allowed?: boolean } | null)?.allowed === false) return json(req, { unavailable: true }, 429);
    const url = new URL("https://www.omdbapi.com/");
    url.searchParams.set("apikey", apiKey);
    if (imdbId) url.searchParams.set("i", imdbId);
    else { url.searchParams.set("t", title); if (year) url.searchParams.set("y", String(year)); }
    if (kind) url.searchParams.set("type", kind === "tv" ? "series" : "movie");
    const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) return json(req, { unavailable: true }, response.status === 429 ? 429 : 502);
    const raw = await response.json();
    const result = parseRatings(raw, { imdbId, title: imdbId ? "" : title, kind, year });
    const data = result ? { ...result, source: "OMDb" } : { unavailable: true };
    if (cache.size > 300) cache.clear();
    cache.set(key, { data, expires: Date.now() + (result ? 86_400_000 : 300_000) });
    return json(req, data);
  } catch (error) { return json(req, { unavailable: true }, error instanceof DOMException && error.name === 'TimeoutError' ? 504 : 502); }
});
