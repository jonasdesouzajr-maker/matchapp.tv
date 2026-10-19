# MatchApp Ai hardening checkpoint — 2026-10-19

## Approved workflow follow-up

The owner explicitly approved both prepared workflow proposals on October 19.
The follow-up applies their pre-commit validation, bounded regeneration,
confirmed-publication and lost-acknowledgment checks without changing schedules,
permissions or publisher concurrency. Availability staging additionally retains
all five regional watch output roots owned by its generator; narrowing staging
must not leave those pages behind when inventories and sitemaps change.

The daily retry fixture now models actual commit ancestry instead of returning
empty revision strings and accepting every ancestor query. It retains the
existing gate-order, failure, no-op and exhaustion assertions and adds accepted
push/lost-acknowledgment and unchanged-remote failure cases. Final focused, full
suite and release evidence belong in the follow-up PR.

This does not claim complete gate parity for all eleven owners: existing
SEO-hardening retries do not repeat their initial regression suite, and the
sitemap-only owner has no independent full-suite gate. Those limitations are
documented; no broader unapproved workflow rewrite is included.

PR #300 is already merged as `ad84cf4af6ae3f130595ca392571cd9efc1df003`.
Its news-only descendant `ce3cffdbe17814b4fa96e5ed0614be494240371c` was verified
live, and production audit 39306934687 passed 74 browser, 36 touch and 15 deep
checks. CodeQL inventory and alert #28/#112 reads remain denied with HTTP 403;
scanner execution is not an alert-closure claim. Android/Play remains held.

## Resumed consolidation

The owner instructed this work to finish after the initial draft checkpoint.
PR #300 now includes current production main
`0099b25d753093be1c28f1bfae5ffa1441e7e629` and preserves PR #301's source
repairs through commit `968945c91e6ac56d56f04557d5010ca57afb4eba`: original RSS
dates/future-date rejection, stable SEO timestamps, last-good sports evidence,
bounded recovery decision support and the single-descriptor archive writer.
The archive check/reopen defect was identified by CodeQL comment #112; its
source correction is independently reviewed, while the alert API state remains
unavailable. Current alert inventory access was retried and still returned 403.

Independent review reproduced and corrected two further sports adapter defects:
redirect/error bodies now cancel and remaining request resources abort on exit;
the final approved feed supplies the topic policy after redirects, so a general
feed cannot inherit sports-topic privileges. Sixteen behavioral regressions
cover these paths without expanding destinations, deadlines or redirect limits.
The combined focused publisher/regional/sports checks passed 45/45. Final
full-suite, exact-candidate CI and production evidence are recorded in PR #300;
the initial checkpoint counts below remain historical evidence.

Release review found only the documented `matchapp-content-publish` and `pages`
concurrency locks. Visible rulesets are empty, main has no branch-protection
rule, and GitHub reports no configured required checks for these PRs. All
owner-requested website, editorial, AdSense, matching/art/browser and CodeQL
gates still apply. The historical Cloudflare preview is informational; GitHub
Pages is authoritative for production. Its pending preview does not replace or
waive any release gate. The Actions-variable denial does not establish a
separate lock requirement.

At this earlier checkpoint PR #301's two workflow proposal patch files remained
review material. The owner subsequently approved them as recorded above;
AGENTS.md section 11 continues to govern any further proposed workflow change.
Android/Play remains held.

## Verified starting point

- Owner checkpoint: `33f41acb7d1cf1db2159ff7c07d91787831aca55` (PR #298).
- Fresh main checkout and live `https://matchapp.tv/deployment-sha.txt` both
  reported `a0c0e42789767627df93c9e3d69dd689fff8de52`. Only the serialized
  sports/news publisher commits `1739488275deaefda8e98061fdccf01b4d386bd3`
  and `a0c0e42789767627df93c9e3d69dd689fff8de52` followed the owner checkpoint.
- The production Pages run for that SHA succeeded:
  [39296661079](https://github.com/jonasdesouzajr-maker/matchapp.tv/actions/runs/39296661079).
- Inspected current workflow definitions, all 383 branch names, 25 open PRs,
  open issues, editorial/AdSense locks and available workflow status.
  Existing PRs and the Android/Play publication hold are preserved.
- No workflow, publisher coordination, AdSense contract, native Android code,
  model routing, auth, payment or matching behavior is changed by this patch.

## Corrections

1. `tools/refresh-news-rss.js` previously replaced an absent or unparseable
   publisher publication date with the current time. Such a story could appear
   newly published in the feed, archive and generated time/metadata fields on
   every refresh. It now rejects that entry before headline deduplication and
   reports the rejection count without printing the supplied input. Correct
   RSS/Atom dates, explicit time-zone offsets and dated older stories retain
   their original publication instant. No arbitrary new retention period or
   publishing cadence is introduced. If too few usable items remain, the
   existing minimum-item gate fails before any output write.
2. The English watch hubs for Brazil, United States, United Kingdom and Portugal
   shared one description. Their descriptions now identify the actual country
   in 139–147 characters, describe the existing source-backed information and
   avoid claims of guaranteed access. The owning generator emits the same
   descriptions; Portuguese retains its existing authored copy. Only those
   four description meta tags change in the generated documents. Their
   bodies, canonical URLs, language targeting and routes remain unchanged.

These are publication-integrity and metadata corrections. No new CodeQL alert
closure or security vulnerability fix is claimed.

## Security blocker

The authenticated GitHub CLI request for a fresh inventory,
`GET /repos/jonasdesouzajr-maker/matchapp.tv/code-scanning/alerts?state=open&per_page=100`,
returned **403 Resource not accessible by integration**. The GitHub connector
also does not expose the code-scanning endpoint. The session requested the
missing Code scanning/Security events read access or a current alert export with
data-flow details. No credentials were requested or printed.

The owner's previous 72 high / 14 medium inventory and the historical repair of
RSS alert #28 are **not independently refreshed or verified here**. Without
access, this checkpoint cannot enumerate current alert numbers, inspect each
taint flow, establish exploitability, dismiss false positives or certify any
alert state. A successful CodeQL workflow only establishes analyzer execution;
it is not evidence of zero findings. Rules and dismissals are untouched.

Repository Actions-variable reads also returned 403. Release review found no
separate variable-based lock; that denied read is not a release blocker by
itself. Verify the actual documented publisher/deployment queues and all
mandatory gates before merging.

## SEO and search-engine evidence

- Fresh baseline and candidate audits cover **266 public sitemap URLs**, with
  no site, canonical, indexability, search-readiness or sitemap/video-guard
  errors. The candidate site audit inspected 1,515 HTML and 640 JS files.
- All 266 titles were unique. The only duplicate descriptions found were the
  four English country hubs corrected here. All declared hreflang targets in
  the sitemap resolve to sitemap entries and have reciprocal links.
- The **31 advisories remain**: 25 existing analytics-container notices and
  six application rich-result eligibility notices. Missing measurement is not
  itself an indexing defect. No analytics was added to support/privacy-sensitive
  surfaces merely to silence the audit, and no unsupported reviews, ratings,
  offers or schema types were added for rich-result eligibility.
- Fresh Google URL Inspection for `/founder/`: **PASS**, submitted and indexed,
  successful mobile fetch, robots/indexing allowed; declared and selected
  canonical both `https://matchapp.tv/founder/`.
- Google's reported last crawl is **2026-10-16T21:06:18Z**, before PR #297 was
  merged on **2026-10-19T14:02:24Z**. It does not demonstrate recrawling the
  repaired DateTime values. The source still has UTC DateTime values
  `2026-10-16T09:29:24Z` and `2026-10-16T11:05:25Z`. Any remaining enhancement
  warning needs a later Google crawl and enhancement-report verification;
  the URL Inspection result alone does not prove that warning cleared.
- Google lists both `sitemap.xml` and `sitemaps.xml` as processed with **0 errors
  and 0 warnings**. The sitemap index was downloaded on October 19 at
  14:16:46.857 UTC. Google's deprecated `contents[].indexed` field is not an
  indexed-URL count. No redundant sitemap submission was made during audit.
- Bing Webmaster is not configured in the connected app; Yandex Webmaster is
  not connected. Their account crawl/index states cannot be verified. Existing
  robots, canonical sitemap discovery, Yandex verification and the Pages-owned
  IndexNow workflow remain intact. No duplicate IndexNow owner was created.
- Phone field Core Web Vitals are unavailable because CrUX is not configured
  in the connected app. Local Chromium screenshots/overflow checks are not
  field LCP, INP or CLS measurements or physical Safari/WebView evidence.

## Editorial and source reliability

- Current daily Top Titles run
  [39266178610](https://github.com/jonasdesouzajr-maker/matchapp.tv/actions/runs/39266178610)
  succeeded after PR #297. Data updated at 14:08:49.784 UTC on October 19.
  The weekly choice is `Masterplan`, TMDB 1561726, ISO week `2026-W43`, selected
  at 14:08:49.876 UTC. No duplicate refresh was dispatched during this audit.
- Midnight rotation run
  [39222648315](https://github.com/jonasdesouzajr-maker/matchapp.tv/actions/runs/39222648315)
  succeeded. The current content gate confirms 26 film/TV identities, 20
  verified events, 41 news entries and the current awareness record.
- Hourly news run
  [39296609641](https://github.com/jonasdesouzajr-maker/matchapp.tv/actions/runs/39296609641)
  succeeded with 41 items and 1,000 retained archive entries. Its fresh logs
  still show **Reuters HTTP 404** and **CNN fetch failed**. Other approved
  publishers supplied the feed. A targeted official-source search found CNN's
  [RSS help](https://www.cnn.com/help/rss.html), but did not establish a working
  authorized HTTPS replacement for either failed endpoint. No HTTP downgrade,
  TLS bypass, broader host policy or unverified mirror was introduced.
- RSS retains the PR #297 HTTPS-only boundary, publisher-scoped validation on
  every redirect, maximum five redirects and one ten-second request deadline.
  Its focused redirect/timeout regressions pass unchanged.
- Editorial writers retain their shared `matchapp-content-publish` group,
  non-cancelling serialization, owned-file staging, bounded push retries,
  regeneration on latest main after push races, no-op suppression and one
  Pages dispatch per published bot commit. The daily-title workflow retains
  its complete quality gates on retry; midnight retains failure reporting.
  Some older publishers rely on job logs/failing workflow status rather than
  a dedicated failure issue; no new notification or scheduler was added.
- Event lifecycle and the existing 72-hour ended-card retention are covered by
  the unchanged editorial/event regression tests and content gate. No event,
  title, source availability or dated archival history was invented.

## Completed local validation

- Focused changed-path and related publisher/regional checks: **23/23**.
- Complete `npm test`: **1,863/1,863**, 9 suites, **0 failed, 0 skipped**.
  Existing unrelated Jonas/jsdom fixture teardown diagnostics appear in the
  log; they are not hidden or represented as clean runtime evidence.
- Explicit immutable AdSense contract: **7/7**.
- `npm run audit:site`, `node tools/check-content-rotation.js`, `npm run build`
  and `git diff --check`: passed.
- Rendered country-hub checks: **16/16** (four countries × 320/390/820/1440px),
  correct metadata/canonical, source title links, no horizontal overflow or
  page errors. Phone and desktop screenshots inspected. External requests were
  blocked in these local layout checks; no physical-device success is claimed.

New regression fixtures execute the actual RSS publisher in an isolated
filesystem and the actual regional generator in a temporary directory. They
exercise missing/malformed/empty dates, valid RSS and Atom offsets, older
dates, invalid-before-valid duplicate ordering, the no-write failure path,
country-specific metadata, and preservation of authored Portuguese metadata.

## Outstanding release work

PR #300 is the dedicated consolidation PR. Run existing exact-candidate website/AdSense,
matching/browser/touch/deep audit gates and the independent CodeQL workflow.
Record their final IDs and results in the PR. Do not claim that a scan success
resolves the inaccessible alerts. Restore alert access to complete the
alert-by-alert audit; this is distinct from releasing independently reviewed
eligible web repairs. Complete review, the documented concurrency checks and
all mandatory gates before merge. Use the existing Pages
pipeline, verify the actual live SHA, run the existing post-deploy smoke once,
and check changed URLs in Google/Bing/Yandex through supported discovery paths.
Android/Play remains held throughout.
