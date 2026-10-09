-- Applied to production Supabase on 20261009122126; source-controlled for reproducibility.
-- Jonas paid-chat billing, independent of existing VIP/Business profile subscriptions.
alter table public.jonas_chat_subscriptions
  drop constraint if exists jonas_chat_subscription_valid_price;
alter table public.jonas_chat_subscriptions
  add constraint jonas_chat_subscription_valid_price check (
    stripe_price_id in ('price_1UOci8FRuUuhrLPG5Y6g6ng0','price_1UOcmIFRuUuhrLPGShRDWzYn')
  );
create or replace function public.jonas_set_subscription(
 p_user_id uuid, p_customer text, p_subscription text, p_status text, p_price text,
 p_period_start timestamptz, p_period_end timestamptz, p_cancel_at_period_end boolean default false,
 p_force_new boolean default false)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare changed integer;
begin
 if p_user_id is null or p_subscription is null or length(p_subscription)<5
    or p_price not in ('price_1UOci8FRuUuhrLPG5Y6g6ng0','price_1UOcmIFRuUuhrLPGShRDWzYn')
    or p_status not in ('active','trialing','past_due','canceled','unpaid','incomplete','incomplete_expired','paused')
    or p_period_end is null or p_period_start is null or p_period_end <= p_period_start
 then return false;end if;
 insert into public.jonas_chat_subscriptions
 (user_id,stripe_customer_id,stripe_subscription_id,stripe_price_id,status,period_start,period_end,cancel_at_period_end,updated_at)
 values(p_user_id,p_customer,p_subscription,p_price,p_status,p_period_start,p_period_end,coalesce(p_cancel_at_period_end,false),now())
 on conflict(user_id) do update set
 stripe_customer_id=excluded.stripe_customer_id,stripe_subscription_id=excluded.stripe_subscription_id,
 stripe_price_id=excluded.stripe_price_id,status=excluded.status,
 period_start=excluded.period_start,period_end=excluded.period_end,
 cancel_at_period_end=excluded.cancel_at_period_end,updated_at=now()
 where p_force_new or public.jonas_chat_subscriptions.stripe_subscription_id=excluded.stripe_subscription_id;
 get diagnostics changed=row_count;
 return changed>0;
end $$;
revoke all on function public.jonas_set_subscription(uuid,text,text,text,text,timestamptz,timestamptz,boolean,boolean) from public,anon,authenticated;
grant execute on function public.jonas_set_subscription(uuid,text,text,text,text,timestamptz,timestamptz,boolean,boolean) to service_role;

create or replace function public.jonas_deliver_checkout(
 p_session_id text,p_user_id uuid,p_customer text,p_subscription text,
 p_status text,p_price text,p_period_start timestamptz,p_period_end timestamptz,
 p_cancel_at_period_end boolean default false
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare owner uuid; success boolean;
begin
 if p_session_id !~ '^cs_(test_|live_)?[A-Za-z0-9]+$'
 or p_user_id is null or p_subscription is null then
   raise exception 'Invalid checkout identity';end if;
 perform pg_advisory_xact_lock(hashtextextended('jonas_receipt:'||p_session_id,0));
 select user_id into owner from match_private.billing_receipts where session_id=p_session_id;
 if found then
  if owner<>p_user_id then raise exception 'Checkout owner mismatch';end if;
  return jsonb_build_object('delivered',true,'plan','jonas_chat_monthly','duplicate',true);
 end if;
 if not exists(select 1 from auth.users where id=p_user_id) then raise exception 'Account unavailable';end if;
 success:=public.jonas_set_subscription(
  p_user_id,p_customer,p_subscription,p_status,p_price,p_period_start,p_period_end,p_cancel_at_period_end,true);
 if not success then raise exception 'Subscription not eligible for delivery';end if;
 insert into match_private.billing_receipts(session_id,user_id,plan)
 values(p_session_id,p_user_id,'jonas_chat_monthly');
 return jsonb_build_object('delivered',true,'plan','jonas_chat_monthly');
end $$;
revoke all on function public.jonas_deliver_checkout(text,uuid,text,text,text,text,timestamptz,timestamptz,boolean) from public,anon,authenticated;
grant execute on function public.jonas_deliver_checkout(text,uuid,text,text,text,text,timestamptz,timestamptz,boolean) to service_role;
