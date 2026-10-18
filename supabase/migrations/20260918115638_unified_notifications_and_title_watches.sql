
create table if not exists match_private.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('availability','purchase','friend_request','match_together','account','system')),
  title text not null check (char_length(title) between 1 and 180),
  body text not null default '' check (char_length(body) <= 1000),
  href text not null default '' check (char_length(href) <= 1600),
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text,
  read_at timestamptz,
  push_sent_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id,dedupe_key)
);
create index if not exists user_notifications_user_created on match_private.user_notifications(user_id,created_at desc);
create index if not exists user_notifications_pending_delivery on match_private.user_notifications(created_at) where push_sent_at is null or email_sent_at is null;

create table if not exists match_private.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  in_app boolean not null default true,
  device boolean not null default false,
  email boolean not null default false,
  releases boolean not null default true,
  purchases boolean not null default true,
  friends boolean not null default true,
  availability boolean not null default true,
  device_consent_at timestamptz,
  email_consent_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists match_private.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) between 20 and 2200),
  p256dh text not null check (char_length(p256dh) between 20 and 300),
  auth_key text not null check (char_length(auth_key) between 8 and 300),
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
create index if not exists push_subscriptions_user on match_private.push_subscriptions(user_id);

create table if not exists match_private.title_watches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_id integer not null check (tmdb_id > 0),
  media_kind text not null check (media_kind in ('movie','tv')),
  title text not null check (char_length(title) between 1 and 300),
  year integer check (year between 1880 and 2200),
  region text not null check (region ~ '^[A-Z]{2}$'),
  active boolean not null default true,
  last_signature text not null default '',
  checked_at timestamptz,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id,tmdb_id,media_kind,region)
);
create index if not exists title_watches_due on match_private.title_watches(active,checked_at);

alter table match_private.user_notifications enable row level security;
alter table match_private.notification_preferences enable row level security;
alter table match_private.push_subscriptions enable row level security;
alter table match_private.title_watches enable row level security;
revoke all on match_private.user_notifications,match_private.notification_preferences,match_private.push_subscriptions,match_private.title_watches from public,anon,authenticated;

create or replace function match_private.notifications_impl(p_action text,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  uid uuid:=auth.uid();
  nid uuid;
  wid uuid;
  pref match_private.notification_preferences%rowtype;
  reg text;
begin
  if uid is null or not exists(select 1 from auth.users where id=uid and is_anonymous=false) then
    raise exception 'Registered sign in required';
  end if;
  if coalesce(octet_length(p_payload::text),0)>16000 then raise exception 'Request too large'; end if;
  insert into match_private.notification_preferences(user_id) values(uid) on conflict do nothing;

  if p_action='list' then
    select * into pref from match_private.notification_preferences where user_id=uid;
    return jsonb_build_object(
      'notifications',(select coalesce(jsonb_agg(jsonb_build_object(
          'id',n.id,'kind',n.kind,'title',n.title,'body',n.body,'href',n.href,'payload',n.payload,
          'readAt',n.read_at,'createdAt',n.created_at
        ) order by n.created_at desc),'[]'::jsonb)
        from (select * from match_private.user_notifications where user_id=uid order by created_at desc limit 60) n),
      'unread',(select count(*) from match_private.user_notifications where user_id=uid and read_at is null),
      'preferences',jsonb_build_object('inApp',pref.in_app,'device',pref.device,'email',pref.email,'releases',pref.releases,'purchases',pref.purchases,'friends',pref.friends,'availability',pref.availability),
      'watches',(select coalesce(jsonb_agg(jsonb_build_object('id',w.id,'tmdbId',w.tmdb_id,'kind',w.media_kind,'title',w.title,'year',w.year,'region',w.region,'active',w.active,'createdAt',w.created_at) order by w.created_at desc),'[]'::jsonb)
        from match_private.title_watches w where w.user_id=uid and w.active)
    );
  elsif p_action='read' then
    nid:=(p_payload->>'id')::uuid;
    update match_private.user_notifications set read_at=coalesce(read_at,now()) where id=nid and user_id=uid;
  elsif p_action='read_all' then
    update match_private.user_notifications set read_at=coalesce(read_at,now()) where user_id=uid and read_at is null;
  elsif p_action='preferences' then
    update match_private.notification_preferences set
      in_app=coalesce((p_payload->>'inApp')::boolean,in_app),
      device=coalesce((p_payload->>'device')::boolean,device),
      email=coalesce((p_payload->>'email')::boolean,email),
      releases=coalesce((p_payload->>'releases')::boolean,releases),
      purchases=coalesce((p_payload->>'purchases')::boolean,purchases),
      friends=coalesce((p_payload->>'friends')::boolean,friends),
      availability=coalesce((p_payload->>'availability')::boolean,availability),
      device_consent_at=case when coalesce((p_payload->>'device')::boolean,false) then coalesce(device_consent_at,now()) else device_consent_at end,
      email_consent_at=case when coalesce((p_payload->>'email')::boolean,false) then coalesce(email_consent_at,now()) else email_consent_at end,
      updated_at=now()
    where user_id=uid;
  elsif p_action='follow_title' then
    if not ((p_payload->>'tmdbId') ~ '^[0-9]{1,10}$') then raise exception 'Invalid title identity'; end if;
    if (p_payload->>'kind') not in ('movie','tv') then raise exception 'Invalid media kind'; end if;
    reg:=upper(left(coalesce(p_payload->>'region',''),2));
    if reg !~ '^[A-Z]{2}$' then raise exception 'Invalid region'; end if;
    insert into match_private.title_watches(user_id,tmdb_id,media_kind,title,year,region,active,last_signature,checked_at,notified_at)
    values(uid,(p_payload->>'tmdbId')::int,p_payload->>'kind',left(trim(p_payload->>'title'),300),
      case when (p_payload->>'year') ~ '^[0-9]{4}$' then (p_payload->>'year')::int else null end,reg,true,'',null,null)
    on conflict(user_id,tmdb_id,media_kind,region) do update set active=true,title=excluded.title,year=excluded.year,last_signature='',checked_at=null,notified_at=null;
    update match_private.notification_preferences set availability=true,updated_at=now() where user_id=uid;
  elsif p_action='unfollow_title' then
    wid:=(p_payload->>'id')::uuid;
    update match_private.title_watches set active=false where id=wid and user_id=uid;
  elsif p_action='push_subscription' then
    if char_length(coalesce(p_payload->>'endpoint',''))<20 or char_length(coalesce(p_payload->>'endpoint',''))>2200 then raise exception 'Invalid push endpoint'; end if;
    if char_length(coalesce(p_payload->>'p256dh',''))<20 or char_length(coalesce(p_payload->>'auth',''))<8 then raise exception 'Invalid push keys'; end if;
    insert into match_private.push_subscriptions(user_id,endpoint,p256dh,auth_key)
    values(uid,left(p_payload->>'endpoint',2200),left(p_payload->>'p256dh',300),left(p_payload->>'auth',300))
    on conflict(endpoint) do update set user_id=excluded.user_id,p256dh=excluded.p256dh,auth_key=excluded.auth_key,last_seen=now();
    update match_private.notification_preferences set device=true,device_consent_at=coalesce(device_consent_at,now()),updated_at=now() where user_id=uid;
  elsif p_action='delete_push' then
    delete from match_private.push_subscriptions where user_id=uid and endpoint=left(coalesce(p_payload->>'endpoint',''),2200);
    if not exists(select 1 from match_private.push_subscriptions where user_id=uid) then
      update match_private.notification_preferences set device=false,updated_at=now() where user_id=uid;
    end if;
  else
    raise exception 'Unknown notification action';
  end if;
  return match_private.notifications_impl('list','{}'::jsonb);
end $$;

create or replace function public.notifications_action(p_action text,p_payload jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path='' as $$
  select match_private.notifications_impl(p_action,p_payload)
$$;
revoke execute on function public.notifications_action(text,jsonb) from public,anon;
grant execute on function public.notifications_action(text,jsonb) to authenticated;
revoke all on function match_private.notifications_impl(text,jsonb) from public,anon,authenticated;
grant execute on function match_private.notifications_impl(text,jsonb) to authenticated;

create or replace function public.record_user_notification(
  p_user uuid,p_kind text,p_title text,p_body text,p_href text default '',p_payload jsonb default '{}'::jsonb,p_dedupe text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare nid uuid;
begin
  if p_kind not in ('availability','purchase','friend_request','match_together','account','system') then raise exception 'Invalid notification kind'; end if;
  insert into match_private.user_notifications(user_id,kind,title,body,href,payload,dedupe_key)
  values(p_user,p_kind,left(p_title,180),left(coalesce(p_body,''),1000),left(coalesce(p_href,''),1600),coalesce(p_payload,'{}'::jsonb),left(p_dedupe,300))
  on conflict(user_id,dedupe_key) do update set
    title=excluded.title,body=excluded.body,href=excluded.href,payload=excluded.payload
  returning id into nid;
  return nid;
end $$;
revoke execute on function public.record_user_notification(uuid,text,text,text,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.record_user_notification(uuid,text,text,text,text,jsonb,text) to service_role;

create or replace function public.notification_server_batch(p_limit integer default 100)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  return jsonb_build_object(
    'watches',(select coalesce(jsonb_agg(jsonb_build_object(
      'id',w.id,'userId',w.user_id,'tmdbId',w.tmdb_id,'kind',w.media_kind,'title',w.title,'year',w.year,'region',w.region,'lastSignature',w.last_signature
    ) order by coalesce(w.checked_at,'epoch'::timestamptz)),'[]'::jsonb)
      from (select * from match_private.title_watches where active and (checked_at is null or checked_at<now()-interval '4 hours') order by checked_at nulls first limit greatest(1,least(p_limit,300))) w),
    'deliveries',(select coalesce(jsonb_agg(jsonb_build_object(
      'id',n.id,'userId',n.user_id,'kind',n.kind,'title',n.title,'body',n.body,'href',n.href,'payload',n.payload,
      'pushSentAt',n.push_sent_at,'emailSentAt',n.email_sent_at,
      'emailAddress',u.email,
      'preferences',jsonb_build_object('device',coalesce(p.device,false),'email',coalesce(p.email,false),'releases',coalesce(p.releases,true),'purchases',coalesce(p.purchases,true),'friends',coalesce(p.friends,true),'availability',coalesce(p.availability,true)),
      'pushSubscriptions',(select coalesce(jsonb_agg(jsonb_build_object('endpoint',s.endpoint,'p256dh',s.p256dh,'auth',s.auth_key)),'[]'::jsonb) from match_private.push_subscriptions s where s.user_id=n.user_id)
    ) order by n.created_at),'[]'::jsonb)
      from (select * from match_private.user_notifications where created_at>now()-interval '30 days' and (push_sent_at is null or email_sent_at is null) order by created_at limit greatest(1,least(p_limit,300))) n
      join auth.users u on u.id=n.user_id
      left join match_private.notification_preferences p on p.user_id=n.user_id)
  );
end $$;
revoke execute on function public.notification_server_batch(integer) from public,anon,authenticated;
grant execute on function public.notification_server_batch(integer) to service_role;

create or replace function public.notification_watch_checked(p_id uuid,p_signature text,p_available boolean,p_body text default '',p_href text default '',p_payload jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare w match_private.title_watches%rowtype; nid uuid;
begin
  select * into w from match_private.title_watches where id=p_id for update;
  if w.id is null then return null; end if;
  update match_private.title_watches set last_signature=left(coalesce(p_signature,''),4000),checked_at=now(),
    active=case when p_available then false else active end,
    notified_at=case when p_available then now() else notified_at end
  where id=p_id;
  if p_available then
    nid:=public.record_user_notification(w.user_id,'availability',
      w.title||' is now available',left(coalesce(p_body,''),1000),left(coalesce(p_href,''),1600),
      coalesce(p_payload,'{}'::jsonb), 'availability:'||w.id::text);
  end if;
  return nid;
end $$;
revoke execute on function public.notification_watch_checked(uuid,text,boolean,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.notification_watch_checked(uuid,text,boolean,text,text,jsonb) to service_role;

create or replace function public.notification_mark_delivery(p_id uuid,p_push boolean default false,p_email boolean default false)
returns void language plpgsql security definer set search_path='' as $$
begin
 update match_private.user_notifications set
   push_sent_at=case when p_push then coalesce(push_sent_at,now()) else push_sent_at end,
   email_sent_at=case when p_email then coalesce(email_sent_at,now()) else email_sent_at end
 where id=p_id;
end $$;
revoke execute on function public.notification_mark_delivery(uuid,boolean,boolean) from public,anon,authenticated;
grant execute on function public.notification_mark_delivery(uuid,boolean,boolean) to service_role;

create or replace function match_private.friend_request_notification()
returns trigger language plpgsql security definer set search_path='' as $$
declare sender_alias text;
begin
  if tg_op='INSERT' and new.status='pending' then
    select alias into sender_alias from match_private.friend_profiles where user_id=new.sender;
    perform public.record_user_notification(new.recipient,'friend_request','New friend request',
      coalesce(sender_alias,'A MatchApp user')||' wants to connect with you.','/friends.html','{}'::jsonb,'friend-request:'||new.id::text);
  end if;
  return new;
end $$;
drop trigger if exists notify_friend_request on match_private.friendships;
create trigger notify_friend_request after insert on match_private.friendships for each row execute function match_private.friend_request_notification();

create or replace function match_private.match_together_notification()
returns trigger language plpgsql security definer set search_path='' as $$
declare host_alias text;
begin
  select alias into host_alias from match_private.friend_profiles where user_id=new.host;
  perform public.record_user_notification(new.guest,'match_together','Match Together invitation',
    coalesce(host_alias,'Your friend')||' wants to make a Match Together with you.','/friends.html?match='||new.code,
    jsonb_build_object('code',new.code),'match-together:'||new.code);
  return new;
end $$;
drop trigger if exists notify_match_together on match_private.pair_matches;
create trigger notify_match_together after insert on match_private.pair_matches for each row execute function match_private.match_together_notification();

revoke execute on function match_private.friend_request_notification(),match_private.match_together_notification() from public,anon,authenticated;
