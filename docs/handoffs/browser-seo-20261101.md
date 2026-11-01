# Browser search improvements — 1 November 2026

This browser-only release starts from `2a4c9e178153fe2a5a75d2e1c3665d61bbd65c8c`. It preserves the newer Grok browser work and the independently merged native work without changing Android sources or releases.

## Changes

- Home now links visibly to both existing movie-night planners and the Lumina memory-game guide. The tool section stays outside the existing collapsed directory. Its purpose, destination-language labels and accessible navigation name have authored copy in all 14 supported languages. Existing typography and controls are reused.
- The English and Brazilian Portuguese planners explain movie end times, whole-episode calculations, break allowances and sharing. Worked examples match the calculator. They link back to the existing movie matcher and distinguish preference sharing from synchronized video playback.
- Planner titles and structured data describe the actual, free browser calculator. No ratings, fabricated reviews, video streams or new freshness claims are added. The shorter English title agrees with Open Graph, Twitter and the WebPage name.
- Together has a concise, consistent search/share description that retains host sign-in and guest access requirements. Its social preview uses the existing 1200×630 JPEG instead of an SVG advertised as a large preview. The metadata owner has the same description.
- Only Home and the two planners receive new sitemap modification timestamps, reflecting these content changes. No route is added; reciprocal planner hreflang and all existing sitemap entries remain.

## Research and decisions

The connected Search Console query/page read covers web search from 2–29 October 2026. Bing keyword history was read for US English. The growing October signal for “what to watch tonight” fits the existing product and planner; it does not predict MatchApp traffic. Much of the site's recent traffic is concentrated in a seasonal event page. Query samples omit anonymized data and are not site totals.

The broad “match together” result set mixes meanings, so this release clarifies the actual product rather than claiming synchronized watch parties. Lumina is a memory-pairs game; its existing guide already explains account saves and loss of guest progress on close/reload. There is no evidence here that Lumina is a trending query.

Google recommends [descriptive titles](https://developers.google.com/search/docs/appearance/title-link), [useful descriptions](https://developers.google.com/search/docs/appearance/snippet) and [crawlable links with descriptive text](https://developers.google.com/search/docs/crawling-indexing/links-crawlable). Google [does not use meta keywords for ranking](https://developers.google.com/search/docs/crawling-indexing/special-tags). No keyword list has been expanded. Structured data follows the [visible-content guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies); no rich-result appearance is promised.

The five-page live audit reported no critical or high issues. Empty alt attributes on decorative logos/card art are intentional where the containing link or image group already supplies its accessible name. Its claimed mandatory Organization logo is a tool heuristic: Google's [Organization documentation](https://developers.google.com/search/docs/appearance/structured-data/organization) states there are no required properties. These findings do not justify changing protected artwork or adding duplicate screen-reader descriptions.

Google and Bing property access were verified. Yandex Webmaster is not connected in GSC Wizard. Existing Yandex verification, robots directives, canonical URLs and IndexNow delivery are preserved. Pages remains the only owner of post-release IndexNow delivery and the per-deployment live smoke; this task does not duplicate submissions or add monitoring.

## Holds and outstanding evidence

The publisher-request pause, five Home units, publisher/slot IDs, regional consent defaults, ad-free tools, frozen Home news and disabled unified publisher remain intact. This release does not activate advertisements or content refresh. It does not change account settings or request AdSense review. Google also ties publisher eligibility to [search spam rules](https://support.google.com/publisherpolicies/answer/11035931) and [original value and intellectual-property requirements](https://support.google.com/publisherpolicies/answer/11190248).

The prior regional CMP and commercial media-rights limitations remain unresolved. See [the consent/Grok handoff](browser-consent-grok-20261101.md) and [the review hold](../seo/adsense-review-hold.md). Authenticated AdSense message publication/site assignment and real acceptance, refusal, return and revocation tests are still necessary before any approved resumption. Source links and attribution do not establish permission for all intended commercial media uses.

Open proposal #432 includes dated event schedules and frozen content changes, so it is not included. The older independent title proposal #399 remains separate. No concurrent branch is overwritten or blindly merged.

## Validation

Local evidence is recorded in `/workspace/browser-seo-evidence-20261101/`; deployment identity and workflow results must be checked after the normal release. This handoff does not assert search indexing, rankings or AdSense approval.

- `npm test` — 3,472 passed, zero failures or skips. The first run caught an unnecessary cache key on unchanged `build-meta.js`; restoring its original URL passed the existing release audit and the complete rerun.
- `npm run audit:site` — no site/search errors; advisory warnings remain, including missing eligibility fields that must not be invented.
- `npm run build` — passed.
- `node tools/audit-publisher-consent.cjs` — 1,586 tagged documents checked, zero failures.
- `node tools/check-content-rotation.js` — 26 Top Titles, 20 events and 42 news items, unchanged.
- Focused planner/metadata/hold tests — 26 passed; AdSense safety/lock and new SEO checks — 14 passed.
- Browser matrix — 24/24 cases across 320, 390, 820 and 1,366px; all 14 Home languages; zero fatal page errors or horizontal overflow. Together was rechecked after correcting the probe to count its visible heading rather than its hidden legacy heading. External services are blocked locally; normal release smoke supplies live matching/AI/artwork evidence.
- The brand finalizer reports zero changes for the four edited HTML documents.
