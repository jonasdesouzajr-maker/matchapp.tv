# MatchApp Ai — competitor-gap SEO execution blueprint (2026-10-27)

## Important scope
This is an implementation handoff, not evidence of deployed pages, earned backlinks, competing domain metrics, or ranking gains. Work from existing route templates, localization, and the **single** unified editorial refresh. Do not rewrite protected design, Kids, matching rules, AdSense, quota, or AI routing.

## Competitor feature map (first-party sources; not claimed keyword ranking)

| Competitor | Verifiable proposition | Opportunity to differentiate (hypothesis to test with GSC and SERP observations) | Source |
|---|---|---|---|
| JustWatch | Provider availability, legal viewing options, personalized recommendations, provider filters and aggregated watchlist | Queries where users have not chosen a title yet: emotion + duration + subscriptions + country; link to verified title availability only | https://support.justwatch.com/article/what-is-just-watch |
| JustWatch Brazil | Provider- and genre-specific discovery, local streaming catalog | Original Portuguese answers to “o que assistir hoje à noite”, “filmes leves para ver hoje”, “séries curtas para maratonar” | https://br.justwatch.com/ |
| Letterboxd | Member lists, popularity and community film curation | Explain *why* suggestions suit a mood instead of reproducing popularity-based lists | https://letterboxd.com/official/lists/ |
| MovieLens | Ratings-driven taste profile and similar-film discovery | Offer immediate, low-friction contextual choices in the user's selected language without requiring users to rate many movies | https://movielens.org/ |

Additional prospects to investigate before drawing conclusions: Reelgood (cross-service discovery), TasteDive (similar-title recommendations), Likewise (community recommendations), TV Time (TV engagement), IMDb (entity information), Rotten Tomatoes (editorial critic/community information). This list is a competitive research queue, not measured traffic or verified head-to-head superiority.

## Execution order — prefer improving existing indexed pages

1. **P0 evergreen:** `guides/choose-what-to-watch/index.html` already exists. Validate query/country performance in GSC and update substantive editorial answer to include distinct user decisions: what to watch tonight, choice by mood, movie vs limited series, and verified provider check. Preserve the `data-seo-copy` localization contract; update all existing translations or use their normal generator. Do **not** create a duplicative `what-to-watch-tonight` page until intent is demonstrably distinct.
2. **P0 discoverability:** existing `trending/this-week/index.html` should link contextually to evergreen chooser; the chooser can reference the dated chart with clear date/source, not a permanent “trending now” claim. Newer verified trend targets in `docs/seo/entertainment-trends-2026-10-27.md`.
3. **P1 durable clusters:** add original sections to existing suitable pages for “movies for when you need to relax”, “short series for a weekend”, “what to watch as a couple”, “mystery without horror”, “what to watch on Netflix and Disney+” (EN + real supported locales). Only create distinct indexable pages where there is enough specific useful content and unique intent.
4. **P1 Portuguese-first:** prioritize `o que assistir hoje`, `filmes para assistir hoje`, `o que assistir na Netflix`, `séries curtas para maratonar`, and `filmes parecidos com [verified-title]` in content, not meta-keyword stuffing. Respect selected language, Brazilian availability and localized search phrasing.
5. **P2 competitive feature differentiation:** test a compact “I have 30 minutes / 90 minutes / a weekend” prompt entry that **uses current app input paths**, only after verifying whether this is already offered. Treat additions as design/feature proposals; do not independently change matching constraints.

## On-page article standards

- Above the fold, actually answer the query; show a concise original decision framework and direct matchmaking action, not an AI-generated wall of filler.
- Helpful examples should be concrete and evaluated for verified identity, genre, length and availability; don't assign provider countries from global popularity data.
- Include authorship (actual organization or verified contributor), editorial method, meaningful update dates (only when substantive), and links to sources or original title metadata.
- Avoid brand-vs-brand claims not supported by tests. Do not imitate or copy competitors' branded presentation, exact copy, user lists, screenshots, API data or unlicensed art.
- Validate title tag, canonical, localization/hreflang, user-visible text, JSON-LD, 404 behaviour, correct sitemap membership, links, mobile/Android WebView accessibility, source freshness and AdSense policy gates before publication.
- Google, Bing and Yandex workflows must follow existing configured submission owners; search/indexing submission != proof of rankings.

## Demand validation and measurement (must be sourced, not imagined)

Query GSC for previous 28/90 days: queries, pages, countries, clicks, impressions, CTR, position, and mobile/desktop. Find high-impression / low-CTR pages and relevant queries with positions ~5–20; compare to prior period. Record source dates and whether pages overlap in intent. Perform actual SERP sampling by Brazil/US/India when possible, since ranking differs by country. Add competitor domains to a manual review worksheet, *not* imagined DR/DA estimates. In 28 days compare: organic landings on chooser/trend pages, matching CTA clickthrough, successful match completion, and search query impressions.

## Legitimate authority growth rather than “stealing”

Publish original, citeable resources (e.g. independently calculated provider-availability methodology or a mood/commitment decision framework); propose free editorial outreach to independent film bloggers and relevant creators *without mass mail*. Seek voluntarily earned links and mentions. Never buy or exchange manipulative links, scrape private competitor data, or copy their ranking lists. Google specifically prioritizes substantive original and helpful content: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
