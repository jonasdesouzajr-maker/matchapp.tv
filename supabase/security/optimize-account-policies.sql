-- Preserve account ownership rules while evaluating the caller once per query.
-- No change to policy roles, commands, permissiveness or exposed data.
begin;
alter policy "Users can manage their own match data" on public.user_matches
 using ((select auth.uid()) = id);
alter policy profiles_select_own on public.profiles
 using ((select auth.uid()) = id);
alter policy profiles_insert_own on public.profiles
 with check ((select auth.uid()) = id);
alter policy profiles_update_own on public.profiles
 using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
alter policy credit_ledger_select_own on public.credit_ledger
 using ((select auth.uid()) = user_id);
create index if not exists stripe_events_user_id_idx on public.stripe_events(user_id);
commit;
