# Lumina Match — permanent product and release rules (owner, 2026-10-29)

Scope: standalone Android app `com.jonas.luminamatch` AND the browser game embedded at `matchapp.tv`. Do not change MatchApp Ai's matching engine, Kids, protected branding, unrelated advertising, account authentication or billing.

## Non-negotiable presentation rules
- **No scrolling of any kind in the game** on smartphone portrait/landscape, tablet, desktop, and in the full-width embedded browser overlay, including menu, levels, gameplay, pause, results, tutorial, audio settings, registration and friends screens. Every button, guide and game card must remain visible and reachable; clipping controls is not a valid substitute for scrolling.
- Adaptive layout and card size must make every card visible without scroll. Scale or reorganize the grid to fit the available space; never silently remove pairs, change results or create a hidden page. Keep comfortable hit targets where physically feasible; test very small screens and zoom/accessibility.
- Buttons are consistent compact premium **pills**: same touch height, typography, spacing, radius, and grid alignment, no isolated orphan item, overlap, cut-off text or oversized unnecessary whitespace. All strings wrap gracefully in all 14 browser languages and in native English/pt-BR. Respect OS font scaling, device safe areas, keyboard focus, screen readers and reduced motion.
- The main menu must have a visible **Beginner's Guide / Guia para iniciantes** button opening a short interactive practice level, not altering stats/progress, showing no advertisements, and dismissible without leaving the game.
- Brazilian Portuguese must translate **every in-game UI element** in Android (not just Play listing); browser language follows the selected MatchApp language. Every translation must be natural, tested and not revert unexpectedly.
- Keep all Android and web styles consistent with the game's approved violet/gold/turquoise card artwork and no unauthorised changes to parent MatchApp Ai design.

## Advertising and player trust
- **Automatic interstitial ads only after each five newly beaten campaign levels** (5/10/15/...), never after each level, on retry/replay, loading/splash, exits, menus, tutorial, guest save, or navigation. Frequency should not exceed one interstitial per 5 newly cleared levels. Ads never cover gameplay/card interaction; no forced or stacked ads.
- Rewarded ads only by a visible, voluntary request. Award reward only on verified SDK reward callback; cancellation/no-fill/error must keep the game playable and must not grant false rewards or block navigation.
- For Android use existing approved AdMob and UMP consent/test-ad configuration. Do not introduce live test clicks, change revenue recipients or paid settings. For browser game advertising remains disabled until actual AdSense approval, consent, and approved placement are verified. Do not invent ad slots or treat parent-site Auto ads as game ads.
- Reserve appropriate full-screen/transition surfaces for interstitials only between rounds, never in overlays that block controls. No intrusive banners that crowd small screens.

## Release gates
1. Source for the **current installed production/testing build** must be verified; do not publish the historical Android version 1.0 project over Play test build 2.3 (code 8, with 350 in-game stages).
2. Preserve current Play tracks, tester memberships, existing listing drafts, signature, application ID, version monotonicity and entitlement/Play Games project configuration. Never fabricate Play Games IDs or claim achievements/leaderboards work before tested in linked Console project.
3. Run tests: every 5-level difficulty boundary and first-clear ad trigger, repeated/replayed wins and duplicate taps, rewarded ad cancel/no-fill/award, timer loss, full campaign reachability, responsive layouts at portrait/landscape and accessibility font sizes, registration/guest saves, and all languages.
4. Test with real attached devices and screenshot/QA for smartphone, tablet, browser. Record any unverified surfaces. Signed AAB must compile and pass device checks; check Play Console production eligibility and live status separately.
5. Publish only verified changes; report **prepared, tested, submitted, in review, approved and live** separately. A green READY sign-off requires verified gates; no premature claims.

Last known facts: a current Play Console listing batch was sent for review on 2026-10-29, while Play production still displayed **Inactive** and **Apply for access to production**. This does not mean the current Android build was updated. An isolated patch from historical v1.0 lives at `E:\MatchAppWork\lumina-native-ads-difficulty-20261029` and MUST NOT be uploaded as-is. Browser UI work is isolated in its own Git branch and should have complete automated and visual verification before merging.

## Owner refinement - 2026-10-29: premium pills and device rotation
- Replace the existing game action pills visually with bounded palette waves, a fine outline, consistent typography and press/focus effects. Preserve their existing callbacks, disabled states and destinations; do not duplicate controls.
- Apply the treatment inside the isolated browser game and native Lumina Match, with reduced-motion and forced-colors support.
- Native smartphones are portrait-only. Tablets (smallest width at least 600dp) retain user-controlled rotation and fully fitted portrait/landscape screens. Do not change the device-wide auto-rotation preference.
- The owner explicitly authorized reconstructing the missing native project from the available source, correction module and installed game. This supersedes the missing-current-source restriction for that reconstruction; signing, feature-parity/device QA, track preservation and truthful publication gates remain required.

## Owner studio opening — 2026-10-30
- Use the exact studio credit **Adv_Dev_Ops by Jonas Junior**, with bold typography, a smooth dark background, restrained animation and a short automatic fade before the existing Lumina intro video. Keep the video's original audio, accessible localized Skip action and normal game entry.
- Keep studio gestures and video audio separate from gameplay audio. Respect reduced motion, large text, safe areas and foreground/background transitions; completion must be idempotent and never depend solely on an animation callback.
- The browser edition currently has no verified Lumina intro video asset. Its studio opening therefore reveals the existing menu. Enable its optional video only after recovering the genuine Lumina media; never substitute MatchApp Ai's movie or claim the browser contains an absent video.
- Native reconstruction source and new en-US/pt-BR listing copy are saved in `LuminaMatch_Studio_Opening_Source_20261030.zip`. A source checkpoint is not a built, signed, tested or published Android release. Preserve the original movie player and verify the genuine video, signing identity, device behavior and current Play Console state before submission.
