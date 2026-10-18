-- Durable registration identity + private activity history.
-- Core identity is write-once. Preferences remain editable and keep an audit trail.
alter table public.profiles add column if not exists registration_completed_at timestamptz;
alter table public.profiles add column if not exists preferred_language text;
alter table public.profiles add column if not exists preferred_region text;
alter table public.profiles add column if not exists marketing_consent boolean not null default false;
alter table public.profiles add column if not exists terms_accepted_at timestamptz;
alter table public.profiles add column if not exists privacy_accepted_at timestamptz;

create table if not exists public.user_activity_history(
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 event_type text not null check(length(event_type) between 1 and 80),
 event_label text check(event_label is null or length(event_label)<=240),
 event_data jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists user_activity_history_user_created_idx on public.user_activity_history(user_id,created_at desc);
alter table public.user_activity_history enable row level security;
drop policy if exists user_activity_history_select_own on public.user_activity_history;
create policy user_activity_history_select_own on public.user_activity_history for select to authenticated using(auth.uid()=user_id);
revoke all on public.user_activity_history from anon,authenticated;
grant select on public.user_activity_history to authenticated;

create table if not exists public.user_preference_history(
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 preference_key text not null check(length(preference_key) between 1 and 80),
 previous_value jsonb,
 new_value jsonb,
 changed_at timestamptz not null default now()
);
create index if not exists user_preference_history_user_changed_idx on public.user_preference_history(user_id,changed_at desc);
alter table public.user_preference_history enable row level security;
drop policy if exists user_preference_history_select_own on public.user_preference_history;
create policy user_preference_history_select_own on public.user_preference_history for select to authenticated using(auth.uid()=user_id);
revoke all on public.user_preference_history from anon,authenticated;
grant select on public.user_preference_history to authenticated;

create or replace function public.record_user_activity(p_type text,p_label text default null,p_data jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then return; end if;
 if p_type is null or length(btrim(p_type)) not between 1 and 80 then raise exception 'Invalid activity type'; end if;
 -- Never accept secrets, auth tokens, raw passwords, payment data, or arbitrary huge payloads.
 if octet_length(coalesce(p_data,'{}'::jsonb)::text)>4096 then raise exception 'Activity payload too large'; end if;
 insert into public.user_activity_history(user_id,event_type,event_label,event_data)
 values(v_uid,btrim(p_type),left(nullif(btrim(p_label),''),240),coalesce(p_data,'{}'::jsonb));
end;$$;
revoke all on function public.record_user_activity(text,text,jsonb) from public,anon;
grant execute on function public.record_user_activity(text,text,jsonb) to authenticated;

create or replace function public.save_user_preference(p_key text,p_value jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_old jsonb;v_allowed text[]:=array['preferred_language','preferred_region','marketing_consent'];
begin
 if v_uid is null then raise exception 'Sign in first'; end if;
 if not (p_key=any(v_allowed)) then raise exception 'Preference is not editable'; end if;
 insert into public.profiles(id) values(v_uid) on conflict(id) do nothing;
 execute format('select to_jsonb(%I) from public.profiles where id=$1',p_key) into v_old using v_uid;
 if v_old is distinct from p_value then
  insert into public.user_preference_history(user_id,preference_key,previous_value,new_value) values(v_uid,p_key,v_old,p_value);
  if p_key='marketing_consent' then update public.profiles set marketing_consent=coalesce((p_value#>>'{}')::boolean,false) where id=v_uid;
  elsif p_key='preferred_language' then update public.profiles set preferred_language=left(p_value#>>'{}',20) where id=v_uid;
  elsif p_key='preferred_region' then update public.profiles set preferred_region=left(p_value#>>'{}',100) where id=v_uid; end if;
 end if;
 return jsonb_build_object('ok',true,'key',p_key,'value',p_value);
end;$$;
revoke all on function public.save_user_preference(text,jsonb) from public,anon;
grant execute on function public.save_user_preference(text,jsonb) to authenticated;

-- Extend the write-once identity save with explicit policy acknowledgements.
create or replace function public.complete_registration(p_name text,p_country text,p_dob text,p_sign text,p_language text,p_region text,p_marketing boolean,p_accept_terms boolean,p_accept_privacy boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_identity jsonb;
begin
 if v_uid is null then raise exception 'Sign in first'; end if;
 if p_accept_terms is not true or p_accept_privacy is not true then raise exception 'Terms and privacy acceptance are required'; end if;
 v_identity:=public.save_locked_identity(p_name,p_country,p_dob,p_sign);
 update public.profiles set
  preferred_language=nullif(left(btrim(p_language),20),''),preferred_region=nullif(left(btrim(p_region),100),''),
  marketing_consent=coalesce(p_marketing,false),terms_accepted_at=coalesce(terms_accepted_at,now()),privacy_accepted_at=coalesce(privacy_accepted_at,now()),
  registration_completed_at=coalesce(registration_completed_at,now()) where id=v_uid;
 insert into public.user_activity_history(user_id,event_type,event_label,event_data)
 values(v_uid,'registration_completed','Registration completed',jsonb_build_object('language',p_language,'region',p_region,'marketing_consent',coalesce(p_marketing,false)));
 return v_identity||jsonb_build_object('registration_completed',true);
end;$$;
revoke all on function public.complete_registration(text,text,text,text,text,text,boolean,boolean,boolean) from public,anon;
grant execute on function public.complete_registration(text,text,text,text,text,text,boolean,boolean,boolean) to authenticated;
