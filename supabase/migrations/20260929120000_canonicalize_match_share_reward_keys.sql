-- Follow-up to the September 29 reward provenance guard.
-- Use the exact canonical identity for BOTH history lookup and reward deduplication.
-- Whitespace/punctuation/Unicode variants of one title must not count as three results.
-- Existing share rows are empty in the verified production database at rollout;
-- normalize legacy rows defensively for other environments before changing the RPC.
WITH ordered AS (
  SELECT ctid, row_number() OVER (
    PARTITION BY user_id, match_private.title_key(title_key)
    ORDER BY shared_at, title_key
  ) AS duplicate_no
  FROM match_private.member_match_result_shares
)
DELETE FROM match_private.member_match_result_shares t USING ordered o
WHERE t.ctid=o.ctid AND o.duplicate_no>1;

DELETE FROM match_private.member_match_result_shares
WHERE match_private.title_key(title_key)='';

UPDATE match_private.member_match_result_shares
SET title_key=match_private.title_key(title_key)
WHERE title_key<>match_private.title_key(title_key);

create or replace function public.claim_match_result_share(p_title text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_key text := match_private.title_key(p_title);
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
  -- The browser can name a displayed title but cannot mint an arbitrary
  -- three-share reward for three invented strings. Require an owner-scoped
  -- entry in the existing server-side audiovisual match history.
  if not exists (
    select 1 from match_private.title_exclusions h
    where h.user_id=v_uid and h.title_key=match_private.title_key(p_title)
      and h.item->>'action' in ('shown','save','seen','like','loved')
  ) then
    return jsonb_build_object('granted',false,'reason','not_in_match_history');
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
notify pgrst,'reload schema';
