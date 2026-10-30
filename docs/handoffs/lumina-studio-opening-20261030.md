# Lumina Match studio opening — 30 October 2026

Owner request: a dark, smooth animated **Adv_Dev_Ops by Jonas Junior** studio credit before the original Lumina video, then the existing skippable video and game; deploy and update the listing.

## Browser implementation

The isolated game iframe loads `studio-opening.js` before its existing game controller, with scoped `studio-opening.css`. The approximately 3.1-second opening uses bold ivory lettering, violet underscores, a gold light sweep clipped to the text, a restrained geometric motif and a full-screen fade. Reduced motion uses a static, bounded display. Skip is authored in all 14 game languages.

The component does not modify campaign, save, account, multiplayer or audio ownership. Opening gestures cannot trigger the game's music. A modal prevents hidden game interactions; timers pause while the page is hidden and are cleaned up on exit. Completion/Skip are idempotent. Only the changed iframe/launcher asset chain is versioned.

The browser baseline has **no Lumina video intro**. No movie is fabricated or borrowed from MatchApp Ai. Without a verified `data-intro-video` attribute, the credit fades into the existing menu. The optional same-origin Lumina media path handles completion, Skip, errors, loading stalls, blocked audible autoplay and background/resume safely.

## Verified candidate checks

- 78 focused tests pass, covering existing launcher, game/progress, tutorial, brand isolation and the 12 new opening regressions.
- 28 real Chromium layout/interaction cases pass: all 14 languages at 320px, en/pt-BR at phone, short landscape, tablet and desktop sizes, plus reduced motion, forced colors and 200% root text size.
- Normal timed completion returns to the menu; Skip permits subsequent gameplay and opening the first eight-card board; returning home does not replay the ident.
- Phone and desktop screenshots reviewed. The initial rectangular shimmer was replaced by a glyph-clipped light sweep before the final checks.
- Independent review found a late optional-video `playing` event after background pause; the guard and event-order regression were added and pass.
- JavaScript syntax and `git diff --check` pass.

These local checks are not physical-device or native Android results. Required full CI, site audit and the single automatic production smoke remain the release gates. Verify the actual deployed commit and served assets after merge.

## Separate native work and store copy

The recovered reconstruction checkpoint now contains a native `StudioOpening` followed by its unchanged `VerifiedIntro`, keeping the `intro` game state throughout to suppress game music. Timing survives configuration changes and advances only while resumed. English and Brazilian Portuguese controls and conditional release/listing text are included.

The updated source is saved as `LuminaMatch_Studio_Opening_Source_20261030.zip`. The portable checkpoint lacks `lumina_intro.mp4`, recovered final media/client configuration and the existing secure signing setup. The complete working copy is on the authorized laptop, which was offline during this work. No current native compilation, physical-device validation, signed AAB or Play submission is claimed. Provisional code 9 / version 2.4.0 must be checked against all uploaded versions before release.

Play Console requires authentication in the available browser. Do not alter existing reviewed listings to advertise the new native opening until the matching binary has been validated and submitted. Preserve existing tester groups and tracks; recheck production eligibility and review status rather than treating historical states as current.
