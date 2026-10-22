# Guide microcopy and duplicate-hook repair

## Confirmed defects

The existing Guide HTML hardcoded the eyebrow “FIELD GUIDE”, every chapter’s
“DISCOVERY” counter, three legal-link captions and the copyright suffix. Its
language owner did not repaint those nodes. In non-English locales, the same
owner assigned each translated title to both the heading and the hook paragraph,
which produced the redundant second title capsule seen on the physical tablet.

## Scoped adjustments

- `patches/premium-journey-20261014.js`: authored Guide labels for all 14 supported
  locales; repaints the existing eyebrow, numbered counters and footer through
  the original language owner. Original legal destinations, copyright year and
  product name are preserved. A hook is hidden only when it duplicates its
  heading; the distinct original English hook is restored on a language switch.
- `how-it-works.html`: static eyebrow uses the exact `MatchApp Ai` spelling.
  Its established uppercase visual treatment is unchanged.
- `patches/premium-journey-20261014.css`: a Guide-footer-only override gives legal
  links intrinsic widths and 48 px targets. This was necessary because the
  shared equal-width rule split Portuguese `Privacidade` mid-word even at
  800 px. Links wrap as whole controls when they need another row.
- `tests/premium-guide-20261014.test.cjs`: regression covers all 14 locales and
  all 14 counters, footer copy and destinations, preservation of the original
  year/brand/nodes, active chapter/hash preservation, restored English hooks,
  and existing chapter/back handlers.

Chapter explanations, the existing authored summary arrays, chapter behavior,
global translation owners and all other page styles were left intact.

## Verification

Passed after the final CSS change:

```text
node --test tests/premium-guide-20261014.test.cjs tests/premium-guide-languages-20261021.test.cjs
node --check patches/premium-journey-20261014.js
git diff --check -- patches/premium-journey-20261014.js patches/premium-journey-20261014.css how-it-works.html tests/premium-guide-20261014.test.cjs
```

One local Chromium viewport at 800 × 1180, Portuguese, confirmed translated
visible labels, no horizontal overflow, and all 14 duplicate hooks having
`display:none` and zero client rectangles with the actual shared styles loaded.
The resulting top, chapter and footer screenshots are in this directory.

Two focused footer checks at 320 × 640 with the saved 1.4 font preference
(22.4 px root font) verified Portuguese and Russian. Both had zero horizontal
overflow, every legal link had at least a 48 × 48 px target, and text-range
measurements found no mid-word wrapping. The long Russian privacy label remains
intact while the final control moves to a second row. These measurements and
screenshots are in `../guide-microcopy-footer/`.
At the bottom of the page, all legal targets also clear the actual dock:
the final control ends at 479.69 px against a dock top of 534.44 px in Portuguese,
and at 428.94 px against a dock top of 483.44 px in Russian.

External requests were blocked in these local rendering checks. They validate
candidate DOM/CSS behavior and do not replace the parent agent’s physical-tablet
checks. All local Chromium contexts, processes and servers were closed after
the checks. No image assets were changed; missing decorative emoji glyphs in
the local screenshots reflect the runner’s font coverage.
