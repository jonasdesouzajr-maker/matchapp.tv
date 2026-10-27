# Source accuracy and search opportunities — 27 October 2026

Status: review draft; no merge, deployment, search submission, new credential,
account setting change or purchase. Base: `fa6cc3156` (current main when work
started), isolated worktree. Existing October 27 evergreen guide work is retained.
Read AGENTS.md, DESIGN-LOCK.md and the editorial ownership lock. No repository
`.agents/skills` files or workspace skill files were available; the connected
Bing crawl-health skill informed the read-only investigation.

## Scope and actual demand

GSC Wizard `query_search_analytics`, explicit **2026-09-28–2026-10-25**, web,
settled through October 25: all **212 returned page rows** and **438 returned
query/page rows**, with pagination complete. Property totals: **153 clicks,
15,253 impressions, 1% CTR, 9.18 average position**. Query/page rows cover 47.06%
of clicks and 57.5% of impressions; hidden queries prevent a complete query list.
These are observed site metrics, not keyword-market search volumes.

| Existing destination | Google clicks / impressions | Demonstrated intents and decision |
|---|---:|---|
| Kota Dussehra | 101 / 11,368 | `kota dussehra mela 2026` (5 / 1,559); `kota dussehra mela 2026 program list` (18 / 2,794); date query (3 / 705). Clarify source dates and link the real programme. |
| Home | 27 / 850 | `matchapp` (15 / 370 to Home). Remove the false custom-avatar feature from schema; retain current brand metadata. |
| Brasil Game Show | 3 / 374 | `brasil game show` (0 / 161), `brasil game show 2026` (1 / 48). Make the 2026 archive status clear in the snippet. |
| Match Together | 0 / 232 | `match together` (0 / 106 to this page). Current title already says “What to Watch Tonight” and description explains the shared match. Retain; measure the existing change before rewriting. |
| Worlds 2026 | 1 / 226 | World championship / live viewing queries. Current description already covers dates, regional streams and VODs. Retain existing work; verify new broadcast claims before expansion. |
| CCXP | 3 / 123 | `ccxp26` (1 / 61). Add the explicit 2026 alias, dates, venue and programme intent to its title/description. |
| Tokyo film festival | 0 / 47 | `39th tokyo international film festival`. Add year and schedule intent to the title, replace the clipped description and link actual schedule/ticket guidance. |

Bing `get_bing_page_stats`, **2026-10-20–2026-10-26**, returned **13 page rows**;
`get_bing_query_stats` returned all **60 query rows**. Bing page data uses weekly
dated samples, not daily page traffic. Kota returned **1 click / 70 impressions**
(1.43% CTR, position 6) in this exact call; the separately supplied 72-impression
sample is not treated as the same window. Other page samples: breast cancer
awareness 0/55, Home 0/29, +SBT 0/23, Worlds 0/8. The +SBT query
`novelas do sbt assistir de graça` had 0/5. Date the existing +SBT catalogue
selection instead of calling its October 4 snapshot current. Do not invent
country availability. Breast cancer and Kids pages were assessed as opportunities
but not rewritten: clinical guidance and Kids age claims need their own source
and safety review. Irrelevant queries were not added as keywords.

This is a prioritized improvement pass across seven substantive public pages,
plus the existing trending page's locale-script cache reference. It is not a
claim that every indexed page has been individually optimized. Site audits cover
technical integrity more broadly. No keyword stuffing or unsupported offers,
ratings, ticket availability, search volumes or ranking promises were added.

## Primary sources and content decisions

- [Incredible India](https://www.incredibleindia.gov.in/en/festivals-and-events/rajasthan/dussehra-fair-2026)
  supplies October 20–November 6, Dusshera Ground, Kota, and District
  Administration, Kota. It describes cultural activities but is not a daily
  timetable or ticket checkout.
- [Kota Dussehra Mela programme](https://www.kotadussehramela.in/schedule/events)
  was retrieved October 27 and contains 2026 dated entries starting October 11.
  Its [municipality-branded homepage](https://www.kotadussehramela.in/) advertises
  October 11–November 5. Contemporary inauguration coverage independently
  identifies the launch of this domain as the fair website. The draft expressly
  preserves the discrepancy with Incredible India's window rather than inventing
  a single agreed closing date. The source lists a laughter show October 28 and
  laser show/Rajasthani-language poetry October 29; the guide gives a short
  attributed example and directs users to check times and venue details.
  It does not promise admission or that sessions will proceed unchanged.
- Kota's `LIVE NOW` remains a date-derived status within the attributed tourism
  window, not evidence of continuous opening hours or a live video broadcast.
  The existing timezone and 72-hour Home retention mechanics are unchanged.
- [Google Event date guidance](https://developers.google.com/search/docs/appearance/structured-data/event#date-time-best-practices)
  recommends date-only values when exact times are unknown. Kota and Tokyo now
  expose date precision in Event JSON-LD; internal lifecycle boundaries remain.
- [Tokyo festival](https://2026.tiff-jp.net/en/) and its
  [outline](https://2026.tiff-jp.net/en/tiff/outline.html) confirm October 26–November
  4 and central Tokyo venues. October 26 opening reports and October 27 reports
  establish current festival activity. Direct [schedule](https://2026.tiff-jp.net/en/schedule/list/)
  and [ticket guidance](https://2026.tiff-jp.net/en/ticket/) were checked. No seat
  availability or film streaming availability is inferred.
- [CCXP](https://ccxp.com.br/) confirms December 3–6 and São Paulo Expo. Ticket
  pricing/stock is not copied into the draft.
- [BGS venue](https://distritoanhembi.com.br/en/events/brasil-game-show-bgs-2/)
  confirms October 9–12, 2026 and explicitly marks the event expired.
- +SBT's existing page documents a selection checked October 4. Its official
  [catalogue](https://mais.sbt.com.br/catalog) remains authoritative. The current
  website requires client rendering; no fresh complete catalogue verification
  is claimed by this change.
- Home's removed `Custom MatchApp avatar synced across signed-in devices` claim
  conflicts with AGENTS.md's October 20 provider-photo-only contract and the
  current `avatars.js` implementation. Only that schema string is removed.

## Current trends, without invented popularity

[Google's October 14, 2026 Frightgeist report](https://blog.google/products-and-platforms/products/search/frightgeist-halloween-trends-2026/)
identifies year-over-year growth in searches for nostalgic Halloween movies
since 2019. The existing dated October guide already contains nostalgic film
comparisons, so it now cites this public source with authored text in all 14 app
languages. Its Hocus Pocus / Nightmare Before Christmas suggestions remain
editorial choices, not a Google ranking or Kids approval. Existing regional
availability caveats and original release-source check dates are retained.

The report also names gothic and mascot horror searches, but these terms are
not inserted into unrelated titles or unsupported recommendations. The parent
provided a Netflix October 27 article about the October 19 chart week; independent
retrieval failed in this environment, so no new Netflix rankings or view counts
were published. A fresh chart signal alone would not prove regional availability.
The existing daily trending publisher and dated chart sources remain intact.

## Bing 5xx investigation

`get_bing_crawl_stats`, requested **October 20–26**, returned October 20–25 only;
October 26 was unreported, not zero.

| Bing date | Crawled pages | Pages in index | HTTP 5xx | HTTP 4xx |
|---|---:|---:|---:|---:|
| October 21 | 97 | 153 | 1 | 1 |
| October 23 | 205 | 168 | 1 | 0 |

These are site-wide daily counts. `get_bing_crawl_issues` returned zero URLs;
Bing supplies neither the failed URL nor a request timestamp here. No evidence
connects either response to Kota. Current feed records report Success for all
three sitemap feeds; sitemap.xml was last crawled October 23 (266 URLs).

GitHub's complete October 21–23 run listing (597 runs, six pages) was reviewed:
October 21 Pages workflows: 8 successful, 2 cancelled; October 23: 15 successful,
4 cancelled, 1 failed. The failed [October 23 run 39920299567](https://github.com/jonasdesouzajr-maker/matchapp.tv/actions/runs/39920299567)
had a successful **Deploy validated Pages artifact** step. Its later smoke-request
step failed because a previous dispatch outcome required reconciliation. This
is not a hosting HTTP 5xx diagnosis. No recovery or workflow rerun was triggered.

Root cause remains unknown: origin/CDN request logs and Bing's affected request
identity were unavailable. Current success cannot establish historical uptime.
CLI GitHub API reads were forbidden; the connector's supported run-list and job
log endpoints supplied the above evidence. Direct site curl failed at the
network proxy with CONNECT 403, not an origin response from matchapp.tv.

## Search readiness and review limits

Google `inspect_url` for Kota: PASS, submitted and indexed, robots allowed,
fetch successful, mobile crawl October 26 at 14:07:38Z, Google/user canonicals
both match the public URL. This describes the existing live page, not this draft.
Yandex connection returned `notConfigured: true`; no indexing claim is made.
Canonical routes, robots and existing Google/Bing/Yandex discovery ownership are
preserved. Only changed sitemap entries receive updated lastmod values. No
submission occurs before an approved deployment.

No protected design, ads, matching, speech, account functionality, Kids code,
workflow schedule or native code is modified. Adult Android uses the live website
(MainActivity HOME points at matchapp.tv); these web changes would reach it only
after a separately approved deployment. No AAB or physical-device result is claimed.

Validation results and remaining blockers are recorded in the draft PR. Browser
rendering is blocked locally: Chromium is absent and Playwright's CDN downloads
returned 403 “Domain forbidden.” DOM/localization tests are not substitutes for
physical devices or rendered viewport evidence. Recheck the programme immediately
before any eventual publication because event entries can change.
