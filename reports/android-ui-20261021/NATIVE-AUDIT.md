# Native Android audit — MatchApp Ai

**Audit date:** 21 October 2026

**Repository baseline:** `0d4776ca9d1f99c27cb7f6e45c849c51bb4e0159`

**Scope:** the adult Android shell, native startup and permission policy, safe screen restoration, and the shared web code that controls intro audio and manual refresh inside that shell.

## Status and interpretation

The candidate fixes the confirmed destructive pull refresh, launcher reentry to Home, competing web intro-audio owner, missing upfront capability setup, and incomplete native safe-area handling. It also adds bounded restoration of the current trusted route, existing filter choices, and scroll during Android recreation. A later physical process-death test exposed that relying on Android's saved Activity bundle alone could still reopen Home; the candidate now has a backup-excluded local presentation checkpoint for a fresh launcher Activity. The final physical retest passed: after actual process termination, Guide chapter 9 and the deliberately saved 200 CSS-pixel scroll offset were restored. The source review also corrected a permission issue: after the upfront microphone choice was complete, an ordinary voice tap could still repeat the Android permission request. The corrected path reports permission denial and leaves text use available.

This is an audit of a **debug QA candidate**, not evidence of a production Google Play update. The repository still declares adult version code **55**, version name **1.1.55**, minimum API **24**, and target/compile API **36**. No production version increment or signing change was made in this native work. The QA installation uses an isolated package prepared by the device-testing owner; it does not replace the Play-installed production app. See [the unchanged adult build configuration](../../android-studio/app/build.gradle.kts).

**No reviewer claims to have listened to the intro audio.** Source inspection, startup markers, and policy tests establish who may attempt playback and when. They do not establish perceived sound quality, audible output under a particular device volume setting, or the complete production Play delivery path. A real production-store update was not performed as part of this verification.

## Confirmed defects and implemented behavior

| Area | Confirmed original implementation or observed defect | Candidate behavior |
| --- | --- | --- |
| Downward swipe | `SwipeRefreshLayout` directly called `web.reload()`, destroying the current document. | Pull-to-refresh is disabled. A normal downward gesture scrolls; it cannot regenerate a result or reset the page. |
| Launcher reentry | The previous `onNewIntent` resolved a data-less launcher intent through the default Home URL. The physical production installation reproduced Guide → system Home → app icon → app Home. | A data-less launcher intent resumes the existing screen. Explicit links retain their navigation behavior. |
| Recreation | The Activity initially loaded its resolved launch destination without a safe current-screen restoration contract. | Android saved state restores an eligible current route and safe history, with allowlisted filters and bounded scroll replay. |
| Missing saved bundle after process death | Physical Guide → system Home → kill only the QA process → launcher produced a new PID and returned to Home despite the earlier normal-resume pass. | A small synchronously committed presentation checkpoint supplies the safe route/filter/scroll fallback for a fresh data-less launcher Activity. A new explicit link still wins. |
| New link during recreation | An initial candidate could prefer saved state over a newly delivered explicit link. | A consumed-launch fingerprint distinguishes the old launch from a new link or OAuth callback. A new explicit intent wins. |
| Intro ownership | A web script could create the intro audio after eligible document clicks, independently of native startup. Native startup had no installed-version latch. | Native Android is the sole intro owner. It consumes the installed version before any playback attempt. The web click owner exits immediately in the native shell. |
| Permissions | Microphone permission was requested on voice entry. Nearby Cinemas used web geolocation but the native manifest/bridge did not support approximate location. | Optional microphone and approximate-location permissions are explained together and requested in initial setup. No recording or location lookup starts from granting them. |
| Permission denial/revocation | The first candidate retained the old microphone request on later voice entry. | After setup is complete, a missing microphone grant returns `permission-denied` without a new runtime prompt. The current OS grant is rechecked every time. |
| Insets | The normal WebView path applied only the top inset; side cutouts were ignored and bottom handling depended on the ad shell. | One normal-content inset owner applies top, left, right, and appropriate bottom system/cutout space, including when the ad shell is hidden. |

Primary implementation: [MainActivity.kt](../../android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt), [NativeLaunchPolicy.kt](../../android-studio/app/src/main/java/com/jonas/papercup/NativeLaunchPolicy.kt), and [native-page-state.js](../../android-studio/app/src/main/assets/native-page-state.js).

## Navigation, recreation, and information boundaries

### Resuming and opening explicit destinations

`onNewIntent` still records the incoming intent and closes the deferred install-referrer handoff. It then returns immediately for a launcher intent without data. It navigates only when an explicit app link or the existing debug fixture supplies a destination. This fixes the reproduced launcher reset without replacing the normal route resolver, account callback handling, or Back behavior.

The saved bundle contains a SHA-256 fingerprint of the consumed intent action and data. It does not copy an OAuth callback's raw contents into that new fingerprint field. During `onCreate`, the current explicit intent is compared with the stored fingerprint. The original consumed intent, or a data-less launcher intent, permits restoration. A different explicit intent suppresses the old saved screen so the new destination is handled.

### Eligible route and history restoration

The policy accepts only HTTPS on the exact `matchapp.tv` or `www.matchapp.tv` hosts, with no user-info component and only the default/443 port. It rejects Kids, OAuth/private-voice paths, the enumerated authentication/payment callback pages, and token-bearing query/fragment parameters covered by the policy. Encoded paths and encoded parameter names are included in the regression cases.

Before saving a WebView history bundle, the Activity checks **every history entry's URL and original URL**, not only the current page. If any entry is ineligible or unreadable, that history bundle is omitted; an eligible current route can still be saved. This avoids carrying an earlier callback or foreign authentication page into the newly introduced saved-history state merely because the current screen looks safe.

The additional web-message bridge is restricted to the exact two HTTPS origins and rejects non-main-frame messages. It accepts a maximum 16 KiB versioned snapshot, verifies that its URL equals the current eligible page, and reconstructs its own output from allowed fields. Its filter identifiers are:

- Category, mood, platform, genre, vibe, decade, and rating.
- Each list has at most 40 values, with a maximum of 128 characters per value.
- Restoration additionally checks values against the actual current select options.

The snapshot also contains bounded scroll coordinates and a supported app-language identifier. It does **not** serialize form passwords, free-text inputs, chat transcripts, arbitrary HTML, or a generated result's DOM. Filter restoration uses the existing criteria owner; it does not call the matching engine or generate/debit another recommendation.

### Process death without a supplied Activity bundle

Normal background/resume and recreation with a saved bundle do not cover every launcher path. The physical tester explicitly backgrounded the isolated QA package, killed only its process, confirmed a new process identifier on reopening, and observed Home instead of the prior Guide chapter. The initial implementation had no durable fallback.

`onPause` and `onStop` now synchronously commit a small checkpoint from the current WebView URL, already validated filter/language snapshot, and bounded native offsets. An additional page capture can refine that snapshot while the Activity is paused, but successful storage does not depend on an asynchronous JavaScript callback completing before process death. The checkpoint lives in the existing `matchapp_startup` preferences excluded from both cloud backup and device transfer.

The checkpoint reconstructs its URL. It retains only supported `lang`, enumerated presentation `tab`, numeric `appBuild`, the fixed `utm_source=android_app`, and known screen/chapter anchors. Unknown query values and arbitrary fragments are removed. Unsafe origins and authentication, payment, Kids, private, API, logout, and enumerated sign-in/reset destinations cannot produce a checkpoint; entering those destinations clears the preceding fallback when the Activity pauses/stops. The persisted UI snapshot is rebuilt with this sanitized URL. It contains no WebView history bundle, tokens, form contents, chat text, or result DOM. Reading applies the URL policy and UI validator again and enforces a 24 KiB serialized-size limit.

A valid eligible Activity bundle has precedence. Disk fallback is eligible only for a launch without an explicit URL/debug destination; new app links and OAuth callbacks are handled normally. Restoring either source disables the delayed install-referrer destination so that it cannot later replace the recovered screen. The disk fallback restores the current document, not the old back-stack; Back follows newly created live history.

The final physical recovery test used the rebuilt isolated QA APK with the same production Guide web assets before and after process death. The tester deliberately set an in-range **200 CSS-pixel** offset, backgrounded the app, terminated only the QA process, confirmed its disappearance, and reopened it from the launcher. The process sequence was **11650 → no running QA process → 11895**. The URL retained `how-it-works.html#chapter-9`, the active chapter remained zero-based index **8**, and the restored offset was exactly **200 CSS pixels**. A new document time origin was expected because the WebView process/document had been recreated. The consolidated native record is [final-native-evidence.json](device/final-native-evidence.json).

An earlier post-fix run also retained chapter 9 when moving from a candidate UI overlay to production web assets after process death. Its changed header/content dimensions make it unsuitable for an exact offset comparison: the CDP candidate overlay belonged to the terminated WebView. The controlled same-assets run above is the evidence for exact scroll restoration. Candidate UI appearance is recorded separately in the final Guide screenshot.

### Scroll ordering and user control

Page restoration waits for document load and usable layout height. If asynchronous history rendering or images have not yet created the requested scroll range, the JavaScript path waits for a bounded period of up to approximately 1.5 seconds and then uses two animation frames before applying the offset. A native fallback uses a visual-state callback and bounded retries when the page bridge is unavailable. Early temporary scroll positions cannot overwrite the pending native snapshot.

Touch/pointer input, wheel or key input, deliberate navigation, Back, and page exit cancel pending replay. The page capture owner exposes `isRestoring()` so the separate explicit-section navigation helper can avoid competing with recreation. This preserves the user's newer interaction instead of jumping back later.

**Limits:** the durable checkpoint contains presentation state only. It does not recover every transient result, unsent message, unsaved profile edit, or previous back-stack after process death. Clearing app data or an unsafe/unavailable checkpoint leads to normal startup. Unknown URL parameters and arbitrary anchors are intentionally not replayed. Exceptionally late content or changed web assets can change the available scroll range after the bounded restoration window. The physical exact-offset pass covers the stated stable Guide assets and device configuration; it does not prove exact recovery for every asynchronously changing page.

## In-place manual refresh

[app-updates.js](../../app-updates.js) now takes an early native branch before the browser/PWA document-update path. It loads [native-local-refresh.js](../../patches/native-local-refresh.js) and calls `MatchAppLocalRefresh.refresh({reason:'manual-update'})`.

The adapter invokes only an explicit existing read-only renderer for the currently visible local History or Activity list. It coalesces repeated taps. It preserves the selected view and scroll, and restores the previous nodes/count if a renderer fails. Focused or busy History, current results, text drafts, edited profiles, hidden views, and static guides are retained rather than being regenerated.

The result distinguishes locally repainted activity, unchanged content, and unavailable refresh. The native caller presents authored feedback in all 14 supported base languages. It explicitly states that installed app updates come through Google Play. It does not claim to install an APK, fetch newer server records, synchronize another device, or grant fresh recommendations. Loading the adapter or artwork can still involve ordinary resource requests; the refresh operation itself does not invoke matching, credit/debit, account refresh, or remote-history synchronization.

Normal navigation to a different web page and an explicit retry after a failed network load still load a document. Those are separate from the removed accidental refresh behavior. The existing offline retry uses the last attempted route rather than an unconditional Home destination.

## Intro sound: owner, latch, and update policy

The original bundled intro media is unchanged. Native startup evaluates the installed package's `BuildConfig.VERSION_CODE` and a persisted consumed-version marker in `matchapp_startup`. It commits the consumed version **before** opening the intro. A skip, background transition, preparation failure, or process interruption therefore cannot defer the soundtrack to an unrelated later button click.

| Installation state | Playback eligibility |
| --- | --- |
| Fresh app data, no consumed version or legacy returning-user marker | One initial playback attempt. |
| Same or older installed version already consumed | No intro attempt. |
| Higher version on Android 11/API 30+ whose actual initiating package is `com.android.vending` | One attempt for that newer version. |
| Higher version installed through another source, or an unverifiable source | No update-triggered replay. |
| Android 7–10/API 24–29 update | No update-triggered replay, because installer-of-record alone does not prove the actual update source. Initial-install eligibility still works. |
| Returning legacy installation with no new marker | Legacy seen/registered state suppresses ordinary replay; a verified Play update can migrate it to the new version policy. |

The source check deliberately uses `initiatingPackageName`, not `installingPackageName` or the older installer-of-record API. An existing Play installer record can otherwise survive a later sideload. Unknown provenance fails closed. Website cache-busters and `release.json` versions cannot rearm the native intro.

[jonas-intro-audio.js](../../patches/jonas-intro-audio.js) exits when it detects either native Android user-agent marker or the native startup context, including before DOM injection has completed. Its browser-only behavior is retained, with an in-flight latch against rapid duplicate playback attempts. The existing installed-app intro code continues to recognize the current shell's native intro ownership.

Native playback remains finite: preparation timeout, duration-aware completion deadline, Skip, completion, errors, pause, and destruction release the overlay/media. Startup preferences are excluded from cloud backup and device transfer so a fresh installation does not inherit another installation's consumed intro marker or completed permission setup. Existing user account/authentication handlers are not changed.

**Evidence limit:** the eligibility matrix is exercised by JVM policy tests and web/runtime regression tests. Preference markers were observed on the QA installation. No production Play update was installed to prove the full distribution path, and no audible-listening assertion is made. Clearing app data or reinstalling creates fresh startup state; the policy cannot identify it as the same retained installation.

## Upfront permissions and graceful decline

The setup dialog appears after the intro/short transition, once the Activity is resumed and focused and a trusted page is ready. It is not placed behind a feature-specific button. The asynchronous language lookup rechecks Activity focus/lifecycle, startup overlays, page eligibility/load progress, and the completion flag before displaying the dialog.

The rationale is authored in English, Portuguese, Spanish, French, German, Italian, Turkish, Russian, Arabic, Hindi, Indonesian, Japanese, Korean, and Chinese. `pt-BR` uses the Portuguese resource; Android's `values-in` directory contains Indonesian. It follows the app-selected language when available. The explanation says that microphone access supports a voice conversation with Jonas, approximate location supports nearby cinemas, both are optional, and recording/location lookup begins only when the user chooses the corresponding feature. It does not incorrectly imply that only the separate microphone icon can begin a deliberate voice conversation.

| Capability | Native handling |
| --- | --- |
| Voice conversation | Optional `RECORD_AUDIO`; requested in initial setup only if not already granted. The grant callback does not start recognition. |
| Cinemas nearby | Optional `ACCESS_COARSE_LOCATION`; requested alongside microphone. No fine or background location permission is added. Optional location hardware declarations avoid excluding devices without it. |
| Network access and billing | Existing normal/platform permissions remain; they are not additional runtime-dialog requests. |
| Push notifications | No `POST_NOTIFICATIONS` request is invented. This change does not add a native push backend or notification feature. |

The positive action recomputes ungranted capabilities and uses `RequestMultiplePermissions`. Skip, cancellation, or completion marks setup as finished; typed interaction remains usable. The callback never records, starts speech recognition, asks for a position, or opens Cinemas.

For geolocation, `WebChromeClient.onGeolocationPermissionsShowPrompt` checks both the current OS coarse-location grant and the exact requesting HTTPS origin. It also requires an eligible current adult page. User-info, lookalike/subdomain hosts, non-default ports, paths, query strings, and fragments are rejected as requesting origins. The callback returns the existing grant with `retain=false`. A denied/revoked location permission is not dynamically requested again when Cinemas is used.

For voice entry, the final correction uses a small tested permission decision: an existing OS grant allows the deliberate recognition request; missing permission after completed setup returns `permission-denied` immediately. It clears pending recognition permission work and does not open another OS prompt or reset the document. If the user later grants access in Android's existing application settings, the next deliberate voice entry observes that grant. No new settings UI was added. The legacy permission request remains only for entry before initial setup has completed.

The physical no-reprompt check exposed a separate wording defect: the shared error translation pointed Android users to browser permissions. A contained adult-native dictionary in [voice-input.js](../../voice-input.js) now explains Android app permissions and confirms that the user can keep typing, in all 14 base languages. The selected app language is read at error time, including regional aliases. This copy requires the native voice bridge and explicitly excludes `/kids`, `/kids/…`, the Kids native user agent, and the Kids-only runtime flag. Browser/Kids copy and voice behavior remain unchanged. It never opens settings, requests permission, submits a draft, or retries recognition. [native-microphone-copy-20261021.test.cjs](../../tests/native-microphone-copy-20261021.test.cjs) exercises those boundaries with the actual voice-input runtime.

The physical tester reported the final Portuguese two-capability rationale, followed by separate Android approximate-location and microphone requests; both were declined, and Home remained functional. After the final native rebuild/replacement installation, an explicit microphone tap in the Jonas modal **did not open a permission-controller window**. Both OS permissions remained denied, the route and document time origin stayed unchanged, and a typed draft remained usable with the full Samsung keyboard open. Input, Send, Close, and navigation remained reachable. The revised Android-specific toast copy was added after this physical discovery and received the targeted runtime tests described below.

That denial run does not establish successful microphone transcription or delivery of a real approximate position after granting access. The 14 resource dictionaries and native-denial messages were checked in source/tests; only the reported device language is physically evidenced here.

## Insets, keyboard, and protected native surfaces

`applySafeInsets()` now applies safe space once to the normal content parent that contains the WebView and existing ad shell, plus the separate offline screen. Each listener retains the original padding, then adds system-bar/display-cutout insets on all four edges. Repeated inset delivery does not accumulate padding.

When the keyboard is visible, the code does not add its height or an extra bottom navigation reserve to the already resized viewport. The existing `adjustResize` handling remains. Intro and fullscreen video are root-level sibling overlays outside the normal-content padding, preserving their immersive presentation. Finishing the intro requests fresh insets for normal content.

The shared container's safe-area padding changes usable screen bounds; it does not change ad unit identifiers, adaptive-banner code, ad-slot layout definitions, consent/entitlement decisions, or creative sizing. Physical cutout/navigation-mode and keyboard combinations still need to be judged from the actual device evidence. A passing Kotlin build alone is not proof that every Android size, manufacturer, or keyboard configuration is correct.

## Verification record

| Evidence | Result and scope |
| --- | --- |
| Original production app on a physical Samsung device | The testing owner reproduced Guide → system Home → launcher returning to Home. This supports the original `onNewIntent` defect. |
| QA native build including the no-reprompt guard, before the durable checkpoint correction | Testing owner reported successful build in **27 seconds**, successful replacement installation of the isolated QA package, and **36 JVM tests, 0 failures, 0 errors**. Suite counts: `GrowthReferrerParserTest` 11, `NativeLaunchPolicyTest` 10, `NativeNewsPolicyTest` 5, `PlayBillingPolicyTest` 5, `RewardedRequestPolicyTest` 5. This is not the build result for the subsequent process-death fix. |
| Final native build including the durable checkpoint correction | **Passed.** Testing owner reported a successful build in **56 seconds**, successful installation of the isolated QA package, and **40 JVM tests, 0 failures, 0 errors**. Suite counts: `GrowthReferrerParserTest` 11, `NativeLaunchPolicyTest` 14, `NativeNewsPolicyTest` 5, `PlayBillingPolicyTest` 5, `RewardedRequestPolicyTest` 5. |
| Process-death policy and runtime checks | The focused `android-startup-navigation-20261021` Node test file passed, including fresh-document filter/scroll reconstruction without private field/result contents. Four additional passing JVM cases cover absent-bundle launcher fallback, explicit-link precedence, presentation-URL sanitization, and unsafe destinations. |
| Final physical process-death and exact-scroll retest | **Passed.** With the final native QA APK and unchanged production Guide web assets, process **11650** was confirmed terminated before launcher reopening created **11895**. Guide `#chapter-9` / active index **8** remained selected; saved **200 CSS px** restored to **200 CSS px**. The document time origin changed as expected for actual recreation. See [the consolidated native evidence](device/final-native-evidence.json). |
| Final source guard: focused Node checks | `android-startup-navigation-20261021`, `android-app`, `installed-app-intro`, and `installed-intro-freeze-ownership` test files passed after the correction. Scoped diff checks passed. |
| Physical no-reprompt check after final installation | **Passed.** After the upfront denials, the tester tapped the Jonas microphone. UI inspection contained only the QA package `com.jonas.papercup.qa20261021`, with no permission-controller window; both microphone and coarse-location OS grants remained false. The route and document time origin were unchanged. |
| Initial two-permission QA run | Testing owner observed Portuguese rationale → approximate-location OS request → microphone OS request; both denied; Home usable. Startup preferences contained consumed intro version 55, seen/completed markers. |
| Physical keyboard after denial | Typing `QA layout draft` worked with the full Samsung keyboard. Input, Send, Close, and navigation remained reachable. This is physical evidence for the tested configuration, not every keyboard/device combination. |
| Current candidate UI on the physical QA WebView | Testing owner reported Home at 800 × 1145 CSS px and Guide at 800 × 1235 CSS px, both with horizontal overflow 0; header 126.667 px and dock 76 px remained within the measured safe area, with 0 intro DOM elements. These measurements used the current candidate shared-UI overlay; they are not a claim that the production website was deployed or that every device is covered. |
| Safe restoration and local refresh | Runtime tests cover filter allowlisting, delayed scroll, cancellation on input/navigation, no generated result, retained drafts on manual refresh, renderer rollback, local-only sources, and tap coalescing. |
| Earlier full web suite before the final denial-copy adjustment | The archived [pre-Activity full-suite log](validation/pre-activity/final-npm-test-20261021.log) records **2,653 tests passed, 0 failures**, in approximately 170 seconds. This historical run includes the native permission guard but predates the last web-only microcopy and later lifecycle corrections. The final broader run is recorded separately in the validation directory. |
| Final denial-copy runtime checks | Five focused test files passed: `native-microphone-copy-20261021`, `voice-live-dictation`, `android-voice-swipe-icon`, `kids-lumi-assistant`, and `performance-language-20261014`. They cover all 14 native messages, app-language precedence, draft retention, no settings/recognition retry, and unchanged browser/Kids behavior. Final cache/mirror/site checks are maintained by the integration owner in the validation directory. |
| Protected native diff review | Byte comparison against the baseline confirmed the listed build/ad/layout/Kids files below are unchanged. |

The principal implementation regressions are [NativeLaunchPolicyTest.kt](../../android-studio/app/src/test/java/com/jonas/papercup/NativeLaunchPolicyTest.kt), [android-startup-navigation-20261021.test.cjs](../../tests/android-startup-navigation-20261021.test.cjs), and [native-local-refresh-20261021.test.cjs](../../tests/native-local-refresh-20261021.test.cjs). The final broader web/cache execution is maintained in the [validation directory](validation/); its result must be taken from the completed log, not inferred from this native-only review.

### Saved screenshot interpretation

[tablet-final-upfront-permissions.png](device/tablet-final-upfront-permissions.png), 1200 × 1920 pixels, is the final native Portuguese rationale. It visibly describes optional microphone and approximate location, states that the corresponding feature starts only when chosen, and provides “Agora não” and “Escolher permissões”. The saved image was independently inspected for those details. A screenshot of the rationale alone is not proof of the subsequent OS grant/deny outcomes or of the later no-reprompt path.

[tablet-chat-keyboard.png](device/tablet-chat-keyboard.png) shows the deliberately entered fixture text `QA layout draft` and the Samsung keyboard with the conversation controls still visible. It contains no real private conversation and supports the tested keyboard configuration only.

[tablet-final-guide.png](device/tablet-final-guide.png) records the final candidate Portuguese Guide appearance on the physical tablet. The testing owner captured this with the candidate shared-UI overlay. It complements the native lifecycle evidence but is not the web-asset source used for the controlled exact-200-pixel restoration test, which deliberately kept the production Guide assets stable across process death.

[tablet-qa-first-launch.png](device/tablet-qa-first-launch.png) is an **earlier, superseded microphone-only rationale**. Its screenshot predates approximate-location setup and the corrected explanation of deliberate voice entry. It proves that the earlier native dialog rendered, not that the final two-permission text or no-reprompt guard was installed. [tablet-live-history.png](device/tablet-live-history.png) and [tablet-live-landscape.png](device/tablet-live-landscape.png) are baseline/live-device views, not blanket sign-off for the final candidate. Final physical screenshots/logs should be distinguished from these earlier captures.

## Protected scope and release limits

Read-only comparison against the baseline confirmed these files are byte-identical: adult/root Gradle build configuration, settings and Gradle properties, ProGuard rules, `activity_main.xml`, `AdMobController.kt`, `NativeRewardedBridge.kt`, `NativeNewsBridge.kt`, and `NativePlayBillingBridge.kt`. All **28 tracked files in `android-studio/kidsapp`** are unchanged, as is the bundled raw intro media asset. No native Kids behavior, ad inventory, billing implementation, signing configuration, or production package/version field was changed by this work. The existing adult exclusion of Kids routes remains.

The source changes are concentrated in adult `MainActivity`, the new pure startup policy and safe page-state script, first-run localized resources, manifest declarations for optional coarse location, and startup-preference backup exclusions. Shared web changes for native intro exclusion, local refresh, and microphone-denial copy keep their adult/native guards. The wider UI audit is reported separately.

Before a production Android submission, the release owner must use an authorized signing identity and a **new version code above the actual highest accepted Play version**, synchronizing the release-facing version markers. The source's unchanged version code 55 and a separately installed debug package are not a releasable update to the current production installation. The optional approximate-location use must also be reflected accurately in the applicable Play declarations and product privacy information. This audit does not certify those release-console steps, production Play delivery, notification capability, cross-device history synchronization, exhaustive Android hardware coverage, or recovery of arbitrary unsaved result/text state.
