// Isolated, admin-only Firecrawl audit of MatchApp TV pages.
// Never return the Firecrawl API key or expose this function to browser clients.
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json", "cache-control": "no-store" }
});
const allowedHosts = new Set(["matchapp.tv", "www.matchapp.tv"]);
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "POST required" }, 405);
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  // In addition to Supabase's JWT gateway, authorize only backend service-role callers.
  if (!secret || token !== secret) return json({ error: "Unauthorized" }, 401);
  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!firecrawlKey) return json({ error: "FIRECRAWL_API_KEY is not configured" }, 503);
  let url: URL;
  try {
    const input = await req.json();
    if (typeof input?.url !== "string" || input.url.length > 2048) throw new Error("Invalid URL");
    url = new URL(input.url);
    if (url.protocol !== "https:" || !allowedHosts.has(url.hostname) || url.username || url.password || url.port) {
      throw new Error("Only public HTTPS MatchApp TV URLs are permitted");
    }
  } catch {
    return json({ error: "Invalid or unsupported URL" }, 400);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const upstream = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST", signal: controller.signal,
      headers: { authorization: `Bearer ${firecrawlKey}`, "content-type": "application/json" },
      body: JSON.stringify({ url: url.toString(), formats: ["markdown"], onlyMainContent: true, timeout: 20000 })
    });
    if (!upstream.ok) return json({ error: "Firecrawl request failed", status: upstream.status }, 502);
    const data = await upstream.json();
    return json({
      success: data.success === true,
      url: url.toString(),
      title: typeof data.data?.metadata?.title === "string" ? data.data.metadata.title.slice(0, 250) : null,
      description: typeof data.data?.metadata?.description === "string" ? data.data.metadata.description.slice(0, 1000) : null,
      markdown: typeof data.data?.markdown === "string" ? data.data.markdown.slice(0, 30000) : "",
    });
  } catch {
    return json({ error: "Firecrawl unavailable or timed out" }, 502);
  } finally {
    clearTimeout(timeout);
  }
});
