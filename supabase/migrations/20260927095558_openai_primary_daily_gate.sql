-- MatchApp adult OpenAI-first routing: one atomic, service-only daily budget gate.
-- Execute as a migration before deploying a proxy that invokes claim_openai_primary_slot.
-- All days are measured in UTC. Reserved attempts count even when the provider fails.

create table if not exists match_private.openai_primary_daily_usage (
  usage_day date primary key,
  attempts integer not null default 0 check (attempts >= 0)
);

alter table match_private.openai_primary_daily_usage enable row level security;
revoke all on match_private.openai_primary_daily_usage from public, anon, authenticated;

create or replace function public.claim_openai_primary_slot(p_limit integer default 100)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, match_private
as $$
declare
  v_attempts integer;
begin
  -- This function has NO public grant. Also reject invalid or unlimited caps.
  if p_limit is null or p_limit < 1 or p_limit > 200 then
    return false;
  end if;

  insert into match_private.openai_primary_daily_usage (usage_day, attempts)
  values ((timezone('UTC', now()))::date, 1)
  on conflict (usage_day) do update
    set attempts = match_private.openai_primary_daily_usage.attempts + 1
    where match_private.openai_primary_daily_usage.attempts < p_limit
  returning attempts into v_attempts;

  return coalesce(v_attempts <= p_limit, false);
end;
$$;

revoke all on function public.claim_openai_primary_slot(integer) from public, anon, authenticated;
grant execute on function public.claim_openai_primary_slot(integer) to service_role;
