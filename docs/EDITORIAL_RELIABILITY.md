# MatchApp Ai editorial reliability

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

## Owner inventory

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

## Remaining approval and external boundaries

The exact proposed workflow change is
[editorial-owner-hardening.patch](proposals/editorial-owner-hardening.patch).
It is review material, not automatically applied by a tool or by the coordinator.
Separate owner approval is required before modifying protected YAML. Trigger,
cron, permissions and concurrency equivalence and Bash syntax were checked on a
temporary copy. Existing tests and locks are not weakened.

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
