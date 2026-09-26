# Trusted-source escalation for adult matching (26 September 2026)

The objective is to **broaden live searching** whenever a strictly eligible
catalogue result is unavailable, not to loosen criteria or inflate stored title
counts. No verified source can promise a match for contradictory filters,
unavailable regional rights, exhausted user exclusions, or provider outages.

## Adult film, television, music and podcasts

1. Keep the existing exact curated match and multi-page TMDB source checks
   first. TMDB numeric ID, kind, real genre, synopsis mood, age rating where
   demanded, region-specific provider evidence and exclusion checks remain hard.
2. For adult **TV series only**, query the independent TVmaze public API when
   TMDB cannot return an eligible result. At most two bounded pages are queried
   per action; the source's genuine artwork, TVmaze URL, exact genre and
   synopsis must be present. Fail closed if selected platform, rating, custom
   vibe or production-country exclusion cannot be checked. Attach visible
   TVmaze attribution and its CC BY-SA source license to results.
3. Existing official regional Apple iTunes music/podcast discovery now tries an
   additional broad official query. Deduplicate exact records and re-check the
   Apple media/album/podcast type, original Apple cover hostname, all applicable
   source-backed mood gates and nonexplicit content before rendering. The
   extra query **does not** create verified Spotify playback or playlist pages.
   Real playable previews must be genuine official-source samples.

TVmaze's official API is licensed CC BY-SA and requires attribution **and**
ShareAlike compliance for derivative source data:
https://www.tvmaze.com/api . TVmaze source-derived text/art should be handled
under those terms; linking the original show page is not a separate commercial
license for third-party imagery. Review source obligations before high-volume
commercial syndication.

## Adult e-books, audiobooks and magazines

The editorial e-book corpus and original publisher magazine links are preserved.
After its eligible book shelf is exhausted, Bookworms can query the Open Library
book index and independently check the **exact title and author** in Google
Books with explicit source cover and country-specific retail sale data. This
route is disabled when the source cannot prove the selected subjective mood,
reading pace, length or free-edition rights. Live paid-edition confirmations
are held briefly for the same viewer's country, with previously saved book
identities still available. They are not proofs of permanent stock.

For a displayed **US-eligible** book only, a separate exact-author/title
Gutendex check can link to a canonical verified Project Gutenberg source when
the source explicitly records public-domain metadata. Other countries do not
inherit US copyright eligibility.

Existing Apple Books and LibriVox audiobook verification remains independent:
never turn a retailer search into a verified audio edition, infer a narrator or
pretend a free US recording is rights-cleared abroad. Existing magazine
publisher and official issue links are unchanged; third-party cover scraping is
not a permitted fallback.

Open Library permits real-time low-volume human-facing use, but explicitly says
its free API must not become a high-traffic commercial application's bulk data
backend; its documented default limit is 1 request/second:
https://openlibrary.org/developers/api .
Before major viral growth, use permitted bulk data/local indexing or arrange
source licensing and an owned, rate-limited source gateway instead of raising
browser request counts.

## Child safety, device parity and validation

Kids' existing separately editorially approved matcher and Ask AI remain
unchanged. The wider source-rated family shelf remains a **separate,
guardian-facing** source discovery feature: new titles cannot auto-promote
to the reviewed Kids allowlist without individual source, age, content,
episode, artwork and regional-link review. Adult explicit/XXX material is
rejected globally, and adult data is never imported into Kids.

All adult entry points use the shared deployed runtime; normal Android WebView
will receive these web changes without a Play Store package change. Native
emulator and real-device behavior must still be checked separately. Locked
AdSense layout, protected editorial writers, quota checks and saved/disliked
hard exclusions must not change.

Run complete `npm test`, `npm run audit:site`, original cover and Ask AI smoke,
Kids safety, AdSense/editorial locks and real live responsive smoke before
merging. Unit and static-source tests cannot establish that remote providers
will always be reachable. No quota is charged when a source cannot verify a
match.
