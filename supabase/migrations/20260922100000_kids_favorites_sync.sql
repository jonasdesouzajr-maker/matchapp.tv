-- Kids favorites follow the signed-in family account (2026-09-22).
-- Additive: one capped JSON column; owners may read/update only this column
-- through the existing profiles_*_own RLS policies. The client renders a
-- favorite only after intersecting it with the reviewed Kids allowlist.
alter table public.profiles add column if not exists kids_favorites jsonb not null default '[]'::jsonb;
alter table public.profiles drop constraint if exists profiles_kids_favorites_shape;
alter table public.profiles add constraint profiles_kids_favorites_shape check (
  case when jsonb_typeof(kids_favorites) = 'array'
       then jsonb_array_length(kids_favorites) <= 100 and pg_column_size(kids_favorites) <= 8192
       else false end
);
grant select (kids_favorites), update (kids_favorites) on public.profiles to authenticated;
comment on column public.profiles.kids_favorites is 'Curated Kids Mode favorite slugs (max 100). Rendered only after intersecting with the reviewed Kids allowlist.';
