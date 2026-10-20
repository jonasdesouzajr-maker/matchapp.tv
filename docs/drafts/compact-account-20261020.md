# Compact design and account routing draft — 2026-10-20

Owner request: remove the gold screen outline from all pages; make the adult app compact on phones, tablets and the live Android WebView; retire user profile avatars; send returning sign-ins Home and reserve initial profile setup for unfinished new registrations. Save as an unpublished draft and leave testing for tomorrow.

Implemented:

- Shared `brand.css` no longer draws the viewport outline; frame-related modal backdrop clipping is removed. Safe-area handling and Jonas viewport clamping remain.
- `compact-app-20261020.css` reduces header, control, heading, form/card and Top Titles presentation dimensions. Touch controls retain at least 44px targets. Existing original artwork, music-video metadata and protected ad geometry are preserved.
- Avatar studio, uploads, presets, rendering and client/cloud avatar synchronization paths are retired. Profile Settings remains available. Old local avatar caches are cleared; no remote account data is deleted.
- `auth-destination.js` shares the email, Google, phone and passkey sign-in policy. Persisted `profiles.profile_locked` or `registration_completed_at` releases setup across devices. Existing signup metadata and server account creation from 2026-10-20 identify unfinished new registrations. Older unmarked accounts stay Home. Profile-read errors do not turn a successful sign-in into a credential error or force returning users to Profile.
- Initial setup opens the existing profile details form. Save dispatch resolves the current registration handler, retaining the server-confirmed save/lock flow.
- Updated page asset references and the brand finalizer prevent stale styling or retired avatar scripts returning on generated pages. Most HTML edits are only shared asset links/cache keys.

Status: source edits and read-only source review complete. No tests, browser checks, builds, native artifacts, merge or production deployment performed. No workflow or AdSense guard changes.

Tomorrow, before merge/release:

1. Update superseded gold-perimeter, avatar-feature and forced-profile redirect test expectations to the new owner policy.
2. Verify returning email/Google/phone/passkey sign-ins on a fresh device/session land Home; unfinished new accounts remain in setup until server-confirmed save/lock, then return Home. Cover slow/failed profile reads and failed saves.
3. Review 320px/390px phones, tablet, desktop and adult Android WebView, including keyboard/safe areas, RTL, long translations, header wrapping, original posters and avatar absence. Kids only needs outline removal verification.
4. Run the required existing regression/site audits and protected advertising gates once for the completed change set. Keep the draft unmerged and unpublished until the deferred work is complete.
