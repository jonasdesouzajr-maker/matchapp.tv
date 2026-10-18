
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
        c.title_key,
        c.entry,
        m.source_key,
        m.title,
        m.year,
        m.media_kind,
        coalesce(m.poster_large_url,m.poster_url,m.poster_original_url) as poster_url,
        coalesce(nullif(m.overview,''),nullif(c.entry->>'synopsis',''),'A title selected from your Taste DNA.') as synopsis,
        m.genres,
        m.origin_countries,
        m.availability,
        p.saved_list,p.seen_list,p.disliked_list,p.user_ratings,
        t.moods as taste_moods,t.vibes as taste_vibes,t.cats as taste_cats,t.ratings as taste_ratings,
        t.answers
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
        where sd.user_id=p_uid
          and sd.title_key=c.title_key
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
    order by taste_score desc,
             md5(p_uid::text||':'||v_day::text||':'||title_key)
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
      p_uid,
      'suggestion',
      left('Suggestion '||next_slot||' for today — '||rec.title,180),
      left(rec.synopsis,1000),
      '/discover.html',
      jsonb_build_object(
        'source','taste-dna',
        'suggestionSlot',next_slot,
        'title',rec.title,
        'titleKey',rec.title_key,
        'year',rec.year,
        'mediaKind',rec.media_kind,
        'sourceKey',rec.source_key,
        'posterUrl',rec.poster_url,
        'synopsis',rec.synopsis,
        'platform',coalesce(rec.entry->>'platform',''),
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
