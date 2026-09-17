# MatchApp remediation guardrails

Effective: 2026-09-17

## Temporary release freeze

Until the critical remediation checks are green, production changes should be limited to:

- pricing / entitlement consistency
- broken CTA or 4xx fixes
- matchapp.cc → matchapp.tv migration and canonical hygiene
- stale time-sensitive content
- catalog taxonomy / availability correctness
- Kids Mode privacy / legal safeguards
- monitoring, tests and security fixes

Do **not** redesign unrelated UI, change working recommendation behavior, add new verticals, or refactor stable features as part of this remediation.

## Manual catalog QA gate

Until automated validation is proven reliable, every new or materially edited curated title must be checked by a second reviewer before publication.

Pass only when all are true:

- [ ] Exact title identity is verified against a stable provider ID where available.
- [ ] Media type is correct (movie / TV / podcast / music / other supported type).
- [ ] Platform is compatible with the media type and the title actually exists there.
- [ ] Artwork belongs to the exact title; otherwise use the approved fallback.
- [ ] Availability claims are region-qualified; never imply global availability from one country.
- [ ] Time-sensitive labels use start/end timestamps rather than permanent "LIVE NOW" text.
- [ ] No duplicate title is introduced where the matching policy would treat it as the same item.

A failed item is held back or clearly flagged until verified; it is not published by guessing.

## Kids Mode legal-review handoff

External counsel should review the current Kids Mode against LGPD / Brazil child-protection requirements, GDPR child safeguards for intended EU markets, and COPPA if the US is targeted.

Counsel should specifically confirm:

1. The account boundary: accounts and personal profiles are 16+, while Kids Mode is usable without a child account under parent/guardian supervision.
2. Whether the current age-band selector requires any additional age-assurance or parental-consent flow.
3. Whether all analytics, cookies and advertising behavior on `/kids/` is appropriate for child-directed use in each target jurisdiction.
4. Data retention and deletion for account data, device-local Kids preferences, Match Together, logs and payment records.
5. Required disclosures for Supabase, Stripe, Google services, AI providers and entertainment-data providers.
6. International-transfer, controller/contact and governing-law language before wider international marketing.

This document is an implementation handoff, not a substitute for legal advice.

## KPI definitions after remediation

- **Visitor → match start:** unique visitors who begin a match / unique visitors.
- **Match completion:** completed match results / match starts.
- **Matches per active user:** completed matches / active users in the period.
- **D7 / D30 retention:** users active again 7 / 30 days after first qualifying session.
- **Taxonomy mismatch rate:** confirmed wrong media type, platform, title identity or artwork / sampled published catalog entries.
- **Primary CTA error rate:** monitored primary CTA requests returning 4xx/5xx / primary CTA requests checked.
- **SEO index health:** valid indexed `.tv` URLs, residual `.cc` URLs, canonical conflicts and sitemap errors.

## Exit criteria for the freeze

The temporary freeze can be lifted when all of the following are true:

- pricing entitlement checks are green;
- no primary CTA points to a known 404;
- `.tv` remains the only canonical/sitemap host;
- the known Baking Show regression test is green and catalog validation passes;
- stale event labels are date-driven;
- Kids legal/privacy changes have received counsel review or documented interim approval;
- deployment health checks pass on the current production commit.
