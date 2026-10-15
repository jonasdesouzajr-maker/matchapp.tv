# MatchApp Ai release checkpoint — 2026-10-15

Candidate: `9474ef77d56e9d6e9964ffb2111716f35bbb836e`.
PR: https://github.com/jonasdesouzajr-maker/matchapp.tv/pull/245
Branch: `release/perimeter-publish-20261014`.
Rollback candidate: `ffdf1813539225f6d793a3612c9dce64b7c16959`.
Fresh isolated worktree: `C:\Users\jonas\matchapp-launch-integration-20261015`, local branch `integration/publish-candidate-20261015`.

## Reviewed integration

Merged main `b0ce7b84d4a2c5a16cd1415c1671504aa9f5d630` (two hourly news commits) into the previous tested candidate. The new changes affect only news pages/data, sitemap freshness and news manifests. Product, native code, protected ads and approved artwork are unchanged from ffdf1813.

Audited actual contents before staging: 19 modify/delete conflicts retained byte-equivalent candidate article files; every article route from both parents exists (1,161 total, including 21 new pages); every existing article canonical and robots tag is unchanged. Both sitemap files retain every parent URL; 245 sitemap URLs remain. Newly added article pages use the corrected `brand.css?v=20261014-matte1`. No article deletions are staged or committed. No unresolved conflicts remain. PR was verified mergeable after the push.

## Exact candidate CI

All five checks succeeded:

- AdSense Immutable Lock: https://github.com/jonasdesouzajr-maker/matchapp.tv/actions/runs/38696696197
- Validate website: https://github.com/jonasdesouzajr-maker/matchapp.tv/actions/runs/38696696289
- Independent CodeQL Security Scan: https://github.com/jonasdesouzajr-maker/matchapp.tv/actions/runs/38696696178
- Validate Android apps: https://github.com/jonasdesouzajr-maker/matchapp.tv/actions/runs/38696696188
- Matching and AI Audit: https://github.com/jonasdesouzajr-maker/matchapp.tv/actions/runs/38696696253

Website logs: 1,151 tests passed, zero failures/skips. Site/search/indexability audit: 245 URLs, zero missing sitemap pages, zero noindex sitemap URLs, zero indexing errors. Existing optional rich-result and analytics warnings remain. Do not invent reviews to suppress them.

Real-backend candidate smoke: 71 passed, zero failed. Deep smoke: 15 passed, zero failed/unverified. These run against the checked-out candidate and real backend services; they do not prove the candidate is deployed to matchapp.tv. External Google rum.js telemetry warning has no first-party stack and remains unverified.

Android CI: adult debug, unsigned release bundle and Kids regression build passed. Adult artifact remains version 1.1.52/code52, UNSIGNED and not Play-ready. Artifact: https://github.com/jonasdesouzajr-maker/matchapp.tv/actions/runs/38696696188/artifacts/11954811043
Audit screenshots/reports: https://github.com/jonasdesouzajr-maker/matchapp.tv/actions/runs/38696696253/artifacts/11954921369

Local validation was attempted twice but Windows exhausted virtual memory (Node fatal Zone allocation; site read also returned UNKNOWN). These incomplete local runs are not passes. Unchanged tests subsequently passed on clean hosted CI. Local editorial rotation audit passed. No test was weakened, removed or skipped to obtain green results.

## Deployment truth

Cloudflare preview for this SHA: https://7738fd41.match-app-6ua.pages.dev
Cloudflare bot confirms successful preview deployment. HTTP inspection confirms preview brand.css matches normalized candidate SHA256 and contains approved-mask SVG reference.

Public https://matchapp.tv and the production Pages URL https://match-app-6ua.pages.dev still use old `brand.css?v=194`; public CSS does not match the candidate or contain the approved mask. Public deployment-sha.txt returns 404. No main merge, production promotion, domain change, Play upload or publication was performed.

Cloudflare project `matchapp`, account `ee95b470b42ed2e8cebab958dc080c59`. GitHub Pages workflow stamps deployment-sha.txt, whereas current Cloudflare output does not; confirm authoritative Cloudflare production branch/build/output and domain mapping before publication. Never treat Vercel or Cloudflare preview success as production release success.

## Physical evidence and outstanding gates

Earlier Samsung SM-X236B physical evidence at ffdf1813 remains in FINAL_CHECKPOINT.md and physical-final-sha.json. Product/native/CSS code is identical in the new news-only integration; do not relabel the earlier physical run as a new exact-SHA device run. No emulator was used. This session ADB lists no connected device.

The unintended square/matte rule is already permanent in AGENTS.md. Approved PNG remains immutable; shared SVG display mask and transparent brand-link background remain intact.

Outstanding: keyboard-open physical chat behavior; microphone recognition and audible approved speech; signed-app account/Google/SMS/payment/consent/upgrade flows; Play highest uploaded version code; existing signing role/password configuration and correct registered upload certificate; appropriate Kids release status. Existing code52 signed Oct12 bundle differs in native payload and is not a substitute for the repaired build.

## Access blockers and continuation

Owner authorization already covers release actions subject to green gates and forbids new purchases/charges. No further generic permission is needed.

Fresh browser inventory exposes only a separate Chrome browser with no tabs and no native apps, not the laptop's logged-in Edge session. Remote Desktop Commander provides authorized shell/files but no Edge UI control. No Edge CDP endpoint was present. Do not copy browser cookies/profiles or expose debugging to bypass this limitation. Connect a controllable authenticated Cloudflare/Play browser session or an appropriate supported account connector; reconnect the tablet; provide the existing signing configuration through the authorized local signing flow without exposing private keys/passwords.

Resume from this SHA and actual Git/process state. Avoid restaging QA output, npm logs or JVM crash logs. The old worktree contains preserved QA modifications. Explicitly fetch main into origin/main: the repository's default fetch refspec is narrow and plain `git fetch origin main` does not update origin/main. Recheck new main commits only when preparing the actual integration/publication, preserving newer release work and existing article URLs.

Only call release complete after exact production identity, public browser/WebView smoke, all mandatory device gates and actual Play publication/status are verified. No completion notification has been sent.
