-- Match the existing native ad-free gate using the wallet's authoritative state.
-- Only reward availability changes; balances, entitlements, QA and earned SSV
-- fulfillment retain their installed definitions and behavior.
begin;

do $reward_ad_free$
declare
 v_signature text:='matchapp_private.token_wallet(uuid)';
 v_source text;v_count int;
 v_needle text:=$predicate$'rewarded_available',(v_policy->>'enabled')::boolean and (v_policy->>'rewards_enabled')::boolean and not v_unlimited and not v_first and v_daily+v_bonus+v_purchased=0$predicate$;
 v_replacement text:=$predicate$'rewarded_available',(v_policy->>'enabled')::boolean and (v_policy->>'rewards_enabled')::boolean and (v_pro->>'adFree')::boolean is false and not v_unlimited and not v_first and v_daily+v_bonus+v_purchased=0$predicate$;
begin
 if to_regprocedure(v_signature) is null then
  raise exception 'Missing reward wallet baseline: %',v_signature;
 end if;
 select pg_get_functiondef(to_regprocedure(v_signature)) into v_source;
 v_count:=(length(v_source)-length(replace(v_source,v_needle,'')))/length(v_needle);
 if v_count<>1 then
  raise exception 'Unexpected reward wallet baseline: % (% matches)',v_signature,v_count;
 end if;
 execute replace(v_source,v_needle,v_replacement);
end; $reward_ad_free$;

commit;
