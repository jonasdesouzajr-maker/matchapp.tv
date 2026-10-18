create table if not exists public.news_scheduler_auth (
  id smallint primary key default 1 check (id=1),
  token text not null default encode(gen_random_bytes(32),'hex'),
  created_at timestamptz not null default now(),
  rotated_at timestamptz not null default now()
);

alter table public.news_scheduler_auth enable row level security;
revoke all on public.news_scheduler_auth from anon, authenticated;
insert into public.news_scheduler_auth(id) values(1) on conflict(id) do nothing;
