# Search Console 404 investigation — 2026-10-15

## Verified account evidence

The October 15 email (12:06 UTC, Gmail message `1a13f74e4e9180ea`) links to Search Console's `sc-domain:matchapp.tv` issue `CAMYDSAC`. The signed-in laptop report showed validation started September 23 and failed October 13; the issue summary was last updated October 11. Validation details contained six FAILED URLs and one PENDING URL.

| Google-reported URL | Validation | Last crawled | Disposition |
| --- | --- | --- | --- |
| https://matchapp.tv/news/articles/luck-and-timing-matthew-rhys-on-his-historic-emmy-awards-double-win-a5e27a/ | FAILED | 2026-10-13 | Preserve legitimate 404: retired news archive entry. |
| https://matchapp.tv/news/articles/8216-jay-z-in-8-8217-review-rick-rubin-8217-s-handsomely-made-hbo-docuseries-imp-c491a4/ | FAILED | 2026-10-13 | Preserve legitimate 404: retired news archive entry. |
| https://matchapp.tv/news/articles/stray-kids-fala-ao-g1-a-entrevista-completa-do-grupo-de-k-pop-no-camarim-do-rock-25a79c/ | FAILED | 2026-10-13 | Preserve legitimate 404: retired news archive entry. |
| https://matchapp.tv/news/articles/quem-melhor-usou-o-telao-do-rock-in-rio-g1-explica-a-tecnologia-e-lista-os-desta-d14c1f/ | FAILED | 2026-10-13 | Preserve legitimate 404: retired news archive entry. |
| https://matchapp.tv/news/articles/lazaro-ramos-celebra-filme-feito-pipa-ter-sido-escolhido-para-representar-o-bras-be1f6b/ | FAILED | 2026-10-12 | Preserve legitimate 404: retired news archive entry. |
| https://matchapp.tv/news/articles/filha-de-joao-gilberto-loulu-gilberto-ganha-indicacoes-em-duas-categorias-releva-a7361f/ | FAILED | 2026-10-10 | Preserve legitimate 404: retired news archive entry. |
| https://matchapp.tv/collections/ | PENDING | 2026-09-22 | Preserve absent route; remove broken structured-data references. |

## Cause and repair

All seven URLs returned real HTTP 404 responses on October 15. None is in the live 245-URL sitemap. The six news pages are absent from current repository links/manifests and have no verified equivalent replacement. Git history confirms removal by the existing news retention process on October 10: `11ebf726` (Matthew Rhys and Loulu Gilberto), `af3513a6` (Stray Kids, Rock in Rio and Lázaro Ramos), and `45bba65b` (Jay-Z). `tools/refresh-news-rss.js` retains the latest 1,000 archive entries and removes displaced entries. This investigation does not restore them or change retention.

`/collections/` never had a published index page in the inspected history. Twelve catalog pages nevertheless advertised it as a BreadcrumbList parent. Eleven mood pages and three platform pages had the same defect for their absent section roots. Their visible breadcrumbs already use Home → current page. The patch makes the structured data agree with that navigation, updates the generator, and removes two equivalent stale parent references from the Antártida and retired Alzheimer’s awareness pages. No route is added and no broad redirect is introduced.

The existing GSC guard now also checks local BreadcrumbList destinations across every HTML document, including nested graphs. Its regression fixture catches a missing directory index even when the directory exists. This fills a gap in the previous checks, which covered HTML attributes and sitemap file existence but missed JSON-LD links.

## Verified baseline and checks

- Inspected/deployed baseline: `4fdbe9db4f8a7af712e637c3db33a1a374ea9bb3`, confirmed by live `deployment-sha.txt`.
- Live robots → `sitemaps.xml` → `sitemap.xml` chain: HTTP 200.
- All 245 live sitemap entries: HTTP 200, self-canonical, no noindex directive.
- Search Console sitemap records: zero errors/warnings; `sitemap.xml` already submitted October 15 at 13:06 UTC. No redundant submission performed.
- Baseline `npm run audit:site`: zero errors; existing analytics/rich-result warnings are unrelated to these 404s. No fabricated ratings/reviews added.
- Full local suite after repair: 1,164 passed, zero failures. Focused AdSense/GSC safety checks: 19 passed before the new breadcrumb fixture.
- Production deployment verification must confirm the merged SHA and removal of these broken JSON-LD references. The legitimate missing URLs should continue returning HTTP 404.

## Validation decision

Do not start another blanket 404 validation merely to make this report green. Six FAILED URLs are intentionally gone, and the nonexistent section parent should stay gone once references are removed. Google's Page indexing documentation explicitly permits removed pages to retain 404 and recommends fixing links/sitemap entries that advertise them. A new validation would misrepresent the intended disposition and can fail again. Changed source pages can be recrawled normally after deployment.

## AdSense account review (October 15)

- Sites: `matchapp.tv` **Needs attention — Low value content**, last updated October 10, 13:13 GMT-3.
- `ads.txt`: **Authorized**.
- Policy center: **No current issues**. This does not override the separate site-approval rejection.
- Privacy & messaging: the European regulations message explicitly assigned to matchapp.tv is Published, English plus 31 languages, last modified September 18. The overview also lists one active US message; US domain assignment and consent runtime behavior require separate verification.
- Existing locked five Home units, Auto ads settings, IDs, initialization, consent defaults and ad-free Kids/support/account/chat surfaces are preserved.
- Current official guidance requires substantial original value, useful navigation, accurate disclosures, appropriate ad placement and a certified TCF-integrated CMP for personalized advertising in the EEA/UK/Switzerland. The October 15 announcement moves TCF errors into Policy center under Regulatory issue; a clean Policy center is not a consent-runtime certification.
- Do not claim the Low value content rejection is fixed by breadcrumb repairs or technical tests, and do not confirm “I have fixed the issues” without supporting content/readiness evidence.

## Official references

- https://support.google.com/webmasters/answer/7440203?hl=en
- https://developers.google.com/search/docs/appearance/structured-data/breadcrumb
- https://support.google.com/adsense/answer/10015918?hl=en
- https://support.google.com/adsense/answer/48182?hl=en
- https://support.google.com/adsense/answer/10502938?hl=en
- https://support.google.com/adsense/answer/13554116?hl=en
- https://support.google.com/adsense/announcements/9189068?hl=en
