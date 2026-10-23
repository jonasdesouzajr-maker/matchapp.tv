# Galaxy M54 consent acceptance crash — isolated APK test

**Emergency hotfix:** MatchApp Ai 1.1.52 (code 52), com.jonas.papercup.debug.

This PR is documentation-only. Its sole purpose is to trigger the existing Android pull-request validation workflow to export an installable, debug-signed APK. Do not merge it, do not publish this APK on Google Play, and do not uninstall users' production apps.

## Reproduction
- Install the QA APK on a Galaxy M54 using the debug suffix, alongside the Play Store installation.
- Clear only the *QA* app's storage if needed, never the production app.
- Launch, sign out to exercise free/guest consent, accept or decline UMP consent and re-open privacy options.
- Repeat while rotating and minimizing the app; the app should stay open and guest matching should remain functional.
- Verify no personalized ad request occurs without UMP permission; paid/ad-free users must see no ads.
- Capture an Android logcat FATAL EXCEPTION stack if the M54 still crashes, removing unrelated personal data before sharing.

## Release gate
A debug APK only verifies this application's local code path. We must sign a separate release AAB with the existing Play upload key, test a production-signed Play track, inspect Google Play Android vitals for M54, then roll out the hotfix. Version 1.1.51 debug APK predates this emergency patch.
