# MatchApp TV — Android Studio project

Ad-free Android app for Google Play. Open this folder in **Android Studio** (File → Open) and wait for Gradle to sync.

There is **no AdMob / AdSense SDK**. The app blocks ad networks and tells MatchApp.tv to hide every ad slot.

## What you get

- Package name: `tv.matchapp.app`
- App name: MatchApp TV
- Min Android 7 (API 24), target API 35
- Full MatchApp: Ask AI, matches, Kids Mode, profile, where to watch
- Ads stripped (site + in-app blocker)
- Offline screen, pull-to-refresh, Android back, Google sign-in, photo picker
- Deep links for `https://matchapp.tv/...`

## Open in Android Studio

1. Install [Android Studio](https://developer.android.com/studio) (Koala / Ladybug or newer).
2. File → Open → select this `android-studio` folder (the one that contains `settings.gradle.kts`).
3. Let it download the Android SDK if asked (Platform 35 + Build-Tools).
4. Run on a phone or emulator with the green Play button.

## Ship to Google Play Console

Follow `play/PLAY_CONSOLE.md`. You will:

1. Build a **signed Android App Bundle** (.aab) — Play no longer accepts APKs for new apps.
2. Create the app listing, point privacy to https://matchapp.tv/privacy.html
3. Declare **no ads**
4. Complete a closed test with 12+ testers before production (current Play rule)

Store art is in `play/`:

- `icon-512.png` — high-res icon
- `feature-graphic.png` — 1024×500 banner
- `screenshots/` — phone captures (add more from a real device if you can)

## Signing

Never commit a keystore. Create one in Android Studio the first time you generate a signed bundle, and keep the password somewhere safe. After Play App Signing is on, copy the **SHA-256 certificate fingerprint** into `play/assetlinks.json` and publish that file at:

`https://matchapp.tv/.well-known/assetlinks.json`

until then, deep links still open the app from a Play install, they just will not auto-verify.

## Ads

The website still shows ads in a normal browser. This Android package does not:

- User-Agent includes `MatchAppTVAndroid/1.0`
- MatchApp skips AdSense for that UA
- The WebView blocks googlesyndication / doubleclick requests
- Leftover ad slots are hidden with CSS
