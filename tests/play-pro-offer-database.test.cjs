'use strict';
const {test,describe,before,after,beforeEach}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {randomUUID,randomBytes}=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite');
const root=path.join(__dirname,'..');
const product='matchapp_pro',plan='monthly',offer='retain-50-3m';
describe('one-use verified Play Pro offer ledger',()=>{
 let db;
 const hash=()=>randomBytes(32).toString('hex');
 const rpc=async(name,args=[]) => (await db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) value`,args)).rows[0].value;
 const scalar=async(sql,args=[]) => (await db.query(sql,args)).rows[0];
 const config=(enabled=true,products=[product])=>rpc('set_matchapp_monetization_config',[enabled,false,['prod_VSP0LagMpQQHIj'],products]);
 async function user(){const id=randomUUID();await db.query('insert into public.profiles(id) values($1)',[id]);return id;}
 async function source(uid,changes={}){
  const token=changes.token||hash(),at=new Date(Date.now()-1000).toISOString();
  const row={status:'active',paid:true,expires:new Date(Date.now()+86400000).toISOString(),product,...changes};
  const result=await rpc('upsert_pro_entitlement',[uid,'play',token,row.product,row.status,row.paid,row.expires,at,at,null,false,true,token,null]);
  assert.equal(result.applied,true);return token;
 }
 const reserve=(uid,token,purpose='retention',changes={})=>rpc('reserve_play_pro_offer',[uid,changes.product||product,changes.plan||plan,changes.offer||offer,token,purpose]);
 const redeem=(uid,token,linked,started=new Date().toISOString(),changes={})=>rpc('redeem_play_pro_offer',[uid,changes.product||product,changes.plan||plan,changes.offer||offer,token,linked,started]);
 before(async()=>{
  db=new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
   create table auth.users(id uuid primary key,created_at timestamptz default now(),email_confirmed_at timestamptz default now(),phone_confirmed_at timestamptz,is_anonymous boolean default false);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create table public.profiles(id uuid primary key,is_vip bool default false,is_business bool default false,is_ad_free bool default false,ad_free_purchased bool default false,daily_match_count int default 2,daily_match_date date default current_date,purchased_matches int default 8,credits int default 19,kids_purchased_matches int default 4,kids_credits int default 7,kids_daily_action_count int default 1);
   create table public.match_pack_ledger(user_id uuid,delta int,balance int,pack text,created_at timestamptz default now());
   create table public.credit_ledger(user_id uuid,delta int,balance int,reason text,pack text,created_at timestamptz default now());`);
  await db.exec(fs.readFileSync(path.join(root,'supabase/migrations/20261017105237_match_tokens_pro_verified_rewards.sql'),'utf8'));
  await db.exec(fs.readFileSync(path.join(root,'supabase/migrations/20261017134349_play_pro_offer_once.sql'),'utf8'));
 });
 after(async()=>{if(db)await db.close();});
 beforeEach(async()=>{await db.exec('reset role');await config();});

 test('both RPCs are service-only and private tables expose no browser access',async()=>{
  const grants=(await db.query("select proname,has_function_privilege('anon',oid,'execute') anon,has_function_privilege('authenticated',oid,'execute') member,has_function_privilege('service_role',oid,'execute') service from pg_proc where proname in ('reserve_play_pro_offer','redeem_play_pro_offer')")).rows;
  assert.equal(grants.length,2);for(const row of grants){assert.equal(row.anon,false);assert.equal(row.member,false);assert.equal(row.service,true);}
  const tables=(await db.query("select relname,relrowsecurity,has_table_privilege('authenticated',oid,'select') member from pg_class where relname in ('play_pro_offer_intents','play_pro_offer_redemptions')")).rows;
  assert.equal(tables.length,2);for(const row of tables){assert.equal(row.relrowsecurity,true);assert.equal(row.member,false);}
  const uid=await user(),token=await source(uid);
  for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(reserve(uid,token),/permission denied/);await assert.rejects(redeem(uid,hash(),token),/permission denied/);await db.exec('reset role');}
  await db.exec('set role service_role');assert.equal((await reserve(uid,token)).eligible,true);
 });
 test('unverified, wrong-owner, unpaid, held, revoked and unknown sources cannot issue an offer',async()=>{
  const uid=await user(),other=await user(),owned=await source(uid);
  assert.equal((await reserve(other,owned)).eligible,false);assert.equal((await reserve(uid,hash())).eligible,false);
  for(const changes of [{status:'trialing',paid:false},{status:'past_due'},{status:'revoked'},{status:'paused'},{paid:false}]){
   const id=await user(),token=await source(id,changes);assert.equal((await reserve(id,token)).eligible,false);
  }
  await db.query("update matchapp_private.pro_entitlements set product_verified=false where provider='play' and external_id=$1",[owned]);assert.equal((await reserve(uid,owned)).eligible,false);
 });
 test('retention accepts an owned canceled-but-unexpired paid plan and reuses the same 24-hour authorization',async()=>{
  const uid=await user(),token=await source(uid,{status:'canceled'}),first=await reserve(uid,token);
  assert.equal(first.ok,true);assert.equal(first.eligible,true);assert.match(first.claimNonce,/^[a-f0-9-]{36}$/);
  assert.equal(first.expiresAt-first.issuedAt,86400000);assert.ok(first.issuedAt<=Date.now());
  for(let n=0;n<4;n++)assert.deepEqual(await reserve(uid,token),first);
  assert.equal((await scalar('select count(*)::int n from matchapp_private.play_pro_offer_intents where user_id=$1',[uid])).n,1);
  assert.equal((await scalar('select count(*)::int n from matchapp_private.play_pro_offer_redemptions where user_id=$1',[uid])).n,0);
 });
 test('policy or product pause blocks new quotes while issued paid fulfillment remains available',async()=>{
  const uid=await user(),token=await source(uid);await reserve(uid,token);await config(false);
  assert.equal((await reserve(uid,token)).reason,'policy_disabled');assert.equal((await redeem(uid,hash(),token)).redeemed,true);
  const other=await user(),otherToken=await source(other);await config(true,[]);assert.equal((await reserve(other,otherToken)).eligible,false);
 });
 test('winback needs expired verified paid history and no current paid Pro on any provider',async()=>{
  const uid=await user(),token=await source(uid,{status:'expired',expires:new Date(Date.now()-86400000).toISOString()});
  assert.equal((await reserve(uid,token)).eligible,false);assert.equal((await reserve(uid,token,'winback')).eligible,true);
  assert.equal((await redeem(uid,hash(),null)).redeemed,true);
  const other=await user(),old=await source(other,{status:'canceled',expires:new Date(Date.now()-86400000).toISOString()});await source(other);
  assert.equal((await reserve(other,old,'winback')).eligible,false);
 });
 test('no owned issuance, wrong linked source and cross-account links cannot redeem',async()=>{
  const uid=await user(),token=await source(uid),other=await user(),foreign=await source(other);
  assert.equal((await redeem(uid,hash(),token)).reason,'intent_not_found');await reserve(uid,token);
  assert.equal((await redeem(uid,hash(),null)).reason,'intent_not_found');
  assert.equal((await redeem(uid,hash(),foreign)).reason,'linked_purchase_conflict');
  const different=await source(uid);assert.equal((await redeem(uid,hash(),different)).reason,'intent_not_found');
  assert.equal((await redeem(uid,foreign,token)).reason,'ownership_conflict');
 });
 test('one paid token redeems exactly once and exact retries are idempotent; all other tokens or bindings fail',async()=>{
  const uid=await user(),sourceToken=await source(uid),newToken=hash(),at=new Date().toISOString();await reserve(uid,sourceToken);
  assert.deepEqual(await redeem(uid,newToken,sourceToken,at),{ok:true,redeemed:true,reason:'verified'});
  for(let n=0;n<5;n++)assert.deepEqual(await redeem(uid,newToken,sourceToken,at),{ok:true,redeemed:true,reason:'idempotent_replay'});
  assert.equal((await redeem(uid,hash(),sourceToken,at)).reason,'already_redeemed');assert.equal((await reserve(uid,sourceToken)).reason,'already_redeemed');
  const other=await user();assert.equal((await redeem(other,newToken,null,at)).reason,'purchase_conflict');
  assert.equal((await redeem(uid,newToken,null,at)).reason,'purchase_conflict');
  assert.equal((await scalar('select count(*)::int n from matchapp_private.play_pro_offer_redemptions where user_id=$1',[uid])).n,1);
 });
 test('renewed quotes keep old authorization so delayed RTDN and pending paid starts cannot lose the discount',async()=>{
  const uid=await user(),token=await source(uid),first=await reserve(uid,token);
  await db.query("update matchapp_private.play_pro_offer_intents set issued_at=now()-interval '3 days',expires_at=now()-interval '2 days' where claim_nonce=$1",[first.claimNonce]);
  const second=await reserve(uid,token);assert.notEqual(second.claimNonce,first.claimNonce);
  const at=new Date(Date.now()-86400000).toISOString();assert.equal((await redeem(uid,hash(),token,at)).redeemed,true);
  assert.equal((await scalar('select claim_nonce from matchapp_private.play_pro_offer_redemptions where user_id=$1',[uid])).claim_nonce,first.claimNonce);
  assert.equal((await scalar('select count(*)::int n from matchapp_private.play_pro_offer_intents where user_id=$1',[uid])).n,2);
  const late=await user(),lateSource=await source(late),quote=await reserve(late,lateSource);
  await db.query("update matchapp_private.play_pro_offer_intents set issued_at=now()-interval '3 days',expires_at=now()-interval '2 days' where claim_nonce=$1",[quote.claimNonce]);
  assert.equal((await redeem(late,hash(),lateSource)).redeemed,true);
 });
 test('purchase start must follow issuance within the modest provider skew, and arbitrary future starts fail',async()=>{
  const uid=await user(),token=await source(uid),quote=await reserve(uid,token);
  assert.equal((await redeem(uid,hash(),token,new Date(quote.issuedAt-300001).toISOString())).reason,'intent_not_found');
  await assert.rejects(redeem(uid,hash(),token,new Date(Date.now()+3600000).toISOString()),/Invalid verified Play offer/);
  assert.equal((await redeem(uid,hash(),token,new Date(quote.issuedAt-299000).toISOString())).redeemed,true);
 });
 test('only the configured reviewed product/base/offer and hashes are accepted',async()=>{
  const uid=await user(),token=await source(uid);
  for(const changes of [{product:'other'},{plan:'annual'},{offer:'unapproved'}]){await assert.rejects(reserve(uid,token,'retention',changes),/Invalid Play offer request/);await assert.rejects(redeem(uid,hash(),token,undefined,changes),/Invalid verified Play offer/);}
  await assert.rejects(reserve(uid,'raw-google-purchase-token'),/Invalid Play offer request/);await assert.rejects(reserve(uid,token,'gift'),/Invalid Play offer request/);
  await assert.rejects(redeem(uid,token,token),/Invalid verified Play offer/);
 });
 test('issuing and redeeming an offer never grants Pro or changes Match, Ask, Kids or existing paid balances',async()=>{
  const uid=await user(),token=await source(uid,{status:'expired',expires:new Date(Date.now()-86400000).toISOString()});
  const before=await scalar('select * from profiles where id=$1',[uid]);await reserve(uid,token,'winback');const fresh=hash();await redeem(uid,fresh,null);
  assert.deepEqual(await scalar('select * from profiles where id=$1',[uid]),before);
  assert.equal(await rpc('get_pro_entitlement_by_external_id',['play',fresh]),null);
  assert.equal((await rpc('get_pro_billing_state',[uid])).pro.active,false);
 });
});
