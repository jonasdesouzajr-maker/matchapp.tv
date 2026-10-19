'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');

const root=path.join(__dirname,'..');
const migrationPath='supabase/migrations/20261019200625_lifetime_match_exclusions.sql';
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const ALICE='11111111-1111-4111-8111-111111111111';
const BOB='22222222-2222-4222-8222-222222222222';
const prefs={cat:'movie',plat:'any',mood:'any',vibe:'any',rating:'any',country:'BR',providers:[],maxMinutes:0,includeRentals:false,viewingMode:'shared'};

async function setup(){
 const db=await PGlite.create();
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
  create table auth.users(id uuid primary key,email text,is_anonymous boolean default false,raw_user_meta_data jsonb default '{}'::jsonb);
  grant usage on schema auth to authenticated,anon;
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  create table public.profiles(id uuid primary key,saved_list jsonb default '[]',seen_list jsonb default '[]',disliked_list jsonb default '[]',user_ratings jsonb default '{}');
  insert into auth.users(id) values('${ALICE}'),('${BOB}');
  insert into public.profiles(id) values('${ALICE}'),('${BOB}');`);
 for(const file of ['supabase/security/private-friends-and-history.sql','supabase/security/compact-portfolio-auth.sql','supabase/migrations/005_match_together.sql','supabase/migrations/20261016223445_growth_guest_sessions_20261016.sql','supabase/migrations/20261018145723_durable_match_exclusions.sql','supabase/migrations/20261018145959_align_durable_exclusion_source.sql',migrationPath])await db.exec(read(file));
 return db;
}
async function as(db,id){
 await db.exec(`set role ${id?'authenticated':'anon'}`);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);
}
async function call(db,name,args){
 return (await db.query(`select public.${name}(${args.map((_,index)=>'$'+(index+1)).join(',')}) result`,args)).rows[0].result;
}
const portfolio=(db,action,payload={})=>call(db,'portfolio_action',[action,JSON.stringify(payload)]);
const quick=(db,action,payload)=>call(db,'growth_together_service',[action,JSON.stringify(payload)]);
const film=(title,id=9401)=>({title,originalTitle:'Original Lifetime Work',kind:'movie',tmdbId:id,identityKeys:['tmdb:movie:'+id],action:'shown'});

test('restoring an adult preference hides its history entry but never makes a shown identity recommendable again',async()=>{
 const db=await setup();
 try{
  await as(db,ALICE);
  await portfolio(db,'remember',{items:[film('Primeiro Título')]});
  await portfolio(db,'remember',{items:[{...film('Localized Title'),action:'dislike'}]});
  await portfolio(db,'forget',{title:'Primeiro Título'});
  const restored=await portfolio(db,'list');
  assert(restored.keys.includes('tmdb:movie:9401'),'the complete lifetime identity survives removal of a preference');
  assert(restored.hiddenKeys.includes('tmdb:movie:9401'),'clients can retain hidden lifetime identities without restoring visible history');
  assert(restored.keys.includes('primeirotítulo')||restored.keys.includes('primeirotitulo'));
  assert.equal(restored.history.length,0,'restored preferences stay absent from visible saved/excluded history');
  const claims=await Promise.all([
   portfolio(db,'claim',{ownerId:ALICE,items:[film('Un Autre Titre')],token:'lifetime_claim_french'}),
   portfolio(db,'claim',{ownerId:ALICE,items:[film('別の翻訳名')],token:'lifetime_claim_japanese'})
  ]);
  assert.deepEqual(claims.map(result=>result.claimed),[false,false],'both sessions fail closed under new localized names');
  const fresh=await portfolio(db,'claim',{items:[{title:'A Different Work',kind:'movie',identityKeys:['tmdb:movie:9402']}],token:'lifetime_genuinely_fresh'});
  assert.equal(fresh.claimed,true,'lifetime history must not block an unrelated exact identity');
  assert.equal((await portfolio(db,'release_claim',{token:'lifetime_genuinely_fresh'})).released,true);
  const stillRestored=await portfolio(db,'list');
  assert(stillRestored.keys.includes('tmdb:movie:9401'));assert.equal(stillRestored.history.length,0);
 }finally{await db.close();}
});

test('a delayed adult claim release cannot erase a lifetime marker created by preference removal',async()=>{
 const db=await setup();
 try{
  await as(db,ALICE);
  const reserved={title:'Removed While Reserved',identityKeys:['tmdb:movie:9601']};
  assert.equal((await portfolio(db,'claim',{items:[reserved],token:'adult_removed_reservation'})).claimed,true);
  await portfolio(db,'forget',{title:reserved.title});
  assert.equal((await portfolio(db,'release_claim',{token:'adult_removed_reservation'})).released,false);
  const removed=await portfolio(db,'list');
  assert(removed.hiddenKeys.includes('tmdb:movie:9601'));assert.equal(removed.history.length,0);
  assert.equal((await portfolio(db,'claim',{items:[{title:'Localized Reserved Work',identityKeys:['tmdb:movie:9601']}],token:'adult_after_late_release'})).claimed,false);
  const untouched={title:'Unshown Cancelled Work',identityKeys:['tmdb:movie:9602']};
  assert.equal((await portfolio(db,'claim',{items:[untouched],token:'adult_unused_reservation'})).claimed,true);
  assert.equal((await portfolio(db,'release_claim',{token:'adult_unused_reservation'})).released,true);
  assert(!(await portfolio(db,'list')).keys.includes('tmdb:movie:9602'));
  assert.equal((await portfolio(db,'claim',{items:[untouched],token:'adult_new_unused_reserve'})).claimed,true,'a cancelled unshown claim remains available until explicitly removed or shown');
 }finally{await db.close();}
});

test('guest lifetime imports require an explicit true marker and passive poster enrichment preserves hidden history',async()=>{
 const db=await setup();
 try{
  await as(db,ALICE);
  const removed={title:'Guest Removed Work',identityKeys:['tmdb:movie:9701'],action:'lifetime',historyHidden:true};
  await portfolio(db,'remember',{items:[removed,
   {title:'False Marker Work',identityKeys:['tmdb:movie:9702'],action:'lifetime',historyHidden:false},
   {title:'String Marker Work',identityKeys:['tmdb:movie:9703'],action:'lifetime',historyHidden:'true'},
   {title:'Passive Marker Work',identityKeys:['tmdb:movie:9704'],action:'shown',historyHidden:true}
  ]});
  const imported=await portfolio(db,'list');
  assert(imported.hiddenKeys.includes('tmdb:movie:9701'));assert(imported.keys.includes('tmdb:movie:9701'));
  assert(!imported.history.some(item=>item.title==='Guest Removed Work'));
  for(const id of [9702,9703,9704])assert(!imported.hiddenKeys.includes('tmdb:movie:'+id),'only the explicit lifetime action plus a literal true marker hides a row');
  assert.equal(imported.history.length,3);
  await portfolio(db,'remember',{items:[{title:'Guest Removed Work',identityKeys:['tmdb:movie:9701'],action:'shown',posterUrl:'https://image.tmdb.org/t/p/w500/exact-source.jpg'}]});
  const enriched=await portfolio(db,'list');
  assert(enriched.hiddenKeys.includes('tmdb:movie:9701'));assert(enriched.keys.includes('tmdb:movie:9701'));
  assert.equal(enriched.history.length,3,'passive artwork completion never restores the removed history card');
  assert.equal((await portfolio(db,'claim',{items:[{title:'Imported New Locale',identityKeys:['tmdb:movie:9701']}],token:'imported_still_known_claim'})).claimed,false);
 }finally{await db.close();}
});

test('classic, friend and quick Together all reject restored lifetime identities and do not publish a substitute',async()=>{
 const db=await setup();
 try{
  await as(db,ALICE);await portfolio(db,'remember',{items:[film('Previously Shown')]});
  await portfolio(db,'forget',{title:'Previously Shown'});
  const classic=await call(db,'create_match_session',['Host',JSON.stringify(prefs)]);
  await as(db,BOB);await call(db,'join_match_session',[classic.code,'Guest',JSON.stringify(prefs)]);
  await as(db,ALICE);
  const refused=await call(db,'set_match_session_result',[classic.code,JSON.stringify(film('Another Locale'))]);
  assert.equal(refused.error,'already_known');
  assert.equal((await call(db,'get_match_session',[classic.code])).result,null);

  await db.exec('reset role');
  await db.query('insert into match_private.catalog(title_key,entry) values($1,$2::jsonb)',['catalogtranslation',JSON.stringify({...film('Catalog Translation'),cats:['movie']})]);
  await db.query('insert into match_private.pair_matches(code,host,guest,host_prefs,guest_prefs) values($1,$2,$3,$4::jsonb,$4::jsonb)',['lifetime_pair',ALICE,BOB,JSON.stringify(prefs)]);
  await as(db,ALICE);
  const paired=await call(db,'friends_action',['match',JSON.stringify({code:'lifetime_pair'})]);
  assert.equal(paired.result,null,'exhausted private friend matching remains empty');

  await db.exec('reset role');
  const request={actor_id:ALICE,token_hash:'a'.repeat(64),prefs,exclusions:[],name:'Host'};
  assert.equal((await quick(db,'create',request)).ok,true);
  assert.equal((await quick(db,'join',{...request,actor_id:BOB,guest_key_hash:'b'.repeat(64)})).ok,true);
  const prepared=await quick(db,'prepare',request);
  assert.deepEqual(prepared.candidates,[],'quick Together does not return the restored work as an available candidate');
  const forged=await quick(db,'commit',{...request,revision:prepared.revision,key:'catalogtranslation',outcome:'matched',result:film('Catalog Translation')});
  assert.equal(forged.error,'choices_changed');
  assert.equal((await quick(db,'status',request)).result,null);
  const userRows=(await db.query('select user_id from match_private.title_exclusions')).rows;
  assert(userRows.every(row=>row.user_id===ALICE),'a refused shared match never credits an exposure to the other participant');
 }finally{await db.close();}
});

test('reading restoration clears preferences while retaining lifetime seen IDs across stale and repeated releases',async()=>{
 const db=await setup();
 try{
  await as(db,ALICE);
  await portfolio(db,'reading_remember',{items:[{id:'reading-seen',action:'seen'},{id:'reading-saved',action:'save'},{id:'reading-disliked',action:'dislike'}]});
  for(const id of ['reading-seen','reading-saved','reading-disliked']){
   await portfolio(db,'reading_forget',{id});
   const state=await portfolio(db,'reading_list');
   assert(state.seen.includes(id),'every restored known title keeps its lifetime ID');
   assert(!state.saved.includes(id));assert(!state.disliked.includes(id));
   assert(state.restored.includes(id),'stale preference hydration remains suppressed');
   assert.equal((await portfolio(db,'reading_claim',{id,token:'reading_lifetime_claim'})).claimed,false);
   await portfolio(db,'reading_release',{id,token:'reading_lifetime_claim'});
   await portfolio(db,'reading_forget',{id});
   assert.equal((await portfolio(db,'reading_claim',{id,token:'reading_lifetime_repeat'})).claimed,false);
  }
  assert.equal((await portfolio(db,'reading_claim',{id:'cancelled-before-display',token:'reading_unused_claim'})).claimed,true);
  await portfolio(db,'reading_release',{id:'cancelled-before-display',token:'reading_unused_claim'});
  assert.equal((await portfolio(db,'reading_claim',{id:'cancelled-before-display',token:'reading_new_unused_claim'})).claimed,true,'an unshown cancelled reservation is still reusable');
  await portfolio(db,'reading_forget',{id:'cancelled-before-display'});
  await portfolio(db,'reading_release',{id:'cancelled-before-display',token:'reading_new_unused_claim'});
  assert.equal((await portfolio(db,'reading_claim',{id:'cancelled-before-display',token:'reading_after_restoration'})).claimed,false,'a late release never deletes a lifetime restoration marker');
  const replayed=await portfolio(db,'reading_remember',{items:[{id:'reading-saved',action:'save',legacy:true}]});
  assert(!replayed.saved.includes('reading-saved'));assert(replayed.seen.includes('reading-saved'));
  assert.equal((await portfolio(db,'list')).keys.length,0,'reading source IDs remain separate from audiovisual identities');
 }finally{await db.close();}
});

test('lifetime markers stay private and bound to the authenticated owner',async()=>{
 const db=await setup();
 try{
  await as(db,ALICE);await portfolio(db,'remember',{items:[film('Private Lifetime Work')]});
  await portfolio(db,'forget',{title:'Private Lifetime Work'});
  await portfolio(db,'reading_remember',{id:'private-reading-id',action:'seen'});
  await portfolio(db,'reading_forget',{id:'private-reading-id'});
  await as(db,BOB);
  const otherAccount=await portfolio(db,'list',{user_id:ALICE});
  assert.deepEqual(otherAccount.keys,[]);assert.deepEqual(otherAccount.hiddenKeys,[]);
  assert.deepEqual((await portfolio(db,'reading_list',{user_id:ALICE})).seen,[]);
  await assert.rejects(portfolio(db,'forget',{ownerId:ALICE,title:'Private Lifetime Work'}),/Account changed/);
  await assert.rejects(portfolio(db,'reading_forget',{ownerId:ALICE,id:'private-reading-id'}),/Account changed/);
  await assert.rejects(db.query('select * from match_private.title_exclusions'),/permission denied/);
  await assert.rejects(db.query('select * from match_private.reading_portfolios'),/permission denied/);
  assert.equal((await portfolio(db,'claim',{items:[film('Bob Independent Choice')],token:'bob_independent_claim'})).claimed,true,'one account history never blocks another account');
  await as(db,ALICE);
  assert.equal((await portfolio(db,'claim',{items:[film('Alice Other Language')],token:'alice_still_known_claim'})).claimed,false);
  assert.equal((await portfolio(db,'reading_claim',{id:'private-reading-id',token:'alice_still_known_read'})).claimed,false);
 }finally{await db.close();}
});

test('legacy direct and nested source identities stay excluded under a new localized alias',async()=>{
 const db=await setup();
 try{
  // Earlier clients persisted verified source fields without identityKeys.
  const legacy=[
   {title:'Legacy Direct Movie',tmdbId:9510,kind:'movie',action:'shown',addedAt:1},
   {title:'Legacy Nested Series',_tmdb:{tmdbId:9511,kind:'tv',originalTitle:'Source Series'},action:'dislike',addedAt:2},
   {title:'Legacy Metadata Movie',_catalogMedia:{tmdb_id:9512,media_kind:'movie'},action:'save',addedAt:3}
  ];
  for(const item of legacy)await db.query('insert into match_private.title_exclusions(user_id,title_key,item) values($1,$2,$3::jsonb)',[ALICE,item.title.toLowerCase().replace(/[^a-z]/g,''),JSON.stringify(item)]);
  await as(db,ALICE);
  const listed=await portfolio(db,'list');
  for(const identity of ['tmdb:movie:9510','tmdb:tv:9511','tmdb:movie:9512'])assert(listed.keys.includes(identity),'legacy source identities are present in account-wide exclusions');
  for(const [index,identity] of ['tmdb:movie:9510','tmdb:tv:9511','tmdb:movie:9512'].entries()){
   assert.equal((await portfolio(db,'claim',{items:[{title:'New Localized Alias '+index,identityKeys:[identity]}],token:'legacy_localized_claim_'+index})).claimed,false);
  }
  await portfolio(db,'remember',{items:[{title:'Modern Original Movie',identityKeys:['tmdb:movie:9513'],action:'shown'},{title:'Modern Original Series',identityKeys:['tmdb:tv:9514'],action:'shown'}]});
  assert.equal((await portfolio(db,'claim',{items:[{title:'Source Only Incoming Translation',tmdbId:9513,kind:'movie'}],token:'incoming_raw_source_claim'})).claimed,false,'incoming verified source fields also participate in the conflict check');
  assert.equal((await portfolio(db,'claim',{items:[{title:'Nested Incoming Translation',_meta:{_tmdbId:9514,_tmdbKind:'tv'}}],token:'incoming_nested_source_claim'})).claimed,false);
  await portfolio(db,'forget',{title:'Legacy Direct Movie'});
  const hidden=await portfolio(db,'list');
  assert(hidden.hiddenKeys.includes('tmdb:movie:9510'));assert(!hidden.history.some(item=>item.title==='Legacy Direct Movie'));
  assert.equal((await portfolio(db,'claim',{items:[{title:'Restored Source Alias',identityKeys:['tmdb:movie:9510']}],token:'legacy_after_forget_claim'})).claimed,false);
 }finally{await db.close();}
});

test('lifetime exclusions retain the earliest typed identity beyond recent-history and prompt limits',async()=>{
 const db=await setup();
 try{
  const items=Array.from({length:1005},(_,index)=>({title:'Lifetime Capacity Work '+index,identityKeys:['tmdb:movie:'+(60000+index)],action:'shown',addedAt:index+1}));
  for(let offset=0;offset<1000;offset+=500)await db.query("insert into match_private.title_exclusions(user_id,title_key,item) select $1::uuid,match_private.title_key(item->>'title'),item from jsonb_array_elements($2::jsonb) item",[ALICE,JSON.stringify(items.slice(offset,offset+500))]);
  await as(db,ALICE);
  await portfolio(db,'remember',{items:items.slice(1000)});
  const listed=await portfolio(db,'list');
  assert.equal(listed.history.length,1005);
  assert(listed.keys.includes('tmdb:movie:60000'),'the earliest identity survives all bounded input batches');
  assert(listed.history.slice(0,160).every(item=>!item.identityKeys.includes('tmdb:movie:60000')),'this fixture exceeds both the 160-title prompt and 120-title recent-history windows');
  await portfolio(db,'forget',{title:items[0].title});
  const restored=await portfolio(db,'list');
  assert.equal(restored.history.length,1004);assert(restored.keys.includes('tmdb:movie:60000'));
  assert(restored.hiddenKeys.includes('tmdb:movie:60000'),'removing an old history card preserves its lifetime identity');
  assert.equal((await portfolio(db,'claim',{items:[{title:'Ancient Work In Another Language',identityKeys:['tmdb:movie:60000']}],token:'capacity_earliest_claim'})).claimed,false);
 }finally{await db.close();}
});

test('reapplying the lifetime migration preserves durable identities and existing private grants',async()=>{
 const db=await setup();
 try{
  await as(db,ALICE);await portfolio(db,'remember',{items:[film('Migration Lifetime Work')]});
  await portfolio(db,'forget',{title:'Migration Lifetime Work'});
  await portfolio(db,'reading_remember',{id:'migration-reading',action:'seen'});
  await portfolio(db,'reading_forget',{id:'migration-reading'});
  const before=await portfolio(db,'list'),readingBefore=await portfolio(db,'reading_list');
  await db.exec('reset role');
  const functionBefore=(await db.query("select oid,proacl::text grants from pg_proc where oid='match_private.portfolio_impl(text,jsonb)'::regprocedure")).rows[0];
  await db.exec(read(migrationPath));await db.exec(read(migrationPath));
  const functionAfter=(await db.query("select oid,proacl::text grants from pg_proc where oid='match_private.portfolio_impl(text,jsonb)'::regprocedure")).rows[0];
  assert.deepEqual(functionAfter,functionBefore,'exact reruns preserve function ownership identity and execution grants');
  await as(db,ALICE);
  assert.deepEqual(await portfolio(db,'list'),before);assert.deepEqual(await portfolio(db,'reading_list'),readingBefore);
  assert.equal((await portfolio(db,'claim',{items:[film('Migration New Locale')],token:'migration_repeat_claim'})).claimed,false);
  assert.equal((await portfolio(db,'reading_claim',{id:'migration-reading',token:'migration_repeat_read'})).claimed,false);
  await db.exec('reset role');
  const grants=(await db.query("select has_function_privilege('anon','match_private.portfolio_impl(text,jsonb)','execute') anon_portfolio,has_function_privilege('authenticated','match_private.session_title_keys(jsonb)','execute') public_identity,has_function_privilege('authenticated','public.growth_together_service(text,jsonb)','execute') public_growth")).rows[0];
  assert.deepEqual(grants,{anon_portfolio:false,public_identity:false,public_growth:false});
 }finally{await db.close();}
});

test('the migration aborts if a newer portfolio source no longer matches its reviewed patch',async()=>{
 const db=await setup();
 try{
  const source=(await db.query("select pg_get_functiondef('match_private.portfolio_impl(text,jsonb)'::regprocedure) definition")).rows[0].definition;
  const changed=source.replace('reading_saved:=reading_saved-t;','reading_saved := reading_saved-t;');
  assert.notEqual(changed,source);
  await db.exec(changed);
  const before=(await db.query("select prosrc from pg_proc where oid='match_private.portfolio_impl(text,jsonb)'::regprocedure")).rows[0].prosrc;
  await assert.rejects(db.exec(read(migrationPath)),/Lifetime exclusions baseline mismatch/);
  const after=(await db.query("select prosrc from pg_proc where oid='match_private.portfolio_impl(text,jsonb)'::regprocedure")).rows[0].prosrc;
  assert.equal(after,before,'a source mismatch never overwrites a newer function');
 }finally{await db.close();}
});
