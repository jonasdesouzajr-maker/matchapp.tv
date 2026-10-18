'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const ALICE='11111111-1111-4111-8111-111111111111';
const BOB='22222222-2222-4222-8222-222222222222';
const CAROL='33333333-3333-4333-8333-333333333333';
const prefs={cat:'movie',plat:'any',mood:'any',vibe:'any',rating:'any',country:'BR',providers:[],maxMinutes:0,includeRentals:false,viewingMode:'shared'};
async function setup(){
 const db=await PGlite.create();
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
  create table auth.users(id uuid primary key,email text,is_anonymous boolean default false,raw_user_meta_data jsonb default '{}'::jsonb);
  grant usage on schema auth to authenticated,anon;
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  create table public.profiles(id uuid primary key,saved_list jsonb default '[]',seen_list jsonb default '[]',disliked_list jsonb default '[]',user_ratings jsonb default '{}');
  insert into auth.users(id) values('${ALICE}'),('${BOB}'),('${CAROL}');
  insert into public.profiles(id) values('${ALICE}'),('${BOB}'),('${CAROL}');`);
 for(const file of ['supabase/security/private-friends-and-history.sql','supabase/security/compact-portfolio-auth.sql','supabase/migrations/005_match_together.sql','supabase/migrations/20261016223445_growth_guest_sessions_20261016.sql','supabase/migrations/20261018145723_durable_match_exclusions.sql','supabase/migrations/20261018145959_align_durable_exclusion_source.sql'])await db.exec(read(file));
 return db;
}
async function as(db,id){await db.exec(`set role ${id?'authenticated':'anon'}`);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);}
async function call(db,name,args){const params=args.map((_,i)=>'$'+(i+1)).join(',');return (await db.query(`select public.${name}(${params}) result`,args)).rows[0].result;}
const portfolio=(db,action,payload={})=>call(db,'portfolio_action',[action,JSON.stringify(payload)]);
const create=(db,name='Host')=>call(db,'create_match_session',[name,JSON.stringify(prefs)]);
const join=(db,code,name='Guest')=>call(db,'join_match_session',[code,name,JSON.stringify(prefs)]);
const publish=(db,code,result)=>call(db,'set_match_session_result',[code,JSON.stringify(result)]);

test('classic Together atomically publishes complete identities for private registered participants',async()=>{
 const db=await setup();
 try{
  await as(db,ALICE);const session=await create(db);
  assert.equal(session.ok,true);
  await as(db,CAROL);await join(db,session.code,'Third viewer');
  await as(db,BOB);const joined=await join(db,session.code,'Second viewer');
  assert.equal(joined.participants.length,3);
  assert(!JSON.stringify(joined).includes(ALICE)&&!JSON.stringify(joined).includes(BOB)&&!JSON.stringify(joined).includes(CAROL),'membership never leaks into public preferences');
  await assert.rejects(db.query('select * from match_private.classic_session_members'),/permission denied/);
  await assert.rejects(db.query("select match_private.record_session_title(array[$1::uuid],$2::jsonb,'forged')",[BOB,JSON.stringify({title:'Injected'})]),/permission denied/);
  const exact={title:'Original Movie',originalTitle:'Original Movie',tmdbId:710,kind:'movie',titleAliases:['Localized Movie']};
  await portfolio(db,'remember',{items:[{title:'Another localized name',action:'dislike',identityKeys:['tmdb:movie:710']}]});
  await as(db,ALICE);
  const token='classic_host_claim_710';
  assert.equal((await portfolio(db,'claim',{items:[{...exact,identityKeys:['tmdb:movie:710']}],token})).claimed,true);
  assert.equal((await publish(db,session.code,{...exact,claimToken:token,ownerId:BOB})).error,'account_changed');
  const denied=await publish(db,session.code,{...exact,claimToken:token,ownerId:ALICE});
  assert.equal(denied.error,'already_known','a different localized dismissal from a guest blocks publication');
  const stillWaiting=await call(db,'get_match_session',[session.code]);assert.equal(stillWaiting.result,null);
  await as(db,BOB);await portfolio(db,'forget',{title:'Another localized name'});
  await as(db,ALICE);
  assert.equal((await publish(db,session.code,{...exact,claimToken:'not_the_owned_token'})).error,'already_known','a caller cannot consume an unowned reservation');
  const done=await publish(db,session.code,{...exact,claimToken:token,ownerId:ALICE});
  assert.equal(done.ok,true);assert.equal(done.already,false);assert.equal(done.result.matchScope,'together:'+session.code);
  assert.equal(done.result.claimToken,undefined);assert.equal(done.result.ownerId,undefined);
  assert.equal((await portfolio(db,'release_claim',{token})).released,false,'publication consumes the claim and cannot be undone by a stale release');
  await portfolio(db,'remember',{items:[{title:exact.title,action:'shown',posterUrl:'https://image.tmdb.org/t/p/w780/exact.jpg',identityKeys:['tmdb:movie:710']}]});
  for(const user of [CAROL,BOB,ALICE]){
   await as(db,user);const history=await portfolio(db,'list');
   assert(history.keys.includes('tmdb:movie:710'));assert(history.keys.includes('localizedmovie'));
   const selected=history.history.find(i=>i.identityKeys?.includes('tmdb:movie:710'));
   assert.equal(selected.action,'shown');assert.equal(selected.reason,'together:'+session.code);
  }
  const reopen=await publish(db,session.code,{title:'Replacement'});
  assert.equal(reopen.already,true);assert.equal(reopen.result.title,exact.title,'reopening is the same intentional result');
  const second=await create(db);await as(db,BOB);await join(db,second.code);await as(db,ALICE);
  assert.equal((await publish(db,second.code,{title:'A fresh locale',tmdbId:'710',kind:'movie'})).error,'already_known','a new session cannot rematch the identity');
  // Existing sessions created before the private map still protect their host.
  await db.exec('reset role');
  await db.query("insert into public.match_sessions(code,host_id,participants) values('OLDLINK1',$1,'[]')",[ALICE]);
  await as(db,ALICE);assert.equal((await publish(db,'OLDLINK1',{title:'Original Movie'})).error,'already_known');
  await as(db,BOB);assert.equal((await publish(db,'OLDLINK1',{title:'Unrelated'})).error,'host_required');
  await as(db,null);assert.equal((await create(db)).error,'not_authenticated');
 }finally{await db.close();}
});

test('quick Together commits one shared account identity across racing invites and preserves old RPC callers',async()=>{
 const db=await setup();
 const rpc=(action,payload)=>call(db,'growth_together_service',[action,JSON.stringify(payload)]);
 const request=(host,token)=>({actor_id:host,token_hash:token.repeat(64),prefs,exclusions:[],name:'Host'});
 try{
  await db.query('insert into match_private.catalog(title_key,entry) values($1,$2)', ['quickfilm',JSON.stringify({title:'Quick Film',cats:['movie'],year:2020})]);
  const first=request(ALICE,'a'),second=request(BOB,'c');
  await rpc('create',first);await rpc('create',second);
  await rpc('join',{...first,actor_id:BOB,guest_key_hash:'b'.repeat(64)});
  await rpc('join',{...second,actor_id:ALICE,guest_key_hash:'d'.repeat(64)});
  const prepared=await Promise.all([rpc('prepare',first),rpc('prepare',second)]);
  assert(prepared.every(x=>x.candidates.length===1));
  const exact={title:'Quick Film',tmdbId:711,kind:'movie'};
  const committed=await Promise.all([rpc('commit',{...first,revision:prepared[0].revision,key:'quickfilm',outcome:'matched',result:exact}),rpc('commit',{...second,revision:prepared[1].revision,key:'quickfilm',outcome:'matched',result:exact})]);
  assert.equal(committed.filter(x=>x.ok&&x.status==='matched').length,1,'opposite participant order still permits one shared result');
  assert.equal(committed.filter(x=>x.error==='choices_changed').length,1);
  const winner=committed[0].ok?first:second,scope=committed.find(x=>x.ok).result.matchScope;
  assert.match(scope,/^growth:[0-9a-f-]{36}$/);
  for(const user of [BOB,ALICE]){await as(db,user);const state=await portfolio(db,'list');assert(state.keys.includes('tmdb:movie:711'));assert.equal(state.history.find(x=>x.identityKeys?.includes('tmdb:movie:711')).reason,scope);}
  await assert.rejects(rpc('status',winner),/permission denied/,'the Edge-only service grant remains closed to browser callers');
  await db.exec('reset role');
  const reopen=await rpc('commit',{...winner,revision:0,key:'injected',result:{title:'Changed'}});
  assert.equal(reopen.result.title,'Quick Film','an old caller can reopen the already committed invitation');
  // The numeric metadata arrives after prepare, so a concurrent localized
  // preference must be checked once more at commit time.
  const third=request(ALICE,'e');await rpc('create',third);await rpc('join',{...third,actor_id:CAROL,guest_key_hash:'f'.repeat(64)});
  await db.query('insert into match_private.catalog(title_key,entry) values($1,$2)', ['distinctfilm',JSON.stringify({title:'Distinct Film',cats:['movie']})]);
  const ready=await rpc('prepare',third);assert(ready.candidates.some(x=>x.key==='distinctfilm'));
  await as(db,CAROL);await portfolio(db,'remember',{items:[{title:'Exact translated title',action:'save',identityKeys:['tmdb:movie:712']}]});
  await db.exec('reset role');
  assert.equal((await rpc('commit',{...third,revision:ready.revision,key:'distinctfilm',outcome:'matched',result:{title:'Distinct Film',tmdbId:712,kind:'movie'}})).error,'choices_changed');
  const rows=(await db.query("select has_function_privilege('authenticated','match_private.session_title_keys(jsonb)','execute') helper,relrowsecurity from pg_class where oid='match_private.classic_session_members'::regclass")).rows[0];
  assert.equal(rows.helper,false);assert.equal(rows.relrowsecurity,true);
 }finally{await db.close();}
});
