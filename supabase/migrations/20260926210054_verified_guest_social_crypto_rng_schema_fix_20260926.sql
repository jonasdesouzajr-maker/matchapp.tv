-- Fix deployed private proof issuer: pgcrypto lives in extensions schema.
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
    values(p_guest_id,p_kind,'MAI-'||upper(encode(extensions.gen_random_bytes(12),'hex')))
    returning * into v_pending;
 end if;
 return jsonb_build_object('ok',true,'proof_id',v_pending.id,
   'challenge',v_pending.challenge,'remaining',2-v_used,
   'issued_at',v_pending.issued_at);
end $$;
