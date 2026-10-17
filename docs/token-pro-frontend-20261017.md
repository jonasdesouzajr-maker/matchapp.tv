# Match Tokens, Pro and result sponsorship — frontend handoff

Reviewed on 17 October 2026. This document records the implementation and local verification in the release checkout. It does not assert that the release is published, that a live purchase or Google reward has completed, that AdSense has approved the site, or that a sponsor campaign exists.

## Result and first-value experience

The existing organic recommendation, original poster, provider destination, source-validation path and original control listeners remain authoritative. The separate result presentation module supplies the centered 24px card, readable provider button, demoted secondary actions and authored availability copy. A checked-region claim requires fresh source evidence for the exact title, provider and selected country. Ordinary provider/search links do not become verified availability or affiliate relationships through styling.

The first successful organic result shows only a quiet token balance inside its reserved result area. It does not open the token or Pro panel, move focus away from the existing result button, start an ad, or append Pro marketing. A later request that actually lacks usable free, earned and purchased tokens can open the choice panel. A user can also explicitly open the balance or Pro controls.

The existing finite, reduced-motion-aware result celebration remains in place. New payment and token panels use their own fixed scrims below the permanent gold viewport frame; they do not use the HTML top layer. New controls retain the existing gold/violet visual language, visible focus and at least 48px touch height. All new user-facing strings are authored in the existing 14 languages. The selected app language remains separate from the selected viewer country.

## Activation is server controlled

`match-tokens.js` activates the new token presentation and retirement of old adult promotions together, only after `match_token_status()` returns both `enabled: true` and `policy_version: "match-tokens-v1"`. Before that readiness is established, a missing, failed, disabled or incompatible response leaves the existing adult quota and promotion behavior in place. After activation, a failed wallet refresh clears the displayable wallet and waits for an authoritative response; it does not fall back to a second allowance. A valid disabled policy response restores the old presentation. No local flag authorizes the new paid wallet or a reward.

The anonymous policy response establishes readiness only. It contains no user balance or Pro entitlement. Anonymous users continue through the existing browser quota and earned-balance functions. The guest first-value marker is best effort browser state; it cannot create a server reward or paid entitlement.

The signed-in response includes `authenticated`, `daily_limit`, `daily_remaining`, `bonus_tokens`, `purchased_matches`, `remaining`, `available_total`, `unlimited`, `first_match_pending`, `next_reset_at`, `ad_free`, `pro_active` and `rewarded_available`. The UI validates wallet consistency before using it. Existing purchased and previously earned balances remain usable. Legacy VIP and Business benefits retain their existing paid allowance; they are not displayed as unlimited Pro. The existing daily check-in RPC and its balance pool are unchanged.

The server contracts, private grants, additive migration, deployment sequencing and rollback requirements are documented in [match-tokens-server-20261017.md](match-tokens-server-20261017.md).

## Debit, failure and account boundaries

The new debit stays after the existing source/history validation and immediately before the existing reveal. `consume_match_token({p_request_id, p_surface})` receives a cryptographic UUID and the surface `one_match` or `ebook`. Each Bookworms request creates its own context, including books generated from the Home page. Ask AI continues through its original allowance path.

The main match run is checked again after the asynchronous session read and immediately before debit. A stale request cannot consume for or overwrite a newer match. An ambiguous transport response retries the same UUID once; it does not create a second debit identity. The server remains responsible for atomic consumption and idempotence.

There is **no browser call to `refund_match_token`**, no local restoration of a server balance, and no claim that an uncertain debit was refunded. If a post-debit result cannot be confirmed, `noteUnconfirmed` retains a bounded opaque request reference in the current document and requests a read-only wallet refresh. It never grants tokens. Service-side reconciliation owns any correction.

The first-value state remains pending while a first debit is waiting for the actual result reveal. A wallet refresh during that interval does not enable an ad or depletion panel before the original result has appeared.

The additive `20261017134408_match_tokens_first_core_value.sql` correction treats a successful committed One Match **or ebook** as the first core value, including a verified unlimited result. Failed, denied and refunded-only requests do not complete that marker. It also backfills successful ebook history without charging again or changing the existing balances. After three ebook-only free successes, both another ebook and a Home match reach the later-use gate without a fourth debit. The release owner confirmed this correction was applied on 17 October while both token and reward activation remained disabled.

Native news has a separate presentation-only first-value notification from this same successful renderer. It requires the actual current result title to be visible and unobstructed for two frames, rather than trusting a wallet counter. This proof works while the token rollout is disabled, grants no allowance, and is cleared synchronously when the account changes. Home and ebook source-discovery fallbacks, hidden or failed results, stale runs and synthetic notifications cannot qualify. Android independently checks the current account, consent, ad-free eligibility and native placement switch.

Native request IDs, wallet operations and entitlement reads are correlated with the current document and authenticated account. Account changes discard prior UI quotes and claims. An old promise or native callback cannot establish the current account's balance or Pro status.

## Optional native rewards

The reward choice is available only when the token policy is active, the user has already received the core result, the current signed-in wallet is exhausted, `rewarded_available` is exactly true, and the genuine native reward bridge exists. There is no web AdSense rewarded fallback.

1. A trusted activation of the owned reward button calls the authenticated `reward-session` action `create`. The returned server claim nonce is passed to `MatchAppNativeRewards` with a new request ID and the current access token.
2. Native `prepare` loads the ad but does not show it. The UI explains the promised three Match Tokens and the completion condition. Loading, cancellation and alternate-choice areas have stable geometry; a ready button does not move into the previous cancellation position.
3. A second trusted activation of the same owned button, after the matching `ready` event, sends native `show`. There is no timer, synthetic click, result reveal or native event that auto-shows the ad.
4. The UI reconciles the server claim after `earned`, after every dismissal, and after resume, including dismissal events with `rewardEarned: false`. The SDK event alone never grants spendable tokens. Only an authoritative credited claim and wallet update change the displayed balance.

Late SSV delivery uses bounded reconciliation. A claim awaiting verification blocks preparing another claim. Closing while claim creation is still in flight invalidates that preparation and cancels the returned unpresented claim without loading an ad. Closing after presentation has been requested preserves the claim for reconciliation; it does not cancel a possibly earned reward.

The real reward unit and Google's signed SSV verification are owned by the release and backend configuration. The server reward flag must remain disabled until the actual unit, callback and controlled native-device completion have been verified. Native lifecycle, UMP, origin restrictions and exact bridge messages are described in [the Android implementation document](../android-studio/play/MONETIZATION_IMPLEMENTATION_20261017.md).

## Pro billing and cancellation

New Pro copy promises **unlimited One Match recommendations**. It does not promise unlimited Ask AI, recaps, Kids or Jonas, included streaming subscriptions, or cross-web ad-free delivery. Existing legacy paid benefits and account management remain intact. Although the server/native code can honor verified ad-free eligibility, the new web product makes no blanket ad-free promise while the locked Auto ads engine remains active.

The browser `pro-billing` catalog is authoritative for the configured monthly price, actual selected market and available countries. `offer.amount` uses integer minor units and is formatted using `offer.fractionDigits`, `offer.currency` and `Intl.NumberFormat`. The frontend hardcodes no local price, discount, annual plan, payment link or product entitlement. Invalid saved region text does not override a valid saved country; language alone never selects a purchasing market.

Web checkout accepts only the exact approved HTTPS Stripe checkout origin/path returned by the server. Management accepts the approved Stripe billing path or the fixed Play subscriptions management route. Lookalike hosts, credentials, arbitrary schemes and unrelated paths are rejected.

Android uses `MatchAppNativeBilling` and never falls back to Stripe checkout. A native offer is displayed only from the current authenticated request. The UI shows every actual Play pricing phase, its duration/payment count, and the recurring renewal terms before a second trusted action can launch billing. Prices use Play's `formattedPrice` verbatim. The quote region reserves 240px with accessible internal scrolling; phase text is explicitly 15px so legacy label styles cannot shrink pricing terms.

`pending`, `verification_pending`, a purchase callback or a URL return does not grant Pro. The UI reads current-account server status and requires an actual verified future entitlement. Restore and Manage remain available for former, expired, pending and unavailable-purchase states. Native management does not depend on an active checkout offer or configured sellable SKU.

### Existing recurring web subscriptions

The authenticated status response now includes `hasLegacySubscription`. Only an exact successful response with that flag, `canManage: true` and `provider: "stripe"` establishes the existing-plan guard. It does not establish new Pro entitlement. The UI explains in all 14 languages that the current recurring plan must be managed before starting Pro, while existing benefits remain unchanged.

Web users retain the current Stripe management and cancellation route. A legacy subscription does not receive the new Pro retention coupon. Android shows explicit guidance to manage a subscription purchased on the web at `matchapp.tv` in a browser; it does not misroute that subscription to Play or add an external checkout action. This provider routing also covers a verified Pro subscription originally purchased on the web. Native Restore remains available. Preparing or launching a second native purchase is suppressed in this state.

If a legacy subscription is discovered only when checkout returns `legacy_subscription_active`, the client reads authenticated status again for the same current account. Neither that error payload nor a late response from a previous account grants benefits. This status refresh also supports server reconciliation of a just-completed checkout without offering a duplicate subscription.

### Stripe return privacy

`pro-plan.js` loads synchronously before analytics on its five host pages. It captures the new owned `pro_return` marker and bounded receipt value in memory, then removes those query parameters before analytics can read them. Malformed or duplicated owned return data is also removed. A legacy `session_id` with no `pro_return` marker is left untouched so existing purchase completion continues to work.

Only the owned pricing return route opens the Pro status UI. A valid return receipt is sent to authenticated `pro-billing` status for account-bound, paid-receipt verification. It is not written to local storage or exposed to analytics. Status reconciliation is bounded, stops while the panel is closed, and can be requested again explicitly. While a receipt is pending, the UI does not offer a second checkout. Merely editing the URL never establishes entitlement.

### Explicit retention choice

An actual eligible Stripe subscription can receive the server's exact `retentionOffer: {percentOff: 50, months: 3}`. Choosing cancellation shows an explicit optional Keep Pro offer and an always-available Continue to cancellation action. Only the user's Keep activation calls `retain`; the UI reports a new discount only after the server confirms that it was applied. An already-used offer is not reported as a new grant. Failure to apply an offer leaves cancellation available.

For an active Google Play subscription, the explicit Cancel action can request an optional native cancellation offer through `prepare_retention`. A new request ID and current access token identify that preparation. A matching `ready` event must carry `purpose: "retention"`, a valid future Google-verified `chargeAt` date, and the actual approved paid monthly discount and recurring renewal phases. The client does not hardcode an offer ID, percentage, price or eligibility. The native/backend path remains unavailable until its real offer configuration, one-use eligibility ledger and device verification are ready.

All 14 authored cancellation panels show the exact Play phase prices, duration/payment counts, renewal terms and next charge date before a separate trusted confirmation can send `launch`. Preparation never starts billing. The reserved quote area remains 240px high with accessible scrolling, and the status region reserves 12rem to accommodate long translations without moving the cancellation action. **Continue to cancellation stays above the quote area and remains reachable during loading, unavailable, pending and failed states.** It opens normal Play management without accepting an offer. Closing, changing accounts or taking that direct cancellation route invalidates an in-flight quote so a late callback cannot reopen it.

An expired quote requires an explicit refresh; there is no automatic launch or checkout retry. `pending`, `verification_pending` and the old active entitlement never establish that a new discount was accepted. Even a server-verified callback triggers a fresh current-account status read and does not cause the UI to invent a confirmed discount. Normal new-purchase and Restore flows remain unchanged. Play never receives the separate Stripe retention coupon or a web catalog price substituted for its own renewal terms.

## Retirement of new adult promotions

The exact active policy guard retires new adult signup/share bonus grants, public-proof reward dialogs, old adult VIP/Business/Ad-Free upsell entry points, old Match pack purchases and Ask AI credit pack promotion. Ordinary sharing remains functional with the existing original-poster behavior. Existing earned, purchased and paid balances are not cleared or migrated.

Narrow guards live at the relevant initiation and completion points in `guest-share-rewards.js`, `verified-public-guest-share.js`, `share.js`, `registration-welcome.js`, `pricing.js`, `credits-ui.js` and the related `app.js` callbacks. The old handlers remain intact for a disabled-policy rollout. The Kids purchase route and all Jonas behavior are separate and unchanged. The adult purchase hub keeps Kids reachable instead of exposing hidden adult tabs to keyboard navigation.

### Coordinated pricing and structured data

The pricing page now has an owned Free/Pro comparison, activated by the same exact token-policy readiness as the retired promotion overlay. Its authored 14-language copy explains the three daily free Match Tokens, optional three-token Android reward when available, existing daily check-in, retained balances, and Pro's unlimited One Match recommendations. The original Kids purchase tab remains visible and keyboard reachable, including when the existing purchase hub finishes rendering after policy readiness.

The current monthly amount comes from the actual public `pro-billing` catalog. The selected offer and its market are shown together; language does not imply billing location. Loading, unavailable and successful price states occupy the same reserved 12rem area. Merely visiting pricing does not open a payment panel, prepare native billing or start a checkout. Android obtains purchase terms only through the explicit native billing flow.

Static pricing metadata now describes Free/Pro rather than the retired adult VIP, Business, Ad-Free and pack sale offers. Static JSON-LD retains a valid Service, provider, canonical URL and BreadcrumbList, with an empty owned OfferCatalog. It makes no static sale or unconfirmed price claim. When the policy and actual catalog are both enabled, the same visible selected-market monthly offer populates the owned OfferCatalog. It includes exact decimal price, currency, country and monthly billing duration. It does not advertise all five unseen markets, annual billing, an unconfirmed native price, review ratings or physical-merchant shipping and return details. Disabling the policy clears the owned offers and restores the baseline service/metadata presentation.

`build-meta.js` has a narrow guard that respects this active owned pricing metadata while retaining its existing fallback and Product-schema cleanup. Its build identifier remains the release owner's responsibility. The obsolete product-schema assertion was updated with the release owner's approval to check this actual model: valid baseline Service/breadcrumb, no retired static offers, and all five configured prices in all 14 languages with exactly one eligible visible offer. No protected AdSense or SEO workflow guard was modified.

The structured-data presentation follows the official [Google structured-data general guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies) and [Schema.org UnitPriceSpecification vocabulary](https://schema.org/UnitPriceSpecification). Existing canonical, robots, sitemap and discovery routes remain unchanged for Google, Bing and Yandex. Local validation does not establish indexing, a rich result, rankings or webmaster approval.

## Direct sponsored result card

`sponsored-match.js` is a separate, synchronous presentation hook immediately before the original result visibility assignment. It does not alter ranking, the organic recommendation, its CTA or its listeners. `campaigns` and exact `destinations` are both compiled, frozen **empty arrays**. Consequently the current release creates no sponsor element, no reserved blank space, no network request and no commercial claim.

A future real record must have a reviewed commercial authorization, stable campaign ID, named sponsor, review reference, explicit country allowlist, active start/end timestamps, a review no older than seven days, an exactly approved HTTPS URL, and complete bounded title/body/CTA/terms copy in all 14 languages. Country comes only from the saved explicit viewer choice. A title's origin or the UI language is not regional eligibility. A future exact-title sponsor also needs independent verified title/availability evidence; the current empty implementation establishes none.

Only an active token policy after first value can present a campaign. Verified Pro and all existing ad-free eligibility suppress it. The card is a distinct accessible aside at the end of the result, with readable localized Sponsored attribution, sponsor name, terms and a `rel="sponsored noopener noreferrer"` destination. It has 340px minimum geometry, increasing to 450px on narrow screens, with wrapping text. Its CTA rechecks current eligibility before navigation. No campaign is inserted later into an already visible result.

This direct contract card does not load or imitate AdSense or AdMob native inventory. Real Google ad units retain their separate attribution, consent and SDK requirements. The locked Home placements, Auto ads engine, IDs, initialization and geometry remain untouched.

## Wiring and ownership

| Surface | New modules / integration |
| --- | --- |
| Home | Synchronous token and Pro bootstrap; result experience; private continuation before analytics; guarded sponsor hook; result balance and continuation reservations. |
| E-books | Token and Pro bootstrap; one fresh shared-allowance context per book; quiet result balance; result/continuation styling. |
| Pricing | Token and Pro bootstrap before analytics; policy-controlled Free/Pro comparison and real selected-market quote; coordinated metadata/JSON-LD; guarded old adult plans/packs; original Kids purchase path. |
| Profile | Token and Pro bootstrap before analytics; hidden owned Pro entry; original account and paid management preserved. |
| Discover / Ask AI | Token and Pro bootstrap; retire only adult pack promotion when policy is enabled; original Ask AI allowance remains. |
| Friends, Together, Events archive, Roku directory, Purchase | Token bootstrap to apply the same adult promotion readiness guard and preserve current balances. |
| OAuth consent / Callback | Only the changed `app.js` cache key is updated; no new token/Pro UI or ad module is injected. |
| Kids / Jonas | No new token, Pro, sponsorship or ad injection. |

New token/Pro code and CSS are self-contained in `match-tokens.js/.css` and `pro-plan.js/.css`. New sponsor code is in `sponsored-match.js/.css`. The result/news/continuation integration and the actual news generator are separate prior additions; see [news-monetization-20261017.md](news-monetization-20261017.md).

Only changed asset keys are cache-busted. Home's existing final `regional=20261016-1` app cache suffix and the catalog-media pinned suffix remain in position. Existing CRLF/mixed line endings were preserved with byte-level HTML edits. The applicable whitespace check is `git -c core.whitespace=cr-at-eol diff --check`.

## Local verification and limits

The initial frontend handoff command passed **82 tests, zero failures**:

```bash
node --test --test-isolation=none --test-force-exit \
  tests/match-tokens.test.cjs tests/pro-plan.test.cjs \
  tests/sponsored-match.test.cjs tests/result-experience-20261017.test.cjs \
  tests/guest-share-trial.test.cjs tests/registration-welcome.test.cjs \
  tests/ebooks-ai.test.cjs tests/ebooks-affiliate.test.cjs \
  tests/pricing-locale.test.cjs tests/match-share-original-poster.test.cjs \
  tests/adsense-lock.test.cjs
```

The new token, Pro and sponsor suites contribute 33 of these cases. They cover strict policy/wallet validation, original quota fallthrough, unique debit identity, stale-run/account boundaries, first-result focus and quiet balance, two trusted reward activations, no client award/refund, late SSV reconciliation, original share/poster and paid balance preservation, Kids isolation, exact billing URLs, real monthly price formatting, return privacy, verified entitlement, explicit retention and empty sponsor inventory.

The completed pricing/legacy-plan follow-up passed **68 focused tests, zero failures** across Pro, product schema, token behavior, AdSense lock/safety, search indexing, commercial architecture and the purchase hub. At that checkpoint, the Pro suite contained 17 cases, including all-language existing-plan management, Android guidance, checkout races, enabled/disabled pricing metadata, actual offer visibility and native price exclusion. Product-schema checks read the actual backend price rows and verify all five monthly markets across all 14 languages. After the one-line purchase-hub presentation callback, the directly affected Pro, product-schema and purchase-hub suites passed again: **28 tests, zero failures**. Logs are `/tmp/matchapp-pricing-release-tests-20261017.log` and `/tmp/matchapp-pricing-final-callback-20261017.log`.

The later native cancellation, asset-cache and ebook regression changes passed **48 affected tests, zero failures** across `pro-plan`, `news-commerce-integration`, `match-tokens`, `match-token-ebook-integration` and `product-schema`. The Pro suite now includes 23 cases. It covers the exact native retention purpose/date/phase contract in all languages, the separate trusted acceptance, direct cancellation during preparation, invalid/expired quotes, pending verification, account changes and correct web-versus-Play management. Log: `/tmp/matchapp-frontend-final-followup-20261017.log`.

The three new ebook integration cases execute both actual token SQL migrations in PGlite together with the existing reading matcher, the existing shared quota function and the new token wrapper. They verify three real committed ebook debits, exhaustion/reload without a fourth debit, source failure before consumption, verified Pro first value, preserved Ask/Kids balances and original provider anchor identity. The companion reading-safety suite verifies the unchanged policy-disabled allowance path. The former mocked ebook wallet-transition test was replaced by this actual-SQL regression; no fixture pretends a wallet transition is backend evidence.

Chromium fixtures use the actual Home styles/result markup and locally mocked server/native contracts; all network requests are intercepted. They do not make live ad requests, purchases or reward claims. The reports are temporary local verification artifacts:

| Verification | Result | Report |
| --- | --- | --- |
| Quiet balance, depleted gate, web Pro, Stripe retention; 14 languages × 4 widths × 4 states | 224/224 passed; no page errors, overflow, undersized controls, organic CTA changes or blank sponsor card | `/tmp/matchapp-token-pro-qa-20261017/report.json` |
| Hindi/Japanese/Korean/Chinese glyph checks and all-language Play phases | 120/120 passed; no page errors | `/tmp/matchapp-token-pro-glyph-qa-20261017/report.json` |
| Final native pricing typography; 14 languages × 4 widths | 56/56 passed; all phase text 15px; no page errors or overflow | `/tmp/matchapp-token-pro-native-qa-20261017/report.json` |
| Final pricing, existing web subscription and Android web-subscription guidance; 14 languages × 4 widths × 3 states | 168/168 passed; no page errors, overflow, undersized controls, duplicate-purchase actions or hidden Kids navigation; zero loading-to-price block shift | `/tmp/matchapp-pricing-release-qa-20261017/report.json` |
| Native cancellation loading, actual quote and unavailable states; 14 languages × 4 widths × 3 states | 168/168 geometry checks passed; cancellation remains visible and fixed in place, all phase text is at least 15px, no page/console errors or organic CTA changes | `/tmp/matchapp-native-retention-geometry-20261017/report.json` |

Widths are 320, 390, 768 and 1366px. Official temporary Noto subsets were used only in the fixture for glyphs absent from this Linux test host; no production font or dependency was added. Arabic and Japanese screen captures were visually reviewed with the permanent frame visible and cancellation/management accessible.

The native cancellation fixture's final empty-console assertion failed after all 168 geometry checks had passed: it recorded the existing Home iframe warning that `allow` takes precedence over `allowfullscreen`, plus unused-preload warnings caused by deliberately removing the original application scripts from the isolated fixture. The original report is retained rather than relabeled as a warning-free pass. A separate `HEAD:index.html` baseline without the new Pro script and the warning classification are recorded in `/tmp/matchapp-native-retention-geometry-20261017/warning-classification.json`. This work does not claim the full existing Home has zero warnings, and it does not change unrelated iframe/ad markup to suppress them.

An actual Chromium trusted-click fixture confirmed zero native show calls after preparation, exactly one after the second click, a zero balance after the SDK earned event, and three tokens only after the mocked authoritative server credit following dismissal. This proves the client state sequence, not an actual Google SSV completion.

The changed scripts passed Node syntax checks, and the preserved-line-ending whitespace check passed. Earlier result/news/continuation focused and responsive checks are recorded in their separate handoffs. Full repository release gates, live backend/ACL confirmation, actual Play product availability, a controlled native-device reward/purchase lifecycle, and final publishing remain the release owner's integration responsibilities. Do not enable an unavailable format or use a local fixture result as evidence of live approval, eCPM or revenue.
