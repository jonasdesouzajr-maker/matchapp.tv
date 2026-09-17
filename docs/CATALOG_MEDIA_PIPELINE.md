# Catalog media enrichment pipeline

This feature is intentionally additive. It does **not** replace MatchApp's matching engine, `CONTENT_CATALOG`, billing, Watch Later/history, Match Together, or the Kids allowlist.

## What it uses

- **TMDB** for exact movie/TV identities, posters, backdrops, overview, genres, runtime, ratings, trailers/clips, daily trending titles, and regional watch-provider data.
- **iTunes Search API** only for audio/music artwork and short audio previews where MatchApp already has an audio title.
- **Supabase `public.catalog_media_metadata`** as the public read-only metadata cache consumed by the browser.

The pipeline deliberately does not scrape JustWatch HTML. TMDB's watch-provider endpoint supplies regional provider data sourced from JustWatch while giving us a stable API contract and the same identity checks used elsewhere in MatchApp.

## Security and secrets

Browser code never receives a TMDB secret or Supabase service-role key.

GitHub Actions secrets required for the scheduled refresh:

- `TMDB_READ_TOKEN` (preferred) **or** `TMDB_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

The service-role key is used only by the server-side GitHub Action to upsert `catalog_media_metadata`. The table keeps RLS enabled and public clients remain SELECT-only.

## Data contract

The existing `catalog_media_metadata` table is used without schema changes. Important fields include:

- identity: `source_key`, `title`, `normalized_title`, `year`, `media_kind`, `tmdb_id`
- freshness: `is_catalog_title`, `is_trending`, `trending_rank`, `source_updated_at`, `updated_at`
- Kids safety: `kids_approved`, `kids_age_bands`
- images: `poster_url`, `poster_large_url`, `poster_original_url`, `backdrop_url`
- metadata: `overview`, `genres`, `runtime_minutes`, `content_rating`, `vote_average`, `original_language`
- preview: `preview_kind`, `preview_provider`, `preview_url`, `preview_embed_url`
- providers: `availability` JSONB keyed by region

`source_key` is the primary key and is the conflict target for upserts.

## Exact-match safety rules

The refresh refuses a movie/TV result unless:

1. the normalized title is exact,
2. the media kind matches,
3. a known catalog year agrees within one year,
4. TMDB does not mark it adult.

Popularity is never allowed to override identity. A skipped title is safer than a wrong poster/trailer.

Kids approval is never inferred from TMDB, trending status, popularity, genre, or rating. A row is `kids_approved` only when its title already exists in MatchApp's curated Kids library; the existing age bands are copied from that allowlist.

## Daily GitHub Action

`.github/workflows/scraper.yml` runs at 06:17 UTC daily.

The staging branch is always forced to `--dry-run`, so it cannot mutate production Supabase. On `main`, the same validated script resets old trending flags and upserts the fresh rows.

Each run:

1. runs the full existing test suite,
2. verifies server-side credentials are present,
3. fetches/validates metadata,
4. writes a JSON report,
5. validates poster coverage,
6. uploads the report as a 14-day Actions artifact,
7. runs the normal site audit.

Manual dry run:

```bash
TMDB_READ_TOKEN=... node tools/refresh-catalog-media.js --dry-run
```

Live execution is intentionally possible only with `SUPABASE_SERVICE_ROLE_KEY` present.

## Frontend behavior

`tmdb.js` loads `catalog-media.js` and `catalog-media.css` as a small enhancement layer anywhere the existing TMDB bootstrap already runs.

### Posters

Existing poster behavior remains first-line. If a scoped title image fails:

1. query `catalog_media_metadata` for the exact title,
2. use the trusted cached TMDB/iTunes image if available,
3. otherwise render a local data-URI SVG cover using MatchApp's current purple/gold visual language.

This prevents a broken-image icon without rewriting existing poster selection.

### Regular previews

The existing `matchapp:newmatch` event is used after a result has already rendered. The enhancement queries Supabase and mounts media into the existing `#res-trailer-container`:

- safe YouTube trailer/clip -> privacy-enhanced `youtube-nocookie.com` iframe,
- direct video -> native `<video>`,
- audio -> native `<audio>` with cover.

When no verified preview exists, the embedded slot stays hidden and MatchApp's existing YouTube-search fallback remains available.

### Kids previews

The existing Kids watch dialog is enhanced only after a title is opened. A preview is eligible only when the Supabase row has `kids_approved=true` and its `kids_age_bands` permits the currently selected age band. No trending title can enter Kids Mode merely because it has a family-looking TMDB record.

## Monitoring

### GitHub Actions

Each workflow run records coverage and duration in the job summary and preserves `data/catalog-media-report.json` as an artifact. Track:

- resolved rows / catalog inputs,
- poster coverage,
- preview coverage,
- Kids-approved resolved rows,
- skipped/ambiguous titles,
- duration and workflow failures.

### Supabase

Use `pg_stat_user_tables` and normal Supabase database metrics to watch reads/scans on `catalog_media_metadata`. The existing indexes on `normalized_title`, `tmdb_id`, and trending fields should keep browser lookups cheap. Do not weaken RLS for performance.

### Search Console / Analytics

Take a pre-release Search Console snapshot, annotate the deployment date, then compare the same-length settled period after release. Watch organic clicks/impressions/CTR and title-guide pages. For product engagement, compare match completion, preview availability/play interaction, return sessions and engagement once GA4 access is connected.

### Cloudflare

No Cloudflare account connector is required by the code. If Cloudflare Logpush/Analytics is available, watch response status, cache ratio and latency for static assets plus Supabase/Edge traffic around release. Do not add a new Cloudflare Worker solely for this feature unless real production telemetry shows a bottleneck.

## Promotion checklist

Before merging staging to `main`:

- full existing tests pass,
- media refresh dry-run passes,
- report has meaningful poster/preview coverage,
- ambiguous titles are skipped rather than guessed,
- final site audit passes,
- production writer secret is confirmed present,
- Supabase staging check confirms no writes occurred from the staging branch.

After merge, run the workflow once manually on `main`, verify Supabase row counts and a small sample of movie/TV/audio/Kids rows, then allow the daily schedule to continue.
