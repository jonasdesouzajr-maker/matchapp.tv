# MatchApp — Supabase Setup

## ⚠️ Required: deploy the stripe-webhook Edge Function

This is what automatically grants VIP / Business / Ad-Free after payment,
and revokes them when a subscription ends — replacing flipping `is_vip` by
hand in the table editor.

### Step 1 — Run migration 003

`migrations/003_stripe_webhook.sql` → Raw → copy → Supabase SQL Editor → Run.

Adds the Stripe linkage columns (`stripe_customer_id`, `stripe_subscription_id`,
`subscription_status`, `subscription_plan`) and the `stripe_events` audit table.
You should see `stripe_columns_added = 5` and `events_table_created = 1`.

### Step 2 — Set the Edge Function secrets

Supabase Dashboard → **Edge Functions** → **Manage secrets**. You need three:

| Secret | Where to get it |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys → **Secret key** (`sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Created in Step 4 below (`whsec_...`) — come back and add it |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → **service_role** key |

> **The service_role key bypasses all row-level security.** It belongs only in
> Edge Function secrets — never in `app.js`, never in any file the browser
> downloads, never committed to this repo.

### Step 3 — Deploy the function

**CLI:**
```bash
supabase functions deploy stripe-webhook --no-verify-jwt --project-ref <your-ref>
```

**Dashboard:** Edge Functions → Create function → name it exactly
`stripe-webhook` → paste the contents of
`supabase/functions/stripe-webhook/index.ts` → Deploy.

> **Then untick "Verify JWT with legacy secret" on this function.** Stripe
> cannot send a Supabase JWT, so leaving it on rejects every delivery with a
> 401 before your code runs. This is why `config.toml` sets
> `verify_jwt = false` for this function specifically. Security here comes
> from Stripe signature verification inside the function, not Supabase auth.

Your endpoint URL will be:
```
https://zkymvqrmbabngsqblyye.supabase.co/functions/v1/stripe-webhook
```

### Step 4 — Create the webhook in Stripe

Stripe Dashboard → **Developers** → **Webhooks** → **Add endpoint**

- **Endpoint URL:** the URL above
- **Events to send** — select exactly these four:
  - `checkout.session.completed` (grants the plan)
  - `invoice.payment_succeeded` (confirms renewals)
  - `customer.subscription.deleted` (revokes on cancellation)
  - `customer.subscription.updated` (revokes on lapse/unpaid)

Click **Add endpoint**, then reveal the **Signing secret** (`whsec_...`) and
put it in the `STRIPE_WEBHOOK_SECRET` secret from Step 2.

### Step 5 — Turn on Client reference ID (critical)

This is the most common reason a successful Stripe payment does not upgrade
the user's profile. The webhook cannot grant a plan without knowing *who*
paid.

For **each** of your four Payment Links: Stripe → Payment Links → open the
link → **⋯** → Edit → under options, enable **"Client reference ID"**.

Without this, payments arrive with no indication of *which* user paid, and
the webhook can't grant anything. If you see this in the function logs:

```
No client_reference_id on session cs_... — cannot identify the user.
```

…that's the switch that's missing.

### Step 6 — Set the success redirect (optional but recommended)

On each Payment Link, set the confirmation page to redirect to:
```
https://matchapp.tv/?checkout=success
```
The app watches for that parameter and polls until the new tier appears,
then fires a confirmation toast and confetti — so a buyer sees their upgrade
immediately instead of wondering whether it worked.

### Step 7 — Test it

Stripe → Webhooks → your endpoint → **Send test webhook** →
`checkout.session.completed`. Then check:

- Supabase → Edge Functions → stripe-webhook → **Logs** for `[stripe-webhook]` lines
- `select * from public.stripe_events order by processed_at desc limit 5;`

For a real end-to-end test, use a [Stripe test card](https://docs.stripe.com/testing)
(`4242 4242 4242 4242`) in test mode with test-mode keys and links.

---

## How it behaves

| Event | Effect |
|---|---|
| Ad-Free Pass purchased ($1.99) | `is_ad_free = true` |
| VIP Monthly / Annual purchased | `is_vip = true`, `is_ad_free = true` |
| Business purchased ($49) | `is_business = true`, plus VIP and ad-free |
| Renewal succeeds | status refreshed to `active` |
| Subscription cancelled / unpaid | `is_vip` and `is_business` cleared |

Two deliberate design choices worth knowing:

**Cancellation never clears `is_ad_free`.** The $1.99 Ad-Free Pass is a
one-time purchase — a separate lapsed subscription must not take it away.

**`past_due` does not revoke access.** Stripe retries failed cards for days;
locking out a paying customer over a temporary decline would be worse than
briefly serving someone whose renewal is still resolving.

**Retries are safe.** Stripe redelivers webhooks on failure. Every event ID
is recorded in `stripe_events`, and a duplicate is detected and skipped
rather than applied twice.

---

## ⚠️ Required: deploy the gemini-proxy Edge Function

> **Already deployed this before?** The file changed again — the AI
> Concierge's prompt engineering moved from the browser into this function
> (see "What changed most recently" below). **Redeploy it**, same steps as
> before.

**Root cause of both the "always shows the same result" and "Ask AI only
returns podcasts" bugs:** Google shut down Gemini 1.0, 1.5, and 2.0 Flash
between early and mid-2026. Any Edge Function still pointed at one of those
retired model names has been returning 404 on every single call — silently,
since the frontend was written to treat any proxy failure as "fall back to
offline mode" rather than surface the error.

`supabase/functions/gemini-proxy/index.ts` is the fix: it tries a short chain
of currently-supported models (`gemini-3.5-flash` → `gemini-2.5-flash` →
`gemini-3.1-flash-lite`), only falling through to the next one on an actual
failure — so a future Google deprecation alone can't take this down again.

### What changed most recently

The AI Concierge's actual prompt — the instructions that shape its tone,
what it's allowed to recommend, how it structures its JSON reply — used to
be built as a plain string in `discover.js`, fully readable by anyone who
opened the browser's DevTools. It now lives in this function instead. The
browser sends only `{ mode: "discover", question, lang, country, age }`;
the function assembles the real prompt server-side. The main questionnaire's
match engine is unaffected — it still sends a pre-built `{ prompt }` directly,
which this function still accepts for backward compatibility.

### How to deploy

**Option A — Supabase CLI** (if you have it installed locally):
```bash
supabase functions deploy gemini-proxy --project-ref <your-project-ref>
```

**Option B — Dashboard** (no CLI needed):
1. Supabase Dashboard → **Edge Functions** → open (or create) `gemini-proxy`
2. Open `supabase/functions/gemini-proxy/index.ts` on GitHub, click **Raw**
3. Select all, copy, paste over the existing function code in the dashboard editor
4. Click **Deploy**

### Also verify the secret is set

The function reads `GEMINI_API_KEY` from the project's Edge Function secrets.
Dashboard → **Edge Functions** → **Manage secrets** → confirm `GEMINI_API_KEY`
exists and is a valid key from [Google AI Studio](https://aistudio.google.com/apikey).
If it's missing, the function now returns a clear `"GEMINI_API_KEY secret is
not set"` error instead of failing silently — check the Edge Function logs
in the dashboard if Ask AI still isn't working after deploying.

### Verify it worked

Ask a real question on `/discover.html` — you should get a natural-language
answer within a couple of seconds, not the offline-mode badge. The response
also includes a `_servedByModel` field if you want to confirm which model in
the chain actually answered (visible in the browser's Network tab).

---

## ⚠️ Required: run the quota migration

The match quota and share-reward system is enforced **server-side**. Until the
migration below is applied, the RPCs it defines do not exist, and the client
falls back to the old localStorage metering (which still works, but is
tamper-able).

### How to apply

> **Paste the file's CONTENTS, not its path.** Pasting
> `supabase/migrations/001_server_quota.sql` into the editor makes Postgres try
> to run the filename as SQL and fails with
> `ERROR: 42601: syntax error at or near "supabase"`.

1. Open `migrations/001_server_quota.sql` on GitHub and click **Raw**
2. Select all (Ctrl/Cmd-A) and copy
3. Supabase → **SQL Editor** → **New query** → paste → **Run**

You should see `Success. No rows returned`.

This migration is idempotent — safe to re-run.

### Verify it worked

Run this in the SQL Editor while signed in as any user:

```sql
select public.match_status();
```

Expected shape:

```json
{"authenticated": true, "used": 0, "limit": 5, "remaining": 5,
 "is_vip": false, "share_rewards_left": 3, "reset_in_seconds": 0}
```

---

## What if `profiles` didn't exist?

That's fine — the migration **creates it**, along with:
- a trigger that auto-creates a profile row whenever someone signs up
- a backfill for any users who registered before the migration ran
- RLS policies scoped to `auth.uid() = id`

If you previously saw `ERROR: 42P01: relation "public.profiles" does not exist`,
that's what this fixes.

---

## What the migration does

| Object | Purpose |
|---|---|
| `profiles.daily_match_count` | Legacy column name: included AI actions consumed today (Match or Ask AI) |
| `profiles.daily_match_date` | Date the counter refers to (auto-rolls) |
| `profiles.share_rewards` | Timestamps of granted share bonuses |
| `consume_match()` | Atomically checks + increments. Returns `allowed` |
| `claim_share_reward()` | Grants a bonus, max 3 per rolling 6h |
| `match_status()` | Read-only status for the header badge |

### Why it can't be tampered with

`REVOKE UPDATE ... FROM authenticated` removes the client's ability to write
the quota columns at all. UPDATE is then re-granted **only** on the columns a
user legitimately edits (name, country, dob, star sign, age, avatar). The three
functions are `SECURITY DEFINER`, so they run with the owner's rights and are
the only path that can touch the counters — and each enforces the limit itself
before writing. `FOR UPDATE` row locks make concurrent requests safe, and
`SET search_path = public` prevents search-path hijacking.

---

## Known limitation: anonymous visitors

Anonymous users have no authenticated identity, so there is nothing to meter
against server-side. Their **3 free matches remain client-side** and can be
reset by clearing localStorage.

This is a deliberate trade-off, not an oversight. Metering anonymous users
properly would require device fingerprinting or IP rate limiting, both of which
carry privacy and false-positive costs (shared IPs, VPNs, offices) that
outweigh protecting a free tier whose purpose is conversion. The registered
tier — where accounts, VIP billing, and abuse actually matter — **is** enforced.

If you later want anonymous limits enforced too, the cleanest route is an Edge
Function fronting the match call with IP-based rate limiting.
