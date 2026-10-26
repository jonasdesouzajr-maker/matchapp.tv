## October 26, 2026 startup crash repair — 1.1.63 (code 63)

Repairs the observed 1.1.62 S23 Ultra startup failure in WorkManager/Room initialization by preserving the reflected WorkDatabase implementation in R8. The minified separate QA package passed three cold launches on the owner's physical SM-S918B. Production package, existing signing identity, ad configuration, web matching and Kids remain unchanged. Recheck all uploaded Play version codes before upload. Build, signing, store acceptance and production-device delivery remain separate gates.

## October 26, 2026 Material compatibility and R8 optimization - 1.1.62 (code 62)

Production 61 / 1.1.61 was published October 26 in 178 countries. Candidate 62 addresses the remaining Material DatePicker deprecated API and R8 optimized resource shrinking recommendations. Recheck all uploaded version codes immediately before upload.

Upgrade Material 1.12.0 to stable 1.14.0 and AGP 8.13.2 to 9.0.1 with Gradle 9.1.0. Preserve the external Kotlin plugin and existing DSL through the documented AGP compatibility flags. Release minification and resource shrinking remain enabled; optimized resource shrinking is automatic in AGP 9. Preserve all native insets, fullscreen PiP, fourteen shell languages, matching/AI, original artwork, consent, entitlement and ad configuration. Kids source remains unchanged. AndroidX backward compatibility may retain guarded legacy APIs; do not remove older Android support to suppress a static advisory.

Required gates: adult static guard, JVM tests, adult debug/release builds, Kids compile, full website and real matching/AI/reading/original-art audits, physical-device QA using the separate debug package, and exact signed bundle metadata/certificate verification. Use the existing private upload identity and Production track only. CI artifact MatchApp-Ai-adult-1.1.62-code62-UNSIGNED-AAB must be signed locally before upload. Preserve production app data.

## October 23, 2026 design polish and stability — 1.1.60 (code 60)

Code **60** rebuilds current main (same native code as 59) with the build number raised. Use the same required gates below. The unsigned CI artifact is MatchApp-Ai-adult-1.1.60-code60-UNSIGNED-AAB.

## October 22, 2026 adult launcher and permission bridge — 1.1.59 (code 59)

Code **59** combines the approved Play + Ai launcher/adaptive/Play icons and native permission capability with the complete current main branch. It preserves the version-58 Maps handoff, post-intro insets, app data, protected web design and ad configuration. The new permission endpoint is restricted to trusted HTTPS main-frame messages and deliberate foreground interaction. The approved web tour is unchanged and does not currently call this endpoint.

Use the same required gates below for **59 / 1.1.59**: adult static guard, JVM tests, debug/release builds, unchanged Kids compilation, exact bundle and upload-signature verification, and physical SM-X236B QA. Use only the Production track. A separate debug package may be used for physical preflight; never sideload, clear data or uninstall the production app. Verify production delivery only through a real Play Store update. Recheck the all-bundle inventory before upload; an accepted version code is never reusable.

The unsigned CI artifact is MatchApp-Ai-adult-1.1.59-code59-UNSIGNED-AAB. Compilation, signing, Play acceptance, publication and real-device update are separate checks; this preflight does not certify their completion.

## October 22, 2026 adult post-intro dock fix — 1.1.58 (code 58)

Code **58** keeps the 57 Maps handoff and holds the opaque intro layer until content is laid out with restored system-bar insets, removing the brief dock clipping after natural intro completion. It replaces 57 in the Production release. Recheck all uploaded bundles before uploading 58.

## October 22, 2026 adult Maps handoff candidate — 1.1.57 (code 57)

This is the current adult release preflight. It supersedes the historical version, emulator and testing-track directions below. Keep package `com.jonas.papercup`, the existing registered upload signing identity, protected ad configuration and the separate Kids app unchanged. The owner requires a Production release, not a new internal/beta track; no emulator work is authorized.

The live all-bundle Play Console check on October 21 at **22:45 UTC** found **55 / 1.1.55** as the highest uploaded bundle, with Production at **100% rollout in 178 of 178 countries/regions**. Play subsequently accepted **56 / 1.1.56** into the Production draft; physical cinema QA then found its Maps handoff defect before review submission. Code **57 / 1.1.57** supersedes that draft. Preserve the accepted code-56 artifact and evidence; never overwrite/reuse its version code or submit it in place of this repair. Recheck the all-bundle inventory before uploading 57.

The confirmed failure was a Google Maps HTTPS search redirect to an `intent:` URL, producing `net::ERR_UNKNOWN_URL_SCHEME` inside the adult WebView. This candidate hands only the validated official HTTPS Maps search to Android Maps/browser routing before the existing Google authentication allowlist. It preserves the original query and current MatchApp document, and consumes a missing-handler failure with localized guidance. It does not parse arbitrary intent payloads or weaken OAuth routing.

The reviewed adult lifecycle recovery, single native intro owner, optional microphone/approximate-location setup and safe-area changes are carried forward unchanged. Website-only UI changes still reach the live WebView after deployment; the handoff repair requires this native bundle. Preserve passing version-56 QA with its actual version provenance and repeat affected handoff/return/permission checks on 57. Earlier debug or sideload evidence does not certify Play delivery.

Required gates for this candidate:

1. Run `python3 android-studio/scripts/verify_adult_release.py` and the relevant web/source gates for the exact candidate. Inside `android-studio`, build `:app:testDebugUnitTest :app:assembleDebug :app:bundleRelease :kidsapp:assembleDebug` with the existing JDK 17 / API 36 toolchain. Preserve the separate Kids sources and all release checks.
2. Verify the unsigned AAB archive, package `com.jonas.papercup`, code **57**, version **1.1.57**, target SDK **36** and checksum. The CI artifact `MatchApp-Ai-adult-1.1.57-code57-UNSIGNED-AAB` is verification output, not an upload-ready bundle.
3. Sign a separate output locally with the protected existing Play upload key. Verify the signed archive, upload-certificate identity and unchanged unsigned source hash. Never commit keys/passwords, substitute another identity or confuse the upload certificate with the Play distribution certificate used by App Links.
4. Verify the actual version-57 cinema action with approximate location granted, its title-only fallback after denial/revocation, the Maps/browser destination, and Back to the same MatchApp document. Confirm both main-window and popup routes remain bounded, repeated actions remain usable, and permission revocation does not cause new OS prompts. Preserve the version-specific microphone/transcription, typing/navigation, audible intro/Skip/background and lifecycle evidence; repeat checks invalidated by native changes. Use existing test-device ad handling and never click live ads. Keep untested device/accessibility configurations explicit.
5. Match the optional-permission behavior to the published privacy pages and applicable Play declarations. Upload only the verified signed adult AAB to the Production draft; inspect Play processing and the Google-signed candidate on the physical device before submission where available. Do not create internal/beta tracks or change the existing countries without an owner request.
6. Submit the same verified Production release after its gates pass and confirm review/publication/rollout separately. A Play-origin update is required to prove the update-triggered intro path; a sideload or debug install cannot establish that distribution behavior. Record actual Play status rather than treating submission as publication.

**Preparation status:** version metadata and preflight are synchronized; this section alone does not certify a signed artifact, successful device checks, Play upload, review approval or production publication.

## October 15, 2026 adult visual release — 1.1.53 (code 53)

New original gold Orbit launcher artwork uses a true-alpha foreground with safe spacing and platform-owned adaptive masking. Adult web layouts inherit the live responsive presentation. Package, account, matching, speech, consent and advertising mechanisms are preserved. Play Console latest-bundles review on October 15 showed code 50 as the highest uploaded build; code 53 is reserved for this candidate. Recheck before upload. Build, exact upload-certificate verification, physical QA and store processing remain required; a generated unsigned bundle is not publishable.

# MatchApp Ai adult app â€” Play Console release checklist

## October 12, 2026 Samsung M54 consent crash hotfix — 1.1.52 (code 52)
- Reported: the Play Store app closes on Galaxy M54 immediately after cookie/consent acceptance; root stack trace is still needed.
- UMP consent completion now gates native ad operations against Activity teardown; delayed banner work is invalidated, and AdMob failures fail closed with no advertising.
- Do not weaken consent or VIP/ad-free entitlements. Test a production-signed release on Galaxy M54; the older 1.1.51 debug APK lacks the fix.
- Preserve production package com.jonas.papercup and protected Play upload key. Never submit unsigned AAB.

## October 12, 2026 Android UI candidate — 1.1.51 (code 51)
- Changes: approved metallic adaptive launcher icon; native TTS word-boundary timing for Jonas greeting; remote-editable Jonas composer, bubble drag, spoken avatar and Top Titles kinetic glide.
- Keep the existing package `com.jonas.papercup`, AdMob consent and signing certificate. Never publish unsigned CI output.
- Before production: verify Play Console highest active/uploaded version code is below 51, use protected upload keystore, test signed bundle through Play on a real device, verify icon mask, voice start/fallback, mic permissions, carousel momentum and no crashes. Confirm production track and rollout separately.



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

## AdMob configuration and release gates
- Owner-confirmed production **AdMob App ID**: `ca-app-pub-9541435081010948~6998171073`.
- Owner's production **banner ad unit**: `ca-app-pub-9541435081010948/4843348278`.
- Google Mobile Ads **25.5.0** and UMP **4.0.0** are integrated in the adult native shell. The SDK is initialized only after UMP has refreshed consent and `canRequestAds()` is true.
- Native banners are **free/guest tier only**. The bridge queries the authenticated `profiles` row and fails closed while entitlement is unknown; VIP, Business and existing one-time Ad-Free accounts suppress native ads.
- Website AdSense stays blocked inside the Android WebView. The separate Kids app remains ad-free and receives no AdMob integration.
- DEBUG overrides the production App ID/banner with Google's sample App ID/banner and keeps Google's sample rewarded unit `ca-app-pub-3940256099942544/5224354917`. RELEASE rewarded ID remains blank; do not award real credits from the sample unit.
- Before production submission, use DEBUG/sample ads or an AdMob test-device configuration for device QA. Verify the UMP message and the **Privacy choices** entry point where required. Do not intentionally click live ads during testing.
- The Play Console **Contains ads** declaration for this adult release must be **Yes**. If a production rewarded format is added later, create a real MatchApp Ai rewarded unit first and repeat consent/entitlement/device QA.

## Build and release gates
1. Pull the latest `main`. Open the `android-studio` folder with Android Studio using JDK 17 and Android SDK API 36. Select the **app** module for the normal MatchApp Ai listing.
2. Run `./gradlew :app:assembleDebug :app:bundleRelease :kidsapp:assembleDebug`. The unsigned release bundle build tests compilation/minification but is NOT the final signed bundle.
3. On a real phone and tablet, test adult launch, responsiveness, cinema-dim, screen rotation, login (including Google), AI matching and accurate source links, magazines, e-books, voice microphone, file chooser, browser handoffs, online/offline and back navigation. Confirm blocked Kids routes, no in-WebView adult XXX, no stray web ads or crashes.
4. Run the same key tests on a release-signed candidate; test from the AAB distributed by a Play internal testing track if possible. Device, authentication, network, ad-consent and publisher-link behavior cannot be proved by GitHub compilation.
5. Generate a signed **Android App Bundle** for `:app` only, using a private signing key not stored in Git. Verify package `com.jonas.papercup`, version code 42 (higher than the already-uploaded code 41), target SDK 36, correct upload signing certificate and Play Console listing/data safety declarations.
6. Website Digital Asset Links now use the recovered **Play app-signing** SHA-256. Verify live HTTPS JSON and Android App Links on the Play-distributed build; publishing an app is not required for staging this website file.

STATUS: Production banner AdMob is now source-configured with owner-confirmed IDs and consent/entitlement gates. Build/static verification is automatable; physical-device ad/consent QA, final local signing and Play-track validation remain release gates.


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
