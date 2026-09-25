# MatchApp global compliance register — owner/legal review required
Status: implementation audit, not legal certification. Last checked 2026-09-25.
Scope: entire MatchApp TV public website, adult and Kids routes, PWA and both
Android WebView shells; this first implementation PR addresses e-book referrals
only and documents broader open review gates without rewriting other systems.

## Changes delivered by the Amazon Brazil e-book referral PR
- The public Amazon Brazil Associates tag `matchapp06-20` is added only to
  Amazon Brazil book-search links generated for eligible *browser* sessions.
  No cross-market tag reuse (US, UK, Canada, Australia, Japan or Portugal).
- No tagged Amazon affiliate links in the native Android shell, installed PWA,
  TV or set-top box experiences, pending explicit applicable approvals.
- Commercial links are identified beside each qualifying link as paid
  advertising; the exact Amazon Brazil associate identification sentence is
  displayed in PT-BR; English equivalent is shown for English visitors.
- Official store destinations remain external. Neither MatchApp nor its
  analytics verifies purchases, charges users for e-books, or promises payment.
- Google Play Books stays an ordinary non-affiliate link. A `GGKEY` is an
  individual Google book identifier, not a Partnerize tracking link. Do not
  deploy Google affiliate tracking without proof of eligibility/approved links.
- E-books remain isolated from Kids Mode, matching core and AdSense placement
  rules. Privacy, cookies and terms now explain e-book click measurement and
  retailer-controlled checkout in English/Portuguese.

## BLOCKERS before claiming global legal compliance
All conditions below require review by qualified counsel familiar with
targeted countries; a worldwide website cannot be legally certified by code
changes or a generic disclaimer.

P0 — Verify actual tag/consent enforcement. Source `index.html`,
`ebooks/index.html`, `privacy.html` and `cookies.html` loads GTM in the
document head. Source `legal-kit.js` records `match_cookie_choice` after
page load, but its code alone does not gate the already-loading GTM script.
Test actual tags/cookies/network with no decision, essential-only, accepted,
later withdrawal, DNT/GPC where applicable and all regions. Enforce the
appropriate prior consent or alternative lawful basis for each vendor/purpose,
including any regional Google Consent Mode requirements. Since AdSense is
owner-locked, **do not rewrite ads, scripts or GTM to address this inside this
affiliate PR**. Obtain the owner's specific approval for any contract change.
ANPD cookie guide:
https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_cookies_e_protecao_de_dados_pessoais

P0 — Kids: independent child-directed legal assessment for Brazil, the US,
EU/EEA and UK before marketing or transmitting child interaction events.
The dedicated `kids/index.html` does not directly load the adult GTM script
or AdSense tag, but all subsequently loaded SDKs, child routes, APIs, logs,
advertising tags, tracking and Android variants need runtime verification.
Validate appropriate parental permission, age controls, minimum collection,
retention and deletion; do not rely on an account age claim alone.
Reference: FTC COPPA https://www.ftc.gov/business-guidance/privacy-security/childrens-privacy
EU children https://commission.europa.eu/law/law-topic/data-protection/reform/rights-citizens/how-my-personal-data-protected/are-there-specific-safeguards-data-about-children_en

P0 — Amazon Brazil account: owner confirms `https://matchapp.tv/`
(and each relevant public page/app if required) is actually registered and
approved in Associates Central, the tracking ID belongs to that account,
the permitted link format is accepted and the chosen products qualify.
Verify referrals from test traffic in the **Amazon Associates dashboard**;
a generated link, analytics click or successful site deployment does not
prove a qualifying commission. Amazon policy:
https://associados.amazon.com.br/help/operating/policies
Disclosure requirements:
https://associados.amazon.com.br/help/node/topic/GPXFHVYZMTGPUMPE

P1 — Privacy compliance: country-by-country lawful basis, data inventory,
international transfers, DPA and vendor contracts, retention schedules,
access/export/deletion support, automated decisions and AI feature notices.
Validate LGPD (Brazil), GDPR/ePrivacy (EU/EEA), UK rules, applicable US
state laws and other intended markets before targeting them. Confirm actual
deployment locations, server logs, push endpoints, third-party embedded media,
AI prompts and storage; text claims must match reality.

P1 — Consumer rights/payment: Stripe subscription cancellation, auto-renewal
notice, price/tax displays, refunds/chargebacks, support and locally mandatory
cooling-off rights. Retailer e-book transactions are separate from MatchApp
subscriptions; do not imply MatchApp sells or fulfills third-party e-books.

P1 — Copyright/content: audit event covers, third-party posters, embedded
trailers, RSS headlines/excerpts, e-book covers, TMDB/Open Library licenses,
publisher links and territory-dependent public domain. A discovery link does
not grant a copy/hosting right. Do not offer pirated file downloads.

P1 — Accessibility/localization: test WCAG conformance, meaningful language
and accessibility, currency/availability and localized notices for actual
market launches. No single disclaimer establishes compliance everywhere.

P1 — Platform agreements: review Apple/Google Play, Amazon mobile-app program,
payment processors, Google Books Partnerize and vendor ToS. The grown-up
Android WebView exposes external book links: until mobile approval is documented,
no Amazon *Special Links* may be introduced there. Installed PWAs and TV
sessions remain untagged under the current conservative implementation.

## Release gates
- Preserve `docs/EDITORIAL_AUTOMATION_LOCK.md`, full CI/site audit,
  `ADSENSE_LOCK.md` and `.github/CODEOWNERS`; do not rewrite editorial bot
  schedules/ownership or paid matching to retrofit affiliate links.
- Run `node --test tests/ebooks-affiliate.test.cjs tests/ebooks-ai.test.cjs`,
  `node tools/check-content-rotation.js`, `npm test`, `npm run audit:site`,
  `npm run build` and existing required AdSense tests.
- Account approval, legal counsel's country/child/cookie signoff and tracked
  real commissions are explicitly **NOT** established by passing those tests.
- Expand to another Amazon locale or Google Play Books only on documented
  program enrollment and approved link details for that market/surface.
