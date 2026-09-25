# Kids: conservative source-rated family discovery

Status: owner-authorized expandable source discovery, **separate from the individually curated Kids title allowlist**.

## Why there are two shelves

The original `LIBRARY` in `kids/kids.js` is an editorially selected title/year/type/age-band allowlist. It alone controls Kids matching, AI recommendations, saved favorites, existing title pages and guaranteed title-specific local poster fallback. The matching and child-protection contracts must never be weakened to make the catalogue counter appear larger.

`kids/source-rated-discovery.js` offers a wider, parent-guided discovery shelf. It can search the broad TMDB movie/TV indexes on demand across source pages without loading thousands of DOM elements into a phone/TV/Android WebView. Source-rated titles are **not automatically promoted into the editorial allowlist** and are labeled accordingly. This is not a claim of thousands of individually reviewed titles; an official rating is not a full independent editorial review and can vary by territory and episode. A guardian should assess an unfamiliar title and each episode.

## Mandatory admission checks for every extra card

1. Use the existing protected Supabase TMDB proxy only. Reject AI-generated title or content-rating claims. Resolve the numeric TMDB identity, original title, media type and release year. Do not accept year or title mismatches.
2. Re-query **exact** detail metadata for that TMDB ID and kind. Never derive a poster from an unrelated fuzzy title match. A current official image on the trusted TMDB image host is mandatory. Missing or broken posters mean the card is omitted; no generic title-only image or stretched art.
3. Require `adult === false`, an original `Family`, `Animation` or `Kids` source genre, a substantive overview, and no disqualifying mature genres or explicit descriptions. Genre alone or adult flag alone **never establishes eligibility**.
4. Require a source content classification from the exact TMDB detail record. Current conservative age mapping: `G` / `TV-Y` for all approved ages (3–12); `TV-Y7` / `TV-G` for 6–12; and `PG` for 9–12 **only**, with guardian review. Unrated, unknown, contradictory, locally ambiguous, and mature ratings all fail closed. A selected `all` band only displays genuine all-age items.
5. Use only the verified numeric identity's TMDB title page. A regional viewing link is displayed only when explicitly present for the selected region and on a trusted JustWatch/TMDB HTTPS host. Never invent streaming availability, verified storefronts, invented reviews or perfect global child-safety guarantees.
6. Clearly label the distinction between **source-rated** titles and **editorially reviewed** Kids titles in text and UI. Never state that all episodes were screened or that TMDB itself provides child-safety certification.

## Stability and cross-device guarantees

- Kids original browse renders only 24 manual curated cards per batch. The supplementary source-rated shelf reviews at most 18 source candidates per click with at most three parallel exact detail lookups, and retains a rolling maximum of 48 DOM cards. Actual backend TMDB discovery is paged across at most 500 source pages without long lists, unlimited eager requests or infinite polling. A failed provider lookup preserves the original Kids content.
- Changing age clears the source-rated shelf and invalidates pending responses, so previously eligible titles never leak into a newly selected younger age group.
- Never automatically show an AI-suggested title in the new shelf without exact source verification. The manual editorial Kids AI remains bound to the original reviewed allowlist.
- Public browser Kids Mode (desktop/mobile/tablet/TV) and the **dedicated** `:kidsapp` native Android WebView load the same production `/kids/` source. The adult `:app` native shell continues blocking Kids routes. Do not duplicate frontend JS/CSS in Android source or change native version codes just to receive the live web change.
- A production web deployment alone does not validate every native device. Before producing a signed AAB, run the Android project's normal native builds and test Kids routing, remote TMDB timeouts, covers, age changes, source links and the existing guarded parent exit in each applicable emulator/device.

## Promotion to the editorial allowlist

A source-rated title may become a Kids AI/matching/saved title only after individual editorial approval of its exact name/year/type, verified age bands and potential episode notes, official artwork and confirmed viewing guides. Promotion updates `kids/kids.js`, title-specific artwork and watch-link data, generated Kids pages and required regression tests together. A source-rating, commercial partnership, user click count or model response does not count as this human approval.

Required regression suite: `node --test tests/kids-source-rated.test.cjs`, full `npm test`, `npm run audit:site`, the existing Kids safety tests and the immutable AdSense/Editorial workflow contracts.