# Upload MatchApp Ai KIDS to Google Play Console

This guide is for the separate Kids Android app.

- App name: **MatchApp Ai KIDS**
- Application ID: `tv.matchapp.kids`
- Module: `:kidsapp`
- Launch surface: `https://matchapp.tv/kids/`

## Build the signed bundle

1. Open the repository's `android-studio` folder in Android Studio Quail.
2. Select the `kidsapp` module.
3. Build → Generate Signed App Bundle / APK.
4. Choose Android App Bundle.
5. Use a protected release keystore.
6. Choose the **release** variant.

The resulting bundle is generated under the `kidsapp/` build output.

## Product boundary

MatchApp Ai KIDS intentionally contains only the MatchApp Kids experience:

- Kids home and Kids title pages stay inside the app.
- The Grown-ups exit is removed from the Android shell.
- Non-Kids MatchApp routes are rejected and return to the Kids home.
- Privacy/Terms and third-party viewing destinations open externally.
- Ads are disabled in the Android shell.

## Store assets

The Android launcher uses the existing MatchApp Kids identity. Create final Play-specific 512×512 icon, feature graphic and screenshots from a real Kids build before publishing.

The old `../play/screenshots/04-kids.png` may be used as visual reference, but verify that every store image matches the final Kids build.

## Play policy / families declarations

Because this app is intentionally Kids-only, complete the current Google Play target-audience, content-rating, data-safety, advertising and Families-related declarations based on the final behavior of the release. Review the live Play Console requirements at publishing time rather than relying on old copied answers.

Privacy policy: `https://matchapp.tv/privacy.html`

## App Links

The Kids manifest claims only `/kids` paths on matchapp.tv. After the final signing certificate exists, Digital Asset Links can be updated to include `tv.matchapp.kids` and its SHA-256 fingerprint.

That website-side verification change is intentionally **not included** in this Android-only branch.
