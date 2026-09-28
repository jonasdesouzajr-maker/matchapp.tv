const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');

test('database grants one Match on shares 3 and 6; duplicates, guests and legacy RPC cannot mint member credits',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`
 create schema auth; create schema match_private; create schema extensions;
 create role anon; create role authenticated; create role service_role;
 create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create function extensions.gen_random_bytes(n integer) returns bytea language sql as $$ select decode(replace(gen_random_uuid()::text,'-',''),'hex') $$;
 create table public.profiles(id uuid primary key,purchased_matches integer default 0,share_rewards timestamptz[] default '{}');
 create table public.match_pack_ledger(user_id uuid,delta integer,balance integer,pack text);
 create function public.claim_share_reward() returns jsonb language sql as $$ select '{}'::jsonb $$;
 revoke all on function public.claim_share_reward() from public;
 grant execute on function public.claim_share_reward() to authenticated;
 `);
 const guest=fs.readFileSync('supabase/security/verified-public-guest-social-proof.sql','utf8');
 await db.exec(guest);
 await db.exec(fs.readFileSync('supabase/migrations/20260928095000_three_match_shares_one_reward.sql','utf8'));
 const uid='11111111-1111-4111-8111-111111111111';
 await db.query('insert into public.profiles(id) values($1)',[uid]);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);
 const claim=async title=>(await db.query('select public.claim_match_result_share($1) as result',[title])).rows[0].result;
 assert.equal((await claim('Movie One')).progress,1);
 assert.equal((await claim(' movie ONE ')).reason,'already_shared');
 assert.equal((await claim('Movie Two')).progress,2);
 assert.equal((await claim('Movie Three')).granted,true);
 assert.equal((await claim('Movie Four')).progress,1);
 assert.equal((await claim('Movie Five')).progress,2);
 assert.equal((await claim('Movie Six')).granted,true);
 assert.equal((await db.query('select purchased_matches from public.profiles')).rows[0].purchased_matches,2);
 assert.equal((await db.query('select count(*)::int as count from public.match_pack_ledger')).rows[0].count,2);
 assert.equal((await db.query("select has_function_privilege('authenticated','public.claim_share_reward()','execute') as allowed")).rows[0].allowed,false);
 await db.query("select set_config('request.jwt.claim.sub','',false)");
 assert.equal((await claim('Movie Seven')).reason,'not_authenticated');
 const gid='22222222-2222-4222-8222-222222222222';
 const begin=async kind=>(await db.query('select match_private.guest_social_proof_begin($1,$2) as result',[gid,kind])).rows[0].result;
 let latest;
 for(let i=1;i<=6;i++){
  latest=await begin('watch_match');
  assert.equal(latest.ok,true);
  const result=(await db.query("select match_private.guest_social_proof_complete($1,$2,'tiktok',$3,$4) as result",[gid,latest.proof_id,'test-post-'+i,'https://www.tiktok.com/@test/video/'+i])).rows[0].result;
  assert.equal(result.verified,true);
  assert.equal(result.reward_granted,i%3===0);
  assert.equal(result.progress,i%3);
 }
 const replay=(await db.query("select match_private.guest_social_proof_complete($1,$2,'tiktok','test-post-6','https://www.tiktok.com/@test/video/6') as result",[gid,latest.proof_id])).rows[0].result;
 assert.equal(replay.reason,'already_claimed');
 assert.equal((await begin('ask_ai')).ok,true,'unrelated guest AI offer remains available');
 }finally{await db.close();}
});
