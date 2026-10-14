# Adult UI release candidate — 2026-10-14

Branch: `grok/complete-premium-ui-20261014`. Continue from `855e43263275c3bba57c7c9606c113db2f6545a3`; first UI commit `11d206b42f628e673cfa0588571249de52eaf11d` was already pushed. This handoff accompanies the final follow-up commit. Publication has NOT been performed.

## Result

- Adult Home, Explore, shared headers, matching presentation and existing chat use the champagne/twilight family. Text-rendered MatchApp Ai retains separate spacing and glint room inside the header.
- Home's two Explore entries use the real Explore route and all 14 supported translations. Legacy premiere/weekly/Taylor anchors target the equivalent Explore content; news bookmarks retain their article identity and focus that article on the news hub.
- Home uses the existing persistent, draggable Jonas bubble. Opening clears closed-bubble drag coordinates so chat and Close stay in the viewport. Closing restores the bubble; browser Back minimizes the conversation. Android ambient chat also uses one history entry and retains the existing metered iframe and selected-title context.
- Fixed malformed existing CSS input selectors; restored stylesheet import order. Bumped the changed presentation assets' cache references.

## Files

Presentation: `adult-ui-finish-20261014.{css,js}`, `premium-approved-redesign-20261013.css`, `page-shell.css`, `index.html`, `explore.html`, `discover.html`, `ebooks/index.html`, `news/index.html`, `platforms/spotify/index.html`.

Existing chat integration: `jonas/adult-page-bubble-20261013.js`, `jonas/floating-home-20261010-v3.js`, `jonas/android-ambient-assistant-20261011.js`. The latter's debug preview copy remains identical. No Kotlin/native release resource changes.

Checks: `tests/adult-ui-finish-20261014.test.cjs`, `tools/qa-adult-ui-finish-20261014.cjs`, evidence in this folder.

## Completed verification

- Existing full suite: **1,141/1,141 pass**, zero failures/skips (`full-tests.log`). This includes matching, reading, Ask AI/source-art and protected contracts; it is regression evidence, not proof that external services work.
- After cache-reference updates: syntax checks, `npm run build`, `git diff --check`, focused UI + AdSense tests **14/14 pass** (`final-checks.log`). No behavior changed after the full-suite checkpoint.
- Site/search audit: no errors, 244 sitemap URLs, no sitemap omissions or noindex entries. Existing warnings remain: missing analytics containers on some pages and application rich-result eligibility fields. Reviews/ratings were not fabricated. Google, Bing and Yandex technical discovery contracts remain intact; no external indexing submission or confirmation is claimed.
- Local Chromium: Home, Explore, Ask, Together, Pricing and Books at 320×900, 390×900, 800×1180, 820×1180, 1366×900 and 1180×820. No JS errors/horizontal overflow; one web bubble per surface; Home discovery clutter hidden; Home/Explore open-close-reopen-Back passed. Explore/Discover clean, `.html` and slash aliases plus Home→Explore→Back passed on the local test server.
- Local browser harness deliberately blocks external requests. Missing remote poster images in these screenshots are not evidence of a production artwork failure or success. Production edge redirect behavior was not tested by this local alias server.
- Representative rendered screenshots reviewed: narrow Home, phone Explore, physical tablet Home landscape and native open chat. Wordmark/glint remain visually separated.
- Physical device re-confirmed: Samsung **SM-X236B**, ADB **RXGL200HCRW**. Chrome 155 candidate portrait viewport 800×1139; Home/Explore/Ask/Books reported zero overflow and one web root. The Books screenshot timed out, so no physical Books screenshot pass is claimed.
- Tablet landscape Chrome: Home/Explore/Ask viewport 1280×659, zero overflow, one bubble. Browser Back minimized Home chat and retained `/`. Physical screenshot: `tablet/landscape-home.png`.
- Debug Android WebView: exactly one visible native ambient Jonas button, web bubble hidden; existing `/discover.html?ambient=1` chat frame opens. Physical screenshot: `tablet/native-ambient-open.png`. CompileDebugKotlin passed (8m39s); assembleDebug passed (4m58s). Existing Android deprecation warnings remain. No warning-free native-build claim.

## Functional blockers / incomplete coverage — separate from presentation

1. **Speech:** native greeting test recorded a click but no speech-start event within its seven-second observation. The real documentary question likewise recorded no first-audio event. A valid question-to-first-audio duration could not be measured; never report zero milliseconds as a pass.
2. **Ask AI region/provider:** real request for a documentary series on Netflix in Brazil returned a transparent inability-to-confirm message and zero title cards. No invented replacement was introduced. Backend/provider repair is still required before release sign-off.
3. **Native match metadata:** real result `Business Proposal` completed in ~4.29s with its loaded original TMDB poster and Netflix viewing links. `currentMatchIdentity` lacked TMDB ID, kind and artwork; Portuguese synopsis translation was unavailable. Exact context enrichment/translation remains a functional repair.
4. **Authentication:** Google controls were observed on Home/Ask; no completed Google OAuth round trip or device-account selection is proven. SMS OTP delivery was not tested. Neither may be marked green.
5. iPhone/iPad Safari, macOS Safari, Firefox and Edge were not exercised. Chromium emulated sizes do not substitute for these engines. Native keyboard and native Back need final physical confirmation; browser-history behavior passed.
6. No production deployment SHA or post-deployment release smoke exists for this candidate. No Google Play publication/upload occurred. No emulator was used.

## Protected systems

AdSense configuration, placements and guard files unchanged; daily check-in preserved. Kids runtime, safety, dedicated app and branding unchanged. Matching algorithms, AI/provider routing, authentication, credit authorization and billing mechanisms unchanged. No duplicate or unmetered chat engine added. Editorial automation and content refresh output are excluded from this change.

## Publication handoff

1. Review this candidate against `qa/mobile-premium-finish-20261013` (PR #232 remains its integration dependency). Resolve the separately listed functional blockers and complete Google/SMS/physical speech checks with evidence.
2. Run the required CI and review the intended diff; preserve the protected contracts. Do not describe this UI candidate as a fully verified functional release.
3. This change does **not** require a new AAB: production WebView fetches the web ambient controller dynamically; the only Android asset edit is debug-preview parity. Future native speech/auth fixes may require a signed AAB, version increment and physical retest.
4. Only after explicit final publication assignment: merge the approved integration chain, deploy the website, verify the exact live `deployment-sha.txt`, then run release smoke once for that SHA. Google Play upload/publication is a separate explicit step if native changes require it.
