-- 015_daily_checkin_match_rewards.sql
--
-- Daily Check-in rewards (2026-09-21).
--
-- Before this migration a check-in only moved the streak, and the single
-- reward was +5 Extra Matches on day 7. The approved Daily Check-in gives
-- a reward on EVERY day of the streak:
--
--   * every successful check-in  -> +1 Extra Match
--   * completing day 7           -> +5 Extra Matches on top of that day's +1
--
-- Everything else is unchanged: check-in is once per calendar day, a missed
-- day restarts the streak at 1, the reward is registered-users-only (the
-- function returns `not_authenticated` without auth.uid()), and every grant is
-- still written to match_pack_ledger so the balance stays auditable.
--
-- Extra Matches are Match credits only. They do not become Ask AI credits and
-- they do not change any daily included-action allowance.

create table if not exists public.daily_match_checkins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  streak int not null default 0 check (streak >= 0 and streak <= 7),
  last_checkin date,
  total_checkins int not null default 0,
  completed_weeks int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.daily_match_checkins enable row level security;

create or replace function public.daily_match_checkin()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v public.daily_match_checkins%rowtype;
  v_new int;
  v_reward boolean := false;
  v_award int := 1;                 -- every check-in is worth one Extra Match
  v_balance int;
begin
  if v_uid is null then
    -- Registered accounts only. Guests are told to create a free account.
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  insert into public.daily_match_checkins(user_id) values (v_uid)
    on conflict (user_id) do nothing;

  select * into v from public.daily_match_checkins where user_id = v_uid for update;

  if v.last_checkin = current_date then
    select coalesce(purchased_matches, 0) into v_balance from public.profiles where id = v_uid;
    return jsonb_build_object(
      'ok', true, 'already_checked', true, 'streak', v.streak,
      'rewarded', false, 'awarded', 0, 'matches', coalesce(v_balance, 0)
    );
  end if;

  v_new := case
             when v.last_checkin = current_date - 1
               then (case when v.streak >= 7 then 1 else v.streak + 1 end)
             else 1
           end;

  if v_new = 7 then
    v_reward := true;
    v_award := v_award + 5;         -- day 7: the daily +1 plus the +5 bonus
  end if;

  insert into public.profiles(id, purchased_matches) values (v_uid, v_award)
    on conflict (id) do update
      set purchased_matches = coalesce(public.profiles.purchased_matches, 0) + v_award;

  select purchased_matches into v_balance from public.profiles where id = v_uid;

  insert into public.match_pack_ledger(user_id, delta, balance, pack)
    values (v_uid, v_award, v_balance,
            case when v_reward then 'weekly_checkin' else 'daily_checkin' end);

  update public.daily_match_checkins
     set streak = v_new,
         last_checkin = current_date,
         total_checkins = total_checkins + 1,
         completed_weeks = completed_weeks + (case when v_reward then 1 else 0 end),
         updated_at = now()
   where user_id = v_uid;

  return jsonb_build_object(
    'ok', true, 'already_checked', false, 'streak', v_new,
    'rewarded', v_reward, 'awarded', v_award,
    'matches', coalesce(v_balance, 0)
  );
end
$function$;

create or replace function public.daily_match_checkin_status()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v public.daily_match_checkins%rowtype;
  v_streak int;
begin
  if v_uid is null then
    return jsonb_build_object('authenticated', false);
  end if;

  select * into v from public.daily_match_checkins where user_id = v_uid;

  if not found then
    return jsonb_build_object('authenticated', true, 'streak', 0, 'checked_today', false,
                              'total_checkins', 0, 'completed_weeks', 0);
  end if;

  v_streak := case when v.last_checkin is null or v.last_checkin < current_date - 1
                   then 0 else v.streak end;

  return jsonb_build_object(
    'authenticated', true,
    'streak', v_streak,
    'checked_today', v.last_checkin = current_date,
    'last_checkin', v.last_checkin,
    'total_checkins', v.total_checkins,
    'completed_weeks', v.completed_weeks
  );
end
$function$;

-- Grants are left exactly as they were. "Registered users only" is enforced
-- inside the functions by the auth.uid() guard, which returns
-- `not_authenticated` and grants nothing; tightening the role grants here
-- would only change a guest's refusal from a clean payload into an error.
grant execute on function public.daily_match_checkin() to authenticated;
grant execute on function public.daily_match_checkin_status() to authenticated;
