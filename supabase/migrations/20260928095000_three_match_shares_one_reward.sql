-- Adult match-result rewards: one non-expiring Match per three distinct shared results.
-- The client may report native share-sheet completion; the server owns progress,
-- deduplication and credit issuance. Guest posts are independently verified below.
alter table match_private.guest_social_proofs drop constraint if exists guest_social_proofs_kind_check;
alter table match_private.guest_social_proofs add constraint guest_social_proofs_kind_check
  check (kind in ('match','ask_ai','watch_match'));
create table if not exists match_private.member_match_result_shares (
  user_id uuid not null,
  title_key text not null,
  shared_at timestamptz not null default now(),
  primary key (user_id,title_key)
);
create index if not exists member_match_result_shares_recent
  on match_private.member_match_result_shares(user_id,shared_at desc);
alter table match_private.member_match_result_shares enable row level security;
revoke all on match_private.member_match_result_shares from public,anon,authenticated;

create or replace function public.claim_match_result_share(p_title text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_key text := lower(trim(regexp_replace(coalesce(p_title,''),'\s+',' ','g')));
  v_row public.profiles%rowtype;
  v_recent timestamptz[];
  v_count integer;
  v_balance integer;
  v_oldest timestamptz;
begin
  if v_uid is null then return jsonb_build_object('granted',false,'reason','not_authenticated'); end if;
  if length(v_key) < 1 or length(v_key) > 200 then
    return jsonb_build_object('granted',false,'reason','invalid_title');
  end if;
  select * into v_row from public.profiles where id=v_uid for update;
  if not found then return jsonb_build_object('granted',false,'reason','no_profile'); end if;
  select coalesce(array_agg(ts),'{}'::timestamptz[]) into v_recent
  from unnest(coalesce(v_row.share_rewards,'{}'::timestamptz[])) ts
  where ts > now() - interval '6 hours';
  if coalesce(array_length(v_recent,1),0)>=3 then
    select min(ts) into v_oldest from unnest(v_recent) ts;
    return jsonb_build_object('granted',false,'reason','window_full','progress',0,
      'remaining_rewards',0,
      'reset_in_seconds',greatest(0,extract(epoch from (v_oldest+interval '6 hours'-now()))::int));
  end if;
  insert into match_private.member_match_result_shares(user_id,title_key)
  values(v_uid,v_key) on conflict do nothing;
  if not found then
    return jsonb_build_object('granted',false,'reason','already_shared');
  end if;
  select count(*) into v_count from match_private.member_match_result_shares where user_id=v_uid;
  if v_count % 3 <> 0 then
    return jsonb_build_object('granted',false,'progress',v_count % 3,'remaining_rewards',3-coalesce(array_length(v_recent,1),0));
  end if;
  update public.profiles
  set share_rewards=array_append(v_recent,now()),
      purchased_matches=coalesce(purchased_matches,0)+1
  where id=v_uid returning purchased_matches into v_balance;
  insert into public.match_pack_ledger(user_id,delta,balance,pack)
  values(v_uid,1,v_balance,'share_reward');
  return jsonb_build_object('granted',true,'progress',0,
    'remaining_rewards',3-coalesce(array_length(v_recent,1),0)-1,
    'purchased_matches',v_balance,'matches',v_balance);
end $$;
revoke all on function public.claim_match_result_share(text) from public,anon;
grant execute on function public.claim_match_result_share(text) to authenticated;

-- Old cached clients cannot use the former one-share-one-credit endpoint.
revoke execute on function public.claim_share_reward() from authenticated;

create or replace function match_private.guest_social_proof_begin(p_guest_id uuid,p_kind text)
returns jsonb language plpgsql security definer
set search_path=pg_catalog,match_private
as $$
declare v_used int; v_pending match_private.guest_social_proofs%rowtype;
begin
 if p_guest_id is null or p_kind not in ('match','watch_match','ask_ai') then
   return jsonb_build_object('ok',false,'reason','invalid_request');end if;
 perform pg_advisory_xact_lock(hashtext(p_guest_id::text),20260926);
 select count(*) into v_used from match_private.guest_social_proofs
 where guest_id=p_guest_id and status='verified'
 and (case when p_kind='watch_match' then kind='watch_match' else kind<>'watch_match' end);
 if p_kind<>'watch_match' and v_used>=2 then
   return jsonb_build_object('ok',false,'reason','limit_reached','remaining',0);end if;
 select * into v_pending from match_private.guest_social_proofs
 where guest_id=p_guest_id and kind=p_kind and status='pending'
 and issued_at>now()-interval '90 minutes'
 order by issued_at desc limit 1;
 if v_pending.id is null then
   if (select count(*) from match_private.guest_social_proofs
       where guest_id=p_guest_id and issued_at>now()-interval '1 hour')>=8 then
     return jsonb_build_object('ok',false,'reason','rate_limited');end if;
   insert into match_private.guest_social_proofs(guest_id,kind,challenge)
   values(p_guest_id,p_kind,'MAI-'||upper(encode(extensions.gen_random_bytes(12),'hex')))
   returning * into v_pending;
 end if;
 return jsonb_build_object('ok',true,'proof_id',v_pending.id,
   'challenge',v_pending.challenge,
   'remaining',case when p_kind='watch_match' then 3-(v_used%3) else 2-v_used end,
   'issued_at',v_pending.issued_at);
end $$;

create or replace function match_private.guest_social_proof_complete(
 p_guest_id uuid,p_proof_id uuid,p_platform text,p_post_id text,p_post_url text
) returns jsonb language plpgsql security definer
set search_path=pg_catalog,match_private
as $$
declare v_proof match_private.guest_social_proofs%rowtype;v_used int;v_progress int;
begin
 if p_guest_id is null or p_proof_id is null or p_platform not in ('tiktok','bluesky')
 or nullif(p_post_id,'') is null or length(p_post_id)>180
 or length(coalesce(p_post_url,''))>700 then
   return jsonb_build_object('ok',false,'reason','invalid_request');end if;
 perform pg_advisory_xact_lock(hashtext(p_guest_id::text),20260926);
 select * into v_proof from match_private.guest_social_proofs
 where id=p_proof_id and guest_id=p_guest_id for update;
 if v_proof.id is null then return jsonb_build_object('ok',false,'reason','unknown_challenge');end if;
 if v_proof.status='verified' then return jsonb_build_object('ok',false,'reason','already_claimed');end if;
 if v_proof.issued_at<=now()-interval '90 minutes' then
   return jsonb_build_object('ok',false,'reason','expired');end if;
 select count(*) into v_used from match_private.guest_social_proofs
 where guest_id=p_guest_id and status='verified'
 and (case when v_proof.kind='watch_match' then kind='watch_match' else kind<>'watch_match' end);
 if v_proof.kind<>'watch_match' and v_used>=2 then
   return jsonb_build_object('ok',false,'reason','limit_reached');end if;
 if exists(select 1 from match_private.guest_social_proofs
   where platform=p_platform and post_id=p_post_id and status='verified') then
   return jsonb_build_object('ok',false,'reason','post_already_used');end if;
 update match_private.guest_social_proofs
 set status='verified',verified_at=now(),platform=p_platform,
 post_id=p_post_id,post_url=p_post_url where id=v_proof.id;
 v_progress:=(v_used+1)%3;
 return jsonb_build_object('ok',true,'verified',true,'kind',v_proof.kind,
   'proof_id',v_proof.id,'platform',p_platform,
   'progress',case when v_proof.kind='watch_match' then v_progress else 0 end,
   'reward_granted',v_proof.kind='watch_match' and v_progress=0,
   'remaining',case when v_proof.kind='watch_match' then 3-v_progress else 1-v_used end);
end $$;
revoke all on function match_private.guest_social_proof_begin(uuid,text) from public,anon,authenticated;
revoke all on function match_private.guest_social_proof_complete(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function match_private.guest_social_proof_begin(uuid,text) to service_role;
grant execute on function match_private.guest_social_proof_complete(uuid,uuid,text,text,text) to service_role;
notify pgrst,'reload schema';
