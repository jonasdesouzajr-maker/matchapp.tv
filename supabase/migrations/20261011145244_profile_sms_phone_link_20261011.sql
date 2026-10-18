alter table public.profiles
 add column if not exists sms_communications_opt_in boolean not null default false,
 add column if not exists sms_communications_updated_at timestamptz;
comment on column public.profiles.sms_communications_opt_in is 'Optional SMS communications opt-in; false by default. Verification SMS remains separate.';
create or replace function public.can_link_phone_for_profile(candidate_phone text)
returns boolean language sql security definer set search_path = '' stable
as $$
 select auth.uid() is not null
  and candidate_phone ~ '^[+][1-9][0-9]{7,14}$'
  and not exists(
   select 1 from auth.users u
   where u.id <> auth.uid()
   and (u.phone=candidate_phone or u.phone_change=candidate_phone)
  )
$$;
revoke all on function public.can_link_phone_for_profile(text) from public, anon;
grant execute on function public.can_link_phone_for_profile(text) to authenticated;
create or replace function public.enforce_verified_phone_sms_consent()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if new.sms_communications_opt_in is true
  and not exists(select 1 from auth.users u
   where u.id=new.id and u.phone is not null and u.phone<>'' and u.phone_confirmed_at is not null)
 then raise exception 'A verified account phone is required for SMS communications' using errcode='23514';
 end if;
 return new;
end;
$$;
drop trigger if exists profiles_sms_consent_guard on public.profiles;
create trigger profiles_sms_consent_guard before insert or update of sms_communications_opt_in on public.profiles
for each row execute function public.enforce_verified_phone_sms_consent();