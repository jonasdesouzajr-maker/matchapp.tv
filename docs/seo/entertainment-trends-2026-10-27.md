# Entertainment discovery and SEO research — 2026-10-27

Status: research-backed editorial backlog; **not published**, not a statement that pages or titles are currently available in MatchApp Ai. Audience: adult MatchApp Ai web and Android WebView; preserve Kids isolation.

## Verified signals and time windows

| Title or topic | Verified signal | Opportunity | Provenance |
|---|---|---|---|
| Below (2026), Netflix limited series | 21.2m Netflix global English TV views during Oct 12–18, 2026 | A spoiler-light “shows like Below” thriller/mystery matching entry | https://www.netflix.com/tudum/articles/top-10-october-12-2026 ; https://www.whats-on-netflix.com/top-10-title-search/ |
| Animals (2026), Netflix movie | 30.8m English-film views during Oct 12–18, 2026 | “movies like Animals” high-tension thriller matching entry | https://www.netflix.com/tudum/articles/top-10-october-12-2026 |
| The Diplomat, season 4 | 4.8m English-TV views in Netflix Oct 12–18 weekly chart | Political intrigue / smart drama recommendation entry | https://www.whats-on-netflix.com/top-10-title-search/ |
| East of Eden (2026), Netflix limited series | 6.2m views in Netflix Oct 12–18 weekly chart | Adaptations, literary drama, character-driven picks | https://www.whats-on-netflix.com/top-10-title-search/ |
| Carrie (2026) Prime Video | Nielsen ranked first overall for US streaming viewing Oct 5–11, with 1,264m minutes | Stephen King adaptations and psychological horror discovery | https://www.nielsen.com/data-center/top-ten/ |
| October seasonal discovery in Brazil | Brazilian Oct 1 editorial coverage highlights horror, returning series and biopics across major services | PT-BR seasonal recommendations with provider availability checked | https://exame.com/casual/michael-lupin-e-homem-aranha-o-que-assistir-em-outubro-no-streaming/ |

Numbers above are **not** Google search volume and should not be represented as such. Chart geography, metric, and observation date must remain beside any published number. Do not assume US/global streaming availability applies in Brazil, India, or elsewhere.

## Ready-to-review page briefs (not URLs promised live)

1. **Shows like Below (2026)** — primary intent: `shows like below netflix`; suggested slug `/guides/shows-like-below-2026/`; description: “Finished Below? Find tense mysteries and atmospheric thrillers matched to your mood and streaming services with MatchApp Ai.” PT-BR candidate `séries parecidas com Below`. Body: brief original spoiler-light premise; explain recommendation dimensions (isolated settings, suspense, supernatural mystery), specific relevant verified catalog titles and individualized match CTA.
2. **Movies like Animals (2026)** — `/guides/movies-like-animals-2026/`; primary intent `movies like animals netflix`; synopsis and original editorial rationale; high-stakes suspense CTA. Distinguish 2026 title from same-name films in page title, metadata and JSON-LD.
3. **Best political thriller series like The Diplomat** — `/guides/series-like-the-diplomat/`; intent `shows like the diplomat`; strong ensemble characters, intrigue, espionage and politics; match CTA.
4. **Psychological horror series and Stephen King adaptations** — `/guides/psychological-horror-series/`; intent `best psychological horror shows`; “Carrie (2026)” as a timely reference but durable recommendations and age appropriateness maintained.
5. **Halloween watchlist by mood** — `/guides/halloween-movies-by-mood/`; intent `halloween movies to watch`, PT-BR `filmes para assistir no halloween`; distinct cozy, spooky, mystery and supernatural choices. After October, keep the evergreen URL and remove “trending now” claims.
6. **What to watch this week in Brazil** — only if country-filtered provider availability and dates are genuinely verified; candidate `/br/what-to-watch-this-week/` subject to repository routing and canonical ownership checks. No fake Brazil availability and no duplication of existing weekly/trending pages.

## Publication specification and guardrails

- **Inspect existing** `/trending/this-week/`, SEO/watch guides, content route manifests and locale URL strategy *before* creating URLs. Prefer enriching existing pages if duplication would result; avoid orphaned routes.
- MatchApp Ai is exact brand string everywhere. Content must be original, substantive, helpful and editorially reviewed (why each title fits, not just lists of keywords). Avoid templated doorway pages, thin AI content or promises of availability not confirmed in that country.
- Cite official source as-of dates within editorial copy. Refresh or retire temporary “this week” language using **the existing** `unified-refresh.yml` only. Do not create a second cron, scraping loop or Git writer.
- Only render a title if catalog identity is unambiguous, rights-safe artwork is permitted, and supported regional providers are verified; otherwise label provider unavailable/unknown, never invent images, release dates, poster identity, scores, rankings, streaming links or official affiliations.
- Metadata: original title tag and meta description; self canonical; locale-appropriate `hreflang` and `x-default` only for real equivalent pages; indexable HTML with meaningful first-party information, internal links to relevant match flow and existing discovery hubs.
- Schema: honest `WebPage`/`ItemList`/`BreadcrumbList` when on-page content matches; `Movie` or `TVSeries` only where identity/attributes are confirmed. No fabricated `AggregateRating`, `Review`, provider `Offer`, or `VideoObject`. Be aware that adding schema does not guarantee a rich result.
- Indexing: update canonical sitemap generator once for genuinely live routes; validate robots and sitemap for Google, Bing and Yandex. Request Google re-crawling only through supported Search Console process, Bing/Yandex through approved IndexNow/discovery owner where configured. Submission is not proof of indexing.
- Monetization: preserve all locked AdSense Auto ads, inventory and geometry, existing CLS limits; do not place monetization ahead of genuinely useful page content.
- Mobile/desktop/Android share web content. Never modify matching engine, Ask AI, quotas, billing, Kids, protected designs, poster wall, SEO scheduler, or speech.
- QA before merge/deploy: editorial fact check current weekly chart and date; verify duplicate route absence; test page content, semantic titles, JSON-LD, hreflang/canonical, sitemap, links, responsive layout, English/PT-BR and other available locale coverage; run repository's existing SEO, design-lock, and release gates. Record real Search Console impressions/CTR/queries when connector access permits, not invented estimates.

## Suggested measurement

Measure clicks, impressions, CTR and average position by query/page/country in GSC (baseline before rollout, then 7/28 days); track organic landing → matching CTA → successful match with privacy-safe events. Analyze engagement, not only rankings. Prioritize pages with proven demand and good match intent. Avoid claims of guaranteed traffic or earnings.
