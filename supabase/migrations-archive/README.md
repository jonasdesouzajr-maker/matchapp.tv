# Legacy migration source archive

This directory preserves 22 legacy SQL files removed from the executable
`supabase/migrations/` directory during the 2026-10-18 migration-history recovery.
Their original filenames and bytes remain intact in `legacy-local/`.

## What the recovery changed

The production journal contained 78 applied versions. Recovery restored the 56
missing canonical files from their original recorded SQL and retained the 22
already aligned files. Recorded statement counts, Unicode character counts and
MD5 checksums were verified; restored files preserve each recorded SQL string's
exact UTF-8 bytes, line endings and final-newline state. Existing canonical 001–008
remain unchanged because their journal arrays omit statement terminators.

This restores repository evidence of work already applied. It neither rewrites
database history nor reapplies historical SQL. At the recovery checkpoint, the
canonical directory matched all 78 recorded versions without duplicate or
unintended pending versions. Future schema changes require new migrations.

The archived files used 17 unrecorded version prefixes across 21 files, plus an
008 collision with canonical `008_ai_rate_limit.sql`. Some combine later fixes or
abbreviate deployed SQL. Keeping them executable could replay legacy operations;
renaming them to recorded versions would misrepresent the original history.

## Preserve the existing test fixtures

Thirteen tests retain these exact sources through 19 path-only reference updates.
Their assertions, SQL bytes and execution order are unchanged. Do not substitute
newly recovered canonical files merely because their names describe similar work.

The token, cohort and parity fixtures explicitly use a UTC PGlite session so the
session date agrees with the wallet and check-in ledger day even when the host
computer is still on the previous local date.

In particular, token/cohort/parity fixtures retain this order: standardized VIP
limits; the daily-checkin reward-delta source before `do $backfill$`; registration
welcome bonus; canonical share-key source; then newer migrations. The archived
three-share database fixture also remains unchanged. These are specific test
baselines, not a migration sequence to execute wholesale.

## Historical distinctions and limits

Local `010_final_production_audit_hardening.sql` corresponds to `20260915185500`.
The earlier `20260915185422` used `auth.uid()` directly in two DELETE policies;
the later entry uses `(select auth.uid())`. Both original canonical entries are
preserved separately.

No equivalent journal entry was proven for these five archived sources:

- `012_account_deletion_72h.sql`
- `013_taste_profile.sql`
- `014_free_accounts_five_daily.sql`
- `014_site_hits.sql`
- `20260922100000_kids_favorites_sync.sql`

They may have been applied manually. Journal absence does not prove that their
production objects are absent. The recovered history references `user_taste`
without creating it and does not mention `kids_favorites`,
`account_deletion_requests` or `site_hits`; an empty-database bootstrap is therefore
not established by this recovery.

## Historical scraper trigger

The protected `.github/workflows/scraper.yml` remains unchanged. Its legacy
`supabase/migrations/011_catalog_media_metadata.sql` push filter is only a trigger;
the workflow never reads that SQL at runtime. Scheduled, manual and script/ingest
triggers remain intact. Changes limited to the replacement canonical SQL or this
archive do not match that historical filter and do not automatically trigger the
scraper through it.
