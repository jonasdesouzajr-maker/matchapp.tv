# Dock and secondary-action audit — 2026-10-21

## Verified outcome

The final dock matrix contains **35 rendered cases**, all with zero recorded failures. Every case retained five original destination anchors and five vector icons. All measured hit areas were at least 48 × 48 CSS pixels. Each complete translated word stayed on one line inside its capsule; multiword labels could wrap at spaces. No label extended outside its action, no action extended outside the viewport, and the body reserved the measured dock height plus its bottom inset and 8px clearance.

All 14 supported locales were inspected at 320 × 640 with the existing maximum 1.4 font preference: EN, PT, ES, FR, DE, IT, TR, RU, AR, HI, ID, JA, KO, ZH. EN/PT/AR/JA/ZH/KO/RU also ran at 640 × 360 landscape and 800 × 1180 tablet, then returned to 320 × 640. The measured layout returned to one row at wider sizes and restored the balanced three-plus-two layout when required on return. Complete details and rectangles are in `report.json`; screenshots use the corresponding case name.

At 320px with maximum text, EN/PT/AR stayed in one row. Japanese, Russian, German and Indonesian needed the balanced second row under the measured minimum widths. Font sizes were preserved: the pre-existing small-screen dock font remained 15.232px with a 1.4 preference. The implementation reduces internal horizontal padding, allocates columns by intrinsic minimum content, and only adds a row when the five readable minimum widths cannot fit. It never replaces labels, anchors, handlers or routes.

## Real CJK geometry fixture

The local Linux runner has no CJK system fonts. Testing missing-glyph boxes would understate the actual label widths. For JA/ZH/KO dock labels only, the harness loaded the official Noto Sans CJK JP regular face from a temporary local endpoint and applied it to the original dock anchors. Font size, strings, layout and application code remained unchanged. The font was not installed system-wide, added to the repository, or introduced as a production dependency.

Font source: https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/OTF/Japanese/NotoSansCJKjp-Regular.otf

SHA-256: `68a3fc98800b2a27b371f2fb79991daf3633bd89309d4ffaa6946fd587f375b5`

The CJK screenshots prove dock layout with actual CJK glyphs. Other page text in those screenshots may show missing glyphs because the fixture deliberately applies only to the dock. These screenshots do not certify all CJK page typography or an exact Android font. Hindi uses the existing local fallback and has geometry evidence only. Native Android keyboard/device verification belongs to the separate physical-device audit.

## Focused regression

`tests/reference-dock-layout-20261021.test.cjs` verifies that fitting and oversized translations retain the original five nodes, route hrefs, labels and click handler; changing available width changes only layout and the actual reserved body clearance. Existing dock feedback and font-preference suites also passed. The browser matrix supplements these logic checks with real text rendering, bounds, word rectangles and resize-return behavior.

## Quiet support controls

`../support-final/report.json` contains 36 rendered support/menu/dialog states at phone, tablet, maximum text, PT, AR and short landscape sizes. All measured fixed panels remained inside the viewport and all compact secondary actions retained at least 48px touch dimensions. Donate and Support have 32px visible capsules inside their 48px targets. Footer sponsorship, founder voluntary support and Copy brief use subdued secondary styling. PayPal checkout and primary submission actions retain their emphasis.

The donation panel preserved the entered 12.75 amount through collapse/reopen. Auth close remained reachable by scrolling its bounded short-height card back to the top, and the custom confirmation dialog dismissed with Escape. Reduced-height cases simulate available viewport reduction; they are not claims of a physical Android IME test.

## Source scope

Dock: `patches/reference-dock.css`, `patches/reference-dock.js`.

Quiet support: `patches/reference-support.css`, `patches/reference-header.css`.

Earlier small-control repairs and the scoped History gold-button ink repair: `patches/reference-pages.css`.

No protected ad markup or geometry, payments, matching engines, navigation destinations, or source imagery was changed in this audit pass.

## History primary action contrast

The candidate inherited pale `rgb(220,192,255)` text and WebKit text fill on its existing gold `rgb(229,193,88)` background: computed contrast was 1.08:1. The scoped History action now restores its original `#121018` dark ink and `-webkit-text-fill-color: currentColor`. Final computed contrast is 10.87:1 at390px/800px in the default palette and at390px in Sunrise. The solid gold background, label, href and click behavior are unchanged. Evidence: `../history-contrast-before/report.json` and `../history-contrast-after/report.json`.
