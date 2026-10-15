# Jonas premium presentation and focused Home handoff

Repository: jonasdesouzajr-maker/matchapp.tv
Integration branch: integration/jonas-premium-20261014
PR: https://github.com/jonasdesouzajr-maker/matchapp.tv/pull/240

## Implemented

- Existing adult Jonas controls receive scoped glass, breathing, hover expression crossfade and reduced-motion support. No second voice or metered chat implementation.
- Android ambient shell loads the same presentation; drag persistence overrides are scoped to the bubble, leaving the native wrapper unchanged.
- Original intro soundtrack extracted to an actual MP3; gesture/session guards prevent blocked autoplay or overlapping speech.
- Top Titles keeps its single native rail controller, with touch presentation temporarily free of smooth-scroll/snap friction.
- Focused Home: watch matching/results, Top Titles, Together, weekly choice and trending. Auxiliary sections are hidden with a scoped CSS override, preserving the publisher-owned source blocks and locked ad markup.
- Header and Explore hub route to dedicated destinations. `/music.html` reads the existing published chart/release blocks, retaining exact artwork, identities and official URLs. `/ebooks/` mounts the original matcher and shared quota controller; old reading bookmarks redirect there.
- Obsolete `patches/jonas-top-right-spacing.css` and `patches/jonas-pulse-fix.css` and their links removed.
- Sitemap generator includes Explore and Music. Existing awareness publication was merged; the derived worldwide guide was synchronized to its current URL manifest.
- Live smoke now visits the relocated reading/news hubs and verifies focused Home controls after match dismissal.

## Verification checkpoint

- Local: 1,095 tests passed; site/search audits have no errors. The final smoke-assertion-only change passed its dedicated regression guard.
- CI at product SHA 0a1089ff: website, Android compilation, CodeQL and AdSense lock passed. Intro and touch smoke passed (36 touch checks). Actual browser matching/AI audit passed 66 checks; the sole failure required the intentionally retired Home Ask box to remain visible after dismissing a result. Commit cb9c6b33 corrects that assertion to require Explore navigation plus the watch form and Top Titles; its full CI result must be inspected.
- Samsung tablet: SM-X236B, serial RXGL200HCRW. MatchApp Ai 1.1.52-debug installed separately from the older PaperCup/store v12 package. Candidate static assets were previewed through CDP with real backend routes; focused Home, zero horizontal overflow, a single in-viewport premium bubble, drag persistence and opening/closing the original chat passed before Android screenshot capture timed out. This is candidate evidence, not proof of deployed production.
- A local Gradle debug rebuild stalled and was stopped. A manual preview-only APK refresh was rejected by Android resource packaging validation and was not installed. Prefer the successfully built CI debug APK from Android run 38542704737, artifact MatchApp-Ai-Android-Jonas-Ambient-DEBUG-APK, tied to 0a1089ff. Re-sign only this DEBUG APK with the local debug key to retain installed test-app data. Never use debug signing for Play.

## Remaining release/design work

1. Inspect current branch, PR and CI state; continue from the verified checkpoint without repeating finished tests/builds unnecessarily.
2. Review the premium design on phone/tablet/desktop and the physical tablet APK, especially chat glass, avatar expressions, drag/resize/restore, touch velocity, menu wrapping, reading controls, Music covers/official links, and startup responsiveness.
3. Finish real device APK checks. Candidate-only preview must not be called a live deployed test. Chrome, Safari and production Android WebView intro-audio behavior still require verification.
4. Remove only confirmed superseded/unreferenced design files. Retain speech, auth, quotas, core matching, original source art, locked ads and serialized publisher workflows.
5. Once the exact PR head passes all gates, merge normally; wait for deployment-sha.txt to match and run the existing release smoke once for that deployed SHA. No force push or duplicate engines.
6. These changes do not require another AAB. The old store/native version and existing code52 release candidate remain a separate native publication task. No Play release was submitted by this handoff.

## Owner refinements on continuation
Home reserves a top-right corner for Jonas; other adult pages use the screen top-right default. The original drag controllers now also persist one shared position across pages/reloads. Chat bounds use visualViewport and safe-area insets independently of the bubble. The existing ambient shell is reused on adult page-shell destinations; embedded frames and Kids do not mount another assistant. The original native greeting/word-boundary speech path remains, with a larger conversation face and eye-only blink layer. Verify final-head CI and real-device bounds before claiming release.

## Loading, speech and chosen-language continuation — 2026-10-14

- Permanent language-choice contract saved in AGENTS.md. Every supported main dictionary key now has authored copy in all fourteen languages, including the 59 Profile Hub keys previously available only in English/Portuguese. This verifies dictionary coverage, not complete translation of all untagged legacy/editorial text.
- Explore now has the existing language selector, fully translated navigation/cards and an updated How it works disclosure covering the current Home/Explore destinations. Music adopts the same chosen-language navigation; existing chart labels retranslate after source refresh. Link targets and source identities remain unchanged.
- Main Home/Ask/Profile document titles and language-selector accessibility labels follow the chosen language. Thinking/recovery messages are translated. Changing language stops current synthesis/recognition, prevents late recognizer results from overwriting input, and discards a pending old-language answer before its successful-response debit, restoring the question for retry.
- Home's existing Supabase SDK moves from the blocking head to immediately before its existing consumers. It is preloaded without blocking first paint. No auth, matching, quota, ad or provider behavior is replaced. The successful Ask AI debit is still awaited; the subsequent badge refresh no longer blocks answer presentation.
- Speech immediately uses an already verified matching male local voice when available, with a bounded start watchdog and cloud recovery. The ambient greeting can use the same small shared speech module without waiting for the large conversation iframe. Conversation iframe remains on-demand; no duplicate speech/chat engine or hidden AI request.
- Production synthesis measurements for the short standard greetings: English 11,972ms; Portuguese 12,515ms, both successful WAV responses. These exceed the previous overlay waiting budget. Exact fixed English/Portuguese recordings are committed as small MP3s (18,957/22,557 bytes) and reused through the same speech playback path, bypassing repeated synthesis/auth waits. Other languages retain their verified local/cloud path; no wrong-language recording is substituted. New response speech still depends on the chosen language's available device/provider voice.
- Ambient stylesheet uses a stable versioned URL instead of Date.now(), retaining ordinary browser caching. Updated asset references are versioned; generated shared-loader references preserve their generator source. Production Android remains the live WebView; only existing debug preview JS mirrors are synchronized, with no native version/signing change.

Evidence: local Chromium UI checks on Home, Explore, Music and Ask AI at 320/390/820/1366px passed 16 route/size checks with no page exceptions or horizontal overflow. Explore switches through all fourteen languages without changing destination links. Local Home first-contentful-paint was 272–340ms. A separate controlled phone-browser benchmark with an identical artificial 1500ms SDK delay improved first-contentful-paint from 1680ms to 244ms; DOMContentLoaded was 2190ms vs 2030ms. These are local isolated results, not production speed promises. Browser QA: tools/qa-performance-language-20261014.cjs; focused behavioral regressions: tests/performance-language-20261014.test.cjs.

Release still requires exact-head CI, physical playback/microphone checks and deployed-SHA smoke. Full-site localization must also account for untagged legacy/editorial prose and any remaining hardcoded dynamic strings; complete base dictionaries alone do not prove every visible sentence is translated. Keep this distinction explicit in release reporting. Cloudflare Free already supplies CDN/SSL/DDoS; Pro cannot remove speech synthesis/model generation time. Any later domain-plan upgrade belongs to matchapp.tv; matchapp.cc is the redirect domain. No subscription was purchased.

Final local gate for this continuation: 1,106/1,106 tests passed. Site audit checked 1,346 HTML and 471 JavaScript files with zero issues; search readiness checked 244 public URLs with zero errors; sitemap/video guard reported zero errors. Existing advisory warnings (including missing analytics on some routes and absent unverified rich-result fields) remain warnings. No ratings or source metadata were invented to silence them.

### Final visual-review follow-up

### Gemini latency follow-up — 2026-10-14

Live gemini-proxy version 94 now applies documented low thinking effort to adult Gemini 3.5/3.6/3.8 Flash requests. The 8192-token limit, structured schemas, language prompts, validation, quotas, key/project ordering and portable 400 retry remain intact. Lite models retain their minimal default; Kids inference settings and route sequence remain unchanged. Adult routing skips the duplicate 3.6 attempt after 3.5 on the same key, because Google documents 3.5 as an alias of 3.6. Independent project keys are not collapsed. No Gemini speech/TTS settings changed; OpenAI remains primary for Jonas speech.

Deployment was patched from live version 93, preserving its newer persona/general-conversation changes that are absent from this branch. Do not redeploy this branch's older index.ts wholesale and overwrite those live changes. The new latency-config.mjs module is included in the live deployment. JWT verification remains enabled. All 1110 local tests passed and the exact deployed TypeScript candidate passed syntax validation. Two post-deployment direct Gemini smoke requests returned HTTP 200 / STOP / Spirited Away with English and Brazilian Portuguese synopses respectively. Both used the free Flash-Lite route (13.03s and 14.21s including this environment's connection overhead). These are functional checks, not proof of a before/after speed gain on the tuned full Flash routes. Baseline Flash-Lite request was 17.34s, but network variability and unchanged Lite effort prevent attribution to this patch.

OpenAI API funding/key were corrected by owner. Live speech now returns MP3 via OpenAI in en and pt-BR; a laptop greeting test completed in 6.247s. Instant greeting/streamed reply web work still follows the earlier pending-release checkpoint. Company identity was recorded in AGENTS.md as supplied, with registered legal name/address still needed before public legal or billing changes.

The queued localization observer dropped later DOM insertion records while its first animation-frame paint was pending. A cookie banner inserted in that interval could remain English despite the selected Portuguese language. The observer now batches all inserted elements without rescanning the document; a regression reproduces this timing and asserts translated copy/controls with unchanged consent links. Consent state, handlers, defaults and ad logic are untouched. The Home How it works control now routes to `/explore.html#how-it-works`, which opens the current translated disclosure; the existing optional onboarding engine is retained separately. Late build metadata/new-chat initialization no longer overwrites selected-language document titles. Final local regression count is **1,107 passing tests**; the four-route/four-size browser check passed again, and visual review confirms Portuguese cookie copy and controls. Current full-site/search audits still have zero errors.
