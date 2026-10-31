# Editorial pause during publisher review

Jonas requested this pause on 31 October 2026 so the public editorial pages stay stable while Google reviews matchapp.tv. Keep their original source dates. Search crawlers can still fetch the public pages and sitemaps.

| Surface | How the pause works | How to resume after the owner requests it |
|---|---|---|
| Daily site publisher | The refresh job in `.github/workflows/unified-refresh.yml` has an unconditional false job condition. Scheduled, dispatch and path-triggered runs skip the publisher. | Remove the commented hold and its job condition. Preserve the existing daily schedule and publication checks. |
| Home news | The `data-editorial-news="snapshot"` attribute on the Home document keeps the committed, dated news cards. Both live news paths honor this marker. | Remove the attribute and publish. Confirm regional news on a local and global edition. |
| Scheduled news ingestion | Pause the existing Supabase cron jobs `matchapp-news-breaking-30m` and `matchapp-news-general-15m` by setting their active flags to false. | Restore their active flags. Verify each job retains its original schedule and succeeds on its next run. |
| Automated advertising changes | Pause the MatchApp safe ad launch task. A separate read-only AdSense decision watch reports Google's response. | Review the approval, outstanding policy or consent issues and ad category restrictions before re-enabling the launch task. |

The pause covers automatic publishing. Visitors can still match titles, check viewing options, open publisher sources and use their accounts. After resuming, inspect the first successful publishing run and its public deployment marker.
