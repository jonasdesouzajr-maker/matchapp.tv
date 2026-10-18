
create or replace function match_private.validate_push_endpoint()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if not (
    new.endpoint ~ '^https://fcm\.googleapis\.com/'
    or new.endpoint ~ '^https://([A-Za-z0-9-]+\.)*push\.services\.mozilla\.com/'
    or new.endpoint ~ '^https://([A-Za-z0-9-]+\.)*push\.apple\.com/'
  ) then
    raise exception 'Unsupported push service';
  end if;
  return new;
end $$;
drop trigger if exists validate_push_endpoint on match_private.push_subscriptions;
create trigger validate_push_endpoint
before insert or update of endpoint on match_private.push_subscriptions
for each row execute function match_private.validate_push_endpoint();
revoke execute on function match_private.validate_push_endpoint() from public,anon,authenticated;

create or replace function public.notification_remove_push(p_endpoint text)
returns void language sql security definer set search_path='' as $$
  delete from match_private.push_subscriptions where endpoint=p_endpoint
$$;
revoke execute on function public.notification_remove_push(text) from public,anon,authenticated;
grant execute on function public.notification_remove_push(text) to service_role;

create or replace function public.notification_broadcast_release(
  p_version text,p_title text,p_body text,p_href text default '/updates.html'
) returns integer language plpgsql security definer set search_path='' as $$
declare n integer;
begin
  insert into match_private.user_notifications(user_id,kind,title,body,href,payload,dedupe_key)
  select u.id,'system',left(p_title,180),left(coalesce(p_body,''),1000),left(coalesce(p_href,'/updates.html'),1600),
         jsonb_build_object('version',left(p_version,80)),
         'release:'||left(p_version,80)
  from auth.users u
  where coalesce(u.is_anonymous,false)=false
  on conflict(user_id,dedupe_key) do nothing;
  get diagnostics n=row_count;
  return n;
end $$;
revoke execute on function public.notification_broadcast_release(text,text,text,text) from public,anon,authenticated;
grant execute on function public.notification_broadcast_release(text,text,text,text) to service_role;

create or replace function public.notification_server_batch(p_limit integer default 100)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  return jsonb_build_object(
    'watches',(select coalesce(jsonb_agg(jsonb_build_object(
      'id',w.id,'userId',w.user_id,'tmdbId',w.tmdb_id,'kind',w.media_kind,'title',w.title,'year',w.year,'region',w.region,'lastSignature',w.last_signature
    ) order by coalesce(w.checked_at,'epoch'::timestamptz)),'[]'::jsonb)
      from (select * from match_private.title_watches where active and (checked_at is null or checked_at<now()-interval '1 hour') order by checked_at nulls first limit greatest(1,least(p_limit,300))) w),
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

create or replace function match_private.stripe_purchase_notification()
returns trigger language plpgsql security definer set search_path='' as $$
declare label text; body text;
begin
  if new.user_id is null or new.plan is null or new.type not in ('checkout.session.completed','checkout.session.async_payment_succeeded') then
    return new;
  end if;
  label:=case new.plan
    when 'ad_free' then 'Ad-free lifetime'
    when 'vip_monthly' then 'VIP monthly'
    when 'vip_annual' then 'VIP annual'
    when 'business' then 'Business'
    when 'credits_25' then '25 Ask AI credits'
    when 'credits_75' then '75 Ask AI credits'
    when 'credits_200' then '200 Ask AI credits'
    when 'credits_500' then '500 Ask AI credits'
    when 'matches_5' then '5 extra Matches'
    when 'matches_25' then '25 extra Matches'
    when 'matches_50' then '50 extra Matches'
    else replace(new.plan,'_',' ')
  end;
  body:='Payment confirmed. '||label||' is now on your MatchApp account.';
  perform public.record_user_notification(new.user_id,'purchase','Purchase confirmed',body,'/profile/profile.html',
    jsonb_build_object('plan',new.plan,'stripeEvent',new.id),'purchase:'||new.id);
  return new;
end $$;
drop trigger if exists notify_stripe_purchase on public.stripe_events;
create trigger notify_stripe_purchase after insert on public.stripe_events
for each row execute function match_private.stripe_purchase_notification();
revoke execute on function match_private.stripe_purchase_notification() from public,anon,authenticated;

create or replace function match_private.match_result_notification()
returns trigger language plpgsql security definer set search_path='' as $$
declare title text;
begin
  if old.result is null and new.result is not null then
    title:=coalesce(new.result->>'title','Your shared Match');
    perform public.record_user_notification(new.host,'match_together','Your Match Together is ready',
      title||' is your shared pick.','/friends.html?match='||new.code,jsonb_build_object('code',new.code,'title',title),'match-result:'||new.code||':'||new.host::text);
    perform public.record_user_notification(new.guest,'match_together','Your Match Together is ready',
      title||' is your shared pick.','/friends.html?match='||new.code,jsonb_build_object('code',new.code,'title',title),'match-result:'||new.code||':'||new.guest::text);
  end if;
  return new;
end $$;
drop trigger if exists notify_match_result on match_private.pair_matches;
create trigger notify_match_result after update of result on match_private.pair_matches
for each row execute function match_private.match_result_notification();
revoke execute on function match_private.match_result_notification() from public,anon,authenticated;
