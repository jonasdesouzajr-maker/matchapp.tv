-- Keep read-only quota status aligned with the actual consume_match entitlement model.
create or replace function public.match_status()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
    v_uid uuid := auth.uid();
    v_row public.profiles%rowtype;
    v_limit integer;
    v_used integer;
    v_recent timestamptz[];
    v_oldest timestamptz;
    v_complete boolean;
    v_unlimited boolean;
begin
    if v_uid is null then return jsonb_build_object('authenticated',false); end if;
    select * into v_row from public.profiles where id=v_uid;
    if not found then return jsonb_build_object('authenticated',false,'reason','no_profile'); end if;
    v_used := case when v_row.daily_match_date=current_date then v_row.daily_match_count else 0 end;
    v_complete := public.profile_is_complete(v_row);
    v_unlimited := coalesce(v_row.is_vip,false) and not coalesce(v_row.is_business,false);
    v_limit := case when v_unlimited then 2147483647 else public.match_daily_limit_v2(coalesce(v_row.is_vip,false),coalesce(v_row.is_business,false),v_complete) end;
    select coalesce(array_agg(ts),'{}'::timestamptz[]) into v_recent from unnest(coalesce(v_row.share_rewards,'{}'::timestamptz[])) ts where ts>now()-interval '6 hours';
    select min(ts) into v_oldest from unnest(v_recent) ts;
    return jsonb_build_object(
      'authenticated',true,'used',v_used,'limit',v_limit,
      'remaining',case when v_unlimited then 2147483647 else greatest(0,v_limit-v_used) end,
      'unlimited',v_unlimited,
      'is_vip',coalesce(v_row.is_vip,false),'is_business',coalesce(v_row.is_business,false),
      'profile_complete',v_complete,'purchased_matches',coalesce(v_row.purchased_matches,0),'credits',coalesce(v_row.credits,0),
      'share_rewards_left',greatest(0,3-coalesce(array_length(v_recent,1),0)),
      'reset_in_seconds',case when coalesce(array_length(v_recent,1),0)>=3 then greatest(0,extract(epoch from(v_oldest+interval '6 hours'-now()))::int) else 0 end
    );
end
$$;

-- Trigger-only helper should not be directly callable from browser roles.
revoke execute on function public.require_full_name_on_signup() from public, anon, authenticated;
revoke execute on function public.complete_registration(text,text,text,text,text,text,boolean,boolean,boolean) from anon;
grant execute on function public.complete_registration(text,text,text,text,text,text,boolean,boolean,boolean) to authenticated;
