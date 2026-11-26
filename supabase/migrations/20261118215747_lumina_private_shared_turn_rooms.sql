create schema lumina_duels;
revoke all on schema lumina_duels from public, anon, authenticated;
create table lumina_duels.rooms (
 code text primary key, host text not null, guest text, listed boolean not null,
 deck int[] not null, matched int[] not null default '{}', shown int[] not null default '{}',
 scores int[] not null default '{0,0}', turn int not null default 1, rev int not null default 0,
 reveal_until timestamptz, closed boolean not null default false,
 host_seen timestamptz not null default now(), guest_seen timestamptz, touched timestamptz not null default now()
);
create index on lumina_duels.rooms(host);
create index on lumina_duels.rooms(guest);
create index on lumina_duels.rooms(touched);
alter table lumina_duels.rooms enable row level security;
create function public.lumina_duel_v1(player text,action text,room_code text default '',card int default -1,revision int default -1)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r lumina_duels.rooms; seat int; idx int; available boolean; t timestamptz:=clock_timestamp();
begin
 if player is null or length(player) not between 1 and 128 then raise exception 'Invalid player'; end if;
 if action in ('quick','invite','join') then
   perform pg_advisory_xact_lock(4820193601);
   delete from lumina_duels.rooms where touched<t-interval '24 hours';
   select * into r from lumina_duels.rooms where not closed and player in (host,guest)
   and touched>t-interval '2 minutes' order by touched desc limit 1 for update;
   if found and action='join' and r.code<>upper(room_code) then raise exception 'Leave current game first'; end if;
   if not found then
     if action='join' then
       select * into r from lumina_duels.rooms where code=upper(room_code) and guest is null and not closed and host_seen>t-interval '2 minutes' for update;
       if not found then raise exception 'Room unavailable'; end if;
     elsif action='quick' then
       select * into r from lumina_duels.rooms where listed and guest is null and not closed and host_seen>t-interval '15 seconds' and host<>player order by touched limit 1 for update;
     end if;
     if r.code is null then
       insert into lumina_duels.rooms(code,host,listed,deck) values(upper(left(replace(gen_random_uuid()::text,'-',''),12)),player,action='quick',
         array(select face from generate_series(0,7) face cross join generate_series(1,2) copies order by random())) returning * into r;
     else
       update lumina_duels.rooms set guest=player, guest_seen=t, touched=t, rev=rev+1 where code=r.code returning * into r;
     end if;
   end if;
 else
   select * into r from lumina_duels.rooms where code=upper(room_code) and player in (host,guest) for update;
   if not found then raise exception 'Room unavailable'; end if;
 end if;
 seat:=case when r.host=player then 1 else 2 end;
 if r.guest is not null and least(r.host_seen,r.guest_seen)<t-interval '2 minutes' then r.closed:=true;end if;
 if action='leave' then r.closed:=true;end if;
 if r.reveal_until<=t then
   if r.deck[r.shown[1]]=r.deck[r.shown[2]] then r.matched:=r.matched||r.shown; r.scores[r.turn]:=r.scores[r.turn]+100; end if;
   r.shown:='{}';r.turn:=3-r.turn;r.rev:=r.rev+1;r.reveal_until:=null;
 end if;
 if action='flip' and not r.closed and r.guest is not null and r.turn=seat and revision=r.rev and r.reveal_until is null then
   idx:=card+1;
   if idx between 1 and cardinality(r.deck) and not(idx=any(r.matched||r.shown)) then
     r.shown:=array_append(r.shown,idx);r.rev:=r.rev+1;
     if cardinality(r.shown)=2 then r.reveal_until:=t+interval '1500 milliseconds';end if;
   end if;
 end if;
 if cardinality(r.matched)=cardinality(r.deck) then r.closed:=true;end if;
 update lumina_duels.rooms set matched=r.matched,shown=r.shown,scores=r.scores,turn=r.turn,rev=r.rev,reveal_until=r.reveal_until,closed=r.closed,touched=t,
 host_seen=case when seat=1 then t else host_seen end,guest_seen=case when seat=2 then t else guest_seen end where code=r.code;
 return jsonb_build_object('code',r.code,'seat',seat,'waiting',r.guest is null,'closed',r.closed,'scores',r.scores,'turn',r.turn,'rev',r.rev,
 'matched',array(select i-1 from unnest(r.matched) i),'cards',array(select case when i=any(r.matched||r.shown) then r.deck[i] else -1 end from generate_subscripts(r.deck,1)i));
end $$;
revoke all on function public.lumina_duel_v1(text,text,text,int,int) from public,anon,authenticated;
grant execute on function public.lumina_duel_v1(text,text,text,int,int) to service_role;
