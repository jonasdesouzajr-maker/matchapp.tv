# MatchApp Ai adult app â€” Play Console release checklist

## October 7, 2026 publication candidate
- Adult release candidate is **1.1.38 (code 42)**, package **com.jonas.papercup**, compile/target API 36.
- Code 42 supersedes the already-uploaded code 41 candidate. Do not reuse code 41 for the new publication.
- Do not call this candidate ready if the emulator/native validation is skipped: run the local Android emulator checks when hosted CI cannot provide one.
- The final upload file must be signed with the existing protected Play upload key; GitHub's AAB artifact remains unsigned verification output only.


## October 4, 2026 release-unblock checkpoint
- Release candidate **1.1.36 (code 40)** targets **Android 16 / API 36** and removes the unverifiable redirected `www.matchapp.tv` host from `android:autoVerify`; the live apex `https://matchapp.tv/.well-known/assetlinks.json` is the canonical association.
- This directly addresses the two Play Console items shown on October 4: the API-36 update requirement and the failing web-domain App Links association.

## Owner-supplied package and signing reference
- The normal Android app ONLY uses package / namespace `com.jonas.papercup`. Verify this matches the existing Play Console app before building. A package change cannot update a listing already created with another ID.
- The adult module is `:app`: version 1.1.36 (code 40), compile/target API 36. `:kidsapp` remains separate and unchanged.
- The public MD5 / SHA-1 / SHA-256 below are REFERENCE fingerprints, NOT an upload keystore or passwords. They cannot sign an AAB.
- MD5: `D5:80:47:0C:2D:55:3E:95:8A:22:00:5A:CA:AB:EF:21`
- SHA-1: `FD:79:65:0D:1B:63:58:CD:A3:8A:C7:53:A0:5B:25:C6:84:11:59:13`
- SHA-256: `BA:B0:21:1A:41:0E:7D:9C:8F:43:CC:BA:BF:C8:F7:FE:DE:76:C8:25:7B:E2:AA:35:4D:58:37:43:C3:25:E0:47`
- These older fingerprints remain a **historical reference of unconfirmed certificate role**; do not use them for site association or treat them as signing credentials. For a local upload key, run `keytool -list -v -keystore /absolute/private/path/upload.jks -alias YOUR_ALIAS` and compare fingerprints; never commit the private keystore.
- Separately on 25 Sep 2026 the owner supplied the **Play Console App signing key certificate** SHA-256 `66:EB:B2:FF:31:C6:57:42:FB:D9:9E:0D:89:0A:B2:F1:56:E4:DA:5C:19:1A:AF:67:5A:DA:4E:D5:FF:EE:74:B8` along with the related App signing key certificate screenshot; the Upload key certificate section was blank before the first uploaded AAB. The root `.well-known/assetlinks.json` and local `play/assetlinks.json` now use this Play app-signing fingerprint and `com.jonas.papercup`.
- A successful website deploy does not itself prove App Links verification. Confirm live assetlinks is reachable without redirect, and test real Play-distributed signed app. `www.matchapp.tv` is intentionally not declared by the adult manifest because that hostname redirects to `matchapp.tv`; only the canonical apex host is verified for Android App Links.

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
5. Generate a signed **Android App Bundle** for `:app` only, using a private signing key not stored in Git. Verify package `com.jonas.papercup`, version code 42 (higher than the already-uploaded code 41), target SDK 36, correct upload signing certificate and Play Console listing/data safety declarations.
6. Website Digital Asset Links now use the recovered **Play app-signing** SHA-256. Verify live HTTPS JSON and Android App Links on the Play-distributed build; publishing an app is not required for staging this website file.

STATUS: Build/static verification is automatable. Native AdMob activation, actual Play signing and physical-device release QA still require the missing owner inputs and tests.


## 27 September 2026 adult-only source candidate
Current source candidate: Version **1.1.35**, code **37**, package **com.jonas.papercup**. Final Play-distributed AAB signing and publication have not been verified. The e-book and awareness changes are delivered through the LIVE WebView after site deployment even to existing installations. GitHub's resulting AAB is **UNSIGNED**, not Play-ready; use the SAME private existing upload keystore locally, check Play Console's highest previously uploaded code, test on a real device/internal track and then submit. Do not modify or publish Kids as a side effect.

### Installed-app video intro (1.1.35 / code 37)
The adult native launcher now plays the bundled 4.5-second silent intro while Home loads, with Skip, completion/error cleanup and a 6.5-second deadline. The system splash uses a transparent drawable and exits immediately. Backgrounding, rotation restoration and deep links do not replay the intro. Existing native installations need this signed app update to receive the native splash replacement; the website cannot change an already-installed APK's launch theme. Code 37 is the next repository candidate; confirm it exceeds Play Console's highest uploaded code before signing/submission. The website intro is restricted to installed handheld PWA Home windows and older adult native Home pages. Chrome still controls the PWA's initial system icon screen. Kids and browser visits are unchanged.

### Full-screen intro correction
The intro now fills the native display with proportional center-crop, hides system bars only during playback, and restores Home bars on every exit. Web/PWA playback fills the available viewport with object-fit:cover. The encoded asset is 1080x1920, upscaled from the supplied 720x1260 video; upscaling does not add source detail. Chrome controls its PWA cold-launch icon and OS bars; website code cannot remove that screen. Native transparent launch-icon resources already suppress the logo, but installed APKs need a signed native update. Code 37 remains an unpublished candidate; its Play publication was not performed here.

H.264 is encoded at level 4.1 for wider hardware compatibility. Browsers without that H.264 profile receive the same 1080x1920 WebM video; the native bundle uses MP4.

## October 5, 2026 Play Store presence source of truth

- Repository listing metadata now lives under android-studio/play/store-listing/ for en-US and pt-BR.
- The Play Console target category is Entertainment, matching the app's primary movies/TV discovery experience.
- Public support targets should use https://matchapp.tv/, https://matchapp.tv/privacy.html and support@matchapp.tv instead of the legacy Google Sites property.
- The pt-BR app name must remain exactly MatchApp Ai, never MatchApp iA.
- Store listing metadata can be updated without changing or replacing the currently released AAB. AAB/release-track changes remain a separate, explicit release task.
- Run tests/play-store-presence.test.cjs before future Play metadata releases.
