# Verified curation coverage — 26 September 2026

This inventory describes the source boundaries for MatchApp's matching systems.
A large search-result count is never a substitute for an accurate title, genre,
mood, official artwork, regional availability, preview, or child-safety review.

## Current implemented breadth

| Surface | Current source and discovery | Safe scaling boundary |
|---|---|---|
| Adult movie / series | ~202 original editorial profiles in `app.js` plus on-demand source-verified TMDB discovery | Source genre, movie/TV kind, synopsis mood, country, age and platform rules remain hard. After a bounded source window is exhausted, future requests inspect subsequent TMDB pages in that browser session rather than claiming the whole TMDB catalog is empty. A filtered live match is not a license to relax a user's Comfort choice. |
| Music / podcast | Original adult editorial profiles plus Apple iTunes search | Up to 100 regional, source-format-correct Apple audio/podcast records per eligible request. This never proves Spotify playlist or single identity/availability. Apple previews are official-source-only. |
| E-books | **151** editorial book profiles, up from 114 | Exact-title/author Open Library and Google Books cover recovery runs on demand. Edition-specific covers and free rights are never invented. Books retain their mood/genre contract. |
| Audiobooks | The same **151** book profiles; separate exact-edition checks | Only author/title-exact Apple Books audio editions in the user's storefront and US-eligible exact LibriVox projects qualify as verified. Verified Apple audio samples may be embedded only from the trusted official preview host. No inferred narration metadata. |
| Magazines | **31** known original publisher identities, up from 24 | Publisher article, official issues/cover and subscription pages. These are publisher **identities**, not invented inventory of particular issues or free full-magazine downloads. |
| Kids matching and AI | **64** individually editorially reviewed adult-independent Kids titles | Do not automatically promote source-rated discoveries into the allowlist. The extra TMDB family discovery shelf can page up to 500 source pages with strict content-rating, identity, synopsis and official-art checks, bounded concurrent work and guardian-facing source labels. |

Counts are code-verified baseline profiles and magazine *publisher identities*,
not universal real-time store inventory or proof of every poster or playable
sample. Availability, publisher licensing, free copyrights and API connectivity
can change by country. If none pass the actual selection, state that honestly
and offer controlled alternate filters without silently changing constraints.

## Source provenance and accuracy

- Film/TV: exact numeric TMDB ID, media kind and source genre, regional
  provider proof, official poster and preview where available. No fuzzy-title
  poster swaps or invented stream availability.
- Music/podcasts: iTunes audio category requires the exact Apple source type;
  albums cannot silently become singles or a Spotify playlist. Audio previews
  must use the official audio-ssl.itunes.apple.com domain.
- E-books: editorial book metadata does not prove a retail *edition*. Fetch
  original cover art with exact title and author; any failure stays clearly
  labelled rather than becoming an artificial substitute presented as original.
- Audiobooks: an Apple or LibriVox record must be verified by the audiobook
  source independently of the printed-book profile before linking or playing
  an edition-specific preview. No unverified free audio rights outside the US.
- Magazines: links go to official publisher pages. An original brand favicon
  may be unavailable; retain a truthful publisher text identity instead of
  substituting another magazine's cover.
- Kids: only manually reviewed allowlist records may power Kids matching,
  Ask AI or saved titles. New source-rated cards require individual adult
  editorial review before promotion. No adult books, audio or magazines enter Kids.

## Bounded trusted-source escalation (added after the original profile expansion)

When the eligible editorial list and exact TMDB source lookup cannot satisfy a
request, the adult matcher now tries a **separate, attributed TVmaze TV index**.
That secondary source is only eligible for series without third-party platform,
content-rating, origin-country exclusions or custom vibe that TVmaze cannot
prove. Actual TVmaze source genre, summary and original source-owned image
must pass the SAME strict mood and blocked-content gates, and the result links
to the TVmaze source page under its CC BY-SA attribution. This tier is never
available in Kids Mode and cannot certify any Netflix or other streaming
availability. It is paginated, bounded and progresses through source pages
between exhausted attempts without downloading thousands of images.

For regional music and podcasts, two differently phrased **official Apple
catalog** searches are checked; a wider query never relaxes source media type,
mood, existing exclusions or image/previews validation. The audiobook verifier
tries an alternative title-only Apple Books search only after the title+author
query fails, but independently requires the exact book AND author, correct
storefront and verified audiobook page. Eligible US LibriVox checking considers
more source candidates. Audible, Kobo, Spotify and Google Play *searches*
remain explicitly unverified until an authorized edition-level API is added.

For e-books, the system already checks exact Open Library and Google Books
covers. If the **entire matching editorial book pool** is exhausted, an optional
new source can check additional Open Library bibliographic results against a
second, exact-title-and-all-authors Google Books record that confirms a
saleable official edition **in that user's country**, with a real source-owned
cover and substantive publisher description. It runs only when mood, reading
pace and length are unrestricted: it cannot pretend bibliographic genre tags
prove a subjective cozy mood or unknown pacing. A separate bounded Gutendex
query exposes a direct canonical Project Gutenberg page only when title,
author and US public-domain metadata all agree. In other countries it does not
mislabel Gutenberg records as legally free. The publicly hosted Gutendex
service recommends self-hosting for sustained production volume; on-demand
request caps are transitional, and an owned compliant deployment or licensed
source is needed before high-volume scaling.

Magazines remain publisher-first: their existing 31 publisher identities point
to original issue and subscription pages rather than scraping or fabricating
third-party issue covers. Kids retains the owner-protected 64 reviewed
recommendations and separate broad source-rated TMDB shelf. Newly discovered
family titles cannot automatically enter Kids matching/Ask AI without
individual age/content and rights review. This limitation is intentional.

**No infinite guarantee:** even every lawful catalog combined cannot produce a
verified edition for impossible combinations, exhausted exclusions, regional
rights limitations or provider outages. Keep hard choices intact, don't spend
credits on failed source verification, and give truthful suggestions instead
of recommending unrelated works.

## Outstanding work before any universal-coverage claim

1. Recover source-verified covers that fail exact book-identity APIs; record
   source outages separately from a title having no genuine known cover.
2. Replace inaccessible publisher favicon endpoints only with publisher-owned,
   verified alternatives. Keep original issue covers on publisher pages until
   licensed, permitted media endpoints are available.
3. Expand premium commercial book editions via authorized publisher/retailer
   feeds and explicit jurisdiction-level rights metadata; static book profiles
   do not prove that a particular audio edition is currently sold everywhere.
4. For Spotify-native playable previews, playlists and podcasts, use an
   authorized provider integration with its own attribution, playback and
   developer policy. An Apple preview must never masquerade as Spotify.
5. Expand Kids matching only after documented, title-by-title source-age,
   content and episode review and accurate original-art and region checks.
6. Extend *authorized* existing serialized editorial source ingestion only
   after explicit approval that respects
   `docs/EDITORIAL_AUTOMATION_LOCK.md` and source/API quotas.

The adult web/PWA and existing adult Android WebView use the same deployed
catalogue changes without a native AAB version bump. The Kids web and Kids
WebView share the untouched protected child catalog. This change does not
alter protected AdSense placements, editorial workflows, plans or quotas.

Before any live production claim: run `npm test`, `npm run audit:site`,
editorial/AdSense locks, normal matching/Bookworms/Ask AI regression and
after-deployment live browser and native-specific smoke tests. Real third-party
availability and device checks must be reported separately from unit tests.
