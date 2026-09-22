alter table public.profiles
  add column nickname text;

alter table public.profiles
  add constraint profiles_nickname_length_check
  check (
    nickname is null
    or (
      char_length(nickname) between 1 and 30
      and nickname = btrim(nickname)
    )
  );

comment on column public.profiles.nickname is
  'User-chosen form of address for Ask AI. Nullable; clearing it means no saved form of address.';
