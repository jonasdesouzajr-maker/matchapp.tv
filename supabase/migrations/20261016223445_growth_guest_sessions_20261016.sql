-- Additive, isolated guest-invite support. Legacy Match Together, private
-- Friends, ordinary Match allowances, purchased credits and Kids stay unchanged.
-- Only the authenticated Edge service can execute this RPC. Invite capabilities
-- and guest device keys are hashed before reaching storage.
create table if not exists match_private.growth_invites (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  host_id uuid not null references auth.users(id) on delete cascade,
  host_name text not null check (char_length(host_name) between 1 and 40),
  host_prefs jsonb not null check (jsonb_typeof(host_prefs) = 'object'),
  host_exclusions jsonb not null default '[]'::jsonb check (jsonb_typeof(host_exclusions) = 'array'),
  guest_key_hash text check (guest_key_hash is null or guest_key_hash ~ '^[a-f0-9]{64}$'),
  guest_id uuid references auth.users(id) on delete set null,
  guest_prefs jsonb check (guest_prefs is null or jsonb_typeof(guest_prefs) = 'object'),
  guest_exclusions jsonb not null default '[]'::jsonb check (jsonb_typeof(guest_exclusions) = 'array'),
  result jsonb check (result is null or jsonb_typeof(result) = 'object'),
  status text not null default 'waiting' check (status in ('waiting','ready','resolving','matched','no_match','unavailable')),
  revision integer not null default 0,
  attempts integer not null default 0,
  retry_after timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);
create index if not exists growth_invites_host_created_idx on match_private.growth_invites(host_id,created_at desc);
create index if not exists growth_invites_expiry_idx on match_private.growth_invites(expires_at);
alter table match_private.growth_invites enable row level security;
revoke all on match_private.growth_invites from public,anon,authenticated;

create table if not exists match_private.growth_resume_tokens (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  invite_id uuid not null references match_private.growth_invites(id) on delete cascade,
  language text not null,
  viewer_role text not null check (viewer_role in ('host','guest')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists growth_resume_invite_idx on match_private.growth_resume_tokens(invite_id);
alter table match_private.growth_resume_tokens enable row level security;
revoke all on match_private.growth_resume_tokens from public,anon,authenticated;

create or replace function public.growth_together_service(p_action text,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare
  v match_private.growth_invites%rowtype;
  v_uid uuid;
  v_hash text := p_payload->>'token_hash';
  v_guest_hash text := p_payload->>'guest_key_hash';
  v_authorized boolean := false;
  v_pool jsonb;
  v_entry jsonb;
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
    -- Serializes only this creator's new invites, preventing concurrent
    -- requests from exceeding the same established private-invite rate cap.
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
    -- Platform availability is verified per country in the Edge function.
    -- All non-platform criteria and both account/local exclusions remain hard
    -- constraints. The full browser mood/genre policy runs again server-side.
    select coalesce(jsonb_agg(jsonb_build_object('key',c.title_key,'entry',c.entry)),'[]'::jsonb) into v_pool
    from match_private.catalog c
    where match_private.criteria_match(c.entry,v.host_prefs||'{"plat":"any"}'::jsonb)
      and match_private.criteria_match(c.entry,v.guest_prefs||'{"plat":"any"}'::jsonb)
      and not exists(select 1 from match_private.title_exclusions x where x.user_id in(v.host_id,v.guest_id) and x.title_key=c.title_key)
      and not (v.host_exclusions ? c.title_key) and not (v.guest_exclusions ? c.title_key);
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
      and not exists(select 1 from match_private.title_exclusions x where x.user_id in(v.host_id,v.guest_id) and x.title_key=c.title_key)
      and not (v.host_exclusions ? c.title_key) and not (v.guest_exclusions ? c.title_key);
    if v_entry is null or jsonb_typeof(p_payload->'result') is distinct from 'object'
       or p_payload->'result'->>'title' is distinct from v_entry->>'title' then
      update match_private.growth_invites set status='ready',retry_after=null where id=v.id;
      return jsonb_build_object('ok',false,'error','choices_changed');
    end if;
    update match_private.growth_invites set result=p_payload->'result',status='matched',retry_after=null where id=v.id returning * into v;
    return jsonb_build_object('ok',true,'status','matched','result',v.result);
  elsif p_action='metadata' then
    -- This is a service-only catalog lookup after the candidate pool was
    -- established, never an unrestricted user-history or database endpoint.
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
revoke all on function public.growth_together_service(text,jsonb) from public,anon,authenticated;
grant execute on function public.growth_together_service(text,jsonb) to service_role;

create or replace function match_private.purge_growth_sessions()
returns integer language plpgsql security definer set search_path='' as $function$
declare n integer;
begin
  delete from match_private.growth_invites where expires_at<now()-interval '48 hours';
  get diagnostics n = row_count;
  return n;
end;
$function$;
revoke all on function match_private.purge_growth_sessions() from public,anon,authenticated;
-- Schedule only a private-data retention cleanup when the existing database
-- has pg_cron. It does not publish content or alter editorial refresh owners.
do $schedule$
begin
  if to_regclass('cron.job') is not null then
    if not exists(select 1 from cron.job where jobname='matchapp-growth-private-cleanup') then
      perform cron.schedule('matchapp-growth-private-cleanup','17 4 * * *','select match_private.purge_growth_sessions();');
    end if;
  end if;
end;
$schedule$;
