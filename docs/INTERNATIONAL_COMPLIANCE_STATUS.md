# MatchApp.tv international compliance audit — initial technical findings
Date: 2026-09-25 | Status: **OPEN / NOT LEGALLY CERTIFIED**

This is an evidence-based technical and product-policy audit, not a declaration that MatchApp is legal in every jurisdiction or a substitute for local counsel. The site's public availability, multilingual interface and "Worldwide" structured-data statement do not establish that MatchApp is licensed, eligible or compliant in every country. Verify each territory before actively marketing, monetizing or making stronger compliance claims there.

## Verified technical findings from the repository

### CRITICAL — non-essential tracking and consent are not verified
- `index.html`, `ebooks/index.html`, `pricing/pricing.html`, `privacy.html` and `cookies.html` invoke Google Tag Manager at the start of the document. The separate consent-mode defaults observed on Pricing and OAuth appear *after* GTM initialization; this is not an adequate demonstration of prior consent.
- `legal-kit.js` offers a two-choice cookie interface that stores `match_cookie_choice`, but no code in that file forwards this choice to Google Tag Manager, AdSense or a consent-management platform. The current Home HTML does not load this file. A visual "Essential only" choice **must not be represented as a verified block on trackers**.
- `index.html` loads the existing locked AdSense engine. Whether Google's certified CMP and Privacy & Messaging configuration correctly gates EU/UK/Swiss non-essential storage is a **separate production-account setting that cannot be verified from this repository**. Keep the immutable AdSense placement tests; owner must explicitly approve any change to its locked runtime/engine.
- Remediation: inventory all active GTM container tags (including custom tags); set region-appropriate prior consent and correct Google consent signals; use a Google-certified CMP if serving personalized ads in applicable EEA/UK/Swiss settings; provide an accessible, effective Reject/Withdraw path, document proof and run fresh-browser network tests for anonymous users in each relevant region, plus Kids. Do not declare remediation complete until non-essential cookies and trackers demonstrably remain off after rejection.
- Until then, do **not** claim certified cookie/tracking compliance in countries that require prior opt-in; counsel/operations must decide whether to defer advertising or promotion in affected markets. Do not work around the protected AdSense lock or claim its settings were changed.

### HIGH — Kids Mode: counsel and network verification required
- `kids/index.html` does not directly load the normal homepage AdSense or GTM snippet in the inspected entry document. That is not proof that all Kids paths, redirects, external links, API calls, analytics, device identifiers, Android/WebView or third-party embeds are child-compliant.
- The Terms/Privacy state accounts are 16+ and Kids may be used without a child account. Verify enforcement rather than relying on the text.
- Review Brazil's ECA Digital (Lei 15.211/2025, in force since 2026-03-17), LGPD children's provisions, U.S. COPPA if U.S. children are targeted, UK Age Appropriate Design Code and EU child protections for actual markets. Specifically evaluate age assurance, parental rights/consent where required, default minimization, third-party telemetry, account handoff, push/notifications and retention.
- Do **not** add Kids advertising or adult e-book purchase links; preserve separate Kids app / adult app boundaries.

### HIGH — data processing and international transfers
- Existing privacy pages mention Supabase, Google, Stripe, push and AI services, but repository inspection cannot verify complete processor contracts, lawful purposes, transfers, deletion backend, vendor destinations, breach procedures, request response SLAs or legal-entity/controller identity.
- Map the real flows and lawful bases; publish accurate controller/contact and country-specific notices; implement and test data-subject access, correction, export, erasure and consent withdrawal. Confirm DPA/SCC or applicable cross-border mechanism with each processor.
- Review applicability for Brazil LGPD, EU GDPR/ePrivacy, UK GDPR/PECR, U.S. state laws, Australia Privacy Act/APPs (where applicable), Canada's PIPEDA/Quebec Law 25 and Japan APPI; applicability differs by location, type and scale of processing.

### HIGH — purchase and subscription rights
- Stripe checkout and subscription terms need an actual jurisdiction-by-jurisdiction review of current price/currency/VAT or sales taxes, identity of seller, automatic renewal, cancellation, refund/withdrawal exceptions and statutory consumer rights. Existing terms cannot waive mandatory rights.
- Never display unverified regional BRL prices or state that third-party e-books are sold/fulfilled by MatchApp.

### HIGH — retailer affiliate programs and intellectual property
- Amazon Associates BR public ID: `matchapp06-20`. Only eligible `amazon.com.br` e-book search URLs on ordinary adult web browsing carry the tag. Other Amazon marketplaces, native Android, installed PWA and smart-TV contexts remain untagged until the relevant enrolment and mobile/software/TV approval have been independently documented. Verify `matchapp.tv` is registered as an approved Site in the owner's Associates account.
- Clearly label commissionable links near purchase buttons, add `rel=sponsored` and disclose Amazon qualifying-purchase commissions. Amazon controls eligibility, tracking and payment; a successful referral link does not guarantee a payout.
- Google `GGKEY:` is a **specific book identifier**, not a Play Books affiliate tracking ID. Google Play Books ordinary store links remain uncommissioned until the owner has an approved partner account with official Partnerize referral URLs.
- Copyright: audit image/poster/book-jacket use licenses and attribution against each source's rules. Keep official-source routing, geographic public-domain distinctions, takedown/contact process and event-artwork rights. Do not invent reviews or incorrectly imply organizer/store affiliation.

### MEDIUM — operational content and claims
- News and events must continue the locked verified-source, dated retention and accurate metadata workflows. Do not auto-write invented event venue/event ticket rights or claim an unsupported official partner relationship.
- Accessibility (WCAG), translated policy accuracy, AI consumer transparency, applicable consumer marketing rules, privacy notices and region-specific age restrictions require human review; a passing JavaScript audit does not establish legal or accessibility certification.
- Review "Worldwide" and other absolute availability statements if certain countries cannot lawfully be served.

## Release/territory decision log
For EACH market in which the owner actively promotes or sells: record (1) service and legal-entity coverage; (2) user age/legal capacity; (3) cookie/CMP rejection tests and child telemetry; (4) privacy/controller/processor transfer review; (5) consumer and tax disclosures; (6) partner programme and media licenses; (7) accessibility/localization; (8) external qualified local counsel's decision. Status defaults to **NOT VERIFIED** until evidence is attached.

## Official reference anchors checked 2026-09-25
- Amazon Brazil Associates policies: https://associados.amazon.com.br/help/operating/policies
- Amazon Brazil Associates terms: https://associados.amazon.com.br/help/operating/agreement/
- FTC endorsements and affiliate disclosure: https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking
- Brazil ANPD cookie guidance: https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_cookies_e_protecao_de_dados_pessoais
- Brazil ANPD ECA Digital age-assurance guidance: https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-publica-orientacoes-preliminares-e-cronograma-para-afericao-de-idade-no-ambiente-digital
- UK ICO cookies: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/
- Australia OAIC APPs: https://www.oaic.gov.au/privacy/australian-privacy-principles
- Google Play Books affiliate eligibility: https://support.google.com/books/partner/answer/9358246
- Google Play Books GGKEY (book ID): https://support.google.com/books/partner/answer/9260562

No operator access to Google's GTM/AdSense account configuration, Amazon approval panel or each processor's agreements was available during this repository-only audit. Do not convert a to-do item in this document into a claim of legal compliance.
