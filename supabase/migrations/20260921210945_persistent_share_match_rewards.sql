-- Persist successful social-share rewards as non-expiring Extra Matches.
-- Applied to production as Supabase migration 20260921210945.
create or replace function public.claim_share_reward()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_row public.profiles%rowtype;
  v_window interval := interval '6 hours';
  v_max integer := 3;
  v_recent timestamptz[];
  v_oldest timestamptz;
  v_balance integer;
begin
  if v_uid is null then
    return jsonb_build_object('granted', false, 'reason', 'not_authenticated');
  end if;

  select * into v_row
  from public.profiles
  where id = v_uid
  for update;

  if not found then
    return jsonb_build_object('granted', false, 'reason', 'no_profile');
  end if;

  select coalesce(array_agg(ts), '{}'::timestamptz[])
    into v_recent
    from unnest(coalesce(v_row.share_rewards, '{}'::timestamptz[])) ts
   where ts > now() - v_window;

  if coalesce(array_length(v_recent, 1), 0) >= v_max then
    select min(ts) into v_oldest from unnest(v_recent) ts;
    update public.profiles set share_rewards = v_recent where id = v_uid;
    return jsonb_build_object(
      'granted', false,
      'reason', 'window_full',
      'remaining_rewards', 0,
      'purchased_matches', coalesce(v_row.purchased_matches, 0),
      'reset_in_seconds', greatest(0, extract(epoch from (v_oldest + v_window - now()))::int)
    );
  end if;

  update public.profiles
     set share_rewards = array_append(v_recent, now()),
         purchased_matches = coalesce(purchased_matches, 0) + 1
   where id = v_uid
   returning purchased_matches into v_balance;

  insert into public.match_pack_ledger(user_id, delta, balance, pack)
  values(v_uid, 1, v_balance, 'share_reward');

  return jsonb_build_object(
    'granted', true,
    'remaining_rewards', v_max - (coalesce(array_length(v_recent, 1), 0) + 1),
    'purchased_matches', v_balance,
    'matches', v_balance
  );
end
$function$;

revoke execute on function public.claim_share_reward() from public, anon;
grant execute on function public.claim_share_reward() to authenticated;
