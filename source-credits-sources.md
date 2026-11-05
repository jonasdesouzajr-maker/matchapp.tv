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
link stays visible if Apple cannot deliver the image. Service/availability claims
are not inferred from a preview, and item URLs are never rewritten.

## Remaining iTunes-only badge limitation

The official iTunes guideline links to these approved archives:

- https://www.apple.com/105/media/us/ipoditunes/itunes/2018/3a5387c5_1ebd_4993_9633_ff7264dc27bf/itunes-store-badges/us_uk.zip
- https://www.apple.com/105/media/us/ipoditunes/itunes/2018/3a5387c5_1ebd_4993_9633_ff7264dc27bf/itunes-store-badges/all.zip

An approved directly hosted iTunes badge was not verified or integrated in this revision.

Accordingly, itunes.apple.com item links and music.apple.com links with
`app=itunes` receive the accurate courtesy credit and unchanged exact-item text
link, **without substituting an Apple Music subscription badge**. Podcast/TV
destinations likewise receive only the correct service text when no corresponding
approved badge was verified. This improves attribution but does not close every
Apple promotional-badge condition. It must not be reported as complete media
licensing clearance or AdSense approval.

## Scope and verification

- Native markers and `/kids/` stop the helper before DOM/style changes; the
  caller guards also avoid loading it on those surfaces.
- Only already-created Apple-CDN audio/video players with an exact Apple item
  destination can receive the presentation.
- Late asynchronous callbacks ignore disconnected players. Language changes
  repaint only source text, leaving media identity and playback state intact.
- Focused DOM tests cover exact URLs, service separation, source validation,
  failed images, locale changes, stale elements, duplicate calls, native/Kids
  isolation and open-license links.
- Account approval, publisher review, regional CMP transactions and commercial
  content-license evidence remain separate verification tasks.
