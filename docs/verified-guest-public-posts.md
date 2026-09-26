# Verified adult guest sharing: public-post verification (2026-09-26)

This feature replaces **unverified "I shared" claims** for the two *guest*
bonuses across normal matching, Bookworms and Ask AI. It deliberately leaves
the signed-in member's existing \`claim_share_reward\` and the Kids app unchanged.

## What is independently checkable now

- **TikTok public video:** a guest clicks Share, obtains a unique server-issued
  code, creates a *public video* with the given caption and MatchApp URL,
  then submits the canonical public video URL. The server requests TikTok's
  official public video oEmbed metadata and matches both the exact challenge
  and the MatchApp URL in the caption. The embedded video ID must match the
  submitted canonical TikTok video ID. No need to connect private TikTok data.
- **Bluesky public post:** same one-time code and MatchApp URL. The server
  resolves the public profile to its DID using the public Bluesky API and reads
  the actual public original post from the matching author through the public
  post-thread API, verifying both the exact code and that the post was newly
  created after code issuance.
- A **single verified post** can be claimed once globally in the private
  ledger. Two total *verified* guest claims per persistent guest browser ID,
  across Watch, Bookworms and Ask AI combined; new code requests are
  rate-limited. The linked guest browser can still be reset by a user because
  an unregistered visitor has no durable identity. Do not market this as an
  undefeatable anti-fraud guarantee.

Every unverified, private, deleted, stale, duplicate, wrong-author, invalid-URL,
network-failure, or provider-denied attempt fails closed and awards **nothing**.
The code expires after 90 minutes. Official checks happen server-side in
Supabase, not based on a checkbox, copying a caption, opening a site, or a
browser's native share handoff.

## Why some social networks cannot yet qualify

- Instagram's official Instagram Login read APIs serve **Business/Creator
  accounts**, with the person's consent and Meta app approval. Private
  Instagram personal posts and Stories are not generally inspectable by an
  unrelated website. To add qualifying eligible professional posts, the
  operator must register/review an approved Meta app and securely configure a
  consent-based OAuth and media-reading flow; never store app secrets or
  social access tokens in browser code.
- TikTok **private videos**, links sent by DM, and unposted drafts cannot be
  independently verified. The public video route is different from granting
  full account access through TikTok Login.
- WhatsApp, Instagram DMs, private Facebook posts/messages, and similar
  end-to-end or private destinations provide no universal third-party receipt
  showing that this website's share was published. Do not pretend the native
  \`navigator.share\` Promise proves publication.

Users may still share to these networks outside the verified-bonus path;
their receipt is not independently verifiable and they do not receive the
*verified* guest reward.

## Setup and operational checks

The Supabase project must have:

1. Applied migration: \`supabase/security/verified-public-guest-social-proof.sql\`.
   Also apply `supabase/security/verified-guest-social-service-gateway.sql` for
   the restricted public API wrapper. Do **not** expose the whole private
   schema in Supabase Data API settings.
2. Deployed Edge Function: \`guest-social-proof\` with
   \`index.ts\` and \`verification-core.mjs\` from
   \`supabase/functions/guest-social-proof/\`. This is a guest-facing endpoint:
   \`verify_jwt=false\` is intentional because guests have no MatchApp
   account; the function enforces an origin + public anon-key request gate,
   restricts outbound requests to fixed official provider domains, and calls a restricted public wrapper executable only by `service_role`, which
   in turn invokes service-only private SQL functions. `match_private` itself
   remains unexposed to public PostgREST requests. The publishable key is NOT
   private authentication. Positive provider evidence and server claims are
   the security boundary.
3. Available standard managed secrets \`SUPABASE_URL\`,
   \`SUPABASE_SERVICE_ROLE_KEY\`, \`SUPABASE_ANON_KEY\` are provided by
   Supabase to its functions. Never add any of these keys to the repo.
4. Test a newly published public TikTok video or Bluesky post containing the
   exact freshly issued \`MAI-...\` token and \`https://matchapp.tv\`.
   Validate one successful claim, duplicate rejection, invalid URL refusal,
   wrong token refusal, expired challenge refusal and a combined two-claim
   limit. Browser/devices without a supported provider remain fail-closed.

User content is never scraped from Instagram/WhatsApp. Only public TikTok
oEmbed captions and public Bluesky post text are checked; the private table
stores pseudonymous guest ID, challenge and successful public post URL.
