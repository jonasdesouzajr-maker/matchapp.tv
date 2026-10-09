# MatchApp Ai — Standalone Jonas Preview (Android v45)

This branch builds the independent **internal QA variant** `com.jonas.papercup.preview`. It must **not** replace the production Google Play app.

## What works

- Android assets package Jonas's Python-prototype interface, styles, images, and expression frames. A local Python web server is no longer required for the preview build.
- A persistent, draggable Jonas bubble appears on Home, Discover and My Space. Tap to chat; typing and Android-native speech recognition are supported.
- Native speech output and expression crossfades run alongside the subtle 3D-styled idle animation. Reduced-motion settings disable animation.
- The app routes general conversation to the **existing Supabase gemini-proxy** using its **public legacy anon JWT** and its current server-side provider routing/rate limits. No private provider key is embedded in the APK.
- Jonas's symbolic birthday is October 10; his creator was born October 10, 1986. Do not claim an official public Play launch date until it has been verified.
- Preview ads are disabled. Production advertising and Kids Mode behavior were not changed.

## Building locally

In `android-studio/local.properties` add `matchappAnonKey=<the ACTIVE Supabase LEGACY ANON JWT>`. This file is ignored by Git. Use the public **anon JWT** for this preview; a newer publishable key alone cannot be used as an Authorization JWT by `verify_jwt=true` Edge Functions.

Run `gradlew.bat :app:assemblePreview :app:bundlePreview`.

The APK and AAB are generated under `android-studio/app/build/outputs/`. The test AAB is **signed using development signing**, with a distinct package name. The production Play upload certificate/keystore is not configured in this branch.

## Production blockers — do not upload to the existing app listing

1. Integrate Jonas's new interface into the full production MatchApp Ai experience without removing matching categories, account management, credits/subscriptions, regional catalog availability, and the locked AdSense/AdMob placements. The preview only has Home, Discover and My Space.
2. Replace guest-only AI use with authenticated session claims, appropriate credit/entitlement enforcement, abuse protection and verified country-aware streaming results, preserving the existing Supabase security boundary.
3. Verify real spoken-input transcripts, audio quality, devices and accessibility. TTS callbacks and no-speech handling alone are insufficient.
4. Run Play release-signing verification using the authorized current **production upload certificate**, Google Play policy/data-safety/privacy checks, and a staged internal test. Increment the production version code appropriately.
5. Confirm the actual Google Play listing publication date before writing that date into Jonas's identity metadata.

**Status:** Working Android internal QA proof, not production-approved and not a replacement for the currently published package.
