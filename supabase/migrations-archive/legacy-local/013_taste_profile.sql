-- Taste questionnaire (Match only). Run this once in the Supabase SQL editor.
create table if not exists public.user_taste (
  user_id uuid primary key references auth.users (id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  exclude_titles text[] not null default '{}',
  moods text[] not null default '{}',
  vibes text[] not null default '{}',
  cats text[] not null default '{}',
  ratings text[] not null default '{}',
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.user_taste enable row level security;
drop policy if exists user_taste_own on public.user_taste;
create policy user_taste_own on public.user_taste
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
grant select, insert, update, delete on public.user_taste to authenticated;
