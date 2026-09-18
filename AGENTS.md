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
