-- Persist complete non-user title facts alongside existing catalog media metadata.
-- Additive only: no existing title rows or policies are removed.

alter table public.catalog_media_metadata
  add column if not exists origin_countries text[] not null default '{}',
  add column if not exists cast jsonb not null default '[]'::jsonb;

alter table public.catalog_media_metadata
  drop constraint if exists catalog_media_metadata_cast_is_array;

alter table public.catalog_media_metadata
  add constraint catalog_media_metadata_cast_is_array
  check (jsonb_typeof(cast) = 'array');

comment on column public.catalog_media_metadata.origin_countries is
  'Verified ISO 3166-1 alpha-2 production/origin country codes from the title source.';

comment on column public.catalog_media_metadata.cast is
  'Verified principal cast entries as JSON objects with name and character when available.';
