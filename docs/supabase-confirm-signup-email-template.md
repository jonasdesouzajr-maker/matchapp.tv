# Safe MatchApp confirmation email — required Supabase dashboard setting

The original Supabase "Confirm sign up" link calls the one-time `/auth/v1/verify` endpoint directly on a **GET**. Security software that pre-opens an email link can consume that token before the person opens their email. MatchApp now serves a human-click verification page at `/confirm.html` so a GET never spends the token.

**Activation:** The current connected Supabase tools cannot change hosted Auth email templates. The account owner must save the following HTML once at:

https://supabase.com/dashboard/project/zkymvqrmbabngsqblyye/auth/templates

**Subject:** `Confirm your MatchApp Ai email`

**HTML body (paste as-is):**

```html
<h2>Confirm your MatchApp Ai email</h2>
<p>Finish creating your account by pressing the button below.</p>
<p><a href="https://matchapp.tv/confirm.html?token_hash={{ .TokenHash }}&amp;type=email">Confirm my email</a></p>
<p>If you did not request a MatchApp account, ignore this email.</p>
<hr>
<h2>Confirme seu e-mail do MatchApp iA</h2>
<p>Para concluir o cadastro, clique no botão acima.</p>
```

Only change **Confirm sign up**; do not change password recovery, Google OAuth, phone OTP, or other templates.

Check **Auth > URL Configuration**:
- Site URL: `https://matchapp.tv`
- Redirect URL allow list must allow `https://matchapp.tv/` for the existing sign-up and resend calls.

After this email template is saved, request a **fresh** confirmation link from the site's Log In tab. Old links may already have been opened, invalidated by a newer request, or expired.

## Validation (real inbox required)
1. Create an isolated email/password test account with an inbox you control.
2. Confirm the email link loads `https://matchapp.tv/confirm.html?token_hash=...&type=email` and displays the **Confirm my email** button.
3. Before clicking, the token has NOT been submitted to `verifyOtp`; a scanner can fetch the page harmlessly.
4. Click once. Supabase verifies the token with `verifyOtp({token_hash, type:'email'})`, saves an authenticated session and opens the verified member's Profile Hub.
5. Confirm private profile access. Test an expired link: the page must explain the failure and the login screen must offer a resend without creating another account.

The existing `auth-confirmation.js` also accepts older Supabase implicit callback links as a fallback; the custom email template protects **new** emails against prefetch. Never bypass email confirmation or manually modify `auth.users`.
