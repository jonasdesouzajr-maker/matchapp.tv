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

- At revision `4b5c32bb`, GitHub Actions **Validate website**, **Matching and AI Audit**, and **AdSense Immutable Lock** all passed. After any new PR commit, reconfirm those workflows on its exact SHA. Android debug-preview parity passes its dedicated regression; a physical Android install and OS microphone test remain separate.
- Physically verify Android WebView keyboard, microphone, greeting and top-left/restore chat positioning on the connected test device. Browser simulations cannot prove OS speech behavior.
- Full-site legacy/editorial localization audit remains necessary: translated dictionaries do not establish that every dynamic sentence and page has authored localization.
- The present PR is a reviewable design change, **not** approval to merge PR #240 or publish an AAB to Play.
