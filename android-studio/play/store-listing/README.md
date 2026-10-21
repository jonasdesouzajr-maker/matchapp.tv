# MatchApp Ai Google Play store presence

This directory contains the intended metadata for the adult Android package `com.jonas.papercup`. Local files do not publish a listing or establish the latest Console release state. Kids belongs to its separate package and listing.

## Current checkpoint — 2026-10-20

A fresh read-only audit of both public English and Brazilian Portuguese Play pages confirmed:

- The published name is exactly **MatchApp Ai** in both locales.
- The published category is **Entertainment**.
- The developer website is `https://matchapp.tv/`, and the app privacy-policy link is `https://matchapp.tv/privacy.html`.

The brand, category and legacy-site problems recorded in the October 5 audit are historical findings, not current defects. Older release notes and screenshots are not authoritative evidence of today's Console state.

The current public full descriptions still mention VIP/Business subscriptions and extra-match/Ask AI credit packs as possible new purchases. Those legacy new-sales paths are retired. The prepared refresh removes that promotion while preserving existing-subscription management and neutral terms for any currently available optional purchase.

## Prepared listing refresh

The EN-US and PT-BR files in this directory now describe the current movie/TV discovery experience, Jonas, Books and Recipes in clear, natural language. The exact title stays **MatchApp Ai**. They preserve the qualifications for regional availability, third-party sources, affiliate links, optional purchases, existing subscriptions and voluntary support.

| Locale | Title | Short description | Full description |
| --- | ---: | ---: | ---: |
| en-US | 11 / 30 | 66 / 80 | 2445 / 4000 |
| pt-BR | 11 / 30 | 68 / 80 | 2570 / 4000 |

These drafts make no ranking, award, guaranteed availability, streaming-provider partnership or universal ad-free claim. They do not promote a disabled purchase product or promise that contributions unlock benefits.

The refreshed [default feature graphic](../feature-graphic.png) is the English 1024×500, 24-bit RGB PNG. A Portuguese graphic, reproducible HTML/SVG composition, approved-art hashes and manifests are included in the `final-release-20261020/store/` artifact. The old graphic claiming “MatchApp TV” and “Ad-free Android app” has been replaced and must not be reused. The approved product mark and its display mask remain unchanged.

## Screenshots and provenance

The release artifact separates Android-bootstrap **previews** from device captures. The previews render the actual website with the current `MainActivity.APP_MODE_JS` and Android user agent in Chromium at 360×640 CSS pixels and 3× density, producing 1080×1920 PNGs. They contain actual interface copy and source artwork.

They are **not APK, emulator or physical-device screenshots** and must not be described as such. Their README and manifest record routes, locale, dimensions, source hashes and capture limitations. Do not reuse old screenshots showing retired branding, a superseded layout, fabricated AI answers or the separate Kids product.

Google Play requires at least two screenshots to publish a listing. Its large-format recommendation guidance calls for at least four app screenshots at 1080×1920 portrait or 1920×1080 landscape. Screenshots must be JPEG or 24-bit PNG without alpha, within the current size and aspect-ratio rules. Recheck the live [preview-asset requirements](https://support.google.com/googleplay/android-developer/answer/9866151) when uploading.

## Publication status

This directory contains the localized source copy and graphics for the adult listing. `GRAPHICS-PROVENANCE.json` records each phone preview’s exact source revision, capture method and hash, including the Explore source correction. Source preparation and repository commits do not establish a Play Console upload, review decision or publication. Record the actual Console outcome separately after checking the authorized publisher session.

Use the existing Play Console Store presence flow with the authorized publisher account to compare and apply the intended localized metadata and assets. Metadata changes do not require a new Android binary. A binary update remains a separate signed-release process with current package, version-code, upload-certificate and device validation.

Preserve the adult **Contains ads: Yes** declaration and review all current Console declarations against the actual release. Do not copy historical version codes, rating or Data safety answers blindly. Do not change native ads, web AdSense, Kids or payment behavior as part of a listing refresh.

The source contact targets remain in [store-presence.json](../store-presence.json). Public support-mail ownership and any future category, tag, custom-listing or experiment changes require current account evidence. Keep at most five relevant tags actually offered by Play; no keyword stuffing or ranking forecasts.

The [October 17 CRO review](CRO_REVIEW_20261017.md) remains a dated historical record.

## Current localized graphics

Use `en-US/graphics/` and `pt-BR/graphics/` for the approved feature graphics and four refreshed UI captures per language. `GRAPHICS-PROVENANCE.json` records exact dimensions, source and SHA256 values. The captures show actual web UI rendered with the Android app bootstrap; they are not APK or physical-device captures. Historical files under `../screenshots/` are not the current adult upload set.
