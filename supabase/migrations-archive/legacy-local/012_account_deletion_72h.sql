-- 72-hour account deletion + same-email return window.
-- Run in Supabase SQL editor after review. Idempotent.

create table if not exists public.account_deletion_requests (
  user_id uuid primary key,
  email text not null,
  requested_at timestamptz not null default now(),
  purge_after timestamptz not null default (now() + interval '72 hours'),
  purged_at timestamptz
);

create unique index if not exists account_deletion_email_window
  on public.account_deletion_requests (lower(email))
  where purged_at is null;

alter table public.account_deletion_requests enable row level security;

create or replace function public.request_account_deletion()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  mail text;
begin
  if uid is null then
    raise exception 'Sign in required';
  end if;
  select email into mail from auth.users where id = uid;
  insert into public.account_deletion_requests(user_id, email)
  values (uid, coalesce(mail, ''))
  on conflict (user_id) do update
    set requested_at = now(),
        purge_after = now() + interval '72 hours',
        purged_at = null;
  begin
    update public.profiles
       set profile_locked = true
     where id = uid;
  exception when undefined_table then
    null;
  end;
  return jsonb_build_object(
    'ok', true,
    'purge_after_hours', 72,
    'message', 'Deletion scheduled. The same email can register again after 72 hours.'
  );
end;
$$;

revoke all on function public.request_account_deletion() from public;
grant execute on function public.request_account_deletion() to authenticated;
