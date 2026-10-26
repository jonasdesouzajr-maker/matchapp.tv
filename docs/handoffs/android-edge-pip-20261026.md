# Adult Android edge-to-edge and PiP candidate — 2026-10-26

Package: com.jonas.papercup. Native candidate only; no Play upload, submission or publication.

## Changes
- AndroidX Core 1.17.0 supplies WindowCompat.enableEdgeToEdge(window). Use it in the main shell, intro entry/exit and private avatar Activity.
- Remove direct deprecated status/navigation bar-color assignments and matching adult theme items. Preserve the main shell's existing system-bar/cutout/keyboard inset owner and protected ad geometry.
- Give the private avatar one system-bar/cutout inset owner and its existing dark backdrop.
- Native fullscreen media can enter system PiP on leaving the Activity, API 26+ with device support. Home, chat, matching, startup and permission prompts are excluded. User/device PiP denial is tolerated.
- Keep the fullscreen WebView resumed while visible in PiP, pause whenever stopped, and resume normally when expanded.
- Pure Kotlin eligibility tests and source regressions cover supported/unsupported devices, non-fullscreen pages, overlays, finishing and repeated entry.
- Kids, web matching, AI routing, billing, quotas, artwork and ad configuration unchanged.

## Validation and release boundary
- Focused existing Android/avatar/ad checks plus the new source checks: 28 passed before the final API-entry/exit cleanup; final confirmation and Kotlin/unit/lint run must be read from the laptop logs before release.
- Laptop build: E:\MatchAppWork\temp\android-edge-build-20261026.log. Final build log will use android-edge-final-20261026.log.
- No tablet/emulator testing requested or performed.
- Supported laptop browser control is absent from this session. Existing Play drafts, managed publishing, production track and highest uploaded code cannot be freshly inspected.
- Release numbers intentionally remain 1.1.60/code60 until the highest uploaded Play code is verified. This candidate must NOT be uploaded using code60.
- Before store release: inspect Console, allocate a strictly higher code and synchronize all release/UA/build markers, use the existing private upload key, verify signed bundle/package/certificate, inspect preserved listing drafts and rights-cleared promotional assets, then submit through a supported Console session.
- Existing listing handoff: E:\MatchAppWork\play-listing-refresh-20261025\STATUS.md. The previous screenshots were not established as rights-cleared. No screenshot rights declaration or store change has been made.

References: https://developer.android.com/reference/androidx/core/view/WindowCompat and https://developer.android.com/develop/ui/views/picture-in-picture

## Final follow-up
Android 12+ now uses automatic PiP transitions with a source rectangle updated from fullscreen layout, disabled when fullscreen exits. API 26–30 retains explicit entry.
Laptop lint identified seven pre-existing MissingTranslation errors in the adult default native strings. Added six authored native-shell strings in thirteen locales, marked the unchanged product name non-translatable, and kept native languages in the base bundle so runtime language switching works offline. No lint checks were disabled.
At the original pushed native head, hosted Android debug/release compilation, JVM tests, unsigned-bundle checks and Kids compilation passed; all 58 laptop JVM tests also passed. Final refined source/resources must finish the final local/hosted checks before release. No signed or uploadable code60 bundle is produced by this task.
