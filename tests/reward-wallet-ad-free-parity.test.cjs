'use strict';
const {test,describe,before,after,beforeEach}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {randomUUID,randomBytes}=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite');
const root=path.join(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
const MIGRATION='supabase/migrations/20261017152624_reward_wallet_ad_free_parity.sql';
const BEFORE="'rewarded_available',(v_policy->>'enabled')::boolean and (v_policy->>'rewards_enabled')::boolean and not v_unlimited and not v_first and v_daily+v_bonus+v_purchased=0";
const AFTER="'rewarded_available',(v_policy->>'enabled')::boolean and (v_policy->>'rewards_enabled')::boolean and (v_pro->>'adFree')::boolean is false and not v_unlimited and not v_first and v_daily+v_bonus+v_purchased=0";
const unit='ca-app-pub-9541435081010948/2802190985';

describe('reward wallet parity with existing native ad-free eligibility',()=>{
 let db,definitions,updatedDefinitions,history,beforeState,afterState;
 const hash=()=>randomBytes(32).toString('hex');
 const rpc=async(name,args=[]) => (await db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) value`,args)).rows[0].value;
 const scalar=async(sql,args=[]) => (await db.query(sql,args)).rows[0];
 const auth=uid=>db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid||'']);
 const config=(enabled=false,rewards=false)=>rpc('set_matchapp_monetization_config',[enabled,rewards,[],['matchapp_pro']]);
 const grant=(uid,expires=new Date(Date.now()+3600000).toISOString())=>rpc('set_matchapp_qa_cohort',[uid,expires]);
 const use=(surface='one_match')=>rpc('consume_match_token',[randomUUID(),surface]);
 const wallet=()=>rpc('match_token_status');
 const reward=(action,uid,nonce=hash())=>rpc('reward_session_service',[action,uid,randomUUID(),nonce,'one_match']);
 const functionRows=async()=> (await db.query("select p.oid::regprocedure::text signature,p.proacl,pg_get_functiondef(p.oid) definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','auth','match_private','matchapp_private') and p.prokind='f' order by signature")).rows;
 const walletDefinition=async()=> (await scalar("select pg_get_functiondef('matchapp_private.token_wallet(uuid)'::regprocedure) definition")).definition;
 async function user(fields={}){
  const uid=randomUUID();await db.query('insert into auth.users(id) values($1)',[uid]);await db.query('insert into public.profiles(id) values($1)',[uid]);
  for(const [key,value] of Object.entries(fields)){
   assert.ok(['is_vip','is_business','is_ad_free','ad_free_purchased','purchased_matches','credits','daily_match_count','kids_purchased_matches','kids_credits'].includes(key));
   await db.query(`update public.profiles set ${key}=$2 where id=$1`,[uid,value]);
  }
  await auth(uid);return uid;
 }
 async function state(){
  const tables=['public.profiles','public.match_pack_ledger','public.credit_ledger','matchapp_private.monetization_config','matchapp_private.monetization_qa_cohort','matchapp_private.token_accounts','matchapp_private.token_uses','matchapp_private.reward_claims','matchapp_private.reward_transactions','matchapp_private.pro_entitlements'];
  const result={};for(const table of tables)result[table]=(await scalar(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) value from ${table} t`)).value;
  return result;
 }
 async function activate(uid,mode){await config(mode==='global',mode==='global');if(mode==='qa')await grant(uid);}
 async function exhaustFree(uid){await auth(uid);for(let i=0;i<3;i++)assert.equal((await use(i===0?'ebook':'one_match')).allowed,true);assert.equal((await wallet()).available_total,0);}
 async function pro(uid,status){
  const token=hash(),at=new Date(Date.now()-1000).toISOString();
  const result=await rpc('upsert_pro_entitlement',[uid,'play',token,'matchapp_pro',status,true,new Date(Date.now()+86400000).toISOString(),at,at,null,status==='canceled',status==='active',token,null]);
  assert.equal(result.applied,true);assert.equal(result.active,true);
 }

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
  for(const file of ['20261017120448_match_tokens_pro_verified_rewards.sql','20261017134408_match_tokens_first_core_value.sql','20261017134958_play_pro_offer_once.sql','20261017142620_monetization_qa_cohort.sql'])await db.exec(read('supabase/migrations/'+file));
  await config();
  history=await user({credits:17,kids_credits:7,kids_purchased_matches:4});
  const welcome=await rpc('claim_registration_welcome_bonus');assert.equal(welcome.granted,true);assert.equal(welcome.purchased_matches,10);assert.equal(welcome.credits,27);
  await grant(history);assert.equal((await use('ebook')).daily_remaining,2);
  definitions=await functionRows();beforeState=await state();
  await db.exec(read(MIGRATION));updatedDefinitions=await functionRows();afterState=await state();
 });
 after(async()=>{if(db)await db.close();});
 beforeEach(async()=>{await db.exec('reset role');await config();await auth(null);});

 test('only the exact wallet predicate changes; all other function bytes, ACLs and stored data remain identical',()=>{
  assert.equal(updatedDefinitions.length,definitions.length);
  const bySignature=new Map(updatedDefinitions.map(row=>[row.signature,row]));
  for(const row of definitions){
   const fresh=bySignature.get(row.signature);assert.ok(fresh,row.signature);assert.deepEqual(fresh.proacl,row.proacl,row.signature);
   if(row.signature==='matchapp_private.token_wallet(uuid)'){
    assert.equal(row.definition.split(BEFORE).length,2);assert.equal(fresh.definition.split(AFTER).length,2);
    assert.equal(fresh.definition.replace(AFTER,BEFORE),row.definition);
   }else assert.equal(fresh.definition,row.definition,row.signature);
  }
  assert.deepEqual(afterState,beforeState);
 });
 test('a free account can prepare a reward only after three real core uses under either global or account-scoped policy',async()=>{
  for(const mode of ['global','qa']){
   const uid=await user({credits:19});await activate(uid,mode);
   assert.equal((await wallet()).rewarded_available,false);assert.equal((await wallet()).first_match_pending,true);
   await db.exec('set role authenticated');
   for(let i=0;i<3;i++){
    const result=await use(i===0?'ebook':'one_match');assert.equal(result.allowed,true);assert.equal(result.daily_remaining,2-i);assert.equal(result.rewarded_available,i===2);assert.equal(result.first_match_pending,false);
   }
   await db.exec('reset role');const result=await wallet();
   assert.equal(result.available_total,0);assert.equal(result.ad_free,false);assert.equal(result.unlimited,false);assert.equal(result.credits,19);
   const nonce=hash();await db.exec('set role service_role');assert.equal((await reward('create',uid,nonce)).ok,true);assert.equal((await reward('native_validate',uid,nonce)).ok,true);await db.exec('reset role');
  }
 });
 test('legacy VIP, Business, ad-free and purchased ad-free accounts never advertise rewards at zero balance',async()=>{
  for(const mode of ['global','qa'])for(const [field,limit] of [['is_vip',10],['is_business',50],['is_ad_free',3],['ad_free_purchased',3]]){
   const uid=await user({[field]:true,daily_match_count:limit>3?limit-1:0,credits:23});await activate(uid,mode);
   const count=limit>3?1:3;let result;
   for(let i=0;i<count;i++){result=await use();assert.equal(result.allowed,true);assert.equal(result.source,limit>3?'legacy_daily':'daily');}
   assert.equal(result.daily_limit,limit);assert.equal(result.daily_remaining,0);assert.equal(result.available_total,0);assert.equal(result.first_match_pending,false);
   assert.equal(result.ad_free,true);assert.equal(result.unlimited,false);assert.equal(result.rewarded_available,false);assert.equal(result.credits,23);
   assert.equal((await reward('create',uid)).reason,'reward_unavailable');
   assert.equal((await scalar('select free_used from matchapp_private.token_accounts where user_id=$1',[uid])).free_used,limit>3?0:3);
   assert.equal((await scalar('select daily_match_count from public.profiles where id=$1',[uid])).daily_match_count,limit>3?limit:0);
  }
 });
 test('a newly ad-free account cannot prepare an earlier unshown claim',async()=>{
  const uid=await user();await grant(uid);await exhaustFree(uid);const nonce=hash();assert.equal((await reward('create',uid,nonce)).ok,true);
  await db.query('update public.profiles set is_ad_free=true where id=$1',[uid]);
  assert.equal((await wallet()).rewarded_available,false);assert.equal((await reward('native_validate',uid,nonce)).reason,'reward_unavailable');
  assert.equal((await scalar('select status from matchapp_private.reward_claims where claim_nonce=$1',[nonce])).status,'created');
  assert.equal((await wallet()).bonus_tokens,0);
 });
 test('verified paid active and canceled future Pro remain unlimited and ad-free without changing their other balances',async()=>{
  for(const status of ['active','canceled']){
   const uid=await user({credits:31,kids_credits:6});await grant(uid);await exhaustFree(uid);await pro(uid,status);
   const result=await wallet();assert.equal(result.unlimited,true);assert.equal(result.pro_active,true);assert.equal(result.ad_free,true);assert.equal(result.available_total,null);assert.equal(result.rewarded_available,false);
   assert.equal((await use('ebook')).source,'pro');assert.equal((await reward('create',uid)).reason,'reward_unavailable');
   assert.deepEqual(await scalar('select purchased_matches,credits,kids_credits from public.profiles where id=$1',[uid]),{purchased_matches:0,credits:31,kids_credits:6});
   assert.equal((await wallet()).daily_remaining,0);
  }
 });
 test('an existing real welcome grant survives the migration and normal QA spending before a reward becomes available',async()=>{
  await auth(history);const initial=await wallet();
  assert.equal(initial.purchased_matches,10);assert.equal(initial.credits,27);assert.equal(initial.daily_remaining,2);assert.equal(initial.rewarded_available,false);
  assert.equal((await rpc('claim_registration_welcome_bonus')).reason,'monetization_policy_changed');
  for(let n=0;n<12;n++){const result=await use();assert.equal(result.allowed,true);assert.equal(result.source,n<2?'daily':'purchased');assert.equal(result.rewarded_available,n===11);}
  const result=await wallet();assert.equal(result.available_total,0);assert.equal(result.rewarded_available,true);assert.equal(result.credits,27);assert.equal((await use()).reason,'limit_reached');
  assert.deepEqual(await scalar('select purchased_matches,credits,kids_credits,kids_purchased_matches from public.profiles where id=$1',[history]),{purchased_matches:0,credits:27,kids_credits:7,kids_purchased_matches:4});
  assert.equal((await scalar("select count(*)::int count from public.credit_ledger where user_id=$1 and reason='registration_welcome_bonus_2026'",[history])).count,1);
  assert.equal((await scalar("select count(*)::int count from public.match_pack_ledger where user_id=$1 and pack='registration_welcome_bonus_2026'",[history])).count,1);
  assert.equal((await scalar('select count(*)::int count from matchapp_private.token_uses where user_id=$1',[history])).count,13);
 });
 test('ordinary verified registration still receives its original one-time grant while public rollout is off',async()=>{
  await user();const first=await rpc('claim_registration_welcome_bonus');assert.equal(first.granted,true);assert.equal(first.purchased_matches,10);assert.equal(first.credits,10);
  assert.equal((await rpc('claim_registration_welcome_bonus')).reason,'already_claimed');
  const result=await wallet();assert.equal(result.enabled,false);assert.equal(result.available_total,13);assert.equal(result.rewarded_available,false);assert.equal(result.credits,10);
 });
 test('an already prepared signed reward still fulfills once after ad-free access and cohort revocation',async()=>{
  const uid=await user({credits:29});await grant(uid);await exhaustFree(uid);const nonce=hash();
  assert.equal((await reward('create',uid,nonce)).ok,true);assert.equal((await reward('native_validate',uid,nonce)).ok,true);
  await db.query('update public.profiles set is_ad_free=true where id=$1',[uid]);await grant(uid,null);
  const args=[nonce,uid,hash(),unit,3,'Match Tokens',new Date().toISOString()];
  const first=await rpc('credit_match_reward',args);assert.equal(first.credited,true);assert.equal(first.wallet.bonus_tokens,3);assert.equal(first.wallet.rewarded_available,false);
  const retry=await rpc('credit_match_reward',args);assert.equal(retry.duplicate,true);assert.equal(retry.wallet.bonus_tokens,3);
  assert.deepEqual(await scalar('select is_ad_free,purchased_matches,credits from public.profiles where id=$1',[uid]),{is_ad_free:true,purchased_matches:0,credits:29});
 });
 test('a missing or duplicated expected predicate aborts rather than overwriting a changed wallet',async()=>{
  const installed=await walletDefinition();
  try{
   await assert.rejects(db.exec(read(MIGRATION)),/Unexpected reward wallet baseline: .* \(0 matches\)/);await db.exec('rollback');
   assert.equal(await walletDefinition(),installed);
   const original=definitions.find(row=>row.signature==='matchapp_private.token_wallet(uuid)').definition;
   const duplicate=original.replace('\nbegin\n','\nbegin\n -- '+BEFORE+'\n');assert.equal(duplicate.split(BEFORE).length,3);
   await db.exec(duplicate);const changed=await walletDefinition();
   await assert.rejects(db.exec(read(MIGRATION)),/Unexpected reward wallet baseline: .* \(2 matches\)/);await db.exec('rollback');
   assert.equal(await walletDefinition(),changed);
  }finally{await db.exec('rollback');await db.exec(installed);}
 });
});
