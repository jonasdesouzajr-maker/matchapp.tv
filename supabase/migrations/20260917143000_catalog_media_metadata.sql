-- Public, non-personal enrichment data for MatchApp catalogue/trending titles.
-- Writes are server-only. Browser clients may only read the reviewed metadata.

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
  vote_average numeric(4,2) check (vote_average is null or (vote_average >= 0 and vote_average <= 10)),
  original_language text,
  preview_kind text check (preview_kind is null or preview_kind in ('video','audio')),
  preview_provider text,
  preview_url text,
  preview_embed_url text,
  availability jsonb not null default '{}'::jsonb check (jsonb_typeof(availability) = 'object'),
  source_updated_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists catalog_media_metadata_title_idx
  on public.catalog_media_metadata (normalized_title);
create index if not exists catalog_media_metadata_tmdb_idx
  on public.catalog_media_metadata (tmdb_id)
  where tmdb_id is not null;
create index if not exists catalog_media_metadata_trending_idx
  on public.catalog_media_metadata (is_trending, trending_rank)
  where is_trending = true;

alter table public.catalog_media_metadata enable row level security;

-- Supabase projects created under the newer Data API defaults may not expose
-- newly created public tables automatically, so grant read access explicitly.
grant select on table public.catalog_media_metadata to anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.catalog_media_metadata from anon, authenticated;

drop policy if exists "Public catalog metadata is readable" on public.catalog_media_metadata;
create policy "Public catalog metadata is readable"
  on public.catalog_media_metadata
  for select
  to anon, authenticated
  using (true);

comment on table public.catalog_media_metadata is
  'Public catalogue/trending enrichment. Server-written only; contains no user data. Kids flags are derived exclusively from the reviewed local Kids allowlist.';
comment on column public.catalog_media_metadata.kids_approved is
  'True only when the exact title/year/type is already present in kids/kids.js. Remote sources never approve Kids content.';
