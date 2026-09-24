-- Taste DNA daily suggestions and user-controlled notification deletion.
-- Applied to production on 2026-09-24. Scoped to Taste DNA + notifications only.

alter table match_private.user_notifications
  add column if not exists clicked_at timestamptz,
  add column if not exists expires_at timestamptz;

alter table match_private.notification_preferences
  add column if not exists suggestions boolean not null default true,
  add column if not exists timezone text not null default 'UTC';

alter table match_private.user_notifications
  drop constraint if exists user_notifications_kind_check;
alter table match_private.user_notifications
  add constraint user_notifications_kind_check
  check (kind = any (array[
    'availability'::text,'purchase'::text,'friend_request'::text,
    'match_together'::text,'account'::text,'system'::text,'suggestion'::text
  ]));

create index if not exists user_notifications_expiry
  on match_private.user_notifications(expires_at)
  where expires_at is not null;

create table if not exists match_private.taste_suggestion_days (
  user_id uuid not null references auth.users(id) on delete cascade,
  local_day date not null,
  slot smallint not null check (slot between 1 and 2),
  title_key text not null,
  created_at timestamptz not null default now(),
  primary key(user_id, local_day, slot)
);
alter table match_private.taste_suggestion_days enable row level security;
create index if not exists taste_suggestion_days_recent
  on match_private.taste_suggestion_days(user_id, created_at desc);

create or replace function match_private.json_item_title(p_item jsonb)
returns text
language sql
immutable
set search_path to ''
as $$
  select case jsonb_typeof(p_item)
    when 'string' then coalesce(p_item #>> '{}','')
    when 'object' then coalesce(p_item->>'title','')
    else ''
  end
$$;

create or replace function match_private.entry_overlap_count(p_entry jsonb, p_field text, p_values text[])
returns integer
language sql
immutable
set search_path to ''
as $$
  select count(*)::integer
  from jsonb_array_elements_text(coalesce(p_entry->p_field,'[]'::jsonb)) as v(value)
  where v.value = any(coalesce(p_values,'{}'::text[]))
$$;

create or replace function match_private.entry_similarity(p_a jsonb, p_b jsonb)
returns integer
language sql
immutable
set search_path to ''
as $$
  select
    4 * (
      select count(*)::integer
      from jsonb_array_elements_text(coalesce(p_a->'moods','[]'::jsonb)) a(value)
      where exists (
        select 1 from jsonb_array_elements_text(coalesce(p_b->'moods','[]'::jsonb)) b(value)
        where b.value=a.value
      )
    )
    + 3 * (
      select count(*)::integer
      from jsonb_array_elements_text(coalesce(p_a->'cats','[]'::jsonb)) a(value)
      where exists (
        select 1 from jsonb_array_elements_text(coalesce(p_b->'cats','[]'::jsonb)) b(value)
        where b.value=a.value
      )
    )
    + 2 * (
      select count(*)::integer
      from jsonb_array_elements_text(coalesce(p_a->'vibes','[]'::jsonb)) a(value)
      where exists (
        select 1 from jsonb_array_elements_text(coalesce(p_b->'vibes','[]'::jsonb)) b(value)
        where b.value=a.value
      )
    )
    + case
        when coalesce(p_a->>'platform','')<>'' and p_a->>'platform'=p_b->>'platform' then 2
        else 0
      end
$$;

create or replace function match_private.generate_taste_suggestions_for(p_uid uuid)
returns integer
language plpgsql
security definer
set search_path to ''
as $$
declare
  tz text := 'UTC';
  v_day date;
  v_expiry timestamptz;
  v_existing integer := 0;
  inserted_count integer := 0;
  next_slot integer;
  rec record;
begin
  if p_uid is null or not exists(
    select 1 from auth.users u where u.id=p_uid and coalesce(u.is_anonymous,false)=false
  ) then
    return 0;
  end if;

  insert into match_private.notification_preferences(user_id)
  values(p_uid) on conflict do nothing;

  select coalesce(n.timezone,'UTC')
  into tz
  from match_private.notification_preferences n
  where n.user_id=p_uid;

  if not exists(select 1 from pg_catalog.pg_timezone_names where name=tz) then
    tz:='UTC';
  end if;

  v_day := (pg_catalog.timezone(tz, pg_catalog.now()))::date;
  v_expiry := ((v_day + 1)::timestamp at time zone tz);

  delete from match_private.user_notifications
  where user_id=p_uid
    and kind='suggestion'
    and clicked_at is null
    and expires_at is not null
    and expires_at<=pg_catalog.now();

  delete from match_private.taste_suggestion_days d
  where d.user_id=p_uid and d.created_at<pg_catalog.now()-interval '120 days';

  select count(*)::integer into v_existing
  from match_private.taste_suggestion_days d
  where d.user_id=p_uid and d.local_day=v_day;

  if v_existing>=2 then return 0; end if;

  if not exists(
    select 1 from public.user_taste t
    where t.user_id=p_uid and t.completed_at is not null
  ) and not exists(
    select 1 from public.profiles p
    where p.id=p_uid and (
      jsonb_array_length(coalesce(p.saved_list,'[]'::jsonb))>0
      or jsonb_array_length(coalesce(p.seen_list,'[]'::jsonb))>0
      or jsonb_array_length(coalesce(p.disliked_list,'[]'::jsonb))>0
      or coalesce(p.user_ratings,'{}'::jsonb)<>'{}'::jsonb
    )
  ) then
    return 0;
  end if;

  for rec in
    with prof as (
      select
        coalesce((select p.saved_list from public.profiles p where p.id=p_uid),'[]'::jsonb) as saved_list,
        coalesce((select p.seen_list from public.profiles p where p.id=p_uid),'[]'::jsonb) as seen_list,
        coalesce((select p.disliked_list from public.profiles p where p.id=p_uid),'[]'::jsonb) as disliked_list,
        coalesce((select p.user_ratings from public.profiles p where p.id=p_uid),'{}'::jsonb) as user_ratings
    ),
    taste as (
      select
        coalesce((select t.moods from public.user_taste t where t.user_id=p_uid),'{}'::text[]) as moods,
        coalesce((select t.vibes from public.user_taste t where t.user_id=p_uid),'{}'::text[]) as vibes,
        coalesce((select t.cats from public.user_taste t where t.user_id=p_uid),'{}'::text[]) as cats,
        coalesce((select t.ratings from public.user_taste t where t.user_id=p_uid),'{}'::text[]) as ratings,
        coalesce((select t.exclude_titles from public.user_taste t where t.user_id=p_uid),'{}'::text[]) as exclude_titles,
        coalesce((select t.answers from public.user_taste t where t.user_id=p_uid),'{}'::jsonb) as answers
    ),
    candidates as (
      select
        c.title_key,c.entry,m.source_key,m.title,m.year,m.media_kind,
        coalesce(m.poster_large_url,m.poster_url,m.poster_original_url) as poster_url,
        coalesce(nullif(m.overview,''),nullif(c.entry->>'synopsis',''),'A title selected from your Taste DNA.') as synopsis,
        m.genres,m.origin_countries,m.availability,
        p.saved_list,p.seen_list,p.disliked_list,p.user_ratings,
        t.moods as taste_moods,t.vibes as taste_vibes,t.cats as taste_cats,t.ratings as taste_ratings,t.answers
      from match_private.catalog c
      cross join prof p
      cross join taste t
      join lateral (
        select mm.*
        from public.catalog_media_metadata mm
        where match_private.title_key(mm.title)=c.title_key
          and coalesce(mm.poster_large_url,mm.poster_url,mm.poster_original_url,'')<>''
        order by (coalesce(mm.overview,'')<>'') desc, mm.updated_at desc
        limit 1
      ) m on true
      where not exists(
        select 1 from jsonb_array_elements(p.saved_list) x
        where match_private.title_key(match_private.json_item_title(x))=c.title_key
      )
      and not exists(
        select 1 from jsonb_array_elements(p.seen_list) x
        where match_private.title_key(match_private.json_item_title(x))=c.title_key
      )
      and not exists(
        select 1 from jsonb_array_elements(p.disliked_list) x
        where match_private.title_key(match_private.json_item_title(x))=c.title_key
      )
      and not exists(
        select 1 from jsonb_each_text(p.user_ratings) r
        where match_private.title_key(r.key)=c.title_key
      )
      and not exists(
        select 1 from match_private.title_exclusions e
        where e.user_id=p_uid and e.title_key=c.title_key
      )
      and not exists(
        select 1 from unnest(t.exclude_titles) et
        where match_private.title_key(et)=c.title_key
      )
      and not exists(
        select 1 from match_private.taste_suggestion_days sd
        where sd.user_id=p_uid and sd.title_key=c.title_key
          and sd.created_at>pg_catalog.now()-interval '21 days'
      )
      and not (
        coalesce(t.answers->'avoid','[]'::jsonb) @> '["horror"]'::jsonb
        and coalesce(c.entry->'moods','[]'::jsonb) ? 'scary'
      )
      and not (
        coalesce(t.answers->'avoid','[]'::jsonb) @> '["romance"]'::jsonb
        and coalesce(c.entry->'moods','[]'::jsonb) ? 'romantic'
      )
      and not (
        coalesce(t.answers->'avoid','[]'::jsonb) @> '["reality"]'::jsonb
        and coalesce(c.entry->'cats','[]'::jsonb) ? 'reality show'
      )
      and not (
        coalesce(t.answers->'avoid','[]'::jsonb) @> '["sport"]'::jsonb
        and coalesce(c.entry->'cats','[]'::jsonb) ? 'sports'
      )
      and not (
        coalesce(t.answers->'avoid','[]'::jsonb) @> '["news"]'::jsonb
        and coalesce(c.entry->'cats','[]'::jsonb) ? 'news'
      )
      and not (
        coalesce(t.answers->'avoid','[]'::jsonb) @> '["kids"]'::jsonb
        and coalesce(c.entry->'cats','[]'::jsonb) ? 'kids'
      )
    ),
    scored as (
      select c.*,
        (
          7*match_private.entry_overlap_count(c.entry,'moods',c.taste_moods)
          + 6*match_private.entry_overlap_count(c.entry,'cats',c.taste_cats)
          + 4*match_private.entry_overlap_count(c.entry,'vibes',c.taste_vibes)
          + 2*match_private.entry_overlap_count(c.entry,'ratings',c.taste_ratings)
          + coalesce((
              select sum(match_private.entry_similarity(c.entry,h.entry)*sig.weight)
              from (
                select match_private.title_key(match_private.json_item_title(x)) as title_key,2 as weight
                from jsonb_array_elements(c.saved_list) x
                union all
                select match_private.title_key(match_private.json_item_title(x)) as title_key,1 as weight
                from jsonb_array_elements(c.seen_list) x
                union all
                select match_private.title_key(r.key) as title_key,4 as weight
                from jsonb_each_text(c.user_ratings) r
                where lower(r.value) in ('4','5','like','liked','love','loved')
              ) sig
              join match_private.catalog h on h.title_key=sig.title_key
            ),0)
          - coalesce((
              select sum(match_private.entry_similarity(c.entry,h.entry)*sig.weight)
              from (
                select match_private.title_key(match_private.json_item_title(x)) as title_key,4 as weight
                from jsonb_array_elements(c.disliked_list) x
                union all
                select match_private.title_key(r.key) as title_key,5 as weight
                from jsonb_each_text(c.user_ratings) r
                where lower(r.value) in ('0','1','2','dislike','disliked')
              ) sig
              join match_private.catalog h on h.title_key=sig.title_key
            ),0)
        )::integer as taste_score
      from candidates c
    )
    select *
    from scored
    where taste_score>0
    order by taste_score desc,md5(p_uid::text||':'||v_day::text||':'||title_key)
    limit (2-v_existing)
  loop
    select min(gs.s)::integer into next_slot
    from generate_series(1,2) as gs(s)
    where not exists(
      select 1 from match_private.taste_suggestion_days d
      where d.user_id=p_uid and d.local_day=v_day and d.slot=gs.s
    );
    exit when next_slot is null;

    insert into match_private.user_notifications(
      user_id,kind,title,body,href,payload,dedupe_key,expires_at
    ) values(
      p_uid,'suggestion',
      left('Suggestion '||next_slot||' for today — '||rec.title,180),
      left(rec.synopsis,1000),
      '/discover.html',
      jsonb_build_object(
        'source','taste-dna','suggestionSlot',next_slot,'title',rec.title,'titleKey',rec.title_key,
        'year',rec.year,'mediaKind',rec.media_kind,'sourceKey',rec.source_key,'posterUrl',rec.poster_url,
        'synopsis',rec.synopsis,'platform',coalesce(rec.entry->>'platform',''),
        'genres',coalesce(to_jsonb(rec.genres),'[]'::jsonb),
        'originCountries',coalesce(to_jsonb(rec.origin_countries),'[]'::jsonb),
        'moods',coalesce(rec.entry->'moods','[]'::jsonb),
        'vibes',coalesce(rec.entry->'vibes','[]'::jsonb),
        'categories',coalesce(rec.entry->'cats','[]'::jsonb),
        'tasteScore',rec.taste_score,
        'keywords',jsonb_build_array(
          'Taste DNA','personalized recommendation','daily title suggestion',
          'what to watch based on my taste','personalized movie and TV suggestions'
        )
      ),
      'taste:'||v_day::text||':'||next_slot::text,
      v_expiry
    )
    on conflict(user_id,dedupe_key) do nothing;

    insert into match_private.taste_suggestion_days(user_id,local_day,slot,title_key)
    values(p_uid,v_day,next_slot,rec.title_key)
    on conflict do nothing;

    inserted_count:=inserted_count+1;
  end loop;
  return inserted_count;
end
$$;

create or replace function public.notification_generate_taste_suggestions()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  u record;
  total integer:=0;
  n integer:=0;
begin
  delete from match_private.user_notifications
  where kind='suggestion' and clicked_at is null
    and expires_at is not null and expires_at<=pg_catalog.now();

  for u in select id from auth.users where coalesce(is_anonymous,false)=false loop
    n:=match_private.generate_taste_suggestions_for(u.id);
    total:=total+n;
  end loop;
  return jsonb_build_object('inserted',total);
end
$$;

revoke all on function public.notification_generate_taste_suggestions() from public, anon, authenticated;
grant execute on function public.notification_generate_taste_suggestions() to service_role;

create or replace function match_private.notifications_impl(p_action text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  uid uuid:=auth.uid();
  nid uuid;
  wid uuid;
  pref match_private.notification_preferences%rowtype;
  reg text;
  tz text;
begin
  if uid is null or not exists(select 1 from auth.users where id=uid and is_anonymous=false) then
    raise exception 'Registered sign in required';
  end if;
  if coalesce(octet_length(p_payload::text),0)>16000 then raise exception 'Request too large'; end if;
  insert into match_private.notification_preferences(user_id) values(uid) on conflict do nothing;

  if p_action='list' then
    perform match_private.generate_taste_suggestions_for(uid);
    select * into pref from match_private.notification_preferences where user_id=uid;
    return jsonb_build_object(
      'notifications',(select coalesce(jsonb_agg(jsonb_build_object(
          'id',n.id,'kind',n.kind,'title',n.title,'body',n.body,'href',n.href,'payload',n.payload,
          'readAt',n.read_at,'clickedAt',n.clicked_at,'expiresAt',n.expires_at,'createdAt',n.created_at
        ) order by n.created_at desc),'[]'::jsonb)
        from (
          select * from match_private.user_notifications
          where user_id=uid
            and (kind<>'suggestion' or expires_at>pg_catalog.now() or clicked_at is not null)
          order by created_at desc limit 60
        ) n),
      'unread',(select count(*) from match_private.user_notifications
        where user_id=uid and read_at is null
          and (kind<>'suggestion' or expires_at>pg_catalog.now() or clicked_at is not null)),
      'preferences',jsonb_build_object(
        'inApp',pref.in_app,'device',pref.device,'email',pref.email,
        'releases',pref.releases,'purchases',pref.purchases,'friends',pref.friends,
        'availability',pref.availability,'suggestions',pref.suggestions,'timezone',pref.timezone
      ),
      'watches',(select coalesce(jsonb_agg(jsonb_build_object(
          'id',w.id,'tmdbId',w.tmdb_id,'kind',w.media_kind,'title',w.title,'year',w.year,
          'region',w.region,'active',w.active,'createdAt',w.created_at
        ) order by w.created_at desc),'[]'::jsonb)
        from match_private.title_watches w where w.user_id=uid and w.active)
    );
  elsif p_action='read' then
    nid:=(p_payload->>'id')::uuid;
    update match_private.user_notifications set read_at=coalesce(read_at,pg_catalog.now())
    where id=nid and user_id=uid;
  elsif p_action='clicked' then
    nid:=(p_payload->>'id')::uuid;
    update match_private.user_notifications
    set read_at=coalesce(read_at,pg_catalog.now()),clicked_at=coalesce(clicked_at,pg_catalog.now())
    where id=nid and user_id=uid;
  elsif p_action='delete' then
    nid:=(p_payload->>'id')::uuid;
    delete from match_private.user_notifications where id=nid and user_id=uid;
  elsif p_action='read_all' then
    update match_private.user_notifications set read_at=coalesce(read_at,pg_catalog.now())
    where user_id=uid and read_at is null;
  elsif p_action='preferences' then
    update match_private.notification_preferences set
      in_app=coalesce((p_payload->>'inApp')::boolean,in_app),
      device=coalesce((p_payload->>'device')::boolean,device),
      email=coalesce((p_payload->>'email')::boolean,email),
      releases=coalesce((p_payload->>'releases')::boolean,releases),
      purchases=coalesce((p_payload->>'purchases')::boolean,purchases),
      friends=coalesce((p_payload->>'friends')::boolean,friends),
      availability=coalesce((p_payload->>'availability')::boolean,availability),
      suggestions=coalesce((p_payload->>'suggestions')::boolean,suggestions),
      device_consent_at=case when coalesce((p_payload->>'device')::boolean,false) then coalesce(device_consent_at,pg_catalog.now()) else device_consent_at end,
      email_consent_at=case when coalesce((p_payload->>'email')::boolean,false) then coalesce(email_consent_at,pg_catalog.now()) else email_consent_at end,
      updated_at=pg_catalog.now()
    where user_id=uid;
    if p_payload ? 'timezone' then
      tz:=left(coalesce(p_payload->>'timezone',''),80);
      if exists(select 1 from pg_catalog.pg_timezone_names where name=tz) then
        update match_private.notification_preferences set timezone=tz,updated_at=pg_catalog.now()
        where user_id=uid;
      end if;
    end if;
  elsif p_action='follow_title' then
    if not ((p_payload->>'tmdbId') ~ '^[0-9]{1,10}$') then raise exception 'Invalid title identity'; end if;
    if (p_payload->>'kind') not in ('movie','tv') then raise exception 'Invalid media kind'; end if;
    reg:=upper(left(coalesce(p_payload->>'region',''),2));
    if reg !~ '^[A-Z]{2}$' then raise exception 'Invalid region'; end if;
    insert into match_private.title_watches(user_id,tmdb_id,media_kind,title,year,region,active,last_signature,checked_at,notified_at)
    values(uid,(p_payload->>'tmdbId')::int,p_payload->>'kind',left(trim(p_payload->>'title'),300),
      case when (p_payload->>'year') ~ '^[0-9]{4}$' then (p_payload->>'year')::int else null end,reg,true,'',null,null)
    on conflict(user_id,tmdb_id,media_kind,region) do update
      set active=true,title=excluded.title,year=excluded.year,last_signature='',checked_at=null,notified_at=null;
    update match_private.notification_preferences set availability=true,updated_at=pg_catalog.now()
    where user_id=uid;
  elsif p_action='unfollow_title' then
    wid:=(p_payload->>'id')::uuid;
    update match_private.title_watches set active=false where id=wid and user_id=uid;
  elsif p_action='push_subscription' then
    if char_length(coalesce(p_payload->>'endpoint',''))<20 or char_length(coalesce(p_payload->>'endpoint',''))>2200 then raise exception 'Invalid push endpoint'; end if;
    if char_length(coalesce(p_payload->>'p256dh',''))<20 or char_length(coalesce(p_payload->>'auth',''))<8 then raise exception 'Invalid push keys'; end if;
    insert into match_private.push_subscriptions(user_id,endpoint,p256dh,auth_key)
    values(uid,left(p_payload->>'endpoint',2200),left(p_payload->>'p256dh',300),left(p_payload->>'auth',300))
    on conflict(endpoint) do update
      set user_id=excluded.user_id,p256dh=excluded.p256dh,auth_key=excluded.auth_key,last_seen=pg_catalog.now();
    update match_private.notification_preferences
      set device=true,device_consent_at=coalesce(device_consent_at,pg_catalog.now()),updated_at=pg_catalog.now()
      where user_id=uid;
  elsif p_action='delete_push' then
    delete from match_private.push_subscriptions
      where user_id=uid and endpoint=left(coalesce(p_payload->>'endpoint',''),2200);
    if not exists(select 1 from match_private.push_subscriptions where user_id=uid) then
      update match_private.notification_preferences set device=false,updated_at=pg_catalog.now()
      where user_id=uid;
    end if;
  else
    raise exception 'Unknown notification action';
  end if;
  return match_private.notifications_impl('list','{}'::jsonb);
end
$$;

create or replace function public.notification_server_batch(p_limit integer default 100)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
begin
  return jsonb_build_object(
    'watches',(select coalesce(jsonb_agg(jsonb_build_object(
      'id',w.id,'userId',w.user_id,'tmdbId',w.tmdb_id,'kind',w.media_kind,'title',w.title,
      'year',w.year,'region',w.region,'lastSignature',w.last_signature
    ) order by coalesce(w.checked_at,'epoch'::timestamptz)),'[]'::jsonb)
      from (
        select * from match_private.title_watches
        where active and (checked_at is null or checked_at<pg_catalog.now()-interval '1 hour')
        order by checked_at nulls first limit greatest(1,least(p_limit,300))
      ) w),
    'deliveries',(select coalesce(jsonb_agg(jsonb_build_object(
      'id',n.id,'userId',n.user_id,'kind',n.kind,'title',n.title,'body',n.body,'href',n.href,
      'payload',n.payload,'expiresAt',n.expires_at,
      'pushSentAt',n.push_sent_at,'emailSentAt',n.email_sent_at,'emailAddress',u.email,
      'preferences',jsonb_build_object(
        'device',coalesce(p.device,false),'email',coalesce(p.email,false),
        'releases',coalesce(p.releases,true),'purchases',coalesce(p.purchases,true),
        'friends',coalesce(p.friends,true),'availability',coalesce(p.availability,true),
        'suggestions',coalesce(p.suggestions,true)
      ),
      'pushSubscriptions',(select coalesce(jsonb_agg(jsonb_build_object(
        'endpoint',s.endpoint,'p256dh',s.p256dh,'auth',s.auth_key
      )),'[]'::jsonb) from match_private.push_subscriptions s where s.user_id=n.user_id)
    ) order by n.created_at),'[]'::jsonb)
      from (
        select * from match_private.user_notifications
        where created_at>pg_catalog.now()-interval '30 days'
          and (expires_at is null or expires_at>pg_catalog.now())
          and (push_sent_at is null or email_sent_at is null)
        order by created_at limit greatest(1,least(p_limit,300))
      ) n
      join auth.users u on u.id=n.user_id
      left join match_private.notification_preferences p on p.user_id=n.user_id)
  );
end
$$;
