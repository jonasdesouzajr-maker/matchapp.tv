'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const sql=fs.readFileSync('supabase/migrations/20261127105147_harden_legacy_activity_and_private_tables.sql','utf8');
test('legacy RPC and sensitive table permission hardening',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema match_private;grant usage on schema public to anon,authenticated,service_role;
 grant usage on schema match_private to authenticated;
 create table public.match_activity(day date primary key,match_count bigint not null default 0,updated_at timestamptz not null default now());
 alter table public.match_activity enable row level security;
 create function public.bump_match_activity() returns void language plpgsql security definer set search_path=public as $$begin
 insert into public.match_activity(day,match_count,updated_at) values(current_date,1,now())
 on conflict(day) do update set match_count=public.match_activity.match_count+1,updated_at=now();
 end;$$;
 create function public.activity_stats() returns bigint language sql stable security definer set search_path=public as $$select coalesce(sum(match_count),0)::bigint from public.match_activity$$;
 create function public.trusted_match_fixture() returns void language sql security definer set search_path='' as $$select public.bump_match_activity()$$;
 grant execute on function public.bump_match_activity(),public.activity_stats() to anon,authenticated,service_role;
 revoke execute on function public.trusted_match_fixture() from public,anon;
 grant execute on function public.trusted_match_fixture() to authenticated,service_role;
 create table match_private.phone_auth_proofs(id integer primary key);
 create table match_private.tiktok_ad_share_rewards(id integer primary key);
 revoke all on match_private.phone_auth_proofs,match_private.tiktok_ad_share_rewards from public,anon,authenticated,service_role;
 insert into match_private.phone_auth_proofs values(1);insert into match_private.tiktok_ad_share_rewards values(2);
 create table public.account_deletion_requests(id integer primary key);create table public.banned_emails(id integer primary key);
 alter table public.account_deletion_requests enable row level security;alter table public.banned_emails enable row level security;
 grant all on public.account_deletion_requests,public.banned_emails to anon,authenticated,service_role;
 insert into public.account_deletion_requests values(3);insert into public.banned_emails values(4);
 create function public.server_read_fixture() returns bigint language sql security definer set search_path='' as $$select (select count(*) from public.banned_emails)+(select count(*) from match_private.phone_auth_proofs)$$;
 revoke execute on function public.server_read_fixture() from public,anon;
 grant execute on function public.server_read_fixture() to authenticated,service_role;
 insert into public.match_activity(day,match_count) values(current_date,7);`);
 const before=(await db.query('select * from public.match_activity')).rows;
 await db.exec('begin;'+sql+'commit;');
 assert.deepEqual((await db.query('select * from public.match_activity')).rows,before);
 const flags=(await db.query("select relname,relrowsecurity,relforcerowsecurity from pg_class where relnamespace='match_private'::regnamespace and relkind='r'")).rows;
 assert.equal(flags.length,2);assert(flags.every(x=>x.relrowsecurity&&!x.relforcerowsecurity));
 for(const role of ['anon','authenticated']){
 await db.exec('set role '+role);
 await assert.rejects(db.query('select public.bump_match_activity()'),/permission denied/i);
 assert.equal(Number((await db.query('select public.activity_stats() as value')).rows[0].value),7);
 for(const t of ['public.account_deletion_requests','public.banned_emails'])await assert.rejects(db.query('select * from '+t),/permission denied/i);
 await db.exec('reset role');
 }
 await db.exec('set role authenticated');await db.query('select public.trusted_match_fixture()');
 assert.equal(Number((await db.query('select public.server_read_fixture() as value')).rows[0].value),2);
 await db.exec('reset role');await db.exec('set role service_role');await db.query('select public.bump_match_activity()');
 assert.equal(Number((await db.query('select public.activity_stats() as value')).rows[0].value),9);
 assert.equal((await db.query('select * from public.account_deletion_requests')).rows.length,1);
 assert.equal((await db.query('select * from public.banned_emails')).rows.length,1);
 await db.exec('reset role');
 assert.equal((await db.query('select * from match_private.phone_auth_proofs')).rows.length,1);
 assert.equal((await db.query('select * from match_private.tiktok_ad_share_rewards')).rows.length,1);
 }finally{await db.close();}
});
