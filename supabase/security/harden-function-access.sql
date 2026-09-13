-- Applied during the September 13 audit. Idempotent, no data deletion.
begin;
alter function public.touch_updated_at() set search_path = '';
alter function public.match_daily_limit(boolean) set search_path = '';
alter function public.profile_is_complete(public.profiles) set search_path = '';
alter function public.match_daily_limit_v2(boolean,boolean,boolean) set search_path = '';
alter function public.gen_session_code() set search_path = '';
-- Trigger helpers and expired-session cleanup are not client-facing RPCs.
revoke execute on function public.purge_expired_match_sessions(), public.rls_auto_enable(), public.handle_new_user(), public.check_banned_email_on_signup() from public, anon, authenticated;
grant execute on function public.purge_expired_match_sessions() to service_role;
commit;
