# MatchApp Ai adult app — Play Console release checklist

## Owner-supplied package and signing reference
- The normal Android app ONLY uses package / namespace `com.jonas.papercup`. Verify this matches the existing Play Console app before building. A package change cannot update a listing already created with another ID.
- The adult module is `:app`: version 1.1.30 (code 32), compile/target API 36. `:kidsapp` remains separate and unchanged.
- The public MD5 / SHA-1 / SHA-256 below are REFERENCE fingerprints, NOT an upload keystore or passwords. They cannot sign an AAB.
- MD5: `D5:80:47:0C:2D:55:3E:95:8A:22:00:5A:CA:AB:EF:21`
- SHA-1: `FD:79:65:0D:1B:63:58:CD:A3:8A:C7:53:A0:5B:25:C6:84:11:59:13`
- SHA-256: `BA:B0:21:1A:41:0E:7D:9C:8F:43:CC:BA:BF:C8:F7:FE:DE:76:C8:25:7B:E2:AA:35:4D:58:37:43:C3:25:E0:47`
- Determine whether these are the *upload-key* certificate or the *Play app-signing* certificate. Google may use different keys. For a local upload key, run `keytool -list -v -keystore /absolute/private/path/upload.jks -alias YOUR_ALIAS` and compare the fingerprints; never commit the private keystore.
- The local `play/assetlinks.json` is only a template with the new package. Do not deploy it to the production website until you have verified the **Play app-signing** SHA-256 under Play Console > App integrity, which may be different from the upload certificate.

## AdMob configuration and blockers
- Owner's real *banner ad UNIT*: `ca-app-pub-9541435081010948/4843348278`, recorded in adult release BuildConfig.
- Owner's *rewarded ad UNIT* `ca-app-pub-3940256099942544/5224354917` is Google's public sample/test ad ID. It is in adult DEBUG BuildConfig ONLY; the RELEASE rewarded ID remains blank.
- Before activating native ads you MUST supply your Android **AdMob App ID**, e.g. `ca-app-pub-9541435081010948~XXXXXXXXXX` (notice `~`, not `/`). If rewards are desired in production, supply your own real rewarded ad unit too.
- The Android shell intentionally does not include or initialize Google Mobile Ads until the valid app ID, consent handling and banner placement are added and tested. The native AAB is currently ad-free; it suppresses website AdSense separately. Never use Google's sample rewarded unit as a production unit or award real credits based solely on unverified JavaScript callbacks.
- When native ads are implemented, validate test devices and user consent/privacy disclosures before testing live units. Keep immutable website AdSense placements and Kids app untouched.

## Build and release gates
1. Pull the latest `main`. Open the `android-studio` folder with Android Studio using JDK 17 and Android SDK API 36. Select the **app** module for the normal MatchApp Ai listing.
2. Run `./gradlew :app:assembleDebug :app:bundleRelease :kidsapp:assembleDebug`. The unsigned release bundle build tests compilation/minification but is NOT the final signed bundle.
3. On a real phone and tablet, test adult launch, responsiveness, cinema-dim, screen rotation, login (including Google), AI matching and accurate source links, magazines, e-books, voice microphone, file chooser, browser handoffs, online/offline and back navigation. Confirm blocked Kids routes, no in-WebView adult XXX, no stray web ads or crashes.
4. Run the same key tests on a release-signed candidate; test from the AAB distributed by a Play internal testing track if possible. Device, authentication, network, ad-consent and publisher-link behavior cannot be proved by GitHub compilation.
5. Generate a signed **Android App Bundle** for `:app` only, using a private signing key not stored in Git. Verify package `com.jonas.papercup`, version code 32, target SDK 36, correct upload signing certificate and Play Console listing/data safety declarations.
6. Get the final **Play app-signing** SHA-256 from Play Console before you update website Digital Asset Links. Verify Android App Links on the Play-distributed build.

STATUS: Build/static verification is automatable. Native AdMob activation, actual Play signing and physical-device release QA still require the missing owner inputs and tests.
