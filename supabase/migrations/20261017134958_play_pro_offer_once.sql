-- Service-only, one-use authorization for the reviewed Play Pro offer.
-- No raw purchase token, client grant, new entitlement, or billing mutation.
-- The Play endpoint verifies the actual paid Google purchase before redemption.
begin;

create table matchapp_private.play_pro_offer_intents (
 claim_nonce uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 product_id text not null check (product_id='matchapp_pro'),
 base_plan_id text not null check (base_plan_id='monthly'),
 offer_id text not null check (offer_id='retain-50-3m'),
 source_token_hash text not null check (source_token_hash~'^[a-f0-9]{64}$'),
 purpose text not null check (purpose in ('retention','winback')),
 source_status text not null,
 source_expires_at timestamptz not null,
 source_verified_at timestamptz not null,
 issued_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '24 hours'
);
create index play_pro_offer_intents_owner
 on matchapp_private.play_pro_offer_intents(user_id,product_id,offer_id,issued_at desc);

create table matchapp_private.play_pro_offer_redemptions (
 user_id uuid not null references public.profiles(id) on delete cascade,
 product_id text not null check (product_id='matchapp_pro'),
 base_plan_id text not null check (base_plan_id='monthly'),
 offer_id text not null check (offer_id='retain-50-3m'),
 claim_nonce uuid not null unique references matchapp_private.play_pro_offer_intents(claim_nonce),
 purchase_token_hash text not null unique check (purchase_token_hash~'^[a-f0-9]{64}$'),
 linked_token_hash text check (linked_token_hash is null or linked_token_hash~'^[a-f0-9]{64}$'),
 purchase_started_at timestamptz not null,
 redeemed_at timestamptz not null default now(),
 primary key(user_id,product_id,offer_id)
);

create function public.reserve_play_pro_offer(
 p_user_id uuid,p_product_id text,p_base_plan_id text,p_offer_id text,
 p_source_token_hash text,p_purpose text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 s matchapp_private.pro_entitlements%rowtype;
 i matchapp_private.play_pro_offer_intents%rowtype;
begin
 if p_user_id is null or p_product_id is distinct from 'matchapp_pro'
 or p_base_plan_id is distinct from 'monthly' or p_offer_id is distinct from 'retain-50-3m'
 or p_source_token_hash is null or p_source_token_hash!~'^[a-f0-9]{64}$'
 or p_purpose is null or p_purpose not in ('retention','winback') then
  raise exception 'Invalid Play offer request' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('play-pro-offer:'||p_user_id::text||':'||p_product_id||':'||p_offer_id,0));
 if not exists(select 1 from matchapp_private.monetization_config
  where singleton and enabled and p_product_id=any(play_product_ids)) then
  return jsonb_build_object('ok',true,'eligible',false,'reason','policy_disabled');
 end if;
 if exists(select 1 from matchapp_private.play_pro_offer_redemptions
  where user_id=p_user_id and product_id=p_product_id and offer_id=p_offer_id) then
  return jsonb_build_object('ok',true,'eligible',false,'reason','already_redeemed');
 end if;
 select * into s from matchapp_private.pro_entitlements
 where provider='play' and external_id=p_source_token_hash and token_hash=p_source_token_hash
 and user_id=p_user_id and product_id=p_product_id and product_verified and ever_paid;
 if not found or s.expires_at is null
 or (p_purpose='retention' and (not s.paid or s.status not in ('active','canceled') or s.expires_at<=now()))
 or (p_purpose='winback' and (s.status not in ('canceled','expired') or s.expires_at>now()
  or (matchapp_private.pro_state(p_user_id)->>'active')::boolean)) then
  return jsonb_build_object('ok',true,'eligible',false,'reason','source_not_eligible');
 end if;
 select * into i from matchapp_private.play_pro_offer_intents
 where user_id=p_user_id and product_id=p_product_id and base_plan_id=p_base_plan_id
 and offer_id=p_offer_id and source_token_hash=p_source_token_hash and purpose=p_purpose
 and expires_at>now() order by issued_at desc,claim_nonce limit 1;
 if not found then
  insert into matchapp_private.play_pro_offer_intents(
   user_id,product_id,base_plan_id,offer_id,source_token_hash,purpose,
   source_status,source_expires_at,source_verified_at
  ) values(p_user_id,p_product_id,p_base_plan_id,p_offer_id,p_source_token_hash,p_purpose,
   s.status,s.expires_at,s.verified_at) returning * into i;
 end if;
 return jsonb_build_object('ok',true,'eligible',true,'claimNonce',i.claim_nonce,
  'issuedAt',floor(extract(epoch from i.issued_at)*1000)::bigint,
  'expiresAt',floor(extract(epoch from i.expires_at)*1000)::bigint);
end; $$;

create function public.redeem_play_pro_offer(
 p_user_id uuid,p_product_id text,p_base_plan_id text,p_offer_id text,
 p_purchase_token_hash text,p_linked_token_hash text,p_purchase_started_at timestamptz
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 i matchapp_private.play_pro_offer_intents%rowtype;
 r matchapp_private.play_pro_offer_redemptions%rowtype;
 e matchapp_private.pro_entitlements%rowtype;
begin
 if p_user_id is null or p_product_id is distinct from 'matchapp_pro'
 or p_base_plan_id is distinct from 'monthly' or p_offer_id is distinct from 'retain-50-3m'
 or p_purchase_token_hash is null or p_purchase_token_hash!~'^[a-f0-9]{64}$'
 or (p_linked_token_hash is not null and (p_linked_token_hash!~'^[a-f0-9]{64}$' or p_linked_token_hash=p_purchase_token_hash))
 or p_purchase_started_at is null or p_purchase_started_at>now()+interval '5 minutes' then
  raise exception 'Invalid verified Play offer' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('play-pro-offer:'||p_user_id::text||':'||p_product_id||':'||p_offer_id,0));
 -- Share the provider-token lock with the authoritative entitlement upsert.
 perform pg_advisory_xact_lock(hashtextextended('pro:play:'||p_purchase_token_hash,0));
 select * into r from matchapp_private.play_pro_offer_redemptions where purchase_token_hash=p_purchase_token_hash;
 if found then
  if r.user_id<>p_user_id or r.product_id<>p_product_id or r.base_plan_id<>p_base_plan_id
  or r.offer_id<>p_offer_id or r.linked_token_hash is distinct from p_linked_token_hash
  or r.purchase_started_at<>p_purchase_started_at then
   return jsonb_build_object('ok',false,'redeemed',false,'reason','purchase_conflict');
  end if;
  return jsonb_build_object('ok',true,'redeemed',true,'reason','idempotent_replay');
 end if;
 if exists(select 1 from matchapp_private.play_pro_offer_redemptions
  where user_id=p_user_id and product_id=p_product_id and offer_id=p_offer_id) then
  return jsonb_build_object('ok',false,'redeemed',false,'reason','already_redeemed');
 end if;
 select * into e from matchapp_private.pro_entitlements where provider='play' and external_id=p_purchase_token_hash;
 if found and (e.user_id<>p_user_id or e.product_id<>p_product_id or e.token_hash<>p_purchase_token_hash) then
  return jsonb_build_object('ok',false,'redeemed',false,'reason','ownership_conflict');
 end if;
 if p_linked_token_hash is not null and not exists(
  select 1 from matchapp_private.pro_entitlements where provider='play' and external_id=p_linked_token_hash
  and token_hash=p_linked_token_hash and user_id=p_user_id and product_id=p_product_id and product_verified
 ) then return jsonb_build_object('ok',false,'redeemed',false,'reason','linked_purchase_conflict');end if;
 -- A quote's 24-hour deadline controls serving it again, not fulfillment of a
 -- legitimately pending Google payment. Keep historical issuance evidence.
 select * into i from matchapp_private.play_pro_offer_intents
 where user_id=p_user_id and product_id=p_product_id and base_plan_id=p_base_plan_id and offer_id=p_offer_id
 and source_token_hash<>p_purchase_token_hash and p_purchase_started_at>=issued_at-interval '5 minutes'
 and (purpose='winback' or (purpose='retention' and source_token_hash=p_linked_token_hash))
 order by issued_at,claim_nonce limit 1;
 if not found then return jsonb_build_object('ok',false,'redeemed',false,'reason','intent_not_found');end if;
 insert into matchapp_private.play_pro_offer_redemptions(
  user_id,product_id,base_plan_id,offer_id,claim_nonce,purchase_token_hash,linked_token_hash,purchase_started_at
 ) values(p_user_id,p_product_id,p_base_plan_id,p_offer_id,i.claim_nonce,p_purchase_token_hash,p_linked_token_hash,p_purchase_started_at);
 return jsonb_build_object('ok',true,'redeemed',true,'reason','verified');
end; $$;

alter table matchapp_private.play_pro_offer_intents enable row level security;
alter table matchapp_private.play_pro_offer_redemptions enable row level security;
revoke all on table matchapp_private.play_pro_offer_intents,matchapp_private.play_pro_offer_redemptions from public,anon,authenticated;
revoke all on function public.reserve_play_pro_offer(uuid,text,text,text,text,text) from public,anon,authenticated;
revoke all on function public.redeem_play_pro_offer(uuid,text,text,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.reserve_play_pro_offer(uuid,text,text,text,text,text) to service_role;
grant execute on function public.redeem_play_pro_offer(uuid,text,text,text,text,text,timestamptz) to service_role;
commit;
