# Android 1.1.62 follow-up

Production 1.1.61 is published at 100% in 178/178 countries. Its safe insets, physical fullscreen video/PiP and genuine matching/Jonas text-chat QA passed. The final website deployment 944a2af passed all 74 live checks with no errors or warnings and the full 2889-test suite. Existing English/Portuguese listing updates and Hindi addition were published with 61.

Play still recommends optimized R8 shrinking / AGP 9 and flags Material 1.12 DatePicker plus AndroidX backward compatibility API paths. Candidate 62 updates stable Material to 1.14.0 and AGP to 9.0.1 / Gradle 9.1.0. The documented external Kotlin/legacy DSL compatibility flags preserve both module configurations; Kids source is untouched. AGP 9 enables optimized resource shrinking for the existing release shrinkResources configuration.

Keep all release gates. Unsigned CI AABs require local signing with the registered private upload key. Verify all uploaded version codes before uploading candidate 62 to Production. Preserve production app data; use the separate debug package for physical preflight. Do not launch emulators or weaken tests. Guarded AndroidX legacy compatibility may still be reported by static Play analysis; do not claim a warning is gone before checking the accepted release.

AdSense matchapp.tv is Getting ready, ads.txt Authorized, existing Auto ads/CMP setup confirmed. Approval is external and remains pending.
