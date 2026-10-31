# Editorial pause during publisher review

Jonas requested this pause on 31 October 2026 so the public editorial pages stay stable while Google reviews matchapp.tv. Keep their original source dates. Search crawlers can still fetch the public pages and sitemaps.

| Surface | How the pause works | How to resume after the owner requests it |
|---|---|---|
| Daily site publisher | The refresh job in `.github/workflows/unified-refresh.yml` has an unconditional false job condition. Scheduled, dispatch and path-triggered runs skip the publisher. | Remove the commented hold and its job condition. Preserve the existing daily schedule and publication checks. |
| Home news | The `data-editorial-news="snapshot"` attribute on the Home document keeps the committed, dated news cards. Both live news paths honor this marker. | Remove the attribute and publish. Confirm regional news on a local and global edition. |
| Scheduled news ingestion | Pause the existing Supabase cron jobs `matchapp-news-breaking-30m` and `matchapp-news-general-15m` by setting their active flags to false. | Restore their active flags. Verify each job retains its original schedule and succeeds on its next run. |
| Automated advertising changes | Pause the MatchApp safe ad launch task. A separate read-only AdSense decision watch reports Google's response. | Review the approval, outstanding policy or consent issues and ad category restrictions before re-enabling the launch task. |

The pause covers automatic publishing. Visitors can still match titles, check viewing options, open publisher sources and use their accounts. After resuming, inspect the first successful publishing run and its public deployment marker.

## Publisher request hold

Home and the public event archive set Google’s `pauseAdRequests` flag synchronously before the first Google tag. This temporary owner-requested exception covers every visitor and every manual or automatic AdSense placement on those pages. It leaves the verified publisher identity, ad engine, CMP, slots and their layout in place. No consent decision, URL parameter, account action or timer releases the hold.

The flag pauses AdSense ad requests. The publisher script and consent message can still load, and existing Google-domain cookies may be read. The hold neither grants a commercial licence nor removes TMDB-sourced media or data from the product. Before restoring ad requests, document permission covering the intended use or remove and replace the affected material, and verify the production consent flow for EEA, UK and Swiss users. Check the consent prompt, refusal, acceptance, return visit and revocation. Once the owner authorizes resumption, remove the `ma-publisher-review-hold` script from Home, the event archive and its generator in one release. Recheck the publisher controls on the published revision. [Google’s ad-request pause](https://support.google.com/adsense/answer/7670312) · [TMDB API FAQ](https://developer.themoviedb.org/docs/faq)

## IMDb and OMDb

Public match results can link to the exact IMDb title when the verified identity includes an IMDb ID. They do not fetch or publish scores from OMDb. The compatibility endpoint returns an unavailable response so older clients stop receiving scores as well. Keep this behavior independent of the AdSense decision. Public title links follow [IMDb’s linking guidance](https://help.imdb.com/article/imdb/general-information/how-do-i-link-to-a-specific-page-on-your-site/GTRTF6K8UA9JP9QQ). [OMDb’s usage terms](https://www.omdbapi.com/) and the [TMDB commercial API conditions](https://developer.themoviedb.org/docs/faq) apply to their respective sources.

Re-enabling an ad-launch task or publishing an editorial update must not lift the ad-request hold. Any later restoration of OMDb-derived ratings requires separate evidence of rights to display those fields on the actual public product.
