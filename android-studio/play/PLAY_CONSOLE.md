# Upload MatchApp Ai to Google Play Console

This folder documents the **main Android app only**.

- App name: **MatchApp Ai**
- Application ID: `com.jonas.papercup`
- Module: `:app`
- Kids Mode is **not part of this Android app**. A separate Android app, **MatchApp Ai KIDS**, is built from `:kidsapp`.

## Build the signed bundle

In Android Studio:

1. Open the repository's `android-studio` folder.
2. Select the `app` module.
3. Build → Generate Signed App Bundle / APK.
4. Choose Android App Bundle.
5. Use your protected release keystore.
6. Choose the **release** variant.

The resulting main-app bundle is generated under the `app/` build output.

## Main store listing

Suggested positioning: MatchApp Ai is an ad-free Android entertainment concierge for movies, series, K-dramas, anime, novelas, podcasts, live entertainment discovery and where-to-watch guidance.

Use:

- `play/icon-512.png` for the current main icon
- `play/feature-graphic.png` for the current feature graphic
- appropriate captures from `play/screenshots/`

**Do not use `play/screenshots/04-kids.png` for the MatchApp Ai listing.** Kids now belongs to the separate MatchApp Ai KIDS package.

Privacy policy: `https://matchapp.tv/privacy.html`

## Ads

The provided live banner ad unit is staged in BuildConfig, but the native Google Mobile Ads SDK is NOT enabled until the owner provides the matching Android AdMob App ID (the identifier containing `~`) and release consent handling is tested. The provided rewarded unit is a Google TEST ID; only DEBUG BuildConfig contains it, whereas RELEASE rewarded ID is blank. The WebView hides site AdSense independently. Declare the ads behavior of the actual release build, not of planned future integration.

## Data safety and content declarations

Complete Play Console declarations from the behavior of the release you are uploading. MatchApp uses HTTPS and may use account/authentication, profile/history and analytics behavior provided by the MatchApp service. Do not copy old declarations blindly if the app behavior or Play forms have changed.

## App Links

After Play App Signing provides the final SHA-256 signing certificate, Digital Asset Links can be updated for `com.jonas.papercup`. That website-side change is intentionally not included in this Android-only branch.

For the separate Kids app, follow `../play-kids/PLAY_CONSOLE.md`.

## First Play listing — 2026-09-25

Confirm Play package `com.jonas.papercup`; target SDK 36; version 1.1.31 (code 33). The owner-provided fingerprints are documented, not hardcoded signing credentials: see `RELEASE_PREFLIGHT.md`. Do not use any Kids listing screenshot or the `kidsapp` module. Confirm a release-signed AAB on a physical device before submitting to Play.
