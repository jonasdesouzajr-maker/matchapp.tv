'use strict';
const {test,describe,before,after,beforeEach}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {randomUUID,randomBytes}=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite');
const root=path.join(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
const QA='supabase/migrations/20261017142620_monetization_qa_cohort.sql';
const product='prod_VSP0LagMpQQHIj',playProduct='matchapp_pro';
const unit='ca-app-pub-9541435081010948/2802190985';
describe('private expiring monetization QA cohort',()=>{
 let db,definitions,history;
 const hash=()=>randomBytes(32).toString('hex');
 const rpc=async(name,args=[]) => (await db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) value`,args)).rows[0].value;
 const scalar=async(sql,args=[]) => (await db.query(sql,args)).rows[0];
 const auth=uid=>db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid||'']);
 const config=(enabled=false,rewards=false,play=[playProduct])=>rpc('set_matchapp_monetization_config',[enabled,rewards,[product],play]);
 const userConfig=uid=>rpc('get_matchapp_user_monetization_config',[uid]);
 const grant=(uid,expires=new Date(Date.now()+3600000).toISOString())=>rpc('set_matchapp_qa_cohort',[uid,expires]);
 const use=(surface='one_match',id=randomUUID())=>rpc('consume_match_token',[id,surface]);
 const reward=(action,uid,nonce,request=randomUUID())=>rpc('reward_session_service',[action,uid,request,nonce,'one_match']);
 const credit=(uid,nonce,transaction=hash(),at=new Date().toISOString())=>rpc('credit_match_reward',[nonce,uid,transaction,unit,3,'Match Tokens',at]);
 const expire=uid=>db.query("update matchapp_private.monetization_qa_cohort set granted_at=now()-interval '2 hours',expires_at=now()-interval '1 hour' where user_id=$1",[uid]);
 async function user(fields={},authFields={}){
  const uid=randomUUID();await db.query('insert into auth.users(id) values($1)',[uid]);await db.query('insert into public.profiles(id) values($1)',[uid]);
  for(const [key,value] of Object.entries(fields)){
   assert.ok(['is_vip','is_business','purchased_matches','credits','daily_match_count','kids_purchased_matches','kids_credits','kids_daily_action_count'].includes(key));
   await db.query(`update public.profiles set ${key}=$2 where id=$1`,[uid,value]);
  }
  for(const [key,value] of Object.entries(authFields)){
   assert.ok(['email_confirmed_at','phone_confirmed_at','is_anonymous'].includes(key));
   await db.query(`update auth.users set ${key}=$2 where id=$1`,[uid,value]);
  }
  await auth(uid);return uid;
 }
 async function entitlement(uid,{provider='play',token=hash(),status='active',paid=true,expires=new Date(Date.now()+86400000).toISOString()}={}){
  const at=new Date(Date.now()-1000).toISOString(),external=provider==='play'?token:'sub_'+randomUUID().replaceAll('-','');
  const result=await rpc('upsert_pro_entitlement',[uid,provider,external,provider==='play'?playProduct:product,status,paid,expires,at,at,provider==='play'?null:'cus_fixture',false,true,provider==='play'?token:null,null]);
  assert.equal(result.applied,true);return external;
 }
 async function state(uid){
  const tables=['public.profiles','public.match_pack_ledger','public.credit_ledger','matchapp_private.token_accounts','matchapp_private.token_uses','matchapp_private.reward_claims','matchapp_private.reward_transactions','matchapp_private.pro_entitlements'];
  const result={};for(const table of tables){const key=table==='public.profiles'?'id':'user_id';result[table]=(await db.query(`select * from ${table} where ${key}=$1`,[uid])).rows;}
  return result;
 }
 const functionRows=()=>db.query("select p.oid::regprocedure::text signature,p.proacl,pg_get_functiondef(p.oid) definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','auth','match_private','matchapp_private') and p.prokind='f' order by signature");
 before(async()=>{
  db=new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
   create table auth.users(id uuid primary key,created_at timestamptz default now(),email_confirmed_at timestamptz default now(),phone_confirmed_at timestamptz,is_anonymous boolean default false);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create table public.profiles(id uuid primary key,is_vip bool default false,is_business bool default false,is_ad_free bool default false,ad_free_purchased bool default false,daily_match_count int default 0,daily_match_date date default current_date,purchased_matches int default 0,credits int default 0,share_rewards timestamptz[] default '{}',kids_purchased_matches int default 0,kids_credits int default 0,kids_daily_action_count int default 0);
   create table public.match_pack_ledger(user_id uuid,delta int,balance int,pack text,created_at timestamptz default now());
   create table public.credit_ledger(user_id uuid,delta int,balance int,reason text,pack text,created_at timestamptz default now());
   create schema match_private;
   create table match_private.title_exclusions(user_id uuid,title_key text,item jsonb);
   create table match_private.member_match_result_shares(user_id uuid,title_key text,shared_at timestamptz default now(),primary key(user_id,title_key));
   create function match_private.title_key(text) returns text language sql immutable as $$select lower(trim($1))$$;
   create table public.daily_match_checkins(user_id uuid primary key references auth.users(id),streak int not null default 0,last_checkin date,total_checkins int not null default 0,completed_weeks int not null default 0,updated_at timestamptz default now());
   create function public.profile_is_complete(public.profiles) returns boolean language sql immutable as $$select true$$;
   create function public.match_daily_limit_v2(boolean,boolean,boolean) returns int language sql immutable as $$select case when $2 then 50 when $1 then 10 else 5 end$$;`);
  await db.exec(read('supabase/migrations/012_standardize_vip_daily_limit.sql'));
  await db.exec(read('supabase/migrations/20260921181338_repair_daily_checkin_reward_delta.sql').split('do $backfill$')[0]);
  await db.exec(read('supabase/security/registration-welcome-bonus.sql'));
  await db.exec(read('supabase/migrations/20260929120000_canonicalize_match_share_reward_keys.sql'));
  for(const file of ['20261017120448_match_tokens_pro_verified_rewards.sql','20261017134408_match_tokens_first_core_value.sql','20261017134958_play_pro_offer_once.sql'])await db.exec(read('supabase/migrations/'+file));
  // Existing successful/credited/paid history is created through real procedures.
  await config(true,true);const uid=await user({purchased_matches:4,credits:9,kids_credits:7,kids_purchased_matches:3});
  for(let n=0;n<7;n++)assert.equal((await use(n===0?'ebook':'one_match')).allowed,true);
  const nonce=hash();assert.equal((await reward('create',uid,nonce)).ok,true);
  assert.equal((await reward('native_validate',uid,nonce)).ok,true);assert.equal((await credit(uid,nonce)).credited,true);
  assert.equal((await rpc('daily_match_checkin')).awarded,1);await entitlement(uid);
  history={uid,before:await state(uid)};await config();definitions=(await functionRows()).rows;
  await db.exec(read(QA));
 });
 after(async()=>{if(db)await db.close();});
 beforeEach(async()=>{await db.exec('reset role');await config();await auth(null);});

 test('the migration changes only the five reviewed predicate surfaces and preserves every previous function ACL',async()=>{
  const after=(await functionRows()).rows,bySignature=new Map(after.map(row=>[row.signature,row]));
  const affected=new Map([
   ['matchapp_private.token_wallet(uuid)',[
    [";v_policy jsonb;",";"],
    ["v_policy:=matchapp_private.user_monetization_policy(p_user_id);",''],
    ["'enabled',(v_policy->>'enabled')::boolean or v_unlimited","'enabled',c.enabled or v_unlimited"],
    ["'rewarded_available',(v_policy->>'enabled')::boolean and (v_policy->>'rewards_enabled')::boolean and","'rewarded_available',c.enabled and c.rewards_enabled and"]]],
   ['consume_match_token(uuid,text)',[["not((matchapp_private.user_monetization_policy(v_uid)->>'enabled')::boolean)",'not(select enabled from matchapp_private.monetization_config where singleton)']]],
   ['claim_registration_welcome_bonus()',[["((matchapp_private.user_monetization_policy(auth.uid())->>'enabled')::boolean)",'(select enabled from matchapp_private.monetization_config where singleton)']]],
   ['claim_match_result_share(text)',[["((matchapp_private.user_monetization_policy(auth.uid())->>'enabled')::boolean)",'(select enabled from matchapp_private.monetization_config where singleton)']]],
   ['reserve_play_pro_offer(uuid,text,text,text,text,text)',[["where singleton and (matchapp_private.user_monetization_policy(p_user_id)->>'enabled')::boolean and p_product_id=any(play_product_ids)",'where singleton and enabled and p_product_id=any(play_product_ids)']]]
  ]);
  assert.ok(definitions.length>25);
  for(const row of definitions){const fresh=bySignature.get(row.signature);assert.ok(fresh,row.signature);assert.deepEqual(fresh.proacl,row.proacl,row.signature);let restored=fresh.definition;for(const [needle,replacement] of affected.get(row.signature)||[]){assert.equal(restored.split(needle).length,2,row.signature);restored=restored.replace(needle,replacement);}assert.equal(restored,row.definition,row.signature);}
  assert.deepEqual(await state(history.uid),history.before);
 });
 test('cohort table, helper, setter and per-user configuration are inaccessible to browser roles',async()=>{
  const uid=await user();
  for(const role of ['anon','authenticated']){
   await db.exec('set role '+role);await assert.rejects(grant(uid),/permission denied/);await assert.rejects(userConfig(uid),/permission denied/);
   await assert.rejects(db.query('select * from matchapp_private.monetization_qa_cohort'),/permission denied/);
   await assert.rejects(db.query('select matchapp_private.user_monetization_policy($1)',[uid]),/permission denied/);await db.exec('reset role');
  }
  const acl=await scalar("select relrowsecurity,has_table_privilege('service_role',oid,'update') service_write from pg_class where oid='matchapp_private.monetization_qa_cohort'::regclass");assert.equal(acl.relrowsecurity,true);assert.equal(acl.service_write,false);
  await db.exec('set role service_role');assert.equal((await grant(uid)).qa_active,true);assert.equal((await userConfig(uid)).qa_active,true);
 });
 test('only confirmed registered accounts can receive at most 24 hours of access, and null revokes it',async()=>{
  const uid=await user();
  for(const expires of [new Date(Date.now()-1000).toISOString(),new Date(Date.now()+25*3600000).toISOString(),'infinity'])await assert.rejects(grant(uid,expires),/within 24 hours/);
  await assert.rejects(grant(randomUUID()),/confirmed registered account/);
  for(const authFields of [{is_anonymous:true},{email_confirmed_at:null,phone_confirmed_at:null}]){const other=await user({},authFields);await assert.rejects(grant(other),/confirmed registered account/);}
  const phone=await user({},{email_confirmed_at:null,phone_confirmed_at:new Date().toISOString()});assert.equal((await grant(phone)).qa_active,true);
  const result=await grant(uid,new Date(Date.now()+24*3600000-1000).toISOString());assert.equal(result.qa_active,true);assert.ok(Date.parse(result.qa_expires_at)>Date.now());
  assert.equal((await grant(uid,null)).qa_active,false);assert.equal((await userConfig(uid)).qa_expires_at,null);
  await assert.rejects(userConfig(null),/user is required/);
 });
 test('one cohort account sees effective flags while global config, anonymous wallet, and other users remain off',async()=>{
  const uid=await user({purchased_matches:8,credits:12,kids_credits:7}),before=await state(uid),global=await rpc('get_matchapp_monetization_config');
  await grant(uid);const policy=await userConfig(uid);
  assert.equal(policy.ok,true);assert.equal(policy.enabled,true);assert.equal(policy.rewards_enabled,true);assert.equal(policy.global_enabled,false);assert.equal(policy.qa_active,true);assert.equal(policy.policy_version,'match-tokens-v1');
  assert.deepEqual(policy.stripe_product_ids,global.stripe_product_ids);assert.deepEqual(policy.play_product_ids,global.play_product_ids);
  assert.deepEqual(await rpc('get_matchapp_monetization_config'),global);assert.deepEqual(await state(uid),before);
  await auth(uid);assert.equal((await rpc('match_token_status')).enabled,true);assert.equal((await rpc('match_token_status')).unlimited,false);
  const other=await user();assert.equal((await userConfig(other)).enabled,false);assert.equal((await use()).reason,'policy_disabled');
  await auth(null);await db.exec('set role anon');assert.deepEqual(await rpc('match_token_status'),{ok:true,enabled:false,authenticated:false,policy_version:'match-tokens-v1'});
 });
 test('QA still requires three genuine successful results, exact request IDs, and an exhausted balance before rewards',async()=>{
  const uid=await user({daily_match_count:4,credits:19,kids_credits:8,kids_purchased_matches:5});await grant(uid);
  assert.equal((await reward('create',uid,hash())).reason,'reward_unavailable');
  await db.exec('set role authenticated');const first=randomUUID();let result=await use('ebook',first);assert.equal(result.daily_remaining,2);assert.equal(result.first_match_pending,false);assert.equal((await use('ebook',first)).reason,'idempotent_replay');
  for(let remaining=1;remaining>=0;remaining--){result=await use();assert.equal(result.allowed,true);assert.equal(result.daily_remaining,remaining);}
  result=await use();assert.equal(result.allowed,false);assert.equal(result.reason,'limit_reached');assert.equal(result.rewarded_available,true);assert.equal(result.unlimited,false);await db.exec('reset role');
  assert.equal((await scalar('select count(*)::int n from matchapp_private.token_uses where user_id=$1',[uid])).n,3);
  assert.deepEqual(await scalar('select daily_match_count,credits,kids_credits,kids_purchased_matches from profiles where id=$1',[uid]),{daily_match_count:4,credits:19,kids_credits:8,kids_purchased_matches:5});
  const nonce=hash();assert.equal((await reward('create',uid,nonce)).ok,true);assert.equal((await reward('native_validate',uid,nonce)).ok,true);
 });
 test('QA preserves old VIP/Business allowance, purchased balances, check-in and verified Pro behavior',async()=>{
  for(const [field,limit] of [['is_vip',10],['is_business',50]]){
   const uid=await user({[field]:true,daily_match_count:limit-1,purchased_matches:4});await grant(uid);const result=await use();assert.equal(result.source,'legacy_daily');assert.equal(result.daily_limit,limit);assert.equal(result.daily_remaining,0);assert.equal(result.unlimited,false);assert.equal(result.purchased_matches,4);assert.equal((await scalar('select free_used from matchapp_private.token_accounts where user_id=$1',[uid])).free_used,0);
   assert.equal((await rpc('daily_match_checkin')).awarded,1);assert.equal((await rpc('match_token_status')).purchased_matches,5);
  }
  const uid=await user();await entitlement(uid);await grant(uid);await grant(uid,null);assert.equal((await use('ebook')).source,'pro');assert.equal((await rpc('match_token_status')).enabled,true);assert.equal((await userConfig(uid)).qa_active,false);
 });
 test('expiry/revocation disables new quota calls without resetting result history or remaining balances',async()=>{
  const uid=await user({purchased_matches:6});await grant(uid);await use('ebook');const before=await state(uid);await expire(uid);
  assert.equal((await userConfig(uid)).qa_active,false);assert.equal((await userConfig(uid)).enabled,false);assert.equal((await use()).reason,'policy_disabled');assert.deepEqual(await state(uid),before);
  await grant(uid);let wallet=await rpc('match_token_status');assert.equal(wallet.daily_remaining,2);assert.equal(wallet.first_match_pending,false);assert.equal(wallet.purchased_matches,6);
  await grant(uid,null);wallet=await rpc('match_token_status');assert.equal(wallet.enabled,false);assert.equal(wallet.first_match_pending,false);assert.equal(wallet.daily_remaining,2);
 });
 test('an auth account becoming anonymous or losing confirmation also loses QA eligibility',async()=>{
  for(const change of ["is_anonymous=true","email_confirmed_at=null,phone_confirmed_at=null"]){const uid=await user();await grant(uid);await db.query('update auth.users set '+change+' where id=$1',[uid]);assert.equal((await userConfig(uid)).qa_active,false);assert.equal((await use()).reason,'policy_disabled');}
 });
 test('unprepared reward claims cannot show after expiry, while prepared signed fulfillment stays exact and idempotent',async()=>{
  const uid=await user();await grant(uid);for(let n=0;n<3;n++)await use();const nonce=hash();await reward('create',uid,nonce);await expire(uid);
  assert.equal((await reward('native_validate',uid,nonce)).reason,'reward_unavailable');assert.equal((await credit(uid,nonce)).reason,'claim_not_prepared');
  await grant(uid);assert.equal((await reward('native_validate',uid,nonce)).ok,true);const event=new Date().toISOString(),transaction=hash();await grant(uid,null);
  assert.equal((await credit(uid,nonce,transaction,event)).credited,true);assert.equal((await credit(uid,nonce,transaction,event)).duplicate,true);
  const wallet=await rpc('match_token_status');assert.equal(wallet.enabled,false);assert.equal(wallet.bonus_tokens,3);assert.equal(wallet.rewarded_available,false);
  assert.equal((await scalar('select count(*)::int n from matchapp_private.reward_transactions where claim_nonce=$1',[nonce])).n,1);
 });
 test('adult signup/share promotions retire only for an active QA account and resume their original path after expiry',async()=>{
  const uid=await user({purchased_matches:7,credits:12,kids_credits:5});await grant(uid);
  assert.equal((await rpc('claim_registration_welcome_bonus')).reason,'monetization_policy_changed');assert.equal((await rpc('claim_match_result_share',['first'])).reason,'monetization_policy_changed');
  assert.deepEqual(await scalar('select purchased_matches,credits,kids_credits from profiles where id=$1',[uid]),{purchased_matches:7,credits:12,kids_credits:5});
  const normal=await user();assert.equal((await rpc('claim_registration_welcome_bonus')).granted,true);
  await auth(uid);await expire(uid);assert.equal((await rpc('claim_registration_welcome_bonus')).granted,true);assert.equal((await rpc('claim_registration_welcome_bonus')).reason,'already_claimed');
  for(const name of ['first','second','third'])await db.query("insert into match_private.title_exclusions(user_id,title_key,item) values($1,$2,'{\"action\":\"shown\"}')",[uid,name]);
  assert.equal((await rpc('claim_match_result_share',['first'])).granted,false);assert.equal((await rpc('claim_match_result_share',['second'])).granted,false);assert.equal((await rpc('claim_match_result_share',['third'])).granted,true);assert.equal((await rpc('claim_match_result_share',['third'])).reason,'already_shared');
  assert.equal((await userConfig(normal)).qa_active,false);
 });
 test('QA Play reservation still needs an owned verified paid source and actual catalog; no Stripe checkout is enabled',async()=>{
  const uid=await user(),source=await entitlement(uid);assert.equal((await rpc('reserve_play_pro_offer',[uid,playProduct,'monthly','retain-50-3m',source,'retention'])).reason,'policy_disabled');
  await grant(uid);assert.equal((await rpc('reserve_play_pro_offer',[uid,playProduct,'monthly','retain-50-3m',source,'retention'])).eligible,true);
  const other=await user();await grant(other);assert.equal((await rpc('reserve_play_pro_offer',[other,playProduct,'monthly','retain-50-3m',source,'retention'])).eligible,false);
  await config(false,false,[]);assert.equal((await rpc('reserve_play_pro_offer',[uid,playProduct,'monthly','retain-50-3m',source,'retention'])).reason,'policy_disabled');
  await config();await expire(uid);assert.equal((await rpc('reserve_play_pro_offer',[uid,playProduct,'monthly','retain-50-3m',source,'retention'])).reason,'policy_disabled');
  assert.equal((await rpc('redeem_play_pro_offer',[uid,playProduct,'monthly','retain-50-3m',hash(),source,new Date().toISOString()])).redeemed,true);
  assert.equal((await rpc('reserve_pro_checkout',[other,'price_1URUC4FRuUuhrLPGx0fDzrR3','en'])).reason,'policy_disabled');
  assert.equal((await scalar('select count(*)::int n from matchapp_private.pro_checkout_intents where user_id=$1',[other])).n,0);
 });
 test('global activation still works normally and missing global configuration never grants QA spending',async()=>{
  const uid=await user();await config(true,false);let p=await userConfig(uid);assert.equal(p.global_enabled,true);assert.equal(p.enabled,true);assert.equal(p.qa_active,false);assert.equal(p.rewards_enabled,false);assert.equal((await use()).allowed,true);
  await config();await grant(uid);await db.exec('begin');try{await db.exec('delete from matchapp_private.monetization_config');p=await userConfig(uid);assert.equal(p.ok,false);assert.equal(p.enabled,false);assert.equal((await use()).reason,'policy_disabled');}finally{await db.exec('rollback');}
 });
});
