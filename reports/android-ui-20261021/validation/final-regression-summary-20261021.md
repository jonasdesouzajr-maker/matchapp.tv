# Final regression verification — 21 October 2026

**Both required final gates passed against the frozen checkout.** The final full suite includes the later Activity localization and 48px controls, Guide/footer translations, Android microphone copy, explicit Profile portfolio-tab scroll, and native durable screen checkpoint changes.

## Final results

| Gate | Result | Duration | Evidence |
| --- | --- | --- | --- |
| `npm test` | **2,670 tests passed**, 9 suites; 0 failures, skipped, cancelled, or todo | 181.897 seconds | [Full test log](final-npm-test-20261021.log), [run metadata](final-npm-test-20261021.json) |
| `NODE_OPTIONS=--max-old-space-size=6144 npm run audit:site` | **All four stages passed**, exit 0 | 36.586 seconds | [Full audit log](final-site-audit-20261021.log), [run metadata](final-site-audit-20261021.json) |

The full suite ran from 2026-10-21T19:44:35.883447+00:00 to 2026-10-21T19:47:37.780434+00:00. The site audit ran from 2026-10-21T19:47:55.654220+00:00 to 2026-10-21T19:48:32.239816+00:00, after the local browser sessions had closed.

The npm script is `node --test --test-isolation=none --test-force-exit tests/*.test.cjs`. The audit script runs `tools/audit-site.js`, `tools/audit-search.js`, `tools/search-readiness.js`, and `tools/gsc-index-video-guard-20261012.cjs` sequentially.

## Audit findings and retained notices

| Stage | Checked | Result |
| --- | --- | --- |
| Site/asset audit | 3,581 files; 1,520 HTML; 775 JavaScript; 2,154 external URL references | 0 issues |
| Public search audit | 266 public URLs | 0 issues; 31 unchanged notices |
| Search readiness | 266 URLs | 0 errors |
| Sitemap/video/index guard | 266 sitemap URLs; 4 files with video markup | 0 missing routes, 0 noindex routes in sitemap, 0 errors; private example excluded |

The **31 search notices are identical, including URL and message, to both the original audit baseline and the prior passing checkpoint**. They consist of 25 missing existing analytics-container notices and 6 application rich-result eligibility-field notices. These were retained unchanged; the audit did not fabricate review or eligibility data. The detailed notices remain in the full log and the [machine-readable summary](final-regression-summary-20261021.json).

The runner also emitted environment notices for npm's `http-proxy` configuration and Node's experimental `stripTypeScriptTypes` support. They did not produce failed checks.

## Supporting focused checks and integration repairs

Earlier focused gates passed: 15 cache cases, 22 Guide/activated-scroll cases, 26 native-voice/debug-mirror cases, and 42 portfolio-tab/scroll/History/local-refresh cases. These overlap the final full suite and are not additional unique-test counts. Their logs remain in this directory.

The first integration run exposed stale generated assets or expectations. Repairs synchronized the debug Discover bundle, preserved exact global-events generator equality by adding its current cache suffix, updated exact token/pricing cache expectations, and updated two Home Ask assertions for the shared measured-header scroll helper. Fold expansion, focus/keyboard behavior, and actual scroll geometry tests were retained. The final voice-copy change was also mirrored exactly in the debug bundle. No test was disabled or weakened to obtain the passing result.

The previous 2,653-test passing run and its audit are preserved in [pre-activity/](pre-activity/), clearly separate from this final 2,670-test run. The regenerated untracked `reports/midnight-latest.md` was moved to [generated-midnight-latest-20261021.md](generated-midnight-latest-20261021.md) so it is retained with validation evidence rather than left as an orphan report.

## Verification boundary

These gates validate the local source, generated references, and static site invariants. Android compilation, JVM tests, physical-device behavior, browser screenshots, and live release status are recorded separately in the main/native audit. A passing Node/site gate does not by itself establish those results.
