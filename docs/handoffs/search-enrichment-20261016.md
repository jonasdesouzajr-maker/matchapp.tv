# Search metadata and source-led discovery — 16 October 2026

This release follows the founder biography, sponsorship/directory launch and older-guide depth fixes. It changes search presentation and narrowly scoped editorial context, not matching, voice, authentication, payments, ad inventory, Kids runtime or native Android code.

## Search intent and content

Search Console queries through 13 October informed the focus on exact-title viewing searches, country-qualified availability, Match Together and Kota programme questions. These are this property's search signals, not a claim about nationwide search volumes. Netflix's official global English-film chart for 5–11 October provides a dated source note on the existing Netflix page. The note distinguishes chart popularity from present-day regional availability. No speculative release or provider offer is introduced.

Kota's guide separates the Ministry of Tourism's festival date window and cultural overview from an unconfirmed daily programme. It directs readers to official sources rather than inventing a timetable, price or livestream. The generator retains that context on subsequent runs. Existing event lifecycle rules, archive retention and refresh orchestration are unchanged.

## Metadata implementation

- The founder, sponsor and regional-streaming pages have authored search titles in all 14 supported languages. Sponsor/directory descriptions and social metadata now follow the selected language, along with their page-schema description and language. Canonicals remain stable; no fake language alternate URLs are created.
- `data/search-page-copy.json` is the authored metadata source. Each language tuple contains founder title, sponsor title, sponsor description, streaming title and streaming description, in that order. Existing generators merge these fields into their translation bundles without changing the visible UI labels.
- `tools/watch-search-metadata.cjs` is shared by the availability-page generator and this release's existing-page enrichment. Descriptions are title-specific, source-qualified and explicitly regional. Existing offers, country records, robots directives, canonical URLs and body content are preserved.
- Adult discovery and event sharing tags are completed. The trending hub has a shorter, consistent search/social title. Original approved preview image URLs are retained; selected-title sharing mechanisms and artwork are untouched.
- Discovery metadata no longer resets an existing editorial modification date to 5 October. Sponsor and directory sitemap dates now use the existing file-based modification-date mechanism instead of permanently fixed launch dates.

Google does not use the keywords meta tag for ranking. Useful visible content, descriptive titles, unique descriptions, correct source context and crawlable links are the substance of this update. No keyword-volume guarantee, fabricated review, hidden text or thin country doorway page is added.

## Validation and release gates

The added regression suite covers all three new routes in 14 languages, metadata/schema agreement, image metadata, stable canonical destinations, regional provider descriptions, escaping, idempotence, preserved indexing directives, modification-date integrity and sourced editorial context. Existing selected-poster/preview and AdSense-contract tests remain unchanged.

Required gates: `npm test`, `npm run audit:site`, `node tools/check-content-rotation.js`, desktop/phone/tablet browser checks and live verification of the exact deployed revision. Physical-device QA uses a new Chrome tab on the connected Samsung tablet; it does not send a sponsor inquiry, donate, activate voice or invoke paid matching.

The sitemap currently covers 246 public URLs. Existing audit advisories about missing analytics containers and unverified review-based rich-result eligibility are not ranking, indexing or monetization approvals. No ratings are fabricated to suppress those advisories. Submit the sitemap only after production is verified; leave IndexNow dispatch with the Pages deployment owner.

## Primary references

- Google title links: https://developers.google.com/search/docs/appearance/title-link
- Google snippets: https://developers.google.com/search/docs/appearance/snippet
- Google supported meta tags: https://developers.google.com/search/docs/crawling-indexing/special-tags
- Google ProfilePage guidance: https://developers.google.com/search/docs/appearance/structured-data/profile-page
- Netflix official Top 10: https://www.netflix.com/tudum/top10
- India Ministry of Tourism event source: https://www.incredibleindia.gov.in/en/festivals-and-events/rajasthan/dussehra-fair-2026
