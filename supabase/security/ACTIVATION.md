# Production activation — September 14, 2026

Applied the reviewed private Friends/history schema and its 184-title catalogue
to the hosted project. `match_private` stays outside the exposed API schemas.
All six tables have RLS and no direct anonymous/authenticated table grants.
The public RPC wrappers use SECURITY INVOKER; the internal functions verify the
caller's `auth.uid()` with an empty search path.

Ran `tests/private-friends.rollback.sql` against production inside an explicit
transaction with an isolated catalogue. All assertions passed: anonymous RPCs
blocked, approval required, optional presence visible only to approved friends,
third accounts denied, private history isolated, both accounts' permanent
exclusions respected, strict moods, and one identical resolved result for both
participants. Rolled back all fixtures and confirmed zero test accounts remain
and the approved catalogue still contains 184 titles.

Enabled native Supabase passkeys: RP ID `matchapp.tv`, display name `MatchApp.tv`,
allowed origins `https://matchapp.tv` and `https://www.matchapp.tv`. Verified the
actual pinned Supabase JS 2.105.0 browser bundle's passkey methods and a hosted
authentication challenge with the correct RP ID. An anonymous HTTP request to
the Friends RPC is denied (401). Real enrollment and device verification require
the account owner's secure device prompt; no personal credential was enrolled
by the audit. Google/email sign-in remain available.

Optimized the existing account ownership policies without changing their
access rules, and indexed the Stripe event user foreign key. The private tables'
RLS-without-policy informational notices are intentional: clients access only
guarded RPCs. Existing guarded quota/group SECURITY DEFINER RPC warnings and the
leaked-password protection advisory are separate from this activation.
The dashboard confirms that [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
requires the Pro plan or above; the current project uses the Free plan.
The legacy [anonymous](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
and [signed-in](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
definer advisories concern existing quota/group APIs, not the new invoker RPCs.
After the policy/index fixes, performance advisors report only unused-index
information, which is expected for new indexes and empty tables.

## Release 2026.09.14.2

Added eight reviewed Roku entries to the private shared-match catalogue (192 total). Deployed verified, account-bound Stripe checkout and atomic purchase receipts. Purchased credits use one balance for matches and Ask AI, with the free allowance consumed first. Saved identity fields and the permanent lock now commit in one authenticated database transaction and restore across devices. Restrict profile INSERT columns to prevent self-issued credits or subscription flags; enforce immutable locked identity fields. Hosted checks for credit spending, immutable identity, receipt ownership and duplicate delivery all passed in transactions that fully rolled back. No payment was charged and no fixture accounts remain.
