-- Applied to production Supabase on 20261009124006; source-controlled for reproducibility.
-- Additional independent abuse ceiling so timeouts/refunded requests cannot
-- generate unlimited billable upstream model attempts.
create table if not exists public.jonas_chat_attempts(
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 attempted_at timestamptz not null default now()
);
create index if not exists jonas_attempts_user_time on public.jonas_chat_attempts(user_id,attempted_at desc);
alter table public.jonas_chat_attempts enable row level security;
revoke all on public.jonas_chat_attempts from anon,authenticated;

create or replace function public.jonas_track_attempt(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare nowtime timestamptz:=now();tenmin integer;daily integer;
begin
 if p_user_id is null or not exists(select 1 from auth.users where id=p_user_id) then
  return jsonb_build_object('allowed',false,'reason','no_user');end if;
 perform pg_advisory_xact_lock(hashtextextended('jonas_attempt:'||p_user_id::text,0));
 select count(*) filter(where attempted_at>=nowtime-interval '10 minutes'),
        count(*) filter(where attempted_at>=nowtime-interval '24 hours')
 into tenmin,daily from public.jonas_chat_attempts
 where user_id=p_user_id and attempted_at>=nowtime-interval '24 hours';
 if tenmin>=20 or daily>=100 then return jsonb_build_object('allowed',false,'reason','retry_limit');end if;
 insert into public.jonas_chat_attempts(user_id) values(p_user_id);
 return jsonb_build_object('allowed',true);
end $$;
revoke all on function public.jonas_track_attempt(uuid) from public,anon,authenticated;
grant execute on function public.jonas_track_attempt(uuid) to service_role;

create or replace function public.prune_jonas_chat_attempts()
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare deleted integer;
begin
 delete from public.jonas_chat_attempts where attempted_at<now()-interval '8 days';
 get diagnostics deleted=row_count;
 return deleted;
end $$;
revoke all on function public.prune_jonas_chat_attempts() from public,anon,authenticated;
grant execute on function public.prune_jonas_chat_attempts() to service_role;
