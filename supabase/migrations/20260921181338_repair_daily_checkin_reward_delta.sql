-- 20260921181338_repair_daily_checkin_reward_delta.sql
--
-- Follow-up to the same-day check-in repair: legacy day-7 claims already
-- carried the old +5 weekly bonus. The current contract is +1 every day,
-- plus +5 on day 7, so repair only the missing delta (normally +1) rather
-- than treating the presence of any weekly ledger row as a complete reward.
--
-- Expected credited amount for today's check-in:
--   day 1-6 -> 1
--   day 7   -> 6
--
-- The sum of positive daily/weekly check-in ledger entries for the day is
-- compared with that expected amount. Only the difference is granted.

create or replace function public.daily_match_checkin()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v public.daily_match_checkins%rowtype;
  v_new int;
  v_reward boolean := false;
  v_award int := 1;
  v_balance int;
  v_expected int;
  v_granted int;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  insert into public.daily_match_checkins(user_id) values (v_uid)
    on conflict (user_id) do nothing;

  select * into v
  from public.daily_match_checkins
  where user_id = v_uid
  for update;

  if v.last_checkin = current_date then
    v_expected := case when v.streak = 7 then 6 else 1 end;

    select coalesce(sum(l.delta), 0)::int
      into v_granted
      from public.match_pack_ledger l
     where l.user_id = v_uid
       and l.pack in ('daily_checkin','weekly_checkin')
       and l.delta > 0
       and (l.created_at at time zone 'UTC')::date = current_date;

    if v_granted < v_expected then
      v_award := v_expected - v_granted;
      v_reward := (v.streak = 7);

      update public.profiles
         set purchased_matches = coalesce(purchased_matches, 0) + v_award
       where id = v_uid
       returning purchased_matches into v_balance;

      if v_balance is null then
        insert into public.profiles(id, purchased_matches)
        values (v_uid, v_award)
        on conflict (id) do update
          set purchased_matches = coalesce(public.profiles.purchased_matches, 0) + v_award
        returning purchased_matches into v_balance;
      end if;

      insert into public.match_pack_ledger(user_id, delta, balance, pack)
      values (
        v_uid, v_award, v_balance,
        case when v_reward then 'weekly_checkin' else 'daily_checkin' end
      );

      return jsonb_build_object(
        'ok', true, 'already_checked', true, 'repaired', true,
        'streak', v.streak, 'rewarded', v_reward,
        'awarded', v_award, 'matches', coalesce(v_balance, 0)
      );
    end if;

    select coalesce(purchased_matches, 0)
      into v_balance
      from public.profiles
     where id = v_uid;

    return jsonb_build_object(
      'ok', true, 'already_checked', true, 'repaired', false,
      'streak', v.streak, 'rewarded', false,
      'awarded', 0, 'matches', coalesce(v_balance, 0)
    );
  end if;

  v_new := case
             when v.last_checkin = current_date - 1
               then (case when v.streak >= 7 then 1 else v.streak + 1 end)
             else 1
           end;

  if v_new = 7 then
    v_reward := true;
    v_award := 6;
  end if;

  update public.profiles
     set purchased_matches = coalesce(purchased_matches, 0) + v_award
   where id = v_uid
   returning purchased_matches into v_balance;

  if v_balance is null then
    insert into public.profiles(id, purchased_matches)
    values (v_uid, v_award)
    on conflict (id) do update
      set purchased_matches = coalesce(public.profiles.purchased_matches, 0) + v_award
    returning purchased_matches into v_balance;
  end if;

  insert into public.match_pack_ledger(user_id, delta, balance, pack)
  values (
    v_uid, v_award, v_balance,
    case when v_reward then 'weekly_checkin' else 'daily_checkin' end
  );

  update public.daily_match_checkins
     set streak = v_new,
         last_checkin = current_date,
         total_checkins = total_checkins + 1,
         completed_weeks = completed_weeks + (case when v_reward then 1 else 0 end),
         updated_at = now()
   where user_id = v_uid;

  return jsonb_build_object(
    'ok', true, 'already_checked', false, 'repaired', false,
    'streak', v_new, 'rewarded', v_reward,
    'awarded', v_award, 'matches', coalesce(v_balance, 0)
  );
end
$function$;

revoke execute on function public.daily_match_checkin() from public, anon;
grant execute on function public.daily_match_checkin() to authenticated;

do $backfill$
declare
  r record;
  v_expected int;
  v_granted int;
  v_award int;
  v_balance int;
  v_pack text;
begin
  for r in
    select d.user_id, d.streak
    from public.daily_match_checkins d
    where d.last_checkin = current_date
  loop
    v_expected := case when r.streak = 7 then 6 else 1 end;

    select coalesce(sum(l.delta), 0)::int
      into v_granted
      from public.match_pack_ledger l
     where l.user_id = r.user_id
       and l.pack in ('daily_checkin','weekly_checkin')
       and l.delta > 0
       and (l.created_at at time zone 'UTC')::date = current_date;

    v_award := greatest(0, v_expected - v_granted);
    if v_award = 0 then
      continue;
    end if;

    v_pack := case when r.streak = 7 then 'weekly_checkin' else 'daily_checkin' end;

    update public.profiles
       set purchased_matches = coalesce(purchased_matches, 0) + v_award
     where id = r.user_id
     returning purchased_matches into v_balance;

    if found then
      insert into public.match_pack_ledger(user_id, delta, balance, pack)
      values (r.user_id, v_award, v_balance, v_pack);
    end if;
  end loop;
end
$backfill$;
