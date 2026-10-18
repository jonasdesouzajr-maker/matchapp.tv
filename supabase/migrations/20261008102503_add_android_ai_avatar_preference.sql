alter table public.profiles add column if not exists preferred_ai_avatar text not null default 'jonas';
alter table public.profiles drop constraint if exists profiles_preferred_ai_avatar_check;
alter table public.profiles add constraint profiles_preferred_ai_avatar_check check (preferred_ai_avatar in ('jonas','aureya'));
comment on column public.profiles.preferred_ai_avatar is 'Account-scoped AI persona preference in the installed Android experience; independent of profile avatar.';