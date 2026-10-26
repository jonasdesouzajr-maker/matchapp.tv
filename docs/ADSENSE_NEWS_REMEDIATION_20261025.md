# News discovery and content-quality correction

Google AdSense reported **Low value content** for matchapp.tv on 25 October 2026. The account supplied no offending URLs. The pages below are our independently identified remediation targets, not pages named by Google.

## Findings and changes

- `/news/` repeated the same source-link explanation on every card and advertised an unreliable hourly cadence. It now gives practical reading and viewing decisions, connects the dated October discovery guide and the country-specific Roma guide, and avoids claiming that a feed check makes a report new. Interface guidance is authored in all 14 supported languages; source headlines remain original.
- World feed rows were passed through entertainment event classification. Ordinary political wins, weather and deaths could appear as Entertainment, Awards or In memoriam. Explicit world feeds now keep a World label. English and Portuguese entertainment relevance use accent-normalized terms; ambiguous “star” and “wins” alone do not qualify.
- The retained archive and older wrappers receive the same category correction. Existing source URLs remain accessible; wrappers remain `noindex,follow`, absent from the sitemap and without AdSense engines or units. The news hub remains in the sitemap. Source wrapper pages are discovery references, not republished news articles.
- Regional NATION/WORLD feeds intentionally cover general news in the selected language and country. Hydration keeps that category, uses general news accessibility labels, and falls back to the source snapshot on empty, failed or timed-out requests. Missing or invalid source dates are stored as `null`, with discovery recorded separately; they are never presented as a fresh publication date.
- Home labels distinguish September 2026 snapshots from current discovery. Existing substantive October and Roma guides, matching, authentication, Kids safeguards, public/private Together behavior, ad configuration and design assets remain unchanged.
- A dated editorial comparison goes beyond headline navigation: it contrasts a new Blossoms album with the Beatles' Rubber Soul reissue, and released Halloween-film choices with the announced Narnia adaptation. These are practical edition, mood and timing decisions, not reviews or claims of universal availability. Facts were checked against Official Charts, Disney/Freeform and Netflix Tudum on 25 October 2026; all 14 interface languages include the comparisons. The existing compact layout keeps this optional reading in a disclosure.
- The existing editorial guide navigation is placed ahead of the optional how-to disclosure, so readers can reach the substantive October guide without expanding an accordion. The render gate opens the real outer how-to disclosure before the nested comparison and checks both English and Portuguese.

Examples inspected: the Storm Beolo source wrapper and the Sam Fender ticket-price source wrapper. The first belongs to World; the second remains Music. Neither is an AdSense article.

## Reproduction and checks

`node tools/refresh-news-rss.js --repair-existing` reuses the last good source snapshot for a deterministic template/category repair. It makes no publisher requests or schedule changes. A second run must leave the generated files byte-identical.

Behavioral fixtures cover actual RSS ingestion in English and Portuguese, ambiguous world headlines, source date preservation, missing/invalid/future regional dates, orphan wrapper parity, hub guidance, and regional hydration with empty/timeout fallback. Existing language, publisher-security, monetization, sitemap and immutable AdSense tests remain in force.

Before resubmission: require aggregate/build/search/content checks, hosted CI, responsive rendered inspection, successful deployment, exact live SHA and live function verification. A review request is not approval. Google alone determines eligibility; no ranking, acceptance or revenue guarantee is made.

CodeQL follow-up: the orphan repair opens and rewrites one file descriptor rather than checking a path before reopening it; the regional XML decoder decodes entities once; the wrapper test checks the literal advertising hostname without an ambiguous regexp. Existing alert #1 (`js/http-to-file-access`) concerns the pre-existing fixed-path JSON smoke report and remains open. The original report writer is unchanged; a separate news browser command runs as a required step within the existing matching audit, preserving all original checks and artifact capture.

References: [AdSense site quality guidance](https://support.google.com/adsense/answer/10015918), [Google publisher content policies](https://support.google.com/publisherpolicies/answer/11035931).

Editorial sources: [Official Charts, 2 October 2026](https://www.officialcharts.com/chart-news/new-music-friday-october-2-2026/), [Disney/Freeform's 2026 Halloween guide](https://www.disneyplus.com/explore/articles/freeform-31-nights-of-halloween), [Netflix Tudum's Narnia announcement](https://www.netflix.com/tudum/articles/narnia-release-date).
