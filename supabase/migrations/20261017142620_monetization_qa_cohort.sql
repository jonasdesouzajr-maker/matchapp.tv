-- Short-lived server-authorized QA access while the public rollout stays off.
-- No balance, entitlement, first-result, reward-claim or historical-ledger reset.
begin;

create table matchapp_private.monetization_qa_cohort (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 granted_at timestamptz not null default now(),
 expires_at timestamptz not null,
 revoked_at timestamptz,
 updated_at timestamptz not null default now(),
 check (expires_at>granted_at and expires_at<=granted_at+interval '24 hours')
);
alter table matchapp_private.monetization_qa_cohort enable row level security;
revoke all on table matchapp_private.monetization_qa_cohort from public,anon,authenticated,service_role;

create function matchapp_private.user_monetization_policy(p_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare c matchapp_private.monetization_config%rowtype;v_expiry timestamptz;v_qa boolean;
begin
 select * into c from matchapp_private.monetization_config where singleton;
 if not found then return jsonb_build_object('ok',false,'enabled',false,'rewards_enabled',false,
  'global_enabled',false,'qa_active',false,'qa_expires_at',null,'stripe_product_ids','[]'::jsonb,
  'play_product_ids','[]'::jsonb,'policy_version','match-tokens-v1');end if;
 select q.expires_at into v_expiry
 from matchapp_private.monetization_qa_cohort q
 join auth.users u on u.id=q.user_id
 where q.user_id=p_user_id and q.revoked_at is null and q.expires_at>now()
 and q.granted_at<=now() and q.expires_at<=q.granted_at+interval '24 hours'
 and not coalesce(u.is_anonymous,false)
 and (u.email_confirmed_at is not null or u.phone_confirmed_at is not null);
 v_qa:=v_expiry is not null;
 return jsonb_build_object('ok',true,'enabled',c.enabled or v_qa,
  'rewards_enabled',c.rewards_enabled or v_qa,'global_enabled',c.enabled,
  'qa_active',v_qa,'qa_expires_at',v_expiry,'stripe_product_ids',c.stripe_product_ids,
  'play_product_ids',c.play_product_ids,'policy_version','match-tokens-v1');
end; $$;
revoke all on function matchapp_private.user_monetization_policy(uuid) from public,anon,authenticated,service_role;

create function public.get_matchapp_user_monetization_config(p_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if p_user_id is null then raise exception 'A user is required' using errcode='22023';end if;
 return matchapp_private.user_monetization_policy(p_user_id);
end; $$;

create function public.set_matchapp_qa_cohort(p_user_id uuid,p_expires_at timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_policy jsonb;
begin
 if p_user_id is null then raise exception 'A user is required' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('monetization-qa:'||p_user_id::text,0));
 if p_expires_at is null then
  update matchapp_private.monetization_qa_cohort set revoked_at=now(),updated_at=now() where user_id=p_user_id;
 else
  if p_expires_at<=now() or p_expires_at>now()+interval '24 hours' then
   raise exception 'QA access must expire within 24 hours' using errcode='22023';end if;
  if not exists(select 1 from auth.users u join public.profiles p on p.id=u.id
   where u.id=p_user_id and not coalesce(u.is_anonymous,false)
   and (u.email_confirmed_at is not null or u.phone_confirmed_at is not null)) then
   raise exception 'QA access requires a confirmed registered account' using errcode='22023';end if;
  insert into matchapp_private.monetization_qa_cohort(user_id,granted_at,expires_at,revoked_at,updated_at)
  values(p_user_id,now(),p_expires_at,null,now())
  on conflict(user_id) do update set granted_at=excluded.granted_at,expires_at=excluded.expires_at,
   revoked_at=null,updated_at=excluded.updated_at;
 end if;
 v_policy:=matchapp_private.user_monetization_policy(p_user_id);
 return jsonb_build_object('ok',true,'user_id',p_user_id,'qa_active',v_policy->'qa_active','qa_expires_at',v_policy->'qa_expires_at');
end; $$;
revoke all on function public.get_matchapp_user_monetization_config(uuid) from public,anon,authenticated;
revoke all on function public.set_matchapp_qa_cohort(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.get_matchapp_user_monetization_config(uuid) to service_role;
grant execute on function public.set_matchapp_qa_cohort(uuid,timestamptz) to service_role;

-- Replace only the reviewed activation predicates in exact installed bodies.
-- Any missing/changed baseline aborts this transaction instead of overwriting it.
do $qa_predicates$
declare r record;v_source text;v_count int;
begin
 for r in select * from (values
  ('matchapp_private.token_wallet(uuid)',
   'v_day date:=(now() at time zone ''UTC'')::date;',
   'v_day date:=(now() at time zone ''UTC'')::date;v_policy jsonb;'),
  ('matchapp_private.token_wallet(uuid)',
   'v_pro:=matchapp_private.pro_state(p_user_id);',
   'v_policy:=matchapp_private.user_monetization_policy(p_user_id);v_pro:=matchapp_private.pro_state(p_user_id);'),
  ('matchapp_private.token_wallet(uuid)',
   '''enabled'',c.enabled or v_unlimited',
   '''enabled'',(v_policy->>''enabled'')::boolean or v_unlimited'),
  ('matchapp_private.token_wallet(uuid)',
   '''rewarded_available'',c.enabled and c.rewards_enabled and',
   '''rewarded_available'',(v_policy->>''enabled'')::boolean and (v_policy->>''rewards_enabled'')::boolean and'),
  ('public.consume_match_token(uuid,text)',
   'not(select enabled from matchapp_private.monetization_config where singleton)',
   'not((matchapp_private.user_monetization_policy(v_uid)->>''enabled'')::boolean)'),
  ('public.claim_registration_welcome_bonus()',
   '(select enabled from matchapp_private.monetization_config where singleton)',
   '((matchapp_private.user_monetization_policy(auth.uid())->>''enabled'')::boolean)'),
  ('public.claim_match_result_share(text)',
   '(select enabled from matchapp_private.monetization_config where singleton)',
   '((matchapp_private.user_monetization_policy(auth.uid())->>''enabled'')::boolean)'),
  ('public.reserve_play_pro_offer(uuid,text,text,text,text,text)',
   'where singleton and enabled and p_product_id=any(play_product_ids)',
   'where singleton and (matchapp_private.user_monetization_policy(p_user_id)->>''enabled'')::boolean and p_product_id=any(play_product_ids)')
 ) as edits(signature,needle,replacement) loop
  if to_regprocedure(r.signature) is null then raise exception 'Missing QA policy baseline: %',r.signature;end if;
  select pg_get_functiondef(to_regprocedure(r.signature)) into v_source;
  v_count:=(length(v_source)-length(replace(v_source,r.needle,'')))/length(r.needle);
  if v_count<>1 then raise exception 'Unexpected QA policy baseline: % (% matches)',r.signature,v_count;end if;
  execute replace(v_source,r.needle,r.replacement);
 end loop;
end; $qa_predicates$;

-- reward_session_service derives eligibility from the wallet. Signed SSV
-- credit and paid-receipt reconciliation keep their existing fulfillment paths.
commit;
