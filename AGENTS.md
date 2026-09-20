# MatchApp repository instructions

These are standing implementation rules for MatchApp work in this repository.

1. **Never-dead-end matching**
   - Normal MatchApp and Kids Mode must not return an empty-state error merely because the first local shelf has no fresh title.
   - **Normal MatchApp:** every criterion the user explicitly selects is a hard requirement. Never relax mood, real genre/category, platform, decade, vibe, rating, origin-country exclusions, genre exclusions, or other explicit choices to fill a result. Expand into verified source-backed discovery or recycle an older exact match instead.
   - **Kids Mode:** age approval and child-safety allowlisting are hard boundaries and must never be relaxed. Secondary taste constraints may only be widened when the reviewed Kids library genuinely has no exact approved item.
   - Explicit user exclusions such as Not For Me, blocked categories, excluded genres and excluded origin countries are hard boundaries.
   - Prefer unseen exact titles, but an eligible exact repeat is better than an off-criteria result.

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
   - Daily Check-in should stay compact after the day's check-in; explain the 7-day/+5 Extra Matches mechanic through the release/notification experience and first-visit education rather than occupying permanent screen space.
   - Performance is a product requirement: prefer compositor/native scrolling, lazy/interaction-triggered metadata work, bounded observers, and graceful fallbacks; avoid homepage changes that introduce freezes, crashes, scroll traps, or animation jank.
   - Runtime stability is mandatory for every change: never introduce unbounded render/update loops, layout thrashing, recurring full-page animation, duplicate startup owners, or code paths that can freeze/crash browsers or Android WebViews.

7. **Responsive visual parity and Android release parity**
   - Every approved MatchApp main-product UI/UX change must be designed and verified for desktop, tablet, and smartphone breakpoints in the same task; never ship a desktop-only or mobile-only redesign.
   - Treat the live responsive web surface as the source of truth for the standard Android WebView app. After an approved production UI release, synchronize the Android Studio `:app` build marker/version so a fresh AAB cold-loads that release. Review `:kidsapp` in the same task and bump it alongside the main app when an AAB refresh is requested, without importing normal-mode branding/content into Kids Mode.
   - Preserve MatchApp Ai KIDS branding and Kids-only routing. Anime and other adult/normal-mode catalog additions must not leak into Kids Mode.
   - Prefer responsive CSS and shared web behavior over Android-only visual forks. Verify taps, folds, dialogs, horizontal rails, viewport zoom, external links and back navigation inside Android WebView as well as browsers.
   - Visual effects must respect `prefers-reduced-motion`, avoid layout-triggering animation loops, and must not introduce scroll traps, freezes, crashes or excessive battery/CPU use.
