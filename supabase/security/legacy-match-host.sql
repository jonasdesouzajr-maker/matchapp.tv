-- Invitation codes allow guests to join; only the authenticated host may
-- create a room and decide its result. Existing private Friends RPCs are separate.
do $$
declare definition text;
begin
 definition := pg_get_functiondef('public.create_match_session(text,jsonb)'::regprocedure);
 definition := replace(definition, E'begin\n', E'begin\n    if auth.uid() is null then return jsonb_build_object(''ok'',false,''error'',''not_authenticated''); end if;\n');
 execute definition;
 definition := pg_get_functiondef('public.set_match_session_result(text,jsonb)'::regprocedure);
 definition := replace(definition, '    -- Already decided:', E'    if auth.uid() is null or v_row.host_id is distinct from auth.uid() then\n        return jsonb_build_object(''ok'',false,''error'',''host_required'');\n    end if;\n\n    -- Already decided:');
 execute definition;
end;
$$;
revoke execute on function public.create_match_session(text,jsonb),public.set_match_session_result(text,jsonb) from public,anon;
grant execute on function public.create_match_session(text,jsonb),public.set_match_session_result(text,jsonb) to authenticated;
