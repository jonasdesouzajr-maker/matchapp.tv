# MatchApp Ai — Android and shared UI audit

**Date:** 21 October 2026  
**Baseline:** `0d4776ca9d1f99c27cb7f6e45c849c51bb4e0159`  
**Status:** source repairs implemented locally; final web/source integration gates, native build/JVM checks and the controlled physical process-restoration retest passed. **This report does not certify a production deployment or a Google Play release.**

The audit found concrete defects in native navigation, History capture, small-screen text layout, control sizing, localization, and image rendition selection. The candidate fixes preserve the approved visual identity and existing product engines while addressing those defects. Ordinary background/resume passed, but the first explicit kill/reopen test failed and prompted an additional durable-state correction. The rebuilt candidate then passed a controlled physical test: the QA process was confirmed terminated, a new process opened, and Guide chapter 9 plus the exact saved 200 CSS-pixel offset returned. Production signing/version preparation and distribution-dependent checks remain separate release gates.

The installed test application is an isolated **debug QA package, `com.jonas.papercup.qa20261021`, version code 55 / installed version name 1.1.55-debug**. The repository's unchanged release-facing version name is 1.1.55. The QA package does not replace the production app. Candidate shared web files were tested in the physical WebView through a developer response overlay; the public website was not deployed by this audit. See the detailed [native audit](NATIVE-AUDIT.md) and [physical evidence](device/physical-evidence.json).

## 1. Requirement-by-requirement result

| Requirement | Confirmed problem | Candidate adjustment | Verification and remaining limit |
| --- | --- | --- | --- |
| Layout, spacing and responsiveness | Jonas had a small face without a persistent explanatory label; some controls were undersized; translated dock labels split inside words; Guide rail rules and several local layouts conflicted. | Reserve measured header space, enlarge and label Jonas, repair visible filter labels, scope touch-area and wrapping fixes, and let the dock use a measured second row when necessary. | Final 13-route/four-width matrix has no document overflow; targeted expanded-state and localization checks supplement it. This is a finite matrix, not every screen/device/state. |
| Native refresh and navigation | Pull-to-refresh called `web.reload()`; a data-less launcher intent routed to Home; normal resume alone did not cover process death. | Disable destructive native pull-refresh, resume the current document on ordinary launcher re-entry, add an in-place local refresh adapter, and restore allowlisted presentation state after recreation/process death. | Physical pull and ordinary resume retained the document; in-place refresh retained route, filter and scroll. Initial process-death test failed; the final same-assets retest restored chapter 9 and **200 → 200 CSS px** in a new process. A new Android VIEW link correctly opened Explore. |
| How It Works and History | Guide density rules interfered with chapter navigation; untranslated microcopy and redundant headings remained; History could save a hidden placeholder title or classify an AI question as a title. | Keep the existing chapter handlers, localize Guide presentation, remove only redundant duplicate text, require a real visible result for capture, and restrict portfolio AI-title records to the existing title-producing source. | Guide route/chapter checks, History regressions, physical navigation, localized screenshots and explicit-click tab-scroll tests. Old saved placeholder rows are deliberately not auto-deleted. |
| Intro sound | Web and native startup ownership could cause intro replay beyond the intended launch/update event. | Native is the sole intro owner in Android; persist consumed installed version before playback; verify actual Play update provenance before rearming. | Policy/runtime tests and stored native markers support the logic. **No audible-listening verification and no real Google Play update installation were performed.** |
| Jonas onboarding | The launcher did not clearly identify the AI or invite interaction. | Larger face plus persistent, authored “Jonas · AI assistant” / “Tap to talk” equivalents in all 14 supported languages; measured drag bounds include the label. | Header matrices and physical tablet screenshots. Existing single chat/speech engine and deliberate dragging remain. |
| First-launch permissions | Permission requests could appear later when features were entered. | One optional first-launch setup for microphone and approximate location; record completion/decline; subsequent denied access explains app settings without reopening an OS prompt. | Physical Portuguese rationale and both denied OS requests; subsequent microphone tap did not reprompt. Successful granted transcription/location delivery remains outside the recorded device run. |

## 2. What was actually tested

### Physical Android and live baseline

The physical device was a **Samsung SM-X236B running Android 16**. The original production app reproduced Guide → Android Home → launcher → app Home, establishing the launcher-reset defect. The isolated candidate then demonstrated ordinary resume retaining the Guide chapter, URL, scroll and document time origin. The initial process-death experiment was separate and failed; those two results must not be conflated. [Native investigation](NATIVE-AUDIT.md)

The final native build completed in **56 seconds**, with **40 JVM tests, zero failures and zero errors**, and was installed as the isolated QA package. In the controlled physical kill/reopen test, process **11650 → no running QA process → 11895** confirmed actual process recreation. With the same production Guide web assets before and after, `how-it-works.html#chapter-9`, active chapter index **8**, and the deliberate in-range **200 CSS px** scroll position were restored exactly. The document time origin changed, as expected for a recreated WebView. A subsequent explicit Android VIEW link opened Explore, demonstrating that the new destination overrides saved state. [Final native evidence](device/final-native-evidence.json)

An earlier post-fix test moved from candidate overlaid web assets to production web assets after the process died. It retained the route and chapter, but changed content/header dimensions prevented a meaningful exact-offset comparison. The controlled same-assets test above establishes the exact 200 px result; the final candidate screenshot separately establishes its visual appearance. This distinction prevents the native recovery test from being mistaken for a production deployment or a candidate-overlay persistence guarantee.

Saved candidate measurements include Home at **800 × 1145 CSS px**, Guide and Explore at **800 × 1235 CSS px**, and rotated Explore at **1280 × 755 CSS px**. Each recorded zero horizontal document overflow. Explore rotation retained the document time origin. The measured Home/Guide header was about 126.7 px, the dock about 76 px, and Jonas occupied a reserved 252 × 84 px header area on the tablet. [Device measurements](device/physical-evidence.json)

Physical Profile pull gestures preserved the URL and document time origin. A local refresh returned success while keeping the exact `#activity-panel` route, document time origin, scroll position and selected filter. With microphone and approximate location denied, an explicit Jonas microphone tap did not reopen Android's permission controller. A typed fixture remained usable with the Samsung keyboard; Input, Send, Close and navigation remained reachable. These are observations of this device/configuration, not every keyboard or Android version. [Device measurements](device/physical-evidence.json)

The final microphone probe was checked after a two-second settle: the native bridge was present, the microphone had returned to its non-listening state, and the Portuguese Android app-permission explanation plus typing alternative were displayed. No OS permission prompt reopened; microphone and coarse-location grants remained false. The physical History tab click selected History and exposed its beginning: panel top was **524.604 px**, below the **126.667 px** header. The document was at its verified maximum scroll, **822 px = 822 px**, so the visible beginning could not be aligned higher without artificial blank space. This confirms the document-end clamp rather than a failed tab activation. [Final device evidence](device/final-native-evidence.json)

| Representative physical evidence | Interpretation |
| --- | --- |
| [Candidate Home](device/tablet-candidate-home.png) · [Explore](device/tablet-candidate-explore.png) · [landscape](device/tablet-candidate-landscape.png) | Actual QA WebView displaying candidate web responses, not a production website release. |
| [Final Portuguese Guide](device/tablet-final-guide.png) | Final candidate UI on the physical tablet using the developer overlay. The exact process-death offset test used stable production Guide web assets instead. |
| [Final upfront-permissions rationale](device/tablet-final-upfront-permissions.png) | Final native Portuguese explanation of optional microphone and approximate location. Subsequent OS denial/no-reprompt results come from the device record, not this image alone. |
| [Chat with Samsung keyboard](device/tablet-chat-keyboard.png) | Real keyboard geometry with deliberate test text, not a private conversation. |
| [Baseline History](device/tablet-live-history.png) · [baseline landscape](device/tablet-live-landscape.png) | Earlier production observations; not final-candidate sign-off. |

The earlier `tablet-qa-first-launch.png` is a **superseded microphone-only rationale** and must not be used as evidence of the final two-capability setup. The initial device toast also predates the Android-specific permission wording; the final settled microphone probe and runtime tests provide the evidence for that corrected message. [Native evidence interpretation](NATIVE-AUDIT.md)

### Local rendered browser checks

The [final broad browser report](browser-final/report.json) contains **52 cases: 13 routes at 320, 390, 800 and 1366 CSS px**. It covers Home, Guide, Profile, Explore, Discover, Ebooks, Cooking, Music, News, Events Archive, Together, Friends and Pricing. All 52 returned HTTP 200, with zero captured runtime errors and zero horizontal document overflow. External services were blocked in local rendering checks; these results do not verify live AI answers, account synchronization, checkout, remote posters or provider availability.

The initial-state scanner also reported **44 overlapping control pairs, 11 blocked centers, 106 outside rectangles and 52 text-clipping flags**. Those raw diagnostics remain in the evidence. Inspection identified decorative Jonas-face clipping, offscreen items inside a horizontal title rail, closed Discover-sidebar controls, an intentional desktop carousel arrow overlay, and ordinary scrollable content crossing the fixed dock at the initial scroll position. The last category includes Home match controls, Guide chapter links and some Pricing/Ebooks/Cooking controls; it requires scrolling to expose the action. The report is therefore **not a claim that every control is unobstructed at every scroll position**. Targeted open-state and end-of-document checks provide the relevant interaction evidence. The scanner's small-target threshold is 43.5 px; its zero small-target count is not itself proof that every control is 48 px. [Harness](../../tools/qa-android-ui-20261021.cjs)

A dedicated Home follow-up at **320 and 390 × 900 CSS px** reproduced the initial dock obstruction and then verified reachability without invoking a match or spending credits. Scrolling the primary CTA into the space between header and dock made its full 48 px target visible and its center hit-test pass. At maximum document scroll, the last normal-flow control, Privacy and cookie settings, also remained inside that safe interval and hit-testable. Both cases passed; this resolves Home reachability while preserving the initial-state observation. [Home reachability evidence](validation/home-reachability-20261021.json)

Additional focused evidence:

| Check set | Recorded scope and result |
| --- | --- |
| [Header/component matrix](matchapp-ui-verified.json) | 240 checked combinations; recorded checks passed. Widths 320–1280, several font scales including 1.4, and coverage of all 14 supported locales. The file also contains a separate navigation probe. |
| [Route geometry](matchapp-ui-final-geometry.json) | 60 Home/Guide/Explore cases at 320–800, English/Portuguese and font scales 1/1.4; recorded geometry checks passed. |
| [Expanded surfaces](remaining-final/report.json) | 16 focused phone/tablet cases covering Profile, Discover, Ebooks, Cooking, Music, Friends and Pricing; recorded checks passed. |
| [Support/dialogs](support-final/report.json) | 36 states across phone, tablet, maximum font, Portuguese, Arabic and short landscape; fixed panels stayed within the measured viewport. |
| [Dock](dock-final/report.json) | 35 rendered cases; original five anchors/icons retained, targets at least 48 × 48, complete words preserved and measured dock clearance reserved. |
| [Guide microcopy](guide-microcopy/report.json) and [footer](guide-microcopy-footer/report.json) | Portuguese tablet and Portuguese/Russian 320 px at font 1.4; localized labels, duplicate suppression, intact footer words and dock clearance. |
| [Activity](activity-language/report.json) | Three Portuguese fixture cases: 800 px, 320 px and 320 px/font 1.4. No page or record-text overflow; all six measured delete targets 48 × 48; stored fixture bytes unchanged. |

These sets overlap and span successive repair stages; their counts should not be added into a claim of distinct fully tested devices. The final broad run saved JSON, not a fresh screenshot of every route. Targeted screenshots are labeled by their own stage.

## 3. Layout, hierarchy and navigation repairs

### Jonas, header and filters

The persistent header now reserves space for the entire Jonas launcher and its explanatory text. The face is normally 84 px, reducing to 76 px on the narrowest phones; the label remains visible at rest. At wider sizes the launcher becomes a horizontal unit rather than consuming unnecessary vertical space. Below that, the brand and controls use bounded rows that keep selected font scaling. Drag clamping uses the actual full launcher rectangle, including its caption, and the remembered deliberate position and return-to-header path remain intact. [Header styles](../../patches/reference-header.css) · [header behavior](../../patches/reference-header.js)

The previous filter wrapping patch targeted a label that was not the visible disclosure caption. It now targets `.crit-toggle-label` and the actual summary presentation. A legacy Home height rule was also overriding the hero's intended layout; the scoped repair restores its usable height and the How It Works hit area. [Filter repair](../../filter-wrap-fix.css) · [Home styles](../../patches/reference-home.css)

### Dock labels and actual bottom clearance

At 320 px with the 1.4 font preference, padding inside nested capsules left too little width for whole translated words. The dock now allocates intrinsic column widths with smaller internal gaps/padding. If five readable minimum widths cannot fit, measured layout selects a balanced **three-plus-two** arrangement. It preserves requested font sizing, all five destinations, vector icons, ordering, handlers and existing feedback. The measured rendered height updates page-bottom clearance, so a second row does not silently cover the end of the page. [Dock styles](../../patches/reference-dock.css) · [layout behavior](../../patches/reference-dock.js)

English, Portuguese and Arabic stayed in one row at 320/font 1.4 in the recorded fixtures. Japanese, Russian, German and Indonesian needed the second row. Wider landscape/tablet cases returned to one row and restored the appropriate narrow layout after resizing back. [Portuguese phone](dock-final/pt-320x640-font1.4.png) · [Russian phone](dock-final/ru-320x640-font1.4.png) · [Arabic landscape](dock-final/ar-640x360-font1.4.png)

The Linux runner lacked CJK fonts. For Japanese/Chinese/Korean dock labels only, the test used a temporary official Noto CJK face without changing production or system fonts. Other text in those screenshots may contain missing glyphs. Hindi has local geometry evidence only. These are not certifications of every Android font. [Exact method and font hash](dock-final/audit-method.md)

### Quiet secondary actions, usable primary controls

Donate and Support now use small, subdued visible capsules inside accessible touch areas: approximately 30–32 px visual height within a 48 px target, without the prior attention-seeking animation. Footer sponsorship, founder support and Copy brief receive the same secondary hierarchy. Matching, chat, primary payment and submission actions retain their emphasis. A pale-text inheritance problem on sponsorship controls was corrected without changing destinations or recipients. [Support styles](../../patches/reference-support.css) · [header shortcut styles](../../patches/reference-header.css)

Scoped fixes also cover Home More Filters, Profile summaries/History removal, Ebooks source actions, Cooking controls, Friends sign-in and visible Pricing actions. Profile range controls keep a slim gold track within their larger interaction area. Music was missing its existing billboard stylesheet, causing oversized graphics and broken organization; restoring that stylesheet plus narrowly scoped spacing/link fixes repaired the expanded view. Monthly/annual Pricing visibility and actual action handlers remain. [Page styles](../../patches/reference-pages.css) · [Music](remaining-final/music-expanded-390.png) · [Ebooks](remaining-final/ebooks-actions-390.png) · [Pricing](remaining-final/pricing-annual-390.png)

Donation collapse/reopen preserved an entered `12.75` fixture amount. Short-height auth retained a reachable Close control via its bounded internal scroll; custom confirmation still dismissed with Escape. No donation, purchase or sign-in transaction was submitted. Reduced-height browser fixtures simulate less available space; the separate Samsung screenshot supplies the actual keyboard evidence. [Donate phone](support-final/donate-open-320-640-en-1.4.png) · [short auth](support-final/auth-focused-short-640-360-en-1.png) · [localized Discover tools](support-final/discover-tools-390-800-pt-1.4.png)

## 4. How It Works, History and Activity

### Guide behavior and language

Home and Explore use the actual Guide route. Its chapter list was being altered by the generic density balancer; the Guide list is now excluded from that transformation. Chapter navigation, Next/Back/Finish and existing handlers remain. Header offsets are applied once rather than doubled, desktop sidebar height accounts for persistent chrome, and Guide controls have 48 px targets. [Density exception](../../patches/reference-density.js) · [Guide styles](../../patches/premium-journey-20261014.css)

The Guide now has authored chapter presentation for all 14 supported languages. The final physical Portuguese review exposed English “FIELD GUIDE,” “DISCOVERY,” legal footer labels and the rights statement; the Guide's existing language owner now paints those nodes as well. Brand, year, links and chapter state are preserved. A translated hook was repeating the exact chapter title, so only that redundant semantic duplicate is hidden; a distinct original English hook is restored when switching back. The chosen-language setting remains authoritative. [Guide script](../../patches/premium-journey-20261014.js) · [microcopy method](guide-microcopy/audit-method.md) · [Portuguese chapter](guide-microcopy/guide-pt-800-chapter1.png)

**Document-end scroll clamp is expected.** The shared section-navigation helper brings a revealed section below the measured header when the document has enough scroll range. A chapter close to the page end cannot align exactly at that position without adding artificial blank height; the requested scroll is clamped to the document's natural maximum. The physical chapter-9 end position must be interpreted on that basis. The relevant checks are that content/actions remain reachable and clear the dock, not that every chapter can occupy the same top coordinate. [Shared helper](../../patches/activated-scroll.js) · [browser scroll fixture](validation/activated-scroll-browser.json) · [footer clearance](guide-microcopy-footer/report.json)

The helper also handles actual nested vertical scrollers, reduced motion, disabled auto-scroll preference and cancellation after user input. Explicit Profile tab clicks now reveal and scroll to the selected panel, including dynamically inserted Not For Me. Programmatic switching, hydration and local refresh do not force a scroll or focus a text field. [Portfolio integration](../../portfolio-history.js) · [tab-scroll tests](../../tests/profile-tab-scroll-20261021.test.cjs)

### History accuracy and contrast

Two capture paths produced misleading records. `shown-history.js` could fall back to static `#res-title` markup even when the result was hidden. It now requires an actual match title and connected, visibly rendered result, including visibility checks on ancestors. Discover capture similarly requires visible result cards. Portfolio aggregation previously treated every AI activity event as a title; it now accepts only records from the existing `ask-ai` title producer. User questions remain in Activity. [Capture repair](../../shown-history.js) · [portfolio repair](../../portfolio-history.js) · [regressions](../../tests/history-visible-records-20261021.test.cjs)

**Old placeholder data is not automatically deleted.** An existing bad row can still appear because it was already stored before the fix. The repair stops new false records; it does not guess which historic user records to erase. Removal remains an explicit user action. This explains the legacy row observed on the physical Profile screen.

The gold “Find where to watch” action inherited pale text through both `color` and `-webkit-text-fill-color`. Computed contrast was **1.08:1**. A scoped dark-ink override restores **10.87:1** against the unchanged gold background, verified at 390/800 in the default palette and at 390 in Sunrise. Label, destination and handlers are unchanged. [Before](history-contrast-before/report.json) · [after](history-contrast-after/report.json) · [screenshot](history-contrast-after/history-primary-390-aurora.png)

### Activity presentation

Activity's empty message, ten event-type labels, count, relative time, filter/delete accessibility text, clear confirmation and toast were English-only. A small authored dictionary now covers all 14 locales through the existing language preference/event. `Intl.RelativeTimeFormat` and `Intl.NumberFormat` format time/count; an unreadable legacy timestamp cannot crash the list. Record content, metadata, capture, filtering, retention, storage and cloud behavior remain unchanged. Original titles/questions and pre-existing machine-record text are not rewritten. Clear All retains confirmation and cancellation performs no deletion. [Activity implementation](../../activity.js) · [six focused behavioral tests](../../tests/activity-language-20261021.test.cjs)

Populated Activity revealed 24 × 24 delete buttons. The scoped repair provides **48 × 48** interaction areas while keeping a quiet 24 px visible mark. On narrow screens the timestamp moves below the detail, and text wraps intact. The final populated Portuguese fixtures confirm this at 320 and 800, including font 1.4, without modifying stored rows. [Method](activity-language/audit-method.md) · [phone](activity-language/activity-pt-320-font1.4-records.png) · [tablet](activity-language/activity-pt-800-font1-records.png)

## 5. Native navigation, sound and first-launch permissions

The full implementation and security boundaries are documented in [NATIVE-AUDIT.md](NATIVE-AUDIT.md). The operational decisions are:

1. **Refresh current local presentation.** The native shell no longer maps a downward gesture to `web.reload()`. Manual Update uses `MatchAppLocalRefresh.refresh({reason:'manual-update'})` for safe, already-visible Activity/portfolio renderers. It coalesces taps, preserves route/focus/scroll/filter, restores prior content on failure and leaves drafts, busy interactions, hidden sections and static pages intact. It does not regenerate matches, debit credits or claim a backend synchronization. Explicit navigation and network recovery still load their intended documents. [Adapter](../../patches/native-local-refresh.js) · [Update integration](../../app-updates.js)
2. **Resume and restore safely.** Ordinary launcher re-entry resumes the existing document; a new explicit deep link takes precedence. Recreation restores bounded, allowlisted route/filter/language/scroll state. After the initial process-death failure, source now synchronously commits a small durable checkpoint on pause/stop, excluded from backup and transfer. It validates exact HTTPS site hosts and excludes unsafe/auth/payment/private routes and token-bearing input. It does not persist arbitrary chat drafts, passwords, result HTML or a private back-stack. Recovery is therefore presentation recovery, not a promise to reconstruct every transient result.
3. **Consume intro eligibility before playback.** Fresh app data gets one native attempt. The same installed version does not rearm. A later version rearms only when Android API 30+ reports the actual initiating package as Google Play. Unknown/sideload provenance fails closed; API 24–29 cannot prove that update origin and therefore suppress update-triggered replay. Skip, failure or interruption consumes the attempt. Website cache versions and ordinary button clicks cannot rearm it. Clearing app data/reinstalling creates fresh state. The bundled media and existing web-only ownership outside native remain separate. [Native policy](../../android-studio/app/src/main/java/com/jonas/papercup/NativeLaunchPolicy.kt) · [native web-intro guard](../../patches/jonas-intro-audio.js)
4. **Request the capabilities the app currently uses.** First-launch setup offers optional `RECORD_AUDIO` and `ACCESS_COARSE_LOCATION`, explaining voice conversation and nearby cinemas in the selected language. No fine/background location or invented push-notification permission is added. Existing normal network/billing permissions are not additional runtime prompts. Grants do not immediately start recording or location lookup. Skip/decline completes setup; later denied use returns a localized explanation and typing remains available. The Android denial copy now points to app permissions rather than browser settings. [Native activity](../../android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt) · [voice copy](../../voice-input.js)
5. **Use one safe-area owner.** Normal content and offline UI receive non-accumulating system-bar/cutout padding. Existing `adjustResize` handles the keyboard without adding its height twice. Intro/fullscreen video remain outside that normal-content inset owner. The physical Samsung test supports the recorded configuration; varied cutouts, system navigation modes and keyboards remain coverage limits.

The sound eligibility policy has JVM/runtime tests and observed preference markers, but **neither audible intro output nor an actual Play-delivered update was verified**. The permission run verified denial and continued usability, not granted microphone transcription or a real approximate-location result. These must remain explicit limitations.

## 6. Artwork sharpness, ultrawide layout and transfer cost

The media repair preserves the existing photographs. Eight Explore images have responsive AVIF variants derived from their recorded original sources; none was invented or enlarged beyond source detail. The hero's recorded original is 3506 × 2329, compared with the prior 1400 × 930 fallback. The provenance manifest records dimensions, original URLs, hashes and compatibility fallbacks. [Source manifest](../../assets/cinema/explore-responsive-sources.json)

Explore previously stretched its hero to 3840 and 12,288 CSS px. A **1400 px content/art cap** now keeps imagery and reading width bounded on ultrawide viewports, with the surrounding background still filling the screen. The common phone/tablet/1366 layouts retain their widths. This is an ultrawide layout solution, **not a claim of native 12K photography**. Density-aware assets provide genuine source detail where available. [Explore styles](../../patches/reference-explore.css)

The [before](rendering/source-quality-before.json) and [after](rendering/source-quality.json) matrices each contain **12 cases: Home and Explore at six viewport/DPR combinations**, all with zero measured horizontal overflow. Recorded Explore decorative-art transfer totals are:

| Viewport width / DPR | Before | Candidate | Change | Candidate hero rendition |
| --- | ---: | ---: | ---: | --- |
| 390 / 1 | 908,758 B | 191,558 B | 78.9% less | 700 px AVIF |
| 390 / 3 | 908,758 B | 666,121 B | 26.7% less | 1400 px AVIF |
| 800 / 1.5 | 908,758 B | 547,525 B | 39.8% less | 1400 px AVIF |
| 1366 / 2 | 908,758 B | 1,550,882 B | **70.7% more** | 2800 px AVIF |
| 3840 / 1 | 908,758 B | 547,525 B | 39.8% less | 1400 px AVIF; art capped at 1400 CSS px |
| 12,288 / 1 | 908,758 B | 547,525 B | 39.8% less | 1400 px AVIF; art capped at 1400 CSS px |

Totals sum the recorded `/assets/cinema/` resource transfers, including the small decorative SVG and response overhead. The higher-density 1366/DPR2 case deliberately spends more bytes on original detail; this audit does not describe every case as faster. Home's existing lossless city image remains approximately **1.326 MB transferred** in these fixtures, unchanged before/after, and remains a concrete future performance-budget opportunity.

Responsive TMDB poster recovery now retains the original same-artwork `srcset`/`sizes` intent and restores it after viewport changes instead of leaving a recovered image pinned to a small rendition. Tracking is bounded and near-viewport work avoids eagerly fetching every offscreen poster. [Poster handling](../../catalog-media.js) · [resize regression](../../tests/responsive-poster-resize-20261021.test.cjs)

Local resource timings are **not field LCP, mobile-network load times or a physical 12K display test**. External TMDB images were blocked in the lab; `naturalWidth: 0` for those requests is not evidence that production artwork is missing. The next performance gate should use representative real-network and lower-memory Android conditions, with explicit image/latency budgets.

## 7. Validation checkpoints and remaining release gates

### Checkpoint ledger

| Gate | Recorded status |
| --- | --- |
| Prior full web suite | **2,653 passed; 0 failed/skipped/cancelled**, approximately 170 seconds. This predates the last Activity/tab-scroll/durable-state changes; preserved as [pre-Activity suite evidence](validation/pre-activity/final-npm-test-20261021.json). |
| Prior site audit | Passed with `NODE_OPTIONS=--max-old-space-size=6144`; the default 2 GiB audit runner had exhausted its heap while retaining many page DOMs. This is a tooling-memory condition, not a demonstrated app crash. [Prior result](validation/pre-activity/final-site-audit-20261021.json) |
| Focused regressions | Header, Guide language, dock layout, History capture, Activity, native refresh, explicit tab scrolling, microphone copy and responsive posters have dedicated tests. [Tests directory](../../tests/) and [validation evidence](validation/) |
| Final 52-case rendered matrix | Completed; no document overflow or captured runtime errors. Diagnostic limits are stated in Section 2. [Result](browser-final/report.json) |
| Native build before durable-state correction | QA build/install succeeded; **36 JVM tests, 0 failures/errors**. This must not be represented as the build result for the later process-death correction. [Native record](NATIVE-AUDIT.md) |
| Latest full suite | **2,670 passed across 9 suites; 0 failures, skips, cancellations or todo**, in 181.897 seconds; completed 19:47:37 UTC. This run includes final Activity, Guide/footer, microphone copy, Profile tab-scroll and durable-checkpoint source changes. [Run metadata](validation/final-npm-test-20261021.json) |
| Latest site audit | **All four stages passed**, exit 0 in 36.586 seconds; completed 19:48:32 UTC. Site/asset checks covered 3,581 files, including 1,520 HTML and 775 JavaScript files, plus 2,154 external URL references. Public/search/readiness checks covered 266 URLs; no issues, readiness errors, missing sitemap routes or noindex routes in the sitemap. [Run metadata](validation/final-site-audit-20261021.json) |
| Final native rebuild | **Passed in 56 seconds; 40 JVM tests, 0 failures/errors**, including the durable checkpoint correction. Final isolated QA APK installed; production version/signing unchanged. [Native record](NATIVE-AUDIT.md) |
| Final physical process-death retest | **Passed:** PID 11650 confirmed gone before PID 11895 reopened. With identical production Guide web assets, chapter 9 / index 8 and **200 CSS px → 200 CSS px** were retained; document time origin changed as expected. Initial failed test remains documented. A new explicit VIEW link opened Explore. [Final evidence](device/final-native-evidence.json) |

### Remaining actions before a release claim

1. **Retain the passed integration baseline.** The latest full web/site gates, native build and controlled physical restoration test are complete. If subsequent release preparation changes production source or generated references, rerun the affected required checks and identify that new checkpoint rather than reusing these counts.
2. **Prepare an actual release artifact.** Use the authorized production signing identity and a new version code above the actual highest Play-accepted version; synchronize release-facing markers. Debug version 55 is not a Play update. Reflect optional approximate-location behavior accurately in the applicable product/privacy/Play declarations. No console submission is certified here.
3. **Verify distribution-dependent behavior.** A controlled real Play update is needed to prove the update-triggered intro path, alongside audible-output/skip checks. Grant paths for voice/location and revocation through Android settings need their own device evidence.
4. **Retain coverage boundaries.** Test representative additional phones/cutouts/navigation modes, TalkBack and large-text/keyboard combinations before asserting broad accessibility/device sign-off. Live auth, provider links, account/cloud synchronization, payments and backend quality were not exercised by external-blocked fixtures.

### Finite follow-ups retained without broadening the final repair

The final search audit retains **31 notices identical to the baseline**: 25 missing existing analytics-container notices and six application rich-result eligibility-field notices. No review/eligibility data was fabricated to silence them. Focused cache, Guide, voice and tab-scroll gates overlap the full suite and are not extra unique-test counts. Exact timestamps, audit stages, notices and integration repairs are recorded in the [final regression summary](validation/final-regression-summary-20261021.md).

The current [News index](../../news/index.html) still labels some BBC Science/BBC World cards as “Entertainment” through `data-news-ui-event`, even while their source note describes world news. This is a presentation/data-classification follow-up for the existing editorial owner; no new scheduler or content rewrite was introduced. Home's approximately 1.326 MB decorative transfer and the higher-density Explore transfer increase warrant measured performance budgeting. Existing stored History placeholders remain subject to explicit user removal, not automatic cleanup.

## 8. Preserved contracts and review boundaries

The work preserves the matching/recommendation algorithms, credit and billing semantics, payment recipients, original five dock destinations, single Jonas chat/speech owner, provider-only account photos, chosen language/font settings, original photographic identity, zero outer gold frame, and approved capsule presentation. Ad inventory, IDs, placement geometry, consent behavior and protected ad tests were not redesigned. No new editorial scheduler was introduced. Cache references and relevant generators were updated to serve changed assets consistently; that is not evidence of publication.

The native audit records byte-identical baseline comparisons for the adult/root Gradle configuration, settings/properties, ProGuard, `activity_main.xml`, ad/reward/news/billing bridge files, **all 28 tracked Kids Android files**, and the bundled intro media. Shared new native-only logic retains adult/origin guards. [Protected-scope evidence](NATIVE-AUDIT.md)

This is a source-backed audit with representative rendered and physical evidence. It establishes which defects were found and repaired, which behaviors were exercised, and which release claims remain unproved. It intentionally does not label every screen perfect, every historical record accurate, every photograph 12K, or the candidate deployed.
