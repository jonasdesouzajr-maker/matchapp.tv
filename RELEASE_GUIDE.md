# Publishing MatchApp releases

For a functionality change, update the version in both `build-meta.js` and `release.json` using `YYYY.MM.DD.N`, add concise user-facing release notes, and set `functional` to true. Bump changed script/style query versions in their HTML entry points. Update `sw.js`'s version when the worker changes. Run `npm ci`, `npm test`, `npm run audit:site`, and `node tools/update-sitemap.js` before publishing.

The installed PWA checks the current release at launch, on resume, when returning online, and every 15 minutes while visible. A newer release turns the install button into **Update app**. Applying an update checks that the new HTML is reachable and reloads the current route. It preserves the user's current page until they choose to update. Functionality releases show localized notes once on installed-app launch. MatchApp does not request push permission or pretend to install a native store package. Tabs running code from before this feature first need to reopen the app to receive the release checker.

## Kids artwork

`kids/kids.js` remains the child-safety allowlist. Artwork never adds or authorizes a title. Every card has a title-specific local SVG and an HTML fallback beneath its image. TMDB hydration is limited to four requests, deduplicated by title, and rejects mismatched title/type/year, explicit records and untrusted image hosts. Failed remote images return to local covers. `node tools/build-kids-covers.js` deterministically regenerates covers from the approved catalogue. Optimized versions of the supplied JPEG form the primary Kids brand; layouts and SVG covers scale for 8K displays, while raster artwork retains its source resolution.

Deploy `supabase/functions/tmdb-proxy/index.ts` with JWT verification enabled. Set **TMDB_API_KEY** to a TMDB API Read Access Token in Supabase Edge Function secrets. Missing configuration deliberately returns `{results:[], unavailable:true}` and keeps local covers visible. Never put TMDB keys or service-role secrets in the browser, repository or release metadata.

## Native passkeys

Supabase JS is pinned to 2.105.0. The shared client explicitly opts into native passkeys. Configure Authentication → Passkeys with display name **MatchApp.tv**, RP ID **matchapp.tv**, and origins **https://matchapp.tv,https://www.matchapp.tv**. The config in `supabase/config.toml` documents the same settings; committing it does not change hosted Auth settings. Do not include GitHub Pages' shared domain or legacy `.cc` origins in this relying party. Changing the RP ID invalidates enrolled credentials.

Users first sign in with an existing method and confirm their account, then add a passkey in their profile. Supabase Auth performs WebAuthn registration, challenge consumption, signature/origin/RP validation and normal session issuance. No custom credential tables, biometric storage, local PINs or client-only login flags implement authentication. The private key stays with the device/password manager. Existing sign-in methods remain available, and users can revoke registered passkeys in their profile. Device unlock requires the user's approval; browsers cannot silently authenticate with a fingerprint or Face ID after logout. Real device enrollment must be completed by the account owner.

## Audit hardening

`supabase/security/harden-function-access.sql` records the applied, idempotent access/search-path fixes. Internal housekeeping and trigger functions are denied to public/anonymous/authenticated client roles. Normal quota helpers and intentionally public code-based Match Together endpoints keep their established behavior. RLS-only tables without client policies are intentionally server-only. Supabase's leaked-password protection remains a hosted account setting; enabling it may depend on the project's plan. Review it in Authentication → Attack Protection.
