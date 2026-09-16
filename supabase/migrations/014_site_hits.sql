-- Daily page access counter for the 17:00 Brazil briefing.
-- Paste this whole file in Supabase → SQL Editor → Run.

create table if not exists public.site_hits (
  id bigserial primary key,
  day date not null,
  path text not null default '/',
  vid text not null,
  created_at timestamptz not null default now()
);

create index if not exists site_hits_day_idx on public.site_hits (day);
create index if not exists site_hits_day_vid_idx on public.site_hits (day, vid);

alter table public.site_hits enable row level security;

drop policy if exists site_hits_insert on public.site_hits;
create policy site_hits_insert on public.site_hits
  for insert to anon, authenticated
  with check (true);

create or replace function public.site_hits_today()
returns json
language sql
security definer
set search_path = public
as $$
  with bounds as (
    select (timezone('America/Sao_Paulo', now()))::date as today
  )
  select json_build_object(
    'timezone', 'America/Sao_Paulo',
    'today', b.today,
    'views_today', (select count(*)::int from public.site_hits h where h.day = b.today),
    'visitors_today', (select count(distinct h.vid)::int from public.site_hits h where h.day = b.today),
    'views_yesterday', (select count(*)::int from public.site_hits h where h.day = b.today - 1),
    'visitors_yesterday', (select count(distinct h.vid)::int from public.site_hits h where h.day = b.today - 1)
  )
  from bounds b;
$$;

revoke all on function public.site_hits_today() from public;
grant execute on function public.site_hits_today() to anon, authenticated;
grant insert on public.site_hits to anon, authenticated;
grant usage, select on sequence public.site_hits_id_seq to anon, authenticated;
