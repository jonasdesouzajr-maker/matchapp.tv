begin;

-- A rerun may encounter this helper after later work. Only its reviewed body,
-- invoker settings, empty search path and owner-only execution are replaceable.
-- The body hash was measured from this migration in the PGlite fixture.
do $canonical_helper_baseline$
declare existing oid:=pg_catalog.to_regprocedure('match_private.canonical_session_title(jsonb)');
begin
 if existing is null then return;end if;
 if not exists(
  select 1 from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
  where p.oid=existing and md5(p.prosrc)='5cf9834e5e5a6529028785caf433798a'
   and l.lanname='plpgsql' and p.prokind='f' and p.provolatile='s'
   and not p.prosecdef and not p.proisstrict and not p.proleakproof and not p.proretset
   and p.proparallel='u' and p.proconfig=array['search_path=""']::text[]
   and p.proargnames=array['p_item']::text[] and p.pronargdefaults=0 and p.provariadic=0
   and p.prorettype='jsonb'::regtype and p.procost=100 and p.prorows=0
   and (select count(*) from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))))=1
   and exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
    where a.grantor=p.proowner and a.grantee=p.proowner and a.privilege_type='EXECUTE' and not a.is_grantable)
 ) then raise exception 'Canonical lifetime helper baseline mismatch; newer helper left unchanged';end if;
end;
$canonical_helper_baseline$;

-- Resolve title-only backend candidates before exclusion filtering/publication.
-- No fuzzy lookup: a film/TV candidate needs one existing exact typed identity,
-- or one verified TMDB metadata identity at the same normalized title/year/kind.
-- Non-audiovisual formats retain their existing identity and criteria behavior.
create or replace function match_private.canonical_session_title(p_item jsonb)
returns jsonb language plpgsql stable set search_path='' as $$
declare
 keys text[]; typed text[]; kind text; cats text; title_norm text;
 exact_id bigint; identity_count integer; source_year integer;
begin
 if jsonb_typeof(p_item) is distinct from 'object' or coalesce(trim(p_item->>'title'),'')='' then return null;end if;
 keys:=match_private.session_title_keys(p_item);
 select coalesce(array_agg(k),'{}'::text[]) into typed from unnest(keys) k
  where k~'^tmdb:(movie|tv):[1-9][0-9]*$' and length(k)<=40
   and split_part(k,':',3)::numeric between 1 and 9007199254740991;
 if exists(select 1 from unnest(keys) k where k~'^tmdb:' and not (k=any(typed))) then return null;end if;
 if cardinality(typed)=1 then
  -- Exact IDs from the source-verified frontend are authoritative even when
  -- the server enrichment cache has not fetched that title yet.
  return p_item||jsonb_build_object('kind',split_part(typed[1],':',2),'tmdbId',split_part(typed[1],':',3)::bigint,
   'identityKeys',to_jsonb(keys));
 elsif cardinality(typed)>1 then return null;end if;
 kind:=coalesce(p_item->>'kind',p_item->>'media_kind',p_item->>'media_type',p_item->>'_tmdbKind');
 select coalesce(string_agg(value,' '),'') into cats from jsonb_array_elements_text(
  case when jsonb_typeof(p_item->'cats')='array' then p_item->'cats' else '[]'::jsonb end);
 -- These are the existing catalog-ingest format mappings; no scoring/filter
 -- criteria are changed and no movie/TV namespace is guessed from a title.
 if coalesce(kind,'')='' then
  if lower(cats)~'\m(movie|film|cinema|bollywood|nollywood)\M' then kind:='movie';
  elsif lower(cats)~'(series|drama|novela|telenovela|dizi|anime|reality)' then kind:='tv';
  elsif lower(cats)~'(podcast|audiobook|playlist|album|single|music|classical|gospel|song|radio|concert|youtube|news|sports|cooking|recipes|fitness|wellness)' then return p_item;
  else return null;end if;
 end if;
 if kind not in ('movie','tv') then
  if kind in ('music','podcast','audiobook','audio') then return p_item;end if;
  return null;
 end if;
 if coalesce(p_item->>'year','')!~'^[0-9]{4}$' then return null;end if;
 source_year:=(p_item->>'year')::integer;
 if source_year not between 1888 and 2100 then return null;end if;
 -- Mirror catalog-media-ingest's NFD, combining-mark removal and alnum key.
 title_norm:=regexp_replace(lower(regexp_replace(normalize(p_item->>'title',NFD),U&'[\0300-\036f]','','g')),'[^[:alnum:]]','','g');
 select count(distinct d.tmdb_id),min(d.tmdb_id) into identity_count,exact_id
 from public.catalog_media_metadata d
 where d.normalized_title=title_norm and d.year=source_year and d.media_kind=kind
  and d.source='tmdb' and d.tmdb_id between 1 and 9007199254740991
  and d.source_key='tmdb:'||kind||':'||d.tmdb_id::text;
 if identity_count<>1 then return null;end if;
 return p_item||jsonb_build_object('kind',kind,'tmdbId',exact_id,
  'identityKeys',to_jsonb(array_append(keys,'tmdb:'||kind||':'||exact_id::text)));
end $$;
revoke all on function match_private.canonical_session_title(jsonb) from public,anon,authenticated;

-- Preserve the existing function OID, grants, locks and all unrelated branches.
do $canonical_patch_1$
declare
 definition text:=pg_catalog.pg_get_functiondef('match_private.record_session_title(uuid[],jsonb,text,uuid,text)'::regprocedure);
 original_definition text;
 before_parts text[]:=array[
 $before_1$ keys:=match_private.session_title_keys(p_item);$before_1$,
 $before_2$    i:=i||jsonb_build_object('title',title,'identityKeys',to_jsonb(match_private.session_title_keys(i)),$before_2$
 ];
 after_parts text[]:=array[
 $after_1$ p_item:=match_private.canonical_session_title(p_item);
 if p_item is null then return false;end if;
 keys :=match_private.session_title_keys(p_item);$after_1$,
 $after_2$    -- Legacy history may lack source metadata; retain its title exclusion.
    i:=coalesce(match_private.canonical_session_title(i),i);
    i :=i||jsonb_build_object('title',title,'identityKeys',to_jsonb(match_private.session_title_keys(i)),$after_2$
 ];
 i integer;old_count integer;new_count integer;
begin
 original_definition:=definition;
 for i in 1..array_length(before_parts,1) loop
  old_count:=(length(definition)-length(replace(definition,before_parts[i],'')))/length(before_parts[i]);
  new_count:=(length(definition)-length(replace(definition,after_parts[i],'')))/length(after_parts[i]);
  if old_count=1 and new_count=0 then definition:=replace(definition,before_parts[i],after_parts[i]);
  elsif old_count=0 and new_count=1 then null;
  else raise exception 'Canonical lifetime baseline mismatch in match_private.record_session_title(uuid[],jsonb,text,uuid,text) at patch % (old %, new %)',i,old_count,new_count;
  end if;
 end loop;
 if definition is distinct from original_definition then execute definition;end if;
end;
$canonical_patch_1$;

-- Preserve the existing function OID, grants, locks and all unrelated branches.
do $canonical_patch_2$
declare
 definition text:=pg_catalog.pg_get_functiondef('match_private.friends_impl(text,jsonb)'::regprocedure);
 original_definition text;
 before_parts text[]:=array[
 $before_1$   select c.entry into chosen from match_private.catalog c where match_private.criteria_match(c.entry,row.host_prefs) and match_private.criteria_match(c.entry,row.guest_prefs)$before_1$
 ];
 after_parts text[]:=array[
 $after_1$   select c.entry into chosen from (select source.title_key,match_private.canonical_session_title(source.entry) as entry from match_private.catalog source) c where c.entry is not null and match_private.criteria_match(c.entry,row.host_prefs) and match_private.criteria_match(c.entry,row.guest_prefs)$after_1$
 ];
 i integer;old_count integer;new_count integer;
begin
 original_definition:=definition;
 for i in 1..array_length(before_parts,1) loop
  old_count:=(length(definition)-length(replace(definition,before_parts[i],'')))/length(before_parts[i]);
  new_count:=(length(definition)-length(replace(definition,after_parts[i],'')))/length(after_parts[i]);
  if old_count=1 and new_count=0 then definition:=replace(definition,before_parts[i],after_parts[i]);
  elsif old_count=0 and new_count=1 then null;
  else raise exception 'Canonical lifetime baseline mismatch in match_private.friends_impl(text,jsonb) at patch % (old %, new %)',i,old_count,new_count;
  end if;
 end loop;
 if definition is distinct from original_definition then execute definition;end if;
end;
$canonical_patch_2$;

-- Preserve the existing function OID, grants, locks and all unrelated branches.
do $canonical_patch_3$
declare
 definition text:=pg_catalog.pg_get_functiondef('public.growth_together_service(text,jsonb)'::regprocedure);
 original_definition text;
 before_parts text[]:=array[
 $before_1$    from match_private.catalog c
    where match_private.criteria_match(c.entry,v.host_prefs||'{"plat":"any"}'::jsonb)$before_1$,
 $before_2$    select c.entry into v_entry from match_private.catalog c where c.title_key=v_key$before_2$,
 $before_3$    v_result:=(p_payload->'result')||jsonb_build_object('matchScope',v_scope);$before_3$
 ];
 after_parts text[]:=array[
 $after_1$    from (select source.title_key,match_private.canonical_session_title(source.entry) as entry from match_private.catalog source) c
    where c.entry is not null and match_private.criteria_match(c.entry,v.host_prefs||'{"plat":"any"}'::jsonb)$after_1$,
 $after_2$    select c.entry into v_entry from (select source.title_key,match_private.canonical_session_title(source.entry) as entry from match_private.catalog source) c where c.entry is not null and c.title_key=v_key$after_2$,
 $after_3$    -- A verified Edge identity must agree with the exact catalog work.
    -- Never silently swap a remake/movie/TV identity beneath its artwork.
    v_identity:=match_private.session_title_keys(p_payload->'result');
    if exists(select 1 from unnest(v_identity) k where k~'^tmdb:' and not (k=any(match_private.session_title_keys(v_entry)))) then
      update match_private.growth_invites set status='ready',retry_after=null where id=v.id;
      return jsonb_build_object('ok',false,'error','choices_changed');
    end if;
    v_result:=(p_payload->'result')||jsonb_build_object('matchScope',v_scope)||
      case when v_entry->>'kind' in ('movie','tv') then jsonb_build_object('kind',v_entry->'kind','tmdbId',v_entry->'tmdbId') else '{}'::jsonb end;$after_3$
 ];
 i integer;old_count integer;new_count integer;
begin
 original_definition:=definition;
 for i in 1..array_length(before_parts,1) loop
  old_count:=(length(definition)-length(replace(definition,before_parts[i],'')))/length(before_parts[i]);
  new_count:=(length(definition)-length(replace(definition,after_parts[i],'')))/length(after_parts[i]);
  if old_count=1 and new_count=0 then definition:=replace(definition,before_parts[i],after_parts[i]);
  elsif old_count=0 and new_count=1 then null;
  else raise exception 'Canonical lifetime baseline mismatch in public.growth_together_service(text,jsonb) at patch % (old %, new %)',i,old_count,new_count;
  end if;
 end loop;
 if definition is distinct from original_definition then execute definition;end if;
end;
$canonical_patch_3$;

commit;
