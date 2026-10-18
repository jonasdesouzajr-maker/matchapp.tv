-- Recorded connector-deployment alignment. The preceding migration is kept
-- at its reviewed source; fresh installations already match and are a no-op.
-- Live deployment corrected one transcription mismatch before web publication.
do $alignment$
declare target regprocedure:='public.growth_together_service(text,jsonb)'::regprocedure; definition text; source_hash text;
begin
 select md5(prosrc) into source_hash from pg_proc where oid=target;
 if source_hash='06cd4c0c3f3dfc8dca47b873b60d0650' then return; end if;
 if source_hash<>'f10090fe18c31898a5abd8a0ace7a12d' then raise exception 'Unexpected function revision; source alignment aborted'; end if;
 definition:=pg_get_functiondef(target);
 if (length(definition)-length(replace(definition,'set result=null,status=''ready'',retry_after=null where id=v.id;','')))/length('set result=null,status=''ready'',retry_after=null where id=v.id;')<>1 then raise exception 'Expected exactly one source mismatch'; end if;
 execute replace(definition,'set result=null,status=''ready'',retry_after=null where id=v.id;','set status=''ready'',retry_after=null where id=v.id;');
 select md5(prosrc) into source_hash from pg_proc where oid=target;
 if source_hash<>'06cd4c0c3f3dfc8dca47b873b60d0650' then raise exception 'Function source does not match tested PR'; end if;
end $alignment$;
