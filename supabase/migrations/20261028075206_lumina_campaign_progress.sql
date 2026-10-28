-- Extend private Lumina account saves to the 250-level campaign. Legacy
-- browser saves and online friends rooms keep their existing contract.
begin;

-- Pure validators are private, invoker-only and callable only by their owner.
-- They never read identity, write data or expose game state.
create function match_private.lumina_validate_saved_cards(p_cards jsonb,p_pairs integer,p_art text[],p_allow_complete boolean)
returns void language plpgsql immutable security invoker set search_path='' as $$
declare entry jsonb;
begin
  if jsonb_typeof(p_cards) is distinct from 'array' or jsonb_array_length(p_cards)<>p_pairs*2 then
    raise exception 'LUMINA_INVALID';
  end if;
  for entry in select value from jsonb_array_elements(p_cards) loop
    if jsonb_typeof(entry) is distinct from 'object'
      or not (entry ?& array['art','matched'])
      or exists(select 1 from jsonb_object_keys(entry) k where k not in ('art','matched'))
      or jsonb_typeof(entry->'matched') is distinct from 'boolean'
      or jsonb_typeof(entry->'art') is distinct from 'string'
      or not (entry->>'art'=any(p_art)) then
      raise exception 'LUMINA_INVALID';
    end if;
  end loop;
  if (select count(distinct value->>'art') from jsonb_array_elements(p_cards))<>p_pairs
    or exists(select 1 from jsonb_array_elements(p_cards) group by value->>'art'
      having count(*)<>2 or bool_and((value->>'matched')::boolean)<>bool_or((value->>'matched')::boolean))
    or (not p_allow_complete and not exists(select 1 from jsonb_array_elements(p_cards) where value->>'matched'='false')) then
    raise exception 'LUMINA_INVALID';
  end if;
exception when invalid_text_representation or numeric_value_out_of_range or invalid_parameter_value then
  raise exception 'LUMINA_INVALID';
end;
$$;
revoke all on function match_private.lumina_validate_saved_cards(jsonb,integer,text[],boolean) from public,anon,authenticated;

create function match_private.lumina_validate_saved_progress(proposed jsonb)
returns void language plpgsql immutable security invoker set search_path='' as $$
declare
  active_round jsonb; campaign jsonb; active_level jsonb; entry jsonb;
  position bigint; unlocked integer; level integer; pairs integer; version_two boolean;
  pool text[];
begin
  if jsonb_typeof(proposed) is distinct from 'object' then raise exception 'LUMINA_INVALID'; end if;
  version_two:=proposed ? 'version';
  if octet_length(proposed::text)>(case when version_two then 16384 else 8192 end)
    or not (proposed ?& array['points','rounds','activeRound'])
    or exists(select 1 from jsonb_object_keys(proposed) k
      where k not in ('points','rounds','activeRound') and not (version_two and k in ('version','campaign')))
    or jsonb_typeof(proposed->'points') is distinct from 'number'
    or jsonb_typeof(proposed->'rounds') is distinct from 'number'
    or (proposed->>'points') !~ '^[0-9]{1,10}$' or (proposed->>'rounds') !~ '^[0-9]{1,10}$'
    or (proposed->>'points')::bigint>1000000000 or (proposed->>'rounds')::bigint>1000000000 then
    raise exception 'LUMINA_INVALID';
  end if;
  active_round:=proposed->'activeRound';
  if active_round<>'null'::jsonb then
    if jsonb_typeof(active_round) is distinct from 'object'
      or not (active_round ?& array['cards','moves'])
      or exists(select 1 from jsonb_object_keys(active_round) k where k not in ('cards','moves'))
      or jsonb_typeof(active_round->'moves') is distinct from 'number'
      or (active_round->>'moves') !~ '^[0-9]{1,7}$'
      or (active_round->>'moves')::integer>1000000 then
      raise exception 'LUMINA_INVALID';
    end if;
    perform match_private.lumina_validate_saved_cards(active_round->'cards',6,
      array['moon','star','planet','heart','crystal','butterfly','orb','sun'],true);
  end if;
  if not version_two then return; end if;
  if jsonb_typeof(proposed->'version') is distinct from 'number' or proposed->>'version'<>'2'
    or not (proposed ? 'campaign') then raise exception 'LUMINA_INVALID'; end if;
  campaign:=proposed->'campaign';
  if jsonb_typeof(campaign) is distinct from 'object'
    or not (campaign ?& array['unlocked','results','activeLevel'])
    or exists(select 1 from jsonb_object_keys(campaign) k where k not in ('unlocked','results','activeLevel'))
    or jsonb_typeof(campaign->'unlocked') is distinct from 'number'
    or (campaign->>'unlocked') !~ '^[0-9]{1,3}$'
    or (campaign->>'unlocked')::integer not between 1 and 250
    or jsonb_typeof(campaign->'results') is distinct from 'array'
    or jsonb_array_length(campaign->'results')<>250 then
    raise exception 'LUMINA_INVALID';
  end if;
  unlocked:=(campaign->>'unlocked')::integer;
  for entry,position in select value,ordinality from jsonb_array_elements(campaign->'results') with ordinality loop
    if entry='null'::jsonb then
      if position<unlocked then raise exception 'LUMINA_INVALID'; end if;
    else
      if (position>=unlocked and not (unlocked=250 and position=250))
        or jsonb_typeof(entry) is distinct from 'array' or jsonb_array_length(entry)<>3
        or jsonb_typeof(entry->0) is distinct from 'number' or entry->>0 !~ '^[1-3]$'
        or jsonb_typeof(entry->1) is distinct from 'number' or entry->>1 !~ '^[0-9]{1,7}$'
        or (entry->>1)::integer>1000000
        or jsonb_typeof(entry->2) is distinct from 'number' or entry->>2 !~ '^[0-9]{1,5}$'
        or (entry->>2)::integer>86400 then raise exception 'LUMINA_INVALID'; end if;
    end if;
  end loop;
  active_level:=campaign->'activeLevel';
  if active_level='null'::jsonb then return; end if;
  if jsonb_typeof(active_level) is distinct from 'object'
    or not (active_level ?& array['level','cards','moves','elapsedSeconds','timed','hintsUsed'])
    or exists(select 1 from jsonb_object_keys(active_level) k where k not in ('level','cards','moves','elapsedSeconds','timed','hintsUsed'))
    or jsonb_typeof(active_level->'level') is distinct from 'number'
    or (active_level->>'level') !~ '^[0-9]{1,3}$'
    or (active_level->>'level')::integer not between 1 and unlocked
    or jsonb_typeof(active_level->'moves') is distinct from 'number'
    or (active_level->>'moves') !~ '^[0-9]{1,7}$' or (active_level->>'moves')::integer>1000000
    or jsonb_typeof(active_level->'elapsedSeconds') is distinct from 'number'
    or (active_level->>'elapsedSeconds') !~ '^[0-9]{1,5}$' or (active_level->>'elapsedSeconds')::integer>86400
    or jsonb_typeof(active_level->'timed') is distinct from 'boolean'
    or jsonb_typeof(active_level->'hintsUsed') is distinct from 'number' or (active_level->>'hintsUsed') !~ '^[0-3]$' then
    raise exception 'LUMINA_INVALID';
  end if;
  level:=(active_level->>'level')::integer;
  pairs:=least(4+level/10,20);
  if level%20=0 then
    pool:=array['mushroom','firefly','crystalflower','fern','fox','moonflower'];
    pairs:=least(pairs,6);
  elsif level%25=0 then
    pool:=array['jellyfish','shell','seahorse','coral','starfish','dolphin'];
    pairs:=least(pairs,6);
  else
    pool:=array['moon','star','planet','heart','crystal','butterfly','lotus','orb','sun','nebula','gem','lantern'];
    if level>=90 then pool:=pool||array['mushroom','firefly','crystalflower','fern','fox','moonflower','jellyfish','shell','seahorse','coral','starfish','dolphin']; end if;
  end if;
  perform match_private.lumina_validate_saved_cards(active_level->'cards',pairs,pool,false);
exception when invalid_text_representation or numeric_value_out_of_range or invalid_parameter_value then
  raise exception 'LUMINA_INVALID';
end;
$$;
revoke all on function match_private.lumina_validate_saved_progress(jsonb) from public,anon,authenticated;

create or replace function match_private.lumina_impl(p_action text,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  uid uuid:=auth.uid(); other uuid; actor integer; wanted_index integer;
  r match_private.lumina_rooms%rowtype;
  saved match_private.lumina_progress%rowtype;
  proposed jsonb; legacy_write boolean;
  expected_revision bigint; deck_cards text[];
begin
  if uid is null or not exists(select 1 from auth.users where id=uid and is_anonymous=false) then
    raise exception 'LUMINA_SIGN_IN_REQUIRED';
  end if;
  if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>(case when p_action='save_progress' then 16640 else 12000 end) then
    raise exception 'LUMINA_INVALID';
  end if;

  if p_action in ('progress','save_progress') then
    if p_action='progress' then
      select * into saved from match_private.lumina_progress where user_id=uid;
      return jsonb_build_object('revision',coalesce(saved.revision,0),'progress',saved.progress,'updatedAt',saved.updated_at);
    end if;
    proposed:=p_payload->'progress';
    perform match_private.lumina_validate_saved_progress(proposed);
    if jsonb_typeof(p_payload->'revision') is distinct from 'number'
      or (p_payload->>'revision') !~ '^[0-9]{1,15}$' then raise exception 'LUMINA_INVALID'; end if;
    expected_revision:=(p_payload->>'revision')::bigint;
    legacy_write:=not (proposed ? 'version');
    insert into match_private.lumina_progress(user_id) values(uid) on conflict do nothing;
    select * into saved from match_private.lumina_progress where user_id=uid for update;
    if saved.revision<>expected_revision then raise exception 'LUMINA_CONFLICT'; end if;
    -- An older, cached six-pair client must not erase campaign progress. Merge
    -- while holding the same revision lock, and acknowledge its legacy shape.
    if legacy_write and saved.progress->>'version'='2' then
      proposed:=proposed||jsonb_build_object('version',2,'campaign',saved.progress->'campaign');
      perform match_private.lumina_validate_saved_progress(proposed);
    end if;
    update match_private.lumina_progress set progress=proposed,revision=revision+1,updated_at=clock_timestamp()
      where user_id=uid returning * into saved;
    return jsonb_build_object('revision',saved.revision,
      'progress',case when legacy_write then saved.progress-array['version','campaign'] else saved.progress end,
      'updatedAt',saved.updated_at);
  end if;

  if p_action='list' then
    return jsonb_build_object(
      'friends',(select coalesce(jsonb_agg(jsonb_build_object('friend',p.user_id,'alias',p.alias,
        'online',coalesce(p.presence and p.last_seen>now()-interval '75 seconds',false)) order by p.alias),'[]'::jsonb)
        from match_private.friendships f join match_private.friend_profiles p
          on p.user_id=case when f.sender=uid then f.recipient else f.sender end
        where uid in(f.sender,f.recipient) and f.status='accepted'),
      'rooms',(select coalesce(jsonb_agg(jsonb_build_object('code',x.code,'status',x.status,
        'incoming',x.guest=uid,'friendAlias',p.alias,'revision',x.revision,
        'createdAt',x.created_at,'expiresAt',x.expires_at) order by x.updated_at desc),'[]'::jsonb)
        from (select g.* from match_private.lumina_rooms g
          where uid in(g.host,g.guest) and g.expires_at>now() and g.status in ('pending','active','complete')
          and exists(select 1 from match_private.friendships f where f.status='accepted'
            and least(f.sender,f.recipient)=least(g.host,g.guest) and greatest(f.sender,f.recipient)=greatest(g.host,g.guest))
          order by g.updated_at desc limit 20) x
        left join match_private.friend_profiles p on p.user_id=case when x.host=uid then x.guest else x.host end)
    );
  end if;

  if p_action='create' then
    if coalesce(p_payload->>'friend','') !~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$' then
      raise exception 'LUMINA_INVALID';
    end if;
    other:=(p_payload->>'friend')::uuid;
    if other=uid or not exists(select 1 from auth.users where id=other and is_anonymous=false) then
      raise exception 'LUMINA_FORBIDDEN';
    end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('lumina-host:'||uid::text,0));
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('lumina-pair:'||least(uid,other)::text||greatest(uid,other)::text,0));
    -- Hold mutual approval through creation; a concurrent removal cannot pass
    -- between the authorization check and the room write.
    perform 1 from match_private.friendships f where f.status='accepted'
      and least(f.sender,f.recipient)=least(uid,other) and greatest(f.sender,f.recipient)=greatest(uid,other) for share;
    if not found then raise exception 'LUMINA_FORBIDDEN'; end if;
    select * into r from match_private.lumina_rooms g where g.status in ('pending','active') and g.expires_at>now()
      and least(g.host,g.guest)=least(uid,other) and greatest(g.host,g.guest)=greatest(uid,other)
      order by g.created_at desc limit 1 for update;
    if found then return match_private.lumina_room_json(r,uid); end if;
    if (select count(*) from match_private.lumina_rooms where host=uid and created_at>now()-interval '24 hours')>=20
      or (select count(*) from match_private.lumina_rooms where host=uid and status='pending' and expires_at>now())>=5 then
      raise exception 'LUMINA_LIMIT';
    end if;
    insert into match_private.lumina_rooms(host,guest) values(uid,other) returning * into r;
    return match_private.lumina_room_json(r,uid);
  end if;

  if p_action not in ('get','accept','decline','cancel','leave','flip') then raise exception 'LUMINA_INVALID'; end if;
  if coalesce(p_payload->>'code','') !~ '^[a-f0-9]{32}$' then raise exception 'LUMINA_INVALID'; end if;
  select * into r from match_private.lumina_rooms where code=p_payload->>'code' and uid in(host,guest) for update;
  if not found then raise exception 'LUMINA_NOT_FOUND'; end if;
  perform 1 from match_private.friendships f where f.status='accepted'
    and least(f.sender,f.recipient)=least(r.host,r.guest) and greatest(f.sender,f.recipient)=greatest(r.host,r.guest) for share;
  if not found then raise exception 'LUMINA_FORBIDDEN'; end if;
  actor:=case when uid=r.host then 1 else 2 end;
  if r.status in ('pending','active') and r.expires_at<=clock_timestamp() then
    update match_private.lumina_rooms set status='expired',revealed='{}',reveal_until=null,
      revision=revision+1,updated_at=clock_timestamp() where code=r.code returning * into r;
  end if;
  -- Polling settles a pair after the reveal window. Row locks serialize all devices.
  if r.status='active' and r.reveal_until is not null and r.reveal_until<=clock_timestamp() then
    if not r.matched[r.revealed[1]+1] then r.turn:=3-r.turn; end if;
    r.revealed:='{}'::integer[]; r.reveal_until:=null;
    if not (false=any(r.matched)) then r.status:='complete'; end if;
    update match_private.lumina_rooms set turn=r.turn,status=r.status,revealed=r.revealed,reveal_until=null,
      revision=revision+1,updated_at=clock_timestamp() where code=r.code returning * into r;
  end if;

  if p_action='accept' then
    if actor<>2 then raise exception 'LUMINA_FORBIDDEN'; end if;
    if r.status='pending' then
      with pool as materialized (select art from unnest(array['moon','star','planet','heart','crystal','butterfly','orb','sun']) art order by random() limit 6)
      select array_agg(art order by random()) into deck_cards from (select art from pool union all select art from pool) shuffled;
      update match_private.lumina_rooms set status='active',deck=deck_cards,revision=revision+1,updated_at=clock_timestamp()
        where code=r.code returning * into r;
    end if;
  elsif p_action='decline' then
    if actor<>2 then raise exception 'LUMINA_FORBIDDEN'; end if;
    if r.status='pending' then
      update match_private.lumina_rooms set status='declined',revision=revision+1,updated_at=clock_timestamp()
        where code=r.code returning * into r;
    end if;
  elsif p_action='cancel' then
    if actor<>1 then raise exception 'LUMINA_FORBIDDEN'; end if;
    if r.status='pending' then
      update match_private.lumina_rooms set status='canceled',revision=revision+1,updated_at=clock_timestamp()
        where code=r.code returning * into r;
    end if;
  elsif p_action='leave' then
    if r.status in ('pending','active') then
      update match_private.lumina_rooms set status='canceled',revealed='{}',reveal_until=null,revision=revision+1,updated_at=clock_timestamp()
        where code=r.code returning * into r;
    end if;
  elsif p_action='flip' then
    if r.status<>'active' then raise exception 'LUMINA_FINISHED'; end if;
    if r.reveal_until is not null then raise exception 'LUMINA_WAIT'; end if;
    if actor<>r.turn then raise exception 'LUMINA_NOT_YOUR_TURN'; end if;
    if jsonb_typeof(p_payload->'revision') is distinct from 'number' or coalesce(p_payload->>'revision','') !~ '^[0-9]{1,15}$'
      or jsonb_typeof(p_payload->'index') is distinct from 'number' or coalesce(p_payload->>'index','') !~ '^[0-9]{1,2}$' then
      raise exception 'LUMINA_INVALID';
    end if;
    if (p_payload->>'revision')::bigint<>r.revision then raise exception 'LUMINA_CONFLICT'; end if;
    wanted_index:=(p_payload->>'index')::integer;
    if wanted_index not between 0 and 11 or r.matched[wanted_index+1] or wanted_index=any(r.revealed) then
      raise exception 'LUMINA_INVALID';
    end if;
    r.revealed:=array_append(r.revealed,wanted_index);
    if cardinality(r.revealed)=2 then
      r.moves:=r.moves+1;
      r.reveal_until:=clock_timestamp()+interval '1500 milliseconds';
      if r.deck[r.revealed[1]+1]=r.deck[r.revealed[2]+1] then
        r.matched[r.revealed[1]+1]:=true; r.matched[r.revealed[2]+1]:=true;
        r.scores[actor]:=r.scores[actor]+1;
      end if;
    end if;
    update match_private.lumina_rooms set revealed=r.revealed,reveal_until=r.reveal_until,
      matched=r.matched,scores=r.scores,moves=r.moves,revision=revision+1,updated_at=clock_timestamp()
      where code=r.code returning * into r;
  end if;
  return match_private.lumina_room_json(r,uid);
exception when invalid_text_representation or numeric_value_out_of_range or invalid_parameter_value then
  raise exception 'LUMINA_INVALID';
end;
$$;
revoke all on function match_private.lumina_impl(text,jsonb) from public,anon,authenticated;
grant execute on function match_private.lumina_impl(text,jsonb) to authenticated;

commit;
