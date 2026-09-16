// ============================================================
// MatchApp — gemini-proxy Edge Function
// ------------------------------------------------------------
// WHY THIS FILE EXISTS
// Every AI match and every "Ask AI" search was silently falling
// back to offline mode. Root cause: Google shut down Gemini 1.0,
// 1.5, and 2.0 Flash between early and mid-2026 — any call to a
// retired model name returns 404, and the frontend was written to
// treat any proxy failure as "AI unavailable, use the fallback."
// If this function was pointed at one of those retired models
// (likely, given when it was first built), it has been 404-ing on
// every single call ever since, invisibly.
//
// THE FIX
// This version tries a short chain of currently-supported models,
// newest-and-cheapest first, and only falls through to the next
// one on an actual failure — so a future Google deprecation alone
// doesn't take the feature down again.
//
// PROMPT ENGINEERING NOW LIVES HERE, NOT IN THE BROWSER
// The AI Concierge's actual instructions — how it should behave,
// what tone to use, how results are structured — used to be built
// as a plain-text string in discover.js, fully visible to anyone
// who opened browser DevTools. That's the one part of this feature
// that's genuinely worth keeping server-side: it's the "how" behind
// the AI Concierge, not public information about the product. The
// client now sends structured parameters (question, language,
// country, age) and this function assembles the actual prompt.
// Everything else about MatchApp — its UI, its catalog, its
// features — is necessarily visible in the browser, because that's
// how the web works; see the accompanying note in supabase/README.md.
// ============================================================

// Model chain, in serving order. Google retires models on a rolling schedule,
// so this keeps several working alternates rather than relying on one name.
//
// UPDATED 2026-09 from a second live diagnostic. All four below are CONFIRMED
// reachable on the production key, which means the chain now has zero
// guaranteed-failing entries — any fallback goes straight to something that
// works instead of burning round-trips on a 404.
//
// ORDERING IS DELIBERATE, and gemini-3.6-flash is NOT first despite being the
// newest. The diagnostic proves reachability — it sends "Reply with exactly:
// OK" with a 10-token cap. That is not the same as proving a model returns
// well-formed structured JSON for discover mode under our responseSchema
// config. gemini-3.5-flash is the one that actually served the end-to-end
// test and produced a correct, parseable discover payload, so it stays
// primary; 3.6 sits directly behind it as the first fallback and will take
// real traffic whenever the primary is busy. If it performs well there it can
// be promoted, but the main path shouldn't be moved onto a model proven only
// to answer a ping.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Service-role client, used ONLY to meter requests (migration 008). The key
// lives in Edge Function secrets and never leaves the server.
const adminDb = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const MODEL_CHAIN = [
  "gemini-3.5-flash",       // PROVEN end-to-end on discover mode — primary
  "gemini-3.6-flash",       // confirmed reachable, newest generation
  "gemini-3.5-flash-lite",  // confirmed reachable, cheaper tier
  "gemini-3.1-flash-lite",  // confirmed reachable, older lite tier
];

// Models the DIAGNOSTIC probes, which is deliberately wider than the serving
// chain above. Trimming the chain to only confirmed-working models is right
// for serving — but if the diagnostic only tested the chain, it could never
// tell us about a newer model worth promoting, or confirm that a removed one
// is still dead. This list is probe-only: nothing here serves traffic until
// it is explicitly moved into MODEL_CHAIN.
const DIAGNOSTIC_PROBE_MODELS = [
  ...MODEL_CHAIN,
  // Retired models, kept here ONLY as probes. They are deliberately absent
  // from MODEL_CHAIN so they never cost a real request, but continuing to
  // test them means the diagnostic still reports plainly that they are dead
  // rather than going silent about them — if Google ever revives one, or
  // retires another, this is where that shows up first.
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];

// ============================================================
// CORS — ALLOW LIST, NOT "*"
//
// This was Access-Control-Allow-Origin: "*", which meant any page on the
// internet could call this function from a visitor's browser and bill the
// Gemini requests to us. The Supabase anon key is public by design (it ships
// in our own client), so "*" left the only real cost control on the client
// side, where it controls nothing.
//
// Non-browser callers (curl, scripts) ignore CORS entirely — that is what the
// rate limiter below is for. This closes the drive-by-from-a-web-page vector;
// the limiter closes the scripted one. Both are needed.
// ============================================================
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
  "https://matchapp.cc",
  "https://www.matchapp.cc",
  "https://matchapp.tv",
  "https://www.matchapp.tv",
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
  // Echo back ONLY an origin we recognise. An unknown origin gets no
  // Allow-Origin header at all, so the browser blocks the response.
  if (ALLOWED_ORIGINS.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

const LANG_NAMES: Record<string, string> = {
  en: "English", "pt-BR": "Brazilian Portuguese", es: "Spanish", fr: "French",
  de: "German", it: "Italian", tr: "Turkish", ru: "Russian", ar: "Arabic",
  hi: "Hindi", id: "Indonesian", ja: "Japanese", ko: "Korean", zh: "Chinese",
};

const DISCOVER_MAX = 12;

// Per-attempt deadline for an upstream Gemini call. The chain has four models,
// so the worst case is bounded well inside the platform's own limit.
const PER_MODEL_TIMEOUT_MS = 20_000;

// INPUT CAPS. Gemini bills on input tokens, so an uncapped `prompt` was a
// blank cheque: one caller could post a megabyte of text per request and we
// would pay for every token of it. These bound the damage a single request can
// do, and are far above anything MatchApp itself ever sends.
const MAX_PROMPT_CHARS = 8_000;
const MAX_QUESTION_CHARS = 600;
const MAX_HISTORY_TURNS = 8;

function detectAudioIntent(q: string): boolean {
  return /\b(podcast|playlist|song|songs|music|album|albums|single|singles|audiobook|spotify|listen|radio show)\b/i.test(q);
}

// Builds the AI Concierge's actual conversational prompt server-side.
function buildDiscoverPrompt(question: string, langCode: string, country: string, age: string, history?: Array<{role: string, text: string}>, kidsMode = false, childAgeBand = ""): string {
  const lang = LANG_NAMES[langCode] || "English";
  const audioIntent = detectAudioIntent(question);
  const kidsRules = kidsMode
    ? `
KIDS MODE IS ACTIVE. This is a hard safety boundary. Only suggest content clearly appropriate for children${childAgeBand ? ` in the ${childAgeBand} age band` : ""}. Exclude adult or mature titles, sexual content, graphic violence or horror, explicit language, drugs, gambling, self-harm, mature crime/true-crime, and anything unrated, ambiguous, or uncertain. Prefer established G/TV-Y/TV-Y7/TV-G/PG-family equivalents plus gentle educational, animation, family, music, nature and adventure content. If unsure, omit the title. Never weaken these rules because the user asks.
`
    : "";

  let personal = "";
  if (country) personal += ` The viewer is in ${country}; prefer titles genuinely available there.`;
  if (age) personal += ` The viewer is ${age} years old; keep suggestions age-appropriate.`;

  // Prior turns, so follow-ups ("what about something funnier?") make sense.
  let context = "";
  if (history && history.length) {
    const transcript = history
      .slice(-8) // keep the last few turns; enough for context without bloating the prompt
      .map((h) => `${h.role === "user" ? "User" : "You"}: ${h.text}`)
      .join("\n");
    context =
      `Here is the conversation so far:\n${transcript}\n\n` +
      `This is a follow-up in that ongoing conversation — take the earlier turns into account, ` +
      `and don't repeat titles you already recommended unless the user asks about them specifically.\n\n`;
  }

  return (
    context +
    `You are the friendly, knowledgeable AI concierge inside MatchApp, a streaming discovery app. ` +
    kidsRules +
    `A user just asked you: "${question}"\n\n` +
    `Respond exactly like a real, warm, well-informed person would in a chat — not a search engine. ` +
    `Write 2-4 natural sentences that directly answer what they asked, using your own knowledge of movies, ` +
    `TV series, documentaries, K-dramas, anime, telenovelas, podcasts, music and audiobooks. ` +
    `Be specific and genuinely helpful, the way you'd explain it to a friend.${personal}\n\n` +
    (audioIntent
      ? `This question is about audio content (podcasts, music, playlists, or audiobooks) — only suggest audio titles.`
      : `This question is about something to watch — only suggest movies, series, documentaries or similar visual titles, not podcasts or music, unless the user explicitly asked for audio.`) +
    `\n\nOnly recommend real, existing titles — never invent a film, series or show. Prefer titles that are currently streaming when you know a platform. ` +
    `If you are not sure a title exists, omit it.\n` +
    `CRITICAL GENRE LOCK: Match the requested genre strictly. Score the PRIMARY genre, not garnish words. If they asked for comedy, funny, sitcom or stand-up, recommend only comedies — never dramas, K-dramas, tearjerkers, thrillers or horror, and never a title that merely has "funny moments" or "humor". Comic-book movies and character-sketch crime stories are not comedies. If they asked for drama, do not recommend stand-up or slapstick comedies. If they asked for romance, K-dramas and rom-coms are allowed; still never swap in a mismatched genre to pad the list.\n` +
    `CRITICAL: Write your "answer" field in ${lang}, matching the language the user asked in. ` +
    `Then list 3 to ${DISCOVER_MAX} real, existing titles that back up your answer, best match first. ` +
    `Every result must include the exact title, year, platform and a 1-2 sentence synopsis in ${lang}. Never return a title without a synopsis.\n` +
    `If the question is conversational rather than a request for titles, still answer warmly and you may ` +
    `return an empty results array.\n` +
    `Output valid JSON ONLY, no markdown fences, no text outside the JSON: ` +
    `{"answer":"Your natural 2-4 sentence conversational reply in ${lang}.","results":[{"title":"Exact Title","year":"YYYY","type":"movie|series|documentary|podcast|music","platform":"Where to watch or listen","synopsis":"One or two sentences, in ${lang}."}]}`
  );
}

// Shared generation settings.
//
// ROOT CAUSE OF THE "OFFLINE" BUG: on Gemini 2.5+ and 3.x, internal "thinking"
// tokens are billed against maxOutputTokens — unlike OpenAI, where reasoning
// tokens are counted separately. The old limit of 1024 meant the model could
// spend most of its budget reasoning and get cut off mid-JSON, returning
// finishReason: MAX_TOKENS with unparseable output. The frontend caught the
// parse error and showed a generic "offline" badge, hiding the real cause.
//
// Fixes: a much larger budget, thinking disabled (this task doesn't need
// chain-of-thought), and native structured output so valid JSON is guaranteed
// rather than merely requested in the prompt.
function buildGenerationConfig(isDiscover: boolean) {
  const base = {
    temperature: 0.65,
    maxOutputTokens: 8192,
    thinkingConfig: { thinkingBudget: 0 },
    responseMimeType: "application/json",
  };

  if (isDiscover) {
    return {
      ...base,
      responseSchema: {
        type: "OBJECT",
        properties: {
          answer: { type: "STRING" },
          results: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING" },
                year: { type: "STRING" },
                type: { type: "STRING" },
                platform: { type: "STRING" },
                synopsis: { type: "STRING" },
              },
              required: ["title"],
            },
          },
        },
        required: ["answer"],
      },
    };
  }

  // Legacy path — the questionnaire match engine, which expects a flat
  // {title, synopsis, platform} object. Applying the discover schema here
  // would silently break every match.
  return {
    ...base,
    responseSchema: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING" },
        synopsis: { type: "STRING" },
        platform: { type: "STRING" },
      },
      required: ["title"],
    },
  };
}

// Per-minute ceilings. Generous enough that no human using MatchApp normally
// will ever see one, tight enough that a script cannot run up a bill. Signed-in
// users get more headroom because they are identified and already metered by
// consume_match() on the match flow itself.
const RATE_LIMIT_AUTHED = 30;
const RATE_LIMIT_ANON = 12;

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Identifies the caller for metering only. Prefers the authenticated user id;
// falls back to a SALTED hash of the forwarded address. The salt means the
// stored value cannot be reversed into an address even with the whole table.
async function bucketKeyFor(req: Request): Promise<{ key: string; limit: number }> {
  const auth = req.headers.get("authorization") || "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (jwt) {
    try {
      const { data } = await adminDb.auth.getUser(jwt);
      if (data?.user?.id) return { key: `u:${data.user.id}`, limit: RATE_LIMIT_AUTHED };
    } catch { /* fall through to address metering */ }
  }

  const fwd = req.headers.get("x-forwarded-for") || "";
  const ip = (fwd.split(",")[0] || req.headers.get("cf-connecting-ip") || "unknown").trim();
  const salt = Deno.env.get("RATE_LIMIT_SALT") || "matchapp-default-salt";
  return { key: `ip:${await sha256Hex(salt + ip)}`, limit: RATE_LIMIT_ANON };
}

async function checkRateLimit(req: Request): Promise<{ allowed: boolean; retryAfter?: number }> {
  try {
    const { key, limit } = await bucketKeyFor(req);
    const { data, error } = await adminDb.rpc("check_ai_rate_limit", { p_key: key, p_limit: limit });
    if (error) {
      console.error("[gemini-proxy] rate limiter unavailable, failing open:", error.message);
      return { allowed: true };
    }
    const res = data as { allowed?: boolean; retry_after_seconds?: number } | null;
    if (res && res.allowed === false) {
      console.warn(`[gemini-proxy] rate limited ${key.slice(0, 12)}...`);
      return { allowed: false, retryAfter: res.retry_after_seconds ?? 60 };
    }
    return { allowed: true };
  } catch (e) {
    console.error("[gemini-proxy] rate limiter threw, failing open:", e instanceof Error ? e.message : String(e));
    return { allowed: true };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  // Only POST does work. Anything else is either a probe or a mistake, and
  // neither should reach the body parser.
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }

  try {
    // ============================================================
    // RATE LIMIT — BEFORE ANY BILLED WORK
    //
    // Runs ahead of the API key read, the body parse and every upstream call,
    // because the whole point is that an abusive caller costs us nothing. A
    // signed-in user is metered on their id; everyone else on a salted hash
    // of their address (see migration 008 — the raw address is never stored).
    //
    // FAILS OPEN, deliberately. If the limiter itself is unreachable, a real
    // user asking a real question still gets an answer. An outage in the
    // meter must not become an outage in the product, and the blast radius of
    // failing open for the minutes that takes is far smaller than the blast
    // radius of MatchApp going dark.
    // ============================================================
    const gate = await checkRateLimit(req);
    if (!gate.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please slow down.", retryAfter: gate.retryAfter ?? 60 }),
        { status: 429, headers: {
            ...corsHeaders(req),
            "Content-Type": "application/json",
            "Retry-After": String(gate.retryAfter ?? 60),
        } }
      );
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY secret is not set on this Edge Function." }),
        { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    let prompt: string;
    let isDiscoverMode = false;

    // ---- DIAGNOSTIC MODE ----
    // POST { "mode": "selftest" } to get a plain-language report of what is
    // and isn't working: whether the API key is set, which models this key
    // can actually reach, and the exact error for the ones it can't. Added
    // because "AI unavailable" on the frontend gave no way to tell whether
    // the problem was a missing secret, a retired model, a quota limit, or
    // a bad key — all of which look identical from the browser.
    if (body && body.mode === "selftest") {
        // ============================================================
        // DIAGNOSTIC — NOW GATED. This was fully public, and it was the
        // cheapest way to burn our Gemini budget that existed: one unauth'd
        // POST fired SIX live generateContent calls, and nothing stopped a
        // loop of them. It also reported the API key's length, the function
        // version and every model name we use — free reconnaissance.
        //
        // It is genuinely useful when Ask AI breaks, so it is gated rather
        // than deleted. Set DIAGNOSTIC_TOKEN in the Edge Function secrets and
        // pass it as { mode: "selftest", token: "..." }. With no token
        // configured the diagnostic is OFF entirely — fail closed, so
        // forgetting to set the secret cannot leave it open.
        // ============================================================
        const expected = Deno.env.get("DIAGNOSTIC_TOKEN");
        const provided = typeof body.token === "string" ? body.token : "";
        if (!expected || provided !== expected) {
            // 404, not 403: an unauthenticated caller should not be able to
            // confirm the diagnostic exists at all.
            return new Response(JSON.stringify({ error: "Not found" }), {
                status: 404, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
            });
        }
        const report: Record<string, unknown> = {
            apiKeyPresent: !!apiKey,
            // apiKeyLength deliberately not reported: a credential's length
            // narrows a brute-force search space and reveals which key format
            // is in use. "is it set at all" is the only part that helps
            // diagnose, and that is what apiKeyPresent above answers.
            functionVersion: "2026-09-hardened+prompt-tighten-temp-065",
            supportsDiscoverMode: true,
            // Which models actually serve traffic, vs which are only probed.
            servingChain: MODEL_CHAIN,
            models: {} as Record<string, string>,
        };
        const models = report.models as Record<string, string>;

        for (const model of DIAGNOSTIC_PROBE_MODELS) {
            try {
                const pac = new AbortController();
                const ptimer = setTimeout(() => pac.abort(), PER_MODEL_TIMEOUT_MS);
                const r = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
                    {
                        method: "POST",
                        signal: pac.signal,
                        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: "Reply with exactly: OK" }] }],
                            generationConfig: { maxOutputTokens: 10 },
                        }),
                    }
                );
                clearTimeout(ptimer);
                if (r.ok) {
                    models[model] = "WORKING";
                } else {
                    const t = await r.text();
                    let hint = "";
                    if (r.status === 404) hint = " — model does not exist or is not enabled for this key";
                    if (r.status === 400) hint = " — bad request or invalid API key";
                    if (r.status === 403) hint = " — key rejected; check the key is valid and the Generative Language API is enabled";
                    if (r.status === 429) hint = " — rate limit or quota exhausted";
                    models[model] = `FAILED ${r.status}${hint}: ${t.slice(0, 200)}`;
                }
            } catch (e) {
                models[model] = `NETWORK ERROR: ${e instanceof Error ? e.message : String(e)}`;
            }
        }

        const anyWorking = Object.values(models).some((v) => v === "WORKING");
        report.verdict = !apiKey
            ? "GEMINI_API_KEY secret is NOT set on this Edge Function. Set it in Supabase → Edge Functions → Manage secrets."
            : anyWorking
                ? "Healthy — at least one model is reachable. If Ask AI still shows offline, the deployed function is likely an older version; redeploy this file."
                : "API key is set but NO model is reachable. Check the key at aistudio.google.com/apikey and confirm the Generative Language API is enabled for that project.";

        return new Response(JSON.stringify(report, null, 2), {
            headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
    }

    if (body && body.mode === "discover" && typeof body.question === "string") {
      // AI Concierge path: build the real prompt here, server-side.
      isDiscoverMode = true;
      // Every field is truncated before it reaches the prompt. A question is
      // a sentence; history is a few turns. Anything larger is either a bug
      // or someone using our Gemini budget as their own, and in both cases
      // the right answer is to bound it rather than to bill it.
      prompt = buildDiscoverPrompt(
        body.question.slice(0, MAX_QUESTION_CHARS),
        typeof body.lang === "string" ? body.lang.slice(0, 8) : "en",
        typeof body.country === "string" ? body.country.slice(0, 60) : "",
        typeof body.age === "string" || typeof body.age === "number" ? String(body.age).slice(0, 4) : "",
        Array.isArray(body.history)
          ? body.history.slice(-MAX_HISTORY_TURNS).map((h: { role?: string; text?: string }) => ({
              role: h?.role === "user" ? "user" : "assistant",
              text: String(h?.text ?? "").slice(0, MAX_QUESTION_CHARS),
            }))
          : [],
        body.kidsMode === true,
        typeof body.childAgeBand === "string" ? body.childAgeBand.slice(0, 12) : ""
      );
    } else if (typeof body?.prompt === "string") {
      // Legacy path: the main questionnaire match engine still sends a
      // pre-built prompt directly. Kept for backward compatibility.
      //
      // This field is the one genuinely open door in the API — it is
      // free-form text that goes straight to a billed model. Reject an
      // oversized one outright rather than truncating it: a caller sending
      // 200KB is not a MatchApp client having a bad day, and silently
      // trimming would hide that from the logs.
      if (body.prompt.length > MAX_PROMPT_CHARS) {
        return new Response(
          JSON.stringify({ error: "Prompt too long." }),
          { status: 413, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
        );
      }
      prompt = body.prompt;
    } else {
      return new Response(
        JSON.stringify({ error: "Request body must include either a string 'prompt' field, or mode:'discover' with a 'question' field." }),
        { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    let lastError: string | null = null;

    for (const model of MODEL_CHAIN) {
      try {
        // A hung upstream used to hold this function open until the platform
        // killed it, with the user staring at a spinner the whole time and
        // the rest of the chain never getting a turn. Each attempt now has
        // its own deadline, so a slow model costs one timeout and falls
        // through to the next instead of costing the whole request.
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), PER_MODEL_TIMEOUT_MS);
        let geminiRes: Response;
        try {
          geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
              method: "POST",
              signal: ac.signal,
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey,
              },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: buildGenerationConfig(isDiscoverMode),
              }),
            }
          );
        } finally {
          clearTimeout(timer);
        }

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          const cand = data?.candidates?.[0];
          const finish = cand?.finishReason;
          const text = cand?.content?.parts?.[0]?.text;

          // A 200 does NOT guarantee usable output. If the model ran out of
          // budget it returns finishReason: MAX_TOKENS with text that is either
          // empty or truncated mid-JSON — which is exactly what produced the
          // "offline" fallback before. Treat that as a failure and try the next
          // model rather than handing the frontend something it can't parse.
          if (finish === "MAX_TOKENS" || !text) {
            lastError = `${model}: finishReason=${finish ?? "none"}, ` +
              `thoughtsTokens=${data?.usageMetadata?.thoughtsTokenCount ?? "n/a"}, ` +
              `outputTokens=${data?.usageMetadata?.candidatesTokenCount ?? 0} — response unusable`;
            continue;
          }

          // Surface which model answered and how it finished, so the browser
          // console can show this without needing Supabase log access.
          return new Response(JSON.stringify({
            ...data,
            _servedByModel: model,
            _finishReason: finish,
          }), {
            headers: { ...corsHeaders(req), "Content-Type": "application/json" },
          });
        }

        // 404 = model retired/unknown; try the next one in the chain.
        // Any other status (401, 429, 500...) is not a model problem,
        // so stop and report it immediately instead of silently retrying.
        if (geminiRes.status === 404) {
          lastError = `${model}: 404 (model unavailable)`;
          continue;
        }

        // Upstream error bodies can carry project identifiers, quota details
        // and key metadata. Log them where only we can read them; tell the
        // browser the status and nothing more.
        const errBody = await geminiRes.text();
        console.error(`[gemini-proxy] ${model} -> ${geminiRes.status}: ${errBody.slice(0, 500)}`);
        return new Response(
          JSON.stringify({ error: "AI service unavailable", status: geminiRes.status }),
          { status: geminiRes.status === 429 ? 429 : 502,
            headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
        );
      } catch (e) {
        lastError = `${model}: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    // Every model in the chain failed.
    console.error(`[gemini-proxy] whole chain failed: ${lastError}`);
    return new Response(
      JSON.stringify({ error: "All Gemini models in the fallback chain failed." }),
      { status: 502, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (e) {
    // Internal exception text can name env vars, file paths and library
    // internals. It belongs in the logs, not in a response body.
    console.error("[gemini-proxy] unhandled:", e instanceof Error ? e.stack || e.message : String(e));
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
