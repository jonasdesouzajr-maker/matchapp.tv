# Google Ads conversion events and Android App Links (adult app only)

## Checked 26 Sep 2026

- Android application ID: `com.jonas.papercup`; do not change it or touch `:kidsapp`.
- The adult Android manifest already registers `https://matchapp.tv` (and `www`) with `android:autoVerify=true`, and the WebView forwards the exact incoming same-origin URL. All six requested URLs are thereby in scope. Android release under review **cannot** be changed retroactively.
- **BLOCKED:** `.well-known/assetlinks.json` currently has a retired package name and a placeholder fingerprint, so verified App Links cannot be claimed. The local `android-studio/play/assetlinks.json` template has the correct package but the same placeholder. Obtain the **Play app-signing certificate SHA-256** from Play Console > App integrity (NOT the upload key). Never commit a keystore or guess which certificate was provided.
- Do not copy the historical SHA-256 from `android-studio/play/RELEASE_PREFLIGHT.md` until Play Console confirms that it is the *app-signing* certificate.
- To safely replace both local files once confirmed: `PLAY_APP_SIGNING_SHA256="XX:..." node tools/prepare-android-app-links.cjs --write --confirmed-play-signing`. Review the generated files and deploy to `https://matchapp.tv/.well-known/assetlinks.json` as `200 OK`, `application/json`, with **no redirect**.
- The manifest presently also declares `www.matchapp.tv`. If it remains declared, verify that `https://www.matchapp.tv/.well-known/assetlinks.json` independently returns the correct file without redirect; otherwise remove `www` from the manifest in the **next Android release**. Android 11 and older require all declared hosts to verify.
- Verify **real Play-signed** build: `adb shell pm set-app-links --package com.jonas.papercup 0 all`; `adb shell pm verify-app-links --re-verify com.jonas.papercup`; later `adb shell pm get-app-links com.jonas.papercup`. Open each required URL from outside the app; without the app, check the website still opens.

## First-party GTM signals (not proof of Google Ads configuration)

Existing site GTM container: `GTM-M7J3NNBN`. The website now pushes `registration_completed` only after the signed-in `complete_registration` RPC succeeds, with an on-device per-user duplicate guard, and `purchase_verified` only after the signed-in Stripe-checkout status API confirms `delivered=true`, with a per-session guard. Purchases include `transaction_id` and `plan`, but **not** a made-up purchase value. These events carry no visitor emails, names or account IDs.

Still configure in GTM with Tag Assistant testing and consent gates:
1. GA4 event tags for `registration_completed` and `purchase_verified`, with matching Custom Event triggers, on adult website only. Treat `signup_intent` as an engagement event, NEVER a sale or registration conversion.
2. Mark legitimate completed registration and purchase events as **GA4 key events** if they match measurement rules; import or separately configure the correct Google Ads conversion actions to avoid double counting. Set the purchase value only from server-verified price and currency when such fields are actually exposed.
3. On consented test sessions: check Tag Assistant event delivery, GA4 DebugView/Realtime, Google Ads diagnostics and attribution after processing. Do not infer Google Ads tracking from the presence of JavaScript alone.
4. Cross-device registration deduplication may need server-side first-time-registration status; the browser guard alone is not universal. Backend/webhook or server-side purchase measurement is a separate later enhancement if exact app conversion attribution is required.

No changes here affect locked AdSense placements, Kids Mode or existing Android app version. Website JS updates load normally inside the adult Android WebView after deployment.
