# Browser preview source presentation — November 5, 2026

This is an additive browser presentation repair. Existing matching, exact-title
checks, audiobook verification, player behavior, native/Kids surfaces, consent,
advertising and publishing controls retain their existing owners.

## Official evidence

- [Apple Search API terms](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/index.html): promotional use, proximate approved store badge and exact-item link; song/music-video source credit “provided courtesy of iTunes.”
- [Apple Books identity guidelines](https://marketing.services.apple/apple-books-identity-guidelines): original badge artwork, exact book/audiobook destination, clear space, compact-layout allowance and once-per-website trademark notice. Legal-notice translations require Apple's approval.
- [Apple Music identity guidelines](https://marketing.services.apple/apple-music-identity-guidelines): the “Listen on” badge is for links to artists, albums, songs or playlists on Apple Music; distinguish Apple Music listening from iTunes purchases.
- [iTunes identity guidelines](https://marketing.services.apple/itunes-identity-guidelines): only Apple-approved store badge artwork; preserve the iTunes Store name and exact purchase destination.
- [TVmaze API licensing](https://www.tvmaze.com/api#licensing) and [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/): attribution and ShareAlike conditions; proprietary product restrictions cannot remove the rights granted by the open license.

## Original Apple-hosted SVGs

These URLs appeared in Apple's own Marketing Toolbox page HTML and were opened
successfully as SVGs in the browser on November 5, 2026. No badge was redrawn,
recolored, cropped, translated or synthesized.

| Use | Exact original asset | Source page |
| --- | --- | --- |
| Exact books.apple.com book/audiobook item | https://toolbox.marketingtools.apple.com/api/assets/featured-content/books/badges/badge-2/en-us.svg | https://toolbox.marketingtools.apple.com/en-us/apple-books/us |
| Exact music.apple.com song/album item, excluding app=itunes | https://toolbox.marketingtools.apple.com/api/assets/featured-content/music/badges/badge-2/en-us.svg | https://toolbox.marketingtools.apple.com/en-us/apple-music/us |

The Books badge is “Get it on Apple Books,” viewBox `0 0 140.9502 40`.
The Music badge is “Listen on Apple Music,” viewBox `0 0 140.62 41`.
Apple's featured badge examples remain the original English artwork even on the
localized Toolbox pages. All adjacent MatchApp text and accessible link text has
authored copy in the 15 supported locales. Required source/legal English wording
is explicitly marked `lang="en"` and `translate="no"`.

The compact preview cards render the badges proportionally at 40px tall, with
10px of clear space and an accessible 44px-or-larger link. The exact-title text
link stays visible if a badge image fails to load. Service/availability claims
are not inferred from a preview, and item URLs are never rewritten.

## Original iTunes Store SVG

The official iTunes guideline links to these approved archives:

- https://www.apple.com/105/media/us/ipoditunes/itunes/2018/3a5387c5_1ebd_4993_9633_ff7264dc27bf/itunes-store-badges/us_uk.zip
- https://www.apple.com/105/media/us/ipoditunes/itunes/2018/3a5387c5_1ebd_4993_9633_ff7264dc27bf/itunes-store-badges/all.zip

The `us_uk.zip` archive was retrieved directly from Apple's documented URL with
HTTP 200 through the authorized Windows device on November 5, 2026. The original
SVG was extracted without conversion or alteration and visually inspected: it
reads “Get it on iTunes Store.” The archive and extracted SVG hashes matched the
earlier read-only verification. Temporary download files were removed.

- Archive SHA-256: `51328e60d9082fbb3a1c7797c17c539fbbec709c2da8e25513f3a91851628e04`.
- Archive entry: `US_UK/iTunes_Store_Badge/Get_it_on/SVG/US_UK_iTunes_Store_Get_Badge_RGB_012618.svg`.
- Bundled original: `assets/apple-promotional/itunes-store-get-en-us.svg`.
- SVG size: 17,387 bytes; viewBox `0 0 139.86 41`.
- SVG SHA-256: `1509ad061e178ab3acb8095ef5488cdc02f8a3b8c196b6e44b661051ae8bbd4f`.

The current iTunes badge guidance explicitly covers music promotion. This badge
is therefore limited to exact `itunes.apple.com` album, song and music-video
destinations, and exact `music.apple.com` album/song destinations carrying
`app=itunes`. Existing item/edition validation remains authoritative; the helper
does not infer availability, search for a substitute or rewrite any item URL.
The original English Apple artwork is preserved; adjacent visible and accessible
link text uses the existing 15-locale copy. No Apple Music subscription badge is
substituted for a purchase link.

Legacy iTunes book, audiobook, podcast, movie and TV routes retain their existing
exact-item text links pending service-specific badge evidence. Apple Podcasts
and Apple TV destinations also remain text-only. This repair does not close
every Apple promotional condition or establish content licensing clearance,
commercial-use permission or AdSense approval.

The distribution-only `sourcecredit=20261105-2` release marker refreshes the
helper imports and their existing caller/loader chains, including the copyright
page. The source callers, native fixtures and excluded products are unchanged.

## Scope and verification

- Native markers and `/kids/` stop the helper before DOM/style changes; the
  caller guards also avoid loading it on those surfaces.
- Only already-created Apple-CDN audio/video players with an exact Apple item
  destination can receive the presentation.
- Late asynchronous callbacks ignore disconnected players. Language changes
  repaint only source text, leaving media identity and playback state intact.
- Focused DOM tests cover exact URLs, service separation, source validation,
  failed images, locale changes, stale elements, duplicate calls, native/Kids
  isolation and open-license links. The local iTunes SVG's exact original hash
  and the distribution marker's idempotence, parameters and exclusions are tested.
- Account approval, publisher review, regional CMP transactions and commercial
  content-license evidence remain separate verification tasks.
