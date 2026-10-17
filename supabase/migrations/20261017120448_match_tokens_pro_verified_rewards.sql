-- Additive verified Match Tokens and Pro. No activation until reviewed.
begin;
create schema if not exists matchapp_private;
revoke all on schema matchapp_private from public,anon,authenticated;
grant usage on schema matchapp_private to service_role;
alter default privileges in schema matchapp_private revoke execute on functions from public;
create table matchapp_private.monetization_config(singleton boolean primary key default true check(singleton),enabled boolean not null default false,rewards_enabled boolean not null default false,stripe_product_ids text[] not null default '{}',play_product_ids text[] not null default '{}',updated_at timestamptz not null default now());
insert into matchapp_private.monetization_config(singleton) values(true);
create table matchapp_private.token_accounts(user_id uuid primary key references public.profiles(id) on delete cascade,token_day date not null default((now() at time zone 'UTC')::date),free_used integer not null default 0 check(free_used between 0 and 3),reward_balance integer not null default 0 check(reward_balance>=0),first_request_id uuid,updated_at timestamptz not null default now());
create table matchapp_private.token_uses(request_id uuid primary key,user_id uuid not null references public.profiles(id) on delete cascade,surface text not null check(surface in('one_match','ebook')),source text not null check(source in('daily','legacy_daily','reward','purchased','first_match','pro')),token_day date not null,created_at timestamptz not null default now(),refunded_at timestamptz,refund_reason text);
create index token_uses_user_recent on matchapp_private.token_uses(user_id,created_at desc);
create table matchapp_private.pro_entitlements(provider text not null check(provider in('stripe','play')),external_id text not null check(length(external_id) between 1 and 255),user_id uuid not null references public.profiles(id) on delete cascade,product_id text not null,customer_id text,status text not null check(status in('active','trialing','past_due','canceled','expired','revoked','paused','pending','superseded')),paid boolean not null,ever_paid boolean not null default false,product_verified boolean not null default false,expires_at timestamptz,cancel_at_period_end boolean not null default false,auto_renew boolean not null default false,verified_at timestamptz not null,provider_event_at timestamptz not null,token_hash text check(token_hash is null or token_hash~'^[a-f0-9]{64}$'),created_at timestamptz not null default now(),primary key(provider,external_id),unique(provider,token_hash));
create index pro_entitlements_user on matchapp_private.pro_entitlements(user_id);
create index pro_entitlements_customer on matchapp_private.pro_entitlements(customer_id) where provider='stripe';
create table matchapp_private.play_billing_accounts(user_id uuid primary key references public.profiles(id) on delete cascade,obfuscated_id text not null unique check(obfuscated_id~'^[a-f0-9]{64}$'),created_at timestamptz not null default now());
create table matchapp_private.play_billing_limits(user_id uuid primary key references public.profiles(id) on delete cascade,window_at timestamptz not null,attempts integer not null check(attempts>0));
create table matchapp_private.pro_billing_limits(user_id uuid primary key references public.profiles(id) on delete cascade,window_at timestamptz not null,attempts integer not null check(attempts>0));
create table matchapp_private.pro_checkout_intents(user_id uuid primary key references public.profiles(id) on delete cascade,request_id uuid not null unique default gen_random_uuid(),price_id text not null,lang text not null,expires_at timestamptz not null,customer_id text,created_at timestamptz not null default now());

create function public.get_matchapp_monetization_config() returns jsonb language sql security definer set search_path='' as $$
select jsonb_build_object('ok',true,'enabled',enabled,'rewards_enabled',rewards_enabled,'stripe_product_ids',stripe_product_ids,'play_product_ids',play_product_ids,'policy_version','match-tokens-v1') from matchapp_private.monetization_config where singleton;
$$;
create function public.set_matchapp_monetization_config(p_enabled boolean,p_rewards_enabled boolean,p_stripe_product_ids text[],p_play_product_ids text[]) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if p_enabled is null or p_rewards_enabled is null or p_stripe_product_ids is null or p_play_product_ids is null or cardinality(p_stripe_product_ids)>30 or cardinality(p_play_product_ids)>30 or exists(select 1 from unnest(p_stripe_product_ids) v where v is null or v!~'^prod_[A-Za-z0-9]+$') or exists(select 1 from unnest(p_play_product_ids) v where v is null or v!~'^[a-z0-9][a-z0-9._]{0,99}$') then raise exception 'Invalid monetization configuration' using errcode='22023'; end if;
 update matchapp_private.monetization_config set enabled=p_enabled,rewards_enabled=p_rewards_enabled,stripe_product_ids=p_stripe_product_ids,play_product_ids=p_play_product_ids,updated_at=now() where singleton;
 return public.get_matchapp_monetization_config();
end; $$;
create function matchapp_private.pro_state(p_user_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_expiry timestamptz;v_legacy boolean:=false;
begin
 select max(expires_at) into v_expiry from matchapp_private.pro_entitlements where user_id=p_user_id and product_verified and paid and status in('active','canceled') and expires_at>now();
 select coalesce(is_vip,false) or coalesce(is_business,false) or coalesce(is_ad_free,false) or coalesce(ad_free_purchased,false) into v_legacy from public.profiles where id=p_user_id;
 return jsonb_build_object('active',v_expiry is not null,'expiresAt',case when v_expiry is not null then floor(extract(epoch from v_expiry)*1000)::bigint else null end,'adFree',v_expiry is not null or coalesce(v_legacy,false));
end; $$;
create function public.pro_status() returns jsonb language sql stable security definer set search_path='' as $$select matchapp_private.pro_state(auth.uid());$$;
create function public.get_pro_billing_state(p_user_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
select jsonb_build_object('ok',true,'entitlements',coalesce((select jsonb_agg(to_jsonb(e) order by verified_at desc) from matchapp_private.pro_entitlements e where user_id=p_user_id),'[]'::jsonb),'pro',matchapp_private.pro_state(p_user_id),'adFree',matchapp_private.pro_state(p_user_id)->'adFree');$$;
create function public.get_pro_entitlement_by_external_id(p_provider text,p_external_id text) returns jsonb language sql stable security definer set search_path='' as $$select to_jsonb(e) from matchapp_private.pro_entitlements e where provider=p_provider and external_id=p_external_id;$$;
create function public.get_pro_entitlements_by_customer(p_customer_id text) returns jsonb language sql stable security definer set search_path='' as $$select coalesce(jsonb_agg(to_jsonb(e)),'[]'::jsonb) from matchapp_private.pro_entitlements e where provider='stripe' and customer_id=p_customer_id;$$;
create function public.upsert_pro_entitlement(p_user_id uuid,p_provider text,p_external_id text,p_product_id text,p_status text,p_paid boolean,p_expires_at timestamptz,p_verified_at timestamptz,p_provider_event_at timestamptz,p_customer_id text default null,p_cancel_at_period_end boolean default false,p_auto_renew boolean default false,p_token_hash text default null,p_replaces_external_id text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_old matchapp_private.pro_entitlements%rowtype;v_replaced matchapp_private.pro_entitlements%rowtype;v_allowed boolean;v_found boolean;
begin
 if p_user_id is null or p_provider is null or p_provider not in('stripe','play') or p_external_id is null or length(p_external_id) not between 1 and 255 or p_product_id is null or p_paid is null or p_verified_at is null or p_provider_event_at is null or p_verified_at>now()+interval '5 minutes' or p_provider_event_at>now()+interval '5 minutes' or p_status is null or p_status not in('active','trialing','past_due','canceled','expired','revoked','paused','pending','superseded') or p_cancel_at_period_end is null or p_auto_renew is null then raise exception 'Invalid verified entitlement' using errcode='22023';end if;
 if (p_provider='play' and(p_token_hash is null or p_token_hash!~'^[a-f0-9]{64}$' or p_external_id<>p_token_hash)) or(p_provider='stripe' and p_token_hash is not null) then raise exception 'Invalid purchase binding' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('pro-user:'||p_user_id::text,0));
 perform pg_advisory_xact_lock(hashtextextended('pro:'||p_provider||':'||p_external_id,0));
 select * into v_old from matchapp_private.pro_entitlements where provider=p_provider and external_id=p_external_id for update;v_found:=found;
 if v_found and v_old.user_id<>p_user_id then return jsonb_build_object('ok',false,'applied',false,'reason','ownership_conflict','active',false);end if;
 if v_found and p_customer_id is not null and v_old.customer_id is not null and p_customer_id<>v_old.customer_id then return jsonb_build_object('ok',false,'applied',false,'reason','customer_conflict','active',false);end if;
 if v_found and v_old.status='superseded' then return jsonb_build_object('ok',true,'applied',false,'reason','superseded_purchase','active',matchapp_private.pro_state(p_user_id)->'active');end if;
 if v_found and(p_provider_event_at<v_old.provider_event_at or(p_provider_event_at=v_old.provider_event_at and p_verified_at<=v_old.verified_at)) then return jsonb_build_object('ok',true,'applied',false,'reason','stale_or_duplicate','active',matchapp_private.pro_state(p_user_id)->'active');end if;
 select case when p_provider='stripe' then p_product_id=any(stripe_product_ids) else p_product_id=any(play_product_ids) end into v_allowed from matchapp_private.monetization_config where singleton;
 v_allowed:=coalesce(v_allowed,false) or(v_found and v_old.product_verified and v_old.product_id=p_product_id);
 if not v_allowed then return jsonb_build_object('ok',false,'applied',false,'reason','product_not_allowed','active',false);end if;
 if p_replaces_external_id is not null then
  if p_provider<>'play' or p_replaces_external_id=p_external_id then raise exception 'Invalid linked purchase' using errcode='22023';end if;
  select * into v_replaced from matchapp_private.pro_entitlements where provider='play' and external_id=p_replaces_external_id;
  if found and(v_replaced.user_id<>p_user_id or v_replaced.provider_event_at>p_provider_event_at) then return jsonb_build_object('ok',false,'applied',false,'reason','linked_purchase_conflict','active',false);end if;
 end if;
 insert into matchapp_private.pro_entitlements(provider,external_id,user_id,product_id,customer_id,status,paid,ever_paid,product_verified,expires_at,cancel_at_period_end,auto_renew,verified_at,provider_event_at,token_hash)
 values(p_provider,p_external_id,p_user_id,p_product_id,p_customer_id,p_status,p_paid,p_paid,true,p_expires_at,p_cancel_at_period_end,p_auto_renew,p_verified_at,p_provider_event_at,p_token_hash)
 on conflict(provider,external_id) do update set product_id=excluded.product_id,customer_id=coalesce(excluded.customer_id,matchapp_private.pro_entitlements.customer_id),status=excluded.status,paid=excluded.paid,ever_paid=matchapp_private.pro_entitlements.ever_paid or excluded.paid,product_verified=true,expires_at=excluded.expires_at,cancel_at_period_end=excluded.cancel_at_period_end,auto_renew=excluded.auto_renew,verified_at=excluded.verified_at,provider_event_at=excluded.provider_event_at,token_hash=coalesce(excluded.token_hash,matchapp_private.pro_entitlements.token_hash);
 if p_replaces_external_id is not null then update matchapp_private.pro_entitlements set status='superseded',auto_renew=false,provider_event_at=p_provider_event_at,verified_at=p_verified_at where provider='play' and external_id=p_replaces_external_id and user_id=p_user_id;end if;
 return jsonb_build_object('ok',true,'applied',true,'reason','verified','active',matchapp_private.pro_state(p_user_id)->'active');
end; $$;

create function matchapp_private.token_wallet(p_user_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare c matchapp_private.monetization_config%rowtype;p public.profiles%rowtype;a matchapp_private.token_accounts%rowtype;v_pro jsonb;v_limit int;v_used int;v_daily int;v_bonus int;v_purchased int;v_unlimited boolean;v_first boolean;v_day date:=(now() at time zone 'UTC')::date;
begin
 select * into c from matchapp_private.monetization_config where singleton;
 if p_user_id is null then return jsonb_build_object('ok',true,'authenticated',false,'enabled',c.enabled,'policy_version','match-tokens-v1');end if;
 select * into p from public.profiles where id=p_user_id;
 if not found then return jsonb_build_object('ok',false,'authenticated',true,'enabled',false,'policy_version','match-tokens-v1','reason','no_profile');end if;
 select * into a from matchapp_private.token_accounts where user_id=p_user_id;
 v_pro:=matchapp_private.pro_state(p_user_id);v_unlimited:=(v_pro->>'active')::boolean;
 v_limit:=case when coalesce(p.is_business,false) then 50 when coalesce(p.is_vip,false) then 10 else 3 end;
 v_used:=case when v_limit>3 then case when p.daily_match_date=v_day then coalesce(p.daily_match_count,0) else 0 end else case when a.token_day=v_day then coalesce(a.free_used,0) else 0 end end;
 v_daily:=greatest(0,v_limit-v_used);v_bonus:=coalesce(a.reward_balance,0);v_purchased:=coalesce(p.purchased_matches,0);v_first:=a.first_request_id is null;
 return jsonb_build_object('ok',true,'authenticated',true,'enabled',c.enabled or v_unlimited,'policy_version','match-tokens-v1','daily_limit',v_limit,'daily_remaining',v_daily,'bonus_tokens',v_bonus,'purchased_matches',v_purchased,'remaining',v_daily+v_bonus,'available_total',case when v_unlimited then null else v_daily+v_bonus+v_purchased end,'unlimited',v_unlimited,'first_match_pending',v_first,'next_reset_at',((v_day+1)::timestamp at time zone 'UTC'),'ad_free',v_pro->'adFree','pro_active',v_unlimited,'pro',v_pro,'is_vip',coalesce(p.is_vip,false),'is_business',coalesce(p.is_business,false),'credits',coalesce(p.credits,0),'limit',v_limit,'used',v_used,'rewarded_available',c.enabled and c.rewards_enabled and not v_unlimited and not v_first and v_daily+v_bonus+v_purchased=0);
end; $$;
create function public.match_token_status() returns jsonb language sql stable security definer set search_path='' as $$select matchapp_private.token_wallet(auth.uid());$$;
create function public.consume_match_token(p_request_id uuid,p_surface text default 'one_match') returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();p public.profiles%rowtype;a matchapp_private.token_accounts%rowtype;u matchapp_private.token_uses%rowtype;v_source text;v_day date:=(now() at time zone 'UTC')::date;v_used int;v_limit int;v_balance int;
begin
 if v_uid is null then return jsonb_build_object('ok',false,'allowed',false,'reason','not_authenticated');end if;
 if p_request_id is null or p_surface is null or p_surface not in('one_match','ebook') then raise exception 'Invalid match request' using errcode='22023';end if;
 if not(select enabled from matchapp_private.monetization_config where singleton) and not(matchapp_private.pro_state(v_uid)->>'active')::boolean then return matchapp_private.token_wallet(v_uid)||jsonb_build_object('allowed',false,'reason','policy_disabled','consumed',false);end if;
 select * into p from public.profiles where id=v_uid for update;
 if not found then return jsonb_build_object('ok',false,'allowed',false,'reason','no_profile');end if;
 insert into matchapp_private.token_accounts(user_id) values(v_uid) on conflict(user_id) do nothing;
 select * into a from matchapp_private.token_accounts where user_id=v_uid for update;
 select * into u from matchapp_private.token_uses where request_id=p_request_id;
 if found then
  if u.user_id<>v_uid or u.surface<>p_surface then return jsonb_build_object('ok',false,'allowed',false,'reason','request_conflict');end if;
  return matchapp_private.token_wallet(v_uid)||jsonb_build_object('allowed',u.refunded_at is null,'request_id',p_request_id,'consumed',u.refunded_at is null and u.source not in('pro','first_match'),'source',u.source,'reason',case when u.refunded_at is null then 'idempotent_replay' else 'refunded' end);
 end if;
 if a.token_day<>v_day then update matchapp_private.token_accounts set token_day=v_day,free_used=0 where user_id=v_uid;a.token_day:=v_day;a.free_used:=0;end if;
 v_limit:=case when coalesce(p.is_business,false) then 50 when coalesce(p.is_vip,false) then 10 else 3 end;
 v_used:=case when p.daily_match_date=v_day then coalesce(p.daily_match_count,0) else 0 end;
 if(matchapp_private.pro_state(v_uid)->>'active')::boolean then v_source:='pro';
 elsif v_limit>3 and v_used<v_limit then update public.profiles set daily_match_count=v_used+1,daily_match_date=v_day where id=v_uid;v_source:='legacy_daily';
 elsif v_limit=3 and a.free_used<3 then update matchapp_private.token_accounts set free_used=free_used+1 where user_id=v_uid;v_source:='daily';
 elsif p_surface='one_match' and a.first_request_id is null then v_source:='first_match';
 elsif a.reward_balance>0 then update matchapp_private.token_accounts set reward_balance=reward_balance-1 where user_id=v_uid;v_source:='reward';
 elsif coalesce(p.purchased_matches,0)>0 then update public.profiles set purchased_matches=purchased_matches-1 where id=v_uid returning purchased_matches into v_balance;insert into public.match_pack_ledger(user_id,delta,balance,pack) values(v_uid,-1,v_balance,'match_token_use');v_source:='purchased';
 else return matchapp_private.token_wallet(v_uid)||jsonb_build_object('allowed',false,'request_id',p_request_id,'consumed',false,'reason','limit_reached');end if;
 insert into matchapp_private.token_uses(request_id,user_id,surface,source,token_day) values(p_request_id,v_uid,p_surface,v_source,v_day);
 update matchapp_private.token_accounts set updated_at=now(),first_request_id=case when p_surface='one_match' then coalesce(first_request_id,p_request_id) else first_request_id end where user_id=v_uid;
 return matchapp_private.token_wallet(v_uid)||jsonb_build_object('allowed',true,'request_id',p_request_id,'consumed',v_source not in('pro','first_match'),'source',v_source,'reason','accepted');
end; $$;
-- Service-only reversal of an exact documented failure; never a browser-minted refund.
create function public.refund_match_token(p_request_id uuid,p_reason text default 'verified_failure') returns jsonb language plpgsql security definer set search_path='' as $$
declare u matchapp_private.token_uses%rowtype;v_balance int;
begin
 select * into u from matchapp_private.token_uses where request_id=p_request_id;
 if not found then return jsonb_build_object('ok',false,'reason','not_found');end if;
 perform 1 from public.profiles where id=u.user_id for update;perform 1 from matchapp_private.token_accounts where user_id=u.user_id for update;
 select * into u from matchapp_private.token_uses where request_id=p_request_id for update;
 if u.refunded_at is not null then return jsonb_build_object('ok',true,'refunded',false,'reason','already_refunded');end if;
 if u.source='daily' then update matchapp_private.token_accounts set free_used=greatest(0,free_used-1) where user_id=u.user_id and token_day=u.token_day;
 elsif u.source='legacy_daily' then update public.profiles set daily_match_count=greatest(0,daily_match_count-1) where id=u.user_id and daily_match_date=u.token_day;
 elsif u.source='reward' then update matchapp_private.token_accounts set reward_balance=reward_balance+1 where user_id=u.user_id;
 elsif u.source='purchased' then update public.profiles set purchased_matches=purchased_matches+1 where id=u.user_id returning purchased_matches into v_balance;insert into public.match_pack_ledger(user_id,delta,balance,pack) values(u.user_id,1,v_balance,'match_token_refund');end if;
 update matchapp_private.token_uses set refunded_at=now(),refund_reason=left(coalesce(p_reason,'verified_failure'),240) where request_id=p_request_id;
 update matchapp_private.token_accounts set first_request_id=(select request_id from matchapp_private.token_uses where user_id=u.user_id and surface='one_match' and refunded_at is null order by created_at,request_id limit 1),updated_at=now() where user_id=u.user_id;
 return jsonb_build_object('ok',true,'refunded',true,'wallet',matchapp_private.token_wallet(u.user_id));
end; $$;
create function public.bind_play_billing_account(p_user_id uuid,p_obfuscated_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_id text;
begin
 if p_user_id is null or p_obfuscated_id is null or p_obfuscated_id!~'^[a-f0-9]{64}$' then raise exception 'Invalid Play account binding' using errcode='22023';end if;
 insert into matchapp_private.play_billing_accounts(user_id,obfuscated_id) values(p_user_id,p_obfuscated_id) on conflict(user_id) do nothing;
 select obfuscated_id into v_id from matchapp_private.play_billing_accounts where user_id=p_user_id;
 return jsonb_build_object('ok',v_id=p_obfuscated_id);
exception when unique_violation then return jsonb_build_object('ok',false,'reason','ownership_conflict');
end; $$;
create function public.get_play_billing_account_user(p_obfuscated_id text) returns uuid language sql stable security definer set search_path='' as $$select user_id from matchapp_private.play_billing_accounts where obfuscated_id=p_obfuscated_id;$$;
create function public.reserve_play_billing_request(p_user_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare v_count int;begin
 insert into matchapp_private.play_billing_limits as limits(user_id,window_at,attempts) values(p_user_id,date_trunc('minute',now()),1) on conflict(user_id) do update set attempts=case when limits.window_at=excluded.window_at then limits.attempts+1 else 1 end,window_at=excluded.window_at returning attempts into v_count;
 return v_count<=12;end; $$;
create function public.reserve_pro_billing_request(p_user_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare v_count int;begin
 insert into matchapp_private.pro_billing_limits as limits(user_id,window_at,attempts) values(p_user_id,date_trunc('minute',now()),1) on conflict(user_id) do update set attempts=case when limits.window_at=excluded.window_at then limits.attempts+1 else 1 end,window_at=excluded.window_at returning attempts into v_count;
 return v_count<=30;end; $$;
create function public.reserve_pro_checkout(p_user_id uuid,p_price_id text,p_lang text) returns jsonb language plpgsql security definer set search_path='' as $$
declare r matchapp_private.pro_checkout_intents%rowtype;v_customer text;
begin
 if p_user_id is null or p_price_id is null or p_price_id not in('price_1URUdyFRuUuhrLPGFwrc0mQU','price_1URUC4FRuUuhrLPGx0fDzrR3','price_1URUeEFRuUuhrLPGW53PptBI','price_1URUeGFRuUuhrLPGH2XmPgS1','price_1URUeHFRuUuhrLPGc53m45uV') or p_lang is null or p_lang not in('en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh') then raise exception 'Invalid Pro checkout' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('pro-checkout:'||p_user_id::text,0));
 select * into r from matchapp_private.pro_checkout_intents where user_id=p_user_id for update;
 if found and r.expires_at>now() then return jsonb_build_object('ok',true,'request_id',r.request_id,'price_id',r.price_id,'lang',r.lang,'expires_at',r.expires_at,'customer_id',r.customer_id);end if;
 if not(select enabled from matchapp_private.monetization_config where singleton) then return jsonb_build_object('ok',false,'reason','policy_disabled');end if;
 v_customer:=r.customer_id;
 if v_customer is null then select customer_id into v_customer from matchapp_private.pro_entitlements where user_id=p_user_id and provider='stripe' and customer_id is not null order by verified_at desc limit 1;end if;
 insert into matchapp_private.pro_checkout_intents(user_id,price_id,lang,expires_at,customer_id) values(p_user_id,p_price_id,p_lang,now()+interval '31 minutes',v_customer)
 on conflict(user_id) do update set request_id=gen_random_uuid(),price_id=excluded.price_id,lang=excluded.lang,expires_at=excluded.expires_at,customer_id=coalesce(matchapp_private.pro_checkout_intents.customer_id,excluded.customer_id),created_at=now() returning * into r;
 return jsonb_build_object('ok',true,'request_id',r.request_id,'price_id',r.price_id,'lang',r.lang,'expires_at',r.expires_at,'customer_id',r.customer_id);
end; $$;
create function public.bind_pro_checkout_customer(p_user_id uuid,p_request_id uuid,p_customer_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_count int;begin
 if p_customer_id is null or p_customer_id!~'^cus_[A-Za-z0-9]+$' then raise exception 'Invalid customer' using errcode='22023';end if;
 update matchapp_private.pro_checkout_intents set customer_id=p_customer_id where user_id=p_user_id and request_id=p_request_id and(customer_id is null or customer_id=p_customer_id);
 get diagnostics v_count=row_count;return jsonb_build_object('ok',v_count=1);
end; $$;


-- A claim is a server-issued, account-bound promise. Only signed SSV fulfills it.
create table matchapp_private.reward_claims(
 claim_nonce text primary key check(claim_nonce~'^[a-f0-9]{64}$'),
 request_id uuid not null unique,user_id uuid not null references public.profiles(id) on delete cascade,
 surface text not null check(surface in('one_match','ebook')),
 ad_unit text not null default 'ca-app-pub-9541435081010948/2802190985',
 reward_amount int not null default 3 check(reward_amount=3),reward_item text not null default 'Match Tokens',
 status text not null default 'created' check(status in('created','prepared','credited','cancelled','expired')),
 created_at timestamptz not null default now(),expires_at timestamptz not null,
 prepared_at timestamptz,cancelled_at timestamptz,credited_at timestamptz,transaction_id text unique
);
create index reward_claims_user_recent on matchapp_private.reward_claims(user_id,created_at desc);
create table matchapp_private.reward_transactions(
 transaction_id text primary key check(transaction_id~'^[a-f0-9]+$' and length(transaction_id) between 16 and 256),
 claim_nonce text not null unique references matchapp_private.reward_claims(claim_nonce),
 user_id uuid not null references public.profiles(id) on delete cascade,
 ad_unit text not null,reward_amount int not null check(reward_amount=3),reward_item text not null,
 event_at timestamptz not null,balance_after int not null,credited_at timestamptz not null default now()
);
create table matchapp_private.reward_session_limits(user_id uuid primary key references public.profiles(id) on delete cascade,window_at timestamptz not null,attempts integer not null check(attempts>0));
create function public.reward_session_service(p_action text,p_user_id uuid,p_request_id uuid default null,p_claim_nonce text default null,p_surface text default 'one_match') returns jsonb language plpgsql security definer set search_path='' as $$
declare r matchapp_private.reward_claims%rowtype;v_wallet jsonb;v_count int;v_status text;
begin
 if p_user_id is null or p_action is null or p_action not in('wallet','create','native_validate','status','cancel') then return jsonb_build_object('ok',false,'reason','invalid_request');end if;
 if not exists(select 1 from public.profiles where id=p_user_id) then return jsonb_build_object('ok',false,'reason','no_profile');end if;
 insert into matchapp_private.reward_session_limits as limits(user_id,window_at,attempts) values(p_user_id,date_trunc('minute',now()),1) on conflict(user_id) do update set attempts=case when limits.window_at=excluded.window_at then limits.attempts+1 else 1 end,window_at=excluded.window_at returning attempts into v_count;
 if v_count>60 then return jsonb_build_object('ok',false,'reason','rate_limited');end if;
 if p_action='wallet' then return matchapp_private.token_wallet(p_user_id);end if;
 if p_claim_nonce is null or p_claim_nonce!~'^[a-f0-9]{64}$' then return jsonb_build_object('ok',false,'reason','invalid_claim');end if;
 -- Same lock order as consumption/refunds prevents balance races.
 perform 1 from public.profiles where id=p_user_id for update;
 perform 1 from matchapp_private.token_accounts where user_id=p_user_id for update;
 v_wallet:=matchapp_private.token_wallet(p_user_id);
 if p_action='create' then
  if p_request_id is null or p_surface is null or p_surface not in('one_match','ebook') then return jsonb_build_object('ok',false,'reason','invalid_request');end if;
  select * into r from matchapp_private.reward_claims where request_id=p_request_id;
  if found then
   if r.user_id<>p_user_id or r.surface<>p_surface then return jsonb_build_object('ok',false,'reason','request_conflict');end if;
   return jsonb_build_object('ok',true,'claimNonce',r.claim_nonce,'expiresAt',floor(extract(epoch from r.expires_at)*1000)::bigint,'adUnitId',r.ad_unit,'rewardAmount',r.reward_amount,'rewardItem',r.reward_item,'wallet',v_wallet);
  end if;
  if not coalesce((v_wallet->>'rewarded_available')::boolean,false) then return jsonb_build_object('ok',false,'reason','reward_unavailable','wallet',v_wallet);end if;
  update matchapp_private.reward_claims set status='expired' where user_id=p_user_id and status in('created','prepared') and expires_at<=now();
  -- Recover an owned promise after a lost create response or page reload.
  -- Returning it does not authorize a second preparation or another reward.
  select * into r from matchapp_private.reward_claims where user_id=p_user_id and status in('created','prepared') and expires_at>now() order by created_at desc limit 1 for update;
  if found then return jsonb_build_object('ok',true,'claimNonce',r.claim_nonce,'expiresAt',floor(extract(epoch from r.expires_at)*1000)::bigint,'adUnitId',r.ad_unit,'rewardAmount',r.reward_amount,'rewardItem',r.reward_item,'wallet',v_wallet);end if;
  insert into matchapp_private.reward_claims(claim_nonce,request_id,user_id,surface,expires_at) values(p_claim_nonce,p_request_id,p_user_id,p_surface,now()+interval '15 minutes') returning * into r;
  return jsonb_build_object('ok',true,'claimNonce',r.claim_nonce,'expiresAt',floor(extract(epoch from r.expires_at)*1000)::bigint,'adUnitId',r.ad_unit,'rewardAmount',r.reward_amount,'rewardItem',r.reward_item,'wallet',v_wallet);
 end if;
 select * into r from matchapp_private.reward_claims where claim_nonce=p_claim_nonce and user_id=p_user_id for update;
 if not found then return jsonb_build_object('ok',false,'reason','claim_not_found');end if;
 if p_action='native_validate' then
  if r.expires_at<=now() then return jsonb_build_object('ok',false,'reason','claim_expired');end if;
  if r.status<>'created' then return jsonb_build_object('ok',false,'reason','claim_already_prepared');end if;
  if not coalesce((v_wallet->>'rewarded_available')::boolean,false) then return jsonb_build_object('ok',false,'reason','reward_unavailable');end if;
  update matchapp_private.reward_claims set status='prepared',prepared_at=now() where claim_nonce=r.claim_nonce;
  return jsonb_build_object('ok',true,'claimNonce',r.claim_nonce,'userId',r.user_id,'expiresAt',floor(extract(epoch from r.expires_at)*1000)::bigint,'adUnitId',r.ad_unit,'rewardAmount',r.reward_amount);
 end if;
 if p_action='cancel' and r.status in('created','prepared') then
  update matchapp_private.reward_claims set status='cancelled',cancelled_at=now() where claim_nonce=r.claim_nonce;r.status:='cancelled';
 end if;
 v_status:=case when r.status in('created','prepared') and r.expires_at<=now() then 'expired' else r.status end;
 return jsonb_build_object('ok',true,'claimNonce',r.claim_nonce,'status',v_status,'credited',r.status='credited','wallet',v_wallet);
end; $$;
-- Edge validates Google's raw-query signature first. This service-only function
-- then atomically checks every stored promise and global transaction identity.
create function public.credit_match_reward(p_claim_nonce text,p_user_id uuid,p_transaction_id text,p_ad_unit text,p_reward_amount int,p_reward_item text,p_event_at timestamptz) returns jsonb language plpgsql security definer set search_path='' as $$
declare r matchapp_private.reward_claims%rowtype;t matchapp_private.reward_transactions%rowtype;v_balance int;
begin
 if p_claim_nonce is null or p_claim_nonce!~'^[a-f0-9]{64}$' or p_user_id is null or p_transaction_id is null or (p_transaction_id!~'^[a-f0-9]+$' or length(p_transaction_id) not between 16 and 256) or p_ad_unit is distinct from 'ca-app-pub-9541435081010948/2802190985' or p_reward_amount is distinct from 3 or p_reward_item is distinct from 'Match Tokens' or p_event_at is null then return jsonb_build_object('ok',false,'reason','invalid_reward');end if;
 perform pg_advisory_xact_lock(hashtextextended('ssv:'||p_transaction_id,0));
 select * into t from matchapp_private.reward_transactions where transaction_id=p_transaction_id;
 if found then
  if t.claim_nonce<>p_claim_nonce or t.user_id<>p_user_id or t.ad_unit<>p_ad_unit or t.reward_amount<>p_reward_amount or t.reward_item<>p_reward_item or t.event_at<>p_event_at then return jsonb_build_object('ok',false,'reason','transaction_conflict');end if;
  return jsonb_build_object('ok',true,'credited',true,'duplicate',true,'wallet',matchapp_private.token_wallet(p_user_id));
 end if;
 perform 1 from public.profiles where id=p_user_id for update;
 if not found then return jsonb_build_object('ok',false,'reason','claim_not_found');end if;
 perform 1 from matchapp_private.token_accounts where user_id=p_user_id for update;
 select * into r from matchapp_private.reward_claims where claim_nonce=p_claim_nonce and user_id=p_user_id for update;
 if not found then return jsonb_build_object('ok',false,'reason','claim_not_found');end if;
 if r.status='credited' or r.transaction_id is not null then return jsonb_build_object('ok',false,'reason','claim_already_credited');end if;
 if r.prepared_at is null then return jsonb_build_object('ok',false,'reason','claim_not_prepared');end if;
 if r.ad_unit<>p_ad_unit or r.reward_amount<>p_reward_amount or r.reward_item<>p_reward_item then return jsonb_build_object('ok',false,'reason','reward_mismatch');end if;
 if p_event_at<r.prepared_at-interval '1 minute' or p_event_at>r.expires_at or p_event_at>now()+interval '1 minute' or p_event_at<now()-interval '24 hours' then return jsonb_build_object('ok',false,'reason','reward_outside_session');end if;
 -- Once prepared, a genuine completion still earns its promised reward even
 -- after cancellation, delayed delivery, a Pro purchase, or paused new sales.
 update matchapp_private.token_accounts set reward_balance=reward_balance+3,updated_at=now() where user_id=p_user_id returning reward_balance into v_balance;
 if not found then return jsonb_build_object('ok',false,'reason','wallet_not_found');end if;
 insert into matchapp_private.reward_transactions(transaction_id,claim_nonce,user_id,ad_unit,reward_amount,reward_item,event_at,balance_after) values(p_transaction_id,p_claim_nonce,p_user_id,p_ad_unit,p_reward_amount,p_reward_item,p_event_at,v_balance);
 update matchapp_private.reward_claims set status='credited',credited_at=now(),transaction_id=p_transaction_id where claim_nonce=p_claim_nonce;
 return jsonb_build_object('ok',true,'credited',true,'duplicate',false,'wallet',matchapp_private.token_wallet(p_user_id));
end; $$;


-- Retire only new adult promotional grants while the reviewed policy is active.
-- Preserve the exact installed legacy body privately, so a feature pause restores
-- its former behavior without erasing previous grants or changing signup/check-in.
do $adult_promotions$
declare v_source text;v_copy text;
begin
 if to_regprocedure('public.claim_registration_welcome_bonus()') is not null then
  select pg_get_functiondef('public.claim_registration_welcome_bonus()'::regprocedure) into v_source;
  v_copy:=replace(v_source,'CREATE OR REPLACE FUNCTION public.claim_registration_welcome_bonus(', 'CREATE OR REPLACE FUNCTION matchapp_private.legacy_claim_registration_welcome_bonus(');
  if v_copy=v_source then raise exception 'Cannot preserve registration bonus function';end if;
  execute v_copy;
  execute $wrapper$create or replace function public.claim_registration_welcome_bonus() returns jsonb language plpgsql security definer set search_path='' as $body$
  begin
   if (select enabled from matchapp_private.monetization_config where singleton) then return jsonb_build_object('ok',true,'granted',false,'reason','monetization_policy_changed');end if;
   return matchapp_private.legacy_claim_registration_welcome_bonus();
  end; $body$;$wrapper$;
 end if;
 if to_regprocedure('public.claim_match_result_share(text)') is not null then
  select pg_get_functiondef('public.claim_match_result_share(text)'::regprocedure) into v_source;
  v_copy:=replace(v_source,'CREATE OR REPLACE FUNCTION public.claim_match_result_share(', 'CREATE OR REPLACE FUNCTION matchapp_private.legacy_claim_match_result_share(');
  if v_copy=v_source then raise exception 'Cannot preserve result share function';end if;
  execute v_copy;
  execute $wrapper$create or replace function public.claim_match_result_share(p_title text) returns jsonb language plpgsql security definer set search_path='' as $body$
  begin
   if (select enabled from matchapp_private.monetization_config where singleton) then return jsonb_build_object('granted',false,'reason','monetization_policy_changed');end if;
   return matchapp_private.legacy_claim_match_result_share(p_title);
  end; $body$;$wrapper$;
 end if;
end; $adult_promotions$;

-- Private tables and service APIs are not callable/readable by the browser.
do $$declare r record;begin
 for r in select tablename from pg_tables where schemaname='matchapp_private' loop
 execute format('alter table matchapp_private.%I enable row level security',r.tablename);
 execute format('revoke all on table matchapp_private.%I from public,anon,authenticated',r.tablename);
 end loop;end$$;
revoke all on all functions in schema matchapp_private from public,anon,authenticated;
do $$declare r record;begin
 for r in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('get_matchapp_monetization_config','set_matchapp_monetization_config','pro_status','get_pro_billing_state','get_pro_entitlement_by_external_id','get_pro_entitlements_by_customer','upsert_pro_entitlement','match_token_status','consume_match_token','refund_match_token','bind_play_billing_account','get_play_billing_account_user','reserve_play_billing_request','reserve_pro_billing_request','reserve_pro_checkout','bind_pro_checkout_customer','reward_session_service','credit_match_reward') loop
 execute format('revoke all on function %s from public,anon,authenticated',r.signature);
 execute format('grant execute on function %s to service_role',r.signature);
 end loop;end$$;
grant execute on function public.match_token_status() to anon,authenticated;
grant execute on function public.pro_status() to authenticated;
grant execute on function public.consume_match_token(uuid,text) to authenticated;
commit;
