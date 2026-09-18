-- MatchApp account identity + commercial quota bootstrap.
-- Included daily AI actions are shared between Match and Ask AI.
-- Paid top-ups are intentionally separate: Ask AI credits vs purchased Matches.

alter table public.profiles add column if not exists purchased_matches integer not null default 0;
do $$ begin
 alter table public.profiles add constraint profiles_purchased_matches_nonnegative check (purchased_matches >= 0);
exception when duplicate_object then null; end $$;
comment on column public.profiles.credits is 'Ask AI credits only. Never consumed by Match.';
comment on column public.profiles.purchased_matches is 'Purchased Match balance. Consumed only after included Match allowance.';

create or replace function public.consume_credit(p_reason text default 'ask_ai')
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_bal integer;
begin
 if p_reason is distinct from 'ask_ai' then return jsonb_build_object('ok',false,'reason','ask_ai_only'); end if;
 if v_uid is null then return jsonb_build_object('ok',false,'reason','not_authenticated'); end if;
 insert into public.profiles(id) values(v_uid) on conflict(id) do nothing;
 update public.profiles set credits=credits-1 where id=v_uid and credits>0 returning credits into v_bal;
 if v_bal is null then
  select coalesce(credits,0) into v_bal from public.profiles where id=v_uid;
  return jsonb_build_object('ok',false,'reason','no_credits','credits',coalesce(v_bal,0));
 end if;
 insert into public.credit_ledger(user_id,delta,balance,reason) values(v_uid,-1,v_bal,'ask_ai');
 return jsonb_build_object('ok',true,'credits',v_bal,'reason','ask_ai');
end;$$;
revoke all on function public.consume_credit(text) from public,anon;
grant execute on function public.consume_credit(text) to authenticated;

create or replace function public.consume_match()
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_row public.profiles%rowtype; v_limit integer; v_used integer; v_complete boolean; v_pack integer;
begin
 if v_uid is null then return jsonb_build_object('allowed',false,'reason','not_authenticated'); end if;
 insert into public.profiles(id) values(v_uid) on conflict(id) do nothing;
 select * into v_row from public.profiles where id=v_uid for update;
 v_used:=case when v_row.daily_match_date=current_date then v_row.daily_match_count else 0 end;
 v_complete:=public.profile_is_complete(v_row);
 v_limit:=public.match_daily_limit_v2(coalesce(v_row.is_vip,false),coalesce(v_row.is_business,false),v_complete);
 if v_used < v_limit then
  update public.profiles set daily_match_count=v_used+1,daily_match_date=current_date where id=v_uid;
  return jsonb_build_object('allowed',true,'used',v_used+1,'limit',v_limit,'remaining',v_limit-(v_used+1),'purchased_matches',coalesce(v_row.purchased_matches,0),'profile_complete',v_complete);
 end if;
 if coalesce(v_row.purchased_matches,0)>0 then
  update public.profiles set purchased_matches=purchased_matches-1,daily_match_count=v_used,daily_match_date=current_date where id=v_uid returning purchased_matches into v_pack;
  return jsonb_build_object('allowed',true,'used',v_used,'limit',v_limit,'remaining',0,'paid_with_match_pack',true,'purchased_matches',v_pack,'profile_complete',v_complete);
 end if;
 update public.profiles set daily_match_count=v_used,daily_match_date=current_date where id=v_uid;
 return jsonb_build_object('allowed',false,'reason','limit_reached','used',v_used,'limit',v_limit,'remaining',0,'purchased_matches',0,'profile_complete',v_complete);
end;$$;
revoke all on function public.consume_match() from public,anon;
grant execute on function public.consume_match() to authenticated;

-- Compatibility entry point for older clients.
-- Included daily actions are shared; paid fallback balances remain type-specific.
create or replace function public.consume_ai_action(p_reason text default 'match')
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_uid uuid := auth.uid();
  v_row public.profiles%rowtype;
  v_limit integer;
  v_used integer;
  v_complete boolean;
  v_credit jsonb;
begin
  if p_reason='match' then
    return public.consume_match();
  end if;
  if p_reason is distinct from 'ask_ai' then
    raise exception 'Invalid action';
  end if;
  if v_uid is null then
    return jsonb_build_object('allowed',false,'reason','not_authenticated');
  end if;

  select * into v_row from public.profiles where id=v_uid for update;
  if not found then
    insert into public.profiles(id) values(v_uid) on conflict(id) do nothing;
    select * into v_row from public.profiles where id=v_uid for update;
  end if;

  v_used := case when v_row.daily_match_date=current_date then v_row.daily_match_count else 0 end;
  v_complete := public.profile_is_complete(v_row);
  v_limit := public.match_daily_limit_v2(
    coalesce(v_row.is_vip,false),
    coalesce(v_row.is_business,false),
    v_complete
  );

  if v_used < v_limit then
    update public.profiles
       set daily_match_count=v_used+1,
           daily_match_date=current_date
     where id=v_uid;

    return jsonb_build_object(
      'allowed',true,
      'ask_ai',true,
      'used',v_used+1,
      'limit',v_limit,
      'remaining',v_limit-(v_used+1),
      'credits',coalesce(v_row.credits,0),
      'profile_complete',v_complete,
      'is_vip',coalesce(v_row.is_vip,false),
      'is_business',coalesce(v_row.is_business,false)
    );
  end if;

  v_credit := public.consume_credit('ask_ai');
  if coalesce((v_credit->>'ok')::boolean,false) then
    return jsonb_build_object(
      'allowed',true,
      'ask_ai',true,
      'used',v_used,
      'limit',v_limit,
      'remaining',0,
      'paid_with_credit',true,
      'credits',coalesce((v_credit->>'credits')::integer,0),
      'profile_complete',v_complete,
      'is_vip',coalesce(v_row.is_vip,false),
      'is_business',coalesce(v_row.is_business,false)
    );
  end if;

  return jsonb_build_object(
    'allowed',false,
    'ask_ai',true,
    'reason','limit_reached',
    'used',v_used,
    'limit',v_limit,
    'remaining',0,
    'credits',coalesce((v_credit->>'credits')::integer,0),
    'profile_complete',v_complete,
    'is_vip',coalesce(v_row.is_vip,false),
    'is_business',coalesce(v_row.is_business,false)
  );
end
$function$;

revoke all on function public.consume_ai_action(text) from public,anon;
grant execute on function public.consume_ai_action(text) to authenticated;

-- Creating a profile must never let a client manufacture credits, purchased Matches or subscriptions.
revoke insert on public.profiles from authenticated,anon;
grant insert(id,full_name,country,dob,star_sign,age,profile_locked,avatar_url,saved_list,seen_list,disliked_list,user_ratings,watch_contacts) on public.profiles to authenticated;

create or replace function match_private.guard_locked_identity() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is not null and old.profile_locked is true and (new.full_name,new.country,new.dob,new.star_sign,new.profile_locked) is distinct from (old.full_name,old.country,old.dob,old.star_sign,old.profile_locked) then raise exception 'Saved identity is locked'; end if;
 return new;
end;$$;
revoke all on function match_private.guard_locked_identity() from public,anon,authenticated;
drop trigger if exists profiles_identity_lock on public.profiles;
create trigger profiles_identity_lock before update on public.profiles for each row execute function match_private.guard_locked_identity();

create or replace function public.save_locked_identity(p_name text,p_country text,p_dob text,p_sign text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_row public.profiles%rowtype; v_birth date;
begin
 if v_uid is null then raise exception 'Sign in first'; end if;
 insert into public.profiles(id) values(v_uid) on conflict(id) do nothing;
 select * into v_row from public.profiles where id=v_uid for update;
 if v_row.profile_locked is not true then
  p_name:=btrim(p_name);p_country:=btrim(p_country);p_dob:=btrim(p_dob);
  if p_name is null or length(p_name) not between 1 and 200 or p_country is null or length(p_country) not between 1 and 100 or p_dob is null or p_dob !~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' or p_sign is null or p_sign not in ('Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces') then raise exception 'Complete every identity field'; end if;
  v_birth:=to_date(p_dob,'DD/MM/YYYY');
  if to_char(v_birth,'DD/MM/YYYY')<>p_dob or v_birth>current_date or v_birth<current_date-interval '120 years' then raise exception 'Invalid birthdate'; end if;
  update public.profiles set full_name=p_name,country=p_country,dob=p_dob,star_sign=p_sign,age=extract(year from age(current_date,v_birth))::integer,profile_locked=true where id=v_uid returning * into v_row;
 end if;
 return jsonb_build_object('full_name',v_row.full_name,'country',v_row.country,'dob',v_row.dob,'star_sign',v_row.star_sign,'age',v_row.age,'profile_locked',v_row.profile_locked);
end;$$;
revoke all on function public.save_locked_identity(text,text,text,text) from public,anon;
grant execute on function public.save_locked_identity(text,text,text,text) to authenticated;
