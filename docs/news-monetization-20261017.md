# MatchApp Ai news discovery and monetization readiness

Reviewed: 17 October 2026. This module adds useful streaming discovery around eligible entertainment reports. It does not load advertising, change a news source link, generate affiliate identifiers, consume credits, grant rewards, or modify the news pipeline.

## Implemented module

Discovery files: `news-monetization.js`, `news-monetization.css`, and `tests/news-monetization.test.cjs`. The separate native-only adapter is `native-news-slot.js` / `.css`; Android owns the actual `NativeAdView`, eligibility and ad request.

The module runs on the adult web site and its live Android WebView. All new visible copy is authored in English, Portuguese, Spanish, French, German, Italian, Turkish, Russian, Arabic, Hindi, Indonesian, Japanese, Korean and Chinese. It reads the existing explicit language/country choice and never infers country from language. Arabic applies RTL to the new component only. Kids routes are excluded.

### Contextual links

An article qualifies only when its actual data category is `entertainment`, it has an HTTPS publisher URL, and the headline names a recognized provider in a film/series context. The headline, event type and summary are screened for sensitive topics including death, war, abuse and allegations. The test suite covers these exclusions across all supported languages. The filter is intentionally conservative: an incidental Amazon reference, a person named Max, a finance headline, a world story or an obituary must not become a streaming promotion.

Ordinary provider mentions create an **Explore [provider]** link to the official catalogue, accompanied by a reminder to check title availability and access conditions. A title mention alone supplies no regional availability evidence. Where a selected provider has no supported destination for the chosen country, the link goes to the existing official streaming directory.

**Watch on [provider]** and a checked-country note require separate, fresh metadata for the exact title, provider and country. The article's title identifier must match the evidence identifier; the evidence must be no older than 24 hours, not future dated, and contain the same official exact-title page as its source and destination. A platform homepage cannot substantiate title availability. The ingestion/editorial system remains responsible for obtaining that evidence from a real source. No current news record gains verification merely because its headline names a service.

The module never creates tracking tags or treats an ordinary provider link as an affiliate agreement. Any future commercial attribution requires an independently verified partner relationship, approved destination, and appropriate disclosure.

### Official local options

The bundled records include **Pluto TV in the United States: free with ads**, checked against the provider's official site on 17 October 2026. The provider's FAQ describes commercial breaks and no subscription/payment requirement. Source: <https://pluto.tv/us/>.

The record's `reviewBy: 2026-11-16` is MatchApp's internal freshness cutoff. It is not a promotional expiration date. The UI says when the information was checked and links to the provider's terms/details; it does not invent a trial, discount, savings figure, exclusivity or affiliate agreement. The validator omits expired, future-dated, untrusted and unsupported records. Unsupported countries do not receive the US offer automatically. Visitors may choose the US explicitly inside the panel; this local choice does not change their profile or matcher country.

Three additional Apple TV trial records were checked on the official national pages on 17 October 2026. Each is a **7-day trial for eligible new subscribers**, followed by automatic monthly renewal. The card shows the actual reviewed renewal amount, a reminder to cancel at least 24 hours before the trial ends to avoid renewal, the national legal terms and the check date. The provider determines eligibility and confirms the current price at sign-up. Streaming access is a separate provider subscription.

| Explicit viewer country | Reviewed monthly renewal | Official offer information | National terms |
| --- | --- | --- | --- |
| Brazil | BRL 34.90 | <https://www.apple.com/br/apple-tv/> | <https://www.apple.com/legal/internet-services/itunes/br/terms.html> |
| Mexico | MXN 199.00 | <https://www.apple.com/mx/apple-tv/> | <https://www.apple.com/legal/internet-services/itunes/mx/terms.html> |
| United Kingdom | GBP 9.99 | <https://www.apple.com/uk/apple-tv/> | <https://www.apple.com/legal/internet-services/itunes/uk/terms.html> |

These three records have a stricter **24 October 2026 review cutoff**, seven days after verification. This is an editorial safety cutoff, not a claim that Apple's promotion expires on that date. They disappear until reviewed again when that cutoff passes. The immutable validation registry requires the exact reviewed provider, country, HTTPS information page, national terms URL, trial duration, eligibility, cancellation lead time and renewal amount/currency. A changed price, unreviewed market, affiliate query string, lookalike URL or stale date cannot silently become an offer. Prices use integer minor units and an explicit two-digit scale, then the selected language's `Intl.NumberFormat` with a visible ISO currency code.

No affiliate identifier is attached to these offers. The read-only affiliate audit found the existing approved Brazilian Amazon Associates tag only in the ebook/magazine routing contract. That contract excludes unapproved Android/PWA/TV surfaces and provides no Apple or news-partner authorization. The new carousel does not reuse it.

The horizontal list uses scroll snap, readable cards and no autoplay. It sits inside an initially collapsed **Local streaming options** panel. Expansion and country changes are direct user actions. If no validated option remains, the build helper returns an empty string so the carousel can be omitted. Do not replace missing offers with fabricated campaigns or stale trial copy.

## Integration contract

Load the CSS as a normal stylesheet in the page head, before first paint. Load the JavaScript with `defer`. Cache-bust only these new files when they change.

```html
<link rel="stylesheet" href="/news-monetization.css?v=20261017-2">
<script defer src="/news-monetization.js?v=20261017-2"></script>
```

Give only eligible article cards the following attributes and owned slot. HTML-escape every data attribute. Preserve all original card markup, article anchors and listeners outside the slot.

```html
<article
  data-news-commerce-card
  data-news-category="entertainment"
  data-news-title="Netflix shares a trailer for a new film"
  data-news-event="Release"
  data-news-description="The publisher's short summary."
  data-news-source-url="https://publisher.example/original-report/">
  <!-- Existing headline, summary and source link remain here. -->
  <div class="ma-news-commerce-slot" data-news-commerce-slot></div>
</article>
```

The example publisher URL above is explanatory markup, not a production data record. Use the record's original, verified publisher URL.

Node/build usage:

```js
const commerce = require('../news-monetization.js');
const eligible = commerce.eligibleArticle(item);
const initialSlot = eligible ? commerce.contextMarkup(item, '', pageLanguage) : '';
const initialOptions = commerce.offersMarkup(commerce.offers, '', pageLanguage);
// If initialOptions is nonempty, wrap it in <div data-news-local-offers>.
// Otherwise omit the host. Keep the actual original article category.
```

For initial HTML, use a real declared country only when known. An empty country is safer than selecting a country from an article's language or the visitor's interface language. The client then reads the existing user-selected country. The module changes only the owned slot and options panel.

If exact-title evidence exists, set `data-news-title-id` on the card and add a nonexecuting JSON script inside it:

```json
{
  "verified": true,
  "title_id": "the-same-verified-record-identity",
  "provider": "netflix",
  "country": "US",
  "checkedAt": "a-real-ISO-timestamp-from-the-source-check",
  "url": "the-real-official-exact-title-URL",
  "sourceUrl": "the-same-real-official-exact-title-URL"
}
```

Use `<script type="application/json" data-news-availability>` and escape `<` as `\u003c` when embedding JSON. This is a schema illustration, not verified metadata to copy into production. Current news records need no new availability field for ordinary catalogue links.

The public API is `window.MatchAppNewsMonetization`; CommonJS exports the same pure helpers. Runtime refresh listens to existing `matchapp:langchange`, `matchapp:news-static-ready` and relevant `storage` events. It does not intercept article clicks, register a page-wide mutation observer or make network calls.

### Layout reservation

- The contextual slot reserves `10rem` before hydration. It must be present in the generated HTML for eligible cards; appending a slot after an existing card has painted would move the feed.
- The collapsed options host reserves `calc(5rem + 2px)`, matching the panel's `5rem` summary plus borders. At widths below 360px both increase to `7rem` plus borders so the Russian heading also fits inside the existing page's narrower content column without moving the feed.
- Ordinary option cards reserve `17rem`; trial cards reserve at least `32rem` and can grow to fit the complete eligibility, renewal and cancellation text. The list scrolls inside its container, not the entire page.
- Primary links and the country selector have at least 48px touch height. Terms and directory links have at least 44px. New controls use scoped gold/violet styling, visible focus indicators, wrapping text and reduced-motion/forced-colors support.

Only supported adult news pages receive hooks. `latest-news.js` adds a reserved sibling slot before eligible cards enter its existing rail; its original publisher anchor, request/state handling and existing AdSense markup remain unchanged. The sole `tools/refresh-news-rss.js` generator emits the same conditional hooks in article and hub templates, with an initially unselected local-options panel on the hub. The current 17 October 41-record feed has no qualifying provider-and-film headline; omission of contextual CTAs in that snapshot is expected.

## Google monetization boundaries

The release review observed the AdSense site as **Getting ready**, with ads.txt **Authorized**. The site remains under review; these observations do not establish approval, fill rate, eCPM or future earnings. The existing AdSense lock and current placements are unchanged. This module contains no ad loader, AdSense adapter, unit ID, hidden paid card, impression event or NativeAdView imitation.

Before a future news ad placement is activated, it needs all of: appropriate approved account/site status; a genuine dedicated unit and format configuration; an explicit change to any applicable owner lock; consent/age eligibility; reviewed placement geometry; and original content of sufficient value. A feed of brief replicated headlines does not gain AdSense eligibility merely by adding advertising around it.

### Actual native news placement: enabled in the unpublished release candidate, awaiting device validation

The authorized Android addition uses a genuine SDK `NativeAdView`, with registered assets, a readable sponsored label and AdChoices. It does not insert HTML that imitates a native advertisement. The JavaScript adapter owns only an empty, fixed-size reservation and a neutral localized no-fill message. There is no Google web ad loader or new AdSense unit in this work.

The native bridge is accepted only on the exact HTTPS apex origin, in the main frame. Home and `/ebooks/` load a no-DOM reporter; only the `/news/` hub can create a reservation. Article pages, Kids, ordinary web browsers, old apps without the bridge and initial unknown/ineligible account states create no slot. Android independently enforces its feature switch, known current account, consent, ad-free entitlement, prior core value and SDK lifecycle.

An actual successful renderer calls `MatchAppNativeNewsSlot.confirmValue(surface, host, run)` from the already-existing successful-result callback. This notification happens before the token rollout flag check, without changing the token balance or gating behavior. It requires a connected current result, meaningful title, matching poster/result identity where applicable, a valid HTTPS provider destination, and a visible unobstructed title for two stable rendered frames. Reading source-discovery fallback, hidden/failed/stale results, synthetic first-value events and quota/local-storage counters do not qualify. Pending/observed proof is document-local and cleared synchronously on auth change and pagehide; a refresh cannot resurrect a previous account's visible result. Native may retain the already-seen value across same-account Home-to-News navigation, and re-requests the current document proof when its existing account hydration completes.

Each document exposes only `window.MatchAppNativeNewsDocumentId`, a fresh cryptographic UUID. The existing bridge receives `hello`, bounded `slot`, `hide`, `reset` and `dispose` messages tied to that UUID. It receives no article copy, ad creative, URL, user identifier or credentials from the geometry adapter. Native events are accepted only for the current UUID with strict eligibility booleans and the agreed dimensions. An account reset rotates the UUID before any new eligibility exchange.

The hub generator marks its existing grid with `data-native-news-feed`. After an eligible native response, one slot may be inserted **after the sixth actual article**, only while that anchor is still below the viewport. It reserves 480 CSS pixels in height before any ad request and spans the grid at a width between 280 and 640 pixels. The current 320px screen has a 248px content column, so it receives no native slot; the existing grid is not widened to accommodate inventory. At 360px and wider, the 480px rectangle must fit fully inside the visible viewport with an 8px safe inset, no zoom/visual-viewport offset and two stable frames. Native starts its single request only after that safe geometry message.

The adapter hides inventory immediately during scroll, pointer gestures, modal/fullscreen coverage, account/visibility changes or overlap with fixed/sticky UI. It then waits for settled, unobstructed geometry and sends a bounded heartbeat. Native also independently expires stale geometry. `ready` means the creative is actually visible; loaded-but-hidden uses `hidden`. The localized neutral fallback remains until a real `ready` event and returns on hidden/no-fill. Once mounted, the reservation remains for the current document to avoid collapsing content. A no-fill result stops further loading attempts for that document. The shared gold perimeter and original article typography, padding, border radius, source links and listeners remain unchanged.

The existing release flag is now enabled in the still-unpublished version 55 candidate; debug retains its existing enabled flag and sample unit. Global token/sales switches and QA-cohort membership do not control this placement. The Production draft's actual Google-signed APK must pass physical testing on the registered AdMob test tablet before that same bundle is submitted to Production. SDK assets, AdChoices, scrolling/obstruction, consent, ad-free/account transitions and lifecycle remain required checks. Local bridge fixtures and the source flag are not evidence that an ad was served or that physical validation passed. See `android-studio/play/MONETIZATION_IMPLEMENTATION_20261017.md` for the matching native contract and activation state.

Google's AdSense placement rules allow publisher labels such as **Advertisements** or **Sponsored Links** and prohibit misleading presentation or directing attention to ads. “Sponsored Match” must not replace a required Google ad label. Keep article CTAs, sparkle effects and navigation clear of any actual ad area. AdMob native creative needs an actual native view, readable ad attribution and unobstructed AdChoices; a low-opacity badge that becomes hard to read is inappropriate. Official references:

- AdSense placement policies: <https://support.google.com/adsense/answer/1346295?hl=en>
- In-feed unit setup: <https://support.google.com/adsense/answer/9189557?hl=en>
- AdMob native requirements: <https://support.google.com/admob/answer/6329638>
- NativeAdView integration: <https://developers.google.com/admob/android/native/advanced>
- Publisher inventory value and replicated content: <https://support.google.com/adsense/answer/12176698>
- Consent management for AdSense: <https://support.google.com/adsense/answer/13554116>
- AdMob Android privacy/UMP: <https://developers.google.com/admob/android/privacy>
- WebView APIs for ads: <https://developers.google.com/admob/android/browser/webview/api-for-ads>
- App-ads.txt verification: <https://support.google.com/admob/answer/14538460>

### Rewarded video and the authorized token economy

Rewarded video must describe the promised reward before the user opts in. A rewarded interstitial requires the proper introduction/skip path. A failure to load, early dismissal or a skipped ad must not be reported as a completed reward. Preserve ordinary source links and existing content access. The newer authorized token economy may offer additional tokens for voluntarily completed rewarded video, but this news module does not enforce quotas or mint those tokens.

The production reward integration needs a real rewarded unit, current UMP eligibility, server-side verification of Google's signed callback, an account-bound reward attempt, transaction deduplication, and an authoritative server ledger. A client callback/local cache can update presentation after the backend acknowledges the reward; it is not authority to grant spendable credits. Cross-device balances must come from that ledger. No nonfunctional “watch to unlock” button is inserted by this module.

### Deep news recap fulfillment: unresolved dependency, no unlock UI

The current RSS generator stores publisher headlines, source links and short discovery descriptions. The regional RSS service uses similarly brief discovery context. Those records do not establish enough substantive source text for a factual deep recap. The existing Ask AI boundary accepts a bounded question and its ordinary prompt/quota rules; it does not retrieve and validate the underlying article. Reusing that prompt with a headline would not implement a verified deep-news recap.

Consequently, this release adds no “watch an ad for a deep recap” button, recap ad unit, new LLM charge path or hidden recap entitlement. The existing verified reward is specifically three Match Tokens and cannot be relabeled as a recap purchase.

The concrete remaining service dependency is an owned **prepared recap fulfillment boundary**:

1. Resolve an existing feed/topic ID to allowlisted source records. Qualify substantive publisher-provided RSS or licensed excerpts, preserving source identity, publication/check dates and retrieval provenance. Do not fetch arbitrary visitor-supplied URLs. Insufficient or unavailable source material returns no offer and makes no ad request or credit charge.
2. Prepare a substantive, fact-checked, cited recap in the explicitly selected language before offering a reward. Validate the result against the qualified excerpts and retain the exact source attribution. A headline paraphrase, boilerplate summary, empty response or ungrounded generated text is not a prepared recap.
3. Return an account-bound, short-lived, opaque ready-recap ID and accurate visible unlock terms only after the validated content is durably available. Bind the prepared object to its topic, selected language, source versions and account. The client may render a reserved offer only in this ready state, after prior core value; preparation alone cannot trigger an advertisement.
4. Use a separately reviewed immutable reward/fulfillment claim, with one-time Google SSV reconciliation, to release that exact prepared object. Preserve claim recovery, cancellation before presentation, dismissal/resume reconciliation and replay protection. Do not rely on an SDK earned event or a local flag, and do not mint another Match Token reward under a recap label.
5. Deliver the already-prepared recap after authoritative fulfillment. A generation failure cannot occur after the viewer has watched an ad because generation/validation preceded the offer. Expiry, cancellation or missing content must remain honest and must not trap the user or remove the original publisher link.

This contract is a prepared implementation specification, not an existing endpoint or a completed rewarded deep-recap feature. A source/content service and an approved separate fulfillment contract are still required before the UI can truthfully offer it.

- Rewarded inventory policy: <https://support.google.com/admob/answer/7313578>
- Rewarded interstitial implementation: <https://developers.google.com/admob/android/rewarded-interstitial>
- Rewarded server-side verification: <https://developers.google.com/admob/android/ssv>
- Google Play advertising policy: <https://support.google.com/googleplay/android-developer/answer/9857753?hl=en>

## Direct sponsored recommendation contract

The later authorized sponsored recommendation must remain distinct from the first organic recommendation. A real direct sponsor record needs a campaign ID, the sponsor's legal/display name, documented commercial authorization, region allowlist, start/end timestamps, exact title identity, an official verified destination, authored localized disclosure and a separately labeled placement after the organic result. Do not label a normal algorithmic recommendation as sponsored or invent a campaign to fill that position.

If the record is missing, expired, region-ineligible or unavailable for the exact title, omit the sponsored recommendation. An empty sponsored inventory is a valid release state. A paid link needs the appropriate `sponsored` link relationship and clear disclosure. If the creative is provided by AdMob, use its SDK-rendered ad assets and attribution contract instead of treating it as an editorial title record. This schema guidance creates no campaign and changes no organic ranking.

## Verification

Run `node --check news-monetization.js` and `node --test --test-isolation=none --test-force-exit tests/news-monetization.test.cjs tests/news-commerce-integration.test.cjs tests/news-snapshot-first-paint.test.cjs`.

The focused suites cover original DOM/listener/ad preservation, no requests or storage writes, all 14 languages, local country choice, exact national trial renewal/terms validation, region/source/date validation, sensitive news exclusion, exact-title evidence, malformed metadata and Kids exclusion. `tests/native-news-slot.test.cjs` additionally exercises origin/document/account boundaries, the true visible-result proof with token rollout disabled, bounded geometry, obstruction/gesture handling and stable no-fill reservation. `tests/news-commerce-integration.test.cjs` executes the actual generator in memory and verifies its hub-only marker/assets while preserving every original article/source node. Generated publisher outputs remain untouched until the release owner's final merge/regeneration step.

The final adapter suite passed **14 tests**. The affected generator integration was included in the later **48-test frontend follow-up**, with no failures. Rendered Chromium fixtures using the actual generated hub, existing feed and stylesheet order passed **210 trial cases** (three reviewed trial markets × 14 languages × five widths) and **70 native reservation cases** (14 languages × five widths). Widths were 320, 360, 390, 768 and 1280px. They retained all 24 displayed original article elements, had no horizontal overflow or page/console errors, and kept the native no-fill reservation stable. At 320px the test verified no native slot, rather than changing the existing grid to fit one.

The rendered check caught a rounded-corner hit-testing edge at 390px: a point four pixels inside the 14px radius can legitimately hit the grid through the transparent corner. The adapter now samples inside the painted content at 16px while retaining the independent full-rectangle, safe-inset and overlay-intersection checks. A focused regression and the final 70 rendered cases cover this correction. The new native script uses cache key `20261017-2`; its unchanged stylesheet remains `20261017-1`.

Fixture reports are `/tmp/matchapp-native-deals-geometry-20261017/trial-report.json`, `report.json` and `combined-report.json`. Arabic trial terms and the native reservation were visually reviewed. Official temporary Noto subsets supplied host-missing glyphs only in the fixture; no production font dependency was added. The fixture's native bridge events are geometry simulations, not actual SDK requests or evidence of physical ad fill.

Full repository gates, production backend checks, live offer revalidation at activation and integrated physical Android SDK checks remain release responsibilities. Do not use mocked geometry or a successful compile to claim live ad fill, approval or earnings.
