# Browser discovery and Android landing — 3 November 2026

## Verified starting point and scope

Started from clean main `af87d32bc47886b3137e45ec09414d0b506229cb`, also returned by production `deployment-sha.txt`. Pages run 41497689943, validation 41497689917 and live release smoke 41499121962 succeeded. Preserved the newer planner, CCXP/Worlds, language, gutter and Rio cover commits.

Browser scope only. No native source, Play release, ad placement/engine, account setting, notification/install invitation, matching, Kids, or editorial refresh changes. The Home ad-request pause and dated editorial snapshot remain in force. No outreach or duplicate TikTok/AlternativeTo submission.

## Changes and evidence

The existing `/android/` page incorrectly invited Android visitors to install a browser app and claimed the adult app had the same Kids Mode entry points. Current native `MainActivity.kt` explicitly excludes Kids routes. The official [Google Play listing](https://play.google.com/store/apps/details?id=com.jonas.papercup), fetched 3 November, confirms movies/series by mood, Match Together, saved discoveries, Jonas and provider viewing links. The new copy describes those benefits, distinguishes a browser shortcut from the Android application, and explains external provider access, internet, ads and optional purchases. No claim about Lumina, free streaming, guaranteed availability, rankings, downloads or Play review status was added.

The page now uses the existing shared language engine with authored copy in all 14 supported languages. A saved deliberate language wins over an incoming localized link. Title and description previews follow that choice; the canonical and actual Play package remain fixed. Static English HTML remains readable without JavaScript. The store CTA no longer has a disabled-looking opacity/cursor. Existing Anime Finder, Ask and dated October guide links are retained with localized labels. Existing shared designs are preserved.

Ordinary optional links now lead from the English and Portuguese movie-night planners and the Portuguese +SBT page to `/android/`, with the appropriate language hint. The +SBT catalogue, verification date and provider claims are unchanged. These are hand-authored pages; no owning generator was found. The existing discovery-metadata and sitemap generators already retain these routes. Only the four changed route lastmod entries and sitemap index date were advanced. The brand finalizer was probed read-only and reported zero rewrites.

This follows Google's [crawlable, descriptive link guidance](https://developers.google.com/search/docs/crawling-indexing/links-crawlable). Google, Bing and Yandex retain crawlable links, canonical URLs, existing robots and sitemap paths. Normal successful Pages deployment owns IndexNow submission; no manual duplicate submission or GSC validation is performed. Webmaster acceptance does not establish indexing.

## Search baseline and decisions

GSC Wizard `query_search_analytics`, `get_position_distribution`, `analyze_ctr_curve`, `score_opportunities` and `find_page_poaching_opportunities`: 4–31 October 2026, property `sc-domain:matchapp.tv`, web search, all countries/devices. Settled through 31 October; 1 November onward is incomplete. Raw baseline is stored outside the repository in `/workspace/browser-growth-evidence-20261103/search-baseline.json`.

`get_position_distribution` reports 170 visible queries / 7,256 impressions in positions 4–10 and 75 / 1,838 in 11–20, versus 52 / 71 in 1–3 and 126 / 443 in 21+. The near-top opportunity is largely Kota event demand. Position bands do not exactly isolate positions 4–15. CTR bucket 4 has 0% on 107 impressions; bucket 10 has 0.268% on 2,241 impressions. Benchmark deltas vary substantially by source; empty buckets are not evidence of a snippet problem.

Selected rows below use `query_search_analytics` page mappings; ranking/click upside uses `find_page_poaching_opportunities`. Estimated extra clicks use its AWR position-3 CTR benchmark because this property lacks sufficient own-position-3 data; these are hypothetical, not a forecast. Page mappings can be approximate for multi-page queries.

| Query | Page | Position | Impressions | CTR | Signals / estimated extra clicks | Decision |
|---|---|---:|---:|---:|---|---|
| matchapp | Home | 4.69 | 346 | 3.47% | Opportunity score plus position-3 benchmark: 17 query-level extra clicks | Improve truthful Android destination and internal paths; retain recent Home metadata |
| ccxp26 | /events/ccxp-2026/ | 7.87 | 109 | 1.83% | Opportunity score plus benchmark: 7 extra clicks | Recent main already improved this page; wait for settled post-change data |
| where to watch 3 idiots uk | /where-to-watch/3-idiots/ | 9.50 | 34 | 2.94% | Benchmark: 2 extra clicks | No current verified provider change; preserve existing guidance |

The raw query/page rows cover only 49.33% of property clicks in this range. Property totals are 150 clicks and 16,215 impressions from `query_search_analytics.coverage.siteTotals`; summed query rows are not totals. The supplied weekly decline was concentrated on Kota while its position improved, consistent with changing demand/mix rather than proof of sitewide ranking loss. No event date, demand or catalogue availability was invented to chase historical impressions.

Priorities: (1) publish and verify the corrected, translated Android landing and contextual links; (2) let recent planner/CCXP/Worlds changes accumulate settled data before rewriting them; (3) require fresh provider evidence before changing title availability; (4) measure actual outbound clicks/downloads before claiming conversion improvements. GA4 conversion linkage is not verified; no new tracking or consent behavior is introduced.

## Validation and limitations

Focused landing/planner/native-install/search-indexing tests pass (22). The first full run passed 3,483 tests and caught one removed internal guide link; the link was restored rather than weakening its guard. Chromium rendering passes 29 cases across 320, 390, 820 and 1440px, including all 14 Android-page languages at 320px; no horizontal overflow or fatal page errors. Representative English, Portuguese and Arabic screenshots were reviewed. Source/site/search audits report zero errors (1,695 HTML documents, 282 public sitemap URLs); existing advisory warnings remain. Build passes; publisher consent checks 1,586 documents with zero failures; content rotation retains 26 Top Titles, 20 events and 42 news items. The corrected full suite passes all 3,484 tests with zero failures or skips (419.5 seconds). Release results are recorded in the evidence directory as they finish. Production identity must be checked after publication. No search-indexing, traffic-growth, conversion, AdSense approval or Play release claim follows from passing tests. Prior authenticated publisher/CMP and commercial-media rights limitations remain documented in `docs/seo/adsense-review-hold.md`; this change does not lift any hold.
