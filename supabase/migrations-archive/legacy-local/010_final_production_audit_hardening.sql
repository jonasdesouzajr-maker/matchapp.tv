-- Final production audit hardening: required signup identity, deletable private history,
-- portfolio forget/allow-again, and a service-role-only runtime secret store.

create or replace function public.require_full_name_on_signup()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare v_name text;
begin
  v_name := trim(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''));
  if v_name = '' then
    raise exception 'Full name is required to create a MatchApp account';
  end if;
  new.raw_user_meta_data := coalesce(new.raw_user_meta_data,'{}'::jsonb) || jsonb_build_object('full_name', left(v_name,120));
  return new;
end;
$$;

drop trigger if exists require_full_name_on_signup_trigger on auth.users;
create trigger require_full_name_on_signup_trigger
before insert on auth.users
for each row execute function public.require_full_name_on_signup();

-- Existing accounts remain valid. If their identity provider already supplied a name,
-- use it to repair only currently-empty profile names.
update public.profiles p
set full_name = left(trim(coalesce(u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'name','')),120)
from auth.users u
where p.id=u.id
  and coalesce(trim(p.full_name),'')=''
  and coalesce(trim(u.raw_user_meta_data->>'full_name'),trim(u.raw_user_meta_data->>'name'),'')<>'';

-- Owners may delete only their own cloud history rows.
drop policy if exists "Users delete own activity history" on public.user_activity_history;
create policy "Users delete own activity history"
on public.user_activity_history for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users delete own preference history" on public.user_preference_history;
create policy "Users delete own preference history"
on public.user_preference_history for delete
to authenticated
using ((select auth.uid()) = user_id);

grant delete on public.user_activity_history to authenticated;
grant delete on public.user_preference_history to authenticated;

-- Optional runtime secret fallback. No browser role can read this table.
create table if not exists public.runtime_secrets (
  key text primary key,
  secret_value text not null,
  updated_at timestamptz not null default now()
);
alter table public.runtime_secrets enable row level security;
revoke all on public.runtime_secrets from anon, authenticated;
grant select on public.runtime_secrets to service_role;

-- Extend the private cross-device exclusion/history store with an explicit
-- forget action. It is still protected by auth.uid() inside this SECURITY
-- DEFINER function and the implementation lives in the non-exposed schema.
create or replace function match_private.portfolio_impl(p_action text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare uid uuid:=auth.uid(); i jsonb; t text; meta jsonb; arr jsonb;
begin
 if uid is null or not exists(select 1 from auth.users where id=uid) then raise exception 'Sign in required'; end if;
 if p_action='remember' then
  if jsonb_typeof(p_payload->'items')<>'array' or jsonb_array_length(p_payload->'items')>1000 then raise exception 'Invalid history batch'; end if;
  for i in select value from jsonb_array_elements(p_payload->'items') loop
   t:=left(i->>'title',300);
   if coalesce(t,'')='' then continue; end if;
   insert into match_private.title_exclusions(user_id,title_key,item)
   values(uid,match_private.title_key(t),jsonb_build_object('title',t,'action',left(coalesce(i->>'action','rated'),20),'addedAt',coalesce((i->>'addedAt')::bigint,extract(epoch from now())::bigint*1000),'posterUrl',left(coalesce(i->>'posterUrl',''),1500),'streamUrl',left(coalesce(i->>'streamUrl',''),1500),'reason',left(coalesce(i->>'reason',''),300)))
   on conflict(user_id,title_key) do update set item=excluded.item
   where (excluded.item->>'action')<>'rated' and (excluded.item->>'addedAt')::bigint >= (title_exclusions.item->>'addedAt')::bigint;
  end loop;
 elsif p_action='forget' then
  t:=left(trim(coalesce(p_payload->>'title','')),300);
  if t='' then raise exception 'Title is required'; end if;
  delete from match_private.title_exclusions where user_id=uid and title_key=match_private.title_key(t);
 elsif p_action='list' then
  select raw_user_meta_data into meta from auth.users where id=uid;
  if jsonb_typeof(meta->'match_history')='array' then
   for i in select value from jsonb_array_elements(meta->'match_history') loop
    if jsonb_typeof(i)='object' and coalesce(i->>'title','')<>'' then
     insert into match_private.title_exclusions values(uid,match_private.title_key(i->>'title'),i||jsonb_build_object('addedAt',coalesce(i->'addedAt','0'::jsonb))) on conflict do nothing;
    end if;
   end loop;
  end if;
  if jsonb_typeof(meta->'match_exclusion_keys')='array' then
   for t in select value from jsonb_array_elements_text(meta->'match_exclusion_keys') loop
    if t ~ '^[[:alnum:]]{1,300}$' then
     insert into match_private.title_exclusions values(uid,t,jsonb_build_object('title',coalesce((select entry->>'title' from match_private.catalog where title_key=t),t),'action','rated','addedAt',0)) on conflict do nothing;
    end if;
   end loop;
  end if;
  foreach t in array array['saved_list','seen_list','disliked_list'] loop
   arr:=meta->t;
   if jsonb_typeof(arr)='array' then
    for i in select value from jsonb_array_elements(arr) loop
     if jsonb_typeof(i)='string' then i:=jsonb_build_object('title',i #>> '{}'); end if;
     if coalesce(i->>'title','')<>'' then
      insert into match_private.title_exclusions values(uid,match_private.title_key(i->>'title'),i||jsonb_build_object('action',case t when 'saved_list' then 'save' when 'seen_list' then 'seen' else 'dislike' end,'addedAt',coalesce(i->'addedAt','0'::jsonb))) on conflict do nothing;
     end if;
    end loop;
   end if;
  end loop;
 else raise exception 'Unknown history action'; end if;
 return jsonb_build_object(
   'keys',(select coalesce(jsonb_agg(title_key),'[]'::jsonb) from match_private.title_exclusions where user_id=uid),
   'history',(select coalesce(jsonb_agg(item order by (item->>'addedAt')::bigint desc),'[]'::jsonb) from match_private.title_exclusions where user_id=uid)
 );
end
$$;
