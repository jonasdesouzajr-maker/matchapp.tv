# Artwork accuracy and recovery

- AHS 13: the official Disney Latin America season 13 press-kit poster, verified September 13, 2026. Source: https://prensa.disneylatino.com/press-kit/american-horror-story-13 and its Disney-hosted Lumiere PNG. The spotlight no longer replaces season artwork with general-series imagery.
- Event covers: original MatchApp vector illustrations, restored as local `rock-in-rio-cover.svg` and `oktoberfest-cover.svg`. These are editorial MatchApp artwork, not official event posters. Existing raster images remain available for older shared links.
- Kids: first lookup is the secure TMDB proxy with exact title, original year and content type checks. `kids/artwork.json` is a reviewed-identity backup from TMDB, TVMaze or Apple artwork. `tools/update-kids-artwork.js` records the provider. Unmatched works retain their original, deterministic title-specific local SVG; no unrelated poster is substituted.
- General matching: retain the title/year/type checks for TMDB, iTunes and TVMaze. Ambiguous high-risk titles keep their conservative original cover rather than borrowing another title’s image. Original fallback illustrations classify both the title and synopsis.

The layout scales to an 8K screen; this does not imply that a provider’s poster source has an 8K native resolution.
