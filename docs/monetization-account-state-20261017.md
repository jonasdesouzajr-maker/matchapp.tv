# MatchApp Ai monetization account checkpoint

Recorded during the owner-authorized 17 October 2026 upgrade. This is a work checkpoint, not a claim that the release is published.

## Confirmed account state

- AdSense publisher `ca-pub-9541435081010948`: `matchapp.tv` is **Getting ready**, with ads.txt **Authorized**. The existing site review is pending; no duplicate submission was made.
- AdMob app **MatchApp Ai**, package `com.jonas.papercup`, is **Ready**. App ID: `ca-app-pub-9541435081010948~6998171073`.
- Existing banner `ca-app-pub-9541435081010948/5523667258` and native advanced unit `ca-app-pub-9541435081010948/4843348278` were preserved.
- Created the dedicated **MatchApp Ai - Match Tokens Rewarded** unit: `ca-app-pub-9541435081010948/2802190985`. Reward: **3 Match Tokens**. Ad pods were disabled. Server-side verification must be configured and checked before the public reward feature is enabled.
- The Stripe connector initially required reauthentication; the owner's existing browser session supplied the authorized fallback. The connector subsequently restored access to **matchapp.tv**, `acct_1PsVsFFRuUuhrLPG`, and the additional account changes used its API tools.
- Created **MatchApp Ai Pro**, product `prod_VSP0LagMpQQHIj`, with BRL monthly price `price_1URUC4FRuUuhrLPGx0fDzrR3`. The Dashboard showed **R$ 9.90 per month**, zero active subscriptions. No customer was charged or migrated.
- Created the new Play subscription **MatchApp Ai Pro**, product ID `matchapp_pro`. The monthly base plan and real retention offer were activated at the later checkpoint below. Public purchase gates remain off pending physical verification.

## Confirmed new Stripe catalog

All amounts below are integer minor units, monthly, quantity one and live-mode. These prices do not change any existing subscription.

| Market | Currency | Minor units | Price ID |
| --- | --- | ---: | --- |
| Default | USD | 499 | `price_1URUdyFRuUuhrLPGFwrc0mQU` |
| Brazil | BRL | 990 | `price_1URUC4FRuUuhrLPGx0fDzrR3` |
| India | INR | 9900 | `price_1URUeEFRuUuhrLPGW53PptBI` |
| Mexico | MXN | 4900 | `price_1URUeGFRuUuhrLPGH2XmPgS1` |
| Colombia | COP | 990000 | `price_1URUeHFRuUuhrLPGc53m45uV` |

New Pro-only coupon `matchapp_pro_retention_50_3m_20261017` is 50% off for three months, restricted to product `prod_VSP0LagMpQQHIj`. New portal configuration `bpc_1URUgdFRuUuhrLPGCXsZGeyi` enables payment method management, invoice history and cancellation at period end. The existing default/Jonas portal remains unchanged. Stripe's operation metadata advertised `retention_options`, but the live API rejected that parameter; the separate Pro cancellation screen therefore uses the verified coupon through a deliberately accepted, idempotent subscription update and retains the direct portal cancellation path.

The new Pro product description promises **unlimited One Match recommendations**. Streaming services, paid titles, Kids and Jonas remain separate. A blanket web ad-free promise was removed before sales activation because the immutable AdSense Auto ads engine has not been verified to honor that promise. Existing paid ad-free benefits and native eligibility remain preserved.

## Live billing baseline

The live functions use pinned public Git commits which contain working Jonas billing additions absent from the branch's original main snapshot. Replacing them with the unmodified main-branch copies would remove that behavior.

| Live function | Version observed | Pinned source commit |
| --- | ---: | --- |
| `stripe-webhook` | 54 | `05304b4959c073d53c4224546dbfe074ea69eea9` |
| `stripe-checkout` | 40 | `86ca1a90f1494512bfaea7f502704d4ad7f3bc31` |

Preserve these deployed implementations and their `_shared/billing.ts` / `_shared/jonas-billing.ts` dependencies when adding Pro. Do not overwrite the live webhook with an older repository copy. A Pro release must retain the existing signature verification, paid-session validation, idempotent delivery and independent Jonas entitlement handling.

## Publication gates still open at this checkpoint

Reward SSV, integrated cancellation verification, Play base plans/server billing verification, full integrated web and physical-device checks, signed Android upload and live deployment verification remain separate work items. Account readiness, a created ad unit or a created Stripe price does not establish ad delivery, completed purchase verification, Play approval or revenue.

## Play and server checkpoint — 17 October, 12:58 UTC

The saved `monthly` Play base plan is monthly and auto-renewing, with a seven-day grace period and automatic account hold. It remains **Draft**. The Console's individual market price editors were used to save and re-read BRL 9.90, INR 99.00, MXN 49.00, COP 9,900 and USD 4.99. The initial conversion supplied prices for 178 territories; this does not by itself establish that every territory is activated. There is no active Play win-back offer at this checkpoint.

The all-track release/bundle screen confirms that version **54 / 1.1.54** is the highest uploaded bundle and is currently in Google review for Production. Version 53 is available. The next native changes use **55 / 1.1.55**. The pending version 54 was not withdrawn or resubmitted.

Dedicated verification infrastructure was created in the existing **MatchApp Ai** Google Cloud project, `matchapp-ai` (number `848830689344`):

- Purchase verifier: `matchapp-play-billing@matchapp-ai.iam.gserviceaccount.com`.
- Notification identity: `matchapp-play-rtdn-push@matchapp-ai.iam.gserviceaccount.com`.
- Topic: `projects/matchapp-ai/topics/matchapp-play-rtdn`, with the Google Play notification service identity granted publisher access on that topic only.
- Subscription: `projects/matchapp-ai/subscriptions/matchapp-play-rtdn-push`, authenticated push to `https://zkymvqrmbabngsqblyye.supabase.co/functions/v1/play-billing?route=rtdn`. The OIDC audience is exactly that same URL. The Google-managed Pub/Sub service agent has token-creation permission on the dedicated push identity only.
- Delivery settings: 60-second acknowledgment deadline, retries from 10 to 600 seconds, seven-day retention and no idle expiration.

The dedicated purchase service key and stable account-binding secret were written to the owner's existing protected secrets directory and restricted to the owner and Windows System. Secret values were not printed or copied into this repository. The existing `GOOGLE_PLAY_SERVICE_ACCOUNT_B64` secret remains unchanged; the new endpoint uses its own JSON credential. App-specific Play permissions and successful receipt/notification tests remain open gates.

`play-billing` was deployed as active version 1, deployment hash `9d9b3ed0e912dd357d7ba8ed9cfc364dd847be24899e228c533f46241a698106`. Its handler performs Supabase user authentication or verified Google OIDC authentication itself. `PLAY_BILLING_ENABLED=false` was saved through the existing Supabase Dashboard session; deploying the endpoint does not activate sales.

The AdMob unit formats were rechecked: `/5523667258` is **Banner**, `/4843348278` is **Native advanced**, and `/2802190985` is **Rewarded**. The coordinated release corrects the existing banner field to the actual banner ID while preserving its reserved geometry and consent/entitlement behavior. The reward callback URL is awaiting the Console's required signed diagnostic verification; no test has been counted as a user reward.

### Verified Play notification delivery — 13:04 UTC

All nine new Play settings were saved in the existing Supabase Dashboard; the existing provider/Stripe/B64 secrets were left unchanged. The notification switch was subsequently enabled. The new sales switch remains **false**. Four live endpoint checks passed: owned-origin preflight 204, missing user authentication 401, foreign-origin request 403 without permissive CORS, and missing notification authentication 401.

Play Console's prior notification configuration was disabled with an empty topic. The new topic was saved without replacing an existing notification consumer. The actual **Send test notification** control was used at 13:04:54 UTC. Supabase's function invocation log confirms an authenticated POST returning **200** at **2026-10-17 13:04:55.184 UTC**, in 605 ms, request `01a149f7-1f33-7a3d-98af-470c1319da0d`. No purchase, entitlement or reward was created by this test. This confirms Google Play → Pub/Sub → verified endpoint delivery; receipt verification and license-tester purchase testing remain separate gates.

### Purchase verifier access and Pro deployment — 13:15–13:28 UTC

The dedicated purchase service identity is now **Active**, has no expiry, and has access to **MatchApp Ai only**. Its selected app permissions are read-only app information, financial data, and order/subscription management. Account administration, releases, store presence and unrelated apps were not granted. A credential-authenticated Android Publisher API read of `matchapp_pro` returned HTTP200 and the saved `monthly` Draft/P1M catalog. The API returned174 regional configurations; the five exact BR/IN/MX/CO/US price entries were verified and enabled for new subscribers in the saved configuration. Activation remains a separate action.

The following additive functions were deployed while monetization sales remained off:

| Function | Returned version | Deployment hash |
| --- | ---: | --- |
| `pro-billing` | 1 | `fe8ef90ca5e8948f97787d92217f5d14b7cf6808af4bc366ee5932ef9ce4f0ea` |
| `stripe-webhook` | 65 | `35df8f6751f8dd55fd7f625d44c059b3c22f3d319b28e4a4c4371a383c8e1e7f` |
| `stripe-checkout` | 51 | `f27bd105308f9e0ca8d63f956d4eced07b136a32600606ba9014896dab48c3bf` |

The existing enabled Stripe endpoint `we_1UG20AFRuUuhrLPGIGa7Jaid` retains its URL, API version, description and six prior event subscriptions. Its event allowlist was extended and read back with `customer.subscription.created`, `invoice.paid`, `invoice.payment_failed`, `invoice.voided`, `invoice.marked_uncollectible`, `charge.refunded`, `charge.dispute.created` and `charge.dispute.closed`. This is fourteen events in total. No customer event was fabricated, replayed or charged to validate this configuration.

Seven live boundary checks passed at13:28:42 UTC: disabled Pro catalog200 with `enabled:false` and no offer; unauthenticated Pro status401; foreign origin403 without permissive CORS; owned preflight204; unsigned webhook400; webhook GET405; and unauthenticated legacy checkout401. These confirm deployment boundaries and the off state, not a completed paid purchase or a renewal/refund end-to-end test.

### Catalog activation and additive service controls — 13:40–14:28 UTC

The Play Console now confirms the `monthly` base plan **Active** and the developer-determined offer `retain-50-3m` **Active**. Its single discounted recurring phase covers three monthly billing periods at 50% off, then returns to the regular monthly price. The Brazil preview showed three months at BRL4.95/month followed by BRL9.90/month. An authenticated Publisher API read confirmed the exact product/base-plan/offer IDs, P1M phase, recurrence count3, and 0.5 relative discount in BR/CO/IN/MX/US and the other configured regions. The API returned174 regional configurations; the Console's availability count and its earlier bulk-priced count are separate measures. No purchase was made.

Three reviewed follow-up migrations were applied without changing their predecessors:

- `20261017134408_match_tokens_first_core_value.sql`: first core value includes the existing ebook result as well as One Match; the first-value recovery marker remains tied to non-refunded fulfillment.
- `20261017134958_play_pro_offer_once.sql`: service-only Play offer intents and once-only redemptions for the actual `matchapp_pro` / `monthly` / `retain-50-3m` offer; previously issued promises survive delayed payment confirmation.
- `20261017142620_monetization_qa_cohort.sql`: an expiring, service-owned account cohort. It changes only the five reviewed activation-predicate surfaces and preserves balances, historical entitlements, first-result history, prepared reward fulfillment, and receipt reconciliation. Its twelve focused database tests passed.

The final callback fixture also revealed two real Console protocol details: its placeholder ad unit/short transaction, and a reward name signed with a literal space but transported as `Match+Tokens`. Earlier Console diagnostics returned403 and were not counted as rewards. The current verifier accepts the exact placeholder pair only for the reserved zero user/nonce diagnostic, never the credit ledger. Signature verification first uses the untouched query; a second candidate changes only the exact fixed reward-name space, leaving every account, nonce, unit, amount, timestamp, transaction and ordering byte intact. Nineteen cryptographic cases passed, including the actual Google-signed callback and recorded public key, tampering, synthetic/real identity separation and zero ledger calls for diagnostics. The actual Edge entrypoint also passes cached Deno checking.

| Current deployed function | Returned version | Deployment hash |
| --- | ---: | --- |
| `reward-ssv` | 14 | `a647e031489a61d6319605499dbc241dfb10f874dc32b900877e19770be66f56` |
| `play-billing` | 13 | `0c8c041ca73af56b6b3fcda1b14a99446174a1698a242a7c8131418211189d3e` |
| `guest-social-proof` | 44 | `088631574726d28c12039480cdb3c0f48963d2bb702d3186e9194c6497be818d` |
| `tiktok-share-reward` | 41 | `c81eff79ff96b3d1e2a0d40bbfd09345ae438ebf5c46a711d6437b37be27fc61` |

The Play QA endpoint requires both its new private environment switch/exact tester UUID list and the expiring server cohort. A new QA purchase must be a genuine Google test receipt before persistence or acknowledgement, including pending receipts and acknowledgement requery. Historical verified real purchases remain restorable. Its32 focused cases and actual Deno entrypoint passed, with an independent review finding no concrete admission or restoration regression. No frontend/native change or rebuild was needed for cohort admission.

The live cohort table has zero members. Browser roles cannot invoke its setter/getter; the service getter is authorized. The trusted catalog allowlist now contains only actual new products `prod_VSP0LagMpQQHIj` and `matchapp_pro`, while global `enabled` and `rewards_enabled` remain **false**. This allowlist does not activate sales. License-test account selection, real Google purchase-sheet inspection, physical rewarded-ad SSV credit and the signed55 release remain outstanding.

The connected SM_X236B tablet was inspected without changing it: package `com.jonas.papercup`, installed version53/1.1.53 from Google Play, no separate debug package. The current separate debug build55 passed26 native unit tests, compilation and zero new code-lint findings; the offline lint report still contains41 existing advisory warnings. Do not describe the repository as globally warning-free. Its verified APK SHA-256 is `1ceffc4ebbdd9c8fe357c606632247986f15df80fc260b428298739ba4fffc78`; no installation, upload or new release submission has occurred at this checkpoint.

### Confirmed callback, purchase scope and release preparation — 14:31–15:37 UTC

AdMob returned **“Success! Your callback URL has been verified.”** The verified callback was selected and saved at14:31 UTC. The actual Google-signed diagnostic returned200 at **2026-10-17 14:27:56.012 UTC**, request `01a14a43-1fb4-7c63-925a-fd927ec17bc2`. It correctly credited no wallet. The app settings were also inspected visually: **App verification: Verified** and **Approval status: Ready**. These establish configuration readiness; physical rewarded-ad completion, credit delivery and ad fill remain separate checks.

The owner's latest instruction explicitly preserves Donate and other independent revenue channels. The reviewed purchase correction therefore retires only new `vip_monthly`, `vip_annual`, `business`, `matches_5`, `matches_25` and `matches_50` sales when the authenticated account's effective token policy applies. Existing entitlements, Donate/PayPal, the separate ad-free purchase, Ask AI credits, Kids, Jonas, affiliates and sponsorship remain intact. Explicit retirement/ownership/policy denials cannot fall through to a Payment Link. A fallback for a superseded Match product requires a fresh authenticated same-account policy-OFF response, and an account switch cancels that authorization. Literal permanent ad-free ownership prevents another purchase of that pass. Temporary VIP/Business/Pro does not claim permanent ownership.

All14 ad-free descriptions now state the verified benefit: native Android ad removal, excluding web ads, as a one-time account purchase. Unsupported routing-speed and profile-unlock claims were removed. The original Android guard against unsupported digital-goods Stripe checkout remains in place; this correction does not create Play products for legacy ad-free or Ask-credit purchases. The frozen correction passed48 focused cases, the final affected adapter suite passed15 cases, and the full `stripe-checkout` entrypoint passed Deno checking. Final integrated gates and deployment are still pending at this checkpoint.

The additive `reward_wallet_ad_free_parity` migration was applied at15:26 UTC. It changes only the existing wallet's reward-availability predicate to honor its already-computed ad-free entitlement union. Previously prepared valid rewards still fulfill exactly once. Its SQL SHA-256 is `97e396cdd28aa5796a2c40b66e5ae5285e467c15ccb262fa1d5aa60fa406ac85`; nine focused PGlite cases passed and independent reviews found no concrete regression. Live readback confirms the predicate installed, global `enabled:false`, `rewards_enabled:false` and zero private QA members. The five new migration filenames are aligned to Supabase's actual applied journal versions; no SQL bytes or remote migration-history rows were changed by that alignment.

A fresh normal Google sign-in succeeded on the installed physical app. Existing VIP ownership and balances were preserved; those accounts are correctly unsuitable for a free-user rewarded-ad test. No account was downgraded, no balance was reset, and no profile identity was permanently locked. A separate normal verified free QA account remains to be created.

The owner's existing laptop Git Credential Manager successfully fetched the public repository and completed a non-mutating push dry run in a new isolated bare repository. The observed main head was `57f4cbc8e850750c9aa861ec582bbe0a0106da19`. No release branch, pull request or production push was created by that transport check. The exact tested release commits can be transferred as a verified Git bundle without exposing credentials or modifying an existing laptop checkout.

For production-only device verification, Google documents downloading its **signed universal APK** from the processed bundle's Downloads/Assets view. The intended route is an uploaded Production draft55, Google's signed APK, certificate/package/version verification, and an in-place update of the existing app. A genuine Google license tester must see the test purchase notice and test instrument before confirming any purchase. No internal/beta distribution, real charge, app-data clearing or installer impersonation is authorized by this verification plan. See [Play app-bundle downloads](https://support.google.com/googleplay/android-developer/answer/9844279?hl=en) and [Google Play Billing testing](https://developer.android.com/google/play/billing/test).

### Physical QA preparation and publication hold — 15:37–15:57 UTC

The tablet's AdMob test-device registration was saved at15:37 UTC and read back at15:38 UTC. An actual test-ad badge, completed rewarded ad and verified wallet credit remain pending. Registration alone is not evidence of ad delivery or reward fulfillment.

A separate free QA account was created through normal registration and its email was confirmed at15:57 UTC. The original welcome grants were preserved. Its private server QA cohort expires at22:00 UTC on17 October2026; no identifying account details are recorded here. This bounded admission does not enable the public rollout or change other accounts.

`stripe-checkout` version52 was deployed from the exact reviewed four-file bundle at15:55 UTC. Five live HTTP boundary checks passed, but the public availability response returned **false for every requested USD and BRL product**. The correct live Stripe account's three inspected USD Payment Links and their line items, together with the corresponding BRL prices, were confirmed. The deployed runtime's account/mode diagnosis remains **open**. No real charge was made, and boundary checks do not establish checkout readiness.

Local revision `0956d99edadd411925da5a4b2cdf11bbf468be2c` passed1581 automated tests. Publication was then held for the final Android-only purchase presentation correction: unsupported ad-free and Ask-credit purchases must be clearly unavailable in this app version while existing benefits and ordinary web purchases remain intact. The prior Git bundle was imported on the laptop and its hashes, commit and tree were verified; it was **not pushed**. Public/global rollout switches and other configuration remain unchanged. Final corrected web gates, the actual release outcome and physical Play validation will be recorded separately.
