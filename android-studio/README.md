# MatchApp Ai — Android Studio (Quail-ready)

This folder is one self-contained Android Studio project with **two separate installable Android apps**. Both render the current production MatchApp experience through a hardened Android WebView shell, so Android stays aligned with MatchApp without copying or altering the website source.

## Modules

### MatchApp Ai — `:app`

- Application ID: `tv.matchapp.app`
- Installed name: **MatchApp Ai**
- Opens `https://matchapp.tv/`
- Keeps the existing Android application ID for upgrade continuity
- Kids Mode is intentionally hidden and `/kids/` routes are blocked inside the standard Android app
- The separate **MatchApp Ai KIDS** app owns the dedicated Kids experience and parental exit flow
- Ads are disabled in the Android shell
- Supports authenticated sessions, Android back, pull-to-refresh, fullscreen media, file selection and offline state
- WebView injects production `cinema-dim.css` on adult pages (same sheet as the website)

### MatchApp Ai KIDS — `:kidsapp`

- Application ID: `tv.matchapp.kids`
- Installed name: **MatchApp Ai KIDS**
- Opens `https://matchapp.tv/kids/`
- Uses a separate package so both apps can be installed on the same device
- MatchApp navigation is restricted to the Kids surface and its child pages
- The website's **Grown-ups** exit stays visible and is protected by the three-second parent gate plus Android biometric verification or the configured parent PIN
- Install/PWA controls remain hidden inside this Android shell
- Non-Kids MatchApp routes are blocked from loading inside the Kids WebView; after successful parent verification, the Grown-ups exit hands off outside the Kids shell
- Privacy/Terms and third-party viewing destinations open outside the Kids shell
- Ads are disabled in the Android shell
- Uses the existing MatchApp Kids visual identity for launcher/splash presentation
- Cinema dim is **not** applied in this module

## Current AAB release

Both Android modules remain WebView shells over live production:

- Standard app (`:app`) release version: **1.1.27**
- Standard app version code: **29**
- Standard app launch: `https://matchapp.tv/?utm_source=android_app&appBuild=29`
- Kids app (`:kidsapp`) release version: **1.1.25** / version code **27**
- Kids app launch: `https://matchapp.tv/kids/?utm_source=android_kids_app&appBuild=27`
- Both apps cold-load production on launch and manual refresh to avoid stale WebView content, then resume normal caching after the page renders.
- The standard app receives the new Taste DNA daily suggestion notifications, poster/synopsis cards and per-notification delete controls directly from the live shared web runtime.
- Expanded grown-up Global Events (US, UK, Canada, Brazil, Australia, Japan and existing verified events) are delivered through the same production WebView, with countdowns, premium covers, MatchApp Ai handoff and official-source guides. The Kids app remains excluded from this adult event surface.
- The dedicated Kids app remains inside the Kids-only surface and does not expose adult Taste DNA suggestions; its native build markers are advanced in the same release so both Android Studio modules stay synchronized.
- The standard app blocks Kids routes and hides the Kids entry only inside its native shell.
- The Kids app blocks non-Kids routes internally and exposes only the guarded parent handoff to grown-up mode.

Because these apps intentionally render the live web experience, the latest approved MatchApp UI/content/features do **not** need to be copied into Android source. Native Android files are changed only when routing, permissions, WebView behavior, package identity, or Android-specific presentation requires it.

## Android Studio Quail

The project intentionally keeps the already proven MatchApp Android toolchain:

- Android Gradle Plugin 8.13.2
- Gradle 8.13
- Kotlin 2.0.21
- JDK 17
- compileSdk 36
- targetSdk 36
- minSdk 24 (Android 7.0+)

Open the repository's **`android-studio` folder** in Android Studio Quail. Let Gradle sync, then choose either the `app` or `kidsapp` run configuration.

## Build

1. File → Open → choose `android-studio` (the folder containing `settings.gradle.kts`).
2. Wait for Gradle sync.
3. Select **app** for MatchApp Ai or **kidsapp** for MatchApp Ai KIDS.
4. Run on an emulator/device or use Build → Generate Signed App Bundle or APK for release.
5. Keep signing keystores and passwords outside GitHub.

## 25 September 2026 — Verified expanded Kids discovery and Ask AI safety

- The **public desktop, mobile, tablet and TV Kids Mode**, and the separate `:kidsapp` Android WebView, all receive the exact same source-rated family discovery module from `https://matchapp.tv/kids/`. The original 64-item editorial Kids allowlist and its matching/Ask AI boundary remain separate and unchanged.
- Wider movie/TV discovery is on demand, age-rating and exact TMDB identity verified before rendering, paginated and capped to 48 live source-rated cards to avoid slow phones or freezes. Source-rated entries cannot silently enter the editorial Kids matcher or its favorites. A parent is explicitly advised to check each title and episode.
- Main adult Ask AI remains in the normal website/`:app` WebView. The patched genre lookup avoids a ReferenceError, and only verified country-specific provider data may be displayed as current availability. Native Android permissions, URL routing and Kids separation are unchanged; no redundant HTML/JS copies or unnecessary Android version bump are needed for live web-content updates.
- Before generating an Android release, cold-start both modules, confirm Kids only in `:kidsapp`, exercise the new source rating result/age switching/no-poster fallback and test Ask AI on `:app`. The web deployment alone does not prove either native AAB build passed.

## Web → Android synchronization policy

The Android apps intentionally render the live MatchApp web surfaces rather than maintaining a second copy of the UI:

- **MatchApp Ai (`:app`)** loads the main `https://matchapp.tv/` experience, so approved main-site UI/features such as the AI Concierge and grown-up Match E-books Ai automatically appear in Android. E-book retailer/library links remain external browser handoffs through the existing URL policy.
- **MatchApp Ai KIDS (`:kidsapp`)** loads `https://matchapp.tv/kids/`, so approved Kids UI/features automatically appear in the Kids Android app.
- When a web change introduces a new route, deep-link behavior, authentication flow, native permission, file-picker behavior, external-app handoff, user-agent rule, or Android-specific restriction, the matching Android module must be reviewed and updated in the same change.
- Main-site Kids entry points remain available on the public website, but are hidden and blocked inside the standard Android app.
- Kids-site changes must remain inside the Kids-only Android boundary when running the dedicated Kids app.
- Do not fork/copy the website HTML/CSS/JS into the Android project merely to “sync” it. The live WebView source is the synchronization mechanism; only native-shell differences belong under `android-studio/`.

Treat this as a standing release rule for future MatchApp changes. Every approved MatchApp web fix must be reviewed for both Android modules in the same task; when a fresh AAB is requested, bump both module build markers together so neither app can ship against a stale production snapshot.

## Separation rule

**Do not move the Android Kids filtering into the production website.**

The website must continue serving its existing desktop, mobile and TV experiences, including Kids Mode. The public website still serves both normal and Kids experiences, while the Android package separation and guarded parent handoff are enforced by these Android modules.

## Google Play later

Create separate Play Console apps for:

- `tv.matchapp.app` — MatchApp Ai
- `tv.matchapp.kids` — MatchApp Ai KIDS

The existing `play/` folder is for the main MatchApp Ai listing. The old `play/screenshots/04-kids.png` image should **not** be used in the main listing now; it may be reused as reference material for the Kids listing.

After final Play signing certificates exist, Digital Asset Links can be updated to verify both package IDs. That website-side step is intentionally **not performed here**, because this change is Android-only.
