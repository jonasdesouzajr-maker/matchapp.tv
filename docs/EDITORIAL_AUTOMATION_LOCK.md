# MatchApp TV editorial automation lock
Owner directive — 2026-09-25. Applies to GrokBot, other AI coding agents,
GitHub Actions and manual edits until the owner explicitly changes it.

## Source ownership and publication
- **Global events:** verified records in `tools/global-events.json` generated with
  `tools/build-global-events.js`. Maintain accurate localized dates, official
  programme/ticket/watch destinations, event-specific original/official
  artwork, full source and SEO metadata. No fabricated addresses, posters,
  direct streams or organizer affiliations. A finished Home event moves to
  the end with the ENDED ribbon for **72 hours after its actual end instant**;
  indexed guide pages may remain available after the Home card disappears.
- **International Day:** the day's complete `data/international-day.json`
  record, deduplicated `data/international-day-history.json`, vetted art,
  per-event keywords and multilingual metadata. Keep previous day cards at
  the end of the Events row with ENDED for **three days**. Preserve the
  existing on-page source-authoritative data renderer; it is adult-only.
- **Awareness spotlight:** `tools/awareness-bot.mjs`, official-source-gated
  `awareness/calendar.json` and `awareness/current.json`. Neither CI nor
  Pages deploy may force a named September 2026 campaign forever. A global
  awareness *observance* with no physical venue is a WebPage/observance
  resource, not a fabricated physical Event location. Keep a recently ended
  observance's indexed page and SEO active for the three-day retention window.
- **News:** `tools/refresh-news-rss.js` is the single RSS/news source
  generator; use named publishers, direct original URLs and dated metadata.
  Fail closed on too few trusted headlines; preserve prior committed news
  rather than push empty/stale data. Hourly refresh remains independent of
  midnight, but writers must not compete for git publication.
- **Sports news:** The owner-approved sports edition uses the public GDELT Project DOC 2.0 API to discover original publisher URLs, not restricted BBC Sport RSS syndication. `tools/refresh-sports-discovery.js` builds `news/sports.json` **twice daily at 11:17 and 23:17 UTC**. `tools/refresh-news-rss.js` remains the sole news HTML/SEO/archive/URL manifest generator and merges only fresh verified sports rows. Sports has a strictly path-filtered `on:push` self-check when its own workflow file changes, so the first deployment collects data immediately; recurring sports collection remains at 11:17 and 23:17 UTC. A mere crawl time change must never light the new-headline bell. The sports publisher uses the same serialized git lock, existing news carousel and original-source click behavior. Sports discovery copies no publisher images or article bodies, and identifies discovery time rather than inventing precise source publication dates. Errors leave previously committed news intact. The /news/ hub is already in the sitemap; thin source wrappers remain noindex.
- **Top Titles:** the Home marquee contains **exactly ten unique editorial
  identities**, followed by identical ten-card marquee copies for smooth
  scrolling. Keep verified official exact-title posters; never replace them
  with generic text, gradient or wrong-title artwork. `catalog-media-ingest`
  refreshes server-authoritative TMDB metadata and country-aware providers;
  it enriches the existing Home titles but does **not automatically replace**
  the Home editor's ten curated identities. Updating the curated Home ten
  requires a separate trusted editorial update using real identity, official
  art and the existing presentation/Ask Ai action; do not describe the
  separate TMDB feed as an automatic Home marquee update when it is not.
- Preserve exact naming "Latest titles trending right now" and all existing
  matching, Ask Ai, Kids gating, Android variants, AdSense and responsive UI.

## Pipeline invariants
1. All repository-writing editorial workflows share one serialized
   `matchapp-content-publish` GitHub concurrency group, `cancel-in-progress:
   false`. Do not add parallel data owners or race two bots against Home,
   news, event URL manifests or the same sitemap.
2. Midnight runs at 03:00 UTC (00:00 in São Paulo); hourly news uses
   37 minutes past each hour; sports at 11:17/23:17 UTC; If GDELT's public DOC API cannot establish a secure connection, only approved The Conversation sports Atom and SportBusy partner RSS feeds with public attributed headline+canonical-link syndication permission may supply verified fresh original-link results; SportBusy betting/promotional content is excluded. Don't copy any source photos, bodies or gambling promotions, and always distinguish publisher-provided dates from GDELT first-seen timestamps. awareness is a recovery/source recheck at
   03:45 UTC plus its existing daytime pass. Preserve scheduled/on-demand
   functionality and only change cadence if owner approves.
3. Midnight stages only known generator-owned artifacts, never `git add -A`
   over unrelated files. On a rejected push, refresh `main`, re-run generators
   and ALL quality checks, then retry; never rebase stale generated HTML.
4. Preserve the OIDC-protected Supabase `catalog-media-ingest` and its
   server-only credentials. Existing trending rows may be retired only after
   successfully upserting replacement data. Return actual authentication
   403 vs backend 500; do not hide failures or clear data on API errors.
5. GitHub intentionally suppresses `on: push` workflow triggers for
   `GITHUB_TOKEN` commits. External/direct main pushes invoke the custom
   Pages validation workflow automatically. For each successful bot-generated
   content commit, its owning workflow **must explicitly dispatch exactly
   one `pages-deploy.yml --ref main`**; never dispatch for a no-op.
   Do not separately dispatch IndexNow. Only the successfully completed
   custom Pages deployment dispatches IndexNow, with scheduled recovery.
   Pages newest-wins deploy concurrency ensures the latest committed
   content is published without stale deployments or duplicate pings.
   Do not claim GitHub's dispatch means deployment actually succeeded.
6. `tools/check-content-rotation.js` and
   `tests/editorial-workflow-contract.test.cjs` enforce the basic
   cross-generator data/workflow rules. Keep AdSense's separate immutable
   lock and both release validation and custom deployment gates. Generated
   pages must pass SEO, source, metadata and site tests before publishing.

## How to prevent GrokBot reverting this
All coding agents: do **not** replace workflow YAML with a previous
checkpoint or a Grok-generated generic template. Read this file, AGENTS.md,
CODEOWNERS, and the current workflow versions first. Present owner-visible
diffs when changes to these protected files are necessary. An automated
regression test must not be weakened to accommodate a conflicting rewrite.
Owner-review code ownership is declared for every workflow and lock/guard
file, not just AdSense. **Actual GitHub enforcement requires the owner to
enable a branch ruleset for main that requires pull requests, code-owner
approval and required checks**; CODEOWNERS/test files alone cannot block an
agent already allowed to push directly to main. If the branch protection is
not enabled, never claim these instructions physically revoke write access.

On a PR that edits multiple workflow YAML files, do not enable same-workflow
self-trigger patterns for news, Kids SEO and SEO hardening: GitHub concurrency
can replace older pending runs. Keep the midnight self-trigger as the single
full-content recovery on editorial workflow changes. Ordinary data-source
pushes and each independent recurring schedule remain intact.
