# Android owner QA — MatchApp Ai 1.1.51

This temporary draft PR intentionally modifies **documentation only** so the existing `pull_request` Android validation workflow builds an owner-test **debug APK**. **Never merge this PR for release.**

## Target
Source revision `e34375261baf3eeb0bf00a35ccd45dc239775d16`. Native `com.jonas.papercup` version 1.1.51 (code 51).

## Device QA
- Confirm the metallic purple/gold rounded app icon on Samsung launcher (after replacing existing debug build).
- Tap Jonas: check low-latency audible English greeting and automatic microphone handoff.
- Drag floating Jonas bubble slowly and rapidly across all edges. No stalls, phantom clicks, or freezes.
- Verify facial motions only when audio speaks; mouth crop transitions should not flash whole face.
- Check chat composer is compact, matches the purple/gold card style, and preserves credits/send/mic behavior.
- Top Titles: slow drag tracks the finger; a strong left/right swipe coasts correspondingly; arrows still work.
- Test sign-in, SMS, matching, Ask AI, AdMob/privacy, Kids browser isolation, and returning from background.

## Guardrails
Do not publish the debug build, expose signing keys, upload to Play, or change production monetization. The production bundle remains unsigned until owner approval after testing.
