# MatchApp repository instructions

These are standing implementation rules for MatchApp work in this repository.

1. **Never-dead-end matching**
   - Normal MatchApp and Kids Mode must not return an empty-state error merely because a valid user criteria combination has no exact title.
   - Progressively relax secondary constraints until a result is available.
   - In Kids Mode, age approval and safety allowlisting are hard boundaries and must never be relaxed.
   - In normal mode, explicit user exclusions such as Not For Me / blocked content remain hard boundaries.
   - Prefer unseen titles, but approved/eligible repeats are better than a dead end.

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
