-- Private registered-user friendship, presence, permanent title exclusions and pair matches.
-- Idempotent. No profile photos, emails, watch history or contact address book are shared.
begin;
create schema if not exists match_private;
revoke all on schema match_private from public,anon;
grant usage on schema match_private to authenticated;
create table if not exists match_private.title_exclusions (
 user_id uuid not null references auth.users(id) on delete cascade,
 title_key text not null, item jsonb not null, primary key(user_id,title_key)
);
create table if not exists match_private.friend_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 invite_code text not null unique default replace(gen_random_uuid()::text,'-',''),
 alias text not null default 'Movie friend' check(char_length(alias) between 1 and 40),
 sharing boolean not null default false, presence boolean not null default false,
 last_seen timestamptz
);
create table if not exists match_private.friendships (
 id uuid primary key default gen_random_uuid(),
 sender uuid not null references auth.users(id) on delete cascade,
 recipient uuid not null references auth.users(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted')),
 created_at timestamptz not null default now(), check(sender<>recipient)
);
create unique index if not exists friendship_pair on match_private.friendships(least(sender,recipient),greatest(sender,recipient));
create index if not exists friendship_recipient on match_private.friendships(recipient,status);
create index if not exists friendship_sender on match_private.friendships(sender,status);
create table if not exists match_private.friend_preferences (
 owner uuid not null references auth.users(id) on delete cascade,
 friend uuid not null references auth.users(id) on delete cascade,
 avatar text not null default 'fox' check(avatar in ('fox','bear','cat','frog','panda','rabbit','owl','rocket','planet','star','whale','robot')),
 primary key(owner,friend)
);
create index if not exists friend_preferences_friend on match_private.friend_preferences(friend);
create table if not exists match_private.pair_matches (
 code text primary key default replace(gen_random_uuid()::text,'-',''),
 host uuid not null references auth.users(id) on delete cascade,
 guest uuid not null references auth.users(id) on delete cascade,
 host_prefs jsonb not null, guest_prefs jsonb,
 result jsonb, created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '24 hours', check(host<>guest)
);
create index if not exists pair_matches_host on match_private.pair_matches(host,expires_at);
create index if not exists pair_matches_guest on match_private.pair_matches(guest,expires_at);
create table if not exists match_private.catalog (title_key text primary key, entry jsonb not null);
alter table match_private.title_exclusions enable row level security;
alter table match_private.friend_profiles enable row level security;
alter table match_private.friendships enable row level security;
alter table match_private.friend_preferences enable row level security;
alter table match_private.pair_matches enable row level security;
alter table match_private.catalog enable row level security;
revoke all on all tables in schema match_private from public,anon,authenticated;
create or replace function match_private.title_key(t text) returns text language sql immutable security invoker set search_path='' as $$ select regexp_replace(lower(normalize(coalesce(t,''),NFKC)), '[^[:alnum:]]','','g') $$;
create or replace function match_private.criteria_match(e jsonb,p jsonb) returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare k text; prop text; wanted jsonb; available jsonb;
begin
 foreach k in array array['cat','plat','mood','vibe','rating','decade'] loop
  wanted := coalesce(p->k,'[]'::jsonb);
  if jsonb_typeof(wanted)='string' then wanted:=jsonb_build_array(wanted); end if;
  if jsonb_typeof(wanted)<>'array' then return false; end if;
  select coalesce(jsonb_agg(v),'[]'::jsonb) into wanted from jsonb_array_elements(wanted) v where v<>'"any"'::jsonb and v<>'""'::jsonb;
  if jsonb_array_length(wanted)=0 then continue; end if;
  if k='decade' then
   if not exists(select 1 from jsonb_array_elements_text(wanted) d where d ~ '^[0-9]{4}s?$' and (e->>'year')::int between substring(d,1,4)::int and substring(d,1,4)::int+9) then return false; end if;
  else
   prop:=case k when 'cat' then 'cats' when 'plat' then 'platform' when 'mood' then 'moods' when 'vibe' then 'vibes' when 'rating' then 'ratings' end;
   available:=coalesce(e->prop,'[]'::jsonb);
   if jsonb_typeof(available)='string' then available:=jsonb_build_array(available); end if;
   if not exists(select 1 from jsonb_array_elements(wanted) w join jsonb_array_elements(available) a on a=w) then return false; end if;
  end if;
 end loop;
 -- Explicit opt-ins cannot enter an unfiltered group match.
 if coalesce(p->>'cat','[]') in ('[]','any') and (e->'cats') ?| array['Gospel & Faith','News','Sports','Classical Music','podcast','Spotify playlist','Spotify single','music album','audiobook','YouTube channel','YouTube Shorts','documentary'] then return false; end if;
 return true;
exception when others then return false;
end $$;
create or replace function match_private.portfolio_impl(p_action text,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); i jsonb; t text; meta jsonb; arr jsonb;
begin
 if uid is null or not exists(select 1 from auth.users where id=uid) then raise exception 'Sign in required'; end if;
 if p_action='remember' then
  if jsonb_typeof(p_payload->'items')<>'array' or jsonb_array_length(p_payload->'items')>1000 then raise exception 'Invalid history batch'; end if;
  for i in select value from jsonb_array_elements(p_payload->'items') loop
   t:=left(i->>'title',300);
   if coalesce(t,'')='' then continue; end if;
   insert into match_private.title_exclusions(user_id,title_key,item) values(uid,match_private.title_key(t),jsonb_build_object('title',t,'action',left(coalesce(i->>'action','rated'),20),'addedAt',coalesce((i->>'addedAt')::bigint,extract(epoch from now())::bigint*1000),'posterUrl',left(coalesce(i->>'posterUrl',''),1500),'streamUrl',left(coalesce(i->>'streamUrl',''),1500),'reason',left(coalesce(i->>'reason',''),300)))
   on conflict(user_id,title_key) do update set item=excluded.item where (excluded.item->>'action')<>'rated' and (excluded.item->>'addedAt')::bigint >= (title_exclusions.item->>'addedAt')::bigint;
  end loop;
 elsif p_action='list' then
  -- Preferences in user metadata are migration input, never authorization.
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
 return jsonb_build_object('keys',(select coalesce(jsonb_agg(title_key),'[]'::jsonb) from match_private.title_exclusions where user_id=uid),'history',(select coalesce(jsonb_agg(item order by (item->>'addedAt')::bigint desc),'[]'::jsonb) from match_private.title_exclusions where user_id=uid));
end $$;
create or replace function public.portfolio_action(p_action text,p_payload jsonb default '{}'::jsonb) returns jsonb language sql security invoker set search_path='' as $$select match_private.portfolio_impl(p_action,p_payload)$$;
create or replace function match_private.friends_impl(p_action text,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); other uuid; rid uuid; code text; row match_private.pair_matches%rowtype; chosen jsonb; pref jsonb; settings match_private.friend_profiles%rowtype;
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
   select c.entry into chosen from match_private.catalog c where match_private.criteria_match(c.entry,row.host_prefs) and match_private.criteria_match(c.entry,row.guest_prefs)
    and not exists(select 1 from match_private.title_exclusions x where x.user_id in(row.host,row.guest) and x.title_key=c.title_key)
    order by random() limit 1;
   if chosen is not null then
    chosen:=chosen||jsonb_build_object('platformVerified',true,'source','private-pair');
    update match_private.pair_matches set result=chosen where pair_matches.code=row.code returning * into row;
   end if;
  end if;
  return jsonb_build_object('code',row.code,'result',row.result,'ready',row.guest_prefs is not null,'myPrefs',case when uid=row.host then row.host_prefs else row.guest_prefs end,'friendAlias',(select alias from match_private.friend_profiles where user_id=case when row.host=uid then row.guest else row.host end));
 elsif p_action<>'list' then raise exception 'Unknown friend action'; end if;
 select * into settings from match_private.friend_profiles where user_id=uid;
 return jsonb_build_object('settings',jsonb_build_object('alias',settings.alias,'sharing',settings.sharing,'presence',settings.presence,'token',case when settings.sharing then settings.invite_code else null end),
 'friends',(select coalesce(jsonb_agg(jsonb_build_object('id',f.id,'friend',p.user_id,'alias',p.alias,'avatar',coalesce(v.avatar,'fox'),'online',p.presence and p.last_seen>now()-interval '75 seconds')),'[]'::jsonb) from match_private.friendships f join match_private.friend_profiles p on p.user_id=case when f.sender=uid then f.recipient else f.sender end left join match_private.friend_preferences v on v.owner=uid and v.friend=p.user_id where uid in(f.sender,f.recipient) and f.status='accepted'),
 'requests',(select coalesce(jsonb_agg(jsonb_build_object('id',f.id,'alias',p.alias,'incoming',f.recipient=uid)),'[]'::jsonb) from match_private.friendships f join match_private.friend_profiles p on p.user_id=case when f.sender=uid then f.recipient else f.sender end where uid in(f.sender,f.recipient) and f.status='pending'),
 'matches',(select coalesce(jsonb_agg(jsonb_build_object('code',m.code,'alias',p.alias,'incoming',m.guest=uid,'matched',m.result is not null)),'[]'::jsonb) from match_private.pair_matches m join match_private.friend_profiles p on p.user_id=case when m.host=uid then m.guest else m.host end where uid in(m.host,m.guest) and m.expires_at>now()));
end $$;
create or replace function public.friends_action(p_action text,p_payload jsonb default '{}'::jsonb) returns jsonb language sql security invoker set search_path='' as $$select match_private.friends_impl(p_action,p_payload)$$;
revoke all on all functions in schema match_private from public,anon,authenticated;
grant execute on function match_private.portfolio_impl(text,jsonb),match_private.friends_impl(text,jsonb) to authenticated;
revoke execute on function public.portfolio_action(text,jsonb),public.friends_action(text,jsonb) from public,anon;
grant execute on function public.portfolio_action(text,jsonb),public.friends_action(text,jsonb) to authenticated;
commit;
