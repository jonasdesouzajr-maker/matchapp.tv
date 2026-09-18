# MatchApp Ai — Android Studio (Quail-ready)

This folder is one self-contained Android Studio project with **two separate installable Android apps**. Both render the current production MatchApp experience through a hardened Android WebView shell, so Android stays aligned with MatchApp without copying or altering the website source.

## Modules

### MatchApp Ai — `:app`

- Application ID: `tv.matchapp.app`
- Installed name: **MatchApp Ai**
- Opens `https://matchapp.tv/`
- Keeps the existing Android application ID for upgrade continuity
- **Kids Mode is not available inside this Android app**
- Direct links and in-app navigation to `/kids/` are blocked and returned to the standard MatchApp home
- Kids entry points are hidden inside the Android shell only
- Ads are disabled in the Android shell
- Supports authenticated sessions, Android back, pull-to-refresh, fullscreen media, file selection and offline state

### MatchApp Ai KIDS — `:kidsapp`

- Application ID: `tv.matchapp.kids`
- Installed name: **MatchApp Ai KIDS**
- Opens `https://matchapp.tv/kids/`
- Uses a separate package so both apps can be installed on the same device
- MatchApp navigation is restricted to the Kids surface and its child pages
- The website's **Grown-ups** exit and install/PWA controls are hidden inside this Android shell
- Non-Kids MatchApp routes are blocked and return to the Kids home
- Privacy/Terms and third-party viewing destinations open outside the Kids shell
- Ads are disabled in the Android shell
- Uses the existing MatchApp Kids visual identity for launcher/splash presentation

## Android Studio Quail

The project intentionally keeps the already proven MatchApp Android toolchain:

- Android Gradle Plugin 8.7.3
- Gradle 8.9
- Kotlin 2.0.21
- JDK 17
- compileSdk 35
- targetSdk 35
- minSdk 24 (Android 7.0+)

Open the repository's **`android-studio` folder** in Android Studio Quail. Let Gradle sync, then choose either the `app` or `kidsapp` run configuration.

## Build

1. File → Open → choose `android-studio` (the folder containing `settings.gradle.kts`).
2. Wait for Gradle sync.
3. Select **app** for MatchApp Ai or **kidsapp** for MatchApp Ai KIDS.
4. Run on an emulator/device or use Build → Generate Signed App Bundle or APK for release.
5. Keep signing keystores and passwords outside GitHub.

## Web → Android synchronization policy

The Android apps intentionally render the live MatchApp web surfaces rather than maintaining a second copy of the UI:

- **MatchApp Ai (`:app`)** loads the main `https://matchapp.tv/` experience, so approved main-site UI/features such as the AI Concierge automatically appear in Android.
- **MatchApp Ai KIDS (`:kidsapp`)** loads `https://matchapp.tv/kids/`, so approved Kids UI/features automatically appear in the Kids Android app.
- When a web change introduces a new route, deep-link behavior, authentication flow, native permission, file-picker behavior, external-app handoff, user-agent rule, or Android-specific restriction, the matching Android module must be reviewed and updated in the same change.
- Main-site changes must never accidentally expose `/kids/` inside the standard Android app.
- Kids-site changes must remain inside the Kids-only Android boundary.
- Do not fork/copy the website HTML/CSS/JS into the Android project merely to “sync” it. The live WebView source is the synchronization mechanism; only native-shell differences belong under `android-studio/`.

Treat this as a standing release rule for future MatchApp changes.

## Separation rule

**Do not move the Android Kids filtering into the production website.**

The website must continue serving its existing desktop, mobile and TV experiences, including Kids Mode. The separation between MatchApp Ai and MatchApp Ai KIDS is enforced only by these Android modules.

## Google Play later

Create separate Play Console apps for:

- `tv.matchapp.app` — MatchApp Ai
- `tv.matchapp.kids` — MatchApp Ai KIDS

The existing `play/` folder is for the main MatchApp Ai listing. The old `play/screenshots/04-kids.png` image should **not** be used in the main listing now; it may be reused as reference material for the Kids listing.

After final Play signing certificates exist, Digital Asset Links can be updated to verify both package IDs. That website-side step is intentionally **not performed here**, because this change is Android-only.
