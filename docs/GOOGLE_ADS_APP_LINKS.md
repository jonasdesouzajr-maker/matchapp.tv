# Google Ads conversion events and Android App Links (adult app only)

## Checked 26 Sep 2026

- Android application ID: `com.jonas.papercup`; do not change it or touch `:kidsapp`.
- The adult Android manifest already registers `https://matchapp.tv` (and `www`) with `android:autoVerify=true`, and the WebView forwards the exact incoming same-origin URL. All six requested URLs are thereby in scope. Android release under review **cannot** be changed retroactively.
- **Configured in source:** `.well-known/assetlinks.json` and `android-studio/play/assetlinks.json` both declare `com.jonas.papercup` and Play app-signing SHA-256 `66:EB:B2:FF:31:C6:57:42:FB:D9:9E:0D:89:0A:B2:F1:56:E4:DA:5C:19:1A:AF:67:5A:DA:4E:D5:FF:EE:74:B8`, recovered from the 25 Sep 2026 Play Console **App signing key certificate** screenshot discussion. The earlier fingerprint `BA:B0:21:1A:41:0E:7D:9C:8F:43:CC:BA:BF:C8:F7:FE:DE:76:C8:25:7B:E2:AA:35:4D:58:37:43:C3:25:E0:47` was supplied earlier with unresolved role and is **not** used for domain association.
- Confirm that the deployed website serves `https://matchapp.tv/.well-known/assetlinks.json` as `200 OK`, `application/json`, **without redirects**. Source configuration alone does not prove domain verification or install-time opening until tested with a Play-distributed build.
- Generator for future certificate changes: `PLAY_APP_SIGNING_SHA256="XX:..." node tools/prepare-android-app-links.cjs --write --confirmed-play-signing`. Never commit private keystores.
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
