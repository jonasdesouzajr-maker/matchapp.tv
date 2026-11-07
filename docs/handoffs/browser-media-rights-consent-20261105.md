# Browser media replacement and privacy QA — 2026-11-05

## Authorized scope
Browser presentation only. Preserve Android release, core matching, backend API routing, billing, Kids isolation, immutable AdSense configuration and review hold.

## Implemented media replacement
- Browser news uses the five existing, original MatchApp topic illustrations with authored Illustration captions. All 42 frozen source records remain intact.
- The 24 initial news-hub images are local before HTML parsing. Dynamic browser cards use the same rule. Passive source-photo provenance is reserved for the unchanged native presentation.
- Replaced 2,745 external social-preview image references across archived news HTML with MatchApp-owned brand preview artwork. No news publication date, article body or source link was re-dated or refreshed.
- Updated the owning news generator to emit owned previews/illustrations in future. Did NOT run its network refresh or resume editorial automation.
- Decorative browser poster walls use eight existing original MatchApp cover illustrations, preserving geometry, incremental loading, Kids exclusion and independent sharing protection. Native source-art wall behavior is unchanged.
- Added focused browser/native/static-source regression tests; updated expected browser presentation tests to reflect the owner's explicit change.

## Measured candidate browser results
At 1440, 820, 390 and 320 pixels: 24 original labelled news figures, no horizontal overflow, no fatal JavaScript errors and zero publisher/TMDB image requests on the tested News page. The wall remains present. Evidence is saved on the authorized laptop in the dedicated web-rights-consent-evidence-20261105 directory.

## Privacy results — blocker, not a pass
An isolated Edge browser on the owner's connection independently reported BR through the site's Cloudflare trace. Ordinary Home, and Google's documented GDPR, US national/CCPA and Florida preview query modes all returned HTTP 200 but no visible Google consent dialog, no TCF/GPP API and no available Google revocation method. The AdSense script was present. No pagead/gampad ad-serving request was observed. Do not confuse the presence of the review-hold element with a current adsbygoogle.pauseAdRequests property: Google's runtime replaced the object and that property was not returned in the later readback.

Fresh Firecrawl renders requested DE (Europe/Berlin), GB (Europe/London), CH (Europe/Zurich) and US (America/New_York). No consent controls were reported; the privacy deep-link renders reported unavailable controls. These are region-requested render observations, NOT independent proof of the same session's egress, a state-specific US test or completed consent transactions. Firecrawl interactive initialization failed twice with HTTP 409, including a fresh scrape ID. It was not retried indefinitely.

Acceptance, refusal, reload persistence, withdrawal and applicable U.S. opt-out transaction checks remain BLOCKED because the actual CMP did not load. Mock/unit callback checks cannot certify these flows. No fabricated consent record or TC/GPP string was injected. No site approval or blanket legal clearance is claimed. The Google account previously showed published messages; published settings alone do not prove served messages. The cause of the delivery failure is not established by these observations.

## Material still outside this cleanup
TMDB-derived metadata and selected-title/result artwork are still used by the existing matching and enrichment systems. Removing decorative and news images does not grant commercial API permission or settle all title-art rights. No backend provider, scoring or entitlement mechanism was silently changed to make a licensing claim. Keep monetization held until the remaining source permissions (or a separately verified replacement implementation), actual regional consent flows and Google site approval are resolved.

## Primary references
- https://developers.google.com/funding-choices/fc-api-docs (official preview parameters, callback queue and APIs)
- https://support.google.com/adsense/answer/10924669?hl=en (Privacy & messaging)
- https://developer.themoviedb.org/docs/faq (separate commercial API/data/image conditions)

## Validation notes
Focused media/native/immutable-ad tests: 21 passed. Four candidate browser layouts passed after correcting an early screenshot capture to wait for the next existing idle-render batch; no production timing was changed. The Windows full-suite run initially exposed CRLF-vs-LF generator parity, confirmed equal after line-ending normalization. The repository text working copies were normalized to LF without semantic changes. Final CI and live release evidence must be recorded before claiming publication.


## Account readback during this run
The connected physical Samsung tablet confirms the European regulations message for matchapp.tv remains Published, English plus 31 languages, last modified October 16, 2026. This is configuration evidence only; fresh runtime tests still found no served CMP. No message was unpublished or privacy preference changed. Final focused media/native/privacy tests: 21 passed, zero failed; the privacy callback tests are unit tests and are not represented as regional production-flow success.
