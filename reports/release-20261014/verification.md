# Integrated release candidate — 2026-10-14

Reconciles main f50b0b1c with QA ad2fda78. Keeps the latest cinematic Home/site headers and current news data. Reconciled stylesheet conflicts without duplicate GTM. Preserves main deletions of retired news wrappers. Adds QA navigation, persistent Jonas, clean URL, voice fallback, exact screen-title facts and Android early-document guard.

New fix: oversized cinematic header shimmer created 29–41px Ask overflow at 320px. Confined the animated gradient to the header border box and refreshed only its 29 page references.

Validation: 1,143 tests passed, no failures/skips; static build and adult Android package/version/AdMob/Kids isolation guards pass; site/search audit zero errors (244 sitemap URLs). Integrated local Chromium: 36 page/viewport checks, Home/Explore chat open-close-reopen-Back and navigation/aliases passed. External services blocked in this UI harness. Console noise in JSDOM includes unsupported animation/navigation and teardown timers; not claimed as live-device evidence.

Release holds: Supabase Auth logs on 2026-10-13 confirm missing Twilio account SID on /otp (HTTP 500). Connected tools cannot configure Auth provider secrets. Physical speech, exact live metadata/translation, subscription lifecycle and owner device auth must still be verified. Google Play browser attempt was rejected by automatic approval review; no upload/submission. Current Play maximum version code and current certificate must be read before a signed submission. No purchase or paid service initiated.

Follow-up: sync verified displayed film/TV identity into existing chat/share context after enrichment. Runtime regression protects newer results and pinned identities. Full 1,143-test suite and technical site/search audit pass after repair. Physical translation/speech and authenticated external flows still need evidence.
