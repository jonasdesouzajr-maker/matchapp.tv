# Auth verification — 2026-11-01

The adult account runtime reuses an existing page or same-origin parent Supabase client. Concurrent session reads share the current pending read; auth events invalidate reads started for an older account/token. Completed reads are not cached. Standalone native News installs its reader in the parent document before exposing the client to Jonas. Removed conversation frames unsubscribe their account listener; persisted page-cache entries retain it.

Google OAuth checks restored session state first and ignores simultaneous requests. Existing authenticated sessions close a stale sign-in modal without opening another provider flow. Direct `?signIn=1` links also check the restored session. Native News creates its parent client with PKCE whenever the native OAuth bridge exists, matching the shared app runtime; normal browser mode remains implicit.

An early native tap still paints the panel and starts its greeting immediately. The conversation iframe waits for parent parsing and reuses the parent account client on Home, ebook and other pages loading the shared app runtime. Standalone native News waits for its parent account bootstrap. A missing or failed bootstrap reaches a retry state within ten seconds; News retries its parent SDK bootstrap, while failed shared app boot offers an explicit page retry. A page such as Explore, with no parent account runtime, may create its single client inside the conversation. No child-owned client is assigned to a parent. Closing, page navigation, disposal and page-cache restoration have explicit lifecycle checks. Retry/connection copy is authored in every supported language.

## Evidence

- `auth-tests.log`: 77 selected auth, session recovery, native News identity, Google routing, header visibility, email confirmation and token regressions passed.
- `auth-bootstrap-tests.log`: 48 focused tests passed after the final bootstrap correction, including pending Home/ebook/shared-runtime parent parsing, standalone Explore child ownership, failed parent boot with one explicit page retry, pending News bootstrap, failed SDK then successful retry, finite missing-bootstrap failure, late completion after close/navigation, disposal, page restoration, localized retry copy, and native PKCE/browser implicit selection.
- `auth-sdk-check.json`: actual pinned Supabase 2.105.0 UMD, one client across a same-origin JSDOM iframe, 20 concurrent reads, and a session read deferred after an SDK auth callback. No provider request was made.
- `tests/native-news-account.test.cjs`: the standalone News parent reader is shared/coalesced for the Jonas frame; existing sign-out/account-switch/stale-response tests pass.

Reproduce the SDK compatibility check from the repository root:

```sh
curl -fLsS https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.105.0/dist/umd/supabase.js -o /tmp/matchapp-supabase-2.105.0.js
sha256sum /tmp/matchapp-supabase-2.105.0.js
node tools/check-shared-auth-sdk-20261101.cjs /tmp/matchapp-supabase-2.105.0.js
```

Observed SHA-256: `24e8c00dc25da420ee741068b60bcdb5f62cb3598d8834058acf37ec6ee1a724`.

The SDK check uses guest storage and rejects unexpected provider requests. It does not establish real Google sign-in, signed-in tablet behavior, or resolution of the previously reported CI lock failure. Those require the actual deployment/device/CI checks.
