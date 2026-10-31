// Older web and Android clients still call this endpoint. Return their existing
// unavailable response without looking up, caching, or returning third-party data.
const origins = new Set(["https://matchapp.tv", "https://www.matchapp.tv", "http://localhost:8899", "http://127.0.0.1:8899"]);

Deno.serve(req => {
  const origin = req.headers.get("origin") || "";
  const allowed = origins.has(origin);
  const headers = {
    "Content-Type": "application/json", "Cache-Control": "no-store", "Vary": "Origin",
    ...(allowed ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
  if (req.method === "OPTIONS") return new Response(null, { status: allowed ? 204 : 403, headers });
  const status = req.method !== "POST" ? 405 : allowed ? 200 : 403;
  return new Response(JSON.stringify({ unavailable: true }), { status, headers });
});
