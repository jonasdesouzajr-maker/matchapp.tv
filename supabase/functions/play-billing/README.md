# Google Play subscription verification

The `play-billing` Edge Function verifies the adult package `com.jonas.papercup`. It is additive to the existing billing and matching paths. The account-confirmed product is `matchapp_pro`; the coordinated Console review saved an auto-renewing `monthly` base plan as a draft. A draft, source identifier or successful local test does not establish a live subscription offer.

## Files and dependencies

Deploy `index.ts`, `google-play.ts`, `play-policy.mjs` and `billing-core.mjs` together with their shared imports `../_shared/pro-legacy.mjs` and `../_shared/pro-core.mjs`. External imports retain the established Supabase JS 2.105.0, JOSE 6.1.0 and Stripe 17.7.0 versions. The normal Supabase deploy bundler follows these imports.

`supabase/config.toml` declares `[functions.play-billing] verify_jwt = false`. This does not make privileged actions anonymous: the user route validates the current account through `auth.getUser`, and the RTDN route validates a Google-signed Pub/Sub OIDC token. This project uses ES256 user sessions, which must not be rejected by a legacy gateway JWT verifier.

### Coordinated live checkpoint, 17 October 2026

The release lead deployed the initial function as ACTIVE version 1, function ID `90b93db5-66f0-49e1-9035-d66b98a64ea6`, bundle hash `9d9b3ed0e912dd357d7ba8ed9cfc364dd847be24899e228c533f46241a698106`. The initial reviewed database migration is applied. This checkpoint predates the conditional retention extension described below; that extension and its offer ledger need their own coordinated deployment. New Play sales remain explicitly paused with `PLAY_BILLING_ENABLED=false`; deployment is not a purchase-validation result.

The approved Cloud project is `matchapp-ai` (number 848830689344). Publisher identity: `matchapp-play-billing@matchapp-ai.iam.gserviceaccount.com`. Authenticated push identity: `matchapp-play-rtdn-push@matchapp-ai.iam.gserviceaccount.com`. Topic: `projects/matchapp-ai/topics/matchapp-play-rtdn`; subscription: `projects/matchapp-ai/subscriptions/matchapp-play-rtdn-push`. Audience and endpoint are exactly `https://zkymvqrmbabngsqblyye.supabase.co/functions/v1/play-billing?route=rtdn`. Private credential/HMAC values are configured only in server secrets; the pre-existing legacy credential setting was preserved.

`PLAY_RTDN_ENABLED=true` is now configured. The actual Play Console Send test action at 13:04:54 UTC reached this function with POST 200 at 13:04:55.184 UTC (605 ms; request ID `01a149f7-1f33-7a3d-98af-470c1319da0d`). The release lead also verified expected 204/401/403/401 responses from four live boundary checks and a successful, read-only Publisher catalog request for this app. These establish the configured notification route and API app access. An actual subscription purchase, renewal, acknowledgement and physical license-test flow remain separate gates.

## Server configuration

All credentials below are server secrets. Never put them in BuildConfig, page JavaScript, an AAB, a URL, a release note or a chat transcript.

| Environment variable | Required value or behavior |
| --- | --- |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Existing first-party project configuration; Auth verifies the user and service-only RPCs persist verified metadata |
| `PLAY_PRO_PRODUCT_ID` | `matchapp_pro` |
| `PLAY_PRO_BASE_PLAN_IDS` | Comma-separated allowlist of actual Console base-plan IDs; `monthly` is the currently saved draft |
| `PLAY_PRO_WINBACK_OFFER_IDS` | Actual known discount offer IDs; retain previously issued IDs here for later receipt reconciliation even when offer sales pause |
| `PLAY_PRO_RETENTION_OFFER_ID` | One actual developer-determined Console offer included in the known offer allowlist; blank until its real three-month discount is confirmed |
| `PLAY_PRO_RETENTION_BASE_PLAN_ID` | The real eligible base plan, currently `monthly`; it must also be in the base-plan allowlist |
| `PLAY_RETENTION_ENABLED` | Literal `true` only for a reviewed rollout with the real offer and ledger configured; the private QA admission rules below can limit physical testing to license testers before public activation. Otherwise discount quotes remain off without disabling the ordinary base plan |
| `PLAY_BILLING_ACCOUNT_SECRET` | A protected, stable 32-byte random secret represented as 64 lowercase hexadecimal characters; HMAC binds package and user UUID to an opaque Google account ID |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | The approved service-account JSON with Android Publisher access to this app; parsed and signed only on the server |
| `STRIPE_SECRET_KEY` | Existing server credential, used only for the read-only existing-subscription check before a new Play sale |
| `PLAY_BILLING_ENABLED` | Literal `true` only after public activation verification; otherwise public new sales remain off |
| `PLAY_BILLING_QA_ENABLED` | Default `false`; literal `true` only admits eligibility checks for exact environment-listed testers. An unexpired private cohort, actual catalog and RTDN are still independently required; this does not enable public sales |
| `PLAY_RTDN_ENABLED` | Literal `true` only for the configured, verified push route |
| `PLAY_RTDN_AUDIENCE` | Exact `${SUPABASE_URL}/functions/v1/play-billing?route=rtdn` |
| `PLAY_RTDN_SERVICE_ACCOUNT_EMAIL` | Exact approved Pub/Sub push authentication service-account email |
| `PLAY_RTDN_SUBSCRIPTION` | Exact `projects/<project>/subscriptions/<subscription>` resource name |
| `PLAY_BILLING_TEST_USER_IDS` | Optional comma-separated explicit MatchApp user UUIDs allowed to receive Play license-test receipts. New receipts for these accounts require Google's `testPurchase` marker; a pending/trial row cannot bypass that requirement. Keep the list for delayed test receipt reconciliation when QA preparation is paused. Historical verified paid subscriptions remain restorable. Blank denies test receipts; no match quota changes |

The account-secret binding is immutable in the private database. Do not rotate this value as a routine deploy step; a deliberate rotation needs an ownership-preserving migration. No raw Play purchase token is stored in that database. Service and push identities can be separate and should receive only their required permissions.

## Database contract

The coordinating release applies `20261017105237_match_tokens_pro_verified_rewards.sql`. This function uses its service-only `get_pro_billing_state`, `get_pro_entitlement_by_external_id`, `upsert_pro_entitlement`, `bind_play_billing_account`, `get_play_billing_account_user` and `reserve_play_billing_request` RPCs. New sale admission also requires the coordinated follow-up `20261017141115_monetization_qa_cohort.sql` and its service-only `get_matchapp_user_monetization_config(p_user_id uuid)` RPC. A missing/unavailable policy RPC pauses only new quotes; historical receipt verification and restoration remain independent of it.

`reserve_play_billing_request` admits at most 12 authenticated calls per account per minute, independently of match quotas. Account binding is immutable. A purchase token is represented by its SHA-256 hash for both `external_id` and `token_hash`; the database rejects cross-account reuse, orders provider observations and keeps superseded linked purchases terminal. The exact access predicate is `product_verified && paid && status in (active,canceled) && expires_at > now()`. Null expiry and trials do not confer this paid Pro entitlement.

Public new-sales sessions require both `PLAY_BILLING_ENABLED` and the database's unchanged global `enabled` switch, plus the configured product in `play_product_ids` and the authenticated RTDN route. The account-specific QA alternative is described below. Existing verified receipt reconciliation continues when new sales are paused or a historical product is removed from the sale allowlist. Any failure verifying an existing recurring legacy subscription returns a usable restore session with `purchasesEnabled: false`; it does not reinterpret legacy VIP as unlimited Pro.

## Bounded license-test cohort

This is server-authorized access to the normal policy, not an entitlement or quota grant. The coordinated SQL setter `set_matchapp_qa_cohort(p_user_id uuid,p_expires_at timestamptz)` is service-only, requires a confirmed non-anonymous existing account and limits a grant to 24 hours; a null expiry revokes membership. The global configuration read and anonymous wallet remain unchanged. The authenticated wallet, consumption, adult promotion wrappers and optional offer reservation use that account's effective policy. Reward preparation still requires the genuine first result and zero normal balance. Prepared valid SSV promises, consumed-token refunds and previously issued eligible offer redemptions survive a pause.

`get_matchapp_user_monetization_config` returns the existing `ok`, effective `enabled`/`rewards_enabled`, actual product arrays and `policy_version: "match-tokens-v1"`, plus `global_enabled`, `qa_active` and ISO `qa_expires_at` or null. The Edge Function supplies the already authenticated UUID in its service call; it does not accept a client-selected cohort or user identity.

A private QA quote needs all of `PLAY_BILLING_QA_ENABLED=true`, exact membership in `PLAY_BILLING_TEST_USER_IDS`, an effective enabled policy, `qa_active=true`, a valid bounded future expiry, the actual product allowlist and configured RTDN. Public `PLAY_BILLING_ENABLED`, global `enabled` and global `rewards_enabled` can remain false. Because the existing native session lasts ten minutes, the server stops issuing QA sessions during the last ten minutes of a cohort grant; the whole unchanged session therefore fits inside its authorization window. No web, Kotlin, hidden URL, client flag, local credit or first-value override is added.

For QA-listed accounts, a new token or a token only recorded as pending/trial must carry Google's authentic `testPurchase` object before any persistence or acknowledgement. The requirement is captured from the existing row before a new verified observation is saved and checked again after an acknowledgement timeout. A newly saved row cannot turn off this check during that retry. A previously verified paid token retains normal renewal/expiry/restore reconciliation. Keep the exact test-user list configured after switching off new QA preparation so genuine delayed test receipts can complete through the ordinary verifier or RTDN.

Physical testing uses a Play-delivered internal build of the actual `com.jonas.papercup` package and a Google license-test account. Internal-track membership alone does not prevent real charges: before confirming, check the purchase dialog's test notice, actual Google account and test payment method. The backend receipt check happens after a purchase attempt and cannot prevent a mistakenly confirmed real payment. Do not enable Play Billing Lab's real-payment mode for this QA run. Test the ordinary three successful matches and voluntary rewarded SSV flow before purchasing Pro, since the real verified Pro entitlement correctly removes reward eligibility. Use a separately verified free account rather than changing an existing owner's paid/ad-free benefits.

The existing Profile entry follows the authenticated token-policy response, so normal navigation or a reload reveals it for an admitted account. Stripe catalog/checkout remain subject to the unchanged public flags; this cohort does not authorize a Stripe payment test. After validation, pause the QA flag and expire the cohort while preserving actual balances, receipts and outstanding verified promises. The source implementation and local tests do not establish that any live cohort or license-test purchase has been configured or completed.

## Request and event contracts

Authenticated native calls use the fixed first-party endpoint and a bearer user JWT:

```json
{ "action": "session" }
```

A valid session contains `ok`, authenticated `userId`, 64-hex `obfuscatedAccountId`, epoch-millisecond `expiresAt`, `productId`, allowed `basePlanIds`, eligible `offerIds`, `hasActiveEntitlement` and `purchasesEnabled`. Its ten-minute lifetime allows native to query current Google ProductDetails; native retains an actual offer quote for no more than 60 seconds. Readiness never starts checkout automatically.

```json
{ "action": "verify", "productId": "matchapp_pro", "purchaseToken": "<SDK token>" }
```

The server reads `purchases.subscriptionsv2.get`, validates the fixed package route, product/plan/offer, account ID, payment/state and expiry, persists the verified metadata, then acknowledges a newly completed paid subscription. It returns the purchase-token hash, bound user/product, verified access, acknowledgement, expiry and verified base-plan/offer/linked-token-hash metadata. It never returns a raw receipt token. `PENDING`, trials, zero-price, hold and paused states never grant paid access. Paid unexpired cancellations and grace retain the verified access period.

An acknowledgement timeout triggers another Play receipt read. A newer expiry or revocation is persisted before returning, so a transport error cannot preserve access from an obsolete active snapshot. A receipt without an obfuscated account ID needs an already verified token or actual Google-linked ownership record; possession of a token alone does not bind a new account.

RTDN uses `POST ?route=rtdn`. The function verifies Google RS256 signature, issuer, exact audience, service-account email and `email_verified`, then the exact Pub/Sub subscription, package and bounded notification. A notification prompts a fresh Play Developer API query; its fields do not independently grant access. Duplicate deliveries are safe through authoritative database ordering and a small supplementary in-memory delivery cache. Unknown first-purchase ownership remains retryable; the session's issued account mapping allows RTDN fulfillment even if the app closes before native verification. No frontend JWT or Play token is returned by this route.

## Optional cancellation retention and returning offers

Native uses a distinct authenticated request only after the person chooses to review a retention offer:

```json
{ "action": "retention_session", "productId": "matchapp_pro", "purchaseToken": "<current SDK-owned token>" }
```

The ordinary verifier first checks, persists and acknowledges the current Google receipt. A quote then requires a currently paid, owned, unexpired active/canceled subscription on the configured monthly plan, no conflicting verified Stripe Pro subscription, the existing sales/legacy-plan checks and an eligible one-use ledger reservation. Trials, pending payments, grace-period dates, hold, pause, expired sources and other base plans cannot supply a retention billing-date claim. A failed optional quote leaves management and existing restoration available.

The successful response adds `purpose: "retention"`, `sourcePurchaseTokenHash`, epoch-millisecond `sourceExpiresAt` and UUID `offerClaimNonce` to the normal session. It returns exactly one configured base plan and discount offer. The native bridge validates those values against the current SDK-owned source, displays only actual Google ProductDetails phases, and requires a separate trusted confirmation. The displayed next-billing date is the freshly verified source expiry; a quote is discarded if that boundary, account or 60-second catalog validity changes.

The Console base-plan default must remain **Charge at the next billing date** (`WITHOUT_PRORATION`) for this same-SKU/monthly offer transition. Google's documented same-subscription flow uses the regular purchase parameters and handles the replacement. No second SKU, immediate app-side charge or automatic acceptance is introduced. Direct Google subscription management/cancellation remains reachable before and during optional quote preparation.

The coordinated follow-up migration `20261017134349_play_pro_offer_once.sql` supplies service-only `reserve_play_pro_offer` and `redeem_play_pro_offer`. Reservations bind the user, product, base plan, real offer, verified source-token hash and `retention` or `winback` purpose. They return the same still-open quote intent within 24 hours; cancellation or an unused quote does not spend the offer. Issuance history is retained because Google's pending subscription can receive its granted start time after the quote expires. Quote expiry controls new display/reuse; an already-issued, same-owner authorization can still be redeemed by a later verified paid purchase. The database enforces one final redemption per user/product/offer and idempotence for that exact new token hash. Retention redemption must match Google's actual linked old-token hash; callbacks alone cannot fabricate it.

Lapsed returning users may receive the same configured offer through ordinary preparation only after verified paid expired history and a ledger reservation. If the ledger or optional offer is unavailable, ordinary base-plan purchase and restore remain available. The first paid observation of a discounted receipt must consume an issued authorization, including a token previously recorded as pending or trial. Sales pauses do not invalidate an issued paid receipt; keep known offer identifiers configured for reconciliation. Previously verified paid receipts and their renewals retain their ordinary restoration behavior.

After a retention launch, the old token, an empty purchase query or cached `hasActiveEntitlement` cannot confirm the discount. Native confirmation requires an actual different purchased token, server-confirmed eligible offer/base plan, matching linked source, current entitlement and acknowledgement. Until then the app reports pending/restore state and keeps the person's existing access intact.

## Activation and release prerequisites

1. Enable the Android Publisher API in the approved Cloud project and grant the approved service account the app-scoped Play permissions required to read orders/subscriptions and acknowledge/manage subscriptions. Verify the actual identity and package access through a read-only API request before enabling sales.
2. Create or verify the Pub/Sub topic, grant Google's Play notification publisher identity permission to publish, and configure the app's full topic name in Play Console. Configure an authenticated push subscription with this function's exact audience and approved push identity. Verify a Console test notification and an actual license-tester subscription event.
3. Deploy the function and reviewed database migration with sales/reward switches still off. Configure real product/base-plan IDs and protected secrets through authenticated supported administration. The current draft product must become available in the intended Play track/regions before ProductDetails can be considered sellable.
4. On an authorized physical device and Play license-test account, verify localized pricing, explicit purchase, pending/cancel, server fulfillment/acknowledgement, same-account restore, cross-account rejection, cancellation, grace/hold/expiry and RTDN delivery. Use a Play-delivered internal-track build of `com.jonas.papercup` with the existing signing lineage; the `.debug` package cannot query the production SKU. Preserve installed data. Reconcile before showing unlimited status. Do not activate live purchase affordances solely because compilation passed.
5. Enable the agreed database/Play sale switches only after these checks. Keep management and existing purchase restoration available when pausing future sales. Configure a returning offer only after its real phases, eligibility, discount and duration are verified in Console and ProductDetails.

This server implementation does not initiate a Stripe checkout from Android, grant credits from a client callback or fabricate a paid receipt. The separate voluntary reward flow uses AdMob server-side verification and its own eligibility contract; native news rendering is an isolated Android delegate.

## Verification recorded locally

`node tests/play-billing.test.cjs` passes 32 cases. They exercise the actual pure validation/orchestration code: off/malformed configuration, exact private QA admission and expiry, immutable ownership, verified-product eligibility, legacy-check failures, restore readiness, payment-state exclusions, linked replacements, test-only new/pending receipts, delayed test fulfillment after QA closes, historical real restoration, issued returning/retention offers, source billing boundaries, first paid observation after pending, sales-pause reconciliation, persistence-before-ack, acknowledgement timeout/expiry/test-marker reconciliation, and RTDN envelope limits. The SQL ledger/cohort have their own coordinated migration tests; these Node cases do not substitute for them.

The Play, Pro and Stripe webhook entrypoints pass the current cached Deno typecheck. Reproducible command in this task environment:

```sh
DENO_DIR=/tmp/matchapp-deno-cache-20261017 \
DENO_TLS_CA_STORE=system \
/tmp/matchapp-deno-play-20261017/deno check \
  --no-config --no-lock --cached-only --node-modules-dir=none \
  /workspace/scratch/8c38f7d90abf/matchapp/supabase/functions/play-billing/index.ts
```

Deno 2.9.7 came from the official release archive with its exact size and SHA-256 checked against the official asset digest. No project dependency or lockfile changes were needed. These checks do not assert live credentials, API permissions, callback delivery, sales activation or store publication.

## Primary references

- [Play Developer API setup and service-account permissions](https://developers.google.com/android-publisher/getting_started)
- [SubscriptionPurchaseV2 fields and subscription states](https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptionsv2)
- [Server acknowledgement API](https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptions/acknowledge)
- [Google Play real-time developer notifications](https://developer.android.com/google/play/billing/rtdn-reference)
- [Authenticated Pub/Sub push](https://cloud.google.com/pubsub/docs/authenticate-push-subscriptions)
- [Play Billing security and backend verification](https://developer.android.com/google/play/billing/security)
- [Same-subscription replacement and cancellation management](https://developer.android.com/google/play/billing/subscriptions)
- [Developer-determined offers and three-month winback configuration](https://support.google.com/googleplay/android-developer/answer/12154973?hl=en)
- [Google Play license testers and test payment methods](https://developer.android.com/google/play/billing/test)
- [AdMob test devices using the app's actual ad units](https://developers.google.com/admob/android/test-ads)
