# Lumina animated companions — 2026-10-30

The home menu now has five original articulated vector characters: a hopping fox,
fluttering butterfly, nodding giraffe, leaping dolphin and pulsing jellyfish.
Each creature has independently moving parts plus glints or bubbles. The reserved
stage fits the existing menu; gameplay and account state are unchanged. Motion
pauses for reduced motion, the studio opening and background tabs.

Validation: 3,283 existing tests passed; after updating the launcher cache key,
all 83 affected browser/launcher/intro/no-scroll/ad-lock tests passed again.
`tools/lumina-companions-qa.cjs` passed 34 responsive cases covering all 14
languages, small landscape, phone, tablet, desktop and accessibility. It verifies
actual frame-to-frame articulated movement, five companions without duplication,
no clipped controls, reduced motion, and leaving/returning to the menu. The
existing studio visual harness passed 28 cases with automatic handoff intact.
The site/search/sitemap audits passed with no issues (Node heap set to 6 GB).

Native work is isolated on Jonas's device at
`E:\MatchAppWork\lumina-companions-20261030`, based on the recovered current
350-level source, version 2.5.0/code 10. It adds matching Canvas companions,
enables verified existing Lumina AdMob units, makes reward readiness reactive,
applies verified rewards after the ad closes, and routes the final level 350
through the same first-clear milestone gate. Debug uses Google test units and a
separate `.companionsqa` package. This web commit does not publish Android.
Native signing/device verification and Play submission must be recorded separately.

AdMob account UI verified the correct Lumina app and units. App-specific maximum
content rating was changed to General Audiences; Dating, References to Sex and
Sexual & Reproductive Health were blocked. Alcohol and Gambling were already
blocked. The account is approved, but this app still reports Requires review.
Web game advertising remains disabled under the existing approval rule.

Play Console still shows production inactive with the testing-duration requirement
incomplete. Existing closed/internal releases are code 8. Preserve tester groups
and both tracks; do not claim a public Android launch before production access.
