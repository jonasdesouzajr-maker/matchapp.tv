'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const root=path.join(__dirname,'..');
const migration='supabase/migrations/20261019200629_backend_canonical_lifetime_identity.sql';
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const ALICE='11111111-1111-4111-8111-111111111111';
const BOB='22222222-2222-4222-8222-222222222222';
const prefs={cat:'movie',plat:'any',mood:'any',vibe:'any',rating:'any',country:'BR'};
const norm=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const movie=(title,year=2020)=>({title,year,cats:['movie'],moods:['funny'],platform:'Netflix'});
async function setup(apply=true){
 const db=await PGlite.create();
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create table auth.users(id uuid primary key,email text,is_anonymous boolean default false,raw_user_meta_data jsonb default '{}');
 grant usage on schema auth to authenticated,anon;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table public.profiles(id uuid primary key,saved_list jsonb default '[]',seen_list jsonb default '[]',disliked_list jsonb default '[]',user_ratings jsonb default '{}');
 insert into auth.users(id) values('${ALICE}'),('${BOB}');
 insert into public.profiles(id) values('${ALICE}'),('${BOB}');`);
 for(const file of ['supabase/security/private-friends-and-history.sql','supabase/security/compact-portfolio-auth.sql',
  'supabase/migrations/005_match_together.sql','supabase/migrations/20260917135613_catalog_media_metadata.sql',
  'supabase/migrations/20260924120338_complete_catalog_title_metadata.sql',
  'supabase/migrations/20261016223445_growth_guest_sessions_20261016.sql',
  'supabase/migrations/20261018145723_durable_match_exclusions.sql',
  'supabase/migrations/20261018145959_align_durable_exclusion_source.sql',
  'supabase/migrations/20261019200625_lifetime_match_exclusions.sql'])await db.exec(read(file));
 if(apply)await db.exec(read(migration));
 return db;
}
async function as(db,id){await db.exec(id?'set role authenticated':'reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);}
async function call(db,name,args){return (await db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) result`,args)).rows[0].result;}
const portfolio=(db,action,payload={})=>call(db,'portfolio_action',[action,JSON.stringify(payload)]);
const quick=(db,action,payload)=>call(db,'growth_together_service',[action,JSON.stringify(payload)]);
async function resolve(db,item){return (await db.query('select match_private.canonical_session_title($1::jsonb) item',[JSON.stringify(item)])).rows[0].item;}
async function metadata(db,item,id,kind='movie',extra={}){
 const row={source_key:`tmdb:${kind}:${id}`,title:item.title,normalized_title:norm(item.title),year:item.year,
  media_kind:kind,tmdb_id:id,source:'tmdb',source_updated_at:'2026-01-01T00:00:00Z',...extra};
 await db.query(`insert into public.catalog_media_metadata(source_key,title,normalized_title,year,media_kind,tmdb_id,source,source_updated_at)
 values($1,$2,$3,$4,$5,$6,$7,$8)`,Object.values(row));
}
async function catalog(db,key,item){await db.query('insert into match_private.catalog values($1,$2::jsonb)',[key,JSON.stringify(item)]);}
async function pair(db,code,choices=prefs){await db.query('insert into match_private.pair_matches(code,host,guest,host_prefs,guest_prefs) values($1,$2,$3,$4::jsonb,$4::jsonb)',[code,ALICE,BOB,JSON.stringify(choices)]);}
async function invite(db,exclusions=[]){
 const request={actor_id:ALICE,token_hash:'a'.repeat(64),prefs,exclusions,name:'Host'};
 assert.equal((await quick(db,'create',request)).ok,true);
 assert.equal((await quick(db,'join',{...request,actor_id:BOB,exclusions:[],guest_key_hash:'b'.repeat(64)})).ok,true);
 return request;
}

test('exact normalized title/year/type resolves while remakes and movie/TV numeric IDs remain distinct',async()=>{
 const db=await setup();try{
  const original=movie('Café: Work!',1980),remake=movie('Café: Work!',2020),series={...original,cats:['series']};
  await metadata(db,original,1101);await metadata(db,remake,1102);await metadata(db,series,1101,'tv');
  for(const [item,identity] of [[original,'tmdb:movie:1101'],[remake,'tmdb:movie:1102'],[series,'tmdb:tv:1101']]){
   const resolved=await resolve(db,item);assert(resolved.identityKeys.includes(identity));
   assert.equal(resolved.kind,identity.split(':')[1]);assert.equal(resolved.tmdbId,Number(identity.split(':')[2]));
   assert.deepEqual(resolved.cats,item.cats);assert.equal(resolved.title,item.title);
  }
  assert.equal(await resolve(db,movie('Café: Work!',1981)),null,'nearby years never guess the original');
  assert.equal(await resolve(db,movie('Cafe Work Extra',1980)),null,'partial or fuzzy title matches never resolve');
 }finally{await db.close();}
});

test('missing years, ambiguous metadata, unverified sources and conflicting exact IDs fail closed',async()=>{
 const db=await setup();try{
  const ambiguous=movie('Ambiguous Identity');await metadata(db,ambiguous,1201);await metadata(db,ambiguous,1202);
  const unverified=movie('Wrong Source');await metadata(db,unverified,1203,'movie',{source:'itunes'});
  const mismatched=movie('Wrong Source Key');await metadata(db,mismatched,1204,'movie',{source_key:'tmdb:tv:1204'});
  const missing=movie('Missing Year');await metadata(db,missing,1205);
  for(const item of [ambiguous,unverified,mismatched,{...missing,year:undefined},movie('No Metadata'),{title:'Unknown Minimal Title'},
   {...movie('Conflicting IDs'),identityKeys:['tmdb:movie:1206','tmdb:tv:1206']},
   {...movie('Unsafe ID'),identityKeys:['tmdb:movie:9007199254740992']},
   {...movie('Unsafe Mixed ID'),identityKeys:['tmdb:movie:1208','tmdb:movie:9007199254740992']}])assert.equal(await resolve(db,item),null);
  const nullTimestamp=movie('Stable Verified Identity');await metadata(db,nullTimestamp,1207,'movie',{source_updated_at:null});
  assert((await resolve(db,nullTimestamp)).identityKeys.includes('tmdb:movie:1207'),'stable verified source identity has no artificial freshness threshold');
 }finally{await db.close();}
});

test('verified frontend IDs bypass cache absence while non-audiovisual paths retain their source identities',async()=>{
 const db=await setup();try{
  for(const item of [{title:'Exact Frontend',kind:'movie',tmdbId:1301},
   {title:'Exact Nested TV',_tmdb:{kind:'tv',tmdbId:1301}},
   {title:'Exact Identity Keys',identityKeys:['tmdb:movie:1302']},
   {title:'Exact Metadata TV',_catalogMedia:{media_kind:'tv',tmdb_id:1302}}]){
   const resolved=await resolve(db,item);assert(resolved.identityKeys.some(key=>key.startsWith('tmdb:')));
   assert.equal((await db.query('select match_private.record_session_title($1::uuid[],$2::jsonb,$3) accepted',[[ALICE],JSON.stringify(item),'fixture:frontend'])).rows[0].accepted,true);
  }
  for(const cats of [['podcast'],['music album'],['Spotify playlist'],['audiobook'],['YouTube channel'],['YouTube Shorts'],['News'],['Sports'],['Cooking & Recipes'],['Fitness & Wellness']]){
   const item={title:'Non audiovisual '+cats[0],cats};assert.deepEqual(await resolve(db,item),item);
  }
 }finally{await db.close();}
});

test('ordinary session recording resolves legacy raw candidates before lifetime checks and stores exact identity',async()=>{
 const db=await setup();try{
  const raw=movie('Catalog Source Name');await metadata(db,raw,1401);
  await as(db,ALICE);await portfolio(db,'remember',{items:[{title:'Nome Traduzido',kind:'movie',tmdbId:1401,action:'dislike'}]});
  await portfolio(db,'forget',{title:'Nome Traduzido'});
  const session=await call(db,'create_match_session',['Host',JSON.stringify(prefs)]);
  assert.equal((await call(db,'set_match_session_result',[session.code,JSON.stringify(raw)])).error,'already_known');
  assert.equal((await call(db,'get_match_session',[session.code])).result,null);
  await as(db,null);
  assert.equal((await db.query('select match_private.record_session_title($1::uuid[],$2::jsonb,$3) accepted',[[BOB],JSON.stringify(raw),'fixture:fresh'])).rows[0].accepted,true);
  const stored=(await db.query('select item from match_private.title_exclusions where user_id=$1',[BOB])).rows[0].item;
  assert(stored.identityKeys.includes('tmdb:movie:1401'));
  assert.equal((await db.query('select match_private.record_session_title($1::uuid[],$2::jsonb,$3) accepted',[[BOB],JSON.stringify({title:'New Locale',kind:'movie',tmdbId:1401}),'fixture:repeat'])).rows[0].accepted,false);
 }finally{await db.close();}
});

test('friend candidates resolve before exclusions and publish only verified fresh identities under unchanged criteria',async()=>{
 const db=await setup();try{
  const known=movie('Catalog Known Name'),fresh=movie('Fresh Correct Criteria');
  await metadata(db,known,1501);await metadata(db,fresh,1502);
  await catalog(db,'known',known);await catalog(db,'fresh',fresh);await catalog(db,'unverified',movie('Unverified Candidate'));
  await pair(db,'canonical_friend',{...prefs,mood:'funny'});
  await as(db,ALICE);await portfolio(db,'remember',{items:[{title:'Ancien Titre',identityKeys:['tmdb:movie:1501'],action:'save'}]});
  const result=await call(db,'friends_action',['match',JSON.stringify({code:'canonical_friend'})]);
  assert.equal(result.result.title,fresh.title);assert.equal(result.result.tmdbId,1502);assert(result.result.identityKeys.includes('tmdb:movie:1502'));
  await as(db,null);const exposed=(await db.query("select item from match_private.title_exclusions where item->'identityKeys' ? 'tmdb:movie:1502'")).rows;
  assert.equal(exposed.length,2,'both participants retain the published exact identity');
  await pair(db,'canonical_exhausted');await as(db,ALICE);
  assert.equal((await call(db,'friends_action',['match',JSON.stringify({code:'canonical_exhausted'})])).result,null,'known and unverified candidates never fill an exhausted pool');
 }finally{await db.close();}
});

test('quick Together prepare/commit rejects translated exclusions before publication and handles empty exhaustion',async()=>{
 const db=await setup();try{
  const known=movie('Quick Known Source'),fresh=movie('Quick Fresh Source');
  await metadata(db,known,1601);await metadata(db,fresh,1602);await catalog(db,'quickknown',known);await catalog(db,'quickfresh',fresh);await catalog(db,'quickunknown',movie('Unverified Quick'));
  await as(db,ALICE);await portfolio(db,'remember',{items:[{title:'別のタイトル',kind:'movie',tmdbId:1601,action:'shown'}]});
  await as(db,null);const request=await invite(db);const prepared=await quick(db,'prepare',request);
  assert.deepEqual(prepared.candidates.map(candidate=>candidate.key),['quickfresh']);
  assert(prepared.candidates[0].entry.identityKeys.includes('tmdb:movie:1602'));
  assert.equal((await quick(db,'commit',{...request,revision:prepared.revision,key:'quickknown',outcome:'matched',result:known})).error,'choices_changed');
  await db.exec('update match_private.growth_invites set retry_after=null');
  let retried=await quick(db,'prepare',request);
  for(const mismatch of [{kind:'movie',tmdbId:1699},{kind:'tv',tmdbId:1602}]){
   assert.equal((await quick(db,'commit',{...request,revision:retried.revision,key:'quickfresh',outcome:'matched',result:{...fresh,...mismatch}})).error,'choices_changed','conflicting source identities never inherit the cached identity');
   assert.equal((await quick(db,'status',request)).result,null);
   assert.equal((await db.query("select count(*)::int count from match_private.title_exclusions where item->'identityKeys' ? 'tmdb:movie:1602'")).rows[0].count,0);
   await db.exec('update match_private.growth_invites set retry_after=null');retried=await quick(db,'prepare',request);
  }
  const committed=await quick(db,'commit',{...request,revision:retried.revision,key:'quickfresh',outcome:'matched',result:{...fresh,posterUrl:'https://image.tmdb.org/t/p/w500/source.jpg'}});
  assert.equal(committed.status,'matched');assert.equal(committed.result.tmdbId,1602);assert(committed.result.identityKeys.includes('tmdb:movie:1602'));
  await db.exec('delete from match_private.growth_invites');
  const exhausted=await invite(db);assert.deepEqual((await quick(db,'prepare',exhausted)).candidates,[]);
  assert.equal((await quick(db,'status',exhausted)).result,null);
  assert.equal((await quick(db,'commit',{...exhausted,revision:1,outcome:'no_match'})).status,'no_match');
 }finally{await db.close();}
});

test('quick Together guest-side source exclusions and legacy account history remain effective',async()=>{
 const db=await setup();try{
  const raw=movie('Legacy Saved Name');await metadata(db,raw,1701);await catalog(db,'legacy',raw);
  await db.query('update auth.users set raw_user_meta_data=$1::jsonb where id=$2',[JSON.stringify({saved_list:[raw]}),ALICE]);
  assert.equal((await db.query('select match_private.record_session_title($1::uuid[],$2::jsonb,$3) accepted',[[ALICE],JSON.stringify({title:'Localized Legacy',kind:'movie',tmdbId:1701}),'fixture:legacy'])).rows[0].accepted,false);
  await db.query('delete from match_private.title_exclusions');await db.query("update auth.users set raw_user_meta_data='{}'");
  const request=await invite(db,['tmdb:movie:1701']);assert.deepEqual((await quick(db,'prepare',request)).candidates,[]);
  await db.exec('delete from match_private.growth_invites');
  const next={...request,token_hash:'c'.repeat(64),exclusions:[]};assert.equal((await quick(db,'create',next)).ok,true);
  assert.equal((await quick(db,'join',{...next,actor_id:BOB,guest_key_hash:'d'.repeat(64),exclusions:['tmdb:movie:1701']})).ok,true);
  assert.deepEqual((await quick(db,'prepare',next)).candidates,[]);
 }finally{await db.close();}
});

test('migration reruns preserve function OIDs, privileges, criteria, frozen results and private boundaries',async()=>{
 const db=await setup();try{
  const signatures=['match_private.record_session_title(uuid[],jsonb,text,uuid,text)','match_private.friends_impl(text,jsonb)','public.growth_together_service(text,jsonb)','match_private.criteria_match(jsonb,jsonb)'];
  const snapshot=()=>db.query('select oid,prosrc,proacl::text grants from pg_proc where oid=any($1::regprocedure[]) order by oid',[signatures]);
  const before=await snapshot();await db.exec(read(migration));await db.exec(read(migration));assert.deepEqual((await snapshot()).rows,before.rows);
  const grants=(await db.query("select has_function_privilege('anon','match_private.canonical_session_title(jsonb)','execute') anon_helper,has_function_privilege('authenticated','match_private.canonical_session_title(jsonb)','execute') auth_helper,has_function_privilege('authenticated','public.growth_together_service(text,jsonb)','execute') auth_growth,has_function_privilege('service_role','public.growth_together_service(text,jsonb)','execute') service_growth")).rows[0];
  assert.deepEqual(grants,{anon_helper:false,auth_helper:false,auth_growth:false,service_growth:true});
  await pair(db,'frozen_result');await db.query('update match_private.pair_matches set result=$1::jsonb where code=$2',[JSON.stringify({title:'Historical Frozen Title'}),'frozen_result']);
  await as(db,ALICE);assert.equal((await call(db,'friends_action',['match',JSON.stringify({code:'frozen_result'})])).result.title,'Historical Frozen Title');
  await assert.rejects(resolve(db,movie('Private Helper')),/permission denied/);
  await assert.rejects(db.query('select * from match_private.title_exclusions'),/permission denied/);
 }finally{await db.close();}
});

test('source drift aborts the entire migration without overwriting newer functions',async()=>{
 const db=await setup(false);try{
  const source=(await db.query("select pg_get_functiondef('match_private.friends_impl(text,jsonb)'::regprocedure) definition")).rows[0].definition;
  const changed=source.replace('select c.entry into chosen','select c.entry  into chosen');assert.notEqual(changed,source);await db.exec(changed);
  const before=(await db.query("select oid,prosrc,proacl::text grants from pg_proc where oid in ('match_private.record_session_title(uuid[],jsonb,text,uuid,text)'::regprocedure,'match_private.friends_impl(text,jsonb)'::regprocedure) order by oid")).rows;
  await assert.rejects(db.exec(read(migration)),/Canonical lifetime baseline mismatch/);await db.exec('rollback');
  const after=(await db.query("select oid,prosrc,proacl::text grants from pg_proc where oid in ('match_private.record_session_title(uuid[],jsonb,text,uuid,text)'::regprocedure,'match_private.friends_impl(text,jsonb)'::regprocedure) order by oid")).rows;
  assert.deepEqual(after,before);assert.equal((await db.query("select to_regprocedure('match_private.canonical_session_title(jsonb)') helper")).rows[0].helper,null);
 }finally{await db.close();}
});

test('helper body, security, search path and grant drift are never overwritten on rerun',async()=>{
 const db=await setup();try{
  const signature='match_private.canonical_session_title(jsonb)';
  const original=(await db.query('select pg_get_functiondef($1::regprocedure) definition',[signature])).rows[0].definition;
  const changed=original.replace(' keys:=match_private.session_title_keys(p_item);',' keys :=match_private.session_title_keys(p_item);');
  assert.notEqual(changed,original);
  const snapshot=async()=> (await db.query(`select oid,prosrc,proacl::text grants,proconfig,prosecdef,provolatile
   from pg_proc where oid=any($1::regprocedure[]) order by oid`,[[signature,
   'match_private.record_session_title(uuid[],jsonb,text,uuid,text)',
   'match_private.friends_impl(text,jsonb)','public.growth_together_service(text,jsonb)']])).rows;
  for(const mutation of [changed,
   `alter function ${signature} security definer`,
   `alter function ${signature} set search_path='public'`,
   `grant execute on function ${signature} to authenticated`,
   `alter function ${signature} volatile`]){
   await db.exec(mutation);const before=await snapshot();
   await assert.rejects(db.exec(read(migration)),/Canonical lifetime helper baseline mismatch/);
   await db.exec('rollback');assert.deepEqual(await snapshot(),before,'the newer helper and every existing matcher function survive the rejected rerun');
   await db.exec(original);await db.exec(`revoke all on function ${signature} from public,anon,authenticated`);
  }
  await db.exec(read(migration));
 }finally{await db.close();}
});
