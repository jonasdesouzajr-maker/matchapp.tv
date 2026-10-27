# Lumina Match — browser-only overlay in MatchApp Ai

Browser entry point: the compact **Play Lumina Match** pill is injected directly after the existing Home hero. It is not a route, new site, app download, independent page or replacement for any existing navigation control.

- Entry point: launcher.js (14 MatchApp languages; dynamically imports the game only after click; Android WebView and Kids excluded).
- Game: game.mjs and lumina.css (HTML5 adaptive solo memory-match gameplay; 350 unlockable levels, locally saved best-time records, countdown/pause, keyboard/touch, reduced-motion support, audio).
- Assets: assets/card_* extracted from installed Lumina Match 2.3 APK and observed during genuine tablet gameplay QA. This is an adaptation, not an exact Kotlin/Compose source conversion.
- Browser saves use same-origin localStorage. They do not sync with Android, Google Play Games, user accounts or other browsers.
- Browser does not include Android's multiplayer lobbies, Play Games authentication or native rewarded ads. Do not advertise those as web features until implemented and verified.
- No change to either Android package or release/tester track.

## Ads and monetization gate

This module adds NO ad requests, ad slots, ad consent changes or simulated game ads. MatchApp's production AdSense inventory is owner-locked under ADSENSE_LOCK.md, and Google H5 Games Ads must be separately approved before game-interstitial or rewarded placements are implemented.

The browser game emits a lumina:level-completed CustomEvent after completed levels. This is a potential natural pause point for a future authorized, policy-compliant H5 Games Ads integration; it does NOT show an ad or request one. Never initialize game ads in Kids Mode, interrupt an active turn, overlay conventional display ads, or substitute AdMob's Android SDK.

Official Google H5 Games Ads application: https://adsense.google.com/start/h5-game-ads-apply/

## QA

- node --test tests/lumina-browser.test.cjs tests/adsense-lock.test.cjs tests/design-lock-20261023.test.cjs
- Headless Playwright checks phone/tablet/desktop memory gameplay, level completion, local saves, close and focus return, and native-shell exclusion.
- Cross-browser manual QA and full Android feature parity remain separate acceptance criteria.

Do not add this module to Android, Kids or ad-free support/auth pages. Preserve protected brand, ads, and matching logic.
