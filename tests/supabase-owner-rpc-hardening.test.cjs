'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const migration=fs.readFileSync('supabase/migrations/20261024082202_harden_public_rpc_and_owner_policy_plans.sql','utf8');
// Read-only function bodies captured from the production schema before the
// change. Fixtures contain no users or secrets from production.
const functions=require('./fixtures/owner-read-rpc-before.json');
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';

test('least-privilege migration preserves owner balances and RLS while denying anonymous mutations',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
   create schema auth;create schema match_private;create schema matchapp_private;
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema public,auth to anon,authenticated,service_role;
   create table auth.users(id uuid primary key,email text,phone text,phone_confirmed_at timestamptz);
   create table public.profiles(id uuid primary key,credits integer,purchased_matches integer,kids_credits integer,kids_purchased_matches integer,sms_communications_opt_in boolean default false,profile_locked boolean default false);
   create table public.daily_match_checkins(user_id uuid primary key,streak integer default 0,last_checkin date,total_checkins integer default 0,completed_weeks integer default 0);
   create table public.credit_ledger(user_id uuid,delta integer,balance integer,reason text);
   create table public.account_deletion_requests(user_id uuid primary key,email text,requested_at timestamptz default now(),purge_after timestamptz default now()+interval '72 hours',purged_at timestamptz);
   create table match_private.classic_session_members(session_code text,user_id uuid references public.profiles(id));
   create table match_private.growth_invites(guest_id uuid references public.profiles(id));
   create table matchapp_private.reward_transactions(user_id uuid references public.profiles(id));
   alter table profiles enable row level security;alter table daily_match_checkins enable row level security;
   create policy profiles_select_own on profiles for select using ((select auth.uid())=id);
   create policy profiles_update_own on profiles for update using ((select auth.uid())=id) with check ((select auth.uid())=id);
   create policy "users read own checkin" on daily_match_checkins for select to authenticated using(auth.uid()=user_id);
   grant select on profiles,daily_match_checkins to anon,authenticated,service_role;
   grant update(sms_communications_opt_in) on profiles to authenticated;
   insert into profiles(id,credits,purchased_matches,kids_credits,kids_purchased_matches) values('${a}',50,10,8,4),('${b}',70,20,16,12);
   insert into daily_match_checkins values('${a}',5,current_date,12,1),('${b}',3,current_date,8,0);
   insert into auth.users values('${a}','first@example.invalid',null,null),('${b}','second@example.invalid',null,null);`);
  const policies={jonas_chat_subscriptions:'jonas_subscription_owner_read',jonas_chat_usage:'jonas_usage_owner_read',match_pack_ledger:'match_pack_ledger_select_own',user_activity_history:'user_activity_history_select_own',user_preference_history:'user_preference_history_select_own',user_taste:'user_taste_own'};
  for(const [table,policy]of Object.entries(policies))await db.exec(`create table public.${table}(user_id uuid,marker text);alter table public.${table} enable row level security;create policy ${policy} on public.${table} ${table==='user_taste'?'for all':'for select'} using(auth.uid()=user_id) ${table==='user_taste'?'with check(auth.uid()=user_id)':''};grant select,insert,update on public.${table} to authenticated;insert into public.${table} values('${a}','a'),('${b}','b');`);
  for(const f of functions)await db.exec(f.definition);
  await db.exec(`grant execute on all functions in schema public to anon,authenticated,service_role;revoke execute on function kids_credits(),kids_match_pack_balance() from public,anon;create trigger enforce_phone before insert or update of sms_communications_opt_in on profiles for each row execute function enforce_verified_phone_sms_consent();`);
  const as=async(role,uid)=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);await db.exec('set role '+role);};
  const read=async(role,uid)=>{await as(role,uid);const result={};for(const name of ['match_credits','match_pack_balance','daily_match_checkin_status',...(role==='authenticated'?['kids_credits','kids_match_pack_balance']:[])])result[name]=(await db.query('select public.'+name+'() as value')).rows[0].value;return result;};
  const before=[await read('authenticated',a),await read('authenticated',b),await read('anon','')];
  await db.exec('reset role');const dataBefore=(await db.query('select * from profiles order by id')).rows;
  await db.exec('begin;'+migration+'commit;');
  assert.deepEqual((await db.query('select * from profiles order by id')).rows,dataBefore,'DDL must not change balances or profile data');
  assert.deepEqual([await read('authenticated',a),await read('authenticated',b),await read('anon','')],before,'existing account and guest responses are preserved');
  await as('authenticated',a);
  assert.equal((await db.query('select id from profiles')).rows.length,1);
  for(const table of Object.keys(policies))assert.deepEqual((await db.query('select user_id from '+table)).rows.map(r=>r.user_id),[a],table+' remains owner-only');
  await assert.rejects(db.query('insert into user_taste values($1,$2)',[b,'forged']),/row-level security/i);
  assert.equal((await db.query("select has_function_privilege('authenticated','public.enforce_verified_phone_sms_consent()','execute') as yes")).rows[0].yes,false);
  await assert.rejects(db.query('update profiles set sms_communications_opt_in=true where id=$1',[a]),/verified account phone/i,'the trigger must still run after direct EXECUTE is revoked');
  const debit=(await db.query("select consume_credit('ask_ai') as value")).rows[0].value;assert.equal(debit.ok,true);assert.equal(debit.credits,49);
  const deletion=(await db.query('select request_account_deletion() as value')).rows[0].value;assert.equal(deletion.purge_after_hours,72);
  await as('anon','');
  await assert.rejects(db.query("select consume_credit('ask_ai')"),/permission denied/i);
  await assert.rejects(db.query('select request_account_deletion()'),/permission denied/i);
  await db.exec('reset role');assert.equal((await db.query('select credits from profiles where id=$1',[b])).rows[0].credits,70);
  const flags=(await db.query("select proname,prosecdef from pg_proc where pronamespace='public'::regnamespace and proname in ('match_credits','match_pack_balance','kids_credits','kids_match_pack_balance','daily_match_checkin_status')")).rows;
  assert.equal(flags.length,5);assert(flags.every(r=>!r.prosecdef));
  for(const name of ['consume_credit(text)','request_account_deletion()','enforce_verified_phone_sms_consent()'])assert((await db.query("select has_function_privilege('service_role',$1,'execute') as yes",['public.'+name])).rows[0].yes);
  assert.equal((await db.query("select count(*)::int as n from pg_indexes where indexname in('classic_session_members_user_id_idx','growth_invites_guest_id_idx','reward_transactions_user_id_idx')")).rows[0].n,3);
 }finally{await db.close();}
});
