# UI consistency — 15 October 2026

Status: implemented and verified locally. Owner explicitly approved publication and full Play production rollout on 15 October 2026. Publication is proceeding through the existing release gates.

Branch: `fix/ui-consistency-20261015` in `jonasdesouzajr-maker/matchapp.tv`.
Base: `def87419385d8355d1548c8012c0a29dbef55af4`.
Presentation implementation commit: `41cb70b`.

## Changes

- Equal-height existing adult Home shortcut rows, with the existing 8px gaps.
- Consistent Inter control labels, weight, line height and icon dimensions.
- Aligned premiere/weekly feature headings and descriptions; regular 16px content rhythm and 8px metadata/action gaps.
- Consistent feature actions: equal-height rows, 48px minimum touch height, sentence-case labels, matching corners, retained primary/secondary colors and saved-state behavior.
- Scoped motion timing and working OS/app reduced-motion preferences. Removed the old off-canvas shimmer from feature action buttons, which inflated Arabic RTL scroll bounds.
- Updated the shared stylesheet import and its cache versions on the 17 primary adult entry pages. Secondary pages continue using the same shared stylesheet; previously cached entry CSS can remain until normal revalidation.
- No matching, AI, speech, auth, payment, ad inventory, content, route, native Android resource or Kids product edits.

## Verification completed

- Final full local regression: **1,180 passed; 0 failed; 0 skipped**.
- `npm run build`: passed.
- `npm run audit:site`: passed; existing analytics/rich-result warnings remain; no technical errors.
- Dedicated rendered consistency QA: **70 cases**, 14 languages at 320/390/432/820/1440px. Equal shortcut heights, gaps, action bounds, readable labels, fold spacing and reduced motion passed.
- Existing navigation/spacing QA: **235 cases, no failures** across Home, Discover, Profile, Explore and Together. Existing menu, sound and Explore interactions passed.
- Existing global gold perimeter QA: **50 cases passed** at 320/390/820/1366/1920px, including isolated Kids pages.
- Android-specific CSS rendering: phone/tablet UA checks at 390/820px for EN/PT-BR/AR. This is desktop browser rendering of the actual Android presentation guard, not physical-device certification.
- Screenshots reviewed locally. External media/network requests are deliberately blocked in these layout fixtures, so placeholder/broken remote artwork and empty video frames are not evidence of production source failures or verified live artwork.

## Outstanding

1. Owner approval received. The shell push then failed because this environment has no GitHub credentials. Use the connected GitHub repository API to publish the reviewed branch; this is an authentication fallback after explicit owner approval.
2. After approval, push the existing feature branch. Open a PR and require the existing CI full regression/site/ad lock gates; preserve any newer main changes. Do not repeat completed local builds/tests unless relevant files change.
3. Merge once CI passes, verify the deployed SHA, then inspect the existing exact-deployment live smoke workflow and its original-art/real matching/Ask AI results. No live smoke was run for this unpublished patch.
4. Verify the normal installed Android app after deployment. A Samsung tablet was connected, but the production package `com.jonas.papercup` was not present in its package inventory and its activity could not be launched. Do not claim physical Android success. No emulator or new AAB is required for these web-only styles.

Local evidence: `artifacts/ui-consistency/`, `artifacts/ui-consistency-android/`, `artifacts/consistency-navigation/`; task logs are in the parent scratch directory. These rebuildable artifacts were intentionally not committed. Do not `git add -A`; unrelated `reports/midnight-latest.md` was produced by the regression suite.
