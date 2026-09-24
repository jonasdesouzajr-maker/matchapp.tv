# Daily event + featured title contract

**Status: standing contract. Applies every time the "international day of…"
card or the homepage featured title changes — by hand or by bot.**

Two fields on the MatchApp home page are editorial and change on a schedule:

| Field | Where it lives | Who changes it |
| --- | --- | --- |
| **International day of…** (Events field) | `data/international-day.json` + `data/international-day-history.json` | the day-of bot + archive step |
| **Featured title** (homepage spotlight) | the `PICK` / `PICK_COPY` objects at the top of `weekly-pick.js` | a human or a release bot, whenever the pick changes |

Neither of them needs a component change. Both are data.

---

## 1. International day of… — the daily bot contract

### What to write

Rewrite **the whole of `data/international-day.json`**. Never append, never
leave half the object behind. Every key below must be present.

```jsonc
{
  "updated": "2026-09-22T06:00:00Z",   // ISO timestamp of this write
  "date":    "2026-09-22",             // the day this entry is FOR (local calendar date)
  "id":      "world-rhino-day-2026-09-22",
  "emoji":   "🦏",                     // one emoji — becomes the poster art
  "title":   "World Rhino Day",
  "kicker":  "International day",
  "place":   "Worldwide",
  "summary": "Two or three sentences: what the day is, and the watching angle.",
  "prompt":  "The question sent to MatchApp Ai when the card is tapped. Ask for what the day is, why it falls on this date, practical tips to enjoy it, AND titles to watch tonight plus where to watch them.",
  "officialUrl": "",                   // official page if one exists, else ""
  "image": "/event-posters/<event>.webp", // REQUIRED: official art when available; otherwise an original event-specific cover
  "keywords": [ "…", "…" ],            // 8-12 terms, see §3
  "i18n": {
    "pt-BR": { "title": "…", "kicker": "…", "place": "…", "summary": "…", "prompt": "…" },
    "es":    { "title": "…", "kicker": "…", "place": "…", "summary": "…", "prompt": "…" }
  }
}
```

### Rules

- `date` **is the day the entry is for**. The card shows a green `TODAY` badge
  only when `date` equals the visitor's local date; otherwise it shows the
  date. A bot outage therefore degrades to a dated card, never to a blank
  field or a false "today" claim.
- English is the base record. Any key missing from an `i18n` block falls back
  to English, so a partial translation still renders a complete card.
- The current international day is shown first. **Do not delete or remove an event when its calendar day ends.** Finished events remain visible for **3 full days (72 hours)** with an **ENDED** ribbon and are moved to the **end of the Events row**. Only after that retention window do they disappear from the Home row automatically; their indexed pages/SEO may remain.
- Before replacing `data/international-day.json`, archive the outgoing record in `data/international-day-history.json` (deduplicated by `id`). The repository archive workflow does this automatically on every push that replaces the current day record.
- The card's destination is always the AI chat (`/discover.html?q=…`), which
  is where the explanation and the tips come from. Do not point it at a page
  that does not exist.
- Never invent an `officialUrl`. Empty is correct when there is no official page.
- **Poster rule (standing instruction): never publish a blank, text-only, emoji-only, gradient-only or generic placeholder event poster anywhere on MatchApp.** Use real official event artwork whenever it is available. If no suitable official artwork exists, create a polished original cover that visually depicts that specific event only. If a required image fails to load, suppress the card rather than falling back to a text-only poster.

### What the site does with it

`international-day.js` loads the current record plus the archived records, localizes them, inserts the current card first and retained ended cards last, emits `schema.org/Event` JSON-LD, and merges each visible card's `keywords` into the page keywords. Cards older than three days are not rendered on Home.

---

## 2. Featured title — the swap contract

Everything title-specific is in `weekly-pick.js`, in two objects:

- `PICK` — the identity and facts,
- `PICK_COPY` — the description and the labels, per language.

### Swapping the title

1. Replace `PICK` wholesale. Required keys:
   `title, year, country, countryCode, kind ('movie'|'tv'), tmdbId, imdbId,
   director, author, cast[], runtime, rating, distributor, releaseDate,
   inCinemas, platform, streaming, poster, watchUrl, sourceUrl, previewId,
   synopsis, cats[], moods[], vibes[], ratings[]`.
2. Leave `poster: ''`. The cover is resolved at runtime from `tmdbId` through
   MatchApp's own `tmdb-proxy` — the same verified source the catalogue uses.
   **Never paste a guessed image URL.** Until it resolves (or if it fails), a
   branded plate holds the exact poster shape, so the layout never jumps.
3. Replace the `desc` in each `PICK_COPY` language block. The other keys
   (`cinema`, `showtimes`, `where`, `eyebrow`, `director`, `runtime`,
   `preview`, `sourceNote`) are generic and usually stay.
4. Update `enrichSeo()`'s `extra` keyword list for the new title — see §3.
5. Add a static `featured/<slug>/index.html` page modelled on
   `featured/antartida/index.html`, and add it to `sitemap.xml`.
   **Do not delete the previous featured page.** It is indexed; removing it
   creates 404s in Search Console. It simply stops being the current pick.

### Cinemas vs streaming — the ribbon rule

- `inCinemas: true` → a red **"In cinemas now"** ribbon on the cover, and the
  primary action asks MatchApp Ai for **cinemas near the visitor**, with the
  synopsis, cast, country, runtime, age rating and IMDb rating.
- `inCinemas: false` **and** `streaming: {name, url}` → a gold **"Where to
  watch"** ribbon, and the primary action goes straight to that provider.
- `inCinemas: false` and no `streaming` → the primary action asks MatchApp Ai
  where to stream, rent or buy it.

Flipping between those states is a one-line data change. Nothing else moves.

### Never fabricate availability

Use an exact provider/title URL only when a source supplies one. Otherwise use
the provider's own search/title-discovery destination, or send the visitor to
the AI chat, which can answer for their country. This is AGENTS.md rule 6 and
it is not negotiable for a featured title.

---

## 3. SEO routine — run this on EVERY change to either field

This is the part that is easy to skip and most expensive to skip.

1. **Keywords.** Add both short and long-tail terms for the new subject:
   - the bare name, and the name + year;
   - `onde assistir <name>` / `where to watch <name>`;
   - `<name> elenco` / `<name> cast`, `<name> sinopse` / `<name> synopsis`;
   - `<name> nos cinemas` / `<name> showtimes near me`;
   - each headline cast member's name with the title;
   - the genre + year bucket (`suspense brasileiro 2026`, `new Brazilian movie 2026`);
   - for a day: `<day> activities`, `how to celebrate <day>`,
     `what to watch on <day>`, `<month> <day-number> international day`.
   Put them in the data (`keywords[]` for the day, `enrichSeo()`'s `extra` for
   the title). Both merge into the page's `keywords` meta without duplicating.
2. **Description.** The page description picks up one sentence naming the new
   subject. Keep the total under 300 characters.
3. **Structured data.** A day emits `schema.org/Event`; a title emits
   `schema.org/Movie` or `TVSeries` with `director`, `actor[]`,
   `countryOfOrigin`, `contentRating`, `duration` and `sameAs` (IMDb + TMDB).
   Both are emitted next to the thing they describe, so they never go stale.
4. **Sitemap.** A new static featured page gets a `<url>` entry with today's
   `lastmod`. Days do not get their own page and do not go in the sitemap.
5. **Verify.** `npm run audit:search` must pass before shipping.

---

## 4. Guard rails that apply to both

- Kids Mode never receives normal-mode editorial. Both renderers bail out on
  `/kids` routes.
- Every failure path is silent and complete: a missing or malformed file
  leaves the page exactly as it shipped, with no console error and no hole.
- One fetch, one render. No polling, no observers, no retry loops — the
  AGENTS.md stability invariant applies to editorial code too.
- Facts come from a checkable source (IMDb, TMDB, the distributor's own
  announcement, the day's official organisation). Record which, in the card's
  "Verified sources" line.
