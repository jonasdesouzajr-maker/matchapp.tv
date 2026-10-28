"use strict";
const {test,describe,before,after,beforeEach}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {randomUUID,randomBytes}=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite');
const ROOT=path.join(__dirname,'..');
const MIGRATION='supabase/migrations/20261017120448_match_tokens_pro_verified_rewards.sql';
const FIRST_VALUE_MIGRATION='supabase/migrations/20261017134408_match_tokens_first_core_value.sql';
const PRODUCT='prod_VSP0LagMpQQHIj';
const PRICE='price_1URUC4FRuUuhrLPGx0fDzrR3';
const PRICE_US='price_1URUdyFRuUuhrLPGFwrc0mQU';
describe('Match Tokens server authority',()=>{
let db,baseline,promoBaseline,firstValueBackfill;
const rpc=async(name,args=[]) => (await db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) as value`,args)).rows[0].value;
const scalar=async(sql,args=[]) => (await db.query(sql,args)).rows[0];
const auth=async(uid) => db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid||'']);
const config=async(enabled=true,rewards=false,products=[PRODUCT],play=['matchapp_pro'])=>rpc('set_matchapp_monetization_config',[enabled,rewards,products,play]);
async function user(fields={}) {
 const id=randomUUID();await db.query('insert into auth.users(id) values($1)',[id]);
 await db.query('insert into public.profiles(id) values($1)',[id]);
 for(const [key,value] of Object.entries(fields)) {
  assert.ok(['is_vip','is_business','is_ad_free','ad_free_purchased','daily_match_count','purchased_matches','credits','kids_purchased_matches','kids_credits','kids_daily_action_count'].includes(key));
  await db.query(`update public.profiles set ${key}=$2 where id=$1`,[id,value]);
 }
 await auth(id);return id;
}
async function use(surface='one_match',requestId=randomUUID()) {return rpc('consume_match_token',[requestId,surface]);}
async function entitlement(uid,changes={}) {
 const at=new Date(Date.now()-1000).toISOString();
 const p={provider:'stripe',external:'sub_'+randomUUID().replaceAll('-',''),product:PRODUCT,status:'active',paid:true,expiry:new Date(Date.now()+86400000).toISOString(),verified:at,event:at,customer:'cus_fixture',cancel:false,renew:true,hash:null,replaces:null,...changes};
 return rpc('upsert_pro_entitlement',[uid,p.provider,p.external,p.product,p.status,p.paid,p.expiry,p.verified,p.event,p.customer,p.cancel,p.renew,p.hash,p.replaces]);
}
before(async()=>{
 db=new PGlite();
 // Keep fixture dates and legacy check-ins on the wallet's UTC day, independent of the host timezone.
 await db.exec("set time zone 'UTC'");
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
 create function public.match_daily_limit_v2(boolean,boolean,boolean) returns int language sql immutable as $$select case when $2 then 50 when $1 then 10 else 5 end$$;
 `);
 await db.exec(fs.readFileSync(path.join(ROOT,'supabase/migrations-archive/legacy-local/012_standardize_vip_daily_limit.sql'),'utf8'));
 await db.exec(fs.readFileSync(path.join(ROOT,'supabase/migrations/20260921181338_repair_daily_checkin_reward_delta.sql'),'utf8').split('do $backfill$')[0]);
 await db.exec(fs.readFileSync(path.join(ROOT,'supabase/security/registration-welcome-bonus.sql'),'utf8'));
 await db.exec(fs.readFileSync(path.join(ROOT,'supabase/migrations-archive/legacy-local/20260929120000_canonicalize_match_share_reward_keys.sql'),'utf8'));
 promoBaseline=(await db.query("select proname,prosrc from pg_proc where proname in('claim_registration_welcome_bonus','claim_match_result_share') order by proname")).rows;
 baseline=(await db.query("select proname,pg_get_functiondef(oid) definition from pg_proc where proname in('consume_match','match_status','daily_match_checkin') order by proname")).rows;
 const sql=fs.readFileSync(path.join(ROOT,MIGRATION),'utf8');
 assert.ok(sql.length>25000,'migration must contain actual implementation');
 assert.ok((sql.match(/create function /g)||[]).length>=18,'empty CLI migration cannot pass');
 await db.exec(sql);
 // Seed the actual deployed ebook-only behavior before applying the follow-up.
 await config();
 const historyId=await user({purchased_matches:8,credits:19,kids_purchased_matches:4});
 const historyRequests=[];for(let i=0;i<3;i++){const request=randomUUID();historyRequests.push(request);await use('ebook',request);}
 assert.equal((await rpc('match_token_status')).first_match_pending,true);
 const beforeHistory=await scalar('select free_used,reward_balance from matchapp_private.token_accounts where user_id=$1',[historyId]);
 const refundedId=await user();const refundedRequest=randomUUID();await use('ebook',refundedRequest);await rpc('refund_match_token',[refundedRequest,'verified failure']);
 await db.exec(fs.readFileSync(path.join(ROOT,FIRST_VALUE_MIGRATION),'utf8'));
 firstValueBackfill={historyId,historyRequests,beforeHistory,refundedId};
});
after(async()=>{if(db)await db.close();});
beforeEach(async()=>{await db.exec('reset role');await config();await auth(null);});

test('migration preserves exact deployed core definitions; private tables and service APIs have RLS and least privileges',async()=>{
 assert.deepEqual((await db.query("select proname,pg_get_functiondef(oid) definition from pg_proc where proname in('consume_match','match_status','daily_match_checkin') order by proname")).rows,baseline);
 const tables=(await db.query("select c.relname,c.relrowsecurity,has_table_privilege('authenticated',c.oid,'select') can_read from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='matchapp_private' and c.relkind='r'")).rows;
 assert.ok(tables.length>=8);for(const t of tables){assert.equal(t.relrowsecurity,true,t.relname);assert.equal(t.can_read,false,t.relname);}
 const service=['set_matchapp_monetization_config','get_matchapp_monetization_config','upsert_pro_entitlement','refund_match_token','get_pro_billing_state','get_pro_entitlement_by_external_id','get_pro_entitlements_by_customer','bind_play_billing_account','get_play_billing_account_user','reserve_play_billing_request','reserve_pro_billing_request','reserve_pro_checkout','bind_pro_checkout_customer','reward_session_service','credit_match_reward'];
 const grants=(await db.query("select proname,has_function_privilege('authenticated',oid,'execute') a,has_function_privilege('anon',oid,'execute') n,has_function_privilege('service_role',oid,'execute') s from pg_proc where proname=any($1)",[service])).rows;
 assert.equal(grants.length,service.length);for(const r of grants){assert.equal(r.a,false,r.proname);assert.equal(r.n,false,r.proname);assert.equal(r.s,true,r.proname);}
 await db.exec('set role authenticated');await assert.rejects(rpc('get_matchapp_monetization_config'),/permission denied/);await assert.rejects(rpc('refund_match_token',[randomUUID(),'client invented failure']),/permission denied/);await db.exec('reset role');
});
test('anonymous status exposes policy only; disabled policy cannot spend a signed-in balance',async()=>{
 await config(false);await db.exec('set role anon');assert.deepEqual(await rpc('match_token_status'),{ok:true,enabled:false,authenticated:false,policy_version:'match-tokens-v1'});await assert.rejects(use(),/permission denied/);await db.exec('reset role');
 const id=await user({purchased_matches:7});const result=await use();assert.equal(result.allowed,false);assert.equal(result.reason,'policy_disabled');assert.equal((await scalar('select purchased_matches from profiles where id=$1',[id])).purchased_matches,7);assert.equal((await scalar('select count(*)::int n from matchapp_private.token_accounts where user_id=$1',[id])).n,0);
});
test('three free successful matches consume only the new base quota and preserve Ask and Kids state',async()=>{
 const id=await user({daily_match_count:4,purchased_matches:0,credits:19,kids_purchased_matches:8,kids_credits:13,kids_daily_action_count:2});
 assert.equal((await rpc('match_token_status')).daily_remaining,3);
 for(let i=2;i>=0;i--){const result=await use();assert.equal(result.allowed,true);assert.equal(result.source,'daily');assert.equal(result.daily_remaining,i);}
 assert.equal((await use()).allowed,false);
 assert.deepEqual(await scalar('select daily_match_count,credits,kids_purchased_matches,kids_credits,kids_daily_action_count from profiles where id=$1',[id]),{daily_match_count:4,credits:19,kids_purchased_matches:8,kids_credits:13,kids_daily_action_count:2});
});
test('request UUID is idempotent and bound to the exact user and surface',async()=>{
 const id=await user();const req=randomUUID();const first=await use('one_match',req);assert.equal(first.daily_remaining,2);
 for(let i=0;i<10;i++){const retry=await use('one_match',req);assert.equal(retry.allowed,true);assert.equal(retry.daily_remaining,2);assert.equal(retry.reason,'idempotent_replay');}
 assert.equal((await use('ebook',req)).reason,'request_conflict');await user();assert.equal((await use('one_match',req)).reason,'request_conflict');await auth(id);
 assert.equal((await scalar('select count(*)::int n from matchapp_private.token_uses where request_id=$1',[req])).n,1);await assert.rejects(use('kids'),/Invalid match request/);
});
test('three ebook-only successes mark first value and exhaust the shared wallet without an extra free result after reload',async()=>{
 const id=await user();for(let i=0;i<3;i++){const result=await use('ebook');assert.equal(result.source,'daily');assert.equal(result.first_match_pending,false);}
 await auth(null);await auth(id);const status=await rpc('match_token_status');assert.equal(status.first_match_pending,false);assert.equal(status.available_total,0);
 for(const surface of ['ebook','one_match']){const result=await use(surface);assert.equal(result.allowed,false);assert.equal(result.reason,'limit_reached');assert.equal(result.consumed,false);assert.equal(result.first_match_pending,false);}
 assert.equal((await scalar('select count(*)::int n from matchapp_private.token_uses where user_id=$1',[id])).n,3);
});
test('the follow-up marks existing non-refunded ebooks without changing balances or inventing value for refunded history',async()=>{
 const {historyId,historyRequests,beforeHistory,refundedId}=firstValueBackfill;
 assert.deepEqual(await scalar('select free_used,reward_balance from matchapp_private.token_accounts where user_id=$1',[historyId]),beforeHistory);
 assert.ok(historyRequests.includes((await scalar('select first_request_id from matchapp_private.token_accounts where user_id=$1',[historyId])).first_request_id));
 assert.deepEqual(await scalar('select purchased_matches,credits,kids_purchased_matches from profiles where id=$1',[historyId]),{purchased_matches:8,credits:19,kids_purchased_matches:4});
 await auth(historyId);assert.equal((await rpc('match_token_status')).first_match_pending,false);
 await auth(refundedId);assert.equal((await rpc('match_token_status')).first_match_pending,true);assert.equal((await rpc('match_token_status')).daily_remaining,3);
});
test('either first adult core surface remains free once when a legacy shared allowance was already exhausted',async()=>{
 for(const surface of ['one_match','ebook']){
  const id=await user({is_vip:true,daily_match_count:10});const result=await use(surface);
  assert.equal(result.allowed,true);assert.equal(result.source,'first_match');assert.equal(result.consumed,false);assert.equal(result.first_match_pending,false);
  assert.equal((await use(surface)).allowed,false);assert.equal((await scalar('select daily_match_count from profiles where id=$1',[id])).daily_match_count,10);
 }
});
test('first-value refunds retain any other successful core surface and unlimited ebook results also count as value',async()=>{
 await user();const book=randomUUID(),movie=randomUUID();await use('ebook',book);await use('one_match',movie);
 const partial=await rpc('refund_match_token',[book,'verified failure']);assert.equal(partial.wallet.first_match_pending,false);
 const final=await rpc('refund_match_token',[movie,'verified failure']);assert.equal(final.wallet.first_match_pending,true);assert.equal(final.wallet.daily_remaining,3);
 const proId=await user();await entitlement(proId);const result=await use('ebook');assert.equal(result.source,'pro');assert.equal(result.first_match_pending,false);assert.equal(result.daily_remaining,3);
});
test('service failure refund is exact once; a refunded UUID cannot be used again',async()=>{
 await user();const req=randomUUID();await use('one_match',req);
 await db.exec('set role service_role');const result=await rpc('refund_match_token',[req,'verified provider result could not render']);assert.equal(result.refunded,true);assert.equal(result.wallet.daily_remaining,3);assert.equal(result.wallet.first_match_pending,true);assert.equal((await rpc('refund_match_token',[req,'retry'])).refunded,false);await db.exec('reset role');
 assert.equal((await use('one_match',req)).reason,'refunded');assert.equal((await rpc('match_token_status')).daily_remaining,3);
});
test('UTC day rollover resets free quota without expiring purchased or reward balances',async()=>{
 const id=await user({purchased_matches:5});await use();await db.query("update matchapp_private.token_accounts set token_day=((now() at time zone 'UTC')::date-1),free_used=3,reward_balance=6 where user_id=$1",[id]);
 const before=await rpc('match_token_status');assert.equal(before.daily_remaining,3);assert.equal(before.bonus_tokens,6);assert.equal(before.purchased_matches,5);assert.ok(Number.isFinite(Date.parse(before.next_reset_at)));assert.equal(new Date(before.next_reset_at).getUTCHours(),0);
 const after=await use();assert.equal(after.daily_remaining,2);assert.equal(after.bonus_tokens,6);assert.equal(after.purchased_matches,5);
});
test('earned and purchased balance is spent once after free quota and daily check-in remains unchanged',async()=>{
 const id=await user({purchased_matches:2});const checkin=await rpc('daily_match_checkin');assert.equal(checkin.awarded,1);assert.equal(checkin.matches,3);assert.equal((await rpc('daily_match_checkin')).awarded,0);
 for(let i=0;i<3;i++)await use();const req=randomUUID();assert.equal((await use('one_match',req)).source,'purchased');assert.equal((await use('one_match',req)).purchased_matches,2);
 assert.equal((await scalar("select count(*)::int n from match_pack_ledger where user_id=$1 and pack='match_token_use'",[id])).n,1);
 await db.query('update daily_match_checkins set streak=6,last_checkin=current_date-1 where user_id=$1',[id]);await db.query("update match_pack_ledger set created_at=now()-interval '1 day' where user_id=$1 and pack='daily_checkin'",[id]);
 const weekly=await rpc('daily_match_checkin');assert.equal(weekly.awarded,6);assert.equal(weekly.matches,8);assert.equal((await rpc('daily_match_checkin')).awarded,0);
 assert.equal((await rpc('match_token_status')).purchased_matches,8);
});
test('legacy VIP and Business retain their shared 10/50 daily benefits without duplicate allowance or Pro',async()=>{
 for(const [kind,limit] of [['is_vip',10],['is_business',50]]){
  const id=await user({[kind]:true,daily_match_count:limit-1});let status=await rpc('match_token_status');assert.equal(status.daily_limit,limit);assert.equal(status.daily_remaining,1);assert.equal(status.unlimited,false);assert.equal(status.ad_free,true);assert.equal((await rpc('pro_status')).active,false);
  const result=await use();assert.equal(result.source,'legacy_daily');assert.equal(result.daily_remaining,0);assert.equal((await use()).allowed,false);assert.equal((await scalar('select daily_match_count from profiles where id=$1',[id])).daily_match_count,limit);assert.equal((await scalar('select free_used from matchapp_private.token_accounts where user_id=$1',[id])).free_used,0);
 }
});
test('only a verified paid active or canceled future Pro entitlement enables unlimited Matches',async()=>{
 const id=await user({purchased_matches:4,daily_match_count:2});assert.equal((await entitlement(id,{product:'prod_notAllowed'})).reason,'product_not_allowed');
 for(const [status,paid,expiry,expected] of [['trialing',false,1,false],['past_due',true,1,false],['expired',true,-1,false],['revoked',true,1,false],['paused',true,1,false],['active',false,1,false],['active',true,1,true],['canceled',true,1,true]]){
  const uid=await user();const result=await entitlement(uid,{status,paid,expiry:new Date(Date.now()+expiry*86400000).toISOString()});assert.equal(result.active,expected,status);assert.equal((await rpc('pro_status')).active,expected,status);
 }
 await auth(id);await entitlement(id);let status=await rpc('match_token_status');assert.equal(status.unlimited,true);assert.equal(status.available_total,null);assert.equal(status.rewarded_available,false);assert.equal((await use()).source,'pro');
 await config(false,false,[],[]);status=await rpc('match_token_status');assert.equal(status.enabled,true);assert.equal((await use()).source,'pro');assert.equal((await rpc('pro_status')).adFree,true);
 assert.deepEqual(await scalar('select daily_match_count,purchased_matches from profiles where id=$1',[id]),{daily_match_count:2,purchased_matches:4});
});
test('Pro ownership, customer binding, and provider event ordering are immutable or monotonic',async()=>{
 const id=await user(),external='sub_'+randomUUID().replaceAll('-',''),event=new Date(Date.now()-3000).toISOString();
 assert.equal((await entitlement(id,{external,event,verified:event})).applied,true);
 assert.equal((await entitlement(id,{external,event,verified:event})).reason,'stale_or_duplicate');
 assert.equal((await entitlement(id,{external,event:new Date(Date.now()-6000).toISOString(),status:'revoked'})).reason,'stale_or_duplicate');
 assert.equal((await entitlement(id,{external,customer:'cus_different'})).reason,'customer_conflict');
 const other=await user();assert.equal((await entitlement(other,{external})).reason,'ownership_conflict');
 const saved=await rpc('get_pro_entitlement_by_external_id',['stripe',external]);assert.equal(saved.user_id,id);assert.equal(saved.customer_id,'cus_fixture');assert.equal(saved.product_verified,true);assert.equal(saved.ever_paid,true);
 assert.ok((await rpc('get_pro_entitlements_by_customer',['cus_fixture'])).some(e=>e.external_id===external));
});
test('Play hashes bind purchase ownership; linked-token replacement is terminal for late callbacks',async()=>{
 const id=await user(),old='a'.repeat(64),fresh='b'.repeat(64),event=new Date(Date.now()-3000).toISOString();
 const play={provider:'play',product:'matchapp_pro',customer:null};assert.equal((await entitlement(id,{...play,external:old,hash:old,event,verified:event})).applied,true);
 assert.equal((await entitlement(id,{...play,external:fresh,hash:fresh,replaces:old})).applied,true);
 assert.equal((await rpc('get_pro_entitlement_by_external_id',['play',old])).status,'superseded');
 assert.equal((await entitlement(id,{...play,external:old,hash:old})).reason,'superseded_purchase');
 const other=await user();assert.equal((await entitlement(other,{...play,external:old,hash:old})).reason,'ownership_conflict');
 await assert.rejects(entitlement(other,{...play,external:'c'.repeat(64),hash:'d'.repeat(64)}),/Invalid purchase binding/);
});
test('Play obfuscated accounts are immutable and request limits are isolated from Pro and other users',async()=>{
 // PostgreSQL now() is transaction-stable: exhaust each limit in one minute,
 // even when the wall clock crosses a minute boundary between awaited calls.
 await db.exec('begin');
 try {
  const id=await user(),other=await user(),hash='1'.repeat(64);assert.equal((await rpc('bind_play_billing_account',[id,hash])).ok,true);assert.equal((await rpc('bind_play_billing_account',[id,hash])).ok,true);assert.equal((await rpc('bind_play_billing_account',[id,'2'.repeat(64)])).ok,false);assert.equal((await rpc('bind_play_billing_account',[other,hash])).ok,false);assert.equal(await rpc('get_play_billing_account_user',[hash]),id);
  for(let i=0;i<12;i++)assert.equal(await rpc('reserve_play_billing_request',[id]),true);assert.equal(await rpc('reserve_play_billing_request',[id]),false);
  for(let i=0;i<30;i++)assert.equal(await rpc('reserve_pro_billing_request',[id]),true);assert.equal(await rpc('reserve_pro_billing_request',[id]),false);assert.equal(await rpc('reserve_play_billing_request',[other]),true);assert.equal(await rpc('reserve_pro_billing_request',[other]),true);
  // Exercise expiry explicitly instead of relying on the real wall clock.
  for(const kind of ['play','pro']){
   await db.query(`update matchapp_private.${kind}_billing_limits set window_at=window_at-interval '1 minute' where user_id=$1`,[id]);
   assert.equal(await rpc(`reserve_${kind}_billing_request`,[id]),true);
   assert.equal((await scalar(`select attempts from matchapp_private.${kind}_billing_limits where user_id=$1`,[id])).attempts,1);
  }
 } finally {
  await db.exec('rollback');
 }
});
test('one bounded checkout intent prevents different-price tab races and customer binding survives renewal',async()=>{
 const id=await user();const first=await rpc('reserve_pro_checkout',[id,PRICE,'pt-BR']);assert.equal(first.ok,true);assert.ok(Date.parse(first.expires_at)-Date.now()>30*60*1000);
 const second=await rpc('reserve_pro_checkout',[id,PRICE_US,'en']);assert.deepEqual(second,first);
 assert.equal((await rpc('bind_pro_checkout_customer',[id,first.request_id,'cus_bound'])).ok,true);assert.equal((await rpc('bind_pro_checkout_customer',[id,first.request_id,'cus_other'])).ok,false);assert.equal((await rpc('bind_pro_checkout_customer',[id,randomUUID(),'cus_bound'])).ok,false);
 await db.query("update matchapp_private.pro_checkout_intents set expires_at=now()-interval '1 second' where user_id=$1",[id]);const renewed=await rpc('reserve_pro_checkout',[id,PRICE_US,'en']);assert.notEqual(renewed.request_id,first.request_id);assert.equal(renewed.price_id,PRICE_US);assert.equal(renewed.customer_id,'cus_bound');
 await assert.rejects(rpc('reserve_pro_checkout',[id,PRICE,'pt']),/Invalid Pro checkout/);
});

const UNIT='ca-app-pub-9541435081010948/2802190985';
const reward=async(action,uid,{requestId=null,nonce=null,surface='one_match'}={})=>rpc('reward_session_service',[action,uid,requestId,nonce,surface]);
async function rewardFixture(){
 const id=await user({credits:17,kids_credits:9});await config(true,true);for(let i=0;i<3;i++)await use();
 const nonce=randomBytes(32).toString('hex'),requestId=randomUUID();return {id,nonce,requestId};
}
const credit=async(f,changes={})=>{
 const c={nonce:f.nonce,userId:f.id,transaction:randomBytes(16).toString('hex'),unit:UNIT,amount:3,item:'Match Tokens',event:new Date().toISOString(),...changes};
 return rpc('credit_match_reward',[c.nonce,c.userId,c.transaction,c.unit,c.amount,c.item,c.event]);
};
test('reward claims require enabled rewards, an exhausted wallet, and a successful adult core result including ebooks',async()=>{
 const id=await user();await config(true,true);const input={requestId:randomUUID(),nonce:randomBytes(32).toString('hex')};
 assert.equal((await reward('create',id,input)).reason,'reward_unavailable');for(let i=0;i<2;i++){await use('ebook');assert.equal((await reward('create',id,input)).reason,'reward_unavailable');}await use('ebook');assert.equal((await rpc('match_token_status')).first_match_pending,false);
 await config(true,false);assert.equal((await reward('create',id,input)).reason,'reward_unavailable');await config(true,true);assert.equal((await reward('create',id,input)).ok,true);
 await db.exec('set role authenticated');await assert.rejects(reward('create',id,input),/permission denied/);await assert.rejects(credit({id,nonce:input.nonce}),/permission denied/);await db.exec('reset role');
});
test('reward request nonce is account-bound, idempotent, and permits one native presentation',async()=>{
 const f=await rewardFixture();const created=await reward('create',f.id,f);assert.equal(created.rewardAmount,3);assert.equal(created.rewardItem,'Match Tokens');assert.equal(created.adUnitId,UNIT);assert.equal(created.wallet.bonus_tokens,0);
 const retry=await reward('create',f.id,{...f,nonce:randomBytes(32).toString('hex')});assert.equal(retry.claimNonce,f.nonce);assert.equal(retry.expiresAt,created.expiresAt);
 assert.equal((await reward('create',f.id,{requestId:randomUUID(),nonce:randomBytes(32).toString('hex')})).claimNonce,f.nonce);assert.equal((await scalar('select count(*)::int n from matchapp_private.reward_claims where user_id=$1',[f.id])).n,1);
 const other=await user();assert.equal((await reward('native_validate',other,f)).reason,'claim_not_found');assert.equal((await reward('create',other,f)).reason,'request_conflict');
 const prepared=await reward('native_validate',f.id,f);assert.equal(prepared.ok,true);assert.equal(prepared.userId,f.id);assert.equal(prepared.expiresAt,created.expiresAt);assert.equal((await reward('native_validate',f.id,f)).reason,'claim_already_prepared');
 assert.equal((await reward('status',f.id,f)).status,'prepared');assert.equal((await reward('status',f.id,f)).wallet.bonus_tokens,0);
});
test('valid signed fulfillment records one global transaction and grants exactly three without touching legacy balances',async()=>{
 const f=await rewardFixture();await reward('create',f.id,f);await reward('native_validate',f.id,f);
 const event=new Date().toISOString(),transaction=randomBytes(16).toString('hex');const granted=await credit(f,{event,transaction});assert.equal(granted.credited,true);assert.equal(granted.wallet.bonus_tokens,3);assert.equal(granted.wallet.rewarded_available,false);
 for(let i=0;i<5;i++){const again=await credit(f,{event,transaction});assert.equal(again.duplicate,true);assert.equal(again.wallet.bonus_tokens,3);}
 assert.equal((await credit(f,{transaction,event,nonce:randomBytes(32).toString('hex')})).reason,'transaction_conflict');assert.equal((await credit(f)).reason,'claim_already_credited');
 assert.equal((await scalar('select count(*)::int n from matchapp_private.reward_transactions where claim_nonce=$1',[f.nonce])).n,1);
 assert.deepEqual(await scalar('select purchased_matches,credits,kids_credits from profiles where id=$1',[f.id]),{purchased_matches:0,credits:17,kids_credits:9});
 const status=await reward('status',f.id,f);assert.equal(status.status,'credited');assert.equal(status.credited,true);for(let i=2;i>=0;i--){const spent=await use();assert.equal(spent.source,'reward');assert.equal(spent.bonus_tokens,i);}assert.equal((await rpc('match_token_status')).rewarded_available,true);
});
test('wrong amount, unit, item, user, event time, or unprepared claim never earns a reward',async()=>{
 const f=await rewardFixture();await reward('create',f.id,f);assert.equal((await credit(f)).reason,'claim_not_prepared');await reward('native_validate',f.id,f);
 for(const changes of [{amount:300},{unit:'ca-app-pub-9541435081010948/9999999999'},{item:'Credits'},{userId:randomUUID()},{event:new Date(Date.now()-2*86400000).toISOString()},{event:new Date(Date.now()+3600000).toISOString()}])assert.equal((await credit(f,changes)).ok,false);
 assert.equal((await reward('status',f.id,f)).wallet.bonus_tokens,0);assert.equal((await scalar('select count(*)::int n from matchapp_private.reward_transactions where claim_nonce=$1',[f.nonce])).n,0);
});
test('cancellation and delayed SSV preserve an earned promise; a cancelled unprepared claim grants nothing',async()=>{
 const first=await rewardFixture();await reward('create',first.id,first);assert.equal((await reward('cancel',first.id,first)).status,'cancelled');assert.equal((await credit(first)).reason,'claim_not_prepared');
 const f=await rewardFixture();await reward('create',f.id,f);await reward('native_validate',f.id,f);assert.equal((await reward('cancel',f.id,f)).status,'cancelled');await config(false,false);
 assert.equal((await credit(f)).credited,true);
 const delayed=await rewardFixture();await reward('create',delayed.id,delayed);await reward('native_validate',delayed.id,delayed);
 await db.query("update matchapp_private.reward_claims set created_at=now()-interval '21 minutes',prepared_at=now()-interval '20 minutes',expires_at=now()-interval '5 minutes',status='expired' where claim_nonce=$1",[delayed.nonce]);await config(false,false);
 assert.equal((await credit(delayed,{event:new Date(Date.now()-10*60000).toISOString()})).credited,true);
});
test('expired or no-longer-eligible claims cannot prepare an ad, and cancelled preloads can be replaced',async()=>{
 const f=await rewardFixture();await reward('create',f.id,f);await db.query("update matchapp_private.reward_claims set expires_at=now()-interval '1 second' where claim_nonce=$1",[f.nonce]);assert.equal((await reward('native_validate',f.id,f)).reason,'claim_expired');
 const next={requestId:randomUUID(),nonce:randomBytes(32).toString('hex')};assert.equal((await reward('create',f.id,next)).ok,true);await reward('native_validate',f.id,next);await reward('cancel',f.id,next);
 const last={requestId:randomUUID(),nonce:randomBytes(32).toString('hex')};assert.equal((await reward('create',f.id,last)).ok,true);await rpc('daily_match_checkin');assert.equal((await reward('native_validate',f.id,last)).reason,'reward_unavailable');
});
test('reward-session request limiting is isolated and no client-created earned action is accepted',async()=>{
 // PostgreSQL now() is transaction-stable: all requests must share one rate-limit minute.
 await db.exec('begin');
 try {
  const id=await user();for(let i=0;i<60;i++)assert.equal((await reward('wallet',id)).ok,true);assert.equal((await reward('wallet',id)).reason,'rate_limited');assert.equal(await rpc('reserve_pro_billing_request',[id]),true);assert.equal(await rpc('reserve_play_billing_request',[id]),true);assert.equal((await reward('earned',id)).reason,'invalid_request');
 } finally {
  await db.exec('rollback');
 }
});

test('new adult signup and share grants retire together without rewriting preserved bodies or balances',async()=>{
 for(const original of promoBaseline){
  const saved=await scalar('select prosrc,has_function_privilege(\'authenticated\',oid,\'execute\') can_call from pg_proc where proname=$1',['legacy_'+original.proname]);assert.equal(saved.prosrc,original.prosrc);assert.equal(saved.can_call,false);
 }
 const id=await user({purchased_matches:7,credits:12,kids_credits:9,kids_purchased_matches:5});
 assert.equal((await rpc('claim_registration_welcome_bonus')).reason,'monetization_policy_changed');assert.equal((await rpc('claim_match_result_share',['Fixture film'])).reason,'monetization_policy_changed');
 assert.deepEqual(await scalar('select purchased_matches,credits,kids_credits,kids_purchased_matches from profiles where id=$1',[id]),{purchased_matches:7,credits:12,kids_credits:9,kids_purchased_matches:5});assert.equal((await scalar('select count(*)::int n from credit_ledger where user_id=$1',[id])).n,0);
 assert.equal((await rpc('daily_match_checkin')).awarded,1);assert.equal((await rpc('match_token_status')).purchased_matches,8);
});
test('pausing the policy restores exact eligible legacy bonus behavior and its original duplicate guards',async()=>{
 const id=await user();await config(false);assert.equal((await rpc('claim_registration_welcome_bonus')).granted,true);assert.equal((await rpc('claim_registration_welcome_bonus')).reason,'already_claimed');
 for(const name of ['first','second','third'])await db.query("insert into match_private.title_exclusions(user_id,title_key,item) values($1,$2,'{\"action\":\"shown\"}')",[id,name]);
 assert.equal((await rpc('claim_match_result_share',['first'])).granted,false);assert.equal((await rpc('claim_match_result_share',['second'])).granted,false);assert.equal((await rpc('claim_match_result_share',['third'])).granted,true);assert.equal((await rpc('claim_match_result_share',['third'])).reason,'already_shared');
 assert.deepEqual(await scalar('select purchased_matches,credits from profiles where id=$1',[id]),{purchased_matches:11,credits:10});await config(true);assert.equal((await rpc('claim_registration_welcome_bonus')).reason,'monetization_policy_changed');assert.equal((await rpc('match_token_status')).purchased_matches,11);
});

});
