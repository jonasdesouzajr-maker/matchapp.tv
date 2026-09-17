import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.0";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@6.1.0";

/*
 * GitHub Actions -> Supabase catalog metadata ingest.
 *
 * This endpoint intentionally has Supabase JWT verification disabled because
 * it uses GitHub's short-lived OIDC identity instead. The function verifies
 * issuer, audience, repository, branch and workflow before it ever constructs
 * an admin Supabase client. No long-lived service-role key leaves Supabase.
 */

const OIDC_ISSUER = "https://token.actions.githubusercontent.com";
const OIDC_AUDIENCE = "matchapp-supabase-catalog-media";
const EXPECTED_REPOSITORY = "jonasdesouzajr-maker/matchapp.tv";
const EXPECTED_REF = "refs/heads/main";
const EXPECTED_WORKFLOW_PREFIX = `${EXPECTED_REPOSITORY}/.github/workflows/scraper.yml@`;
const JWKS = createRemoteJWKSet(new URL(`${OIDC_ISSUER}/.well-known/jwks`));
const MAX_ROWS = 500;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function verifyGitHub(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) throw new Error("Missing GitHub OIDC token");

  const { payload } = await jwtVerify(token, JWKS, {
    issuer: OIDC_ISSUER,
    audience: OIDC_AUDIENCE,
  });

  if (payload.repository !== EXPECTED_REPOSITORY) throw new Error("Repository not allowed");
  if (payload.ref !== EXPECTED_REF) throw new Error("Only main may write catalog metadata");
  if (typeof payload.workflow_ref !== "string" || !payload.workflow_ref.startsWith(EXPECTED_WORKFLOW_PREFIX)) {
    throw new Error("Workflow not allowed");
  }
  if (!['schedule', 'workflow_dispatch'].includes(String(payload.event_name || ''))) {
    throw new Error("Event not allowed");
  }
  return payload;
}

function validRow(row: Record<string, unknown>): boolean {
  const kind = String(row.media_kind || "");
  const source = String(row.source || "");
  return typeof row.source_key === "string" && row.source_key.length > 3 && row.source_key.length < 200 &&
    typeof row.title === "string" && row.title.trim().length > 0 && row.title.length < 300 &&
    typeof row.normalized_title === "string" && row.normalized_title.length < 300 &&
    ["movie", "tv", "audio"].includes(kind) &&
    ["TMDB", "iTunes Search API"].includes(source) &&
    row.kids_approved !== undefined;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const claims = await verifyGitHub(req);
    const body = await req.json().catch(() => null) as { rows?: Record<string, unknown>[]; resetTrending?: boolean } | null;
    const rows = Array.isArray(body?.rows) ? body!.rows! : [];
    if (!rows.length || rows.length > MAX_ROWS) return json({ error: "Invalid row batch" }, 400);
    if (!rows.every(validRow)) return json({ error: "Rejected malformed metadata row" }, 400);

    const url = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!url || !serviceKey) throw new Error("Supabase server configuration missing");
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    if (body?.resetTrending === true) {
      const { error } = await admin
        .from("catalog_media_metadata")
        .update({ is_trending: false, trending_rank: null })
        .eq("is_trending", true);
      if (error) throw error;
    }

    const { error } = await admin
      .from("catalog_media_metadata")
      .upsert(rows, { onConflict: "source_key", ignoreDuplicates: false });
    if (error) throw error;

    return json({ ok: true, rows: rows.length, run_id: claims.run_id || null });
  } catch (error) {
    console.error("[catalog-media-ingest]", error instanceof Error ? error.message : String(error));
    const message = error instanceof Error && /allowed|token|OIDC|main|Workflow|Event/.test(error.message)
      ? error.message
      : "Catalog ingest failed";
    return json({ error: message }, /allowed|token|OIDC|main|Workflow|Event/.test(message) ? 403 : 500);
  }
});
