# News image and card review — 2026-11-01

Branch: `codex/news-visual-20261101`; base: `066f8e591f6cbe69d54c742c0610eb64bd362a59` (`origin/main` when this isolated worktree was created). Prepared for branch review; no deployment or publication was performed.

The supplied photograph matches the generated `/news/` hub: the Edinburgh Film Festival and Netanyahu source headlines are in the committed snapshot. The hub template previously emitted no image markup, although 40 of its 42 source records already provide image URLs; both photographed stories have those URLs.

The change adds original source images to all 24 current hub cards. Missing images and runtime image errors share one fallback: a local original topic illustration with a visible label authored in all 14 supported languages. No publisher logo, unrelated person photo, fabricated cover or copied article body substitutes for missing artwork. Source headlines, article links, dates, feed data and archive records remain unchanged. Future hub/article templates and Home/live news cards use the same artwork owner. Current article wrappers receive the new template during their normal existing publisher regeneration.

News-only padding, headline line height and spacing keep complete text within each card. The header, ad inventory and font setting remain with their existing owners. Independent full-CSS inspection and the physical-tablet coordinator found no intrinsic title clamp in the original cards: manually scrolled content can pass behind the existing fixed header. This change does not claim to prevent normal viewport clipping while a reader scrolls.

## Evidence

`qa-summary.json` is the compact committed result. Detailed logs and screenshots remain in the local evidence folder rather than the source commit.

- `rendered-news-images.json` and eight `news-*-font*.png` screenshots: actual production HTML, scripts and CSS in fresh guest Chromium at 320/390/800/1280px, with 100% and 150% text settings. All 24 images decoded in every case; title glyphs stayed inside cards; actions did not overlap titles; no horizontal document overflow. Source image hosts were unavailable under cloud network policy, so these screenshots verify the explicitly labelled illustrations, not successful publisher photo downloads.
- An actual local 404 image failure recovered to the same topic illustration without changing the headline or original-source link. Repeated failures do not loop.
- `tools/qa-news-images-20261101.cjs` reproduces the rendered checks.
- 48 focused News tests, 4 publication-date fixture tests, and 38 protected contract/native-slot/rotation tests passed. Site/search audit passed. The initial full suite passed 3380/3384; its four failures were a publication-date VM fixture rejecting the newly shared read-only image module. That fixture now allows exactly that module while preserving every date/security assertion. The final full run passed **3384/3384 tests, zero failures or skips** (`npm-test-final.log`).

The physical tablet still requires the release coordinator's exact deployed-marker check and fresh visual verification after integration. This worktree does not alter the parent or rewards worktrees.
