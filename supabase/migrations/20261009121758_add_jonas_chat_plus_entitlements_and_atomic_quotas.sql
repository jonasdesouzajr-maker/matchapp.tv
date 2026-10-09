-- Applied to production Supabase on 20261009121758; source-controlled for reproducibility.
-- Jonas Chat Plus: independent billing entitlement and fail-closed metering.
-- Does not alter VIP, Business, ordinary Ask AI credits, or Kids Mode.
create table if not exists public.jonas_chat_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  stripe_price_id text not null,
  status text not null default 'incomplete'
    check (status in ('trialing','active','past_due','canceled','unpaid','incomplete','incomplete_expired','paused')),
  period_start timestamptz,
  period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint jonas_chat_subscription_valid_price check (stripe_price_id = 'price_1UOci8FRuUuhrLPG5Y6g6ng0')
);
create table if not exists public.jonas_chat_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null unique,
  used_at timestamptz not null default now(),
  reserved_cost_microusd integer not null default 6000
    check (reserved_cost_microusd between 1 and 10000)
);
create index if not exists jonas_chat_usage_user_time on public.jonas_chat_usage(user_id,used_at desc);
alter table public.jonas_chat_subscriptions enable row level security;
alter table public.jonas_chat_usage enable row level security;
drop policy if exists jonas_subscription_owner_read on public.jonas_chat_subscriptions;
create policy jonas_subscription_owner_read on public.jonas_chat_subscriptions for select to authenticated
using (auth.uid() = user_id);
drop policy if exists jonas_usage_owner_read on public.jonas_chat_usage;
create policy jonas_usage_owner_read on public.jonas_chat_usage for select to authenticated
using (auth.uid() = user_id);
revoke insert,update,delete,truncate on public.jonas_chat_subscriptions from anon,authenticated;
revoke insert,update,delete,truncate on public.jonas_chat_usage from anon,authenticated;
grant select on public.jonas_chat_subscriptions to authenticated;
grant select on public.jonas_chat_usage to authenticated;

create or replace function public.jonas_set_subscription(
 p_user_id uuid,
 p_customer text,
 p_subscription text,
 p_status text,
 p_price text,
 p_period_start timestamptz,
 p_period_end timestamptz,
 p_cancel_at_period_end boolean default false,
 p_force_new boolean default false
) returns boolean language plpgsql security definer set search_path = public,pg_temp as $$
declare changed integer;
begin
 if p_user_id is null or p_subscription is null or length(p_subscription) < 5
    or p_price <> 'price_1UOci8FRuUuhrLPG5Y6g6ng0'
    or p_status not in ('active','trialing','past_due','canceled','unpaid','incomplete','incomplete_expired','paused')
    or p_period_end is null or p_period_start is null or p_period_end <= p_period_start
 then return false; end if;
 insert into public.jonas_chat_subscriptions
   (user_id,stripe_customer_id,stripe_subscription_id,stripe_price_id,status,period_start,period_end,cancel_at_period_end,updated_at)
 values(p_user_id,p_customer,p_subscription,p_price,p_status,p_period_start,p_period_end,coalesce(p_cancel_at_period_end,false),now())
 on conflict (user_id) do update set
   stripe_customer_id=excluded.stripe_customer_id,
   stripe_subscription_id=excluded.stripe_subscription_id,
   stripe_price_id=excluded.stripe_price_id,
   status=excluded.status,
   period_start=excluded.period_start,
   period_end=excluded.period_end,
   cancel_at_period_end=excluded.cancel_at_period_end,
   updated_at=now()
 where p_force_new or public.jonas_chat_subscriptions.stripe_subscription_id=excluded.stripe_subscription_id;
 get diagnostics changed = row_count;
 return changed > 0;
end $$;
revoke all on function public.jonas_set_subscription(uuid,text,text,text,text,timestamptz,timestamptz,boolean,boolean) from public,anon,authenticated;
grant execute on function public.jonas_set_subscription(uuid,text,text,text,text,timestamptz,timestamptz,boolean,boolean) to service_role;

create or replace function public.jonas_reserve_chat(
 p_user_id uuid, p_request_id uuid
) returns jsonb language plpgsql security definer set search_path = public,pg_temp as $$
declare s record; t timestamptz:=now(); n_day integer; n_week integer; n_month integer;
begin
 if p_user_id is null or p_request_id is null then return jsonb_build_object('allowed',false,'reason','invalid_request');end if;
 perform pg_advisory_xact_lock(hashtextextended('jonas_chat:'||p_user_id::text,0));
 select * into s from public.jonas_chat_subscriptions where user_id=p_user_id for update;
 if not found or s.status not in ('active','trialing')
    or s.stripe_price_id <> 'price_1UOci8FRuUuhrLPG5Y6g6ng0'
    or s.period_start is null or s.period_start > t or s.period_end is null or s.period_end <= t
 then return jsonb_build_object('allowed',false,'reason','subscription_required');end if;
 select count(*) filter (where used_at>=t-interval '24 hours'),
        count(*) filter (where used_at>=t-interval '7 days'),
        count(*) filter (where used_at>=s.period_start)
 into n_day,n_week,n_month
 from public.jonas_chat_usage
 where user_id=p_user_id and used_at>=least(t-interval '7 days',s.period_start);
 if n_day>=30 then return jsonb_build_object('allowed',false,'reason','daily_limit','remaining',0);end if;
 if n_week>=150 then return jsonb_build_object('allowed',false,'reason','weekly_limit','remaining',0);end if;
 if n_month>=450 then return jsonb_build_object('allowed',false,'reason','billing_cycle_limit','remaining',0);end if;
 -- Additional monetary reservation cap: 450 x $0.006 = $2.70 estimated maximum.
 if (n_month+1)*6000>2700000 then return jsonb_build_object('allowed',false,'reason','cost_budget');end if;
 insert into public.jonas_chat_usage(user_id,request_id,reserved_cost_microusd)
 values(p_user_id,p_request_id,6000) on conflict (request_id) do nothing;
 if not found then return jsonb_build_object('allowed',false,'reason','duplicate_request');end if;
 return jsonb_build_object('allowed',true,'remaining_today',29-n_day,'remaining_week',149-n_week,'remaining_cycle',449-n_month);
end $$;
revoke all on function public.jonas_reserve_chat(uuid,uuid) from public,anon,authenticated;
grant execute on function public.jonas_reserve_chat(uuid,uuid) to service_role;

create or replace function public.jonas_refund_chat(p_user_id uuid,p_request_id uuid)
returns boolean language sql security definer set search_path = public,pg_temp as $$
  with deleted as (delete from public.jonas_chat_usage where user_id=p_user_id and request_id=p_request_id returning id)
  select exists(select 1 from deleted);
$$;
revoke all on function public.jonas_refund_chat(uuid,uuid) from public,anon,authenticated;
grant execute on function public.jonas_refund_chat(uuid,uuid) to service_role;
