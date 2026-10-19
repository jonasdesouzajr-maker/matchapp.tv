-- Keep lifetime recommendation exclusions independent from removable lists.
-- Existing private tables, account locks, function OIDs/grants and quotas stay
-- intact. Only owned forget/history/identity branches are changed. Unexpected
-- source definitions abort instead of replacing a newer implementation.
do $lifetime_match_exclusions$
declare
 definition text := pg_catalog.pg_get_functiondef('match_private.portfolio_impl(text,jsonb)'::regprocedure);
 original_definition text;
 before_parts text[] := array[
 $before_reading$reading_saved:=reading_saved-t;reading_disliked:=reading_disliked-t;reading_seen:=reading_seen-t;reading_reserved:=reading_reserved-t;reading_tokens:=reading_tokens-t;$before_reading$,
 $before_import$   if p_action='claim' then
    clean:=clean||jsonb_build_object('action','reserved','claimToken',token,'addedAt',(extract(epoch from now())*1000)::bigint);
   end if;$before_import$,
 $before_incoming$    jsonb_build_array(match_private.title_key(t))||
    case when original<>'' then jsonb_build_array(match_private.title_key(original)) else '[]'::jsonb end||$before_incoming$,
 $before_claim$    where user_id=uid and (title_key=any(identity_names) or coalesce(item->'identityKeys','[]'::jsonb) ?| identity_names)$before_claim$,
 $before_forget$  delete from match_private.title_exclusions where user_id=uid and (title_key=any(identity_names) or coalesce(item->'identityKeys','[]'::jsonb) ?| identity_names);$before_forget$,
 $before_result$   'keys',(select coalesce(jsonb_agg(distinct value),'[]'::jsonb) from (select title_key as value from match_private.title_exclusions where user_id=uid union all select k.value from match_private.title_exclusions x cross join lateral jsonb_array_elements_text(case when jsonb_typeof(x.item->'identityKeys')='array' then x.item->'identityKeys' else '[]'::jsonb end) k where x.user_id=uid) all_keys),
   'history',(select coalesce(jsonb_agg(item order by (item->>'addedAt')::bigint desc),'[]'::jsonb) from match_private.title_exclusions where user_id=uid)$before_result$
 ];
 after_parts text[] := array[
 $after_reading$reading_saved:=reading_saved-t;reading_disliked:=reading_disliked-t;reading_reserved:=reading_reserved-t;reading_tokens:=reading_tokens-t;
    -- Removing a reading preference never erases an already known work.
    if not reading_seen ? t then reading_seen:=reading_seen||jsonb_build_array(t);end if;$after_reading$,
 $after_import$   -- Guest history removal can migrate privately to the signed-in owner.
   -- Only the explicit lifetime action and a literal true marker are accepted;
   -- passive enrichment cannot clear an existing hidden-history marker.
   if i->>'action'='lifetime' and i->'historyHidden'='true'::jsonb then
    clean:=clean||jsonb_build_object('historyHidden',true);
   end if;
   if p_action = 'claim' then
    clean:=clean||jsonb_build_object('action','reserved','claimToken',token,'addedAt',(extract(epoch from now())*1000)::bigint);
   end if;$after_import$,
 $after_incoming$    jsonb_build_array(match_private.title_key(t))||
    to_jsonb(match_private.session_title_keys(i-'identityKeys'-'titleAliases'))||
    case when original<>'' then jsonb_build_array(match_private.title_key(original)) else '[]'::jsonb end||$after_incoming$,
 $after_claim$    where user_id=uid and (title_key=any(identity_names) or match_private.session_title_keys(item)&&identity_names)$after_claim$,
 $after_forget$  -- A preference/history removal hides the record, not its lifetime keys.
  -- Drop the old reservation token and use a non-reserved action so a delayed
  -- release_claim cannot delete this permanent exclusion after removal.
  update match_private.title_exclusions
   set item=(item-'claimToken')||jsonb_build_object('action','lifetime','historyHidden',true)
   where user_id=uid and (title_key=any(identity_names) or match_private.session_title_keys(item)&&identity_names);$after_forget$,
 $after_result$   'keys',(select coalesce(jsonb_agg(distinct k.value),'[]'::jsonb) from match_private.title_exclusions x cross join lateral unnest(array_append(match_private.session_title_keys(x.item),x.title_key)) k(value) where x.user_id=uid),
   'hiddenKeys',(select coalesce(jsonb_agg(distinct k.value),'[]'::jsonb) from match_private.title_exclusions x cross join lateral unnest(array_append(match_private.session_title_keys(x.item),x.title_key)) k(value) where x.user_id=uid and x.item->'historyHidden'='true'::jsonb),
   'history',(select coalesce(jsonb_agg(item order by (item->>'addedAt')::bigint desc),'[]'::jsonb) from match_private.title_exclusions where user_id=uid and item->'historyHidden' is distinct from 'true'::jsonb)$after_result$
 ];
 i integer;
 old_count integer;
 new_count integer;
begin
 original_definition:=definition;
 for i in 1..array_length(before_parts,1) loop
  old_count:=(length(definition)-length(replace(definition,before_parts[i],'')))/length(before_parts[i]);
  new_count:=(length(definition)-length(replace(definition,after_parts[i],'')))/length(after_parts[i]);
  if old_count=1 and new_count=0 then
   definition:=replace(definition,before_parts[i],after_parts[i]);
  elsif old_count=0 and new_count=1 then
   -- Safe on an exact rerun, without losing any subsequently stored history.
   null;
  else
   raise exception 'Lifetime exclusions baseline mismatch at patch % (old %, new %)',i,old_count,new_count;
  end if;
 end loop;
 if definition is distinct from original_definition then execute definition;end if;
end;
$lifetime_match_exclusions$;
