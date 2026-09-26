# Auth launch checklist: email, phone, session and profile lock

This is the **hosted Supabase production** setup checklist for MatchApp Ai.
The client cannot make mail/SMS providers deliver faster by changing page JavaScript.
The connected Supabase management actions can inspect Auth activity but **cannot**
edit hosted Email Templates, SMTP sender configuration, Phone provider credentials,
or SMS Templates. The project owner must review and save those dashboard settings.

## Email/password: secure confirmation and deliverability

1. In [Supabase Auth Email Templates](https://supabase.com/dashboard/project/zkymvqrmbabngsqblyye/auth/templates),
   update **Confirm sign up** using the exact scanner-safe link in
   [supabase-confirm-signup-email-template.md](supabase-confirm-signup-email-template.md).
   This links to `/confirm.html`, whose GET never consumes the one-time token.
   The member deliberately confirms; the app receives a real persisted session
   and opens `/profile/profile.html?welcome=verified`.
2. In [Supabase Auth Providers](https://supabase.com/dashboard/project/zkymvqrmbabngsqblyye/auth/providers),
   keep **Email enabled** and **Confirm email enabled**. Never bypass verification.
3. In [Auth SMTP](https://supabase.com/dashboard/project/zkymvqrmbabngsqblyye/auth/smtp),
   verify a dedicated delivery service and sender, verified SPF/DKIM, and
   provider delivery logs. Successful `signUp` means Supabase accepted the
   request; it does **not** prove delivery to the recipient's inbox.
4. In [Auth URL Configuration](https://supabase.com/dashboard/project/zkymvqrmbabngsqblyye/auth/url-configuration),
   set Site URL `https://matchapp.tv`; allow the existing
   `https://matchapp.tv/` callback. A new confirmation/resend invalidates
   earlier one-time links: only the **newest** should be used.

## Phone signup/login: verified SMS, link and member identity

1. In Auth > Providers > Phone, enable Phone and configure a supported
   production SMS provider (sender identity, verified credentials, correct
   geographic destination permissions, funding, and rate limits).
2. In Auth > Templates > SMS, use a message like:

   `MatchApp Ai: your verification code is {{ .Code }}. Open https://matchapp.tv/?phoneVerify=1 and enter your phone number and this code. Never share it.`

   This URL opens MatchApp's dedicated verification step. If the original
   browser is still open, the pending number is restored for **up to 10 minutes**
   from session-only storage. On another browser/device, the person enters
   their number and selects **I already have an SMS code**, so a second
   request does not invalidate the original code. The code is deliberately
   **not** embedded in the link or put in analytics/referrer URLs.
3. Phone sign-in in Supabase supports an **SMS OTP**, not an independently
   authenticated one-click phone magic link. MatchApp creates a session only
   after Supabase verifies the OTP and `auth.getUser()` confirms both
   `phone_confirmed_at` and the same E.164 phone number.
4. New members can add their **full name** before requesting the code; this
   is sent in Supabase Auth metadata (not a client-only registration flag).
   Existing members may leave it blank. After successful verification the
   member opens the authenticated Profile Hub. Required identity fields
   (name, country, valid DOB, star sign) are saved/locked only by the
   existing server `save_locked_identity` RPC.
5. If the Phone provider is disabled or unreachable, the SMS entry must not
   pretend that a code was sent. The verification link explains unavailability.

## Safe validation without using someone else's account

- Test signup/confirmation/resend with an isolated real inbox and phone number
  you control. Record request, provider acceptance, actual delivery latency,
  confirmed session, and complete-profile transaction separately.
- Test an expired email link, malformed OTP, wrong phone, resend rate limit,
  slow SDK load, new browser SMS link, existing account without a new name,
  returning locked account, and logout/login persistence.
- In Supabase > Authentication > Users verify the test user's creation and
  `email_confirmed_at` or `phone_confirmed_at`. Once the person completes
  Save & Lock, check the **public.profiles** row for the matching Auth ID
  and `profile_locked=true`. Never fabricate records or skip OTP verification.
- Successful CI mocks validate application logic; they do not test carrier
  delivery or establish a guaranteed time to inbox. Monitor SMTP/SMS provider
  dashboards separately.
