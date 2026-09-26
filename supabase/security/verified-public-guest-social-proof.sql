-- Adult guest public-post proof. Private service-only ledger; no public API table access.
-- Deliberately distinct from the existing TikTok ad-share referral ledger.
create table if not exists match_private.guest_social_proofs (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null,
  kind text not null check (kind in ('match','ask_ai')),
  challenge text not null unique,
  status text not null default 'pending' check (status in ('pending','verified')),
  issued_at timestamptz not null default now(),
  verified_at timestamptz,
  platform text check (platform in ('tiktok','bluesky')),
  post_id text,
  post_url text,
  check ((status='pending' and verified_at is null and platform is null and post_id is null)
     or (status='verified' and verified_at is not null and platform is not null and post_id is not null))
);
create unique index if not exists guest_social_proofs_unique_platform_post
 on match_private.guest_social_proofs (platform,post_id)
 where status='verified';
create index if not exists guest_social_proofs_guest_recent
 on match_private.guest_social_proofs (guest_id,issued_at desc);
alter table match_private.guest_social_proofs enable row level security;
revoke all on match_private.guest_social_proofs from public,anon,authenticated;
grant select,insert,update on match_private.guest_social_proofs to service_role;

-- Advisory lock serializes guest claims, even when multiple tabs submit at once.
create or replace function match_private.guest_social_proof_begin(p_guest_id uuid,p_kind text)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, match_private
as $$
declare v_used int; v_pending match_private.guest_social_proofs%rowtype;
begin
 if p_guest_id is null or p_kind not in ('match','ask_ai') then
   return jsonb_build_object('ok',false,'reason','invalid_request');
 end if;
 perform pg_advisory_xact_lock(hashtext(p_guest_id::text),20260926);
 select count(*) into v_used from match_private.guest_social_proofs
 where guest_id=p_guest_id and status='verified';
 if v_used>=2 then return jsonb_build_object('ok',false,'reason','limit_reached','remaining',0);end if;
 select * into v_pending from match_private.guest_social_proofs
 where guest_id=p_guest_id and kind=p_kind and status='pending'
 and issued_at>now()-interval '90 minutes'
 order by issued_at desc limit 1;
 if v_pending.id is null then
   -- Limit anonymous requests for challenge codes on a single guest identity.
   if (select count(*) from match_private.guest_social_proofs
       where guest_id=p_guest_id and issued_at>now()-interval '1 hour')>=8 then
     return jsonb_build_object('ok',false,'reason','rate_limited');
   end if;
   insert into match_private.guest_social_proofs(guest_id,kind,challenge)
    values(p_guest_id,p_kind,'MAI-'||upper(encode(gen_random_bytes(12),'hex')))
    returning * into v_pending;
 end if;
 return jsonb_build_object('ok',true,'proof_id',v_pending.id,
   'challenge',v_pending.challenge,'remaining',2-v_used,
   'issued_at',v_pending.issued_at);
end $$;

create or replace function match_private.guest_social_proof_complete(
 p_guest_id uuid,p_proof_id uuid,p_platform text,p_post_id text,p_post_url text
) returns jsonb language plpgsql security definer
set search_path = pg_catalog,match_private
as $$
declare v_proof match_private.guest_social_proofs%rowtype; v_used int;
begin
 if p_guest_id is null or p_proof_id is null or p_platform not in ('tiktok','bluesky')
 or nullif(p_post_id,'') is null or length(p_post_id)>180
 or length(coalesce(p_post_url,''))>700 then
   return jsonb_build_object('ok',false,'reason','invalid_request');
 end if;
 perform pg_advisory_xact_lock(hashtext(p_guest_id::text),20260926);
 select * into v_proof from match_private.guest_social_proofs
 where id=p_proof_id and guest_id=p_guest_id for update;
 if v_proof.id is null then return jsonb_build_object('ok',false,'reason','unknown_challenge'); end if;
 if v_proof.status='verified' then
   return jsonb_build_object('ok',false,'reason','already_claimed');
 end if;
 if v_proof.issued_at<=now()-interval '90 minutes' then
   return jsonb_build_object('ok',false,'reason','expired');
 end if;
 select count(*) into v_used from match_private.guest_social_proofs
 where guest_id=p_guest_id and status='verified';
 if v_used>=2 then return jsonb_build_object('ok',false,'reason','limit_reached');end if;
 if exists(select 1 from match_private.guest_social_proofs
   where platform=p_platform and post_id=p_post_id and status='verified') then
   return jsonb_build_object('ok',false,'reason','post_already_used');
 end if;
 update match_private.guest_social_proofs
 set status='verified',verified_at=now(),platform=p_platform,
 post_id=p_post_id,post_url=p_post_url
 where id=v_proof.id;
 return jsonb_build_object('ok',true,'verified',true,'kind',v_proof.kind,
   'proof_id',v_proof.id,'remaining',1-v_used,'platform',p_platform);
end $$;

revoke all on function match_private.guest_social_proof_begin(uuid,text) from public,anon,authenticated;
revoke all on function match_private.guest_social_proof_complete(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function match_private.guest_social_proof_begin(uuid,text) to service_role;
grant execute on function match_private.guest_social_proof_complete(uuid,uuid,text,text,text) to service_role;
