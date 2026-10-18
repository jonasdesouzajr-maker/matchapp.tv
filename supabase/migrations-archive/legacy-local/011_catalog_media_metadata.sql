-- Public, server-written enrichment for MatchApp's existing catalogues.
-- This table contains no user data. Browsers may read it; only the backend
-- service role may mutate it. Kids approval can only be set by catalog-sync
-- after an exact match against the reviewed local Kids allowlist.

create table if not exists public.catalog_media_metadata (
  source_key text primary key,
  title text not null check (length(title) between 1 and 240),
  normalized_title text not null check (length(normalized_title) between 1 and 240),
  year integer check (year is null or year between 1888 and 2100),
  media_kind text not null check (media_kind in ('movie','tv','music','podcast','audiobook','audio','other')),
  tmdb_id bigint check (tmdb_id is null or tmdb_id > 0),
  source text not null check (source in ('tmdb','itunes')),
  is_catalog_title boolean not null default false,
  is_trending boolean not null default false,
  trending_rank integer check (trending_rank is null or trending_rank > 0),
  kids_approved boolean not null default false,
  kids_age_bands text[] not null default '{}',
  poster_url text,
  poster_large_url text,
  poster_original_url text,
  backdrop_url text,
  overview text,
  genres text[] not null default '{}',
  runtime_minutes integer check (runtime_minutes is null or runtime_minutes between 1 and 1440),
  content_rating text,
  vote_average numeric check (vote_average is null or vote_average between 0 and 10),
  original_language text,
  preview_kind text check (preview_kind is null or preview_kind in ('video','audio')),
  preview_provider text,
  preview_url text,
  preview_embed_url text,
  availability jsonb not null default '{}'::jsonb check (jsonb_typeof(availability)='object'),
  source_updated_at timestamptz,
  updated_at timestamptz not null default now()
);

comment on table public.catalog_media_metadata is
  'Public catalogue/trending enrichment. Server-written only; contains no user data. Kids flags are derived exclusively from the reviewed local Kids allowlist.';
comment on column public.catalog_media_metadata.kids_approved is
  'True only when exact title/year/type is already present in kids/kids.js. Remote sources never approve Kids content.';

create index if not exists catalog_media_metadata_lookup_idx
  on public.catalog_media_metadata (normalized_title, year, media_kind);
create index if not exists catalog_media_metadata_trending_idx
  on public.catalog_media_metadata (is_trending, trending_rank)
  where is_trending = true;

alter table public.catalog_media_metadata enable row level security;
revoke all on table public.catalog_media_metadata from anon, authenticated;
grant select on table public.catalog_media_metadata to anon, authenticated;
grant all on table public.catalog_media_metadata to service_role;

drop policy if exists "Public catalog metadata is readable" on public.catalog_media_metadata;
create policy "Public catalog metadata is readable"
  on public.catalog_media_metadata
  for select
  to anon, authenticated
  using (true);
