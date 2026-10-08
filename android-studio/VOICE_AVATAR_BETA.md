# MatchApp Ai Android voice avatar (beta)

This is an **Android-only, locally packaged** experience. Do not add this interface or its launcher to the public website or Kids Mode.

## Files
- `app/src/main/java/com/jonas/papercup/VoiceAvatarActivity.kt`: isolated native Activity, scoped WebViewAssetLoader, protected app-asset origin, explicit microphone runtime permission, and call cleanup on background.
- `app/src/main/assets/avatar-ai/index.html`: full-screen UI and Canvas facial animation, no paid animation SDK or external JS runtime.
- `app/src/main/assets/avatar-ai/jonas.jpg`: user-authorized Jonas portrait from his existing HeyGen digital-twin look. Bundled inside APK, not loaded on the public website.
- `app/src/main/java/com/jonas/papercup/MainActivity.kt`: Android-only launcher, visible to the authenticated owner during beta.
- `tests/android-avatar-native.test.cjs`: isolated contract checks.

## Voice, usage and security
- The existing authenticated `private-voice-call` Supabase Edge Function allows the packaged app origin `https://appassets.androidplatform.net` while preserving JWT, owner verification and the server-held OpenAI key.
- The Android caller has a product-facing AI persona (never claims to be Jonas); the existing browser private voice persona is unchanged.
- Realtime API requests are **metered**. This avatar does not remove the cost of OpenAI voice. No HeyGen/LiveAvatar paid rendering or other new commercial SDK is used.
- The beta must remain owner-limited until a server-side **per-user quota, concurrency guard and enforceable session duration** are designed, implemented and verified. Never remove the owner guard simply to make the button visible to all users.
- The authenticated access token is passed through an internal non-exported Activity and memory-only asset invocation, not a URL or persistent storage.

## Animation limits
- Local mouth-region texture deformation responds to actual outgoing WebRTC audio amplitude; optional Realtime transcript deltas provide approximate vowel-shape cues.
- Blink, micro-head pose, eye texture and subtle breathing are generated from the real portrait in Canvas.
- **Not** studio-grade, true phoneme-timestamp lip synchronization or neural image/video reenactment. The UI discloses this.
- Respect Android reduced-motion settings and close mic/peer connection when leaving the screen.

## Test
Run `node --test tests/android-avatar-native.test.cjs` and
`cd android-studio && ./gradlew :app:assembleDebug`.
The debug APK is signed with Android's debug key and must **never** be uploaded to Google Play; a separately signed, incremented release AAB requires device QA and rollout approval.

No browser or Kids UI was changed. Do not automatically bump the existing Play release (v42) for an unverified avatar feature.