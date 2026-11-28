-- Restrict the legacy aggregate writer to trusted server callers.
revoke execute on function public.bump_match_activity() from public, anon, authenticated;
grant execute on function public.bump_match_activity() to service_role;

-- Preserve owner-only access while adding defense in depth.
alter table match_private.phone_auth_proofs enable row level security;
alter table match_private.tiktok_ad_share_rewards enable row level security;

-- Keep existing server grants, remove direct client grants from private records.
revoke all privileges on table public.account_deletion_requests, public.banned_emails from public, anon, authenticated;
