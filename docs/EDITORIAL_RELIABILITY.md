# MatchApp Ai editorial reliability

## October 20, 2026: consolidated daily execution

The owner has superseded the separate scheduled content owners described in the
historical investigation below. The authoritative schedule is now
`.github/workflows/unified-refresh.yml`: 04:30 UTC / 01:30 America/Sao_Paulo.
It calls `tools/unified-refresh.cjs generate`, runs all existing validation
gates, and stages only `ownedPaths` with the runner's `stage` command before
one serialized publication. The seven old source workflow files are removed.
Catalog extraction and OIDC enrichment run once per generation pass; sports
precedes the one news generation pass. All five regional watch trees, official
music artwork and metadata, weekly choice, event history and SEO outputs are
included in the same candidate. No new date-specific observance is invented.

`artifacts/unified-refresh/generation.json` records actual child-process
outcomes separately from publication and live deployment. A failed source or
gate prevents the candidate commit. Lost push acknowledgements are reconciled
against remote ancestry; a genuine newer main is regenerated and revalidated,
and an unknown result stops. Successful unchanged checks do not create timestamp
commits or deploy again. IndexNow retains its delivery workflow but loses its
standalone recurring recovery timer.

The recovery helper preserves old ledger records for reconciliation, while only
the unified owner can receive a new recovery reservation. An unresolved legacy
submission blocks a duplicate unified recovery. Its fingerprint covers the
unified workflow, runner and source dependencies rather than removed workflows.
Existing Pages, smoke/security/AdSense checks and the approved manual source
tools remain. Daily operation does not require repeating the owner's approval.

The historical cron table, hourly coordinator references and former protected
proposal status below describe the investigation at that time. They must not
restore deleted schedules or override the October 20 amendment in
`docs/EDITORIAL_AUTOMATION_LOCK.md`.


This is operating guidance for the existing MatchApp Unified Refresh coordinator,
not a new scheduler, publisher, content owner or permission to change protected
workflows. The authoritative locks remain in AGENTS.md and
EDITORIAL_AUTOMATION_LOCK.md. Timezone: America/Sao_Paulo. Workflow crons are UTC.

## Verified October 19 investigation

At investigation start, main was `1739488275deaefda8e98061fdccf01b4d386bd3`.
The missing 11:17 UTC sports event arrived at **17:28:26 UTC** as scheduled run
[39294415901](https://github.com/jonasdesouzajr-maker/matchapp.tv/actions/runs/39294415901).
Its source step started at 17:28:45 UTC; this was late event delivery, rather than
six hours queued behind a publisher. GitHub's internal reason is not exposed.
The run completed successfully, committed that main SHA and dispatched Pages
[39294806222](https://github.com/jonasdesouzajr-maker/matchapp.tv/actions/runs/39294806222),
which succeeded. The production deployment marker independently matched the SHA.
No sports recovery was submitted by this investigation.

GDELT returned HTTP 429, including its bounded IPv4 fallback. The existing five
The Conversation feeds were checked: two topics returned the same eligible
October 15 article; the other three returned no qualifying sports material.
URL/headline deduplication retained one record, with its real publication date.
An October 19 source check does not mean the article was published October 19.
No licensed-feed expansion or copied publisher imagery/body is included.

PRs 280, 282, 283, 291, 293, 297 and 298 already addressed the recent archive
cache key, guide/manifest ordering, regional offer evidence, matching/artwork,
October 18 observance, rotating-featured navigation and live Spotify audit race.
Their current merged state and runs were checked; these recoveries were not
replayed. October 16–19 laptop checkpoints were read and corroborated against
GitHub. Historical exact-SHA smoke evidence is not carried forward to descendants.

## Owner inventory at investigation start

All listed Git writers use `matchapp-content-publish`, cancel-in-progress false.
All changed bot commits explicitly dispatch the existing Pages owner once; no-op
runs do not dispatch. Bot-token pushes do not automatically trigger other owners.
Every owner keeps its current cron and trigger paths.

| Owner | Cron UTC; São Paulo | Inputs, output and publication | Permissions / dependencies / gates |
| --- | --- | --- | --- |
| midnight-content-rotation | `0 3 * * *`; 00:00 | Catalog ingest → news → events/archive/awareness → SEO/watch/worldwide guide → sitemap. Owns corresponding Home blocks, news, event/awareness/watch/collection pages, URL manifests, history and sitemap. Manual or its own YAML push also triggers it. | contents/actions/issues write, OIDC. Node 24, locked npm. Runtime preflight, content contract, full tests and site/search/build gates before publishing and on conflict regeneration. |
| trending-refresh | `15 3 * * *`; 00:15 | Official music discovery → catalog → Top Titles/keywords → weekly featured → sitemap. Data, verified music covers, Home row/JSON-LD, trending/featured pages and sitemap. Source/YAML push or manual also triggers. | contents/actions write, OIDC. Node 24/npm. Source metadata and editorial contracts, full tests/site/build on initial and retry paths. Weekly generator validates daily; its weekly rotation rule is preserved. |
| news-refresh | `37 * * * *`; hourly :37 | Single news HTML/archive/SEO owner; trusted RSS + trend signals + eligible sports snapshot → news data/articles/hub/manifests → sitemap. Script/runtime push or manual also triggers. | contents/actions write. Node 24. Existing YAML lacks full pre-commit gates; Pages still validates before deployment. Separate protected patch adds pre-commit checks. |
| sports-refresh | `17 11,23 * * *`; 08:17/20:17 | Authorized discovery → sports snapshot → existing news generator → sitemap. Source/YAML push or manual also triggers. | contents/actions write. Node 24/npm/curl; bounded GDELT + exact The Conversation feeds. Full editorial/tests/site gates on initial and regenerated output. |
| availability | `0 5 * * *`; 02:00 | TMDB regional observations → availability JSON → watch/collection pages → sitemap. Manual supported. | contents/actions write. Node 24/npm, existing TMDB secrets. Source and territory rules preserved. Existing YAML stages broadly and lacks full pre-commit checks; protected patch narrows staging and adds gates. |
| scraper | `17 7 * * *`; 04:17 | Dry-run catalog extraction → OIDC-authorized catalog-media-ingest. Server data, **no Git or Pages write**. Exact source/YAML push and manual also trigger. | contents read, OIDC. Separate `matchapp-catalog-media-refresh` backend lock is intentional and unchanged. No client secret exposure. |
| awareness-rotation | `45 3 * * *`, `5 12 * * *`; 00:45/09:05 | Archive/official-source-aware campaign rotation → awareness/Home/manifests/history → sitemap. Source/calendar push or manual. Midnight can cover the same output; do not repeat covered work. | contents/actions write. Node 24/npm; official-source verification, awareness regression and content contract on both initial and retry paths. |
| indexnow | `0 8 * * *`; 05:00 recovery | Successfully completed Pages dispatches IndexNow; daily schedule is recovery. Checks live key, submits sitemap URLs to Bing/Yandex-supported IndexNow API. No Git write. | contents read. Node/HTTPS/curl, bounded request retries. Acceptance does not prove indexing. Google uses robots/sitemap and authorized Search Console, not IndexNow. |

The existing archive owner reacts only to international-day.json, preserves outgoing
records, and shares the publishing lock. It does **not** create a new day-of record.
The existing Kids owner is path/manual triggered, not another recurring schedule;
it generates reviewed title pages/manifests and validates before the initial push.
Its retry path omits those checks; the protected proposal restores them. Sitemap
is release.json-triggered. Brand, manual music and SEO-hardening writers also use
the same serialized lock. Brand already handles a lost push acknowledgement;
the protected proposal reuses that behavior in the other ten retrying owners.

Pages keeps its separate newest-wins deployment lock and immutable AdSense,
regression, site and content gates. release-smoke observes successful Pages runs;
the established Matching and AI Audit can also execute the actual live browser
script. A dispatch, a checkout SHA or a green ingestion label is not live proof.

## Source integrity and idempotency repairs

Sports logs and its Actions step summary distinguish changed, unchanged,
checked-empty and degraded source checks, with actual check time, owner run ID,
SHA, source outcomes and the last content-change timestamp. Unchanged/empty
checks preserve last-good snapshot bytes. Total transport/source failure remains
a failing job. A partial outage retains only previously authorized, unexpired
sports records; it never extends publication dates. Snapshot replacement is
atomic. Exact feed identity governs topic privileges; HTML errors are not empty
feeds, redirects stay on explicitly approved feeds, and betting promotions are
rejected for GDELT as well as partner feeds.

News rejects undated/invalid/future source dates. It rebuilds SEO on every check,
but preserves modification timestamps when actual metadata is identical. Two
identical runs produce identical news data, archive, pages and URL/sitemap
metadata. Sports display expiry uses actual source dates, so an unchanged check
needs no timestamp-only commit to keep an eligible story visible. Check freshness
comes from verified owner execution/logs; content age comes from the dataset.

## Existing coordinator recovery protocol

Use `tools/editorial-recovery.cjs` only as decision and ledger support. It contains
no network call, dispatch, timer, cron or Git mutation. Preserve the existing
hourly task, independent email watch, publisher lock and notification ownership.

1. Fetch current main, open PRs/branches/checkpoints and complete paginated owner
   runs, including queued, requested, waiting, in-progress, cancelled and completed
   work. Read actual output, source logs and deployment evidence. Treat missing
   access or incomplete pagination as unknown, never as an empty run list.
2. Reconcile historical manual recoveries and the local-date evidence ledger.
   Hash current owner workflow/generator code with `repairRevision(owner)`.
   Ordinary content commits cannot reset this code fingerprint or retry budget.
3. Prepare JSON evidence using the schema below. A source-checked unchanged or
   genuinely empty successful run counts as equivalent work. News may be covered
   by midnight or sports only when logs establish the news generation/publication.
4. `evaluate` reads the **current protected YAML cron**, requires 75 minutes grace
   and materially stale output. News also requires at least 90 minutes of genuine
   source-check freshness gap; it evaluates the latest grace-expired hourly slot.
   Source dates and dataset last-change timestamps alone cannot establish a gap.
5. Immediately before any authorized owner dispatch, refetch late schedules, main,
   equivalent work, recovery PRs and all publication/deployment locks. Evidence
   must be at most one minute old. Run `reserve` against the EXISTING local-date
   coordinator JSON ledger; its exclusive file lock and atomic write preserve
   unrelated checkpoint and notification fields. Reservation precedes submission.
6. Only the existing coordinator may then submit one authorized owner dispatch.
   Confirm its actual run ID/SHA from GitHub, and `record` submitted, unknown,
   success or failed using verified evidence. The helper itself submits nothing.
   Never resubmit an unknown outcome; do not delete a leftover ledger lock to
   unlock retries. Reconcile with GitHub first. A known unsubmitted reservation
   can be closed only with explicit evidence that no request was sent; keep its
   consumed key for the date/revision.
7. A failed controlled recovery stops automatic attempts across dates on the
   same code fingerprint. Diagnose and validate the actual source/code repair
   before considering a different repaired revision. A green ingestion without
   publication evidence requires publication investigation, not reingestion.
8. Record Pages run, exact live deployment-sha.txt, actual browser-tested SHA,
   outcome, failure reason and notification key. If live advances, distinguish the
   tested revision from descendants. Do not notify again for an existing key.

Example evidence (replace every value with current verified facts):

```json
{
  "owner": "sports-refresh.yml",
  "observedAt": "2026-10-19T17:29:30Z",
  "mainSha": "40-character current main SHA",
  "repairedRevision": "64-character repairRevision(owner) code fingerprint",
  "evidenceComplete": true,
  "historyReconciled": true,
  "runs": [{"id":39294415901,"owner":"sports-refresh.yml","status":"completed","conclusion":"success","checkedAt":"2026-10-19T17:29:17Z","published":true}],
  "activePublishers": [],
  "openRecovery": false,
  "materiallyStale": false,
  "outputCheckedAt": "2026-10-19T17:29:17Z",
  "failureReason": "No unresolved failure"
}
```

For news include `newsGapMinutes`. For an already failed owner also require
`repairValidated: true` or `sourceRecoveryVerified: true` with corroborating proof
in the checkpoint. Equivalent runs can supply `covers: ["news-refresh.yml"]`.
Use `unchanged: true` only after verifying a successful source check, never to
reinterpret a failed run. Unknown outcomes or missing publication proof stop.

```sh
node tools/editorial-recovery.cjs evaluate evidence.json existing-local-date-ledger.json
node tools/editorial-recovery.cjs reserve evidence.json existing-local-date-ledger.json
node tools/editorial-recovery.cjs record verified-run.json existing-local-date-ledger.json
```

The CLI uses the actual current time; a saved evidence file cannot spoof its age.
The library takes explicit time for deterministic regression fixtures. Run records
carry key, owner, runId, runSha, verifiedAt and status. No credential belongs in
these inputs, records or source logs.

## Approved workflow hardening and external boundaries

The owner separately approved both exact current proposals on October19:
[editorial-owner-hardening-v2.patch](proposals/editorial-owner-hardening-v2.patch)
(SHA256 `f3cb73c1ec05a35c4912f0ce8098433ca334379ec7d50c99e51e32f0d3610042`)
and [archive-publication-retry.patch](proposals/archive-publication-retry.patch)
(`20fc22ccbb359dd43bd217c05f2f65bf0b5839a219b379a64fb0d53e714bbc49`).
V2 explicitly supersedes the original owner-hardening proposal. These approved
changes add news/availability pre-commit gates, all five regional watch output
trees, Kids retry gates, and safe push acknowledgement reconciliation in the
existing owners. The archive owner validates and regenerates after genuine main
conflicts using its original event revision. Unknown outcomes stop publication.
All triggers, cron expressions, permissions and concurrency remain identical.
PR307 published most of these safeguards while this change was under review.
Its validated availability staging and stronger daily-publisher fixtures are
preserved. The remaining V2 workflow difference stages all five regional watch
trees during midnight rotation, keeping the generated pages with their sitemap.
Executable regression fixtures exercise real bare Git remotes for successful,
lost-acknowledgement, rejected, conflicting and unknown publication outcomes;
failed gate fixtures prevent writes, and regional staging excludes unrelated code.
The coordinator does not apply these patches itself. Future protected changes
still require separate owner approval. No existing test or lock is weakened.

GitHub scheduler delivery remains external. GDELT rate limiting and low publisher
frequency may produce fewer sports stories. No additional API, feed, charge,
indexing guarantee or native Android certification is implied. Branch-protection
inspection returned HTTP 403 (integration lacks administration endpoint access);
repository ruleset listing returned no rulesets. Normal PR/merge checks still
apply; neither observation authorizes an administrative bypass.

The October 19 day-of candidate already exists at
`fix/international-day-20261019-coordinator`, commit
`8012ad28fa973721c9e28814a4daef4c89dc1508`. Its checkpoint records an earlier
PR-creation safety rejection. It remains the existing coordinator's candidate;
do not create a second curator or repeat that rejected operation through a
workaround. Archive-only success is not proof a current observance was created.

## Additional observed archive repair

The existing October 19 candidate was accepted through the supported GitHub
review action as PR303 under the renewed instruction, then merged as
`2658be4bf3154282e06624322099239ed2363f22`. The original source and artwork
were rechecked; no new curator or guessed theme was introduced. Archive run
39299816203 then lost a push race to independent PR299. Its candidate only added
`_contract` and `_note`: the October18 record was already present from midnight.
The generators now normalize those notes identically, keep no-op bytes unchanged,
and fail closed on malformed history. The outgoing archiver uses the original
push event's SHA after a fresh-main regeneration. Three real-repository regression
fixtures cover all three paths. The separately approved protected retry/validation
change is [archive-publication-retry.patch](proposals/archive-publication-retry.patch).
The old failed job is not
blindly rerun because current retained data already covers its actual purpose.

CodeQL's result check identified a file-system race in the first archive no-op
comparison. Both archive entry points now use `retained-history.cjs`: a single
opened descriptor owns parsing, comparison, bounded complete UTF-8 writes,
truncation and synchronization. A real pathname-replacement regression proves
that a replacement file is untouched; partial-write and error cases are tested.
No alert is dismissed and no analyzer, rule or gate is weakened.

## Regeneration defects found in the natural release run

Midnight39311818701 completed successfully on the approved workflow, but its
generated diff exposed two remaining defects. The event archive restored the
older `match-tokens.js` URL while Home already used the current approved URL.
The event generator now reads Home's actual token script and stylesheet URLs
before replacing any last-good page, preserving load order and future cache
updates. Missing authoritative asset URLs remain a failing build.

Awareness Home synchronization removed its block without consuming its two owned
separator lines, adding blank lines on every otherwise unchanged rotation. It
now removes those owned separators with the block, preserving unrelated markup
and making repeated replacement, duplicate cleanup and empty-campaign passes
byte-stable. The sitemap index also advanced its timestamp on every unchanged
check. Its timestamp now advances only when the canonical sitemap changes;
unchanged XML is not rewritten, and changed XML is replaced atomically.
The event, catalog-SEO and watch generators also ran the brand finalizer across
other owners' pages, leaving unstaged HTML changes that influenced sitemap dates.
Their finalization is now limited to their existing owned output paths. The
dedicated Brand owner retains its unchanged global default and publishing lock.
Recovery fingerprints include these shared sitemap/finalization dependencies
for every affected owner, while unrelated owners retain their retry budget.
Isolated regressions reproduce the old cache, whitespace and sitemap-index
failures and preserve genuine URL-set updates, without network requests or
changes to real editorial sources, application logic or design.

## Browser-audit observation reliability

Production audit39316456653 timed out on its live-video polling check after
the short intro element had disappeared. The QA harness now retains decoded
frame geometry from media events registered before navigation, so natural
teardown cannot erase that evidence before the browser polling callback runs.
It preserves the same playback-ready predicate and all geometry, duration,
trusted natural-ended, full-duration, Skip and same-session checks. Owned media
errors fail the audit; disappearance or synthetic events never count as proof.
The production intro and application behavior are unchanged.

## Verified artwork loading boundary

The final production audit twice found a genuinely missing audiobook cover.
An isolated real Chromium check reproduces one loading defect: a hidden lazy
image never requests its source, so an image-load timeout cannot resolve it.
The matcher cover loader now follows the existing metadata owner's handoff:
request eagerly, keep pending pixels transparent and the original fallback
visible, and reveal only successfully decoded source pixels. Errors retain
the fallback and remain failing original-art checks. Selection, reservations,
quotas, identity verification, source priority and all timeouts are unchanged.
Both existing matcher entry points receive a new asset query parameter.
The existing deep audit retains sanitized image/load evidence and now requires
the decoded image to be visible, making this assertion stricter. The two old
failed attempts remain evidence; no additional blind retry is authorized.
