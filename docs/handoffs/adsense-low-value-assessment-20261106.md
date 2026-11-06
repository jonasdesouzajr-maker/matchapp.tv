# AdSense Low value content assessment — 6 November 2026

Status: **assessment and crawlability only**. This does not claim AdSense approval, does not request review, and does not change account settings, Auto ads, publisher/slot IDs, or the publisher ad-request hold.

## Verified account/site evidence (signed-in dashboard)

Observed for publisher `pub-9541435081010948` / site `matchapp.tv` (America/Sao_Paulo):

| Item | Evidence |
|---|---|
| Site list | `matchapp.tv` is the only connected site |
| Ownership | Verified |
| ads.txt | Authorized (`google.com, pub-9541435081010948, DIRECT, f08c47fec0942fa0` live at `/ads.txt`) |
| Approval | **Needs attention — Low value content** (updated 5 November 2026, 18:45 America/Sao_Paulo) |
| Site guidance | Substantial unique value, consistent web presence and user interest; authentic high-quality information/tools/services; ongoing curation/structural maintenance; genuine user interest |
| Policy center | No current issues; no additional serving limits shown |
| Auto ads | Preview UI showed the feature enabled with intent/overlay/in-page counts; Apply was not clicked, so applied account state was not independently mutated or certified |
| Review action | Request review is available with a checkbox certifying fixes — **not submitted by this work** |

Dashboard URL used for the check: AdSense Sites detail for `matchapp.tv`.

## Technical display vs approval (do not conflate)

Live Home still loads the AdSense engine and five locked manual units for `ca-pub-9541435081010948` / slot `2595698117`, with Auto ads treated as ON in repository locks. Separately, Home and the events archive set `window.adsbygoogle.pauseAdRequests = 1` via `#ma-publisher-review-hold` before tags. Google documents that without later setting `pauseAdRequests = 0`, ad requests stay paused ([ad personalization / pause guidance](https://support.google.com/adsense/answer/7670312)).

That hold is an intentional publisher-review safeguard documented in `docs/seo/adsense-review-hold.md`. It can block **display after** a site becomes Ready. It does **not** remediate a **Low value content** approval decision. This patch leaves the hold, AdSense identifiers, slot markup, `ads-init.js`, Kids ad-free surfaces, and consent defaults unchanged.

## Can a scoped PR fix Low value content?

**No — not realistically by itself.**

Google’s site message asks for substantial unique value, consistent presence, authentic tools/services, ongoing curation, and genuine user interest ([page readiness](https://support.google.com/adsense/answer/7299563), [insufficient / quality content notes](https://support.google.com/adsense/answer/81904), [screens without publisher content](https://support.google.com/publisherpolicies/answer/11112688)). Earlier October content-depth and news remediations already expanded original guides and kept thin news wrappers `noindex`. The Low value decision was still present on 5 November 2026.

A repository PR can:

- improve crawlable discovery of **existing** original utility pages;
- keep thin rediscovery wrappers out of the indexable set;
- preserve product UX and locked ad infrastructure.

A repository PR cannot honestly manufacture:

- sustained original editorial depth across the product;
- proof of genuine user interest or consistent audience;
- clearance of third-party media rights questions recorded in the review hold;
- a Google approval outcome.

**Primary remedy:** real editorial/product work — continue publishing and maintaining original, useful MatchApp guidance and tools; keep rediscovery wrappers thin/`noindex`; let meaningful product flows remain usable without login where they already are; wait for crawl/index refresh; only then consider Request review with the certification checkbox. Do not invent articles, fabricate facts, or promise traffic.

## Scoped changes in this branch

1. Home `#how-it-works` gains crawlable links to the existing `/how-it-works.html` field guide and `/guides/choose-what-to-watch/` mood guide.
2. About gains the same two destinations inside the existing “How to make a useful choice” section.
3. This assessment document.

No new articles, no fabricated charts, no publisher/slot changes, no review submission, no merge/deploy by this agent.

## Live technical checklist already satisfied (not the approval fix)

- HTTPS site live on GitHub Pages (`matchapp.tv`), ownership markup and ads.txt present.
- `robots.txt` allows general crawl (`Allow: /`); Mediapartners-Google is not disallowed.
- News source wrappers sampled remain `noindex` and stay out of the main value claim.
- Sitemap includes About, How it works, guides, founder, and product destinations.

## Next steps (owner / parent)

1. Treat Low value content as an **editorial/product** gate, not a missing ad-tag gate.
2. Ship only authentic improvements; after deploy + crawl time, decide whether to Request review.
3. Keep Auto ads / Policy center reads observational unless the owner explicitly asks to change account settings.
4. After a future Ready status, separately decide whether to lift `#ma-publisher-review-hold` once rights/consent prerequisites in `docs/seo/adsense-review-hold.md` are actually met.
