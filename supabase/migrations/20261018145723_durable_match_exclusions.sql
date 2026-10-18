-- Durable adult title identity and user-owned exclusions. No entitlement,
-- public table privilege, RLS policy or Kids matching contract is changed.
begin;

-- Keep canonical reading state out of access tokens and beyond the reach of
-- old clients that replace their bounded legacy auth-metadata arrays.
create table if not exists match_private.reading_portfolios (
 user_id uuid primary key references auth.users(id) on delete cascade,
 state jsonb not null default '{}'::jsonb
);
alter table match_private.reading_portfolios enable row level security;
revoke all on table match_private.reading_portfolios from public,anon,authenticated;

create or replace function match_private.merge_exclusion_item(p_old jsonb,p_new jsonb)
returns jsonb language plpgsql immutable set search_path='' as $$
declare merged jsonb:=coalesce(p_old,'{}'::jsonb)||coalesce(p_new,'{}'::jsonb); old_hard boolean; new_hard boolean;
begin
 old_hard:=lower(coalesce(p_old->>'action','')) in ('save','saved','watchlater','dislike','declined','notforme');
 new_hard:=lower(coalesce(p_new->>'action','')) in ('save','saved','watchlater','dislike','declined','notforme');
 if old_hard and (not new_hard or coalesce((p_old->>'addedAt')::numeric,0)>coalesce((p_new->>'addedAt')::numeric,0)) then
  merged:=merged||jsonb_build_object('action',p_old->'action','addedAt',p_old->'addedAt');
 elsif not new_hard and coalesce((p_old->>'addedAt')::numeric,0)>coalesce((p_new->>'addedAt')::numeric,0) then
  merged:=merged||jsonb_build_object('action',p_old->'action','addedAt',p_old->'addedAt');
 end if;
 merged:=merged||jsonb_build_object('identityKeys',(
  select coalesce(jsonb_agg(distinct value),'[]'::jsonb) from jsonb_array_elements(
   (case when jsonb_typeof(p_old->'identityKeys')='array' then p_old->'identityKeys' else '[]'::jsonb end)||
   (case when jsonb_typeof(p_new->'identityKeys')='array' then p_new->'identityKeys' else '[]'::jsonb end)
  )
 ));
 merged:=merged||jsonb_build_object('titleAliases',(
  select coalesce(jsonb_agg(value),'[]'::jsonb) from (select distinct value from jsonb_array_elements_text(
   jsonb_build_array(p_old->>'title',p_new->>'title')||
   (case when jsonb_typeof(p_old->'titleAliases')='array' then p_old->'titleAliases' else '[]'::jsonb end)||
   (case when jsonb_typeof(p_new->'titleAliases')='array' then p_new->'titleAliases' else '[]'::jsonb end)
  ) where value is not null and trim(value)<>'' limit 30) names
 ));
 if coalesce(p_new->>'posterUrl','')='' then merged:=merged||jsonb_build_object('posterUrl',coalesce(p_old->>'posterUrl',''));end if;
 if coalesce(p_new->>'streamUrl','')='' then merged:=merged||jsonb_build_object('streamUrl',coalesce(p_old->>'streamUrl',''));end if;
 if coalesce(p_new->>'originalTitle','')='' then merged:=merged||jsonb_build_object('originalTitle',coalesce(p_old->>'originalTitle',''));end if;
 if coalesce(p_new->>'reason','')='' then merged:=merged||jsonb_build_object('reason',coalesce(p_old->>'reason',''));end if;
 return merged;
end $$;
revoke all on function match_private.merge_exclusion_item(jsonb,jsonb) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION match_private.portfolio_impl(p_action text, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid(); i jsonb; t text; meta jsonb; arr jsonb; clean jsonb; identities jsonb; aliases jsonb; identity_names text[]; original text; old_row record; canonical text; field text; stamp bigint; token text; removed_count integer; reading_state jsonb; reading_saved jsonb; reading_disliked jsonb; reading_seen jsonb; reading_reserved jsonb; reading_restored jsonb; reading_tokens jsonb; accepted boolean:=false; reading_action text;
begin
 if uid is null or not exists(select 1 from auth.users where id=uid) then raise exception 'Sign in required'; end if;
 if p_payload ? 'ownerId' and p_payload->>'ownerId' is distinct from uid::text then raise exception 'Account changed; retry in your current account';end if;
 if p_action in ('reading_list','reading_claim','reading_remember','reading_forget','reading_release') then
  -- Reading uses catalogue IDs only. Lock auth before the canonical row so
  -- legacy auth updates and their profile-compaction trigger cannot race it.
  select coalesce(raw_user_meta_data,'{}'::jsonb) into meta from auth.users where id=uid for update;
  insert into match_private.reading_portfolios(user_id) values(uid) on conflict do nothing;
  select state into reading_state from match_private.reading_portfolios where user_id=uid for update;
  reading_saved:=coalesce(reading_state->'saved','[]'::jsonb);
  reading_disliked:=coalesce(reading_state->'disliked','[]'::jsonb);
  reading_seen:=coalesce(reading_state->'seen','[]'::jsonb);
  reading_reserved:=coalesce(reading_state->'reserved','[]'::jsonb);
  reading_restored:=coalesce(reading_state->'restored','[]'::jsonb);
  reading_tokens:=coalesce(reading_state->'tokens','{}'::jsonb);
  -- Import unseen legacy IDs without allowing stale arrays to undo an
  -- explicit restore or overwrite a newer canonical save/dislike choice.
  foreach field in array array['match_ebook_seen','match_ebook_saved','match_ebook_disliked'] loop
   for t in select value from jsonb_array_elements_text(case when jsonb_typeof(meta->field)='array' then meta->field else '[]'::jsonb end) loop
    if t!~'^[A-Za-z0-9][A-Za-z0-9:_-]{0,199}$' or reading_restored ? t or reading_saved ? t or reading_disliked ? t then continue;end if;
    if field='match_ebook_saved' then reading_saved:=reading_saved||jsonb_build_array(t);
    elsif field='match_ebook_disliked' then reading_disliked:=reading_disliked||jsonb_build_array(t);
    elsif not reading_seen ? t then reading_seen:=reading_seen||jsonb_build_array(t);end if;
   end loop;
  end loop;
  if p_action='reading_remember' then
   arr:=case when jsonb_typeof(p_payload->'items')='array' then p_payload->'items' else jsonb_build_array(p_payload) end;
   if jsonb_array_length(arr)>1000 then raise exception 'Invalid reading batch';end if;
  elsif p_action<>'reading_list' then arr:=jsonb_build_array(p_payload);else arr:='[]'::jsonb;end if;
  for i in select value from jsonb_array_elements(arr) loop
   t:=i->>'id';if coalesce(t,'')!~'^[A-Za-z0-9][A-Za-z0-9:_-]{0,199}$' then raise exception 'Invalid reading ID';end if;
   if p_action in ('reading_claim','reading_release') then
    token:=i->>'token';if coalesce(token,'')!~'^[A-Za-z0-9_-]{16,100}$' then raise exception 'Invalid reading claim';end if;
   end if;
   if p_action='reading_claim' then
    accepted:=not (reading_saved ? t or reading_disliked ? t or reading_seen ? t) and (not reading_reserved ? t or coalesce(reading_tokens->>t=token,false));
    if accepted then
     if not reading_reserved ? t then reading_reserved:=reading_reserved||jsonb_build_array(t);end if;
     reading_tokens:=reading_tokens||jsonb_build_object(t,token);reading_restored:=reading_restored-t;
    end if;
   elsif p_action='reading_forget' then
    reading_saved:=reading_saved-t;reading_disliked:=reading_disliked-t;reading_seen:=reading_seen-t;reading_reserved:=reading_reserved-t;reading_tokens:=reading_tokens-t;
    if not reading_restored ? t then reading_restored:=reading_restored||jsonb_build_array(t);end if;
   elsif p_action='reading_release' then
    if reading_tokens->>t=token then reading_reserved:=reading_reserved-t;reading_tokens:=reading_tokens-t;end if;
   else
    reading_action:=i->>'action';
    if reading_action not in ('save','dislike','seen') or reading_action is null then raise exception 'Invalid reading action';end if;
    -- A hydration replay is passive. Only a fresh explicit choice can clear
    -- the restore marker written by another device.
    if coalesce((i->>'legacy')::boolean,false) and (reading_restored ? t or reading_saved ? t or reading_disliked ? t) then continue;end if;
    if reading_action='save' then
     if not reading_saved ? t then reading_saved:=reading_saved||jsonb_build_array(t);end if;
     reading_disliked:=reading_disliked-t;
    elsif reading_action='dislike' then
     if not reading_disliked ? t then reading_disliked:=reading_disliked||jsonb_build_array(t);end if;
     reading_saved:=reading_saved-t;
    else
     if not reading_seen ? t then reading_seen:=reading_seen||jsonb_build_array(t);end if;
    end if;
    reading_reserved:=reading_reserved-t;reading_restored:=reading_restored-t;reading_tokens:=reading_tokens-t;
   end if;
  end loop;
  update match_private.reading_portfolios set state=jsonb_build_object('saved',reading_saved,'disliked',reading_disliked,'seen',reading_seen,'reserved',reading_reserved,'restored',reading_restored,'tokens',reading_tokens) where user_id=uid;
  -- Compatibility copies retain the old bounded shape; the complete state
  -- and reservations remain private and are never embedded in a JWT.
  if p_action<>'reading_list' then
   update auth.users set raw_user_meta_data=meta||jsonb_build_object(
    'match_ebook_saved',(select coalesce(jsonb_agg(value order by ord),'[]'::jsonb) from jsonb_array_elements(reading_saved) with ordinality x(value,ord) where ord>jsonb_array_length(reading_saved)-120),
    'match_ebook_disliked',(select coalesce(jsonb_agg(value order by ord),'[]'::jsonb) from jsonb_array_elements(reading_disliked) with ordinality x(value,ord) where ord>jsonb_array_length(reading_disliked)-240)
   ) where id=uid;
  end if;
  return jsonb_build_object('saved',reading_saved,'disliked',reading_disliked,'seen',reading_seen,'reserved',reading_reserved,'restored',reading_restored,'claimed',accepted);
 end if;
 if p_action='release_claim' then
  token:=p_payload->>'token';if coalesce(token,'')!~'^[A-Za-z0-9_-]{16,100}$' then raise exception 'Invalid title claim';end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,0));
  delete from match_private.title_exclusions where user_id=uid and item->>'action'='reserved' and item->>'claimToken'=token;
  get diagnostics removed_count=row_count;
  return jsonb_build_object('released',removed_count>0);
 end if;
 if p_action in ('remember','claim') then
  if jsonb_typeof(p_payload->'items') is distinct from 'array' or jsonb_array_length(p_payload->'items')>1000 then raise exception 'Invalid history batch';end if;
  if p_action='claim' then
   token:=p_payload->>'token';
   if jsonb_array_length(p_payload->'items')<>1 or coalesce(token,'')!~'^[A-Za-z0-9_-]{16,100}$' then raise exception 'Invalid title claim';end if;
   perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,0));
   -- Import the latest legacy choices before claiming, using the same lock.
   perform match_private.portfolio_impl('list','{}'::jsonb);
  end if;
  for i in select value from jsonb_array_elements(p_payload->'items') loop
   if jsonb_typeof(i)<>'object' then continue;end if;
   t:=left(trim(i->>'title'),300);if coalesce(t,'')='' then continue;end if;
   original:=left(trim(coalesce(i->>'originalTitle','')),300);
   stamp:=case when coalesce(i->>'addedAt','') ~ '^[0-9]{1,13}$' then (i->>'addedAt')::bigint else (extract(epoch from now())*1000)::bigint end;
   select coalesce(jsonb_agg(distinct left(value,300)),'[]'::jsonb) into aliases from jsonb_array_elements_text(
    case when jsonb_typeof(i->'titleAliases')='array' and jsonb_array_length(i->'titleAliases')<=30 then i->'titleAliases' else '[]'::jsonb end
   ) where value is not null and trim(value)<>'';
   select coalesce(jsonb_agg(distinct value),'[]'::jsonb) into identities
   from jsonb_array_elements_text(
    jsonb_build_array(match_private.title_key(t))||
    case when original<>'' then jsonb_build_array(match_private.title_key(original)) else '[]'::jsonb end||
    (select coalesce(jsonb_agg(match_private.title_key(value)),'[]'::jsonb) from jsonb_array_elements_text(aliases))||
    case when jsonb_typeof(i->'identityKeys')='array' and jsonb_array_length(i->'identityKeys')<=40 then i->'identityKeys' else '[]'::jsonb end
   ) value
   where char_length(value)<=300 and (value ~ '^[[:alnum:]]+$' or value ~ '^(tmdb:(movie|tv):[1-9][0-9]*|imdb:tt[0-9]{5,})$');
   select array_agg(value) into identity_names from jsonb_array_elements_text(identities);
   clean:=jsonb_build_object('title',t,'originalTitle',original,'identityKeys',identities,'titleAliases',aliases,
    'action',left(coalesce(i->>'action','shown'),20),'addedAt',stamp,
    'posterUrl',left(coalesce(i->>'posterUrl',''),1500),'streamUrl',left(coalesce(i->>'streamUrl',''),1500),'reason',left(coalesce(i->>'reason',''),300));
   if p_action='claim' then
    clean:=clean||jsonb_build_object('action','reserved','claimToken',token,'addedAt',(extract(epoch from now())*1000)::bigint);
   end if;
   canonical:=null;
   -- Serialize preferences for this account; simultaneous devices cannot let
   -- passive poster enrichment overwrite an explicit choice.
   perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,0));
   for old_row in select title_key,item from match_private.title_exclusions
    where user_id=uid and (title_key=any(identity_names) or coalesce(item->'identityKeys','[]'::jsonb) ?| identity_names)
    order by (item->>'addedAt')::numeric desc for update loop
    if p_action='claim' then
     return jsonb_build_object('claimed',old_row.item->>'action'='reserved' and old_row.item->>'claimToken'=token,'item',old_row.item);
    end if;
    canonical:=coalesce(canonical,old_row.title_key);
    clean:=match_private.merge_exclusion_item(old_row.item,clean);
    if old_row.title_key<>canonical then delete from match_private.title_exclusions where user_id=uid and title_key=old_row.title_key;end if;
   end loop;
   insert into match_private.title_exclusions(user_id,title_key,item)
   values(uid,coalesce(canonical,match_private.title_key(t)),clean)
   on conflict(user_id,title_key) do update set item=match_private.merge_exclusion_item(title_exclusions.item,excluded.item);
   if p_action='claim' then return jsonb_build_object('claimed',true,'item',clean);end if;
  end loop;
 elsif p_action='forget' then
  t:=left(trim(coalesce(p_payload->>'title','')),300);if t='' then raise exception 'Title is required';end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,0));
  -- The legacy auth compactor locks auth, profiles, then exclusions. Acquire
  -- auth before touching either dependent row to avoid a lock-order cycle.
  perform 1 from auth.users where id=uid for update;
  select array_agg(distinct value) into identity_names from (
   select match_private.title_key(t) as value
   union all select x.title_key from match_private.title_exclusions x where x.user_id=uid and (x.title_key=match_private.title_key(t) or coalesce(x.item->'identityKeys','[]'::jsonb) ? match_private.title_key(t))
   union all select k.value from match_private.title_exclusions x cross join lateral jsonb_array_elements_text(case when jsonb_typeof(x.item->'identityKeys')='array' then x.item->'identityKeys' else '[]'::jsonb end) k
    where x.user_id=uid and (x.title_key=match_private.title_key(t) or coalesce(x.item->'identityKeys','[]'::jsonb) ? match_private.title_key(t))
  ) keys;
  delete from match_private.title_exclusions where user_id=uid and (title_key=any(identity_names) or coalesce(item->'identityKeys','[]'::jsonb) ?| identity_names);
  -- Explicit restoration must remove legacy copies, otherwise the next
  -- profile hydration imports the same exclusion immediately again.
  update public.profiles set
   saved_list=(select coalesce(jsonb_agg(v),'[]'::jsonb) from jsonb_array_elements(case when jsonb_typeof(saved_list)='array' then saved_list else '[]'::jsonb end) v where not (match_private.title_key(case when jsonb_typeof(v)='string' then v #>> '{}' else v->>'title' end)=any(identity_names) or coalesce(v->'identityKeys','[]'::jsonb) ?| identity_names))  ,
   seen_list=(select coalesce(jsonb_agg(v),'[]'::jsonb) from jsonb_array_elements(case when jsonb_typeof(seen_list)='array' then seen_list else '[]'::jsonb end) v where not (match_private.title_key(case when jsonb_typeof(v)='string' then v #>> '{}' else v->>'title' end)=any(identity_names) or coalesce(v->'identityKeys','[]'::jsonb) ?| identity_names))  ,
   disliked_list=(select coalesce(jsonb_agg(v),'[]'::jsonb) from jsonb_array_elements(case when jsonb_typeof(disliked_list)='array' then disliked_list else '[]'::jsonb end) v where not (match_private.title_key(case when jsonb_typeof(v)='string' then v #>> '{}' else v->>'title' end)=any(identity_names) or coalesce(v->'identityKeys','[]'::jsonb) ?| identity_names))
  ,user_ratings=(select coalesce(jsonb_object_agg(k,v),'{}'::jsonb) from jsonb_each(case when jsonb_typeof(user_ratings)='object' then user_ratings else '{}'::jsonb end) r(k,v) where not match_private.title_key(k)=any(identity_names))
  where id=uid;
  select raw_user_meta_data into meta from auth.users where id=uid for update;
  foreach field in array array['saved_list','seen_list','disliked_list','match_history'] loop
   if jsonb_typeof(meta->field)='array' then
    select coalesce(jsonb_agg(v),'[]'::jsonb) into arr from jsonb_array_elements(meta->field) v
     where not (match_private.title_key(case when jsonb_typeof(v)='string' then v #>> '{}' else v->>'title' end)=any(identity_names) or coalesce(v->'identityKeys','[]'::jsonb) ?| identity_names);
    meta:=jsonb_set(meta,array[field],arr);
   end if;
  end loop;
  if jsonb_typeof(meta->'match_exclusion_keys')='array' then
   select coalesce(jsonb_agg(value),'[]'::jsonb) into arr from jsonb_array_elements_text(meta->'match_exclusion_keys') where not value=any(identity_names);
   meta:=jsonb_set(meta,array['match_exclusion_keys'],arr);
  end if;
  if jsonb_typeof(meta->'user_ratings')='object' then
   select coalesce(jsonb_object_agg(k,v),'{}'::jsonb) into arr from jsonb_each(meta->'user_ratings') r(k,v) where not match_private.title_key(k)=any(identity_names);
   meta:=jsonb_set(meta,array['user_ratings'],arr);
  end if;
  update auth.users set raw_user_meta_data=meta where id=uid and raw_user_meta_data is distinct from meta;
 elsif p_action='list' then
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,0));
  select raw_user_meta_data into meta from auth.users where id=uid;
  if jsonb_typeof(meta->'match_history')='array' then
   for i in select value from jsonb_array_elements(meta->'match_history') loop
    if jsonb_typeof(i)='object' and coalesce(i->>'title','')<>'' then
     insert into match_private.title_exclusions values(uid,match_private.title_key(i->>'title'),i||jsonb_build_object('addedAt',case when coalesce(i->>'addedAt','')~'^[0-9]{1,13}$' then (i->>'addedAt')::bigint else 0 end)) on conflict(user_id,title_key) do update set item=match_private.merge_exclusion_item(title_exclusions.item,excluded.item);
    end if;
   end loop;
  end if;
  if jsonb_typeof(meta->'match_exclusion_keys')='array' then
   for t in select value from jsonb_array_elements_text(meta->'match_exclusion_keys') loop
    if t ~ '^[[:alnum:]]+$' and char_length(t) <= 300 then
     insert into match_private.title_exclusions values(uid,t,jsonb_build_object('title',coalesce((select entry->>'title' from match_private.catalog where title_key=t),t),'action','rated','addedAt',0)) on conflict do nothing;
    end if;
   end loop;
  end if;
  foreach t in array array['saved_list','seen_list','disliked_list'] loop
   -- The existing auth compactor moves these lists to profiles and removes
   -- them from metadata. Recover active choices there as well as older auth
   -- copies; a legacy shown row must not mask a later explicit preference.
   arr:=(case when jsonb_typeof(meta->t)='array' then meta->t else '[]'::jsonb end)||
    coalesce((select case when jsonb_typeof(to_jsonb(p)->t)='array' then to_jsonb(p)->t else '[]'::jsonb end from public.profiles p where p.id=uid),'[]'::jsonb);
   if jsonb_typeof(arr)='array' then
    for i in select value from jsonb_array_elements(arr) loop
     if jsonb_typeof(i)='string' then i:=jsonb_build_object('title',i #>> '{}'); end if;
     if coalesce(i->>'title','')<>'' then
      insert into match_private.title_exclusions values(uid,match_private.title_key(i->>'title'),i||jsonb_build_object('action',case t when 'saved_list' then 'save' when 'seen_list' then 'seen' else 'dislike' end,'addedAt',case when coalesce(i->>'addedAt','')~'^[0-9]{1,13}$' then (i->>'addedAt')::bigint else 0 end)) on conflict(user_id,title_key) do update set item=match_private.merge_exclusion_item(title_exclusions.item,excluded.item);
     end if;
    end loop;
   end if;
  end loop;
 else raise exception 'Unknown history action'; end if;
 return jsonb_build_object(
   'keys',(select coalesce(jsonb_agg(distinct value),'[]'::jsonb) from (select title_key as value from match_private.title_exclusions where user_id=uid union all select k.value from match_private.title_exclusions x cross join lateral jsonb_array_elements_text(case when jsonb_typeof(x.item->'identityKeys')='array' then x.item->'identityKeys' else '[]'::jsonb end) k where x.user_id=uid) all_keys),
   'history',(select coalesce(jsonb_agg(item order by (item->>'addedAt')::bigint desc),'[]'::jsonb) from match_private.title_exclusions where user_id=uid)
 );
end
$function$;


-- Both active Together protocols publish under the same account locks as
-- ordinary matching. Keep account membership private: shared preferences and
-- invitation responses must never expose identifiers or exclusion portfolios.
create table if not exists match_private.classic_session_members (
 session_code text not null references public.match_sessions(code) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 primary key(session_code,user_id)
);
alter table match_private.classic_session_members enable row level security;
revoke all on table match_private.classic_session_members from public,anon,authenticated;

create or replace function match_private.session_title_keys(p_item jsonb)
returns text[] language plpgsql immutable set search_path='' as $$
declare keys text[]:='{}'; source jsonb; value text; kind text; source_id text;
begin
 for source in select v from jsonb_array_elements(jsonb_build_array(p_item,p_item->'_tmdb',p_item->'_catalogMedia',p_item->'_meta')) v loop
  if jsonb_typeof(source) is distinct from 'object' then continue;end if;
  for value in select v from jsonb_array_elements_text(jsonb_build_array(source->>'title',source->>'originalTitle',source->>'original_title',source->>'original_name')) v loop
   if coalesce(trim(value),'')<>'' then keys:=array_append(keys,match_private.title_key(left(value,300)));end if;
  end loop;
  kind:=coalesce(source->>'kind',source->>'media_kind',source->>'media_type',source->>'_tmdbKind',p_item->>'_tmdbKind',p_item->>'kind');
  source_id:=coalesce(source->>'tmdbId',source->>'tmdb_id',source->>'_tmdbId');
  if kind in ('movie','tv') and coalesce(source_id,'')~'^[0-9]{1,16}$' then
   if source_id::numeric between 1 and 9007199254740991 then keys:=array_append(keys,'tmdb:'||kind||':'||(source_id::bigint)::text);end if;
  end if;
  value:=coalesce(source->>'imdbId',source->>'imdb_id');
  if coalesce(value,'')~'^tt[0-9]{5,}$' and char_length(value)<=40 then keys:=array_append(keys,'imdb:'||value);end if;
 end loop;
 for value in select v from jsonb_array_elements_text(case when jsonb_typeof(p_item->'titleAliases')='array' then p_item->'titleAliases' else '[]'::jsonb end) v limit 30 loop
  if coalesce(trim(value),'')<>'' then keys:=array_append(keys,match_private.title_key(left(value,300)));end if;
 end loop;
 for value in select v from jsonb_array_elements_text(case when jsonb_typeof(p_item->'identityKeys')='array' then p_item->'identityKeys' else '[]'::jsonb end) v limit 1000 loop
  if char_length(value)<=300 and (value~'^[[:alnum:]]+$' or value~'^(tmdb:(movie|tv):[1-9][0-9]*|imdb:tt[0-9]{5,})$') then keys:=array_append(keys,value);end if;
 end loop;
 return coalesce((select array_agg(distinct k order by k) from unnest(keys) k where k<>''),'{}'::text[]);
end $$;
revoke all on function match_private.session_title_keys(jsonb) from public,anon,authenticated;

create or replace function match_private.record_session_title(p_users uuid[],p_item jsonb,p_scope text,p_claim_owner uuid default null,p_claim_token text default null)
returns boolean language plpgsql set search_path='' as $$
declare participant_ids uuid[]; participant uuid; keys text[]; meta jsonb; arr jsonb; field text; i jsonb; title text; clean jsonb; canonical text; old_row record;
begin
 keys:=match_private.session_title_keys(p_item);
 if coalesce(trim(p_item->>'title'),'')='' or cardinality(keys)=0 then return false;end if;
 select coalesce(array_agg(distinct u.id order by u.id),'{}'::uuid[]) into participant_ids from auth.users u where u.id=any(p_users);
 -- Stable account order also covers opposite-host and multi-participant
 -- sessions. Lock auth before any dependent write for the legacy compactor.
 foreach participant in array participant_ids loop
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(participant::text,0));
 end loop;
 perform 1 from auth.users where id=any(participant_ids) order by id for update;
 foreach participant in array participant_ids loop
  select raw_user_meta_data into meta from auth.users where id=participant;
  foreach field in array array['match_history','saved_list','seen_list','disliked_list'] loop
   arr:=(case when jsonb_typeof(meta->field)='array' then meta->field else '[]'::jsonb end)||
    case when field='match_history' then '[]'::jsonb else coalesce((select case when jsonb_typeof(to_jsonb(p)->field)='array' then to_jsonb(p)->field else '[]'::jsonb end from public.profiles p where p.id=participant),'[]'::jsonb) end;
   for i in select value from jsonb_array_elements(arr) loop
    if jsonb_typeof(i)='string' then i:=jsonb_build_object('title',i #>> '{}');end if;
    title:=left(trim(i->>'title'),300);if coalesce(title,'')='' then continue;end if;
    i:=i||jsonb_build_object('title',title,'identityKeys',to_jsonb(match_private.session_title_keys(i)),
     'action',case field when 'saved_list' then 'save' when 'seen_list' then 'seen' when 'disliked_list' then 'dislike' else coalesce(i->>'action','shown') end,
     'addedAt',case when coalesce(i->>'addedAt','')~'^[0-9]{1,13}$' then (i->>'addedAt')::bigint else 0 end);
    insert into match_private.title_exclusions(user_id,title_key,item) values(participant,match_private.title_key(title),i)
     on conflict(user_id,title_key) do update set item=match_private.merge_exclusion_item(title_exclusions.item,excluded.item);
   end loop;
  end loop;
  for title in select value from jsonb_array_elements_text(case when jsonb_typeof(meta->'match_exclusion_keys')='array' then meta->'match_exclusion_keys' else '[]'::jsonb end) loop
   if title~'^[[:alnum:]]+$' and char_length(title)<=300 then
    insert into match_private.title_exclusions(user_id,title_key,item) values(participant,title,jsonb_build_object('title',title,'action','rated','addedAt',0)) on conflict do nothing;
   end if;
  end loop;
 end loop;
 if exists(select 1 from match_private.title_exclusions x where x.user_id=any(participant_ids)
  and (x.title_key=any(keys) or match_private.session_title_keys(x.item)&&keys)
  and not coalesce(x.user_id=p_claim_owner and x.item->>'action'='reserved' and x.item->>'claimToken'=p_claim_token
    and p_claim_token~'^[A-Za-z0-9_-]{16,100}$',false)) then return false;end if;
 foreach participant in array participant_ids loop
  clean:=jsonb_build_object('title',left(p_item->>'title',300),'originalTitle',left(coalesce(p_item->>'originalTitle',p_item->>'original_title',''),300),
   'identityKeys',to_jsonb(keys),'action','shown','addedAt',(extract(epoch from now())*1000)::bigint,'reason',left(p_scope,300),
   'posterUrl',left(coalesce(p_item->>'posterUrl',p_item->'_meta'->>'artwork',''),1500),'streamUrl',left(coalesce(p_item->>'watchUrl',p_item->>'streamUrl',''),1500));
  canonical:=null;
  for old_row in select title_key,item from match_private.title_exclusions x where x.user_id=participant
   and (x.title_key=any(keys) or match_private.session_title_keys(x.item)&&keys) order by title_key for update loop
   canonical:=coalesce(canonical,old_row.title_key);clean:=match_private.merge_exclusion_item(old_row.item,clean)-'claimToken';
   if old_row.title_key<>canonical then delete from match_private.title_exclusions where user_id=participant and title_key=old_row.title_key;end if;
  end loop;
  insert into match_private.title_exclusions(user_id,title_key,item) values(participant,coalesce(canonical,match_private.title_key(p_item->>'title')),clean)
   on conflict(user_id,title_key) do update set item=match_private.merge_exclusion_item(title_exclusions.item,excluded.item)-'claimToken';
 end loop;
 return true;
end $$;
revoke all on function match_private.record_session_title(uuid[],jsonb,text,uuid,text) from public,anon,authenticated;

-- Same private-pair protocol; include verified localized-title aliases.
CREATE OR REPLACE FUNCTION match_private.friends_impl(p_action text, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid(); other uuid; rid uuid; code text; row match_private.pair_matches%rowtype; chosen jsonb; pref jsonb; settings match_private.friend_profiles%rowtype; participant uuid; pair_identity jsonb;
begin
 if uid is null or not exists(select 1 from auth.users where id=uid and is_anonymous=false) then raise exception 'Registered sign in required'; end if;
 if coalesce(octet_length(p_payload::text),0)>12000 then raise exception 'Request too large'; end if;
 insert into match_private.friend_profiles(user_id) values(uid) on conflict do nothing;
 if p_action='settings' then
  update match_private.friend_profiles set alias=left(coalesce(nullif(trim(p_payload->>'alias'),''),alias),40),sharing=coalesce((p_payload->>'sharing')::boolean,sharing),presence=coalesce((p_payload->>'presence')::boolean,presence) where user_id=uid;
 elsif p_action='rotate' then update match_private.friend_profiles set invite_code=replace(gen_random_uuid()::text,'-','') where user_id=uid;
 elsif p_action='heartbeat' then update match_private.friend_profiles set last_seen=now() where user_id=uid and presence;
 elsif p_action='request' then
  select user_id into other from match_private.friend_profiles where invite_code=p_payload->>'token' and sharing and user_id<>uid;
  if other is null then raise exception 'Invite unavailable'; end if;
  if (select count(*) from match_private.friendships where sender=uid or recipient=uid)>=100 then raise exception 'Friend limit reached'; end if;
  if (select count(*) from match_private.friendships where sender=uid and created_at>now()-interval '24 hours')>=20 then raise exception 'Daily request limit reached'; end if;
  insert into match_private.friendships(sender,recipient) values(uid,other) on conflict do nothing;
 elsif p_action in ('accept','remove') then
  rid:=(p_payload->>'id')::uuid;
  if p_action='accept' then update match_private.friendships set status='accepted' where id=rid and recipient=uid and status='pending';
  else
   select case when sender=uid then recipient else sender end into other from match_private.friendships where id=rid and uid in(sender,recipient);
   delete from match_private.pair_matches where (host=uid and guest=other) or(host=other and guest=uid);
   delete from match_private.friend_preferences where (owner=uid and friend=other) or(owner=other and friend=uid);
   delete from match_private.friendships where id=rid and uid in(sender,recipient);
  end if;
 elsif p_action='avatar' then
  other:=(p_payload->>'friend')::uuid;
  if not exists(select 1 from match_private.friendships where uid in(sender,recipient) and other in(sender,recipient) and uid<>other and status='accepted') then raise exception 'Friend approval required'; end if;
  insert into match_private.friend_preferences values(uid,other,p_payload->>'avatar') on conflict(owner,friend) do update set avatar=excluded.avatar;
 elsif p_action='invite_match' then
  other:=(p_payload->>'friend')::uuid;
  if not exists(select 1 from match_private.friendships where uid in(sender,recipient) and other in(sender,recipient) and uid<>other and status='accepted') then raise exception 'Friend approval required'; end if;
  if (select count(*) from match_private.pair_matches where host=uid and created_at>now()-interval '24 hours')>=20 then raise exception 'Daily match invite limit reached'; end if;
  pref:=p_payload->'prefs';if jsonb_typeof(pref)<>'object' then raise exception 'Choose your criteria'; end if;
  insert into match_private.pair_matches(host,guest,host_prefs) values(uid,other,pref) returning pair_matches.code into code;
  return jsonb_build_object('code',code);
 elsif p_action in ('match','choose','decline_match') then
  select * into row from match_private.pair_matches where pair_matches.code=p_payload->>'code' and uid in(host,guest) and expires_at>now() for update;
  if not found then raise exception 'Match invite unavailable or expired'; end if;
  if p_action='decline_match' then delete from match_private.pair_matches where pair_matches.code=row.code;return '{}'::jsonb; end if;
  if p_action='choose' and row.result is null then
   pref:=p_payload->'prefs';if jsonb_typeof(pref)<>'object' then raise exception 'Choose your criteria'; end if;
   update match_private.pair_matches set host_prefs=case when host=uid then pref else host_prefs end,guest_prefs=case when guest=uid then pref else guest_prefs end where pair_matches.code=row.code returning * into row;
  end if;
  if row.result is null and row.guest_prefs is not null then
   -- Separate pair sessions and solo requests share the account locks.
   -- Lock participants in stable order to avoid a two-account deadlock.
   for participant in select distinct p from unnest(array[row.host,row.guest]) p order by p loop
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(participant::text,0));
   end loop;
   select c.entry into chosen from match_private.catalog c where match_private.criteria_match(c.entry,row.host_prefs) and match_private.criteria_match(c.entry,row.guest_prefs)
    and not exists(select 1 from match_private.title_exclusions x where x.user_id in(row.host,row.guest) and (x.title_key=c.title_key or match_private.session_title_keys(x.item)&&match_private.session_title_keys(c.entry)))
    order by random() limit 1;
   if chosen is not null then
    chosen:=chosen||jsonb_build_object('platformVerified',false,'source','private-pair');
    chosen:=chosen||jsonb_build_object('identityKeys',to_jsonb(match_private.session_title_keys(chosen)),'matchScope','pair:'||row.code);
    if match_private.record_session_title(array[row.host,row.guest],chosen,'pair:'||row.code) then
     update match_private.pair_matches set result=chosen where pair_matches.code=row.code returning * into row;
    end if;
   end if;
  end if;
  return jsonb_build_object('code',row.code,'result',row.result,'ready',row.guest_prefs is not null,'myPrefs',case when uid=row.host then row.host_prefs else row.guest_prefs end,'friendAlias',(select alias from match_private.friend_profiles where user_id=case when row.host=uid then row.guest else row.host end));
 elsif p_action<>'list' then raise exception 'Unknown friend action'; end if;
 select * into settings from match_private.friend_profiles where user_id=uid;
 return jsonb_build_object('settings',jsonb_build_object('alias',settings.alias,'sharing',settings.sharing,'presence',settings.presence,'token',case when settings.sharing then settings.invite_code else null end),
 'friends',(select coalesce(jsonb_agg(jsonb_build_object('id',f.id,'friend',p.user_id,'alias',p.alias,'avatar',coalesce(v.avatar,'fox'),'online',p.presence and p.last_seen>now()-interval '75 seconds')),'[]'::jsonb) from match_private.friendships f join match_private.friend_profiles p on p.user_id=case when f.sender=uid then f.recipient else f.sender end left join match_private.friend_preferences v on v.owner=uid and v.friend=p.user_id where uid in(f.sender,f.recipient) and f.status='accepted'),
 'requests',(select coalesce(jsonb_agg(jsonb_build_object('id',f.id,'alias',p.alias,'incoming',f.recipient=uid)),'[]'::jsonb) from match_private.friendships f join match_private.friend_profiles p on p.user_id=case when f.sender=uid then f.recipient else f.sender end where uid in(f.sender,f.recipient) and f.status='pending'),
 'matches',(select coalesce(jsonb_agg(jsonb_build_object('code',m.code,'alias',p.alias,'incoming',m.guest=uid,'matched',m.result is not null)),'[]'::jsonb) from match_private.pair_matches m join match_private.friend_profiles p on p.user_id=case when m.host=uid then m.guest else m.host end where uid in(m.host,m.guest) and m.expires_at>now()));
end $function$;

-- Canonical deployed classic invitation protocol with private membership.
CREATE OR REPLACE FUNCTION public.join_match_session(p_code text, p_name text, p_prefs jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_row public.match_sessions%rowtype;
    v_scope text;
begin
    if p_prefs is null or jsonb_typeof(p_prefs) <> 'object' then
        return jsonb_build_object('ok', false, 'error', 'invalid_prefs');
    end if;

    select * into v_row from public.match_sessions
     where code = upper(trim(p_code)) for update;

    if not found then
        return jsonb_build_object('ok', false, 'error', 'not_found');
    end if;
    if v_row.expires_at < now() then
        return jsonb_build_object('ok', false, 'error', 'expired');
    end if;
    -- Keep sessions small: this is "what should WE watch", not a broadcast.
    if jsonb_array_length(v_row.participants) >= 6 then
        return jsonb_build_object('ok', false, 'error', 'session_full');
    end if;

    -- An authenticated new participant is private account membership, never
    -- part of the code-visible preferences. Late joins must also be fresh.
    if auth.uid() is not null and not exists(select 1 from match_private.classic_session_members where session_code=v_row.code and user_id=auth.uid()) then
        if v_row.result is not null then
            v_scope:='together:'||v_row.code;
            if not match_private.record_session_title(array[auth.uid()],v_row.result,v_scope) then
                return jsonb_build_object('ok',false,'error','already_known');
            end if;
        end if;
        insert into match_private.classic_session_members values(v_row.code,auth.uid()) on conflict do nothing;
    end if;

    update public.match_sessions
       set participants = participants || jsonb_build_object(
               'name',      coalesce(nullif(trim(p_name), ''), 'Guest'),
               'prefs',     p_prefs,
               'is_host',   false,
               'joined_at', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SSZ')
           )
     where code = v_row.code
     returning * into v_row;

    return jsonb_build_object('ok', true, 'code', v_row.code,
                              'participants', v_row.participants,
                              'status', v_row.status,
                              'result', v_row.result);
end;
$function$;


CREATE OR REPLACE FUNCTION public.create_match_session(p_name text, p_prefs jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_code    text;
    v_tries   integer := 0;
    v_partic  jsonb;
begin
    if auth.uid() is null then return jsonb_build_object('ok',false,'error','not_authenticated'); end if;
    if p_prefs is null or jsonb_typeof(p_prefs) <> 'object' then
        return jsonb_build_object('ok', false, 'error', 'invalid_prefs');
    end if;

    -- Retry on the astronomically unlikely collision rather than failing.
    loop
        v_code  := public.gen_session_code();
        v_tries := v_tries + 1;
        exit when not exists (select 1 from public.match_sessions where code = v_code);
        if v_tries > 8 then
            return jsonb_build_object('ok', false, 'error', 'code_generation_failed');
        end if;
    end loop;

    v_partic := jsonb_build_array(jsonb_build_object(
        'name',      coalesce(nullif(trim(p_name), ''), 'Host'),
        'prefs',     p_prefs,
        'is_host',   true,
        'joined_at', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SSZ')
    ));

    insert into public.match_sessions (code, host_id, participants)
    values (v_code, auth.uid(), v_partic);
    insert into match_private.classic_session_members values(v_code,auth.uid()) on conflict do nothing;

    return jsonb_build_object('ok', true, 'code', v_code, 'participants', v_partic);
end;
$function$;


CREATE OR REPLACE FUNCTION public.set_match_session_result(p_code text, p_result jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_row public.match_sessions%rowtype;
    v_users uuid[];
    v_scope text;
    v_result jsonb;
begin
    select * into v_row from public.match_sessions
     where code = upper(trim(p_code)) for update;

    if not found then
        return jsonb_build_object('ok', false, 'error', 'not_found');
    end if;
    if v_row.expires_at < now() then
        return jsonb_build_object('ok', false, 'error', 'expired');
    end if;

    if auth.uid() is null or v_row.host_id is distinct from auth.uid() then
        return jsonb_build_object('ok',false,'error','host_required');
    end if;

    if p_result ? 'ownerId' and p_result->>'ownerId' is distinct from auth.uid()::text then
        return jsonb_build_object('ok',false,'error','account_changed');
    end if;

    -- Already decided: return the existing result rather than overwrite it.
    -- Both participants must see the SAME title, always.
    if v_row.status = 'matched' and v_row.result is not null then
        return jsonb_build_object('ok', true, 'code', v_row.code,
                                  'status', v_row.status, 'result', v_row.result,
                                  'already', true);
    end if;

    if jsonb_typeof(p_result) is distinct from 'object' or coalesce(trim(p_result->>'title'),'')='' or octet_length(p_result::text)>64000 then
        return jsonb_build_object('ok',false,'error','invalid_result');
    end if;
    -- Existing sessions retain their known host even without a membership row.
    select array_agg(distinct u order by u) into v_users from (
        select v_row.host_id u union all select user_id from match_private.classic_session_members where session_code=v_row.code
    ) participants where u is not null;
    v_scope:='together:'||v_row.code;
    v_result:=(p_result-'claimToken'-'ownerId')||jsonb_build_object('matchScope',v_scope);
    if not match_private.record_session_title(v_users,v_result,v_scope,auth.uid(),p_result->>'claimToken') then
        return jsonb_build_object('ok',false,'error','already_known');
    end if;

    update public.match_sessions
       set result = v_result, status = 'matched'
     where code = v_row.code
     returning * into v_row;

    return jsonb_build_object('ok', true, 'code', v_row.code,
                              'status', v_row.status, 'result', v_row.result,
                              'already', false);
end;
$function$;


-- Canonical service-only quick Together protocol with atomic result history.
CREATE OR REPLACE FUNCTION public.growth_together_service(p_action text, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v match_private.growth_invites%rowtype;
  v_uid uuid;
  v_hash text := p_payload->>'token_hash';
  v_guest_hash text := p_payload->>'guest_key_hash';
  v_authorized boolean := false;
  v_pool jsonb;
  v_entry jsonb;
  v_result jsonb;
  v_identity text[];
  v_scope text;
  v_key text;
  v_meta jsonb;
  v_limit integer;
  v_resume match_private.growth_resume_tokens%rowtype;
begin
  if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>96000 then
    return jsonb_build_object('ok',false,'error','invalid_request');
  end if;
  if coalesce(p_payload->>'actor_id','') <> '' then
    v_uid := (p_payload->>'actor_id')::uuid;
  end if;
  if p_action='resume' then
    select * into v_resume from match_private.growth_resume_tokens where token_hash=v_hash and expires_at>now();
    if not found then return jsonb_build_object('ok',false,'error','expired'); end if;
    select * into v from match_private.growth_invites where id=v_resume.invite_id and expires_at>now() and result is not null;
    if not found then return jsonb_build_object('ok',false,'error','expired'); end if;
    -- Read-only recommendation context. Never return account identifiers,
    -- host/guest capabilities, private preferences, exclusions or login tokens.
    return jsonb_build_object('ok',true,'result',v.result,'language',v_resume.language,'expiresAt',v_resume.expires_at,'readOnly',true,'viewerRole',v_resume.viewer_role);
  end if;
  if v_hash is null or v_hash !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('ok',false,'error','invalid_invite');
  end if;
  if p_action='create' then
    if v_uid is null or not exists(select 1 from auth.users where id=v_uid and is_anonymous=false) then
      return jsonb_build_object('ok',false,'error','sign_in_required');
    end if;
    if jsonb_typeof(p_payload->'prefs') is distinct from 'object'
       or jsonb_typeof(p_payload->'exclusions') is distinct from 'array'
       or jsonb_array_length(p_payload->'exclusions')>1000 then
      return jsonb_build_object('ok',false,'error','invalid_prefs');
    end if;
    perform pg_advisory_xact_lock(hashtextextended('matchapp-growth:'||v_uid::text,0));
    select * into v from match_private.growth_invites where token_hash=v_hash;
    if found then
      if v.host_id<>v_uid then return jsonb_build_object('ok',false,'error','invalid_invite'); end if;
      if v.expires_at<=now() then return jsonb_build_object('ok',false,'error','expired'); end if;
      return jsonb_build_object('ok',true,'status',v.status,'expiresAt',v.expires_at,'role','host');
    end if;
    select count(*) into v_limit from match_private.growth_invites where host_id=v_uid and created_at>now()-interval '24 hours';
    if v_limit>=20 then return jsonb_build_object('ok',false,'error','invite_limit'); end if;
    insert into match_private.growth_invites(token_hash,host_id,host_name,host_prefs,host_exclusions)
    values(v_hash,v_uid,left(coalesce(nullif(trim(p_payload->>'name'),''),'Your friend'),40),p_payload->'prefs',p_payload->'exclusions')
    returning * into v;
    return jsonb_build_object('ok',true,'status',v.status,'expiresAt',v.expires_at,'role','host');
  end if;
  select * into v from match_private.growth_invites where token_hash=v_hash for update;
  if not found then return jsonb_build_object('ok',false,'error','invalid_invite'); end if;
  if v.expires_at<=now() then return jsonb_build_object('ok',false,'error','expired'); end if;
  v_authorized := coalesce(v_uid=v.host_id,false) or
    (v.guest_key_hash is not null and v_guest_hash is not null and v_guest_hash=v.guest_key_hash);
  if p_action='preview' then
    return jsonb_build_object('ok',true,'hostName',v.host_name,'expiresAt',v.expires_at,'joined',v.guest_key_hash is not null,
      'viewingMode',v.host_prefs->>'viewingMode','viewingCountry',v.host_prefs->>'country');
  elsif p_action in ('join','update') then
    if v_guest_hash is null or v_guest_hash !~ '^[a-f0-9]{64}$'
       or jsonb_typeof(p_payload->'prefs') is distinct from 'object'
       or jsonb_typeof(p_payload->'exclusions') is distinct from 'array'
       or jsonb_array_length(p_payload->'exclusions')>1000 then
      return jsonb_build_object('ok',false,'error','invalid_prefs');
    end if;
    if v_uid=v.host_id then return jsonb_build_object('ok',false,'error','different_viewer_required'); end if;
    if v.guest_key_hash is not null and v.guest_key_hash<>v_guest_hash then
      return jsonb_build_object('ok',false,'error','already_joined');
    end if;
    if p_action='update' and v.guest_key_hash is null then
      return jsonb_build_object('ok',false,'error','join_required');
    end if;
    if v.result is null and (v.guest_key_hash is null or p_action='update') then
      if v.attempts>=10 then return jsonb_build_object('ok',false,'error','retry_limit'); end if;
      update match_private.growth_invites set guest_key_hash=v_guest_hash,guest_id=v_uid,
        guest_prefs=p_payload->'prefs',guest_exclusions=p_payload->'exclusions',status='ready',
        revision=revision+1,retry_after=null
      where id=v.id returning * into v;
    end if;
    return jsonb_build_object('ok',true,'status',v.status,'result',v.result,'revision',v.revision,'role','guest','expiresAt',v.expires_at);
  end if;
  if not v_authorized then return jsonb_build_object('ok',false,'error','join_required'); end if;
  if p_action='status' then
    return jsonb_build_object('ok',true,'status',v.status,'result',v.result,'revision',v.revision,
      'role',case when v_uid=v.host_id then 'host' else 'guest' end,'expiresAt',v.expires_at);
  elsif p_action='prepare' then
    if v.result is not null then return jsonb_build_object('ok',true,'status','matched','result',v.result); end if;
    if v.guest_prefs is null then return jsonb_build_object('ok',true,'status','waiting'); end if;
    if v.retry_after>now() then return jsonb_build_object('ok',true,'status',v.status,'retryAfter',v.retry_after); end if;
    if v.attempts>=10 then return jsonb_build_object('ok',false,'error','retry_limit'); end if;
    update match_private.growth_invites set status='resolving',attempts=attempts+1,retry_after=now()+interval '30 seconds'
      where id=v.id returning * into v;
    select coalesce(jsonb_agg(jsonb_build_object('key',c.title_key,'entry',c.entry)),'[]'::jsonb) into v_pool
    from match_private.catalog c
    where match_private.criteria_match(c.entry,v.host_prefs||'{"plat":"any"}'::jsonb)
      and match_private.criteria_match(c.entry,v.guest_prefs||'{"plat":"any"}'::jsonb)
      and not exists(select 1 from match_private.title_exclusions x where x.user_id in(v.host_id,v.guest_id)
        and (x.title_key=c.title_key or match_private.session_title_keys(x.item)&&match_private.session_title_keys(c.entry)))
      and not (v.host_exclusions ?| match_private.session_title_keys(c.entry)) and not (v.guest_exclusions ?| match_private.session_title_keys(c.entry));
    return jsonb_build_object('ok',true,'status','resolve','revision',v.revision,'hostPrefs',v.host_prefs,'guestPrefs',v.guest_prefs,'candidates',v_pool);
  elsif p_action='commit' then
    if v.result is not null then return jsonb_build_object('ok',true,'status','matched','result',v.result); end if;
    if v.revision is distinct from (p_payload->>'revision')::integer then return jsonb_build_object('ok',false,'error','choices_changed'); end if;
    if v.status<>'resolving' then return jsonb_build_object('ok',false,'error','not_resolving'); end if;
    if p_payload->>'outcome' in ('no_match','unavailable') then
      update match_private.growth_invites set status=p_payload->>'outcome',retry_after=now()+interval '20 seconds' where id=v.id returning * into v;
      return jsonb_build_object('ok',true,'status',v.status);
    end if;
    v_key:=p_payload->>'key';
    select c.entry into v_entry from match_private.catalog c where c.title_key=v_key
      and match_private.criteria_match(c.entry,v.host_prefs||'{"plat":"any"}'::jsonb)
      and match_private.criteria_match(c.entry,v.guest_prefs||'{"plat":"any"}'::jsonb)
      and not exists(select 1 from match_private.title_exclusions x where x.user_id in(v.host_id,v.guest_id)
        and (x.title_key=c.title_key or match_private.session_title_keys(x.item)&&match_private.session_title_keys(c.entry)))
      and not (v.host_exclusions ?| match_private.session_title_keys(c.entry)) and not (v.guest_exclusions ?| match_private.session_title_keys(c.entry));
    if v_entry is null or jsonb_typeof(p_payload->'result') is distinct from 'object'
       or p_payload->'result'->>'title' is distinct from v_entry->>'title' then
      update match_private.growth_invites set status='ready',retry_after=null where id=v.id;
      return jsonb_build_object('ok',false,'error','choices_changed');
    end if;
    v_scope:='growth:'||v.id::text;
    v_result:=(p_payload->'result')||jsonb_build_object('matchScope',v_scope);
    v_identity:=match_private.session_title_keys(v_entry||v_result);
    v_result:=v_result||jsonb_build_object('identityKeys',to_jsonb(v_identity));
    -- The source-verified numeric identity is available only after Edge work.
    -- Recheck both local portfolios, then atomically commit all account rows.
    if v.host_exclusions ?| v_identity or v.guest_exclusions ?| v_identity
       or not match_private.record_session_title(array[v.host_id,v.guest_id],v_result,v_scope) then
      update match_private.growth_invites set status='ready',retry_after=null where id=v.id;
      return jsonb_build_object('ok',false,'error','choices_changed');
    end if;
    update match_private.growth_invites set result=v_result,status='matched',retry_after=null where id=v.id returning * into v;
    return jsonb_build_object('ok',true,'status','matched','result',v.result);
  elsif p_action='metadata' then
    if jsonb_typeof(p_payload->'keys') is distinct from 'array' or jsonb_array_length(p_payload->'keys')>300 then
      return jsonb_build_object('ok',false,'error','invalid_request');
    end if;
    select coalesce(jsonb_agg(jsonb_build_object('key',c.title_key,'metadata',m.data)),'[]'::jsonb) into v_meta
    from match_private.catalog c
    left join lateral (
      select jsonb_build_object('title',d.title,'kind',d.media_kind,'year',d.year,'tmdbId',d.tmdb_id,
        'posterUrl',d.poster_url,'synopsis',d.overview,'genres',d.genres,'runtime',d.runtime_minutes,
        'contentRating',d.content_rating,'cast',d.cast_members,'countries',d.origin_countries,
        'availability',d.availability,'checkedAt',d.source_updated_at) as data
      from public.catalog_media_metadata d
      where d.normalized_title=p_payload->'normalized'->>c.title_key
        and (coalesce(c.entry->>'year','')='' or (c.entry->>'year' ~ '^[0-9]{4}$' and d.year=(c.entry->>'year')::integer))
        and d.media_kind=case when (c.entry->'cats') ? 'movie' then 'movie' else 'tv' end
      order by d.is_catalog_title desc,d.source_updated_at desc nulls last limit 1
    ) m on true
    where p_payload->'keys' ? c.title_key;
    return jsonb_build_object('ok',true,'rows',v_meta);
  elsif p_action='handoff' then
    if v.result is null then return jsonb_build_object('ok',false,'error','result_required'); end if;
    if coalesce(p_payload->>'resume_hash','') !~ '^[a-f0-9]{64}$' then return jsonb_build_object('ok',false,'error','invalid_request'); end if;
    select count(*) into v_limit from match_private.growth_resume_tokens where invite_id=v.id;
    if v_limit>=12 then return jsonb_build_object('ok',false,'error','handoff_limit'); end if;
    insert into match_private.growth_resume_tokens(token_hash,invite_id,language,viewer_role,expires_at)
      values(p_payload->>'resume_hash',v.id,left(coalesce(p_payload->>'language','en'),8),case when v_uid=v.host_id then 'host' else 'guest' end,v.expires_at)
      on conflict(token_hash) do nothing;
    return jsonb_build_object('ok',true,'expiresAt',v.expires_at);
  end if;
  return jsonb_build_object('ok',false,'error','invalid_action');
end;
$function$;


commit;
