-- MatchApp migration 014
-- Final daily included-action policy:
-- guest 3 (client-side), signed-in free 5, VIP 10, Business 50.
-- Profile completeness still controls identity/profile UX, but no longer reduces
-- the included allowance for an authenticated free account.
create or replace function public.match_daily_limit_v2(
    p_is_vip boolean, p_is_business boolean, p_profile_complete boolean
)
returns integer
language sql
immutable
as $$
    select case
        when p_is_business then 50
        when p_is_vip then 10
        else 5
    end;
$$;

comment on function public.match_daily_limit_v2(boolean,boolean,boolean)
is 'Included AI actions/day: signed-in free 5, VIP 10, Business 50. Third argument retained for RPC compatibility.';

grant execute on function public.match_daily_limit_v2(boolean, boolean, boolean) to authenticated;
