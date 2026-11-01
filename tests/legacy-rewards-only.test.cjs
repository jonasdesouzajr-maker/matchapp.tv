'use strict';
const {test,describe,before,after,beforeEach}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {randomUUID,randomBytes,generateKeyPairSync,sign}=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite');
const root=path.join(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
const MIGRATION='supabase/migrations/20261101114421_legacy_rewards_only.sql';
const unit='ca-app-pub-9541435081010948/2802190985';

describe('independent legacy Extra Matches rewards',()=>{
 let db,definitions,beforeData,afterData,oldPrepared,oldCredited;
 const hash=()=>randomBytes(32).toString('hex');
 const rpc=async(name,args=[]) => (await db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) value`,args)).rows[0].value;
 const scalar=async(sql,args=[]) => (await db.query(sql,args)).rows[0];
 const auth=uid=>db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid||'']);
 const config=(enabled=false,rewards=false)=>rpc('set_matchapp_monetization_config',[enabled,rewards,['prod_VSP0LagMpQQHIj'],['matchapp_pro']]);
 const rollout=enabled=>rpc('set_legacy_reward_rollout',[enabled]);
 const grant=(uid,expires=new Date(Date.now()+3600000).toISOString())=>rpc('set_legacy_reward_qa_cohort',[uid,expires]);
 const reward=(action,uid,nonce=hash(),request=randomUUID(),surface='one_match')=>rpc('reward_session_service',[action,uid,request,nonce,surface]);
 const credit=(uid,nonce,transaction=hash(),at=new Date().toISOString(),changes={})=>rpc('credit_match_reward',[nonce,uid,transaction,changes.unit??unit,changes.amount??3,changes.item??'Match Tokens',at]);
 const status=()=>rpc('legacy_reward_status');
 const functionRows=async()=> (await db.query("select p.oid::regprocedure::text signature,p.proacl,pg_get_functiondef(p.oid) definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','auth','match_private','matchapp_private') and p.prokind='f' order by signature")).rows;
 async function user(fields={},authFields={}){
  const uid=randomUUID();await db.query('insert into auth.users(id) values($1)',[uid]);await db.query('insert into public.profiles(id) values($1)',[uid]);
  for(const [key,value] of Object.entries(fields)){
   assert.ok(['full_name','country','dob','star_sign','age','is_vip','is_business','is_ad_free','ad_free_purchased','daily_match_count','daily_match_date','purchased_matches','credits','kids_credits','kids_purchased_matches','kids_daily_action_count'].includes(key));
   await db.query(`update public.profiles set ${key}=$2 where id=$1`,[uid,value]);
  }
  for(const [key,value] of Object.entries(authFields)){
   assert.ok(['email_confirmed_at','phone_confirmed_at','is_anonymous','raw_user_meta_data'].includes(key));
   await db.query(`update auth.users set ${key}=$2 where id=$1`,[uid,value]);
  }
  await auth(uid);return uid;
 }
 const shown=uid=>db.query("insert into match_private.title_exclusions(user_id,title_key,item) values($1,'real-result','{\"title\":\"Real result\",\"action\":\"shown\"}')",[uid]);
 async function exhaust(uid,history='home'){
  await auth(uid);const w=await status();for(let i=0;i<w.daily_limit;i++)assert.equal((await rpc('consume_match')).allowed,true);
  assert.equal((await rpc('consume_match')).allowed,false);
  if(history==='home')await shown(uid);
  if(history==='ebook')await db.query("insert into match_private.reading_portfolios(user_id,state) values($1,'{\"seen\":[\"catalogue:real-result\"]}')",[uid]);
 }
 async function prepare(uid,surface='one_match'){
  const nonce=hash(),request=randomUUID();const c=await reward('create',uid,nonce,request,surface);
  assert.equal(c.ok,true,JSON.stringify(c));assert.equal(c.creditTarget,'extra_matches');assert.equal(c.claimStatus,'created');
  const prepared=await reward('native_validate',uid,nonce);assert.equal(prepared.ok,true);assert.equal(prepared.claimStatus,'prepared');
  return {uid,nonce,request,at:new Date().toISOString(),transaction:hash()};
 }
 async function state(){
  const tables=['public.profiles','public.match_pack_ledger','public.credit_ledger','public.daily_match_checkins','matchapp_private.monetization_config','matchapp_private.monetization_qa_cohort','matchapp_private.token_accounts','matchapp_private.token_uses','matchapp_private.reward_claims','matchapp_private.reward_transactions','matchapp_private.pro_entitlements'];
  const result={};for(const table of tables)result[table]=(await scalar(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) value from ${table} t`)).value;
  if(result['matchapp_private.reward_claims'])for(const row of result['matchapp_private.reward_claims'])delete row.credit_target;
  return result;
 }
 async function oldClaim(credited){
  const uid=await user({credits:19,kids_credits:5,kids_purchased_matches:8});
  await config(true,true);for(let i=0;i<3;i++)await rpc('consume_match_token',[randomUUID(),i===0?'ebook':'one_match']);
  const nonce=hash(),request=randomUUID(),transaction=hash(),at=new Date().toISOString();
  assert.equal((await reward('create',uid,nonce,request)).ok,true);assert.equal((await reward('native_validate',uid,nonce)).ok,true);
  if(credited)assert.equal((await credit(uid,nonce,transaction,at)).credited,true);
  return {uid,nonce,request,transaction,at};
 }
 before(async()=>{
  db=new PGlite();await db.exec("set time zone 'UTC'");
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
   create table auth.users(id uuid primary key,created_at timestamptz default now(),email_confirmed_at timestamptz default now(),phone_confirmed_at timestamptz,is_anonymous boolean default false,raw_user_meta_data jsonb default '{}');
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create table public.profiles(id uuid primary key,full_name text,country text,dob text,star_sign text,age int,is_vip bool default false,is_business bool default false,is_ad_free bool default false,ad_free_purchased bool default false,daily_match_count int default 0,daily_match_date date default current_date,purchased_matches int default 0,credits int default 0,share_rewards timestamptz[] default '{}',kids_purchased_matches int default 0,kids_credits int default 0,kids_daily_action_count int default 0);
   create table public.match_pack_ledger(user_id uuid,delta int,balance int,pack text,created_at timestamptz default now());
   create table public.credit_ledger(user_id uuid,delta int,balance int,reason text,pack text,created_at timestamptz default now());
   create schema match_private;create table match_private.title_exclusions(user_id uuid,title_key text,item jsonb);
   create table match_private.reading_portfolios(user_id uuid primary key references auth.users(id),state jsonb not null default '{}');
   create table match_private.member_match_result_shares(user_id uuid,title_key text,shared_at timestamptz default now(),primary key(user_id,title_key));
   create function match_private.title_key(text) returns text language sql immutable as $$select lower(trim($1))$$;
   create table public.daily_match_checkins(user_id uuid primary key references auth.users(id),streak int not null default 0,last_checkin date,total_checkins int not null default 0,completed_weeks int not null default 0,updated_at timestamptz default now());`);
  await db.exec(read('supabase/migrations/002_profile_tiers.sql').split('-- Rewire consume_match()')[0]);
  await db.exec(read('supabase/migrations-archive/legacy-local/012_standardize_vip_daily_limit.sql'));
  await db.exec(read('supabase/migrations/20260921181338_repair_daily_checkin_reward_delta.sql').split('do $backfill$')[0]);
  await db.exec(read('supabase/security/registration-welcome-bonus.sql'));
  await db.exec(read('supabase/migrations-archive/legacy-local/20260929120000_canonicalize_match_share_reward_keys.sql'));
  for(const file of ['20261017120448_match_tokens_pro_verified_rewards.sql','20261017134408_match_tokens_first_core_value.sql','20261017134958_play_pro_offer_once.sql','20261017142620_monetization_qa_cohort.sql','20261017152624_reward_wallet_ad_free_parity.sql'])await db.exec(read('supabase/migrations/'+file));
  oldPrepared=await oldClaim(false);oldCredited=await oldClaim(true);await config();definitions=await functionRows();beforeData=await state();
  await db.exec(read(MIGRATION));afterData=await state();
 });
 after(async()=>{if(db)await db.close();});
 beforeEach(async()=>{await db.exec('reset role');await auth(null);await config();await rollout(false);});

 test('migration preserves protected functions, ACLs, billing config, all balances and old claims',async()=>{
  const after=new Map((await functionRows()).map(r=>[r.signature,r]));
  for(const row of definitions){
   assert.deepEqual(after.get(row.signature).proacl,row.proacl,row.signature);
   if(!['reward_session_service(text,uuid,uuid,text,text)','credit_match_reward(text,uuid,text,text,integer,text,timestamp with time zone)'].includes(row.signature))assert.equal(after.get(row.signature).definition,row.definition,row.signature);
  }
  assert.deepEqual(afterData,beforeData);assert.equal((await rpc('get_legacy_reward_rollout')).public_enabled,false);assert.equal((await scalar('select count(*)::int n from matchapp_private.legacy_reward_first_values')).n,0);
  assert.deepEqual((await db.query('select distinct credit_target from matchapp_private.reward_claims')).rows,[{credit_target:'match_tokens'}]);
 });
 test('private settings, claim target, QA, and service RPCs cannot be written or invoked by browsers',async()=>{
  const uid=await user();
  for(const role of ['anon','authenticated']){
   await db.exec('set role '+role);
   for(const [name,args] of [['get_legacy_reward_rollout',[]],['set_legacy_reward_rollout',[true]],['set_legacy_reward_qa_cohort',[uid,new Date(Date.now()+10000).toISOString()]],['reward_session_service',['wallet',uid]],['credit_match_reward',[hash(),uid,hash(),unit,3,'Match Tokens',new Date().toISOString()]]])await assert.rejects(rpc(name,args),/permission denied/);
   for(const table of ['legacy_reward_config','legacy_reward_qa_cohort','legacy_reward_first_values','reward_claims'])await assert.rejects(db.query('select * from matchapp_private.'+table),/permission denied/);
   await assert.rejects(db.query('select matchapp_private.legacy_reward_wallet($1)',[uid]),/permission denied/);
   if(role==='anon')await assert.rejects(status(),/permission denied/);else assert.equal((await status()).authenticated,true);
   await db.exec('reset role');
  }
  for(const table of ['legacy_reward_config','legacy_reward_qa_cohort','legacy_reward_first_values']){
   const acl=await scalar("select relrowsecurity,has_table_privilege('service_role',oid,'select') service_read,has_table_privilege('service_role',oid,'insert,update,delete') service_write from pg_class where oid=$1::regclass",['matchapp_private.'+table]);assert.equal(acl.relrowsecurity,true);assert.equal(acl.service_read,false);assert.equal(acl.service_write,false);
  }
  for(const role of ['anon','authenticated','service_role']){
   await db.exec('set role '+role);
   await assert.rejects(db.query("insert into matchapp_private.legacy_reward_first_values(user_id,surface) values($1,'one_match')",[uid]),/permission denied/);
   await assert.rejects(db.query('delete from matchapp_private.legacy_reward_first_values where user_id=$1',[uid]),/permission denied/);
   await db.exec('reset role');
  }
  await db.exec('set role service_role');assert.equal((await rollout(true)).public_enabled,true);assert.equal((await grant(uid)).qa_active,true);
 });
 test('reward QA is confirmed-account only, expires within 24 h, and never enables token spending or sales',async()=>{
  const uid=await user({credits:21,kids_credits:6});const before=await state(),global=await rpc('get_matchapp_monetization_config');
  for(const expires of [new Date(Date.now()-1000).toISOString(),new Date(Date.now()+25*3600000).toISOString(),'infinity'])await assert.rejects(grant(uid,expires),/within 24 hours/);
  for(const changes of [{is_anonymous:true},{email_confirmed_at:null,phone_confirmed_at:null}]){const other=await user({},changes);await assert.rejects(grant(other),/confirmed registered account/);}
  await assert.rejects(grant(randomUUID()),/confirmed registered account/);await assert.rejects(grant(null),/user is required/);
  await auth(uid);assert.equal((await grant(uid)).qa_active,true);assert.equal((await status()).enabled,true);
  assert.equal((await rpc('match_token_status')).enabled,false);assert.equal((await rpc('consume_match_token',[randomUUID(),'one_match'])).reason,'policy_disabled');
  assert.equal((await rpc('reserve_pro_checkout',[uid,'price_1URUC4FRuUuhrLPGx0fDzrR3','en'])).reason,'policy_disabled');
  assert.deepEqual(await rpc('get_matchapp_monetization_config'),global);
  assert.equal((await rpc('get_matchapp_user_monetization_config',[uid])).qa_active,false);
  const other=await user();assert.equal((await status()).enabled,false);
  await auth(uid);assert.equal((await grant(uid,null)).qa_active,false);assert.equal((await status()).enabled,false);
  const saved=(await state())['public.profiles'].find(p=>p.id===uid),original=before['public.profiles'].find(p=>p.id===uid);assert.deepEqual(saved,original);
  await db.query("update matchapp_private.legacy_reward_qa_cohort set granted_at=now()-interval '2 hours',expires_at=now()-interval '1 hour',revoked_at=null where user_id=$1",[uid]);assert.equal((await status()).enabled,false);
  assert.equal((await rpc('get_matchapp_user_monetization_config',[other])).enabled,false);
 });
 test('public rewards preserve real legacy 3/5/10/50 limits and shared pools without token accounts or read side effects',async()=>{
  await rollout(true);
  for(const [fields,limit] of [[{},3],[{full_name:'Test',country:'BR',dob:'2000-01-01',star_sign:'Aries',age:26},5],[{is_vip:true},10],[{is_business:true},50]]){
   const uid=await user({...fields,purchased_matches:2,credits:17,kids_credits:5,kids_purchased_matches:9});const snapshot=await state();const w=await status();
   assert.equal(w.daily_limit,limit);assert.equal(w.remaining,limit);assert.equal(w.purchased_matches,2);assert.equal(w.available_total,limit+2);assert.equal(w.bonus_tokens,0);assert.equal(w.unlimited,false);assert.equal(w.first_match_pending,true);assert.equal(w.rewarded_available,false);assert.equal(w.policy_version,'legacy-rewards-v1');assert.equal(w.credit_target,'extra_matches');
   assert.deepEqual(await state(),snapshot);assert.equal((await rpc('match_token_status')).enabled,false);
   for(let i=0;i<limit;i++)assert.equal((await rpc('consume_match')).allowed,true);
   assert.equal((await status()).available_total,2);assert.equal((await status()).rewarded_available,false);
   assert.equal((await rpc('consume_match')).paid_with_match_pack,true);assert.equal((await rpc('consume_match')).paid_with_match_pack,true);assert.equal((await rpc('consume_match')).allowed,false);
   const p=await scalar('select credits,kids_credits,kids_purchased_matches,daily_match_count,purchased_matches from profiles where id=$1',[uid]);assert.deepEqual(p,{credits:17,kids_credits:5,kids_purchased_matches:9,daily_match_count:limit,purchased_matches:0});
   assert.equal((await scalar('select count(*)::int n from matchapp_private.token_accounts where user_id=$1',[uid])).n,0);
  }
 });
 test('owned Home or ebook history AND exhausted authoritative legacy allowance are required',async()=>{
  await rollout(true);
  for(const [history,surface] of [['home','one_match'],['ebook','ebook']]){
   const uid=await user();assert.equal((await reward('create',uid)).reason,'reward_unavailable');await exhaust(uid,null);
   assert.equal((await status()).available_total,0);assert.equal((await status()).rewarded_available,false);assert.equal((await status()).first_match_pending,true);
   if(history==='home')await shown(uid);else await db.query("insert into match_private.reading_portfolios(user_id,state) values($1,'{\"seen\":[\"catalogue:valid\"]}')",[uid]);
   assert.equal((await status()).rewarded_available,true);assert.equal((await status()).first_match_pending,false);await prepare(uid,surface);
  }
  const uid=await user();await shown(uid);assert.equal((await status()).first_match_pending,false);assert.equal((await status()).rewarded_available,false);
  const other=await user();await exhaust(other,null);assert.equal((await status()).first_match_pending,true);
 });
 test('raw metadata, other owners, reservations, malformed history, unknown quota and ad-free do not admit rewards',async()=>{
  await rollout(true);const owner=await user();await shown(owner);
  const uid=await user({}, {raw_user_meta_data:{match_history:[{title:'Forged',action:'shown'}],is_vip:false,match_ebook_seen:['book:fake']}});await exhaust(uid,null);
  assert.equal((await status()).rewarded_available,false);
  await db.query("insert into match_private.title_exclusions values($1,'reserved','{\"title\":\"Not shown\",\"action\":\"reserved\"}')",[uid]);
  for(const state of [{seen:'book:fake'},{seen:[null,{},[],42,'','bad id']},{reserved:['book:reserved'],saved:['book:saved']}]){
   await db.query('insert into match_private.reading_portfolios(user_id,state) values($1,$2) on conflict(user_id) do update set state=excluded.state',[uid,state]);assert.equal((await status()).first_match_pending,true);
  }
  await shown(uid);assert.equal((await status()).rewarded_available,true);
  for(const [column,value] of [['purchased_matches',null],['purchased_matches',-1],['daily_match_count',null],['daily_match_count',-1],['daily_match_date',null],['daily_match_date','2099-01-01']]){
   await db.exec('begin');try{await db.query(`update profiles set ${column}=$2 where id=$1`,[uid,value]);assert.equal((await status()).rewarded_available,false);assert.equal((await status()).enabled,false);}finally{await db.exec('rollback');}
  }
  for(const field of ['is_vip','is_business','is_ad_free','ad_free_purchased']){
   await db.exec('begin');try{await db.query(`update profiles set ${field}=true,daily_match_count=50 where id=$1`,[uid]);assert.equal((await status()).ad_free,true);assert.equal((await status()).rewarded_available,false);assert.equal((await reward('create',uid)).reason,'reward_unavailable');}finally{await db.exec('rollback');}
  }
  for(const change of ["is_anonymous=true","email_confirmed_at=null,phone_confirmed_at=null"]){await db.exec('begin');try{await db.query('update auth.users set '+change+' where id=$1',[uid]);assert.equal((await status()).enabled,false);}finally{await db.exec('rollback');}}
 });
 test('server-observed Home proof is monotonic across saves, removal, rollout changes and daily quota resets',async()=>{
  const uid=await user({credits:17,kids_credits:5,purchased_matches:0});await shown(uid);
  const original=await scalar('select * from profiles where id=$1',[uid]);
  let w=await status();assert.equal(w.enabled,false);assert.equal(w.first_match_pending,false);assert.equal(w.rewarded_available,false);
  const proof=await scalar('select * from matchapp_private.legacy_reward_first_values where user_id=$1',[uid]);assert.equal(proof.surface,'one_match');assert.ok(proof.observed_at);
  assert.deepEqual(await scalar('select * from profiles where id=$1',[uid]),original);
  for(const action of ['save','seen','dislike','lifetime']){
   await db.query("update match_private.title_exclusions set item=jsonb_build_object('title','Real result','action',$2::text) where user_id=$1",[uid,action]);
   assert.equal((await status()).first_match_pending,false);
  }
  await db.query('delete from match_private.title_exclusions where user_id=$1',[uid]);await rollout(true);await exhaust(uid,null);
  w=await status();assert.equal(w.first_match_pending,false);assert.equal(w.rewarded_available,true);
  await db.query("update profiles set daily_match_date=current_date-1 where id=$1",[uid]);
  w=await status();assert.equal(w.first_match_pending,false);assert.equal(w.daily_remaining,3);assert.equal(w.rewarded_available,false);
  await rollout(false);await grant(uid);await grant(uid,null);assert.equal((await status()).first_match_pending,false);
  assert.deepEqual(await scalar('select * from matchapp_private.legacy_reward_first_values where user_id=$1',[uid]),proof);
  assert.equal((await scalar('select count(*)::int n from matchapp_private.legacy_reward_first_values where user_id=$1',[uid])).n,1);
 });
 test('ebook proof survives reading removal while unobserved manual saves and other accounts remain fail closed',async()=>{
  await rollout(true);const uid=await user();await db.query("insert into match_private.reading_portfolios(user_id,state) values($1,'{\"seen\":[\"catalogue:real-result\"]}')",[uid]);
  assert.equal((await status()).first_match_pending,false);assert.equal((await scalar('select surface from matchapp_private.legacy_reward_first_values where user_id=$1',[uid])).surface,'ebook');
  await db.query('delete from match_private.reading_portfolios where user_id=$1',[uid]);await exhaust(uid,null);assert.equal((await status()).rewarded_available,true);
  const manual=await user();await exhaust(manual,null);
  for(const action of ['save','seen','dislike','lifetime']){
   await db.query("insert into match_private.title_exclusions(user_id,title_key,item) values($1,$2,jsonb_build_object('title','Unshown manual item','action',$2::text))",[manual,action]);
   assert.equal((await status()).first_match_pending,true);assert.equal((await status()).rewarded_available,false);
  }
  assert.equal((await scalar('select count(*)::int n from matchapp_private.legacy_reward_first_values where user_id=$1',[manual])).n,0);
  const unobserved=await user();await exhaust(unobserved,null);await shown(unobserved);
  await db.query("update match_private.title_exclusions set item=item||'{\"action\":\"save\"}'::jsonb where user_id=$1",[unobserved]);
  assert.equal((await status()).first_match_pending,true);assert.equal((await status()).rewarded_available,false);
  const other=await user();assert.equal((await status()).first_match_pending,true);
  assert.equal((await scalar('select count(*)::int n from matchapp_private.legacy_reward_first_values where user_id in($1,$2)',[unobserved,other])).n,0);
 });
 test('claim eligibility can capture existing owned history once without client-supplied proof',async()=>{
  await rollout(true);const uid=await user();await exhaust(uid,null);await shown(uid);
  const nonce=hash();assert.equal((await reward('create',uid,nonce)).ok,true);
  await db.query('delete from match_private.title_exclusions where user_id=$1',[uid]);
  assert.equal((await reward('native_validate',uid,nonce)).ok,true);assert.equal((await status()).first_match_pending,false);
  assert.equal((await scalar('select count(*)::int n from matchapp_private.legacy_reward_first_values where user_id=$1',[uid])).n,1);
 });
 test('missing rollout/master configuration fails closed; existing master QA or Pro cannot combine with legacy mode',async()=>{
  const uid=await user();await rollout(true);await exhaust(uid);
  for(const table of ['legacy_reward_config','monetization_config']){await db.exec('begin');try{await db.exec('delete from matchapp_private.'+table);assert.equal((await status()).enabled,false);assert.equal((await status()).rewarded_available,false);}finally{await db.exec('rollback');}}
  await config(true,true);assert.equal((await status()).enabled,false);await config();await rpc('set_matchapp_qa_cohort',[uid,new Date(Date.now()+10000).toISOString()]);assert.equal((await status()).enabled,false);
  await rpc('set_matchapp_qa_cohort',[uid,null]);const now=new Date(Date.now()-1000).toISOString(),token=hash();await rpc('upsert_pro_entitlement',[uid,'play',token,'matchapp_pro','active',true,new Date(Date.now()+86400000).toISOString(),now,now,null,false,true,token,null]);
  const w=await status();assert.equal(w.pro_active,true);assert.equal(w.ad_free,true);assert.equal(w.enabled,false);assert.equal(w.rewarded_available,false);
 });
 test('server selects immutable targets, binds ownership/surface and recovers prepared claims without re-preparing',async()=>{
  await rollout(true);const uid=await user();await exhaust(uid);const claim=await prepare(uid,'ebook');
  assert.equal((await reward('create',uid,hash(),claim.request,'ebook')).claimNonce,claim.nonce);
  assert.equal((await reward('create',uid,hash(),claim.request,'one_match')).reason,'request_conflict');
  const other=await user();await exhaust(other);assert.equal((await reward('create',other,hash(),claim.request,'ebook')).reason,'request_conflict');
  assert.equal((await reward('status',other,claim.nonce)).reason,'claim_not_found');assert.equal((await reward('native_validate',other,claim.nonce)).reason,'claim_not_found');
  await assert.rejects(db.query("update matchapp_private.reward_claims set credit_target='match_tokens' where claim_nonce=$1",[claim.nonce]),/immutable/);
  await rollout(false);const recovered=await reward('create',uid,hash(),randomUUID(),'ebook');assert.equal(recovered.claimNonce,claim.nonce);assert.equal(recovered.creditTarget,'extra_matches');assert.equal(recovered.claimStatus,'prepared');assert.equal(recovered.wallet.enabled,false);
  assert.equal((await reward('native_validate',uid,claim.nonce)).reason,'claim_already_prepared');
  const unprepared=await user();await rollout(true);await exhaust(unprepared);const nonce=hash();await reward('create',unprepared,nonce);await rollout(false);assert.equal((await reward('native_validate',unprepared,nonce)).reason,'reward_unavailable');assert.equal((await credit(unprepared,nonce)).reason,'claim_not_prepared');
 });
 test('SSV credits exactly three legacy Extra Matches through one ledger entry, then unchanged consume_match spends them',async()=>{
  await rollout(true);const uid=await user({credits:23,kids_credits:7,kids_purchased_matches:9});await exhaust(uid);const c=await prepare(uid);
  const result=await credit(uid,c.nonce,c.transaction,c.at);assert.equal(result.credited,true);assert.equal(result.duplicate,false);assert.equal(result.creditTarget,'extra_matches');assert.equal(result.wallet.purchased_matches,3);assert.equal(result.wallet.bonus_tokens,0);assert.equal(result.wallet.available_total,3);assert.equal(result.wallet.rewarded_available,false);
  assert.deepEqual((await db.query("select delta,balance,pack from public.match_pack_ledger where user_id=$1",[uid])).rows,[{delta:3,balance:3,pack:'rewarded_ad_ssv'}]);
  assert.equal((await scalar('select count(*)::int n from matchapp_private.token_accounts where user_id=$1',[uid])).n,0);
  await auth(uid);for(let i=0;i<3;i++)assert.equal((await rpc('consume_match')).paid_with_match_pack,true);assert.equal((await rpc('consume_match')).allowed,false);assert.equal((await status()).rewarded_available,true);
  assert.deepEqual(await scalar('select daily_match_count,credits,kids_credits,kids_purchased_matches from profiles where id=$1',[uid]),{daily_match_count:3,credits:23,kids_credits:7,kids_purchased_matches:9});
 });
 test('the actual raw-signature SSV dispatcher binds an Extra Matches claim and rejects tampering before any database call',async()=>{
  const ssv=await import('../supabase/functions/_shared/reward-ssv.mjs');await rollout(true);const uid=await user();await exhaust(uid);const c=await prepare(uid);
  const now=Date.now(),pair=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),keyId=123;
  const keys=ssv.createGoogleKeyCache({now:()=>now,fetcher:async()=>Response.json({keys:[{keyId,base64:pair.publicKey.export({format:'der',type:'spki'}).toString('base64')}]})});
  const values={ad_network:'5450213213286189855',ad_unit:'2802190985',custom_data:c.nonce,reward_amount:'3',reward_item:'Match Tokens',timestamp:String(now),transaction_id:c.transaction,user_id:uid};
  const raw=Object.entries(values).map(([key,value])=>key+'='+encodeURIComponent(value)).join('&');
  const address='https://fixture.supabase.co/functions/v1/reward-ssv?'+raw+'&signature='+sign('sha256',Buffer.from(raw),{key:pair.privateKey,dsaEncoding:'der'}).toString('base64url')+'&key_id='+keyId;
  let calls=0;const fulfill=async r=>{calls++;return rpc('credit_match_reward',[r.claimNonce,r.userId,r.transactionId,r.adUnitId,r.rewardAmount,r.rewardItem,r.eventAt]);};
  await assert.rejects(ssv.dispatchRewardCallback(address.replace('reward_amount=3','reward_amount=30'),{keyCache:keys,now},fulfill),/invalid_signature/);assert.equal(calls,0);
  assert.throws(()=>ssv.rewardRequest({action:'create',requestId:c.request,surface:'one_match',creditTarget:'extra_matches'}),ssv.RewardVerificationError);
  const result=await ssv.dispatchRewardCallback(address,{keyCache:keys,now},fulfill);assert.equal(result.credited,true);assert.equal(result.creditTarget,'extra_matches');assert.equal(result.wallet.purchased_matches,3);assert.equal(calls,1);
  assert.equal((await ssv.dispatchRewardCallback(address,{keyCache:keys,now},fulfill)).duplicate,true);assert.equal(calls,2);
  assert.equal((await scalar("select count(*)::int n from public.match_pack_ledger where user_id=$1 and pack='rewarded_ad_ssv'",[uid])).n,1);
 });
 test('concurrent callback submissions, claim replays, conflicts and transaction reuse cannot double grant',async()=>{
  await rollout(true);const uid=await user();await exhaust(uid);const c=await prepare(uid);
  const results=await Promise.all(Array.from({length:10},()=>credit(uid,c.nonce,c.transaction,c.at)));assert.equal(results.filter(r=>r.duplicate===false).length,1);assert.equal(results.filter(r=>r.duplicate===true).length,9);
  assert.equal((await credit(uid,c.nonce,hash(),c.at)).reason,'claim_already_credited');assert.equal((await credit(uid,c.nonce,c.transaction,new Date(Date.parse(c.at)-1).toISOString())).reason,'transaction_conflict');
  const other=await user();await exhaust(other);const next=await prepare(other);assert.equal((await credit(other,next.nonce,c.transaction,next.at)).reason,'transaction_conflict');
  assert.equal((await scalar('select purchased_matches from profiles where id=$1',[uid])).purchased_matches,3);
  assert.equal((await scalar('select count(*)::int n from matchapp_private.reward_transactions where claim_nonce=$1',[c.nonce])).n,1);
  assert.equal((await scalar("select count(*)::int n from public.match_pack_ledger where user_id=$1 and pack='rewarded_ad_ssv'",[uid])).n,1);
 });
 test('invalid reward, ownership, unit, amount, item, preparation and timestamp never grant credits',async()=>{
  await rollout(true);const uid=await user();await exhaust(uid);const c=await prepare(uid);const other=await user();
  assert.equal((await credit(other,c.nonce)).reason,'claim_not_found');assert.equal((await credit(uid,hash())).reason,'claim_not_found');
  for(const changes of [{unit:unit+'0'},{amount:4},{item:'Extra Matches'}])assert.equal((await credit(uid,c.nonce,hash(),c.at,changes)).reason,'invalid_reward');
  for(const at of [new Date(Date.now()+120000).toISOString(),new Date(Date.now()-120000).toISOString(),new Date(Date.now()-25*3600000).toISOString()])assert.equal((await credit(uid,c.nonce,hash(),at)).reason,'reward_outside_session');
  assert.equal((await scalar('select purchased_matches from profiles where id=$1',[uid])).purchased_matches,0);
  assert.equal((await scalar('select count(*)::int n from public.match_pack_ledger where user_id=$1',[uid])).n,0);
 });
 test('prepared promises survive rollout pause, QA expiry, cancellation and a later ad-free purchase',async()=>{
  for(const mode of ['pause','qa_expiry','cancel','ad_free']){
   const uid=await user();await rollout(mode!=='qa_expiry');if(mode==='qa_expiry')await grant(uid);await exhaust(uid);const c=await prepare(uid);
   if(mode==='pause')await rollout(false);
   if(mode==='qa_expiry')await db.query("update matchapp_private.legacy_reward_qa_cohort set granted_at=now()-interval '2 hours',expires_at=now()-interval '1 hour' where user_id=$1",[uid]);
   if(mode==='cancel')assert.equal((await reward('cancel',uid,c.nonce)).claimStatus,'cancelled');
   if(mode==='ad_free')await db.query('update profiles set is_ad_free=true where id=$1',[uid]);
   const result=await credit(uid,c.nonce,c.transaction,c.at);assert.equal(result.credited,true);assert.equal(result.wallet.purchased_matches,3);assert.equal(result.wallet.rewarded_available,false);
   if(mode==='pause'||mode==='qa_expiry')assert.equal(result.wallet.enabled,false);
   const recovered=await reward('status',uid,c.nonce);assert.equal(recovered.credited,true);assert.equal(recovered.claimStatus,'credited');assert.equal(recovered.creditTarget,'extra_matches');
  }
 });
 test('pre-migration prepared and credited token claims keep their original destination with legacy rollout on',async()=>{
  await rollout(true);
  for(const c of [oldPrepared,oldCredited]){
   const result=await credit(c.uid,c.nonce,c.transaction,c.at);assert.equal(result.credited,true);assert.equal(result.duplicate,c===oldCredited);assert.equal(result.creditTarget,'match_tokens');assert.equal(result.wallet.bonus_tokens,3);
   assert.equal((await scalar('select purchased_matches from profiles where id=$1',[c.uid])).purchased_matches,0);assert.equal((await scalar('select count(*)::int n from public.match_pack_ledger where user_id=$1',[c.uid])).n,0);
   const recovered=await reward('create',c.uid,hash(),c.request);assert.equal(recovered.creditTarget,'match_tokens');assert.equal(recovered.claimStatus,'credited');
  }
 });
 test('new full-model claims keep the existing token destination only when the original model is explicitly enabled',async()=>{
  await rollout(true);await config(true,true);const uid=await user({credits:14,kids_credits:4});
  for(let i=0;i<3;i++)assert.equal((await rpc('consume_match_token',[randomUUID(),i===0?'ebook':'one_match'])).allowed,true);
  assert.equal((await status()).enabled,false);const nonce=hash(),request=randomUUID();const claim=await reward('create',uid,nonce,request);
  assert.equal(claim.creditTarget,'match_tokens');assert.equal(claim.claimStatus,'created');assert.equal(claim.wallet.policy_version,'match-tokens-v1');
  assert.equal((await reward('native_validate',uid,nonce)).ok,true);await config();
  const result=await credit(uid,nonce);assert.equal(result.creditTarget,'match_tokens');assert.equal(result.wallet.bonus_tokens,3);assert.equal(result.wallet.enabled,false);
  assert.equal((await scalar('select purchased_matches from profiles where id=$1',[uid])).purchased_matches,0);
  assert.equal((await scalar('select count(*)::int n from public.match_pack_ledger where user_id=$1',[uid])).n,0);
 });
 test('reward rate cap, expirations, daily reset and original promotions remain effective',async()=>{
  await rollout(true);const uid=await user();await exhaust(uid);await db.query("insert into matchapp_private.reward_session_limits values($1,date_trunc('minute',now()),60)",[uid]);assert.equal((await reward('create',uid)).reason,'rate_limited');
  await db.query('delete from matchapp_private.reward_session_limits where user_id=$1',[uid]);const nonce=hash();await reward('create',uid,nonce);
  await db.query("update matchapp_private.reward_claims set expires_at=now()-interval '1 second' where claim_nonce=$1",[nonce]);assert.equal((await reward('native_validate',uid,nonce)).reason,'claim_expired');assert.equal((await reward('status',uid,nonce)).claimStatus,'expired');
  await db.query("update profiles set daily_match_date=current_date-1 where id=$1",[uid]);assert.equal((await status()).daily_remaining,3);assert.equal((await status()).rewarded_available,false);
  const fresh=await user();await grant(fresh);assert.equal((await rpc('claim_registration_welcome_bonus')).granted,true);assert.equal((await status()).purchased_matches,10);assert.equal((await rpc('claim_registration_welcome_bonus')).reason,'already_claimed');assert.equal((await rpc('daily_match_checkin')).awarded,1);assert.equal((await status()).purchased_matches,11);
 });
 test('a ledger insertion failure rolls back the grant, transaction and claim atomically',async()=>{
  await rollout(true);const uid=await user();await exhaust(uid);const c=await prepare(uid);
  await db.exec("create function public.reject_reward_ledger() returns trigger language plpgsql as $$begin if new.pack='rewarded_ad_ssv' then raise exception 'test ledger failure';end if;return new;end;$$;create trigger reject_reward_ledger before insert on public.match_pack_ledger for each row execute function public.reject_reward_ledger();");
  try{await assert.rejects(credit(uid,c.nonce,c.transaction,c.at),/test ledger failure/);assert.equal((await scalar('select purchased_matches from profiles where id=$1',[uid])).purchased_matches,0);assert.equal((await scalar('select count(*)::int n from matchapp_private.reward_transactions where claim_nonce=$1',[c.nonce])).n,0);assert.equal((await reward('status',uid,c.nonce)).claimStatus,'prepared');}
  finally{await db.exec('drop trigger reject_reward_ledger on public.match_pack_ledger;drop function public.reject_reward_ledger()');}
  await db.exec("create function public.reject_reward_transaction() returns trigger language plpgsql as $$begin raise exception 'test transaction failure';end;$$;create trigger reject_reward_transaction before insert on matchapp_private.reward_transactions for each row execute function public.reject_reward_transaction();");
  try{await assert.rejects(credit(uid,c.nonce,c.transaction,c.at),/test transaction failure/);assert.equal((await scalar('select purchased_matches from profiles where id=$1',[uid])).purchased_matches,0);assert.equal((await scalar('select count(*)::int n from public.match_pack_ledger where user_id=$1',[uid])).n,0);assert.equal((await scalar('select count(*)::int n from matchapp_private.reward_transactions where claim_nonce=$1',[c.nonce])).n,0);assert.equal((await reward('status',uid,c.nonce)).claimStatus,'prepared');}
  finally{await db.exec('drop trigger reject_reward_transaction on matchapp_private.reward_transactions;drop function public.reject_reward_transaction()');}
  assert.equal((await credit(uid,c.nonce,c.transaction,c.at)).credited,true);
 });
});
