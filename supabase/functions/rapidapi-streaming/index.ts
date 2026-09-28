// Optional RapidAPI display-only enrichment. NO changes to Match or Ask AI.
// Activation REQUIRES RAPIDAPI_STREAMING_ENABLED=true only after confirming
// this key has genuinely free access to this exact provider (no paid plan/overages).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';
import { normalizeStreaming } from './streaming-core.mjs';
const db = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '');
const origins = new Set(['https://matchapp.tv', 'https://www.matchapp.tv',
  'https://matchapp.cc', 'https://www.matchapp.cc',
  'http://localhost:8899', 'http://127.0.0.1:8899']);
const host = 'streaming-availability.p.rapidapi.com';
const cache = new Map<string, { data: unknown; expires: number }>();
let providerPausedUntil = 0;
const cors = (req: Request) => ({
  'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  ...(origins.has(req.headers.get('origin') || '') ?
    { 'Access-Control-Allow-Origin': req.headers.get('origin')! } : {})
});
const reply = (req: Request, data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: cors(req) });
const unavailable = (req: Request, code: string, status = 200) =>
  reply(req, { unavailable: true, code }, status);
async function allow(req: Request) {
  try {
    const ip = String(req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown').split(',')[0].trim();
    const salt = Deno.env.get('RATE_LIMIT_SALT') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!salt) return false;
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ip));
    const key = Array.from(new Uint8Array(digest)).map(n => n.toString(16).padStart(2, '0')).join('');
    // Fail closed: an unavailable limiter must never accidentally incur paid overages.
    const { data, error } = await db.rpc('check_ai_rate_limit', { p_key: 'rapid-stream:' + key, p_limit: 3 });
    return !error && (data as { allowed?: boolean } | null)?.allowed === true;
  } catch { return false; }
}
Deno.serve(async (req: Request) => {
  if (!origins.has(req.headers.get('origin') || '')) return unavailable(req, 'forbidden', 403);
  if (req.method === 'OPTIONS') return reply(req, {});
  if (req.method !== 'POST') return unavailable(req, 'method_not_allowed', 405);
  if (Deno.env.get('RAPIDAPI_STREAMING_ENABLED') !== 'true') return unavailable(req, 'feature_disabled');
  const apiKey = Deno.env.get('RAPIDAPI');
  if (!apiKey) return unavailable(req, 'not_configured', 503);
  const body = await req.json().catch(() => null);
  const id = body?.tmdbId, kind = body?.kind, country = body?.country;
  if (!Number.isSafeInteger(id) || id < 1 || id > 100_000_000 ||
      !['movie', 'tv'].includes(kind) || typeof country !== 'string' ||
      !/^[A-Za-z]{2}$/.test(country)) return unavailable(req, 'invalid_input', 400);
  const request = { tmdbId: id as number, kind: kind as 'movie' | 'tv', country: country.toUpperCase() };
  const key = JSON.stringify(request), previous = cache.get(key);
  if (previous && previous.expires > Date.now()) return reply(req, previous.data);
  if (Date.now() < providerPausedUntil) return unavailable(req, 'provider_paused');
  if (!await allow(req)) return unavailable(req, 'rate_limited', 429);
  try {
    const showId = request.kind + '/' + request.tmdbId;
    const url = new URL('https://' + host + '/shows/' + encodeURIComponent(showId));
    url.searchParams.set('country', request.country.toLowerCase());
    const response = await fetch(url, { method: 'GET',
      headers: { 'X-RapidAPI-Key': apiKey, 'X-RapidAPI-Host': host, Accept: 'application/json' },
      signal: AbortSignal.timeout(4000) });
    if (!response.ok) {
      if ([401, 402, 403, 429].includes(response.status)) providerPausedUntil = Date.now() + 3_600_000;
      return unavailable(req, 'provider_unavailable', response.status === 429 ? 429 : 503);
    }
    if (Number(response.headers.get('content-length')) > 500_000)
      return unavailable(req, 'provider_unavailable', 503);
    const raw = await response.text();
    if (raw.length > 500_000) return unavailable(req, 'provider_unavailable', 503);
    const data = normalizeStreaming(JSON.parse(raw), request);
    if (!data) return unavailable(req, 'unverified_source'); // never assume a mismatched title is correct
    if (cache.size > 400) cache.clear();
    cache.set(key, { data, expires: Date.now() + (data.providers.length ? 6 * 3600_000 : 15 * 60_000) });
    return reply(req, data);
  } catch { return unavailable(req, 'provider_unavailable', 503); }
});
