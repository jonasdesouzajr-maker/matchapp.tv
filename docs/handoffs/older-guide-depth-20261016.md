# Older-guide content depth — 16 October 2026

## Scope and verified starting point

The live GSC Wizard audit identified content-length advisories on four existing English editorial routes: `/events/asian-games-2026/` (294 words), `/events/brasil-game-show-2026/` (288), `/kids/titles/puffin-rock/` (193), and `/kids/titles/rugrats/` (199). These are the four guides covered by this patch, not a claim that every page on the site has been re-audited or approved by Google.

## Durable changes

- Extend the two event records in `tools/global-events.json` with distinct, practical archive-discovery advice. Asian Games guidance distinguishes sessions, rounds, upload dates and highlight edits; BGS guidance separates announcements, demonstrations, product releases and panel recordings. The existing event generator retains the copy. Event dates, official destinations and lifecycle logic are unchanged.
- Add `tools/kids-guide-editorial.json` for the two title guides. Original guidance explains the specific programme, previewing by tone, the limits of the existing discovery age bands, title/version identification, and checking local episode, audio and subtitle listings. Visible official sources support programme identity; no worldwide availability, provider rating or educational outcome is invented.
- Extend the existing Kids page generator to render this guidance as visible static HTML and use each edited title's real editorial revision in structured data and the Kids sitemap manifest. Existing FAQ positions, routes, allowlist, age filters, parent warnings and viewing links remain unchanged.
- Update only the four relevant sitemap last-modified dates. No new URL, noindex rule, redirect, schedule, competing publisher or manual IndexNow dispatch is added.

These are the existing English editorial routes. This release does not claim a new translation audit of their entire content. Matching, AI routing, authentication, quotas, payments, locked AdSense placements, Kids application behaviour, native Android sources and protected workflows are outside the change.

## Verification

- Six focused content/source/canonical/sitemap tests passed.
- Sixteen rendered checks passed: four pages at 320, 390, 820 and 1366 CSS pixels. No horizontal overflow, visible substantive main content, one H1 and correct self-canonicals. Narrow-screen title copy and desktop event copy screenshots were inspected.
- Browser checks used local pages and blocked external requests: they do not establish current remote playback, external artwork availability, or native-device behaviour.
- Full regression, site/search audit, exact-head CI, production deployment and the final live content-length audit must be recorded when complete.

## References and interpretation

Google recommends original, relevant, people-first content, not a preferred word count. The local regression floor detects accidental output truncation; it is not an AdSense or Google Search approval threshold. Other non-content audit advisories are not represented as resolved by this patch, and no organizer logo was fabricated merely to silence an audit tool.

- https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- https://support.google.com/adsense/answer/7299563?hl=en
- https://puffinrock.com/
- https://www.paramountplus.com/shows/rugrats/

AdSense approval and search indexing remain Google's decisions.
