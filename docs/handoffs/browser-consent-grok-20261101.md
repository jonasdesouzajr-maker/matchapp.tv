# Browser consent and Grok integration — 2026-11-01

The publisher review hold remains in force. This work does not establish Google approval or permission to monetize third-party material. Jonas authorized publishing browser fixes and compatible Grok work; the Android app and its release are outside this change.

## Substantiated browser repairs

- The public GTM-M7J3NNBN resource inspected on November 1 contained one Google Analytics tag (`G-2ECND229RR`) on `gtm.js`, with no configured consent-initialization/CMP tag. The Google runtime's generic consent support is not a configured CMP.
- Of 1,586 browser HTML documents with Google tags, 1,567 lacked an early inline consent default. The canonical shared finalizer now inserts denied EEA/UK/Swiss defaults before the first tag when no existing default has been queued. Existing Home/Events and Pricing defaults remain authoritative. An existing explicit `essential` refusal is restored before tags; a legacy `all` flag never grants consent. No TCF string, consent grant, replacement banner or account setting is created.
- The unchanged OAuth default block moves ahead of GTM. The verification page keeps its token and receives the same early default. Source-range edits preserve the original Google tag and ad inventory.
- Both shared finalizer entry points protect future generated pages. This release updates committed browser HTML only; no news, event, catalog, awareness or artwork generator was run. No editorial dates or source records are refreshed.
- Grok's `eebe428f3` and `c93c60d1f` add the visual assets. The later `164aea5f0` adds their loader, but reuses the stylesheet's sentinel ID, causing the loaded script to exit. The integrated loader uses distinct IDs and excludes embedded, Kids, OAuth/private and native-UA contexts. One canonical stylesheet controls the reduced background opacity/vignette. It preserves poster geometry, blur and artwork; link treatment excludes media anchors, keeps the chosen font scale, and does not restore gold borders.
- The browser About page now credits TVmaze with its source and CC BY-SA 4.0 link, translated across the existing 14 locales. This corrects a missing attribution link, not the complete downstream ShareAlike/rights assessment.

## Consent limits that code alone cannot resolve

Fresh Firecrawl renders configured for Germany, UK and Switzerland returned HTTP 200 and the localized "privacy controls unavailable / no consent change saved" status after eight seconds. No Funding Choices/CMP script or iframe was visible. All retained the review-hold and news-snapshot markers. These are regional DOM observations, not actual acceptance, refusal, return-visit or revocation transactions, and not proof of the underlying account cause.

Authenticated access to **AdSense → Privacy & messaging → European regulations** is needed to verify published message status, site assignment and regional targeting, together with the actual site review state. Then use real EEA/UK/Swiss browser sessions to verify the CMP, TCF and Consent Mode states for first visit, refusal, acceptance, reload and revocation while preserving the ad hold. Do not infer account configuration from absent DOM or from generic Google script code. Auto ads, Auto optimize and experiments are separate controls; their live account states were not changed or verified here.

Google requires a certified TCF CMP for relevant personalized advertising in the EEA, UK and Switzerland. Early denied defaults fix ordering but are not that CMP. Google documents approved-site conditions for its automatically added revocation link. Neither fact establishes why this particular account is not delivering a message.

Sources: [Consent Mode setup](https://developers.google.com/tag-platform/security/guides/consent), [publisher CMP requirements](https://support.google.com/adsense/answer/13554116), [revocation link](https://support.google.com/adsense/answer/10959060), [ad-request pause](https://support.google.com/adsense/answer/7670312).

## Concrete rights evidence and open work

| Source / surface | Evidence | Remaining requirement |
|---|---|---|
| TMDB metadata, result posters, decorative poster wall and cached availability guides | `tmdb.js`, `poster-wall.js`, `data/availability.json`, `ARTWORK_SOURCES.md`; About contains the approved TMDB mark and disclaimer. The existing review-hold document already records unresolved commercial permission. | A commercial grant covering intended browser monetization, caching, territory and image uses has not been established. Attribution/API access does not supply that grant. Confirm underlying artwork exclusions as well. |
| TVmaze fallback title/cast metadata | `app.js` requests search, single-search and cast data; original public HTML had no TVmaze credit link. | The missing browser attribution is repaired. Assess redistribution/adaptation and ShareAlike obligations for actual derived data separately; do not represent the entire app or unrelated images as licensed by TVmaze. |
| Publisher news images and headlines | `news/data.json` has 42 frozen records: G1 11, G1 Mundo 8, BBC 7, Hollywood Reporter 6, BBC World 5, BBC Technology 2, The Conversation 2, BBC Science 1. `tools/refresh-news-rss.js` extracts feed images and may recover `og:image` from articles. | Source URLs and credits establish provenance, not republication permission. No source-by-source commercial image/feed grants were found in the reviewed repository. Obtain those terms/grants or review replacements before monetization; do not treat a disabled refresh as a license. Review entity-derived summary/SEO text against each source too. |
| Apple/iTunes artwork and streamed previews | Catalog code records exact Apple identities, store URLs and preview-CDN checks; `ARTWORK_SOURCES.md` lists Apple as a source. | Review each actual presentation against Apple's promotional-purpose, store-link/badge, preview credit and streaming-only conditions. API availability is not unrestricted artwork or independent entertainment permission. This pass does not certify all result presentations. |
| Original event and fallback art | `ARTWORK_SOURCES.md` records original prompts; Tokyo festival SVG/JPEG are locally authored and credited. | These records support provenance of those specific assets; they do not license third-party posters, logos, news photos or unrelated images. |

No absent contract is treated as proof of infringement. The missing grants and presentation checks remain blockers to a rights-clearance claim. Private correspondence was examined read-only and is not copied into this public repository.

Sources: [TMDB commercial API and attribution guidance](https://developer.themoviedb.org/docs/faq), [TVmaze API license](https://www.tvmaze.com/api#licensing), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), [Apple Search API promotional-use terms](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/index.html), [Google intellectual-property policy](https://support.google.com/publisherpolicies/answer/10502938), [replicated-content policy](https://support.google.com/publisherpolicies/answer/11190248).

## Validation and release

Final validation and published commit are recorded in the release report. Required checks include the unchanged AdSense/review-hold locks, consent ordering and refusal tests, all tagged-document audit, source-contract validation, browser layouts and existing once-per-SHA production smoke. No manual duplicate smoke/IndexNow dispatch, Android build, AdSense submission or account mutation is part of this release.
