const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..');
const policy=fs.readFileSync(path.join(root,'matching-policy.js'),'utf8');
const migration=fs.readFileSync(path.join(root,'supabase/migrations/20261018113624_durable_match_exclusions.sql'),'utf8');
function browser(rpc){
 const dom=new JSDOM('<body></body>',{url:'https://matchapp.tv/',runScripts:'outside-only'});
 dom.window.supabaseClient={rpc:rpc||(async()=>({data:{keys:[],history:[]}}))};
 dom.window.eval(policy);return dom;
}
test('a guest can dismiss locally; identity survives translated aliases, reload and late artwork',async()=>{
 const dom=browser(),w=dom.window;
 try{
  await w.matchPolicy.attach(null);
  const movie={title:'Um Título',originalTitle:'One Title',tmdbId:'123',kind:'movie',addedAt:10,reason:'together:source-session'};
  assert.equal(w.matchPolicy.savePreference(movie,'dislike'),true);
  w.matchPolicy.remember({title:'One Title',tmdbId:123,kind:'movie',posterUrl:'https://image.tmdb.org/t/p/w500/valid.jpg',addedAt:20},'shown');
  assert.equal(w.matchPolicy.history().length,1);
  assert.equal(w.matchPolicy.history()[0].action,'dislike');
  assert.equal(w.matchPolicy.history()[0].reason,'together:source-session','late artwork must not erase the session receipt');
  assert(w.matchPolicy.excludes({title:'Different locale',tmdbId:123,kind:'movie'},{hardOnly:true}));
  assert(!w.matchPolicy.excludes({title:'Unrelated series',tmdbId:123,kind:'tv'}),'numeric movie/TV IDs are distinct');
  w.eval(policy);await w.matchPolicy.attach(null);
  assert(w.matchPolicy.excludes({title:'Um Título'}));
  assert(w.matchPolicy.excludes({title:'One Title'}));
  assert(await w.matchPolicy.forget('One Title'));
  assert(!w.matchPolicy.excludes(movie),'explicit restore removes every local alias and preference copy');
 }finally{dom.window.close();}
});
test('failed cloud writes survive reload and are replayed only for their account',async()=>{
 let failing=true;const calls=[];
 const dom=browser(async(name,args)=>{calls.push(args);return args.p_action==='list'?{data:{keys:[],history:[]}}:failing?{error:{message:'offline'}}:{data:{}};}),w=dom.window;
 try{
  await w.matchPolicy.attach({id:'alice'});
  w.matchPolicy.savePreference({title:'Account choice',tmdbId:44,kind:'movie'},'save');
  await w.matchPolicy.flush();
  assert(JSON.parse(w.localStorage.getItem('match_history_pending_alice')).length);
  w.localStorage.removeItem('match_savedList');w.eval(policy);failing=false;
  await w.matchPolicy.attach({id:'alice'});await w.matchPolicy.flush();
  assert.equal(JSON.parse(w.localStorage.getItem('match_history_pending_alice')).length,0);
  assert(calls.some(x=>x.p_action==='remember'&&x.p_payload.items.some(i=>i.title==='Account choice')));
  await w.matchPolicy.attach({id:'bob'});
  assert(!w.matchPolicy.excludes({title:'Account choice'}));
 }finally{dom.window.close();}
});
test('another tab preference is retained when this tab records a new title',async()=>{
 const dom=browser(),w=dom.window;
 try{
  await w.matchPolicy.attach(null);
  w.matchPolicy.remember({title:'First title'},'shown');
  const remote={title:'Second tab choice',action:'dislike',addedAt:20,identityKeys:['secondtabchoice','tmdb:movie:456']};
  const rows=JSON.parse(w.localStorage.getItem('match_history_guest'));rows.push(remote);
  w.localStorage.setItem('match_history_guest',JSON.stringify(rows));
  assert(w.matchPolicy.excludes({title:'New localized name',tmdbId:456,kind:'movie'},{hardOnly:true}));
  w.matchPolicy.remember({title:'Third title'},'shown');
  assert(w.matchPolicy.history().some(x=>x.title===remote.title));
 }finally{dom.window.close();}
});
test('account refresh receives another device dismissal and honors an explicit cloud restore',async()=>{
 let remote=[];
 const dom=browser(async(name,args)=>({data:args.p_action==='list'?{history:remote,keys:remote.map(x=>x.title.toLowerCase().replace(/\W/g,''))}:{}})),w=dom.window;
 try{
  await w.matchPolicy.attach({id:'alice'});
  remote=[{title:'Cloud Choice',action:'dislike',addedAt:30,identityKeys:['cloudchoice','tmdb:movie:987']}];
  await w.matchPolicy.refresh(true);
  assert(w.matchPolicy.excludes({title:'Localized Choice',tmdbId:987,kind:'movie'},{hardOnly:true}));
  w.localStorage.setItem('match_dislikedList',JSON.stringify(remote));
  w.sessionStorage.setItem('match_sessionShown',JSON.stringify(['Cloud Choice']));
  remote=[];await w.matchPolicy.refresh(true);
  assert(!w.matchPolicy.excludes({title:'Cloud Choice'}));
  assert.deepEqual(JSON.parse(w.localStorage.getItem('match_dislikedList')),[]);
  assert.deepEqual(JSON.parse(w.sessionStorage.getItem('match_sessionShown')),[]);
 }finally{dom.window.close();}
});
test('cloud hydration coalesces differently localized copies while retaining the explicit action',async()=>{
 let remote=[];const writes=[];
 const dom=browser(async(name,args)=>{if(args.p_action==='remember')writes.push(...args.p_payload.items);return {data:args.p_action==='list'?{history:remote,keys:[]}:{}};}),w=dom.window;
 try{
  await w.matchPolicy.attach({id:'alice'});
  w.matchPolicy.remember({title:'Original version',tmdbId:77,kind:'movie',addedAt:1},'dislike',false);
  remote=[{title:'Localized version',action:'shown',addedAt:2,identityKeys:['localizedversion','tmdb:movie:77']}];
  await w.matchPolicy.refresh(true);
  assert.equal(w.matchPolicy.history().length,1);assert.equal(w.matchPolicy.history()[0].action,'dislike');
  for(let i=0;i<45;i++)w.matchPolicy.remember({title:'Locale version '+i,tmdbId:77,kind:'movie'},'shown',false);
  const item=w.matchPolicy.history()[0];assert(item.identityKeys.includes('tmdb:movie:77'),'source identity survives many title spellings');
  await w.matchPolicy.flush();assert(writes.every(row=>row.identityKeys.length<=40),'outgoing payload remains bounded without truncating local exclusion identity');
  assert(w.matchPolicy.excludes({title:'Original version'},{hardOnly:true}));
 }finally{dom.window.close();}
});
test('the actual Home guest Not For Me handler excludes instead of opening registration',async()=>{
 const dom=browser(),w=dom.window,app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 let authOpened=0,shownForm=0,synced=0;
 try{
  w.document.body.innerHTML='<div id="result-box"></div><select id="q-category"><option value="movie">Movie</option></select>';
  w.currentMatchIdentity={title:'Guest Film',tmdbId:321,kind:'movie'};
  w.openAuthModal=()=>authOpened++;w.goToQuestionnaire=()=>shownForm++;
  const context=vm.createContext({window:w,document:w.document,localStorage:w.localStorage,isUserLoggedIn:false,
   globalMatchTitle:'Guest Film',globalMatchPoster:'https://image.tmdb.org/t/p/w500/film.jpg',globalPlatform:'any',
   savedList:[],dislikedList:[],seenList:[],userRatings:{},PLATFORMS:{},isAudioCategory:()=>false,
   inList:(list,title)=>list.some(item=>item.title===title),getBlockedCategories:()=>[],platformSearchUrl:()=>'',
   showToast:()=>{},alert:()=>authOpened++,syncListsToDatabase:()=>{synced++;},tSafe:(_,fallback)=>fallback,
   updateActionButtonStates:()=>{}});
  vm.runInContext(app.slice(app.indexOf('window.recordAction = async function(type)'),app.indexOf('// PRIVATE TITLE NOTES',app.indexOf('window.recordAction = async function(type)'))),context);
  await w.recordAction('dislike');
  assert.equal(authOpened,0);assert.equal(shownForm,1);assert.equal(synced,1);
  assert(w.matchPolicy.excludes({title:'Other locale',tmdbId:321,kind:'movie'},{hardOnly:true}));
  assert.equal(w.document.getElementById('result-box').style.display,'none');
 }finally{dom.window.close();}
});
test('an old metadata reply cannot overwrite a newer result or its exact remake artwork',async()=>{
 const dom=browser(),w=dom.window,app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 let releaseOld;const verifiedLookups=[];
 try{
  w.document.body.innerHTML=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8')).window.document.body.innerHTML;
  w.__matchappMatchRunId=1;
  const no=()=>{};
  class Probe{constructor(){this.naturalWidth=500;}set src(value){this.value=value;queueMicrotask(()=>this.onload?.());}get src(){return this.value;}}
  const context=vm.createContext({window:w,document:w.document,CustomEvent:w.CustomEvent,Image:Probe,
   CONTENT_CATALOG:[],globalMatchTitle:'',globalMatchPoster:'',globalPlatform:'',PLATFORMS:{},
   sanitizeDisplayText:value=>String(value||''),generatedCover:()=> 'data:image/svg+xml,<svg/>',
   exactSpotifyPlaylistCover:()=>null,getCuratedPoster:async()=>null,
   getVerifiedPoster:title=>{verifiedLookups.push(title);return null;},
   getRichMetadata:()=>new Promise(resolve=>{releaseOld=resolve;}),getRealCoverImage:async()=>null,
   isHighRiskCategory:()=>false,isAudioCategory:()=>false,renderQuotaCorner:no,renderMatchCriteria:no,
   hydrateTitleFacts:no,renderNotePanel:no,isShareRestrictedTitle:()=>false,updateShareButtonState:no,
   applyAudioModeLabels:no,updateActionButtonStates:no,rememberShownTitle:item=>w.matchPolicy.remember(item,'shown'),
   requestAnimationFrame:no,matchMedia:()=>({matches:false}),tSafe:(_,fallback)=>fallback});
  vm.runInContext(app.match(/async function renderResult\([\s\S]*?\n}\n/)[0],context);
  const first=context.renderResult({title:'Slow old result',synopsis:'First',synopsisLang:'en',cats:['movie'],platform:'any'});
  await new Promise(resolve=>setImmediate(resolve));assert.equal(typeof releaseOld,'function');
  w.__matchappMatchRunId=2;
  const exact={title:'The Gentlemen',synopsis:'Movie edition',synopsisLang:'en',cats:['movie'],year:2019,platform:'any',_tmdbId:522627,_tmdbKind:'movie',_meta:{tmdbId:522627,kind:'movie',artwork:'https://image.tmdb.org/t/p/w780/exact-movie.jpg'}};
  await context.renderResult(exact);
  releaseOld({artwork:'https://image.tmdb.org/t/p/w780/old.jpg'});await first;
  assert.equal(w.globalMatchTitle,'The Gentlemen');
  assert.match(w.document.getElementById('res-poster-img').src,/exact-movie.jpg$/);
  assert(!verifiedLookups.includes('The Gentlemen'),'a title-only registry must not replace pinned movie art with same-name TV art');
  assert(w.matchPolicy.excludes({title:'Other local title',tmdbId:522627,kind:'movie'}));
 }finally{dom.window.close();}
});
test('curated streaming claims require the exact work in the viewer country',async()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const extract=name=>app.match(new RegExp('(async )?function '+name+'\\([\\s\\S]*?\\n}\\n'))[0];
 let region='BR',lookups=0;
 let meta={tmdb_id:321,media_kind:'movie',poster_large_url:'https://image.tmdb.org/t/p/w780/exact.jpg',availability:{US:{stream:['Netflix']}}};
 const context=vm.createContext({window:{MatchAppCountry:{regionCode:()=>region},MatchAppCatalogMedia:{lookupLive:async(title,opts)=>{lookups++;assert.equal(opts.tmdbId,321);return meta;}}},
  getCatalogTmdbIdentity:async()=>({tmdbId:321,kind:'movie',year:2020}),getCuratedPoster:async()=>null});
 vm.runInContext(['normCriteria','canonicalProviderName','exactSpotifyPlaylistCover','verifyCuratedPlatform'].map(extract).join('\n'),context);
 const film={title:'Exact film',cats:['movie'],platform:'Netflix',source:'catalog',platformVerified:true};
 assert.equal(await context.verifyCuratedPlatform(film,{plat:['Netflix']}),null,'US streaming evidence cannot prove Brazil availability');
 region='';assert.equal(await context.verifyCuratedPlatform(film,{plat:['Netflix']}),null,'an unknown country cannot be silently inferred');
 region='BR';meta.availability.BR={stream:['Netflix']};
 let verified=await context.verifyCuratedPlatform(film,{plat:['Netflix']});
 assert.equal(verified.platformVerified,true);assert.equal(verified._tmdbId,321);assert.match(verified._meta.artwork,/exact.jpg$/);
 meta={...meta,tmdb_id:999};assert.equal(await context.verifyCuratedPlatform(film,{plat:['Netflix']}),null,'same-title metadata cannot swap a pinned work');
 assert.equal((await context.verifyCuratedPlatform(film,{plat:[]})).platformVerified,false,'unselected catalogue labels remain unverified');
 const official={...film,platform:'Mercado Play',availabilityRegions:['BR'],watchUrl:'https://play.mercadolivre.com.br/assistir/exact/id'};
 const before=lookups;assert.equal((await context.verifyCuratedPlatform(official,{plat:['Mercado Play']})).platformVerified,true);assert.equal(lookups,before);
 region='US';assert.equal(await context.verifyCuratedPlatform(official,{plat:['Mercado Play']}),null);
});
test('Postgres preserves exclusion identities and explicit choices without exposing another account',async()=>{
 const {PGlite}=await import('@electric-sql/pglite');const db=await PGlite.create();
 const alice='11111111-1111-4111-8111-111111111111',bob='22222222-2222-4222-8222-222222222222';
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
   create table auth.users(id uuid primary key,email text,is_anonymous boolean default false,raw_user_meta_data jsonb default '{}'::jsonb);
   grant usage on schema auth to authenticated;
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create table public.profiles(id uuid primary key,saved_list jsonb default '[]',seen_list jsonb default '[]',disliked_list jsonb default '[]',user_ratings jsonb default '{}');
   insert into auth.users(id) values('${alice}'),('${bob}');insert into public.profiles(id) values('${alice}'),('${bob}');`);
  await db.exec(fs.readFileSync(path.join(root,'supabase/security/private-friends-and-history.sql'),'utf8'));
  await db.exec(fs.readFileSync(path.join(root,'supabase/security/compact-portfolio-auth.sql'),'utf8'));
  await db.exec(fs.readFileSync(path.join(root,'supabase/migrations/005_match_together.sql'),'utf8'));
  await db.exec(fs.readFileSync(path.join(root,'supabase/migrations/20261016223445_growth_guest_sessions_20261016.sql'),'utf8'));
  await db.exec(migration);
  const as=async id=>db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${id}',false)`);
  const call=async(action,payload={})=>(await db.query('select public.portfolio_action($1,$2::jsonb) as result',[action,JSON.stringify(payload)])).rows[0].result;
  await as(alice);
  await call('remember',{items:[{title:'Título de Alice',originalTitle:'Alice Film',action:'dislike',addedAt:10,identityKeys:['tmdb:movie:123','alicefilm']}]});
  await call('remember',{items:[{title:'Alice Film',action:'shown',addedAt:20,identityKeys:['tmdb:movie:123'],posterUrl:'https://image.tmdb.org/t/p/w500/source.jpg'}]});
  let result=await call('list');
  assert.equal(result.history.length,1);assert.equal(result.history[0].action,'dislike');
  assert(result.keys.includes('tmdb:movie:123'));assert(result.keys.includes('alicefilm'));
  assert.match(result.history[0].posterUrl,/source.jpg$/);
  await assert.rejects(db.query('select * from match_private.title_exclusions'),/permission denied/);
  assert.equal((await db.query("select has_function_privilege('authenticated','match_private.merge_exclusion_item(jsonb,jsonb)','execute') as permitted")).rows[0].permitted,false);
  await as(bob);assert.equal((await call('list',{user_id:alice})).history.length,0);
  await call('remember',{user_id:alice,items:[{title:'Bob Film',action:'save',addedAt:30}]});
  await db.exec('reset role');
  await db.query("insert into match_private.catalog(title_key,entry) values('alicefilm',$1::jsonb),('bobfilm',$2::jsonb)",[JSON.stringify({title:'Alice Film',cats:['movie']}),JSON.stringify({title:'Bob Film',cats:['movie']})]);
  await db.query('insert into match_private.pair_matches(code,host,guest,host_prefs,guest_prefs) values($1,$2,$3,$4::jsonb,$4::jsonb)',['pair',alice,bob,JSON.stringify({cat:['movie']})]);
  await as(bob);
  const paired=async()=>(await db.query("select public.friends_action('match','{\"code\":\"pair\"}'::jsonb) as result")).rows[0].result;
  assert.equal((await paired()).result,null,'both participants exclude their own title, including translated aliases');
  await call('forget',{title:'Bob Film'});
  assert.equal((await paired()).result.title,'Bob Film');
  await as(alice);assert.equal((await call('list')).history.find(x=>x.identityKeys.includes('tmdb:movie:123')).action,'dislike');
  await db.exec('reset role');
  await db.query("update public.profiles set disliked_list=$1::jsonb,user_ratings=$2::jsonb where id=$3",[JSON.stringify([{title:'Título de Alice',identityKeys:['tmdb:movie:123']}]),JSON.stringify({'Alice Film':1}),alice]);
  await as(alice);await call('forget',{title:'Alice Film'});
  assert(!(await call('list')).keys.includes('tmdb:movie:123'));
  await db.exec('reset role');
  const profile=(await db.query('select disliked_list,user_ratings from public.profiles where id=$1',[alice])).rows[0];
  assert.deepEqual(profile.disliked_list,[]);assert.deepEqual(profile.user_ratings,{});
  // Legacy account choices must upgrade a passive row on hydration.
  await as(alice);
  await call('remember',{items:[{title:'Legacy Saved',action:'shown',addedAt:50},{title:'Legacy Declined',action:'shown',addedAt:50}]});
  await db.exec('reset role');
  await db.query('update auth.users set raw_user_meta_data=$1::jsonb where id=$2',[JSON.stringify({saved_list:[{title:'Legacy Saved'}],disliked_list:[{title:'Legacy Declined'}]}),alice]);
  await as(alice);
  result=await call('list');
  assert.equal(result.history.find(x=>x.title==='Legacy Saved').action,'save');
  assert.equal(result.history.find(x=>x.title==='Legacy Declined').action,'dislike');
  await assert.rejects(call('claim',{ownerId:bob,items:[{title:'Wrong account'}],token:'claim_wrong_account'}),/Account changed/);
  // Two actual clients issue simultaneous claims to the PostgreSQL RPC.
  const client1=browser(async(name,args)=>({data:await call(args.p_action,args.p_payload)}));
  const client2=browser(async(name,args)=>({data:await call(args.p_action,args.p_payload)}));
  try{
   await Promise.all([client1.window.matchPolicy.attach({id:alice}),client2.window.matchPolicy.attach({id:alice})]);
   const outcomes=await Promise.all([
    client1.window.matchPolicy.claim({title:'Concurrent Original',tmdbId:500,kind:'movie'}),
    client2.window.matchPolicy.claim({title:'Concurrent Localized',tmdbId:'500',kind:'movie'})
   ]);
   assert.equal(outcomes.filter(Boolean).length,1,'only one client may accept the same source identity');
   const winner=outcomes[0]?client1:client2,loser=outcomes[0]?client2:client1;
   assert(loser.window.matchPolicy.excludes({title:'Third locale',tmdbId:500,kind:'movie'}));
   const item={title:outcomes[0]?'Concurrent Original':'Concurrent Localized',tmdbId:500,kind:'movie'};
   assert(await winner.window.matchPolicy.releaseClaim(item),'an unshown quota refusal releases only this reservation');
   assert(!(await call('list')).keys.includes('tmdb:movie:500'));
   assert(await winner.window.matchPolicy.claim(item));
   winner.window.matchPolicy.remember(item,'shown');await winner.window.matchPolicy.flush();
   assert.equal(await winner.window.matchPolicy.releaseClaim(item),false,'displayed history cannot be released as an unused reservation');
  }finally{client1.window.close();client2.window.close();}
  // Reading is separately serialized by ID and cannot block a film title.
  result=await call('reading_remember',{ownerId:alice,items:[{id:'reading-book',action:'save'},{id:'reading-other',action:'dislike'}]});
  assert.deepEqual(result.saved,['reading-book']);assert.deepEqual(result.disliked,['reading-other']);
  assert.equal((await call('reading_claim',{id:'reading-book',token:'reading_claim_known'})).claimed,false);
  const readingClaims=await Promise.all([call('reading_claim',{id:'fresh-book',token:'reading_claim_first'}),call('reading_claim',{id:'fresh-book',token:'reading_claim_second'})]);
  assert.equal(readingClaims.filter(x=>x.claimed).length,1);
  await call('reading_release',{id:'fresh-book',token:'reading_claim_second'});
  assert((await call('reading_list')).reserved.includes('fresh-book'),'a loser cannot release another request reservation');
  await call('reading_release',{id:'fresh-book',token:'reading_claim_first'});assert.equal((await call('reading_claim',{id:'fresh-book',token:'reading_claim_third'})).claimed,true);
  await call('reading_release',{id:'fresh-book',token:'reading_claim_first'});
  assert((await call('reading_list')).reserved.includes('fresh-book'),'a stale release cannot remove a newer reservation');
  await call('reading_forget',{id:'reading-book'});
  result=await call('reading_remember',{items:[{id:'reading-book',action:'save',legacy:true}]});
  assert(!result.saved.includes('reading-book'),'a stale hydration replay cannot undo explicit cloud restore');
  assert(result.restored.includes('reading-book'));
  assert(!(await call('list')).keys.includes('readingbook'),'reading IDs never enter audiovisual identities');
  await assert.rejects(db.query('select * from match_private.reading_portfolios'),/permission denied/);
  // An already-open old client can still replace its bounded auth arrays.
  // That must not erase canonical saved-only history or reverse restoration.
  await db.exec('reset role');
  await db.query("update auth.users set raw_user_meta_data=raw_user_meta_data||$1::jsonb where id=$2",[JSON.stringify({match_ebook_saved:['legacy-saved-only']}),alice]);
  await as(alice);assert((await call('reading_list')).saved.includes('legacy-saved-only'));
  await db.exec('reset role');
  await db.query("update auth.users set raw_user_meta_data=raw_user_meta_data||'{\"match_ebook_saved\":[],\"match_ebook_disliked\":[]}'::jsonb where id=$1",[alice]);
  await as(alice);
  assert((await call('reading_list')).saved.includes('legacy-saved-only'),'legacy array replacement cannot erase canonical exclusions');
  assert.equal((await call('reading_claim',{id:'legacy-saved-only',token:'legacy_client_claim'})).claimed,false);
  await call('reading_forget',{id:'legacy-saved-only'});
  await db.exec('reset role');
  await db.query("update auth.users set raw_user_meta_data=raw_user_meta_data||$1::jsonb where id=$2",[JSON.stringify({match_ebook_saved:['legacy-saved-only']}),alice]);
  await as(alice);result=await call('reading_list');
  assert(!result.saved.includes('legacy-saved-only'));assert(result.restored.includes('legacy-saved-only'),'a stale old-client write cannot undo explicit restore');
  await as(bob);assert.deepEqual((await call('reading_list')).saved,[]);
  await assert.rejects(call('reading_remember',{ownerId:alice,id:'bad-account-write',action:'save'}),/Account changed/);
 }finally{await db.close();}
});
