# Halloween web campaign — 4 November 2026

## Owner request and scope

Jonas requested an original spooky homepage poster, 20 Halloween movie recommendations with worldwide viewing options, movie-night ideas, SEO and traffic improvements, for the web version only. He extended the original removal date to **18 November 2026**. This campaign is authorized for publication after the existing release checks.

The homepage promotion expires at **2026-11-18T03:00:00Z**, midnight at the start of 18 November in `America/Sao_Paulo`. The browser removes the section at that instant, including an already-open page and a restored page. The owner also has a one-time scheduled removal/verification task for that instant. This is not another editorial content publisher or repository cron.

## Removal on 18 November

1. Read the current root instructions and editorial lock. Preserve concurrent changes.
2. Remove only `#ma-halloween-promo`, its adjacent `promo-copy.js` and `promo.js` script tags, and the homepage's `/halloween/promo.css` link from `index.html` if they remain.
3. Keep the complete evergreen `/halloween/` guide, all 15 translations, movie data, campaign artwork, internal movie-night links and sitemap entries. Do not delete the guide, redirect it, or set it to noindex.
4. Follow the existing tested GitHub Pages release flow. Let Pages dispatch its existing IndexNow and exact-deployment release smoke; do not create duplicate dispatches or schedulers.
5. Verify the live homepage no longer contains the campaign and the guide still works, then report the result to Jonas.

## Implementation

- Homepage artwork and copy: `assets/halloween/`, `halloween/promo.css`, `promo-copy.js`, `promo.js`. Only the new section receives negative grid order so the established home layout owner cannot move it beneath unrelated content. Existing header, hero, rail, ads, matching and other layout owners are unchanged.
- Homepage promotion is removed for recognized native Android hosts before poster source URLs are assigned. No Android or Kids source/build/listing changes are included.
- The permanent guide is `/halloween/` for English and `/halloween/{pt-br,es,fr,de,it,tr,ru,ar,hi,id,ja,ko,zh,zh-tw}/` for the other authored languages. Arabic uses RTL. Film proper names retain verified original identity.
- `tools/build-halloween.cjs` generates these 15 static pages from `halloween/copy/*.json` and `halloween/movies.json`. Run it when changing authored copy or source facts. It also creates `tools/halloween-urls.json`; the existing sitemap generator consumes that manifest.
- Public viewing-country selection uses the existing 249-country/territory list. Language never implies a country. A deliberate shared URL country and later country changes use the existing viewer-country owner.
- `guide.js` reads the dated snapshot, separates streaming/rental/purchase, and offers a bounded fresh lookup through the existing anonymous `tmdb-proxy`. It verifies exact ID, movie kind, year, original title and source type. Regional offer links must be HTTPS TMDB watch links for the same film and selected country.
- The static source snapshot is hidden as stale after seven days; users can request a fresh check. A failed initial snapshot does not block this recovery. Each live request has a 12-second timeout, at most three requests are pending, and navigation aborts pending work. A late older snapshot cannot overwrite fresh verified data.
- Country coverage in the source is incomplete. A country in the selector is not a promise that a title or service is available there. Empty provider rows are described as missing source offers. Subscription, ads, rental and purchase conditions are stated separately.
- These are editorial picks and three DIY movie-night ideas, not popularity rankings or advertised ticketed events. Scare levels are tone guidance, not official age ratings. Coco is identified with the distinct Día de Muertos tradition. Preview links use neutral labels because the proxy does not establish official-video status.

## Source provenance

Twenty movie identities, posters, release years, runtimes, cast, source ratings, previews and regional provider records were checked through the existing production TMDB proxy on 4 November 2026. Each record retains its actual `checkedAt` and title-source URL. Viewing attribution is JustWatch via TMDB. No new service secret, paid API or backend behavior was introduced; `halloween/config.js` uses the same public anonymous endpoint/key already shipped in `app.js`.

TMDB IDs, in editorial order: 9479, 10439, 642885, 354912, 62214, 9297, 617505, 864959, 591273, 575774, 138843, 694, 346364, 4011, 4232, 447332, 419430, 1933, 745, 567609.

## Search and traffic

- Crawlable original recommendations in 15 languages, self-canonicals, reciprocal hreflang plus x-default, descriptive titles and social artwork.
- CollectionPage, Article, BreadcrumbList and ItemList/Movie markup matches visible content and verified movie identities. No invented Event, Offer or aggregateRating markup.
- Existing sitemap includes all 15 guide URLs. English and Brazilian Portuguese movie-night pages link into the guide after the seasonal homepage placement expires.
- Country-preserving language links and visitor-initiated sharing support cross-border discovery. Existing dataLayer receives guide filter, source-check and share events; this does not assert that every event is already mapped to a GA4 report.
- After publication, submit the existing updated sitemap through the connected Google Search Console property. Existing Pages-owned IndexNow handles participating engines, including Bing and Yandex. The connected SEO service can read Google and Bing; Yandex Webmaster itself is not connected. Submission is not proof of indexing, rankings or traffic growth.

## Verification and limitations

- Focused runtime and SEO tests cover native isolation, exact expiry, all 15 translations, country/source identity, stale/error recovery, inflight selection changes, share/language destinations and static metadata/schema.
- Preview browser checked the actual homepage placement, 20-card guide, country changes and scare filter. Narrow iframe viewports at 320 and 390 pixels and an Arabic tablet viewport at 768 pixels had no horizontal content overflow. These are responsive browser checks, not physical-device tests.
- Connected Desktop Commander devices AdvDevOps and Jonas were offline during this work. No physical phone/tablet/laptop validation is claimed.
- The temporary preview origin cannot complete the live source lookup; the honest fallback is visible. Verify one successful fresh lookup on the production origin after deployment.
- Local full regression, site audit, content-rotation, build, protected ads and release alignment gates are run before release. The local audit required a 4 GB Node heap (`NODE_OPTIONS=--max-old-space-size=4096`); the default 2 GB heap exhausted memory without reaching a site result. Existing audit warnings must be distinguished from new errors.
- GitHub CI and exact live deployment verification are the final release evidence. See the campaign pull request and its Pages-owned release-smoke run for those results.

## Reproduction

```sh
node tools/build-halloween.cjs
node tools/update-sitemap.js
node --test --test-isolation=none --test-force-exit tests/halloween-runtime.test.cjs tests/halloween-seo.test.cjs
npm test
NODE_OPTIONS=--max-old-space-size=4096 npm run audit:site
node tools/check-content-rotation.js
npm run build
```

Do not modify unrelated generators, workflows, ad inventory, matching/Ask routing, billing/auth/quota, source poster artwork, the protected brand design, native Android or Kids as part of routine campaign maintenance.
