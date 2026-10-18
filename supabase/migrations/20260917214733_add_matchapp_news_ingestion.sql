create extension if not exists pgcrypto;
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  source_id text,
  source_name text not null,
  source_domain text,
  url text not null unique,
  title text not null,
  description text,
  content text,
  language text not null default 'und',
  country text not null default 'GLOBAL',
  category text not null default 'general',
  authors text[] not null default '{}',
  images text[] not null default '{}',
  published_at timestamptz not null,
  fingerprint text not null,
  canonical_id uuid references public.articles(id) on delete set null,
  breaking boolean not null default false,
  score double precision not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  raw_json jsonb,
  inserted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists articles_published_at_idx on public.articles (published_at desc);
create index if not exists articles_fingerprint_idx on public.articles (fingerprint);
create index if not exists articles_canonical_id_idx on public.articles (canonical_id);
create index if not exists articles_latest_rank_idx on public.articles (breaking desc, score desc, published_at desc);
create index if not exists articles_language_idx on public.articles (language);
create index if not exists articles_country_idx on public.articles (country);
create index if not exists articles_category_idx on public.articles (category);
create index if not exists articles_source_domain_idx on public.articles (source_domain);
create index if not exists articles_metadata_gin_idx on public.articles using gin (metadata);

create table if not exists public.ingestion_logs (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null,
  poll_mode text,
  status_code integer,
  response_time_ms integer,
  received_count integer not null default 0,
  inserted_count integer not null default 0,
  duplicate_count integer not null default 0,
  error_message text,
  fallback_used boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists ingestion_logs_created_at_idx on public.ingestion_logs (created_at desc);
create index if not exists ingestion_logs_status_code_idx on public.ingestion_logs (status_code);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  severity text not null check (severity in ('info','warning','critical')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists alerts_created_at_idx on public.alerts (created_at desc);
create index if not exists alerts_unresolved_idx on public.alerts (created_at desc) where resolved_at is null;

create table if not exists public.news_topic_windows (
  topic_key text not null,
  bucket_start timestamptz not null,
  article_count integer not null default 0,
  primary key (topic_key,bucket_start)
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists articles_set_updated_at on public.articles;
create trigger articles_set_updated_at before update on public.articles
for each row execute function public.set_updated_at();

alter table public.articles enable row level security;
alter table public.ingestion_logs enable row level security;
alter table public.alerts enable row level security;
alter table public.news_topic_windows enable row level security;

revoke all on public.articles, public.ingestion_logs, public.alerts, public.news_topic_windows from anon, authenticated;

create or replace view public.latest_news_public as
select
  id,
  coalesce(canonical_id,id) as display_canonical_id,
  source_name,
  source_domain,
  url,
  title,
  description,
  language,
  country,
  category,
  authors,
  images,
  published_at,
  breaking,
  score,
  metadata
from public.articles
where coalesce((metadata->>'can_publish')::boolean,false)=true;

revoke all on public.latest_news_public from anon, authenticated;
grant select on public.latest_news_public to service_role;

create or replace function public.get_matchapp_secret(secret_name text)
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare v text;
begin
  if coalesce(auth.role(),'') <> 'service_role' then
    raise exception 'insufficient privilege';
  end if;
  select decrypted_secret into v
  from vault.decrypted_secrets
  where name=secret_name
  order by created_at desc
  limit 1;
  return v;
end;
$$;
revoke all on function public.get_matchapp_secret(text) from public, anon, authenticated;
grant execute on function public.get_matchapp_secret(text) to service_role;
