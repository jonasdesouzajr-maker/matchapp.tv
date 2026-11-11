# US and Singapore browser discovery — 2026-11-11

Follows the browser live audit and fixes in PR #477. No purchases or paid APIs were used.

The production Edge recheck caught a transient standalone header during chat parsing. A browser-only critical style now hides the four standalone chrome elements before delayed scripts reach DOMContentLoaded. The existing chat and native guards are preserved; the renderer test holds a parser script as well as images to cover this exact loading state.

The final 1920px Edge pass also exposed a legacy regional-header mismatch (25px MatchApp, 58px Ai) and over-wide reading lines. Shared browser-only presentation now keeps nested Ai at the wordmark size and bounds the six regional guides to a 1200px reading layout with 85-character paragraphs.

## Evidence and scope

Google Search Console, October 12–November 8: US 6 clicks / 1,855 impressions / average position 12.3; Singapore 0 clicks / 30 impressions / average position 10.9. These are search results, not all website visits. Singapore is an emerging opportunity rather than an established high-volume organic market.

The connected Edge Google Trends entertainment lists showed VisionQuest in both markets on November 11. These are transient search-interest signals, not monthly keyword volume or viewing counts. Disney's official US and Singapore guides verify the eight-episode schedule and November 11 finale; the local premiere dates differ. Netflix's US and Singapore TV charts were checked for November 2–8. No chart was relabeled as a live audience ranking.

The Supermetrics Trends connection reported an expired trial. Research continued through free Google Trends and public primary sources without activating a subscription.

## Changes

- Expand the existing worldwide guide with Singapore K-drama, mewatch, country-specific Netflix discovery and US library/movie-night advice. Add an independent task-based comparison of MatchApp Ai, JustWatch and Reelgood. Retain historical October content with its original dates.
- Add Traditional Chinese to the guide's authored sample prompts, bringing it to all 15 supported interface languages.
- Improve US search/sharing descriptions and useful internal links, retaining its canonical URL and reciprocal regional hreflang.
- Add Kanopy and Hoopla to the researched directory: 121 active services after this update. Display library eligibility in all 15 directory languages. These are directory entries, not new title-availability or matching-engine integrations.
- Record verified Singapore service-level coverage for Netflix, Disney+ and Viu. Keep individual evidence dates and all existing regional/title restrictions.
- Regenerate the existing 344-URL sitemap without adding doorway pages or claiming localized URLs that do not exist.

## Primary sources

- https://trends.google.com/trending?geo=US&category=4
- https://trends.google.com/trending?geo=SG&category=4
- https://www.disneyplus.com/explore/articles/marvel-visionquest
- https://www.disneyplus.com/en-sg/explore/articles/marvel-visionquest
- https://www.netflix.com/tudum/top10/singapore/tv
- https://www.netflix.com/tudum/top10/united-states/tv
- https://www.netflix.com/sg/
- https://www.m1.com.sg/support/faq/viu-faq
- https://www.mewatch.sg/live-tv/free-channels
- https://www.kanopy.com/en/libraries
- https://www.spl.org/books-and-media/movies-and-tv/kanopy
- https://theloop.hoopladigital.com/support/articles/getting-started/what-is-hoopla-digital/
- https://sfpl.libanswers.com/faq/129915
- https://www.justwatch.com/sg
- https://data.reelgood.com/streaming-service-popularity-index/

## Search and monetization state

Google lists both current sitemaps with zero errors/warnings; Bing ownership of matchapp.tv is verified in the connected account. Yandex Webmaster is not connected. Existing robots/sitemap/IndexNow readiness remains intact; Pages owns the post-deployment IndexNow submission. Submission is not proof of indexing or ranking.

AdSense's signed-in Sites screen showed Getting ready, ads.txt Authorized and no current Policy Center issues on November 11. Preserve the owner-requested ad-request review hold and paused editorial publisher. Regional CMP delivery has not been independently verified from eligible European/US locations, and commercial rights for remaining third-party title metadata/artwork are not established by this SEO work. Approval and ad serving cannot be guaranteed.

## Validation

Existing focused metadata, directory, regional/hreflang and guide-regeneration checks passed before final publication. Local renders of /us/, the worldwide guide and /streaming/ at 320, 390, 820 and 1920px showed no horizontal overflow or page exceptions. Final CI and exact-deployed-SHA live smoke remain the release gates; their results are recorded on the pull request and workflow runs.
