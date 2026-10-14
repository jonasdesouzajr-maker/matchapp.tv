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
