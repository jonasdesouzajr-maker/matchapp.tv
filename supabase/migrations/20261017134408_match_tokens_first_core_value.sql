-- First core value is a successful adult movie/TV OR e-book recommendation.
-- Follow-up to the deployed 20261017105237 migration; do not edit its history.
-- Existing RPC signatures, role grants, balances, quotas and legacy APIs survive.
-- Only the first-result marker/exception/refund lookup changes below.
begin;

create or replace function public.consume_match_token(p_request_id uuid,p_surface text default 'one_match') returns jsonb language plpgsql security definer set search_path='' as $$
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
 elsif a.first_request_id is null then v_source:='first_match';
 elsif a.reward_balance>0 then update matchapp_private.token_accounts set reward_balance=reward_balance-1 where user_id=v_uid;v_source:='reward';
 elsif coalesce(p.purchased_matches,0)>0 then update public.profiles set purchased_matches=purchased_matches-1 where id=v_uid returning purchased_matches into v_balance;insert into public.match_pack_ledger(user_id,delta,balance,pack) values(v_uid,-1,v_balance,'match_token_use');v_source:='purchased';
 else return matchapp_private.token_wallet(v_uid)||jsonb_build_object('allowed',false,'request_id',p_request_id,'consumed',false,'reason','limit_reached');end if;
 insert into matchapp_private.token_uses(request_id,user_id,surface,source,token_day) values(p_request_id,v_uid,p_surface,v_source,v_day);
 update matchapp_private.token_accounts set updated_at=now(),first_request_id=coalesce(first_request_id,p_request_id) where user_id=v_uid;
 return matchapp_private.token_wallet(v_uid)||jsonb_build_object('allowed',true,'request_id',p_request_id,'consumed',v_source not in('pro','first_match'),'source',v_source,'reason','accepted');
end; $$;
-- Service-only reversal of an exact documented failure; never a browser-minted refund.
create or replace function public.refund_match_token(p_request_id uuid,p_reason text default 'verified_failure') returns jsonb language plpgsql security definer set search_path='' as $$
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
 update matchapp_private.token_accounts set first_request_id=(select request_id from matchapp_private.token_uses where user_id=u.user_id and refunded_at is null order by created_at,request_id limit 1),updated_at=now() where user_id=u.user_id;
 return jsonb_build_object('ok',true,'refunded',true,'wallet',matchapp_private.token_wallet(u.user_id));
end; $$;

-- Historical successful ebook uses already paid their token. Mark value received
-- without charging, refunding or changing any earned/purchased/daily balance.
update matchapp_private.token_accounts a
set first_request_id=(
 select u.request_id from matchapp_private.token_uses u
 where u.user_id=a.user_id and u.refunded_at is null
 order by u.created_at,u.request_id limit 1
)
where a.first_request_id is null and exists(
 select 1 from matchapp_private.token_uses u
 where u.user_id=a.user_id and u.refunded_at is null
);

commit;
