# AdSense readiness follow-up — 15 October 2026

Owner request: “AdSense is not fully cleared. Do it.” This continues the completed Search Console repair in PR #257; intentional 404s are unchanged.

## Account and production evidence

- Signed-in AdSense Sites: matchapp.tv remains **Needs attention / Low value content**, last review October 10, 2026 13:13 GMT-3. ads.txt: **Authorized**.
- European regulations message assigned to matchapp.tv is Published, English plus 31 languages. The first-layer “Do not consent” choice was Off during inspection. Account settings apply to other sites too, so no account-wide analytics/partner settings are changed in this patch.
- A fresh production browser loaded the AdSense engine successfully. Google's documented `?fc=alwaysshow&fctype=gdpr` preview did not load `googlefc` or `__tcfapi`, even after 25 seconds. This was observed before the code repair and while the site was unapproved. Do not label the missing preview a successful live CMP test.
- Google documents that its automatic revocation link is added to approved sites containing AdSense code. Approval and real CMP delivery remain external account outcomes.

## Scoped repair

- Retire the competing custom Accept/Essential-only banner. Its local `all` flag is not TCF consent and no longer grants any Google consent purpose.
- Replay existing `essential` refusals as denied when the legal runtime loads. Only a successful real CMP `useractioncomplete` event clears that legacy preference. This does not claim the late-loading legal script establishes prior consent on every non-advertising route.
- Add a 44px privacy-settings link with authored text in all 14 supported app languages. Use Google's `CONSENT_API_READY` queue and `showRevocationMessage`. Ad-free pages route to Home without acquiring an ad tag. A missing CMP reports that no consent change was saved; no fake consent record or success is generated.
- Preserve existing region-denied defaults, five Home slots, publisher and slot IDs, Auto ads, initializer and native/Kids ad-free behavior. No protected AdSense test baseline changes.
- Update the cookie explanation to describe the actual controls.
- Expand the existing A Gata Comeu and American Horror Story: 13 pages with original, title-specific selection and viewing-offer guidance in 14 languages. These are explicitly selection notes, not fabricated reviews or viewing experience. FX and Globo remain the factual sources. Update the two existing sitemap lastmod values and their generator source; no route additions or removals.

## Verification checkpoint

- Full local suite: 1,176 passed, zero failures (includes six privacy behavior regressions).
- Browser verification: 26 checks passed, including two guides and privacy controls at 320/390/820/1366px and all 14 authored languages. Global gold-frame audit: 50 checks passed. Screenshots inspected.
- Site audit first found a static fragment pointing to a dynamically created control. The static cookie-page link now uses the supported privacy query parameter without that fragment; audit rerun pending.
- Production deploy, exact-SHA smoke and AdSense resubmission: outstanding at this checkpoint.

## Official references checked

- https://support.google.com/adsense/answer/10502938?hl=en — low-value/replicated content and privacy disclosures.
- https://support.google.com/adsense/answer/13554116?hl=en — certified CMP requirement.
- https://support.google.com/adsense/answer/10959060?hl=en — revocation link and approved-site requirement.
- https://developers.google.com/funding-choices/fc-api-docs — callback queue and preview API.
- https://support.google.com/adsense/answer/16053245?hl=en — analytics consent mode is an account-wide setting.
- https://www.fxnetworks.com/shows/american-horror-story and its season 13 cast page.
- https://memoriaglobo.globo.com/entretenimento/novelas/a-gata-comeu/noticia/trama-principal.ghtml
- https://globoplay.globo.com/a-gata-comeu/t/ckHsdc6HmP/detalhes/

A passing repository audit is not an AdSense approval. After approval, verify real CMP accept, reject, return visit and revocation in the relevant jurisdictions, including consent strings, storage and requests. Do not claim those production outcomes from the stub-based regression tests.
