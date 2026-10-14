# Jonas premium presentation and focused Home handoff

Repository: jonasdesouzajr-maker/matchapp.tv
Integration branch: integration/jonas-premium-20261014
PR: https://github.com/jonasdesouzajr-maker/matchapp.tv/pull/240

## Implemented

- Existing adult Jonas controls receive scoped glass, breathing, hover expression crossfade and reduced-motion support. No second voice or metered chat implementation.
- Android ambient shell loads the same presentation; drag persistence overrides are scoped to the bubble, leaving the native wrapper unchanged.
- Original intro soundtrack extracted to an actual MP3; gesture/session guards prevent blocked autoplay or overlapping speech.
- Top Titles keeps its single native rail controller, with touch presentation temporarily free of smooth-scroll/snap friction.
- Focused Home: watch matching/results, Top Titles, Together, weekly choice and trending. Auxiliary sections are hidden with a scoped CSS override, preserving the publisher-owned source blocks and locked ad markup.
- Header and Explore hub route to dedicated destinations. `/music.html` reads the existing published chart/release blocks, retaining exact artwork, identities and official URLs. `/ebooks/` mounts the original matcher and shared quota controller; old reading bookmarks redirect there.
- Obsolete `patches/jonas-top-right-spacing.css` and `patches/jonas-pulse-fix.css` and their links removed.
- Sitemap generator includes Explore and Music. Existing awareness publication was merged; the derived worldwide guide was synchronized to its current URL manifest.
- Live smoke now visits the relocated reading/news hubs and verifies focused Home controls after match dismissal.

## Verification checkpoint

- Local: 1,095 tests passed; site/search audits have no errors. The final smoke-assertion-only change passed its dedicated regression guard.
- CI at product SHA 0a1089ff: website, Android compilation, CodeQL and AdSense lock passed. Intro and touch smoke passed (36 touch checks). Actual browser matching/AI audit passed 66 checks; the sole failure required the intentionally retired Home Ask box to remain visible after dismissing a result. Commit cb9c6b33 corrects that assertion to require Explore navigation plus the watch form and Top Titles; its full CI result must be inspected.
- Samsung tablet: SM-X236B, serial RXGL200HCRW. MatchApp Ai 1.1.52-debug installed separately from the older PaperCup/store v12 package. Candidate static assets were previewed through CDP with real backend routes; focused Home, zero horizontal overflow, a single in-viewport premium bubble, drag persistence and opening/closing the original chat passed before Android screenshot capture timed out. This is candidate evidence, not proof of deployed production.
- A local Gradle debug rebuild stalled and was stopped. A manual preview-only APK refresh was rejected by Android resource packaging validation and was not installed. Prefer the successfully built CI debug APK from Android run 38542704737, artifact MatchApp-Ai-Android-Jonas-Ambient-DEBUG-APK, tied to 0a1089ff. Re-sign only this DEBUG APK with the local debug key to retain installed test-app data. Never use debug signing for Play.

## Remaining release/design work

1. Inspect current branch, PR and CI state; continue from the verified checkpoint without repeating finished tests/builds unnecessarily.
2. Review the premium design on phone/tablet/desktop and the physical tablet APK, especially chat glass, avatar expressions, drag/resize/restore, touch velocity, menu wrapping, reading controls, Music covers/official links, and startup responsiveness.
3. Finish real device APK checks. Candidate-only preview must not be called a live deployed test. Chrome, Safari and production Android WebView intro-audio behavior still require verification.
4. Remove only confirmed superseded/unreferenced design files. Retain speech, auth, quotas, core matching, original source art, locked ads and serialized publisher workflows.
5. Once the exact PR head passes all gates, merge normally; wait for deployment-sha.txt to match and run the existing release smoke once for that deployed SHA. No force push or duplicate engines.
6. These changes do not require another AAB. The old store/native version and existing code52 release candidate remain a separate native publication task. No Play release was submitted by this handoff.

## Owner refinements on continuation
Home reserves a top-right corner for Jonas; other adult pages use the screen top-right default. The original drag controllers now also persist one shared position across pages/reloads. Chat bounds use visualViewport and safe-area insets independently of the bubble. The existing ambient shell is reused on adult page-shell destinations; embedded frames and Kids do not mount another assistant. The original native greeting/word-boundary speech path remains, with a larger conversation face and eye-only blink layer. Verify final-head CI and real-device bounds before claiming release.
