# Android and Play icon assets — 30 October 2026

These are the owner's requested purple/gold play-and-star identity with the exact
image lettering **MatchApp AI**. The new app icon is separate from the company
opening artwork. It does not rename the public MatchApp Ai listing or website.

| Asset | Purpose |
| --- | --- |
| `matchapp-ai-play-master.png` | Edited opaque 1254px master based on the owner's uploaded icon; checkerboard and baked outer tile corners removed |
| `matchapp-ai-adaptive-foreground-master.png` | Edited 1254px gold foreground with genuine alpha, preserved name and mask-safe breathing room |
| `matchapp-ai-play-512.png` | Final 512×512 sRGB RGBA Play listing icon, opaque full square, 317,793 bytes |

The bitmap masters were produced with the built-in image editor from the owner's
uploaded artwork. The foreground extraction preserves the gold ring, play symbol,
shooting star and name. The native export includes a small additional inset to
keep all visible gold pixels inside Android's central 66dp safe circle. Artwork
does not have to touch the edge of a launcher mask to fill that mask properly.

`android-studio/scripts/export-brand-icons-20261030.sh` reproduces the exports.
Run it from any
working directory with ImageMagick installed to reproduce the size exports and
legacy masks. It preserves the masters and writes only these Play and adult
launcher resources. Generated previews are not physical-device screenshots.

The adaptive foreground is 432×432 (108dp at xxxhdpi), paired with a separate
full-bleed purple gradient. The outer visible gold radius is **127.87px**, below
the **132px** safe radius. Android 13+ receives a simple themed play/star vector;
older devices receive 48, 72, 96, 144 and 192px square/round launcher variants.
The retained warm-start native mark uses a 512px circular export of the new icon.

## Company opening artwork

`android-studio/app/src/main/res/drawable-nodpi/adv_dev_ops_studio.jpg` is an exact,
unmodified copy of the second image supplied by Jonas. It is 857×1536 JPEG,
SHA-256 `2663e87fc0b2fab3fba870696ec76ff97fc1f8fe47fb3ef680c091f5365b6f1d`.
It is shown proportionally with `FIT_CENTER`; the complete shield, lettering,
tagline and creator credit stay visible. Animation changes the view's opacity
and scale only. The original bundled video is unchanged.

## Validation and publication boundary

`android-studio/scripts/verify_brand_assets_20261030.py` decodes the actual PNG
pixels using only Python's standard library. It checks dimensions, alpha, opaque
Play background, safe-circle containment, legacy masks, adaptive/theme resource
references and exact company-JPEG identity. The existing adult release guard
invokes it. These are asset checks, not proof of physical-device appearance.

Upload `matchapp-ai-play-512.png` to the correct Play listing only after its
current draft/live state and package are checked. Launcher resources require a
signed native update. Neither a Git commit nor these prepared files publishes
the listing or installs the Android update.
