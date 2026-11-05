# MatchApp Ai: Monetag browser-only release gate — 2026-11-05

**Status: BLOCKED, no advertising activated.** The new browser-monetag-gate.js
is not loaded by any page; it performs no network requests and cannot load an
ad or credit rewards. This document is a staging plan, not provider approval.

## Verified starting state

- Monetag site matchapp.tv was verified as site 3554856. Existing In-Page Push
  zone 12152170; older service-worker reference 12151861 must not be installed.
- The publisher Profile header showed $0.00 and 07:11 EST on November 5.
  This is NOT a verified Statistics-table baseline or a confirmed reporting
  timezone; no impression, fill, CTR or revenue figures were obtained.
- Two previously sent support inquiries (October 30 and November 3) requested
  written zone-specific creative and destination exclusions plus geographic,
  advertiser and format coverage. No substantive answer was found in the
  checked Gmail conversation. Do not create a duplicate zone or send mail.
- Inspected main revision: 78d9ee491772e28a02dc42d3e6ba1aab75fe9a31.
  Vercel READY production record: dpl_3Hi9Jgy4PYyuw8T8rXDMLYCGEqCd. The
  separate public website showed the Halloween campaign; Vercel's configured
  domains did not include matchapp.tv, so do not infer exact serving-origin SHA.
- Preserve ADSENSE_LOCK.md: five existing manual Home units, review hold,
  ads.txt, initializer, Auto ads state, Kids and protected ad-free surfaces.
  Never resume the paused editorial scheduler or alter Android ad/reward code.
- Existing repository rights audit (browser-consent-grok-20261101.md) did not
  establish commercial monetization rights for all third-party posters,
  news imagery and derived content. Keep those surfaces unmonetized.
- Existing Google Consent Mode denied defaults and privacy controls have not
  been verified as a functioning Monetag-specific CMP and withdrawal flow.

## Format decisions

- Candidate after all approvals: one In-Page Push zone after substantial
  rights-cleared original adult editorial content; a second on genuinely
  long pages only after retention/CLS measurements. Documentation says its
  default position is upper right desktop and top mobile, and support must
  confirm exact controlled positioning before use.
- Candidate frequency: maximum one placement per page, two per session,
  separated by 12 minutes, only if the network supports that control.
- No before-match interruption is enabled. A supported, controllable,
  disclosed, fail-open ordinary-browser format must be verified first.
  Never delay or withhold a completed match because of provider failure.
- No optional reward credits: the verified Monetag rewarded SDK is documented
  for Telegram Mini Apps, not ordinary web pages. A future supported product
  requires authenticated server postback verification and idempotent credit.
- No popunders, OnClick, redirects, unsolicited push subscriptions, MultiTag,
  vignette overlays, autoplay sound or new services.

## Non-negotiable activation gates

1. Written provider confirmation naming exact zone, adult/sexually suggestive
   creative AND destination exclusions; all demand, territory, format and
   effective-date limitations; emergency incident-blocking process.
2. Supported placement and frequency controls, responsive presentation,
   explicit Advertisement label and verified non-overlap.
3. Working consent/rejection/withdrawal and return-visit controls, with
   Monetag-specific authorization prior to any vendor request in regions
   requiring it (EEA, UK, Switzerland, and other applicable regions). The
   existing Google CMP is not automatically a Monetag vendor grant.
4. Source-by-source commercial rights for the actual page imagery and data.
5. Known non-ad-free account status; fully excluded Kids, native WebViews,
   game, protected account, payments, support and chat contexts.
6. Dual feature flag and kill switch; no vendor JS until all checks pass.
7. Existing regression suite, three browser engines and mobile/tablet/desktop
   real layouts, blocker/timeout/slow connection, consent variation, screen
   reader/keyboard, reduced motion, safe-area/CLS, matching fail-open.
8. Real provider report and reporting-timezone baseline; verified public
   deployment origin and rollback. Do not click live ads for testing.

Telemetry design: count coarse request attempts, provider-supported VERIFIED
fill/impression events, failures, reward starts/verified completions and
match-completion/abandonment. Never forward full URLs, prompts, identity, or
sensitive data; never calculate revenue from local attempts or clicks. Only
Monetag's own report is authoritative for monetary earnings.

## Prepared files

browser-monetag-gate.js: disconnected, default-off, side-effect-free policy
evaluation and coarse event sanitization. No vendor SDK or reward credit.
tests/browser-monetag-gate.test.cjs: seven Node safety tests; 7/7 passed
locally on Node 22. This is not full repo CI, consent/device testing or
provider safety certification. No ad code was deployed.

Provider documents:
https://help.monetag.com/en/articles/6959534-in-page-push-ipp
https://help.monetag.com/en/articles/6726318-how-do-i-get-started-as-a-publisher-paste-the-ad-tag-into-your-website
https://docs.monetag.com/
Privacy guidance:
https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/how-do-the-rules-apply-to-online-advertising
https://www.edoeb.admin.ch/en/factsheet-cookies
