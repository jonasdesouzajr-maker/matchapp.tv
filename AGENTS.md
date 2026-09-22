# MatchApp repository instructions

These are standing implementation rules for MatchApp work in this repository.

1. **Never-dead-end, never-repeat matching**
   - Normal MatchApp and Kids Mode must not return an empty-state error merely because the first local shelf has no fresh title.
   - **No displayed Match result may be shown twice to the same browser/profile.** Anonymous history persists locally; signed-in history must also sync to the account. Never recycle a previously shown title as a fallback.
   - **Normal MatchApp:** every criterion the user explicitly selects is a hard requirement. Never relax mood, real genre/category, platform, decade, vibe, rating, origin-country exclusions, genre exclusions, or other explicit choices to fill a result. Expand into verified source-backed discovery for a new real title instead.
   - **Kids Mode:** age approval and child-safety allowlisting are hard boundaries and must never be relaxed. Secondary taste constraints may only be widened when the reviewed Kids library genuinely has no exact approved unseen item; widening must still choose a new approved title.
   - Explicit user exclusions such as Not For Me, blocked categories, excluded genres and excluded origin countries are hard boundaries.
   - If verified unseen supply is temporarily exhausted, do not invent a title, fabricate availability, or silently repeat one. Continue verified-source discovery where supported and explain any temporary source limitation truthfully.

2. **Verified title metadata**
   - Display real catalog genres/categories from trusted title metadata. Do not present MatchApp mood/vibe/internal taxonomy as official title genres.
   - Embedded previews must be verified for the exact title. If no verified preview exists, do not embed a guessed clip; show a clear title-page link instead.
   - Where availability metadata exists, expose all known streaming/rent/buy services and theatrical/showtime access, not only one primary provider.

3. **Title/event handoff**
   - Trending titles, normal matching results, AI-chat title results, and event cards must have a working path into the AI detail experience with the exact item context.
   - Event detail handoffs should preserve official event-page and official viewing-source links.

4. **Android synchronization**
   - Every approved production web fix must be reviewed for both Android Studio modules in the same task:
     - `:app` — MatchApp Ai
     - `:kidsapp` — MatchApp Ai KIDS
   - The Android apps use the live production WebView surfaces; do not duplicate the website source into Android.
   - When a fresh AAB is requested after a web release, bump both Android build markers/version metadata together so both modules cold-load the intended production release.
   - Preserve the standard-app Kids-route block and the Kids-app non-Kids-route block.

5. **Scope discipline**
   - Treat the user's requested scope as a hard boundary for every MatchApp task.
   - Change only the files and behavior required to deliver the requested fix/feature and its necessary tests, SEO/indexing metadata, translations, deployment or Android synchronization.
   - Do not redesign, refactor, rename, remove, or "clean up" unrelated working features while implementing another request.
   - When a necessary dependency would affect unrelated behavior, preserve the existing behavior and make the smallest isolated integration possible.


6. **Homepage compactness, folding, and discovery**
   - Keep smartphone/tablet vertical spacing compact but breathable: fields should be close without touching or overlapping.
   - Major homepage cards/fields must remain foldable without breaking their controls, animations, accessibility, or vertical scrolling.
   - The Latest titles and Events rails auto-glide to the right at a slow, human-readable pace until the visitor manually interacts/swipes; after manual control, do not fight the visitor with autoplay. Keep Events poster cards the same dimensions and compact visual treatment as Latest titles, and keep both fields foldable.
   - Clicking a Latest title must expose verified title details appropriate to small screens: synopsis, real genres/categories, cast when source-backed, production country, and country-specific watch availability.
   - Let visitors explicitly choose their viewing country; persist that choice for regional availability.
   - Never fabricate an exact streaming deep-link. Use an exact provider/title URL when the source supplies one; otherwise clearly use the provider's supported search/title-discovery destination or verified regional guide.
   - Cinema-only/current-theatrical titles should carry a cinema indicator. Nearby-cinema lookup may request geolocation only after an explicit user action and must degrade safely if permission is denied.
   - Daily Check-in is a permanent field directly under the top box on Home, Match Together and Ask MatchApp, at the top box's width and shorter than it, on every surface. It is never moved back behind the Settings menu. It stays compact after the day's check-in — the day's action collapses and the seven-day track carries the remaining explanation — and the 7-day/+5 Extra Matches mechanic is reinforced through the release/notification experience and first-visit education rather than by growing the field. Every check-in is worth +1 Extra Match and day 7 adds +5 on top; the reward is registered-accounts-only and is granted server-side.
   - Performance is a product requirement: prefer compositor/native scrolling, lazy/interaction-triggered metadata work, bounded observers, and graceful fallbacks; avoid homepage changes that introduce freezes, crashes, scroll traps, or animation jank.
   - Runtime stability is mandatory for every change: never introduce unbounded render/update loops, layout thrashing, recurring full-page animation, duplicate startup owners, or code paths that can freeze/crash browsers or Android WebViews.
   - Every implementation or repair must include a regression/stability check for the touched flow. Do not ship browser warnings, uncaught errors, infinite loops, scroll locks, freezes, crashes, or excessive compositor/GPU work on phone, tablet, desktop, TV, or Android WebView.

7. **Responsive visual parity and Android release parity**
   - By default, approved MatchApp main-product UI/UX changes must be designed and verified for desktop, tablet, and smartphone breakpoints in the same task.
   - When the repository owner explicitly requests a **smartphone-only** change, keep tablet, desktop and TV layouts unchanged. Scope the CSS/behavior to handset breakpoints only and verify representative smartphone widths.
   - Every approved smartphone-only change must also be carried into the relevant Android Studio WebView module in the same task: normal-mode smartphone changes go to `:app`; Kids-only smartphone changes go to `:kidsapp`; changes shared by both surfaces are reviewed for both modules.
   - Treat the live responsive web surface as the source of truth for the standard Android WebView app. After an approved production UI release, synchronize the Android Studio `:app` build marker/version so a fresh AAB cold-loads that release. Review `:kidsapp` in the same task and bump it alongside the main app when an AAB refresh is requested, without importing normal-mode branding/content into Kids Mode.
   - Preserve MatchApp Ai KIDS branding and Kids-only routing. Anime and other adult/normal-mode catalog additions must not leak into Kids Mode.
   - Prefer responsive CSS and shared web behavior over Android-only visual forks. Verify taps, folds, dialogs, horizontal rails, viewport zoom, external links and back navigation inside Android WebView as well as browsers.
   - Visual effects must respect `prefers-reduced-motion`, avoid layout-triggering animation loops, and must not introduce scroll traps, freezes, crashes or excessive battery/CPU use.

8. **Instructed scope only**
   - Do exactly what the request asks for, and nothing else. The request is the whole brief and the whole boundary.
   - Do not add unrequested redesigns, refactors, renames, dependency changes, "improvements", cleanups or adjacent fixes, even when an obvious defect is spotted in passing. Note it, report it as a suggestion, and wait to be asked.
   - When a request arrives with an implementation brief written for a different stack or a different assumption about this codebase, deliver the requested outcome in this repository's actual stack and say plainly which parts of the brief did not apply and why. Do not silently substitute a different goal.
   - When an instruction conflicts with a standing rule above, or with a stability guard already in the code, stop and surface the conflict with options instead of resolving it unilaterally in either direction.
   - Do not push, deploy, open a pull request or bump a release marker unless that was asked for.
   - This rule binds every agent working in this repository, Claude sessions included, and it stays in force until the repository owner changes it.

9. **Home landing visual contract**
   - **Brand mark inside the top box.** The MatchApp mark must sit fully inside the Home header box, never overlapping or hanging outside its border, on every surface: smartphone, tablet, desktop and both Android Studio WebView modules. Logo containment is never a breakpoint-specific fix — when it is wrong anywhere it is fixed for all widths at once, at the root cause.
   - **Full-screen key-art background.** The landing backdrop is a dense, tilted grid of key art filling the whole screen on every surface — not a desktop-only treatment and not a scatter of small covers. It is pinned to the viewport, rotated once on the grid container, and given a column count per breakpoint so the tiles read as posters at every size, with the content scrolling over it and a scrim protecting text contrast.
   - **Background artwork is ours.** Tiles are pooled from MatchApp's own reviewed catalogue (the wall and identity lists, the verified poster map and the rail covers). Never reproduce another service's line-up or page artwork; match layout and craft, never their content.
   - **Background tiles stay cheap.** Request background renditions (w154/w185), never the rail's w500 or w780, size the tile count to the viewport, and insert tiles in bounded idle batches. A dense wall must not cost more at startup than a sparse one — measure it.
   - **The background stays static.** No drift, parallax, marquee, sweep or glow on the wall or its tiles. The 2026-09-20 renderer crash guard exists because animating it crashed renderers; it is never relaxed for a visual request.
   - **Approved sign-in card.** The glassmorphic sign-in card approved on 2026-09-21 is settled. Do not restyle it unless asked.
   - **Top-box control bar.** Every header control stays visible and reachable; the bar is tidied by sizing, ordering and wrapping, never by hiding or removing a control. The only element allowed to collapse is the credits badge while it is genuinely empty.
   - **Cover titles.** Every rail cover shows its title. The caption element is created when the markup does not ship one; `aria-hidden` marquee clones are never captioned and never focusable.
   - **Golden edge.** Covers, boxes and fields carry the gold outline from CSS alone, so it never depends on a runtime reaching them. The travelling sheen is the only animated part and stays capped at a dozen on-screen elements through a bounded IntersectionObserver, off entirely under either reduced-motion signal. Never animate the whole selector set.
   - **Hero headline is the way in.** Clicking or keyboard-activating the Home headline opens the matching fold and scrolls the matching field into view. It opens the fold through the fold's own control so `lazy.js` stays the single fold owner and the remembered state keeps in step, and it binds to the element rather than to markup inside it, because i18n rewrites that heading's text on every language change.
   - Any change to the Home landing visuals is designed and verified at handset, tablet and desktop widths in the same task, with before/after evidence, and reviewed for both Android modules.

### Stability invariant
- Every change must preserve runtime stability first: do not introduce crashes, freezes, infinite render or mutation loops, layout thrashing, unbounded observers/timers, or expensive continuous compositor work. Keep edits surgical, bounded, responsive, and regression-tested before deployment.
- Never attach a MutationObserver to a result subtree if its callback (directly or indirectly) rewrites that same subtree. Main Match and Kids result enrichment must stay event-driven and idempotent; repeated enrichment of the same title/metadata must settle without additional DOM churn.
