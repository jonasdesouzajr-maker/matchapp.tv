-- All fixtures, DDL and permission changes roll back in this verification transaction.
insert into auth.users(id,email,is_anonymous,raw_user_meta_data) values
 ('00000000-0000-4000-8000-0000000000a1','matchapp-test-a@example.invalid',false,'{}'),
 ('00000000-0000-4000-8000-0000000000b2','matchapp-test-b@example.invalid',false,'{}'),
 ('00000000-0000-4000-8000-0000000000c3','matchapp-test-c@example.invalid',false,'{}');
insert into match_private.catalog values('examplefamilycomedy','{"title":"Example Family Comedy","year":1999,"platform":"Test","cats":["movie"],"moods":["funny"],"vibes":[],"ratings":["kids"]}'),('examplethriller','{"title":"Example Thriller","year":2020,"platform":"Test","cats":["movie"],"moods":["intense and thrilling"],"vibes":[],"ratings":["teen PG-13"]}');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000b2',true);
set local role authenticated;
select public.friends_action('settings','{"alias":"Test Bob","sharing":true,"presence":true}');
reset role;
update match_private.friend_profiles set invite_code='000000000000000000000000000000b2' where user_id='00000000-0000-4000-8000-0000000000b2';
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000a1',true);
set local role authenticated;
select public.friends_action('request','{"token":"000000000000000000000000000000b2"}');
do $$begin
 if jsonb_array_length(public.friends_action('list','{}')->'friends')<>0 then raise exception 'Presence exposed before acceptance';end if;
 if has_table_privilege(current_user,'match_private.title_exclusions','select') then raise exception 'Direct private history access granted';end if;
end$$;
reset role;
select set_config('matchapp.test_request',(select id::text from match_private.friendships where sender='00000000-0000-4000-8000-0000000000a1'),true);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000c3',true);
set local role authenticated;
select public.friends_action('accept',jsonb_build_object('id',current_setting('matchapp.test_request')));
do $$begin if jsonb_array_length(public.friends_action('list','{}')->'friends')<>0 then raise exception 'Third user gained friendship';end if;end$$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000b2',true);
set local role authenticated;
select public.friends_action('accept',jsonb_build_object('id',current_setting('matchapp.test_request')));
select public.friends_action('heartbeat','{}');
select public.portfolio_action('remember','{"items":[{"title":"Example Family Comedy","action":"save","addedAt":123}]}');
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000a1',true);
set local role authenticated;
do $$declare info jsonb;begin
 info:=public.friends_action('list','{}');
 if jsonb_array_length(info->'friends')<>1 or (info->'friends'->0->>'online')::boolean is not true then raise exception 'Mutual presence failed';end if;
 if jsonb_array_length(public.portfolio_action('list','{}')->'keys')<>0 then raise exception 'Friend private history leaked';end if;
 info:=public.friends_action('invite_match','{"friend":"00000000-0000-4000-8000-0000000000b2","prefs":{"mood":["funny"]}}');
 perform set_config('matchapp.test_match',info->>'code',true);
end$$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000c3',true);
set local role authenticated;
do $$declare denied boolean:=false;begin
 begin perform public.friends_action('match',jsonb_build_object('code',current_setting('matchapp.test_match')));exception when others then denied:=true;end;
 if not denied then raise exception 'Third user gained pair match access';end if;
end$$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000b2',true);
set local role authenticated;
do $$declare info jsonb;begin
 info:=public.friends_action('choose',jsonb_build_object('code',current_setting('matchapp.test_match'),'prefs','{"mood":["funny"]}'::jsonb));
 if info->'result'<>'null'::jsonb then raise exception 'Saved title resurfaced or mood relaxed';end if;
end$$;
reset role;
do $$begin
 if has_function_privilege('anon','public.friends_action(text,jsonb)','execute') or has_function_privilege('anon','public.portfolio_action(text,jsonb)','execute') then raise exception 'Anonymous RPC access granted';end if;
end$$;
select 'PASS: anonymous blocked; mutual consent required; third user denied; history private; pair exclusions and moods strict' as verification;
insert into match_private.catalog values('anotherfamilycomedy','{"title":"Another Family Comedy","year":1991,"platform":"Test","cats":["movie"],"moods":["funny"],"vibes":[],"ratings":["kids"]}');
set local role authenticated;
do $$declare info jsonb;begin
 info:=public.friends_action('choose',jsonb_build_object('code',current_setting('matchapp.test_match'),'prefs','{"mood":["funny"]}'::jsonb));
 if info->'result'->>'title'<>'Another Family Comedy' then raise exception 'Fresh private pair match failed';end if;
end$$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000a1',true);
set local role authenticated;
do $$declare info jsonb;begin
 info:=public.friends_action('choose',jsonb_build_object('code',current_setting('matchapp.test_match'),'prefs','{"mood":["intense and thrilling"]}'::jsonb));
 if info->'result'->>'title'<>'Another Family Comedy' then raise exception 'A resolved match diverged between friends';end if;
end$$;
reset role;
select 'PASS: fresh pair result resolves; first result remains identical on both accounts' as verification;
rollback;
