# Real search performance baseline — 27 October 2026

Source: connected Google Search Console property `sc-domain:matchapp.tv`, via GSC Wizard. Reporting window **27 September–24 October 2026** (28 settled days); tool reported data settled through 25 October. GSC metrics are observational, not guaranteed ranking/traffic forecasts.

## Property baseline

- Google organic clicks: **150**
- Impressions: **14,568**
- CTR: **1.03%**
- Average position: **9.19**
- Top landing URL: `/events/kota-dussehra-2026/` — **99 clicks**, **10,764 impressions**, **0.92% CTR**, **8.33 average position**.
- Homepage: **27 clicks**, **837 impressions**, **3.23% CTR**, **6.16 average position**.
- `/events/brasil-game-show-2026/`: **3 clicks**, **373 impressions**, **0.80% CTR**, **19.36 average position**.
- `/events/ccxp-2026/`: **3 clicks**, **120 impressions**, **2.5% CTR**, **8.89 average position**.

## Search opportunity details

- `kota dussehra mela 2026 program list`: 2,354 impressions, 18 clicks, 0.76% CTR, average position 7.97.
- `kota dussehra mela 2026`: 1,555 impressions, 5 clicks, 0.32% CTR, position 10.17.
- `matchapp`: 373 impressions, 14 clicks, 3.75% CTR, position 4.72.
- `match together`: 109 impressions, zero clicks, average position 3.82.
- `ccxp26`: 61 impressions, 1 click, position 7.64.
- `brasil game show 2026`: 48 impressions, 1 click, position 8.60.

GSC Wizard's theoretical click opportunities are **estimates**, not actual traffic or promised uplift; do not repeat as forecasts.

## Decisions from evidence

1. **Highest-impact existing asset**: improve the Kota event page's search snippet and visible program/schedule response **only after checking verified event information, date, and current status**. The event is potentially over: preserve accurate past-event labeling instead of falsely advertising forthcoming sessions. Add natural discovery cross-links to regionally relevant film/culture guides *only when truly useful*; prioritize CTR via descriptive titles over generic keyword stuffing.
2. **Event cluster**: investigate Brasil Game Show and CCXP pages for accurate upcoming dates, location, original editorial value, venue links, and clear visitor CTA. Never represent an event as live after it ended.
3. **Brand pages**: distinguish home from /android/, /discover.html and /together.html; query `matchapp` showed 8 different pages in search, dominated by the home page. Canonicals must remain self-referential for genuinely distinct routes; avoid redirecting useful pages to home as a shortcut.
4. **Match Together**: query had 109 impressions but zero clicks; inspect title and description before editing for search-intent match, rather than starting another landing page.
5. **Evergreen chooser**: improvement has low direct GSC evidence *yet*; measure impressions of `/guides/choose-what-to-watch/` after deployment; don't assume popular streaming keywords will rank immediately.
6. **Original competitive research**: JustWatch, Letterboxd and MovieLens represent **feature comparisons**, not backlinks, keyword rankings or verified traffic competitors from a paid research tool.

## Release gate

No changes to Kids, matching, AI routing, payouts, ads or locked design. Confirm English and 13 other locale translations and the site's SEO-guide localization contract, which may use keyed JSON. Run HTML/schema/link integrity, SEO regression checks, responsive/Android rendering, applicable CI and deployment tests. For search engines, use GSC sitemap (Google) and existing IndexNow for Bing/Yandex if configured, then track confirmed indexing separately. Never submit non-live URLs.
