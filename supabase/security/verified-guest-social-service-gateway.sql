-- PostgREST exposes public by default; match_private MUST NOT be
-- globally exposed. A narrow single service-role-only RPC mediates the
-- independently verified guest proof Edge Function's DB interactions.
create or replace function public.verified_guest_social_gateway(
 p_action text,p_guest_id uuid,
 p_proof_id uuid default null,p_kind text default null,
 p_platform text default null,p_post_id text default null,p_post_url text default null
) returns jsonb
language plpgsql security definer
set search_path=pg_catalog,match_private
as $$
declare v_proof match_private.guest_social_proofs%rowtype;
begin
 if p_guest_id is null then return jsonb_build_object('ok',false,'reason','invalid_request'); end if;
 if p_action='start' then
   return match_private.guest_social_proof_begin(p_guest_id,p_kind);
 end if;
 if p_action='get' then
   if p_proof_id is null then return null; end if;
   select * into v_proof from match_private.guest_social_proofs
   where guest_id=p_guest_id and id=p_proof_id;
   if v_proof.id is null then return null; end if;
   return jsonb_build_object(
    'id',v_proof.id,'guest_id',v_proof.guest_id,
    'kind',v_proof.kind,'challenge',v_proof.challenge,
    'issued_at',v_proof.issued_at,'status',v_proof.status
   );
 end if;
 if p_action='complete' then
   return match_private.guest_social_proof_complete(
    p_guest_id,p_proof_id,p_platform,p_post_id,p_post_url
   );
 end if;
 return jsonb_build_object('ok',false,'reason','invalid_request');
end $$;
revoke all on function public.verified_guest_social_gateway(text,uuid,uuid,text,text,text,text)
 from public,anon,authenticated;
grant execute on function public.verified_guest_social_gateway(text,uuid,uuid,text,text,text,text)
 to service_role;
notify pgrst,'reload schema';
