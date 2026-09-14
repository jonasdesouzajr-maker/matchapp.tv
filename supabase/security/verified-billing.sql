-- Apply through the migration tool. Payment verification happens only in Edge Functions.
alter table public.profiles add column if not exists ad_free_purchased boolean not null default false;
revoke update(ad_free_purchased) on public.profiles from anon, authenticated;
-- Preserve existing lifetime passes, including accounts subsequently upgraded to VIP.
update public.profiles set ad_free_purchased=true where subscription_plan='ad_free';
update public.profiles p set ad_free_purchased=true where exists
 (select 1 from public.stripe_events e where e.user_id=p.id and e.plan='ad_free');

create table if not exists match_private.billing_receipts (
 session_id text primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 plan text not null check(plan in ('ad_free','vip_monthly','vip_annual','business','credits_25','credits_75','credits_200','credits_500')),
 delivered_at timestamptz not null default now()
);
create index if not exists billing_receipts_user_idx on match_private.billing_receipts(user_id);
alter table match_private.billing_receipts enable row level security;
revoke all on match_private.billing_receipts from public,anon,authenticated;

create or replace function public.fulfill_stripe_checkout(
 p_session_id text,p_user_id uuid,p_plan text,p_customer_id text default null,p_subscription_id text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_amount integer; v_balance integer; v_owner uuid;
begin
 if p_session_id !~ '^cs_(test_|live_)?[A-Za-z0-9]+$' or p_user_id is null then raise exception 'Invalid checkout'; end if;
 if p_plan not in ('ad_free','vip_monthly','vip_annual','business','credits_25','credits_75','credits_200','credits_500') then raise exception 'Unknown product'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_session_id,0));
 select user_id into v_owner from match_private.billing_receipts where session_id=p_session_id;
 if found then
  if v_owner<>p_user_id then raise exception 'Checkout owner mismatch'; end if;
  return pg_catalog.jsonb_build_object('delivered',true,'duplicate',true);
 end if;
 if not exists(select 1 from auth.users where id=p_user_id) then raise exception 'Account not found'; end if;
 insert into public.profiles(id) values(p_user_id) on conflict(id) do nothing;
 v_amount:=case p_plan when 'credits_25' then 25 when 'credits_75' then 75 when 'credits_200' then 200 when 'credits_500' then 500 else null end;
 if v_amount is not null then
  -- The session key also guards completed + asynchronous-payment deliveries.
  if not exists(select 1 from public.credit_ledger where stripe_event_id=p_session_id) then
   update public.profiles set credits=coalesce(credits,0)+v_amount where id=p_user_id returning credits into v_balance;
   insert into public.credit_ledger(user_id,delta,balance,reason,pack,stripe_event_id)
    values(p_user_id,v_amount,v_balance,'purchase',p_plan,p_session_id);
  end if;
 elsif p_plan='ad_free' then
  update public.profiles set ad_free_purchased=true,is_ad_free=true,subscription_updated_at=now() where id=p_user_id;
 else
  if p_subscription_id is null then raise exception 'Subscription required'; end if;
  update public.profiles set is_vip=true,is_business=(p_plan='business'),is_ad_free=true,
    stripe_customer_id=p_customer_id,stripe_subscription_id=p_subscription_id,
    subscription_status='active',subscription_plan=p_plan,subscription_updated_at=now() where id=p_user_id;
 end if;
 insert into match_private.billing_receipts(session_id,user_id,plan) values(p_session_id,p_user_id,p_plan);
 return pg_catalog.jsonb_build_object('delivered',true,'plan',p_plan,'granted',coalesce(v_amount,0));
end $$;
revoke all on function public.fulfill_stripe_checkout(text,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.fulfill_stripe_checkout(text,uuid,text,text,text) to service_role;

create or replace function match_private.purchase_status(p_session_id text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=(select auth.uid());v_receipt match_private.billing_receipts%rowtype;
begin
 if v_uid is null then raise exception 'Authentication required'; end if;
 select * into v_receipt from match_private.billing_receipts where session_id=p_session_id and user_id=v_uid;
 if not found then return pg_catalog.jsonb_build_object('delivered',false); end if;
 return pg_catalog.jsonb_build_object('delivered',true,'plan',v_receipt.plan,'delivered_at',v_receipt.delivered_at);
end $$;
revoke all on function match_private.purchase_status(text) from public,anon;
grant execute on function match_private.purchase_status(text) to authenticated;
create or replace function public.purchase_status(p_session_id text)
returns jsonb language sql security invoker set search_path='' as $$select match_private.purchase_status(p_session_id)$$;
revoke all on function public.purchase_status(text) from public,anon;
grant execute on function public.purchase_status(text) to authenticated;

create table if not exists match_private.billing_checkout_limits(
 user_id uuid primary key references auth.users(id) on delete cascade,
 window_at timestamptz not null,attempts integer not null
);
alter table match_private.billing_checkout_limits enable row level security;
revoke all on match_private.billing_checkout_limits from public,anon,authenticated;
create or replace function public.reserve_stripe_request(p_user_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_count integer;
begin
 insert into match_private.billing_checkout_limits as limits(user_id,window_at,attempts)
 values(p_user_id,pg_catalog.date_trunc('minute',now()),1)
 on conflict(user_id) do update set
 attempts=case when limits.window_at=excluded.window_at then limits.attempts+1 else 1 end,
 window_at=excluded.window_at returning attempts into v_count;
 return v_count<=12;
end $$;
revoke all on function public.reserve_stripe_request(uuid) from public,anon,authenticated;
grant execute on function public.reserve_stripe_request(uuid) to service_role;
