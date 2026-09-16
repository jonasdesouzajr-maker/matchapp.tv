# Upload MatchApp TV to Google Play Console

## 1. Create the app

1. Open [Google Play Console](https://play.google.com/console) → Create app.
2. Name: **MatchApp TV**
3. Default language: English (United States)
4. App or game: App
5. Free
6. Declarations: this app does **not** contain ads.

## 2. Signed Android App Bundle

In Android Studio:

1. Build → Generate Signed App Bundle / APK
2. Android App Bundle
3. Create a new keystore (save the file and passwords off this computer)
4. Key alias: `matchapp`
5. Build variant: **release**
6. The file lands at `app/release/app-release.aab`

Upload that AAB in Play Console → Production (or Closed testing first).

## 3. Store listing

| Field | Suggested copy |
| --- | --- |
| Short description | Find what to watch. Ad-free AI concierge for movies, series, Kids Mode and where to stream. |
| Full description | MatchApp TV is your ad-free AI concierge for entertainment. Tell it your mood — or tap a trending title — and get one pick plus the official place to watch it. Movies, series, K-dramas, anime, novelas, podcasts and a separate Kids Mode. Sign in to keep Watch Later and history across devices. |
| App icon | `play/icon-512.png` |
| Feature graphic | `play/feature-graphic.png` |
| Phone screenshots | `play/screenshots/` (at least 2, up to 8) |
| Category | Entertainment |
| Privacy policy | https://matchapp.tv/privacy.html |
| Support email | support@matchapp.tv |

## 4. Ads declaration

Play Console → App content → Ads → **No, my app does not contain ads.**

Do not add the Google Mobile Ads SDK. This project does not include it.

## 5. Data safety (high level)

Complete the form honestly. Typical answers for this build:

- Collected: account email/name if the user signs in (Supabase on matchapp.tv), app activity (pages they open inside the app), optional analytics already on the site (Google Tag Manager).
- Not collected by the Android package itself: location, contacts, SMS, files beyond a photo they pick for an avatar.
- Encrypted in transit: yes (HTTPS only).
- Users can request deletion from the website profile / support email.

## 6. Content rating

Questionnaire: Entertainment / streaming guide. Not a kids-only app (Kids Mode is a section). Complete IARC.

## 7. Closed testing

New personal developer accounts must run a closed test with at least 12 testers for 14 days before production. Add testers by email, share the opt-in link, have them install.

## 8. After the first upload

Play App Signing shows an **App signing key certificate** SHA-256. Paste it into `play/assetlinks.json` **and** `.well-known/assetlinks.json` in the website repo, then publish so Android can verify App Links at https://matchapp.tv/.well-known/assetlinks.json
