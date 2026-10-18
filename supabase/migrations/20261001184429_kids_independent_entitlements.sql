
alter table public.profiles
  add column if not exists kids_daily_action_count integer not null default 0,
  add column if not exists kids_daily_action_date date,
  add column if not exists kids_purchased_matches integer not null default 0,
  add column if not exists kids_credits integer not null default 0,
  add column if not exists kids_share_rewards timestamptz[] not null default '{}'::timestamptz[];

revoke update(kids_daily_action_count,kids_daily_action_date,kids_purchased_matches,kids_credits,kids_share_rewards)
  on public.profiles from anon,authenticated;

create table if not exists public.kids_match_pack_ledger(
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  delta integer not null,
  balance integer not null,
  pack text,
  stripe_event_id text unique,
  created_at timestamptz not null default now()
);
alter table public.kids_match_pack_ledger enable row level security;
revoke all on public.kids_match_pack_ledger from public,anon,authenticated;

create table if not exists public.kids_credit_ledger(
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  delta integer not null,
  balance integer not null,
  reason text not null,
  pack text,
  stripe_event_id text unique,
  created_at timestamptz not null default now()
);
alter table public.kids_credit_ledger enable row level security;
revoke all on public.kids_credit_ledger from public,anon,authenticated;

alter table match_private.billing_receipts drop constraint if exists billing_receipts_plan_check;
alter table match_private.billing_receipts
  add constraint billing_receipts_plan_check check(plan in (
    'ad_free','vip_monthly','vip_annual','business',
    'credits_25','credits_75','credits_200','credits_500',
    'matches_5','matches_25','matches_50',
    'kids_matches_5','kids_matches_25','kids_matches_50',
    'kids_credits_25','kids_credits_75','kids_credits_200'
  ));

create or replace function public.consume_kids_action(p_reason text default 'match')
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_uid uuid:=auth.uid();
  v_row public.profiles%rowtype;
  v_limit integer;
  v_used integer;
  v_complete boolean;
  v_balance integer;
begin
  if p_reason not in ('match','ask_ai') then raise exception 'Invalid Kids action'; end if;
  if v_uid is null then
    return pg_catalog.jsonb_build_object('allowed',false,'reason','not_authenticated','kids',true);
  end if;

  select * into v_row from public.profiles where id=v_uid for update;
  if not found then
    insert into public.profiles(id) values(v_uid) on conflict(id) do nothing;
    select * into v_row from public.profiles where id=v_uid for update;
  end if;

  v_used:=case when v_row.kids_daily_action_date=current_date then v_row.kids_daily_action_count else 0 end;
  v_complete:=public.profile_is_complete(v_row);
  v_limit:=public.match_daily_limit_v2(
    coalesce(v_row.is_vip,false),
    coalesce(v_row.is_business,false),
    v_complete
  );

  if v_used < v_limit then
    update public.profiles
       set kids_daily_action_count=v_used+1,
           kids_daily_action_date=current_date
     where id=v_uid;
    return pg_catalog.jsonb_build_object(
      'allowed',true,'kids',true,'reason',p_reason,'used',v_used+1,'limit',v_limit,
      'remaining',v_limit-(v_used+1),
      'kids_purchased_matches',coalesce(v_row.kids_purchased_matches,0),
      'kids_credits',coalesce(v_row.kids_credits,0),
      'profile_complete',v_complete,'is_vip',coalesce(v_row.is_vip,false),
      'is_business',coalesce(v_row.is_business,false)
    );
  end if;

  if p_reason='match' and coalesce(v_row.kids_purchased_matches,0)>0 then
    update public.profiles
       set kids_purchased_matches=kids_purchased_matches-1,
           kids_daily_action_count=v_used,
           kids_daily_action_date=current_date
     where id=v_uid returning kids_purchased_matches into v_balance;
    insert into public.kids_match_pack_ledger(user_id,delta,balance,pack)
      values(v_uid,-1,v_balance,'kids_match_use');
    return pg_catalog.jsonb_build_object(
      'allowed',true,'kids',true,'reason','match','used',v_used,'limit',v_limit,'remaining',0,
      'paid_with_kids_match_pack',true,'kids_purchased_matches',v_balance,
      'kids_credits',coalesce(v_row.kids_credits,0)
    );
  end if;

  if p_reason='ask_ai' and coalesce(v_row.kids_credits,0)>0 then
    update public.profiles
       set kids_credits=kids_credits-1,
           kids_daily_action_count=v_used,
           kids_daily_action_date=current_date
     where id=v_uid returning kids_credits into v_balance;
    insert into public.kids_credit_ledger(user_id,delta,balance,reason,pack)
      values(v_uid,-1,v_balance,'kids_ask_ai','kids_ai_use');
    return pg_catalog.jsonb_build_object(
      'allowed',true,'kids',true,'reason','ask_ai','used',v_used,'limit',v_limit,'remaining',0,
      'paid_with_kids_credit',true,'kids_credits',v_balance,
      'kids_purchased_matches',coalesce(v_row.kids_purchased_matches,0)
    );
  end if;

  return pg_catalog.jsonb_build_object(
    'allowed',false,'kids',true,'reason','limit_reached','used',v_used,'limit',v_limit,'remaining',0,
    'kids_purchased_matches',coalesce(v_row.kids_purchased_matches,0),
    'kids_credits',coalesce(v_row.kids_credits,0)
  );
end
$$;
revoke all on function public.consume_kids_action(text) from public,anon;
grant execute on function public.consume_kids_action(text) to authenticated;

create or replace function public.kids_status()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_uid uuid:=auth.uid();
  v_row public.profiles%rowtype;
  v_limit integer;
  v_used integer;
  v_complete boolean;
  v_recent timestamptz[];
  v_oldest timestamptz;
begin
  if v_uid is null then return pg_catalog.jsonb_build_object('authenticated',false,'kids',true); end if;
  select * into v_row from public.profiles where id=v_uid;
  if not found then return pg_catalog.jsonb_build_object('authenticated',false,'kids',true,'reason','no_profile'); end if;
  v_used:=case when v_row.kids_daily_action_date=current_date then v_row.kids_daily_action_count else 0 end;
  v_complete:=public.profile_is_complete(v_row);
  v_limit:=public.match_daily_limit_v2(coalesce(v_row.is_vip,false),coalesce(v_row.is_business,false),v_complete);
  select coalesce(array_agg(ts),'{}'::timestamptz[]) into v_recent
    from unnest(coalesce(v_row.kids_share_rewards,'{}'::timestamptz[])) ts
   where ts>now()-interval '6 hours';
  select min(ts) into v_oldest from unnest(v_recent) ts;
  return pg_catalog.jsonb_build_object(
    'authenticated',true,'kids',true,'used',v_used,'limit',v_limit,'remaining',greatest(0,v_limit-v_used),
    'kids_purchased_matches',coalesce(v_row.kids_purchased_matches,0),
    'kids_credits',coalesce(v_row.kids_credits,0),
    'profile_complete',v_complete,'is_vip',coalesce(v_row.is_vip,false),'is_business',coalesce(v_row.is_business,false),
    'share_rewards_left',greatest(0,3-coalesce(array_length(v_recent,1),0)),
    'reset_in_seconds',case when coalesce(array_length(v_recent,1),0)>=3
      then greatest(0,extract(epoch from(v_oldest+interval '6 hours'-now()))::int) else 0 end
  );
end
$$;
revoke all on function public.kids_status() from public,anon;
grant execute on function public.kids_status() to authenticated;

create or replace function public.kids_match_pack_balance()
returns jsonb language sql security definer set search_path=''
as $$select pg_catalog.jsonb_build_object(
  'authenticated',auth.uid() is not null,
  'matches',coalesce((select p.kids_purchased_matches from public.profiles p where p.id=auth.uid()),0)
)$$;
revoke all on function public.kids_match_pack_balance() from public,anon;
grant execute on function public.kids_match_pack_balance() to authenticated;

create or replace function public.kids_credits()
returns jsonb language sql security definer set search_path=''
as $$select pg_catalog.jsonb_build_object(
  'authenticated',auth.uid() is not null,
  'credits',coalesce((select p.kids_credits from public.profiles p where p.id=auth.uid()),0)
)$$;
revoke all on function public.kids_credits() from public,anon;
grant execute on function public.kids_credits() to authenticated;

create or replace function public.claim_kids_share_reward()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_uid uuid:=auth.uid();
  v_row public.profiles%rowtype;
  v_window interval:=interval '6 hours';
  v_max integer:=3;
  v_recent timestamptz[];
  v_oldest timestamptz;
  v_balance integer;
begin
  if v_uid is null then return pg_catalog.jsonb_build_object('granted',false,'reason','not_authenticated'); end if;
  select * into v_row from public.profiles where id=v_uid for update;
  if not found then return pg_catalog.jsonb_build_object('granted',false,'reason','no_profile'); end if;
  select coalesce(array_agg(ts),'{}'::timestamptz[]) into v_recent
    from unnest(coalesce(v_row.kids_share_rewards,'{}'::timestamptz[])) ts
   where ts>now()-v_window;
  if coalesce(array_length(v_recent,1),0)>=v_max then
    select min(ts) into v_oldest from unnest(v_recent) ts;
    update public.profiles set kids_share_rewards=v_recent where id=v_uid;
    return pg_catalog.jsonb_build_object(
      'granted',false,'reason','window_full','remaining_rewards',0,
      'kids_purchased_matches',coalesce(v_row.kids_purchased_matches,0),
      'reset_in_seconds',greatest(0,extract(epoch from(v_oldest+v_window-now()))::int)
    );
  end if;
  update public.profiles
     set kids_share_rewards=array_append(v_recent,now()),
         kids_purchased_matches=coalesce(kids_purchased_matches,0)+1
   where id=v_uid returning kids_purchased_matches into v_balance;
  insert into public.kids_match_pack_ledger(user_id,delta,balance,pack)
    values(v_uid,1,v_balance,'kids_share_reward');
  return pg_catalog.jsonb_build_object(
    'granted',true,'remaining_rewards',v_max-(coalesce(array_length(v_recent,1),0)+1),
    'kids_purchased_matches',v_balance,'matches',v_balance
  );
end
$$;
revoke all on function public.claim_kids_share_reward() from public,anon;
grant execute on function public.claim_kids_share_reward() to authenticated;

create or replace function public.fulfill_stripe_checkout(
 p_session_id text,p_user_id uuid,p_plan text,p_customer_id text default null,p_subscription_id text default null
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
 v_amount integer;
 v_match_amount integer;
 v_kids_credit_amount integer;
 v_kids_match_amount integer;
 v_balance integer;
 v_owner uuid;
begin
 if p_session_id !~ '^cs_(test_|live_)?[A-Za-z0-9]+$' or p_user_id is null then raise exception 'Invalid checkout'; end if;
 if p_plan not in (
   'ad_free','vip_monthly','vip_annual','business',
   'credits_25','credits_75','credits_200','credits_500',
   'matches_5','matches_25','matches_50',
   'kids_matches_5','kids_matches_25','kids_matches_50',
   'kids_credits_25','kids_credits_75','kids_credits_200'
 ) then raise exception 'Unknown product'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_session_id,0));
 select user_id into v_owner from match_private.billing_receipts where session_id=p_session_id;
 if found then
  if v_owner<>p_user_id then raise exception 'Checkout owner mismatch'; end if;
  return pg_catalog.jsonb_build_object('delivered',true,'duplicate',true);
 end if;
 if not exists(select 1 from auth.users where id=p_user_id) then raise exception 'Account not found'; end if;
 insert into public.profiles(id) values(p_user_id) on conflict(id) do nothing;

 v_amount:=case p_plan
   when 'credits_25' then 25 when 'credits_75' then 75 when 'credits_200' then 200 when 'credits_500' then 500 else null end;
 v_match_amount:=case p_plan
   when 'matches_5' then 5 when 'matches_25' then 25 when 'matches_50' then 50 else null end;
 v_kids_credit_amount:=case p_plan
   when 'kids_credits_25' then 25 when 'kids_credits_75' then 75 when 'kids_credits_200' then 200 else null end;
 v_kids_match_amount:=case p_plan
   when 'kids_matches_5' then 5 when 'kids_matches_25' then 25 when 'kids_matches_50' then 50 else null end;

 if v_amount is not null then
  update public.profiles set credits=coalesce(credits,0)+v_amount where id=p_user_id returning credits into v_balance;
  insert into public.credit_ledger(user_id,delta,balance,reason,pack,stripe_event_id)
   values(p_user_id,v_amount,v_balance,'purchase',p_plan,p_session_id);
 elsif v_match_amount is not null then
  update public.profiles set purchased_matches=coalesce(purchased_matches,0)+v_match_amount where id=p_user_id returning purchased_matches into v_balance;
  insert into public.match_pack_ledger(user_id,delta,balance,pack,stripe_event_id)
   values(p_user_id,v_match_amount,v_balance,p_plan,p_session_id);
 elsif v_kids_credit_amount is not null then
  update public.profiles set kids_credits=coalesce(kids_credits,0)+v_kids_credit_amount where id=p_user_id returning kids_credits into v_balance;
  insert into public.kids_credit_ledger(user_id,delta,balance,reason,pack,stripe_event_id)
   values(p_user_id,v_kids_credit_amount,v_balance,'purchase',p_plan,p_session_id);
 elsif v_kids_match_amount is not null then
  update public.profiles set kids_purchased_matches=coalesce(kids_purchased_matches,0)+v_kids_match_amount where id=p_user_id returning kids_purchased_matches into v_balance;
  insert into public.kids_match_pack_ledger(user_id,delta,balance,pack,stripe_event_id)
   values(p_user_id,v_kids_match_amount,v_balance,p_plan,p_session_id);
 elsif p_plan='ad_free' then
  update public.profiles set ad_free_purchased=true,is_ad_free=true,subscription_updated_at=now() where id=p_user_id;
 else
  if p_subscription_id is null then raise exception 'Subscription required'; end if;
  update public.profiles
     set is_vip=true,is_business=(p_plan='business'),is_ad_free=true,
         stripe_customer_id=p_customer_id,stripe_subscription_id=p_subscription_id,
         subscription_status='active',subscription_plan=p_plan,subscription_updated_at=now()
   where id=p_user_id;
 end if;

 insert into match_private.billing_receipts(session_id,user_id,plan) values(p_session_id,p_user_id,p_plan);
 return pg_catalog.jsonb_build_object(
   'delivered',true,'plan',p_plan,
   'granted',coalesce(v_amount,v_match_amount,v_kids_credit_amount,v_kids_match_amount,0),
   'balance',v_balance
 );
end
$$;
revoke all on function public.fulfill_stripe_checkout(text,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.fulfill_stripe_checkout(text,uuid,text,text,text) to service_role;
