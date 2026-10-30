# MatchApp Ai Android listing refresh — 30 October 2026

**Status: OFFLINE DRAFT — NOT SUBMITTED.** These files do not establish a Play Console save, review, approval, publication or new Android release.

## Scope and identity

This draft is for the adult Android package **`com.jonas.papercup`** only. It preserves the exact public listing title **MatchApp Ai** in every locale. The owner's latest request separately specifies **MatchApp AI** lettering on the new icon artwork; that scoped artwork request does not rename the website, developer account, Kids product or Lumina Match.

The request also says that the game starts after the intro. Confirm the intended package before any store mutation: the adult MatchApp Ai shell currently opens the entertainment homepage, while Lumina Match is a separate Android package. `lumina-match/launcher.js` deliberately excludes native Android shells. This draft therefore makes no native Lumina gameplay, level-count, Play Games or game-monetization claim.

Only this new dated directory is authored by the listing-preparation task. Historical copy, screenshots, manifests, Play declarations, support identities and existing Console drafts are preserved. The root release task owns native implementation, target confirmation, artifact signing, device verification and submission.

## Prepared copy

Each locale has `title.txt`, `short-description.txt`, `full-description.txt` and `release-notes.txt`:

| Locale | Title / 30 | Short description / 80 | Full description / 4000 | Release notes |
| --- | ---: | ---: | ---: | ---: |
| en-US | 11 | 76 | 2548 | 218 |
| pt-BR | 11 | 67 | 2650 | 215 |
| hi-IN | 11 | 64 | 2409 | 213 |

Counts exclude the final newline. All copy is UTF-8. The title, short-description and full-description lengths were checked locally; the exact brand was checked in each title. The unchanged repository test covers the historical canonical `store-listing/` directory, not this draft.

The opening copy focuses on the app's central discovery task: what to watch, movie and TV recommendations by mood, and where to watch. It then introduces Match Together, saved discoveries, Jonas, reading and other existing destinations. Natural terms such as anime, K-dramas, documentaries and novelas/telenovelas appear once in context. The descriptions preserve third-party availability, affiliate, account, optional-purchase, existing-subscription and voluntary-support qualifications. They do not add rankings, awards, provider partnerships, guaranteed availability, unlimited usage or retired sales products.

The release notes describe the requested new purple-and-gold icon and the **Adv_Dev_Ops by Jonas Junior** prelude followed by the existing video with Skip. They are **conditional draft notes**: use them only with a built and verified release that actually includes those changes. They do not claim that the candidate is already installed, approved or live.

## Source review

Reviewed against repository HEAD `9d6386b94e767127ecc50d571104cca2f4061def` and the existing authored listing material. This is source review, not current device or backend verification.

| Claim / boundary | Source inspected |
| --- | --- |
| Adult package and live entertainment Home | `android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt`, `android-studio/README.md`, `android-studio/play/store-presence.json` |
| Existing bundled intro and localized Skip control | `MainActivity.kt` and `android-studio/app/src/main/res/values*/native_startup.xml` |
| Mood, format, platform, era and title discovery | `index.html`, `matchapp-ia.js`, existing localized full descriptions |
| Match Together, books, recipes, news, music and events | `explore.html`, `together.html`, `ebooks/`, existing listing source |
| Fourteen interface languages including EN, PT-BR and Hindi | `index.html` language declarations, `matchapp-ia.js` authored locale table and native localized resources |
| Exact brand and isolated Kids product | `AGENTS.md`, `DESIGN-LOCK.md`, `android-studio/README.md`, `tests/play-store-presence.test.cjs` |
| Native exclusion of browser game launcher | `lumina-match/launcher.js`, `nativeShell()` guard |
| Current prepared screenshots are web previews | `android-studio/play/store-listing/README.md` and `GRAPHICS-PROVENANCE.json` |

The source review does not prove successful multi-turn Jonas replies, current streaming availability or live account operations. Use the release task's genuine device/backend checks to establish those outcomes before publication.

## Existing graphics and reuse limits

The existing EN-US and PT-BR assets are at `../store-listing/<locale>/graphics/`. Each locale has a 1024 × 500 RGB feature graphic, four 1080 × 1920 phone previews and four 1920 × 1080 tablet previews. Their provenance is recorded in `../store-listing/GRAPHICS-PROVENANCE.json`.

The screenshot-style images were captured on 20–21 October from the real web interface with an Android bootstrap. They are **not physical-device, APK or emulator captures**, and they do not show this native icon/prelude update. They are reference material for comparison, not an automatically approved current upload set. Recheck their visible branding, current UI, third-party artwork and language against the release before reusing any of them. The feature graphics also need a visual comparison with the new icon before reuse. No new graphics or screenshots are fabricated by this task.

Do not reuse the historical `../screenshots/` directory for this update: its audit records obsolete branding, old claims and the separate Kids screenshot. Hindi has authored text but no Hindi-specific verified screenshot set in the current listing directory.

Recommended genuine capture order, after target/build verification:

1. Current localized movie/TV discovery screen, with readable mood and platform controls.
2. An actual successful title result with the matching original poster and synopsis.
3. The same result's genuine viewing options and Save/Watch Later controls.
4. The actual Jonas interface or another verified current destination.

Capture EN-US and PT-BR using the corresponding app language; capture Hindi separately when the Hindi interface is selected. The new studio opening can appear as an additional authentic launch capture, while the first images should explain the app's core use. Keep personal account information out of assets and never insert fabricated AI answers or viewing availability.

## Apply only after checking the current Console

Compare these drafts with the current default and localized listing fields before applying them. Preserve unrelated pending edits, live assets, declarations and releases. Do not replay historical instructions in `store-presence.json` as if they were current defects. The earlier audit already recorded the correct brand and Entertainment category; only a current Console inspection can establish their present state.

Upload the final icon separately to the listing and package the launcher resources in the native build. A repository change does not perform either store operation. Record the exact package, version code, signed-artifact hash, listing locales changed, submission status and Console confirmation in the release handoff when those actions actually occur.

## Official references checked on 30 October 2026

- [Google Play listing fields and character limits](https://support.google.com/googleplay/android-developer/answer/9859152)
- [Preview assets and short-description guidance](https://support.google.com/googleplay/android-developer/answer/9866151)
- [Store listing best practices](https://support.google.com/googleplay/android-developer/answer/13393723)
- [Google Play icon design specifications](https://developer.android.com/distribute/google-play/resources/icon-design-specifications)
- [Android adaptive icons](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive)

Play requires a full-square 512 × 512 sRGB 32-bit PNG icon no larger than 1024 KB; the store adds its own outer rounding and shadow. Android adaptive icons use separate 108 dp layers with essential artwork in the central 66 dp safe zone. These are separate assets and validation steps.
