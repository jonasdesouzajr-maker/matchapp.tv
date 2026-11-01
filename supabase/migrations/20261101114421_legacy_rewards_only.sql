-- Rewards-only admission for the existing legacy Extra Matches pool.
-- The Match Tokens master switch, allowances, consumption, promotions and sales
-- are deliberately untouched. Both new admission paths default to closed.
begin;

create table matchapp_private.legacy_reward_config (
 singleton boolean primary key default true check(singleton),
 public_enabled boolean not null default false,
 updated_at timestamptz not null default now()
);
insert into matchapp_private.legacy_reward_config(singleton) values(true);
create table matchapp_private.legacy_reward_qa_cohort (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 granted_at timestamptz not null default now(),
 expires_at timestamptz not null,
 revoked_at timestamptz,
 updated_at timestamptz not null default now(),
 check(expires_at>granted_at and expires_at<=granted_at+interval '24 hours')
);
-- A marker records only that this server observed existing owned result
-- history. It is monotonic across later portfolio save/remove operations;
-- it neither attests the provider/renderer nor changes any quota or credit.
create table matchapp_private.legacy_reward_first_values (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 observed_at timestamptz not null default now(),
 surface text not null check(surface in('one_match','ebook'))
);
alter table matchapp_private.legacy_reward_first_values enable row level security;
revoke all on table matchapp_private.legacy_reward_first_values from public,anon,authenticated,service_role;
alter table matchapp_private.legacy_reward_config enable row level security;
alter table matchapp_private.legacy_reward_qa_cohort enable row level security;
revoke all on table matchapp_private.legacy_reward_config,matchapp_private.legacy_reward_qa_cohort from public,anon,authenticated,service_role;

-- Old promises retain their original destination, even if rollout mode changes.
alter table matchapp_private.reward_claims add column credit_target text not null default 'match_tokens'
 check(credit_target in('match_tokens','extra_matches'));
create function matchapp_private.reward_credit_target_immutable()
returns trigger language plpgsql set search_path='' as $$
begin
 if new.credit_target is distinct from old.credit_target then
  raise exception 'A reward claim credit target is immutable' using errcode='22023';
 end if;
 return new;
end; $$;
revoke all on function matchapp_private.reward_credit_target_immutable() from public,anon,authenticated,service_role;
create trigger reward_credit_target_immutable before update of credit_target on matchapp_private.reward_claims
 for each row execute function matchapp_private.reward_credit_target_immutable();

create function public.get_legacy_reward_rollout()
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('ok',true,'public_enabled',public_enabled,'policy_version','legacy-rewards-v1')
 from matchapp_private.legacy_reward_config where singleton;
$$;
create function public.set_legacy_reward_rollout(p_public_enabled boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if p_public_enabled is null then raise exception 'A rollout boolean is required' using errcode='22023';end if;
 update matchapp_private.legacy_reward_config set public_enabled=p_public_enabled,updated_at=now() where singleton;
 if not found then raise exception 'Missing legacy reward configuration';end if;
 return public.get_legacy_reward_rollout();
end; $$;
create function public.set_legacy_reward_qa_cohort(p_user_id uuid,p_expires_at timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if p_user_id is null then raise exception 'A user is required' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('legacy-reward-qa:'||p_user_id::text,0));
 if p_expires_at is null then
  update matchapp_private.legacy_reward_qa_cohort set revoked_at=now(),updated_at=now() where user_id=p_user_id;
 else
  if p_expires_at<=now() or p_expires_at>now()+interval '24 hours' then
   raise exception 'Reward QA access must expire within 24 hours' using errcode='22023';end if;
  if not exists(select 1 from auth.users u join public.profiles p on p.id=u.id
   where u.id=p_user_id and not coalesce(u.is_anonymous,false)
   and (u.email_confirmed_at is not null or u.phone_confirmed_at is not null)) then
   raise exception 'Reward QA access requires a confirmed registered account' using errcode='22023';end if;
  insert into matchapp_private.legacy_reward_qa_cohort(user_id,granted_at,expires_at,revoked_at,updated_at)
  values(p_user_id,now(),p_expires_at,null,now())
  on conflict(user_id) do update set granted_at=excluded.granted_at,expires_at=excluded.expires_at,
   revoked_at=null,updated_at=excluded.updated_at;
 end if;
 return jsonb_build_object('ok',true,'user_id',p_user_id,'qa_active',p_expires_at is not null,'qa_expires_at',p_expires_at);
end; $$;
revoke all on function public.get_legacy_reward_rollout() from public,anon,authenticated;
revoke all on function public.set_legacy_reward_rollout(boolean) from public,anon,authenticated;
revoke all on function public.set_legacy_reward_qa_cohort(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.get_legacy_reward_rollout(),public.set_legacy_reward_rollout(boolean),public.set_legacy_reward_qa_cohort(uuid,timestamptz) to service_role;

create function matchapp_private.legacy_reward_wallet(p_user_id uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare p public.profiles%rowtype;v_policy jsonb;v_pro jsonb;v_enabled boolean:=false;
 v_limit int;v_used int;v_daily int;v_purchased int;v_first boolean:=true;v_known boolean;v_registered boolean;
begin
 if p_user_id is null then return jsonb_build_object('ok',true,'authenticated',false,'enabled',false,'policy_version','legacy-rewards-v1','credit_target','extra_matches');end if;
 select * into p from public.profiles where id=p_user_id;
 if not found then return jsonb_build_object('ok',false,'authenticated',true,'enabled',false,'policy_version','legacy-rewards-v1','credit_target','extra_matches','reason','no_profile');end if;
 v_policy:=matchapp_private.user_monetization_policy(p_user_id);
 v_pro:=matchapp_private.pro_state(p_user_id);
 select exists(select 1 from auth.users u where u.id=p_user_id and not coalesce(u.is_anonymous,false)
  and (u.email_confirmed_at is not null or u.phone_confirmed_at is not null)) into v_registered;
 select c.public_enabled or exists(select 1 from matchapp_private.legacy_reward_qa_cohort q
  where q.user_id=p_user_id and q.revoked_at is null and q.granted_at<=now()
  and q.expires_at>now() and q.expires_at<=q.granted_at+interval '24 hours')
 into v_enabled from matchapp_private.legacy_reward_config c where c.singleton;
 -- Reuse the unchanged legacy limit helper and shared daily counter. Never
 -- initialize a new quota account or import raw_user_meta_data for admission.
 v_limit:=public.match_daily_limit_v2(coalesce(p.is_vip,false),coalesce(p.is_business,false),public.profile_is_complete(p));
 v_used:=case when p.daily_match_date=current_date then p.daily_match_count else 0 end;
 v_purchased:=p.purchased_matches;
 v_known:=v_limit in(3,5,10,50) and p.daily_match_date is not null and p.daily_match_date<=current_date
  and p.daily_match_count is not null and p.daily_match_count>=0 and v_used is not null and v_used>=0
  and v_purchased is not null and v_purchased>=0;
 v_daily:=greatest(0,v_limit-v_used);
 -- Capture an existing qualifying row once, including before quota exhaustion
 -- or rollout activation. No backfill, client proof setter, raw metadata import
 -- or manually saved-only item can manufacture this server-observed marker.
 -- Keep the existing native visible-result UX gate; only verified SSV against
 -- an immutable prepared claim can actually grant a reward.
 if v_registered and not exists(select 1 from matchapp_private.legacy_reward_first_values where user_id=p_user_id) then
  insert into matchapp_private.legacy_reward_first_values(user_id,surface)
  select p_user_id,proof.surface from (
   select 'one_match'::text surface where exists(select 1 from match_private.title_exclusions h
    where h.user_id=p_user_id and length(trim(h.title_key))>0 and h.item->>'action'='shown'
    and length(trim(h.item->>'title'))>0)
   union all
   select 'ebook'::text surface where exists(select 1 from match_private.reading_portfolios r,
    lateral jsonb_array_elements(case when jsonb_typeof(r.state->'seen')='array' then r.state->'seen' else '[]'::jsonb end) s(id)
    where r.user_id=p_user_id and jsonb_typeof(s.id)='string' and (s.id#>>'{}')~'^[A-Za-z0-9][A-Za-z0-9:_-]{0,199}$')
  ) proof limit 1 on conflict(user_id) do nothing;
 end if;
 v_first:=not exists(select 1 from matchapp_private.legacy_reward_first_values where user_id=p_user_id);
 v_enabled:=coalesce(v_enabled,false) and v_registered and coalesce(v_known,false)
  and (v_policy->>'ok')::boolean is true and (v_policy->>'enabled')::boolean is false
  and (v_pro->>'active')::boolean is false;
 return jsonb_build_object('ok',true,'authenticated',true,'enabled',v_enabled,'policy_version','legacy-rewards-v1','credit_target','extra_matches',
  'daily_limit',v_limit,'daily_remaining',v_daily,'bonus_tokens',0,'purchased_matches',v_purchased,
  'remaining',v_daily,'available_total',v_daily+v_purchased,'unlimited',false,'first_match_pending',v_first,
  'next_reset_at',(current_date+1)::timestamptz,'ad_free',v_pro->'adFree','pro_active',v_pro->'active',
  'rewarded_available',v_enabled and (v_pro->>'adFree')::boolean is false and not v_first and v_daily+v_purchased=0);
end; $$;
revoke all on function matchapp_private.legacy_reward_wallet(uuid) from public,anon,authenticated,service_role;
create function public.legacy_reward_status()
returns jsonb language sql volatile security definer set search_path='' as $$
 select matchapp_private.legacy_reward_wallet(auth.uid());
$$;
revoke all on function public.legacy_reward_status() from public,anon,service_role;
grant execute on function public.legacy_reward_status() to authenticated;

-- Only the reward RPCs gain a destination branch. Existing signed parameters,
-- raw reward name, nonce ownership, request replay, and native protocol survive.
create or replace function public.reward_session_service(p_action text,p_user_id uuid,p_request_id uuid default null,p_claim_nonce text default null,p_surface text default 'one_match')
returns jsonb language plpgsql security definer set search_path='' as $$
declare r matchapp_private.reward_claims%rowtype;v_wallet jsonb;v_legacy jsonb;v_count int;v_status text;v_target text;
begin
 if p_user_id is null or p_action is null or p_action not in('wallet','create','native_validate','status','cancel') then return jsonb_build_object('ok',false,'reason','invalid_request');end if;
 if not exists(select 1 from public.profiles where id=p_user_id) then return jsonb_build_object('ok',false,'reason','no_profile');end if;
 insert into matchapp_private.reward_session_limits as limits(user_id,window_at,attempts) values(p_user_id,date_trunc('minute',now()),1) on conflict(user_id) do update set attempts=case when limits.window_at=excluded.window_at then limits.attempts+1 else 1 end,window_at=excluded.window_at returning attempts into v_count;
 if v_count>60 then return jsonb_build_object('ok',false,'reason','rate_limited');end if;
 v_legacy:=matchapp_private.legacy_reward_wallet(p_user_id);
 if p_action='wallet' then
  return case when (v_legacy->>'enabled')::boolean is true then v_legacy else matchapp_private.token_wallet(p_user_id) end;
 end if;
 if p_claim_nonce is null or p_claim_nonce!~'^[a-f0-9]{64}$' then return jsonb_build_object('ok',false,'reason','invalid_claim');end if;
 -- Same lock order as consumption/refunds prevents balance races.
 perform 1 from public.profiles where id=p_user_id for update;
 perform 1 from matchapp_private.token_accounts where user_id=p_user_id for update;
 if p_action='create' then
  if p_request_id is null or p_surface is null or p_surface not in('one_match','ebook') then return jsonb_build_object('ok',false,'reason','invalid_request');end if;
  select * into r from matchapp_private.reward_claims where request_id=p_request_id;
  if found then
   if r.user_id<>p_user_id or r.surface<>p_surface then return jsonb_build_object('ok',false,'reason','request_conflict');end if;
  else
   update matchapp_private.reward_claims set status='expired' where user_id=p_user_id and status in('created','prepared') and expires_at<=now();
   -- Recover a pending owned promise before admission checks. Recovery grants
   -- no second preparation; the caller must reconcile prepared claims only.
   select * into r from matchapp_private.reward_claims where user_id=p_user_id and status in('created','prepared') and expires_at>now() order by created_at desc limit 1 for update;
   if not found then
    v_legacy:=matchapp_private.legacy_reward_wallet(p_user_id);
    v_target:=case when (v_legacy->>'enabled')::boolean is true then 'extra_matches' else 'match_tokens' end;
    v_wallet:=case when v_target='extra_matches' then v_legacy else matchapp_private.token_wallet(p_user_id) end;
    if not coalesce((v_wallet->>'rewarded_available')::boolean,false) then return jsonb_build_object('ok',false,'reason','reward_unavailable','wallet',v_wallet);end if;
    insert into matchapp_private.reward_claims(claim_nonce,request_id,user_id,surface,expires_at,credit_target)
    values(p_claim_nonce,p_request_id,p_user_id,p_surface,now()+interval '15 minutes',v_target) returning * into r;
   end if;
  end if;
  v_wallet:=case when r.credit_target='extra_matches' then matchapp_private.legacy_reward_wallet(p_user_id) else matchapp_private.token_wallet(p_user_id) end;
  v_status:=case when r.status in('created','prepared') and r.expires_at<=now() then 'expired' else r.status end;
  return jsonb_build_object('ok',true,'claimNonce',r.claim_nonce,'expiresAt',floor(extract(epoch from r.expires_at)*1000)::bigint,'adUnitId',r.ad_unit,'rewardAmount',r.reward_amount,'rewardItem',r.reward_item,'creditTarget',r.credit_target,'claimStatus',v_status,'wallet',v_wallet);
 end if;
 select * into r from matchapp_private.reward_claims where claim_nonce=p_claim_nonce and user_id=p_user_id for update;
 if not found then return jsonb_build_object('ok',false,'reason','claim_not_found');end if;
 v_wallet:=case when r.credit_target='extra_matches' then matchapp_private.legacy_reward_wallet(p_user_id) else matchapp_private.token_wallet(p_user_id) end;
 if p_action='native_validate' then
  if r.expires_at<=now() then return jsonb_build_object('ok',false,'reason','claim_expired');end if;
  if r.status<>'created' then return jsonb_build_object('ok',false,'reason','claim_already_prepared');end if;
  if not coalesce((v_wallet->>'rewarded_available')::boolean,false) then return jsonb_build_object('ok',false,'reason','reward_unavailable');end if;
  update matchapp_private.reward_claims set status='prepared',prepared_at=now() where claim_nonce=r.claim_nonce;
  return jsonb_build_object('ok',true,'claimNonce',r.claim_nonce,'userId',r.user_id,'expiresAt',floor(extract(epoch from r.expires_at)*1000)::bigint,'adUnitId',r.ad_unit,'rewardAmount',r.reward_amount,'creditTarget',r.credit_target,'claimStatus','prepared');
 end if;
 if p_action='cancel' and r.status in('created','prepared') then
  update matchapp_private.reward_claims set status='cancelled',cancelled_at=now() where claim_nonce=r.claim_nonce;r.status:='cancelled';
 end if;
 v_status:=case when r.status in('created','prepared') and r.expires_at<=now() then 'expired' else r.status end;
 return jsonb_build_object('ok',true,'claimNonce',r.claim_nonce,'status',v_status,'claimStatus',v_status,'creditTarget',r.credit_target,'credited',r.status='credited','wallet',v_wallet);
end; $$;

create or replace function public.credit_match_reward(p_claim_nonce text,p_user_id uuid,p_transaction_id text,p_ad_unit text,p_reward_amount int,p_reward_item text,p_event_at timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r matchapp_private.reward_claims%rowtype;t matchapp_private.reward_transactions%rowtype;v_balance int;v_wallet jsonb;
begin
 if p_claim_nonce is null or p_claim_nonce!~'^[a-f0-9]{64}$' or p_user_id is null or p_transaction_id is null or (p_transaction_id!~'^[a-f0-9]+$' or length(p_transaction_id) not between 16 and 256) or p_ad_unit is distinct from 'ca-app-pub-9541435081010948/2802190985' or p_reward_amount is distinct from 3 or p_reward_item is distinct from 'Match Tokens' or p_event_at is null then return jsonb_build_object('ok',false,'reason','invalid_reward');end if;
 perform pg_advisory_xact_lock(hashtextextended('ssv:'||p_transaction_id,0));
 select * into t from matchapp_private.reward_transactions where transaction_id=p_transaction_id;
 if found then
  if t.claim_nonce<>p_claim_nonce or t.user_id<>p_user_id or t.ad_unit<>p_ad_unit or t.reward_amount<>p_reward_amount or t.reward_item<>p_reward_item or t.event_at<>p_event_at then return jsonb_build_object('ok',false,'reason','transaction_conflict');end if;
  select * into r from matchapp_private.reward_claims where claim_nonce=t.claim_nonce;
  v_wallet:=case when r.credit_target='extra_matches' then matchapp_private.legacy_reward_wallet(p_user_id) else matchapp_private.token_wallet(p_user_id) end;
  return jsonb_build_object('ok',true,'credited',true,'duplicate',true,'creditTarget',r.credit_target,'claimStatus','credited','wallet',v_wallet);
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
 -- Once prepared, genuine completion keeps its frozen destination after
 -- cancellation, delayed delivery, ad-free purchase or paused admission.
 if r.credit_target='extra_matches' then
  update public.profiles set purchased_matches=purchased_matches+3 where id=p_user_id
   and purchased_matches>=0 returning purchased_matches into v_balance;
  if not found then return jsonb_build_object('ok',false,'reason','wallet_not_found');end if;
  insert into public.match_pack_ledger(user_id,delta,balance,pack) values(p_user_id,3,v_balance,'rewarded_ad_ssv');
 else
  update matchapp_private.token_accounts set reward_balance=reward_balance+3,updated_at=now() where user_id=p_user_id returning reward_balance into v_balance;
  if not found then return jsonb_build_object('ok',false,'reason','wallet_not_found');end if;
 end if;
 insert into matchapp_private.reward_transactions(transaction_id,claim_nonce,user_id,ad_unit,reward_amount,reward_item,event_at,balance_after) values(p_transaction_id,p_claim_nonce,p_user_id,p_ad_unit,p_reward_amount,p_reward_item,p_event_at,v_balance);
 update matchapp_private.reward_claims set status='credited',credited_at=now(),transaction_id=p_transaction_id where claim_nonce=p_claim_nonce;
 v_wallet:=case when r.credit_target='extra_matches' then matchapp_private.legacy_reward_wallet(p_user_id) else matchapp_private.token_wallet(p_user_id) end;
 return jsonb_build_object('ok',true,'credited',true,'duplicate',false,'creditTarget',r.credit_target,'claimStatus','credited','wallet',v_wallet);
end; $$;

-- CREATE OR REPLACE preserves existing ACLs, and these RPCs remain service-only.
revoke all on function public.reward_session_service(text,uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.credit_match_reward(text,uuid,text,text,integer,text,timestamptz) from public,anon,authenticated;
grant execute on function public.reward_session_service(text,uuid,uuid,text,text),public.credit_match_reward(text,uuid,text,text,integer,text,timestamptz) to service_role;
notify pgrst,'reload schema';
commit;
