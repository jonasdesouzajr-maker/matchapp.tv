# Lumina Match: search growth research and release scope

Research date: 2026-10-29. Product: the **250-level browser edition** embedded in MatchApp Ai. This document does not describe the separate Android game's level count or store availability.

## Implemented scope

Strengthen the existing 14 localized canonical guides rather than create near-duplicate keyword doorway pages. Preserve the existing reciprocal hreflang cluster, original art, legal navigation, free/guest-save disclosures, single game identity, and Home/Explore links. The release adds localized memory-card H1s and descriptions, 28 authored explanatory/strategy sections, beginner-practice guidance, nine focused structured-data search phrases per locale (126 total), and a genuine 1200 × 630 gameplay social preview with localized alternatives and reserved visible dimensions.

The keyword count describes our editorial mapping, not rankings, search volume, indexing, or a guaranteed traffic result. The page title remains concise and branded. No meta-keywords tag, competitor-name stuffing, invented rating, review, medical claim, fake player count, or additional advertising inventory is added.

## Competitive search-intent evidence

Reviewed publisher pages, not third-party traffic estimates:

| Primary source | Observed intent | Relevant application to Lumina Match |
| --- | --- | --- |
| Memozor, https://www.memozor.com/memory-games/for-adults | Online matching, no download, guest play, solo/local two-player | Explain browser access and the distinction between guest play and account saving. Do not copy its health claims or audience claims. |
| Memozor, https://www.memozor.com/memory-games | Memory and Concentration terminology | Explain the face-down pairs mechanic in original copy. |
| Poki, https://poki.com/en/matching | Broad matching categories, mobile/browser discovery | Differentiate pairs from match-3, connecting and merging instead of mislabeling our gameplay. |
| Poki, https://poki.com/br/mem%C3%B3ria | Brazilian Portuguese memory-game vocabulary | Use natural “jogo da memória”, “encontrar pares” and “sem baixar” on the pt-BR route. |
| CrazyGames, https://www.crazygames.com/br/game/memory-cards-sni | Individual browser memory-card game, relaxed play, device compatibility | Make Lumina's actual modes, instructions and real screenshots specific and useful. |
| Puzzimo, https://puzzimo.com/en/memory?daily=1 | Pairs/Concentration naming and simple instructions | Target matching-pair intent, not a daily challenge Lumina does not provide. |

Short-tail families: memory game, card matching, pairs game, concentration game. Product-fit long-tail families: free online memory game, memory game no download, relaxed memory-card game, two-player memory game, memory game with 250 levels, plus authored equivalents in all 14 supported locales. The CSV beside this report maps exact targets to the existing canonical routes. Localized phrases are editorial targets, not individually measured volume estimates.

General board-game and card-game demand is adjacent, not proof that Lumina is a different type of game. We use the tabletop-pairs relationship in explanatory content instead of inserting unrelated popular game titles or claiming to provide every card/board genre.

## Current demand verification: Bing, not an invented global trend

The connected Bing Webmaster keyword service was queried on 2026-10-29. Its latest returned weekly row is 2026-10-24. Bing marks no settled-through date; these are provisional platform-specific counts, not Google searches, global monthly volume, unique people, or MatchApp traffic. Missing weeks are not assumed to be zero.

Comparison below uses four returned consecutive weekly dates 2026-10-03/10/17/24 against 2026-09-05/12/19/26. Exact and broad figures are shown together; they are not added to each other.

| Query / market | Prior four exact | Latest four exact | Prior four broad | Latest four broad |
| --- | ---: | ---: | ---: | ---: |
| memory game / US, en-US | 784 | 727 | 1,624 | 1,891 |
| jogo da memória / BR, pt-BR | 538 | 487 | 2,982 | 2,590 |
| matching pairs game / US, en-US | 23 | 11 | 113 | 62 |

Interpretation: demand exists, but these observations do **not** support advertising a general surge. US broad memory-game interest increased in this window while exact counts declined; the Brazilian comparison declined. The narrow pairs phrase has a small sample. Prioritize relevant evergreen discovery and the real product's differentiators rather than “viral now” claims. No search volume, keyword difficulty, competition score, or doubling forecast was invented.

## Measurement baseline and limitations

Connected Google Search Console query response: property `sc-domain:matchapp.tv`; 2026-09-29 through 2026-10-26; total site 150 clicks, 15,502 impressions, CTR 0.97%, weighted average position 9.21. The gaming filter returned no rows for that period, which ends **before the guides' October 28 launch**. That is not a post-launch indexing failure or proof of zero current gaming traffic.

GSC Wizard's GA4 discovery returned `connected:false`: the linked Google account lacks the Analytics scope. Therefore concurrent users, game-start counts and GA4 event delivery are not independently verified here.

A narrow `lumina_guide_play` event observes a real, unmodified primary-button click on a guide's Play CTA through the existing `gtag` function only. Its fields are `game_name`, `guide_language`, `source_path`, `target_path`, and `engagement_type:play_intent`; no account identity, free text, query strings, or additional identifiers. Existing consent and analytics configuration stay authoritative. An absent or failed collector never blocks navigation. **This event is an intent to go to Home, not proof that a game started or an ad was shown.** Its JavaScript emission is tested; actual GA4 receipt needs authorized Analytics access and a live event verification.

Evaluate acquisition using comparable post-release 28-day windows, excluding the incomplete current days: organic clicks/impressions to `/lumina-match/`, locale/country/device splits, query clusters, guide-to-Play intent rate, and genuine engaged/returning users when Analytics access is available. The requested 2× traffic is a target, not a promised or measured outcome. Do not generate artificial traffic or click advertisements in testing.

## Search and advertising safeguards

Google explicitly ignores meta-keywords and discourages keyword stuffing: https://developers.google.com/search/docs/fundamentals/seo-starter-guide

Google's spam rules prohibit doorway abuse and scaled low-value content: https://developers.google.com/search/docs/essentials/spam-policies

Game ads must not cause accidental clicks or masquerade as gameplay links: https://support.google.com/adsense/answer/2768340?hl=en

The existing five Home ad units, publisher/slot identities, Auto ads policy, consent defaults, Kids isolation, no-ads guide/runtime policy, and protected AdSense tests remain unchanged. Passing code safeguards is not AdSense approval, a copyright clearance, an account-policy review, or a promise that ads are serving. No alternative advertising SDK is installed by this release.

Google receives the existing sitemap through its supported Search Console flow after deployment. The existing Pages workflow alone triggers IndexNow after successful publication; do not add a second scheduler or independently duplicate its delivery. Bing's connected properties include verified `https://matchapp.tv/`. Yandex verification must be checked separately; neither sitemap acceptance nor IndexNow acceptance proves indexing, rankings, or actual visits.

## Evidence to complete before release sign-off

Record final commit and PR, full test/audit result, rendered 14-locale viewport results, physical-device result or explicit access limitation, exact production deployment SHA, live localized metadata/image proof, existing release-smoke result, Google sitemap receipt, and the Pages-owned IndexNow outcome. Preserve any unrelated open releases and drafts.
