-- Keep all match-consuming paths on the established entitlement policy:
-- guest 3 / registered 5 / VIP 10 / Business 50.
-- This removes older helper behavior that treated VIP as unlimited.

create or replace function public.consume_match()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_row public.profiles%rowtype;
  v_limit integer;
  v_used integer;
  v_complete boolean;
  v_extra integer;
begin
  if v_uid is null then
    return jsonb_build_object('allowed', false, 'reason', 'not_authenticated');
  end if;

  select * into v_row from public.profiles where id = v_uid for update;
  if not found then
    insert into public.profiles(id) values(v_uid) on conflict(id) do nothing;
    select * into v_row from public.profiles where id = v_uid for update;
  end if;

  v_used := case when v_row.daily_match_date = current_date then v_row.daily_match_count else 0 end;
  v_complete := public.profile_is_complete(v_row);
  v_limit := public.match_daily_limit_v2(
    coalesce(v_row.is_vip,false),
    coalesce(v_row.is_business,false),
    v_complete
  );

  if v_used < v_limit then
    update public.profiles
       set daily_match_count = v_used + 1,
           daily_match_date = current_date
     where id = v_uid;
    return jsonb_build_object(
      'allowed', true,
      'used', v_used + 1,
      'limit', v_limit,
      'remaining', v_limit - (v_used + 1),
      'purchased_matches', coalesce(v_row.purchased_matches,0)
    );
  end if;

  if coalesce(v_row.purchased_matches,0) > 0 then
    update public.profiles
       set purchased_matches = purchased_matches - 1,
           daily_match_count = v_used,
           daily_match_date = current_date
     where id = v_uid
     returning purchased_matches into v_extra;

    insert into public.match_pack_ledger(user_id,delta,balance,pack)
    values(v_uid,-1,v_extra,'match_use');

    return jsonb_build_object(
      'allowed', true,
      'used', v_used,
      'limit', v_limit,
      'remaining', 0,
      'paid_with_match_pack', true,
      'purchased_matches', v_extra
    );
  end if;

  return jsonb_build_object(
    'allowed', false,
    'reason', 'limit_reached',
    'used', v_used,
    'limit', v_limit,
    'remaining', 0,
    'purchased_matches', 0
  );
end
$function$;

create or replace function public.match_status()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_row public.profiles%rowtype;
  v_limit integer;
  v_used integer;
  v_recent timestamptz[];
  v_oldest timestamptz;
  v_complete boolean;
begin
  if v_uid is null then
    return jsonb_build_object('authenticated',false);
  end if;

  select * into v_row from public.profiles where id=v_uid;
  if not found then
    return jsonb_build_object('authenticated',false,'reason','no_profile');
  end if;

  v_used := case when v_row.daily_match_date=current_date then v_row.daily_match_count else 0 end;
  v_complete := public.profile_is_complete(v_row);
  v_limit := public.match_daily_limit_v2(
    coalesce(v_row.is_vip,false),
    coalesce(v_row.is_business,false),
    v_complete
  );

  select coalesce(array_agg(ts),'{}'::timestamptz[])
    into v_recent
    from unnest(coalesce(v_row.share_rewards,'{}'::timestamptz[])) ts
   where ts > now() - interval '6 hours';

  select min(ts) into v_oldest from unnest(v_recent) ts;

  return jsonb_build_object(
    'authenticated',true,
    'used',v_used,
    'limit',v_limit,
    'remaining',greatest(0,v_limit-v_used),
    'unlimited',false,
    'is_vip',coalesce(v_row.is_vip,false),
    'is_business',coalesce(v_row.is_business,false),
    'profile_complete',v_complete,
    'purchased_matches',coalesce(v_row.purchased_matches,0),
    'credits',coalesce(v_row.credits,0),
    'share_rewards_left',greatest(0,3-coalesce(array_length(v_recent,1),0)),
    'reset_in_seconds',case when coalesce(array_length(v_recent,1),0)>=3 then greatest(0,extract(epoch from(v_oldest+interval '6 hours'-now()))::int) else 0 end
  );
end
$function$;
