# MatchApp Ai — Adult premium design review (2026-10-14)

## Change base and isolation

- Design branch: `design/adult-premium-finish-20261014`, forked from PR #240 integration commit `bd3660f3f5c6355fdbadc4db42b051c6404eba6b`.
- Review target: `integration/jonas-premium-20261014`; do **not** merge the release PR, deploy functions, publish Android, or purchase anything.
- Frontend-only: Home finishing styles; gold/violet Explore cards and Music alignment; typography, focus, flexible copy and layout on adult page shells; fourteen-language Explore invitation/Music CTA; direct links from retired Home anchors to existing dedicated destinations.
- Jonas uses the existing single Home presenter and the existing Android/secondary-page ambient chat. No new voice/chat/microphone engine. The closed launcher remains draggable and saved; the open conversation covers the visible viewport, places the same Jonas avatar at upper-left, and allows exit back to the parked location. Virtual keyboard resize is bounded by `visualViewport`.
- Protected AdSense inventory, original posters, approved product artwork, indexed paths, native release build, Kids and model/provider configuration are intentionally unchanged.

## Before and after captures

Captured from identical **local** integration/design worktrees at 390px and 1366px.

| Destination | 390px before | 390px after | 1366px before | 1366px after |
| --- | --- | --- | --- | --- |
| Home | [Before](screenshots/before-home-390.png) | [After](screenshots/after-home-390.png) | [Before](screenshots/before-home-1366.png) | [After](screenshots/after-home-1366.png) |
| Explore | [Before](screenshots/before-explore-390.png) | [After](screenshots/after-explore-390.png) | [Before](screenshots/before-explore-1366.png) | [After](screenshots/after-explore-1366.png) |
| Music | [Before](screenshots/before-music-390.png) | [After](screenshots/after-music-390.png) | [Before](screenshots/before-music-1366.png) | [After](screenshots/after-music-1366.png) |

## Verification (evidence, not a release claim)

- Static site build completed successfully; targeted original AdSense and language/speech regressions passed **16/16**.
- Focused frontend, Android-preview and release-gate regressions: **15/15 passed**, including anchor route/query preservation, fourteen authored Home Explore and Music CTA translations, one companion/voice source, and protected advertising constraints.
- Local Chromium before/after check recorded **37 layout/route cases** on Home, Explore, Music, Discover, Profile and Pricing at 320, 390, 820, 1366 and 1920px; see [browser-report.json](browser-report.json). It includes English, pt-BR, Spanish, French, German, Italian, Turkish, Russian, Arabic, Hindi, Indonesian, Japanese, Korean and Chinese Explore switching and Back-navigation. A simulated short-height viewport is *not* proof of physical IME compatibility.
- Isolated Chromium tests passed **10/10 viewport combinations** (Home: 320, 390, 820, 1366 and 1920px; simulated Android WebView: 320, 390, 820px landscape, 1366 and 1920px) against **production Jonas JS and CSS** with a controlled local HTML fixture: fullscreen sizing, top-left portrait, visible conversation frame/microphone region, modal semantics, close and original parked position restoration. The fourteen-language ready/microphone status also has a focused regression. See [Jonas interaction report](jonas-chat-qa.json) and [Home screenshot](screenshots/after-home-chat-390.png) / [Android WebView simulation](screenshots/after-android-webview-chat-390.png). The fixture does not simulate real speech responses or Android IME.

## Still needed before a release

- At the previously checked draft SHA `1291ead1`, GitHub Actions **Validate website**, **Matching and AI Audit**, and **AdSense Immutable Lock** passed. Reconfirm those workflows on the final new commit. Android debug-preview parity passes its dedicated regression; the debug APK is now installed on the tablet, but approved real-device microphone/voice tests remain outstanding.
- Physically verify Android WebView keyboard, microphone, greeting and top-left/restore chat positioning on the connected test device. Browser simulations cannot prove OS speech behavior.
- Full-site legacy/editorial localization audit remains necessary: translated dictionaries do not establish that every dynamic sentence and page has authored localization.
- The present PR is a reviewable design change, **not** approval to merge PR #240 or publish an AAB to Play.

## Extended QA: design, native tablet and live results (14 October)

- Five responsive Home sizes (320, 390, 820, 1366, 1920px) confirmed the moved reading, cooking, news, events, awareness and music panels are excluded from Home without deletion. The highlighted gold Explore More entry retains its destination. See [responsive audit](home-focus-audit.json) and [820px](screenshots/after-home-focus-cta-820.png) / [1366px](screenshots/after-home-focus-cta-1366.png) visual evidence.
- A screenshot detected an actual desktop header overlap; the utility and shortcut rows were separated. [Header collision QA](../../../tools/qa-header-geometry.cjs) covers 320, 390, 820, 1024, 1100, 1200, 1366 and 1920px.
- Trending cards now have a restrained gold/violet background while official artwork decodes, without cropping/replacing posters or adding render-blocking dependencies.
- On the connected Samsung tablet, the debug APK was installed separately from production. The native app loads the existing LIVE website, not this unpublished PR. The live Home had 74 distinct linked internal paths answering HTTP successfully; this is not equivalent to verified individual click behavior.
- Repeated real-device swipes entered the live old Home books area and ceased to advance page scroll near Y=1321. This PR keeps books behind Explore. No completed visible poster was conclusively found broken during the sampled swipes; still-loading imagery is not counted as verified.
- A live guest Comfort + Movie + Netflix match returned The Little Prince with decoded official TMDB poster, streaming actions and metadata in approximately ten seconds. It also exposed a synopsis-watch-guide placeholder defect. The isolated frontend fallback exposes the verified original synopsis with an explicit untranslated label only when the approved localized synopsis has not arrived; any genuine translation wins. The fourteen-language test is in tests/result-synopsis-presentation-20261014.test.cjs.
- A second Funny + Series + Prime guest attempt could not yield a result after the guest allowance fell to zero. Do not count this as a passing result; do not bypass quotas.
- Pending release gates: real speech and microphone/IME, full localized-content audit, Android launcher alignment with the approved October 13 artwork, exact-head CI after final changes and real-device evaluation of this PR through a controlled preview. No backend deployment, release merge or Play publication took place.

## Permanent gold perimeter and Jonas edge-bounce QA — October 14

The product's shared `brand.css` now paints an uninterrupted, pointer-transparent gold frame above normal page layers. It measures 3px on phones and 4px on tablets/desktops; inner adult outlines are 1px and Kids card outlines 2px. Native modal backgrounds are inset to protect the frame, and both existing fullscreen Jonas presenters receive an inside-the-frame viewport. The invariant and release gate are recorded in `AGENTS.md` and `tests/perimeter-invariant-20261014.test.cjs`.

The **existing** Home and secondary-page/Android Jonas launchers are clamped inside the *visible* frame (including the full outer bubble). A drag or velocity fling against left, right, top or bottom eases/springs inward on release, stores only the valid final position, and respects reduced motion. No second launcher or speech/microphone implementation was added. [The actual JS/CSS ten-viewport drag/modal test](jonas-chat-qa.json) passed, including four edge collisions, a corner drag, fullscreen chat open/close and restored position. [The 50-route/viewport gold-frame audit](global-frame-audit.json) passed.

The RTL/narrow-screen companion clearance was fixed on Explore and Music; [16 combinations](ambient-overlap-audit.json) in Arabic RTL and Portuguese across 320/390/800/1366px passed. [Frame screenshots](screenshots/after-global-gold-frame-explore-390.png) are available for review.

**Release integration warning:** another branch, `release/immersive-feedback-20261014`, already contains the earlier design branch and **64 further commits**. Never ship the older design branch directly over that work. The current main branch also has three commits not on the previous integration branch; reconcile those safely and run exact-head regressions before production. Google Play publishing additionally requires a verified signed release bundle and native microphone, permissions and icon testing; a debug APK is not evidence of Play acceptance.

## Exact PR #245 CI smoke correction

The first exact-head Matching & AI Audit had **5 failed frontend assertions** even though 1150/1150 Node tests, simulated mobile-touch matching/Ask AI (36/36), real movie, verified audiobook/e-book/magazine providers, and two real Ask AI questions passed. The new release intentionally changed the old direct Explore navigation anchor into the **single inline Explore Worlds button**. The smoke harness still searched for a removed anchor, causing four false negatives and a linked dismiss-Home false negative.

The revised `tools/live-production-smoke.cjs` preserves those checks and *strengthens* them: it now clicks the actual Worlds button, proves the region expands, verifies nine topic links, follows the legitimate Explore hub destination and confirms at least eight live hub cards, then returns Home. The trash-dismiss test asserts the same reachable Explore destination and protected ad count. No matching, quota, AI, speech, auth, advertisement or backend mechanisms are modified. The local Chromium [interactive evidence](qa-explore-worlds-integration.json) passed all four viewports, including selected pt-BR language persistence, Back and Escape. Await exact-head GitHub rerun before publishing.
