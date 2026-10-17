# Match Tokens, verified Pro and rewarded SSV — server implementation

Status on 2026-10-17: implementation and local verification are complete. The release owner applied the token, first-core-value and one-use Play offer migrations, and deployed the diagnostic and social guards listed in the checkpoint below. Global `enabled` and `rewards_enabled` remain false at this handoff. Google account configuration and Console diagnostics are tracked separately from a genuine completed native purchase or rewarded SSV fulfillment; this document does not assert that either real-user transaction has occurred. Source is frozen pending the release owner’s separate license-test cohort review.

## Scope and preservation

The additive migration is `supabase/migrations/20261017105237_match_tokens_pro_verified_rewards.sql`, generated with the Supabase CLI. All new balances, entitlements, checkout reservations and reward transactions use the new `matchapp_private` schema. Tables have RLS, no browser grants, and no public write policies. New service functions are explicitly revoked from PUBLIC, anon and authenticated. Public wallet calls bind to `auth.uid()`; callers never supply their own account ID.

The migration does not replace `consume_match`, `match_status`, `consume_ai_action`, `daily_match_checkin`, or any Kids function. The tested baseline uses the deployed `consume_match`/`match_status` definitions from migration 012 and the September 21 check-in delta repair. The deployment coordinator also saved live schema/function evidence in a local temporary review file before implementation. The test suite compares the three loaded original function definitions before and after the new migration.

Existing `purchased_matches`, `credits`, Kids balances, ledgers, subscriptions and profile flags are preserved. There is no balance migration, expiration, duplication or balance backfill. The first-core-value follow-up backfills only its marker from already committed successful results. A used purchased Match decrements the same old balance and writes an auditable `match_token_use` ledger row. Daily check-in still grants +1 daily and +6 on day 7 (that day's +1 plus the existing +5 weekly bonus); it continues to populate `purchased_matches`, not the new reward balance.

Two specifically retired adult promotions receive guarded wrappers: `claim_registration_welcome_bonus()` and `claim_match_result_share(text)`. The migration saves each exact installed original function body in a private fallback function. While the new policy is enabled, these return `granted:false` with reason `monetization_policy_changed`. While disabled, the original eligibility and deduplication logic runs. Public ACLs are preserved by CREATE OR REPLACE, and the fallback functions cannot be called by a browser. Signup itself and all existing credited balances remain untouched. The unrelated Kids reward is not wrapped.

## Match wallet contract

| Function | Role and result |
| --- | --- |
| `match_token_status()` | anon receives only `{ok,authenticated:false,enabled,policy_version}`. Authenticated accounts receive the wallet below. This read does not create or debit a wallet. |
| `consume_match_token(p_request_id uuid, p_surface text='one_match')` | Authenticated account only. Surfaces are `one_match` and `ebook`. Returns wallet plus `allowed`, `request_id`, `consumed`, `source`, `reason`. UUID is globally unique and bound to the exact account and surface. |
| `refund_match_token(p_request_id uuid, p_reason text='verified_failure')` | Service only. Restores one exact recorded failure once; an already-refunded UUID cannot purchase another result. There is no browser refund API. |
| `pro_status()` | Authenticated read: `{active, expiresAt, adFree}`; expiry is epoch milliseconds or null. |

An authenticated wallet returns:

```json
{
  "ok": true,
  "enabled": true,
  "policy_version": "match-tokens-v1",
  "authenticated": true,
  "daily_limit": 3,
  "daily_remaining": 3,
  "bonus_tokens": 0,
  "purchased_matches": 0,
  "remaining": 3,
  "available_total": 3,
  "unlimited": false,
  "first_match_pending": true,
  "next_reset_at": "2026-10-18T00:00:00+00:00",
  "ad_free": false,
  "pro_active": false,
  "pro": {"active": false, "expiresAt": null, "adFree": false},
  "is_vip": false,
  "is_business": false,
  "credits": 0,
  "limit": 3,
  "used": 0,
  "rewarded_available": false
}
```

`remaining` includes the daily allowance plus the new rewarded balance. `available_total` also includes existing purchased/earned Matches; it is null for unlimited Pro. `next_reset_at` is an ISO timestamp at UTC midnight. Guests keep the existing browser mechanism; this server does not mint a new anonymous allowance.

Base users receive three daily Matches in the new independent free counter. Legacy VIP and Business retain their existing 10/50 daily benefits by using the existing profile daily counter shared with Ask AI; they do not also receive a second three-token allowance. Legacy VIP flags never become unlimited Pro.

Consumption occurs after the existing provider/source/history validation and immediately before the existing stable result reveal. Lookup failures therefore do not call this function. The follow-up migration `20261017134014_match_tokens_first_core_value.sql` records the first successful adult core result from either One Match or the e-book matcher, including a verified unlimited Pro result. It uses the normal daily allowance if available, and guarantees a zero-debit first core result once if the existing legacy shared allowance was already exhausted. After three ebook-only successes, `first_match_pending` is false and a fourth ebook or One Match is denied before another lookup or debit. The first successful reveal itself stays quiet; the client opens the depleted gate on a later attempt. Existing non-refunded ebook history is backfilled without touching any balance. A trusted service can reverse an exact verified render failure; the browser cannot self-report a failure to gain credits. The refund marker retains any other non-refunded successful adult core result.

Debit order is verified Pro, remaining daily benefit, the guaranteed first core-result exception if needed, rewarded tokens, then the existing purchased/earned pool. Request replays return the original recorded decision without an additional charge. Failed requests have no debit record.

## Verified Pro service contract

Pro is active only when a server-verified entitlement has all of:

- `product_verified = true`;
- `paid = true`;
- `status IN ('active','canceled')`;
- future `expires_at`.

Unpaid trials, pending purchases, holds, paused subscriptions, expired, revoked and superseded purchases do not grant Pro. The Play verifier maps an entitled grace period to paid active; on-hold becomes inactive past_due. Ad-free is the union of strict Pro and existing legacy VIP/Business/ad-free purchases. Existing verified Pro continues to work if new sales are paused or the product is removed from the new-sales allowlist.

All APIs below are service-only:

| RPC | Purpose |
| --- | --- |
| `get_matchapp_monetization_config()` | `{ok,enabled,rewards_enabled,stripe_product_ids,play_product_ids,policy_version}`. Defaults: both flags false, product arrays empty. |
| `set_matchapp_monetization_config(p_enabled,p_rewards_enabled,p_stripe_product_ids,p_play_product_ids)` | Reviewed rollout configuration; returns the same shape. |
| `upsert_pro_entitlement(...)` | Verified provider fulfillment described below. |
| `get_pro_billing_state(p_user_id uuid)` | `{ok,entitlements:[...],pro:{active,expiresAt,adFree},adFree}`. |
| `get_pro_entitlement_by_external_id(p_provider,p_external_id)` | One owned server row or null. |
| `get_pro_entitlements_by_customer(p_customer_id)` | Stripe customer rows only, for narrow webhook routing. |
| `reserve_pro_billing_request(p_user_id)` | Separate 30/min account limiter; never consumes legacy Kids/Jonas Stripe quota. |
| `bind_play_billing_account(p_user_id,p_obfuscated_id)` | Immutable user ↔ HMAC-derived 64-hex Play account mapping. |
| `get_play_billing_account_user(p_obfuscated_id)` | Owner UUID or null, including RTDN-before-native-verify recovery. |
| `reserve_play_billing_request(p_user_id)` | Separate 12/min account limiter. |
| `reserve_pro_checkout(p_user_id,p_price_id,p_lang)` | One open 31-minute request UUID per account, immutable price/locale during its lifetime; returns stored `request_id,price_id,lang,expires_at,customer_id`. |
| `bind_pro_checkout_customer(p_user_id,p_request_id,p_customer_id)` | Compare-and-set for that exact intent; never changes a different existing customer. |

Upsert parameters are:

```text
p_user_id uuid, p_provider text, p_external_id text, p_product_id text,
p_status text, p_paid boolean, p_expires_at timestamptz,
p_verified_at timestamptz, p_provider_event_at timestamptz,
p_customer_id text = null, p_cancel_at_period_end boolean = false,
p_auto_renew boolean = false, p_token_hash text = null,
p_replaces_external_id text = null
```

Result: `{ok,applied,reason,active}`. Providers are `stripe` and `play`. Statuses are `active`, `trialing`, `past_due`, `canceled`, `expired`, `revoked`, `paused`, `pending`, `superseded`. All fulfillment must first authenticate the actual provider purchase/event in the owning Edge handler. The SQL RPC is not an alternate payment verifier.

A provider/external-ID owner cannot change. An existing non-null Stripe customer cannot change. New products must be allowlisted; a previously verified record can still be reconciled after its same product is removed from new sales. `provider_event_at` takes precedence and `verified_at` breaks equal-event ties; stale events do not replace newer provider facts. Callers capture their verification time before querying the provider. Play external ID and token hash are the same SHA256 of the raw purchase token; the table stores no raw Play purchase token. A verified linked token can supersede only a same-owner older record, which cannot subsequently be reactivated by a late callback. `ever_paid` preserves historical paid-customer eligibility.

### Recoverable Stripe checkout

Checkout accepts the five reviewed real regional Stripe price IDs and the 14 exact locales including `pt-BR`. The database retains one **31-minute private quote**, including an immutable request UUID, price, language and customer binding. An unexpired intent is reused even when another tab requests a different price or language; the Edge caller rejects that mismatch. The bound Pro customer survives intent renewal. No schema change is required for recovery.

`_shared/pro-checkout.mjs` omits `expires_at` from the Stripe creation request. Stripe then assigns its documented default of 24 hours. This prevents a failed first request from leaving a private quote whose remaining lifetime is below Stripe's 30-minute creation minimum. The Stripe request body stays deterministic for the persisted UUID; retries use `matchapp-pro-<request UUID>`. Private quote expiry and provider payment-page expiry have different purposes and are deliberately separate. [Stripe Checkout creation API](https://docs.stripe.com/api/checkout/sessions/create)

Before returning or creating a payment page, the helper checks the bound customer's ongoing Pro subscriptions and lists up to ten open Checkout sessions. It rejects pagination, malformed results, and multiple open pages. Each candidate must be live, owned by the authenticated account, in subscription mode, and bound to that exact Pro customer. Client reference, product metadata, one approved price, quantity, currency, hosted destination and return language must all agree. Arabic and Hindi both use Stripe's `auto` locale, so the exact MatchApp return URLs and authored language metadata also distinguish them. [Stripe Checkout list API](https://docs.stripe.com/api/checkout/sessions/list)

One matching open session is reused, including an orphan whose creation response was lost or whose private quote has since expired. A changed price or language can replace an old owned page only after that old private quote expired. New sessions carry the immutable quote UUID, expiry and language in metadata; earlier matching sessions can be recovered from their verified price and return URLs. Before replacement, the helper explicitly expires the old open page with a stable expiration idempotency key. A failed expiration, an unexpected response, or a race with completed payment invokes the existing receipt verifier and stops the request. It never creates a replacement from an ambiguous expiration result. After successful expiry, it checks open pages and ongoing subscriptions again before creating. [Stripe Checkout expiration API](https://docs.stripe.com/api/checkout/sessions/expire)

Immediately before a provider mutation, the existing customer-binding compare-and-set confirms the same private intent still owns the operation. The helper also avoids beginning a mutation in the final 30 seconds of the private quote, covering the existing bounded Stripe timeout/retry window. Reusing an already verified matching page requires no new provider mutation. A current paid Play plan takes management precedence over expired Stripe history; a verified continuing legacy Stripe subscription blocks a duplicate Pro sale and retains its existing default portal, without the Pro retention coupon.

Focused recovery tests use provider fakes only: delayed first creation, a lost creation response, orphan reuse, prior-build metadata compatibility, changed price/language, unexpired-quote rejection, expiration/completion races, post-expiry subscription appearance, bounded lists, ownership/price/currency/locale failures, same-intent concurrency, returned-quote validation and stale intent fencing. No real customer, payment page, subscription or charge is created or changed by these tests.

## Reward Edge contract and lifecycle

`POST https://zkymvqrmbabngsqblyye.supabase.co/functions/v1/reward-session` requires the current registered user's `Authorization: Bearer <JWT>` and JSON Content-Type. The endpoint calls Supabase Auth `getUser`, rejects anonymous Auth sessions, validates a small bounded body and accepts only fixed action fields. Supabase's gateway JWT check is disabled solely because this project uses ES256 sessions; internal Auth verification remains mandatory. Browser origins are limited to MatchApp apex/www; a native authenticated HTTP request may omit Origin.

| Action | Body and response |
| --- | --- |
| `create` | `{action,requestId:UUID,surface:'one_match'|'ebook'}` → `{ok,claimNonce,expiresAt,adUnitId,rewardAmount:3,rewardItem:'Match Tokens',wallet}`. Server generates a 256-bit nonce; request retry reuses the same promise. |
| `native_validate` | `{action,claimNonce}` → `{ok,claimNonce,userId,expiresAt,adUnitId,rewardAmount:3}`. Same authenticated owner; one preparation per nonce. |
| `status` | `{action,claimNonce}` → `{ok,claimNonce,status,credited,wallet}`. Status is created/prepared/credited/expired/cancelled. |
| `cancel` | `{action,claimNonce}` → same status shape. Releases a failed/cancelled preload. |
| `wallet` | `{action:'wallet'}` → authenticated wallet. |

The private `reward_session_service(p_action,p_user_id,p_request_id,p_claim_nonce,p_surface)` implements the same bound session after the Edge verifies the JWT. It is not browser-callable. Reward-session requests have their own 60/min limiter, enough for the bounded reconciliation polling; this does not touch Match/Ask or billing quotas.

New claims require both rollout flags, an exhausted non-Pro wallet and a previous successful One Match. They last 15 minutes, freeze the exact reward, and permit one native preparation. A fresh create request recovers the same outstanding owned promise after a lost response or page reload; it does not create another claim or authorize another native preparation. A cancelled preload can be replaced; a signed completion of a previously prepared promise is still honored after cancellation, delayed delivery, a later Pro purchase or a rollout pause. Cancelled claims that were never prepared earn nothing.

The production unit is exactly `ca-app-pub-9541435081010948/2802190985`, configured by the release owner for 3 `Match Tokens`, with Adpods off. This implementation does not start ads from the web, replace the existing native banner, or expose a generic “earned” grant action. The native bridge keeps the explicit user gesture, current consent, foreground lifecycle and main-frame origin checks. The JavaScript SDK event only starts reconciliation; a balance changes only after signed SSV.

## Signed SSV

The callback URL to configure in that exact AdMob rewarded unit is:

`https://zkymvqrmbabngsqblyye.supabase.co/functions/v1/reward-ssv`

The public GET endpoint verifies Google's signature before any privileged database operation. It uses the unmodified query bytes before the final `signature` and `key_id` parameters, validates DER ECDSA SHA256 with P-256 SPKI keys, rejects duplicate/encoded/malformed parameter names and bounds all input sizes. It never accepts a client key or a caller-chosen key URL.

Keys come only from `https://www.gstatic.com/admob/reward/verifier-keys.json`, with HTTPS redirects disabled, bounded download time/size and a six-hour cache. Unknown keys can trigger a bounded rotation refresh. Expired caches, unavailable keys and invalid signatures fail closed. The cache lifetime is below Google's documented maximum 24 hours.

After signature verification, the endpoint requires the exact nonce, current bound user UUID, exact configured unit, amount 3, item `Match Tokens`, hex transaction ID and a realistic recent event timestamp. Google's official `ad_unit` example is numeric; the verifier accepts only the configured suffix `2802190985` or the exact full ID and normalizes to the full stored ID. Google labels the timestamp milliseconds but also prints a 16-digit example; the verifier explicitly accepts 13-digit milliseconds or 16-digit microseconds, then normalizes to ISO milliseconds and rejects seconds/arbitrary units/future or older-than-24-hour events.

`credit_match_reward(p_claim_nonce,p_user_id,p_transaction_id,p_ad_unit,p_reward_amount,p_reward_item,p_event_at)` is service-only. It rechecks the stored unit/reward/owner, requires native preparation and a reward event inside the stored session window (with at most one minute of server/Google clock skew at preparation), and atomically writes one unique transaction and increments only `reward_balance` by 3. Both the global transaction ID and the claim nonce are unique in the reward ledger. Exact callback retries return success without granting again; mismatched transaction reuse or a second transaction for an already-credited claim fails. Valid fulfillment returns HTTP 200; transient verification/database outages return 503 for Google's retries. Responses and logs do not expose a user's wallet to the public callback caller.

### AdMob Console URL diagnostic

The Console's **Verify URL** probe must use this exact reserved pair:

| Console field | Exact value |
| --- | --- |
| User ID | `00000000-0000-0000-0000-000000000000` |
| Custom data | `0000000000000000000000000000000000000000000000000000000000000000` |

The probe passes the same raw-query Google ECDSA verification, exact rewarded unit, amount 3, item `Match Tokens`, transaction format and future-clock checks as a real callback. It additionally must be no older than five minutes. Using only one reserved field with a real user or nonce is rejected. The isolated dispatcher returns exactly `{ok:true,credited:false,diagnostic:true}` before reading database configuration or calling the ledger. Forged, stale, mismatched and wrong-key probes are rejected; tests assert zero ledger calls in every diagnostic branch. The reserved nonce is also rejected by the shared reward-session request validator.

This proves that a signed Google Console callback can reach and authenticate at the endpoint. It does **not** prove that a native user watched an ad, that a real session fulfilled, that a token was granted, or that rewarded serving is enabled. A separate genuine owned native SSV completion is still the end-to-end integration check. The release owner reconciled an aborted connector attempt, then deployed the tested diagnostic as reward-ssv v12, bundle SHA-256 `78a3f411250c7196be5d983d79f52dd754c5cc1455af952b7e4a2646c870ae22`; account activation evidence is maintained in the account-state checkpoint.

Official protocol references, reviewed 2026-10-17:

- [Google AdMob Android SSV](https://developers.google.com/admob/android/ssv): query signature format, callback parameters, key cache maximum and retries.
- [Google key feed](https://www.gstatic.com/admob/reward/verifier-keys.json): fixed trusted verification-key endpoint linked from that guide.
- [Google rewarded-ad policies](https://support.google.com/admob/answer/7313578): reward disclosure and voluntary opt-in.
- [Google Android rewarded ads](https://developers.google.com/admob/android/rewarded): native SDK lifecycle and completion callbacks.

## Local verification evidence

Run the meaningful database and crypto tests with the repository's explicit Node isolation flags:

```bash
node --test --test-isolation=none tests/match-token-database.test.cjs tests/reward-ssv.test.cjs tests/play-pro-offer-database.test.cjs
node --test --test-isolation=none tests/adult-promotion-policy.test.cjs tests/official-public-social-proof.test.cjs
```

The updated wallet/database suite passes 26 cases, the cryptographic suite passes 16, and the separate Play offer ledger passes 11 (53 cases total, 0 failures or skipped). The social cutoff suite plus the unchanged official public-post verification suite passes another 13 cases. The actual client/SQL Bookworms regression also passes its three separate integration cases. The database cases execute the migration and real stored procedures against PGlite/PostgreSQL, including actual role/grant checks, three free successes, idempotent requests, first-value exception, exact service-only refunds, UTC rollover, old purchased/check-in balances, VIP/Business shared benefits, paid Pro predicate, stale provider events, Play ownership/supersession, checkout/customer races, isolated limiters, nonce ownership/preparation, transaction replay, malformed rewards, delayed/cancelled rewards, and both adult-promotion rollback paths. The crypto cases use independently generated Node ECDSA DER signatures and WebCrypto verification, preserving raw encoding and testing tampering, wrong keys, malformed key feeds, bounded refresh, timestamp variants and forbidden client grant actions.

Both new Edge endpoints passed Deno typechecking with the existing pinned Supabase dependency. The actual command used the shared local Deno/cache toolchain, with `check --cached-only` on `reward-session/index.ts` and `reward-ssv/index.ts`. The implementation has no new network package, live user mutation or deployment hidden in its tests.

PGlite is not a parallel multi-connection load test. Production concurrency is protected with PostgreSQL row/advisory locks and unique constraints; the release owner should verify the reviewed RPC definitions/ACLs and one controlled genuine SSV completion after deployment. A real billing receipt, native-device lifecycle run and AdMob SSV/account activation remain release integration evidence, not facts established by these local tests.

## Activation and rollback

Before deployment, review the exact SQL and new Edge sources, compare the two adult RPC signatures to live, and retain the private fallback bodies. Deploy the additive migration and handlers with configuration false/false first; verify public policy reads and private ACLs. Publish the guarded client integration only after its independent tests. Populate only verified real Pro product IDs, enable the token policy after the full wallet/paid-baseline review, and enable rewards only after the exact AdMob callback and native test-device completion have produced one correct idempotent ledger grant. Do not substitute fake unit IDs, client earned events or a test public key.

For a reward incident, turn `rewards_enabled` off while leaving `enabled` on. This blocks new ad claims and preserves earned token spending and existing Pro. For a new-sales incident, remove the relevant new-sales product allowlist while retaining the enabled wallet; already verified same-product entitlements continue to reconcile and function. These narrower switches preserve the new wallet while stopping the affected operation.

For a full policy rollback, a trusted SQL operator can preserve the SKU arrays and disable both flags:

```sql
select public.set_matchapp_monetization_config(
  false, false, stripe_product_ids, play_product_ids
)
from matchapp_private.monetization_config
where singleton;
```

This restores the existing free/legacy frontend path and old guarded adult promotion behavior, while verified paid Pro continues to be recognized. No table or ledger is dropped. Existing purchased/earned legacy pools remain available through the unchanged old routes. New SSV balances remain recorded and resume through the new wallet when its policy is re-enabled; use the narrower reward-only pause when continued new-wallet spending is required. Genuine callbacks for prepared sessions still fulfill their promises during any pause.

Do not delete the new schema after a verified entitlement, checkout intent or rewarded grant has been recorded. The audit trail and account/purchase bindings must survive a UI rollback. If a function change must be reverted, retain the data and use an independently reviewed corrective migration; service-only exact request refunds are available for verified individual failed results, not for client-submitted claims.


## One-use Play Pro offer authorization

`20261017134349_play_pro_offer_once.sql` adds only two private RLS tables and two service-only RPCs. It preserves the deployed Pro upsert, wallet, purchased balances, daily check-in and Kids APIs. The reviewed allowlist is the actual `matchapp_pro` product, `monthly` base plan and `retain-50-3m` developer-determined offer. The account owner subsequently confirmed the exact Console/API offer as 50% for three monthly billing cycles; its availability is still controlled independently by the Play endpoint's actual offer configuration and purchase flags.

| Service RPC | Request | Response |
| --- | --- | --- |
| `reserve_play_pro_offer` | `p_user_id`, `p_product_id`, `p_base_plan_id`, `p_offer_id`, `p_source_token_hash`, `p_purpose` (`retention` or `winback`) | `{ok,eligible,claimNonce,issuedAt,expiresAt}`; nonce is UUID, times are epoch milliseconds. |
| `redeem_play_pro_offer` | Same owned product/base/offer, `p_purchase_token_hash`, nullable `p_linked_token_hash`, trusted `p_purchase_started_at` (ISO timestamptz) | `{ok,redeemed,reason}`; exact same-token retries return success. |

The Play endpoint first verifies the live Google subscription, account ownership, paid state, actual base plan/offer and receipt linkage. Reservation then independently checks an existing same-owner, product-verified paid Play source. Retention requires paid active or canceled-but-unexpired state; winback requires expired/canceled paid history and no current paid Pro entitlement on any provider. The endpoint applies its further current-Google checks, including no grace-period retention, before calling the RPC. A disabled policy or absent product allowlist blocks new quotes.

Repeated preparation of the exact source/purpose returns the same open authorization for 24 hours. Merely closing a quote does not redeem it. Expired quotes can be renewed while all prior issued evidence remains immutable. The separate redemption table permits one final redemption per user/product/offer and makes the resulting purchase-token hash globally unique. Retention redemption requires Google's actual linked-token hash to match the issued source; optional winback linkage must still belong to the same account. Both functions use advisory locks, and redemption shares the provider-token lock with the existing entitlement upsert.

A Google pending payment may become paid after the quote deadline or arrive in a delayed RTDN callback. Consequently, the 24-hour deadline controls quote reuse, not revocation of an already issued purchase authorization. The trusted purchase start must be at or after issuance with at most five minutes of provider skew, but no callback-arrival or quote-expiry cutoff can strand a legitimately pending paid purchase. Historical issuance can fulfill after new sales pause. A different token cannot redeem a used offer, and an exact retry cannot consume it again.

The ledger stores hashes only, grants no tokens, creates no Pro entitlement, charges no card and acknowledges no Google purchase. The service endpoint must call redemption only after a real Google-verified paid observation and then use the existing verified entitlement/acknowledgement path. Browser roles cannot issue, redeem, read or write these tables. Eleven executable PostgreSQL/PGlite cases cover these boundaries, including late pending payments, renewed quote history, malformed hashes, source ownership, policy pause, exact retries, roles and unchanged existing balances.

## Retired legacy social awards

The existing guest social proof and TikTok handoff functions were retrieved from live before any patch. `guest-social-proof` matched the repository exactly. `tiktok-share-reward` had no repository source; its exact live implementation is now preserved in its own function directory with only the new issuance guard and shared helper import.

The policy guard reads only the service-owned `get_matchapp_monetization_config()` result and requires a true JSON boolean plus `match-tokens-v1`. A missing, malformed or unavailable configuration fails new promotional issuance closed. With policy disabled, the original call continues unchanged. Client-supplied flags cannot alter this decision.

For guest social proof, only `start` is retired when the policy is enabled. Existing unpredictable pending proofs keep their original 90-minute public-post verification and completion path. Previously earned rows and balances are not edited. The gateway, begin and complete SQL functions retain service-only execution; the account owner verified anon/authenticated execution remains false on all three live procedures. Ordinary sharing is independent and remains available.

The older TikTok handoff protocol has no server-issued pending authorization: a new client event ID immediately inserts an award row. It is therefore impossible to distinguish an unsubmitted preactivation promise from a new request. The owner approved a clear cutoff: future award handoffs are retired after activation, while every committed row, balance and ordinary share is preserved. No pending promise is fabricated. No database migration is required for these two Edge guards.

Tests execute the actual new-start guard blocks with strict enabled/disabled/malformed JSON, verify no issuance call occurs after activation, and reconstruct the exact original source hashes after removing only the guard/import (plus the runtime-neutral guest UUID parameter type). Existing public TikTok/Bluesky proof-verification tests remain green. The entrypoint bodies also pass Deno checking with cached official SDK types. The old JSR ambient import references an uncached OpenAI type dependency, so that unused ambient import alone was omitted in temporary typecheck copies; production imports and dependency versions remain unchanged.


## Release handoff checkpoint — source freeze

The release owner independently reconciled current live hashes before each deployment and verified the migration roles and disabled public policy afterward. No live user reward, purchase or refund was fabricated for these checks.

| Applied migration | Reviewed local SHA-256 | Verification |
| --- | --- | --- |
| `20261017105237_match_tokens_pro_verified_rewards.sql` | `1974b536e22b23851520d0d6428d28490d738e7391745bf4861c1a99418d81cf` | Original additive wallet/Pro/SSV schema and strict role grants retained. |
| `20261017134014_match_tokens_first_core_value.sql` | `55ac3792dd4b24e4d21072ff4f1031fe700ba6e65652b233e9ffd1f55feebea4` | Applied first-core-value semantics; existing balances and ACLs checked, public policy off. |
| `20261017134349_play_pro_offer_once.sql` | `c73cd1e3f961090cbcdc2397c781faa56c3f7af61a34d4c2d7613a8e116f6f46` | Applied service-only offer functions/tables; role checks passed and no issuance/redemption test rows created live. |

| Function | Confirmed deployed version | Deployed bundle SHA-256 |
| --- | --- | --- |
| `reward-ssv` diagnostic | 12 | `78a3f411250c7196be5d983d79f52dd754c5cc1455af952b7e4a2646c870ae22` |
| `guest-social-proof` new-start guard | 44 | `088631574726d28c12039480cdb3c0f48963d2bb702d3186e9194c6497be818d` |
| `tiktok-share-reward` new-handoff guard | 41 | `c81eff79ff96b3d1e2a0d40bbfd09345ae438ebf5c46a711d6437b37be27fc61` |
| `play-billing` owned retention integration | 12 | `ef3fd8194b079d19efd629f9e62cd9a1f8da70be476514e66146d308c7f080e5` |

The social baseline comparison preserved the original public guest authorization/origin gates, verified-post identity checks, proof window and completion logic. The TikTok baseline had no separate pending-authorization mechanism; the explicit new-award cutoff is documented above. The release owner also verified all three live guest SQL procedures deny anon/authenticated execution and permit service-role execution only.

Full Deno checks pass for the shared SSV implementation and its entrypoint. Social entrypoint-body checks pass with the cached official Supabase SDK. A full original social ambient-import check cannot resolve the old JSR EdgeRuntime declaration’s uncached `openai` type dependency in this environment; temporary copies omit only that unused ambient import for the body check, while production keeps it unchanged. The sole additional TypeScript annotation is `unknown` on the existing guest UUID validator parameter, with no runtime change. This limitation is not represented as a complete fresh dependency-resolution check.

The shared reward-session request validator now explicitly rejects the reserved all-zero diagnostic nonce. The previously deployed reward-session bundle predates that extra defense; its existing server-created nonce/owner checks still prohibit arbitrary client claims. A release owner refreshing that function should bundle the current shared verifier and retain its internal Auth `getUser` requirement and `verify_jwt:false`. The diagnostic itself already prevents reserved/mixed fields from reaching any ledger operation in the deployed SSV endpoint.

No source or deployed migration is changed further until the release owner approves the separate, expiring license-test cohort proposal. Existing prepared genuine SSV claims and verified paid receipts must continue to reconcile even when a rollout/test cohort later expires. Public catalog flags, guest routes and unrelated Stripe/Kids billing must not be enabled merely to run a native test.
