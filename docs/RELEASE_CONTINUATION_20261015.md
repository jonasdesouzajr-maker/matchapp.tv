# Release continuation — 15 October 2026

Resume from this checkpoint; do not redo completed work.

- Live web baseline before this follow-up: 005bad4be6a8ea74eede57d33f4aed55ed197b14. Previous production smoke checks passed.
- Owner cancelled donation reward proposals. Keep only the small hand-icon Donate shortcut leading to /#ma-donate-support. No reward credits, new amount selector, currency conversion or donation purchase products are authorized by that cancelled proposal.
- Presentation-only shortcut added to adult app pages, localized in 14 languages, with reduced-motion handling. Matching, Ask AI, auth, quotas, payments and Kids untouched.
- Donation-footer and AdSense-lock targeted checks: 15 passed, 0 failed. Browser shortcut layout check evidence: C:\Users\jonas\donate-shortcut-check.log. Test runner remains untracked; only resume failed or unfinished cases.
- All four Google Play listings (default, Brazil, US, Australia) have the approved icon and new physical-app screenshots. Eight asset changes submitted on 15 October; Play confirms Changes in review. Managed publishing is ON. Do not resubmit these changes.
- Native version 53 bundle was already built and tablet checks passed in the prior session. It remains UNSIGNED. Existing signing helper: C:\Users\jonas\matchapp-sign-existing53.ps1. Its configured E:\papercup key/artifact location was unavailable in this session. Do not rebuild the finished AAB. Locate the existing upload key and obtain its password through a local masked prompt, verify certificate against Play, then upload to PRODUCTION (not internal testing) and complete release checks.
- Web shortcut branch: design/donate-section-shortcut-20261015. Finish browser checks, push and merge only after required CI passes; verify deployment revision and shortcut link afterward.
