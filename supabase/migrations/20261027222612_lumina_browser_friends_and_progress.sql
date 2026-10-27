-- Isolated Lumina browser rooms and account saves. Existing Friends, matching,
-- quota, notifications, Kids and advertising objects remain unchanged.
begin;

create table match_private.lumina_rooms (
  code text primary key default replace(gen_random_uuid()::text,'-','') check (code ~ '^[a-f0-9]{32}$'),
  host uuid not null references auth.users(id) on delete cascade,
  guest uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','active','complete','declined','canceled','expired')),
  deck text[] not null default '{}'::text[],
  matched boolean[] not null default array_fill(false,array[12]),
  revealed integer[] not null default '{}'::integer[],
  turn integer not null default 1 check (turn in (1,2)),
  scores integer[] not null default array[0,0],
  moves integer not null default 0 check (moves >= 0),
  revision bigint not null default 0 check (revision >= 0),
  reveal_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '24 hours',
  check (host <> guest),
  check (cardinality(deck) in (0,12)),
  check (cardinality(matched)=12),
  check (cardinality(scores)=2 and scores[1] between 0 and 6 and scores[2] between 0 and 6),
  check (cardinality(revealed) between 0 and 2)
);
create index lumina_rooms_host_created on match_private.lumina_rooms(host,created_at desc);
create index lumina_rooms_guest_updated on match_private.lumina_rooms(guest,updated_at desc);
alter table match_private.lumina_rooms enable row level security;
revoke all on match_private.lumina_rooms from public,anon,authenticated;

create table match_private.lumina_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 0 check (revision >= 0),
  progress jsonb,
  updated_at timestamptz
);
alter table match_private.lumina_progress enable row level security;
revoke all on match_private.lumina_progress from public,anon,authenticated;

-- Only the caller's guarded implementation can execute this internal serializer.
-- The full deck never leaves the database: only currently visible cards are sent.
create function match_private.lumina_room_json(r match_private.lumina_rooms,uid uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
  select jsonb_build_object(
    'code',r.code,'status',r.status,'player',case when uid=r.host then 1 else 2 end,
    'turn',r.turn,'scores',to_jsonb(r.scores),'moves',r.moves,'revision',r.revision,
    'friendAlias',(select p.alias from match_private.friend_profiles p
      where p.user_id=case when uid=r.host then r.guest else r.host end),
    'incoming',uid=r.guest,'createdAt',r.created_at,'expiresAt',r.expires_at,
    'revealUntil',r.reveal_until,
    'winner',case when r.status='complete' then case when r.scores[1]=r.scores[2] then 0 when r.scores[1]>r.scores[2] then 1 else 2 end else null end,
    'cards',case when r.status in ('active','complete') then
      (select coalesce(jsonb_agg(jsonb_build_object('index',i-1,
        'art',case when r.matched[i] or (i-1)=any(r.revealed) then r.deck[i] else null end,
        'matched',r.matched[i],'flipped',r.matched[i] or (i-1)=any(r.revealed)) order by i),'[]'::jsonb)
        from generate_series(1,cardinality(r.deck)) i)
      else '[]'::jsonb end
  )
$$;
revoke all on function match_private.lumina_room_json(match_private.lumina_rooms,uuid) from public,anon,authenticated;

create function match_private.lumina_impl(p_action text,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  uid uuid:=auth.uid(); other uuid; actor integer; wanted_index integer;
  r match_private.lumina_rooms%rowtype;
  saved match_private.lumina_progress%rowtype;
  proposed jsonb; active_round jsonb; entry jsonb;
  expected_revision bigint; deck_cards text[];
begin
  if uid is null or not exists(select 1 from auth.users where id=uid and is_anonymous=false) then
    raise exception 'LUMINA_SIGN_IN_REQUIRED';
  end if;
  if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>12000 then
    raise exception 'LUMINA_INVALID';
  end if;

  if p_action in ('progress','save_progress') then
    if p_action='progress' then
      select * into saved from match_private.lumina_progress where user_id=uid;
      return jsonb_build_object('revision',coalesce(saved.revision,0),'progress',saved.progress,'updatedAt',saved.updated_at);
    end if;
    proposed:=p_payload->'progress';
    if jsonb_typeof(proposed) is distinct from 'object' or octet_length(proposed::text)>8192
      or not (proposed ?& array['points','rounds','activeRound'])
      or exists(select 1 from jsonb_object_keys(proposed) k where k not in ('points','rounds','activeRound'))
      or jsonb_typeof(proposed->'points') is distinct from 'number'
      or jsonb_typeof(proposed->'rounds') is distinct from 'number'
      or (proposed->>'points') !~ '^[0-9]{1,10}$' or (proposed->>'rounds') !~ '^[0-9]{1,10}$'
      or (proposed->>'points')::bigint>1000000000 or (proposed->>'rounds')::bigint>1000000000
      or jsonb_typeof(p_payload->'revision') is distinct from 'number'
      or (p_payload->>'revision') !~ '^[0-9]{1,15}$' then
      raise exception 'LUMINA_INVALID';
    end if;
    active_round:=proposed->'activeRound';
    if active_round<>'null'::jsonb then
      if jsonb_typeof(active_round) is distinct from 'object'
        or not (active_round ?& array['cards','moves'])
        or exists(select 1 from jsonb_object_keys(active_round) k where k not in ('cards','moves'))
        or jsonb_typeof(active_round->'cards') is distinct from 'array'
        or jsonb_array_length(active_round->'cards')<>12
        or jsonb_typeof(active_round->'moves') is distinct from 'number'
        or (active_round->>'moves') !~ '^[0-9]{1,7}$'
        or (active_round->>'moves')::integer>1000000 then
        raise exception 'LUMINA_INVALID';
      end if;
      for entry in select value from jsonb_array_elements(active_round->'cards') loop
        if jsonb_typeof(entry) is distinct from 'object'
          or not (entry ?& array['art','matched'])
          or exists(select 1 from jsonb_object_keys(entry) k where k not in ('art','matched'))
          or jsonb_typeof(entry->'matched') is distinct from 'boolean'
          or jsonb_typeof(entry->'art') is distinct from 'string'
          or entry->>'art' not in ('moon','star','planet','heart','crystal','butterfly','orb','sun') then
          raise exception 'LUMINA_INVALID';
        end if;
      end loop;
      if (select count(distinct value->>'art') from jsonb_array_elements(active_round->'cards'))<>6
        or exists(select 1 from jsonb_array_elements(active_round->'cards')
          group by value->>'art' having count(*)<>2 or bool_and((value->>'matched')::boolean)<>bool_or((value->>'matched')::boolean)) then
        raise exception 'LUMINA_INVALID';
      end if;
    end if;
    expected_revision:=(p_payload->>'revision')::bigint;
    insert into match_private.lumina_progress(user_id) values(uid) on conflict do nothing;
    select * into saved from match_private.lumina_progress where user_id=uid for update;
    if saved.revision<>expected_revision then raise exception 'LUMINA_CONFLICT'; end if;
    update match_private.lumina_progress set progress=proposed,revision=revision+1,updated_at=clock_timestamp()
      where user_id=uid returning * into saved;
    return jsonb_build_object('revision',saved.revision,'progress',saved.progress,'updatedAt',saved.updated_at);
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

create function public.lumina_action(p_action text,p_payload jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path='' as $$
  select match_private.lumina_impl(p_action,p_payload)
$$;
revoke all on function public.lumina_action(text,jsonb) from public,anon,authenticated;
grant execute on function public.lumina_action(text,jsonb) to authenticated;

commit;
