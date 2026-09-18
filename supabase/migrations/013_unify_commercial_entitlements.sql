-- Commercial architecture source of truth.
-- Included daily AI actions are shared between Match and Ask AI:
-- guest 3 (client metered), registered 5, VIP 10, Business 50.
-- After the included allowance is exhausted, paid top-ups are type-specific:
-- purchased_matches for Match; credits for Ask AI.

comment on column public.profiles.daily_match_count is
'Legacy column name: included AI actions consumed today (Match or Ask AI). Server-managed.';

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
