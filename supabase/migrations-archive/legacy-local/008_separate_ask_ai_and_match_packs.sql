-- Separate Ask AI credits from purchased extra Matches.
alter table public.profiles add column if not exists purchased_matches integer not null default 0;
alter table public.profiles drop constraint if exists profiles_purchased_matches_non_negative;
alter table public.profiles add constraint profiles_purchased_matches_non_negative check (purchased_matches >= 0);
comment on column public.profiles.credits is 'Ask AI prompt credits only. One credit = one Ask AI prompt.';
comment on column public.profiles.purchased_matches is 'Non-expiring extra Matches purchased separately from Ask AI credits.';

create table if not exists public.match_pack_ledger (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 delta integer not null,
 balance integer not null,
 pack text,
 stripe_event_id text,
 created_at timestamptz not null default now()
);
create unique index if not exists match_pack_ledger_stripe_uniq on public.match_pack_ledger(stripe_event_id) where stripe_event_id is not null;
alter table public.match_pack_ledger enable row level security;
drop policy if exists match_pack_ledger_select_own on public.match_pack_ledger;
create policy match_pack_ledger_select_own on public.match_pack_ledger for select using(auth.uid()=user_id);
revoke all on public.match_pack_ledger from anon,authenticated;
grant select on public.match_pack_ledger to authenticated;

-- Ask AI credits can no longer be spent as Matches.
create or replace function public.consume_credit(p_reason text default 'ask_ai') returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_bal integer;
begin
 if v_uid is null then return jsonb_build_object('ok',false,'reason','not_authenticated'); end if;
 if p_reason<>'ask_ai' then return jsonb_build_object('ok',false,'reason','ask_ai_only'); end if;
 select credits into v_bal from public.profiles where id=v_uid for update;
 if coalesce(v_bal,0)<=0 then return jsonb_build_object('ok',false,'reason','no_credits','credits',coalesce(v_bal,0)); end if;
 update public.profiles set credits=credits-1 where id=v_uid returning credits into v_bal;
 insert into public.credit_ledger(user_id,delta,balance,reason) values(v_uid,-1,v_bal,'ask_ai');
 return jsonb_build_object('ok',true,'credits',v_bal,'reason','ask_ai');
end $$;
revoke all on function public.consume_credit(text) from public;
grant execute on function public.consume_credit(text) to authenticated;

-- Included daily Matches are used first; purchased Matches are the fallback.
create or replace function public.consume_match() returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_row public.profiles%rowtype;v_limit integer;v_used integer;v_complete boolean;v_extra integer;
begin
 if v_uid is null then return jsonb_build_object('allowed',false,'reason','not_authenticated'); end if;
 select * into v_row from public.profiles where id=v_uid for update;
 if not found then insert into public.profiles(id) values(v_uid) on conflict(id) do nothing;select * into v_row from public.profiles where id=v_uid for update;end if;
 v_used:=case when v_row.daily_match_date=current_date then v_row.daily_match_count else 0 end;
 v_complete:=public.profile_is_complete(v_row);
 v_limit:=public.match_daily_limit_v2(coalesce(v_row.is_vip,false),coalesce(v_row.is_business,false),v_complete);
 if coalesce(v_row.is_vip,false) and not coalesce(v_row.is_business,false) then
  return jsonb_build_object('allowed',true,'unlimited',true,'used',v_used,'remaining',-1,'purchased_matches',coalesce(v_row.purchased_matches,0));
 end if;
 if v_used<v_limit then
  update public.profiles set daily_match_count=v_used+1,daily_match_date=current_date where id=v_uid;
  return jsonb_build_object('allowed',true,'used',v_used+1,'limit',v_limit,'remaining',v_limit-(v_used+1),'purchased_matches',coalesce(v_row.purchased_matches,0));
 end if;
 if coalesce(v_row.purchased_matches,0)>0 then
  update public.profiles set purchased_matches=purchased_matches-1,daily_match_count=v_used,daily_match_date=current_date where id=v_uid returning purchased_matches into v_extra;
  insert into public.match_pack_ledger(user_id,delta,balance,pack) values(v_uid,-1,v_extra,'match_use');
  return jsonb_build_object('allowed',true,'used',v_used,'limit',v_limit,'remaining',0,'paid_with_match_pack',true,'purchased_matches',v_extra);
 end if;
 return jsonb_build_object('allowed',false,'reason','limit_reached','used',v_used,'limit',v_limit,'remaining',0,'purchased_matches',0);
end $$;

-- Extend verified checkout fulfillment with Matches-only products.
alter table match_private.billing_receipts drop constraint if exists billing_receipts_plan_check;
alter table match_private.billing_receipts add constraint billing_receipts_plan_check check(plan in ('ad_free','vip_monthly','vip_annual','business','credits_25','credits_75','credits_200','credits_500','matches_5','matches_25','matches_50'));

create or replace function public.fulfill_stripe_checkout(p_session_id text,p_user_id uuid,p_plan text,p_customer_id text default null,p_subscription_id text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_amount integer;v_match_amount integer;v_balance integer;v_owner uuid;
begin
 if p_session_id !~ '^cs_(test_|live_)?[A-Za-z0-9]+$' or p_user_id is null then raise exception 'Invalid checkout';end if;
 if p_plan not in ('ad_free','vip_monthly','vip_annual','business','credits_25','credits_75','credits_200','credits_500','matches_5','matches_25','matches_50') then raise exception 'Unknown product';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_session_id,0));
 select user_id into v_owner from match_private.billing_receipts where session_id=p_session_id;
 if found then if v_owner<>p_user_id then raise exception 'Checkout owner mismatch';end if;return pg_catalog.jsonb_build_object('delivered',true,'duplicate',true);end if;
 if not exists(select 1 from auth.users where id=p_user_id) then raise exception 'Account not found';end if;
 insert into public.profiles(id) values(p_user_id) on conflict(id) do nothing;
 v_amount:=case p_plan when 'credits_25' then 25 when 'credits_75' then 75 when 'credits_200' then 200 when 'credits_500' then 500 else null end;
 v_match_amount:=case p_plan when 'matches_5' then 5 when 'matches_25' then 25 when 'matches_50' then 50 else null end;
 if v_amount is not null then
  update public.profiles set credits=coalesce(credits,0)+v_amount where id=p_user_id returning credits into v_balance;
  insert into public.credit_ledger(user_id,delta,balance,reason,pack,stripe_event_id) values(p_user_id,v_amount,v_balance,'purchase',p_plan,p_session_id);
 elsif v_match_amount is not null then
  update public.profiles set purchased_matches=coalesce(purchased_matches,0)+v_match_amount where id=p_user_id returning purchased_matches into v_balance;
  insert into public.match_pack_ledger(user_id,delta,balance,pack,stripe_event_id) values(p_user_id,v_match_amount,v_balance,p_plan,p_session_id);
 elsif p_plan='ad_free' then update public.profiles set ad_free_purchased=true,is_ad_free=true,subscription_updated_at=now() where id=p_user_id;
 else
  if p_subscription_id is null then raise exception 'Subscription required';end if;
  update public.profiles set is_vip=true,is_business=(p_plan='business'),is_ad_free=true,stripe_customer_id=p_customer_id,stripe_subscription_id=p_subscription_id,subscription_status='active',subscription_plan=p_plan,subscription_updated_at=now() where id=p_user_id;
 end if;
 insert into match_private.billing_receipts(session_id,user_id,plan) values(p_session_id,p_user_id,p_plan);
 return pg_catalog.jsonb_build_object('delivered',true,'plan',p_plan,'granted',coalesce(v_amount,v_match_amount,0),'balance',v_balance);
end $$;
revoke all on function public.fulfill_stripe_checkout(text,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.fulfill_stripe_checkout(text,uuid,text,text,text) to service_role;

create or replace function public.match_pack_balance() returns jsonb language sql security definer set search_path=public as $$
 select jsonb_build_object('authenticated',auth.uid() is not null,'matches',coalesce((select purchased_matches from public.profiles where id=auth.uid()),0));
$$;
revoke all on function public.match_pack_balance() from public;
grant execute on function public.match_pack_balance() to authenticated;
