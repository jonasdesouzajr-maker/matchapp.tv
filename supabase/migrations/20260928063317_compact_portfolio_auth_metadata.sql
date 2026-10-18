-- Portfolio data must not be embedded in every signed access token.
-- Preserve legacy payloads privately and migrate their usable records before
-- stripping only these six application fields from auth metadata. Old clients
-- are handled by the same trigger, so refreshing a token stays effective.
create table if not exists match_private.legacy_portfolio_metadata (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
alter table match_private.legacy_portfolio_metadata enable row level security;
revoke all on match_private.legacy_portfolio_metadata from public, anon, authenticated;

create or replace function match_private.merge_legacy_title_list(current_list jsonb, legacy_list jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg(item order by position), '[]'::jsonb)
  from (
    select distinct on (coalesce(item->>'title', item #>> '{}')) item, position
    from jsonb_array_elements(
      (case when jsonb_typeof(current_list)='array' then current_list else '[]'::jsonb end) ||
      (case when jsonb_typeof(legacy_list)='array' then legacy_list else '[]'::jsonb end)
    ) with ordinality as entries(item, position)
    order by coalesce(item->>'title', item #>> '{}'), position
  ) merged;
$$;
revoke all on function match_private.merge_legacy_title_list(jsonb,jsonb) from public, anon, authenticated;

create or replace function match_private.compact_portfolio_auth_metadata()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  fields constant text[] := array['saved_list','seen_list','disliked_list','user_ratings','match_history','match_exclusion_keys'];
  meta jsonb := coalesce(new.raw_user_meta_data,'{}'::jsonb);
  item jsonb;
  title text;
  field text;
  stamp bigint;
begin
  if not meta ?| fields then return new; end if;
  insert into match_private.legacy_portfolio_metadata(user_id,payload)
    select new.id, jsonb_object_agg(key,value) from jsonb_each(meta) where key=any(fields)
  on conflict(user_id) do update set
    payload=legacy_portfolio_metadata.payload || excluded.payload, updated_at=now();

  insert into public.profiles(id) values(new.id) on conflict(id) do nothing;
  update public.profiles p set
    saved_list=match_private.merge_legacy_title_list(p.saved_list,meta->'saved_list'),
    seen_list=match_private.merge_legacy_title_list(p.seen_list,meta->'seen_list'),
    disliked_list=match_private.merge_legacy_title_list(p.disliked_list,meta->'disliked_list'),
    user_ratings=(case when jsonb_typeof(meta->'user_ratings')='object' then meta->'user_ratings' else '{}'::jsonb end) || coalesce(p.user_ratings,'{}'::jsonb)
  where p.id=new.id;

  foreach field in array array['match_history','saved_list','seen_list','disliked_list'] loop
    if jsonb_typeof(meta->field) is distinct from 'array' then continue; end if;
    for item in select value from jsonb_array_elements(meta->field) loop
      if jsonb_typeof(item)='string' then item=jsonb_build_object('title',item #>> '{}'); end if;
      title=left(item->>'title',300);
      if coalesce(trim(title),'')='' then continue; end if;
      stamp=case when item->>'addedAt' ~ '^[0-9]{1,18}$' then (item->>'addedAt')::bigint else 0 end;
      item=item || jsonb_build_object('title',title,'addedAt',stamp,'action',case field when 'saved_list' then 'save' when 'seen_list' then 'seen' when 'disliked_list' then 'dislike' else coalesce(item->>'action','shown') end);
      insert into match_private.title_exclusions(user_id,title_key,item)
      values(new.id,match_private.title_key(title),item) on conflict do nothing;
    end loop;
  end loop;
  if jsonb_typeof(meta->'match_exclusion_keys')='array' then
    for title in select value from jsonb_array_elements_text(meta->'match_exclusion_keys') loop
      if title ~ '^[[:alnum:]]+$' and char_length(title)<=300 then
        insert into match_private.title_exclusions(user_id,title_key,item)
        values(new.id,title,jsonb_build_object('title',coalesce((select c.entry->>'title' from match_private.catalog c where c.title_key=title),title),'action','shown','addedAt',0)) on conflict do nothing;
      end if;
    end loop;
  end if;
  new.raw_user_meta_data=meta-fields;
  return new;
end;
$$;
revoke all on function match_private.compact_portfolio_auth_metadata() from public, anon, authenticated;
drop trigger if exists compact_portfolio_auth_metadata on auth.users;
create trigger compact_portfolio_auth_metadata before update of raw_user_meta_data on auth.users
for each row execute function match_private.compact_portfolio_auth_metadata();

-- Idempotent backfill; the trigger archives and merges data atomically.
update auth.users set raw_user_meta_data=raw_user_meta_data
where raw_user_meta_data ?| array['saved_list','seen_list','disliked_list','user_ratings','match_history','match_exclusion_keys'];
