# Artwork accuracy and recovery

- AHS 13: the official Disney Latin America season 13 press-kit poster, verified September 13, 2026. Source: https://prensa.disneylatino.com/press-kit/american-horror-story-13 and its Disney-hosted Lumiere PNG. The spotlight no longer replaces season artwork with general-series imagery.
- Kids: first lookup is the secure TMDB proxy with exact title, original year and content type checks. `kids/artwork.json` is a reviewed-identity backup from TMDB, TVMaze or Apple artwork. `tools/update-kids-artwork.js` records the provider. Unmatched works retain their original, deterministic title-specific local SVG; no unrelated poster is substituted.
- General matching: retain the title/year/type checks for TMDB, iTunes and TVMaze. Ambiguous high-risk titles keep their conservative original cover rather than borrowing another title’s image. Original fallback illustrations classify both the title and synopsis.

The layout scales to an 8K screen; this does not imply that a provider’s poster source has an 8K native resolution.

## Original artwork — 2026-09-14

Generated with the built-in image generator, then exported as progressive JPEGs without changing the art. These are original editorial illustrations, not official posters or confirmed actor likenesses.

- `marido-bilionario-original.jpg`: Brazilian romance about a wife discovering her husband’s hidden billionaire identity. Prompt: cinematic portrait 2:3; original fictional Brazilian adult wife in emerald dress with wedding ring, husband in midnight suit, São Paulo penthouse skyline, hidden identity and tenderness, emerald/gold; readable Portuguese title “A Vida Secreta do Meu MARIDO BILIONÁRIO”; MatchApp.tv original-art credit; no real actors, studio logos, nudity or invented dates.
- `asian-games-2026.jpg`: portrait editorial sports festival illustration, anonymous athletes, Nagoya castle and stadium, indigo/red/gold, title Asian Games Aichi–Nagoya 2026, dates 19 September–4 October 2026, original-art credit. Official dates/broadcast source: https://oca.asia/news/6751-tbs-television-comes-on-board-as-official-broadcaster-for-aichi-nagoya-2026-asian-games.html
- `azerbaijan-gp-2026.jpg`: portrait editorial fictional logo-free racing car at Baku’s old-town walls and Flame Towers, teal/amber/graphite, title Azerbaijan Grand Prix 2026, dates 24–26 September, original-art credit. Official race schedule: https://www.formula1.com/en/racing/2026/azerbaijan
- `worlds-2026.jpg`: portrait editorial esports arena with an original abstract trophy and New York skyline, cobalt/magenta/silver; title League of Legends Worlds 2026, dates 15 October–14 November, original-art credit. Official calendar: https://lolesports.com/en-GB/leagues/worlds ; organizer news: https://lolesports.com/en-US/news/season-start-2026-lol-esports

Event poster prompts requested detailed original art, high contrast, safe text margins, no mockup border, no organizer logos, real performers or invented streaming claims. Official organizer artwork links are available from the source pages; MatchApp uses these original local posters for reliable, title-specific display.

### Branded poster background and Roku collection

The decorative collage uses eight individually verified TMDB poster records, with a small MatchApp badge placed in a corner through CSS. Original poster text is not overprinted. The collage is omitted from Kids pages. Offline original covers are only used if a verified poster cannot load. TMDB metadata is used through the secure Supabase proxy; MatchApp is not endorsed or certified by TMDB.

The Roku collection links to official Roku or producer viewing guides. The live Rich Eisen Show was deliberately excluded because its current official destination has moved to ESPN/Disney+. Regional access is documented from [Roku Support](https://support.roku.com/en-gb/article/get-the-roku-channel). The layout reference was the public Globoplay login flow; MatchApp artwork, branding, spacing, animation and themes are its own.
