-- Read-only owner lookups need no elevated role: the existing owner RLS
-- predicates and SELECT grants already provide exactly the same access.
-- Function bodies, RPC signatures, balances and response shapes stay intact.
alter function public.match_credits() security invoker;
alter function public.match_pack_balance() security invoker;
alter function public.kids_credits() security invoker;
alter function public.kids_match_pack_balance() security invoker;
alter function public.daily_match_checkin_status() security invoker;

-- Account mutations require a verified account. Preserve authenticated and
-- service calls, including consume_ai_action's internal credit path.
grant execute on function public.consume_credit(text), public.request_account_deletion() to authenticated, service_role;
revoke execute on function public.consume_credit(text), public.request_account_deletion() from public, anon;

-- A trigger is called through its installed trigger, never as a browser RPC.
revoke execute on function public.enforce_verified_phone_sms_consent() from public, anon, authenticated;
grant execute on function public.enforce_verified_phone_sms_consent() to service_role;

-- Evaluate the session identity once per statement. Roles, commands and row
-- ownership are unchanged; no account data or policy is removed.
alter policy "users read own checkin" on public.daily_match_checkins using ((select auth.uid()) = user_id);
alter policy jonas_subscription_owner_read on public.jonas_chat_subscriptions using ((select auth.uid()) = user_id);
alter policy jonas_usage_owner_read on public.jonas_chat_usage using ((select auth.uid()) = user_id);
alter policy match_pack_ledger_select_own on public.match_pack_ledger using ((select auth.uid()) = user_id);
alter policy user_activity_history_select_own on public.user_activity_history using ((select auth.uid()) = user_id);
alter policy user_preference_history_select_own on public.user_preference_history using ((select auth.uid()) = user_id);
alter policy user_taste_own on public.user_taste using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Cover the three foreign-key lookup paths identified by production advisors.
create index if not exists classic_session_members_user_id_idx on match_private.classic_session_members(user_id);
create index if not exists growth_invites_guest_id_idx on match_private.growth_invites(guest_id);
create index if not exists reward_transactions_user_id_idx on matchapp_private.reward_transactions(user_id);
