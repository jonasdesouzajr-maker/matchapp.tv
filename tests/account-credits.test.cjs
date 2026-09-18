const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),{JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),uid='00000000-0000-4000-8000-000000000011',other='00000000-0000-4000-8000-000000000012',tick=()=>new Promise(r=>setTimeout(r,10));
const extract=(source,start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
test('restored signed-in sessions use server quota for Ask AI and matches without a local paid fallback',async()=>{
 const d=new JSDOM('',{url:'https://matchapp.tv/discover.html',runScripts:'outside-only'}),w=d.window,calls=[];let release,credits=2;
 w.supabaseClient={auth:{getSession:()=>new Promise(r=>release=()=>r({data:{session:{user:{id:uid}}}}))},rpc:async(name,args)=>{calls.push([name,args.p_reason]);return {data:{allowed:true,remaining:0,credits:name==='consume_ai_action'&&args.p_reason==='ask_ai'?--credits:credits,paid_with_credit:name==='consume_ai_action'&&args.p_reason==='ask_ai'}};}};
 w.eval('var supabaseClient=window.supabaseClient,isUserLoggedIn=false,lastQuotaStatus=null;function anonLimitCheck(){throw Error("must not meter a restored account as anonymous")}function updateQuotaBadge(){}function showQuotaMessage(){}');
 w.eval(extract(read('app.js'),'async function checkDailyLimit(','// Live "matches left today"'));
 const ask=w.checkDailyLimit('ask_ai');await tick();assert.equal(calls.length,0);release();assert.equal(await ask,true);
 const match=w.checkDailyLimit();await tick();release();assert.equal(await match,true);assert.deepEqual(calls,[['consume_ai_action','ask_ai'],['consume_ai_action','match']]);assert.equal(credits,1);
 w.supabaseClient.auth.getSession=async()=>({data:{session:{user:{id:uid}}}});w.supabaseClient.rpc=async()=>({error:{message:'offline'}});assert.equal(await w.checkDailyLimit('ask_ai'),false);assert.equal(credits,1);
 assert.match(read('discover.js'),/await checkDailyLimit\('ask_ai'\)/);w.close();
});
function identityWindow(server){const d=new JSDOM('<input id="profile-name" value="Ana"><input id="profile-country" value="Brazil"><input id="profile-dob" value="10/09/1990"><select id="profile-starsign"><option>Virgo</option></select><button id="save-profile-btn"></button>',{url:'https://matchapp.tv/profile/profile.html',runScripts:'outside-only'}),w=d.window;
 w.supabaseClient={auth:{getUser:async()=>({data:{user:{id:uid,user_metadata:{}}}}),getSession:async()=>({data:{session:{user:{id:uid}}}})},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:server.row})})})}),rpc:server.rpc};
 w.eval('var supabaseClient=window.supabaseClient,seenList=[],savedList=[],dislikedList=[],userRatings={},titleNotes={},recentTitles=[];var SESSION_SHOWN=new Set();function promptProfileCompletion(){}function checkAndRenderProfileState(){}');w.checkAndRenderProfileState=()=>{};
 w.eval(extract(read('app.js'),'const REQUIRED_PROFILE_FIELDS =','// Non-blocking nudge'));
 w.eval(extract(read('profile.js'),'function calculateAgeFromDOB(',"document.addEventListener('DOMContentLoaded'"));w.eval(extract(read('profile.js'),'window.saveProfileData = async function()','\nfunction escapeHtml'));
 return d;
}
test('identity remains editable until the awaited save succeeds, then restores from the account on a fresh device',async()=>{
 let complete;const row={full_name:'Ana',country:'Brazil',dob:'10/09/1990',star_sign:'Virgo',age:36,profile_locked:true},server={row,rpc:()=>new Promise(r=>complete=()=>r({data:row}))};
 const first=identityWindow(server),w=first.window,saving=w.saveProfileData();await tick();assert.equal(w.localStorage.getItem('match_profile_locked'),null);assert(w.document.getElementById('save-profile-btn').disabled);complete();await saving;assert.equal(w.localStorage.getItem('match_profile_locked'),'true');
 w.localStorage.clear();await w.hydrateProfileFromAuth({id:uid,user_metadata:{}});assert.equal(w.localStorage.getItem('match_user_dob'),row.dob);assert.equal(w.localStorage.getItem('match_profile_locked'),'true');
 const second=identityWindow(server);await second.window.hydrateProfileFromAuth({id:uid,user_metadata:{}});assert.equal(second.window.localStorage.getItem('match_user_country'),'Brazil');assert.equal(second.window.localStorage.getItem('match_profile_locked'),'true');
 assert.equal(w.calculateAgeFromDOB('31/02/2000'),null);assert.equal(w.calculateAgeFromDOB('10/09/2090'),null);first.window.close();second.window.close();
});
test('failed identity writes do not claim a permanent lock or discard typed fields',async()=>{const d=identityWindow({rpc:async()=>({error:{message:'network'}})}),w=d.window;await w.saveProfileData();assert.equal(w.localStorage.getItem('match_profile_locked'),null);assert.equal(w.document.getElementById('profile-name').value,'Ana');assert.equal(w.document.getElementById('save-profile-btn').disabled,false);w.close();});
test('Ask AI credits and Match allowances are separate, identity is immutable and client-created paid balances are forbidden',async()=>{
 const {PGlite}=await import('@electric-sql/pglite'),db=await PGlite.create();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema match_private;grant usage on schema auth,match_private to authenticated;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table public.profiles(id uuid primary key,full_name text,country text,dob text,star_sign text,age integer,profile_locked boolean default false,avatar_url text,saved_list jsonb,seen_list jsonb,disliked_list jsonb,user_ratings jsonb,watch_contacts jsonb,credits integer default 0,is_vip boolean default false,is_business boolean default false,daily_match_date date,daily_match_count integer default 0);
 create table public.credit_ledger(user_id uuid,delta integer,balance integer,reason text);create function public.profile_is_complete(p public.profiles) returns boolean language sql as $$select p.profile_locked$$;create function public.match_daily_limit_v2(boolean,boolean,boolean) returns integer language sql as $$select 2$$;
 grant select,insert,update on public.profiles to authenticated;alter table public.profiles enable row level security;create policy own_profile on public.profiles to authenticated using(id=auth.uid()) with check(id=auth.uid());insert into public.profiles(id,credits) values('${uid}',2),('${other}',0);`);
 await db.exec(read('supabase/security/account-identity-and-credits.sql'));
 await db.exec(`set role authenticated;set request.jwt.claim.sub='${uid}'`);
 const save=(name='Ana')=>db.query("select public.save_locked_identity($1,'Brazil','10/09/1990','Virgo') r",[name]);assert.equal((await save()).rows[0].r.profile_locked,true);assert.equal((await save('Different')).rows[0].r.full_name,'Ana');
 await assert.rejects(db.query("update public.profiles set profile_locked=false where id=$1",[uid]),/locked/);await assert.rejects(db.query("update public.profiles set country='Other' where id=$1",[uid]),/locked/);
 assert.equal((await db.query('select * from public.profiles where id=$1',[other])).rows.length,0);
 const consume=reason=>db.query('select public.consume_ai_action($1) r',[reason]);let r=(await consume('ask_ai')).rows[0].r;assert.equal(r.allowed,true);assert.equal(r.remaining,1);assert.equal(r.credits,2);
 r=(await consume('match')).rows[0].r;assert.equal(r.allowed,true);assert.equal(r.remaining,0);assert.equal((await db.query('select credits from public.profiles where id=$1',[uid])).rows[0].credits,2);
 r=(await consume('ask_ai')).rows[0].r;assert.equal(r.allowed,true);assert.equal(r.paid_with_credit,true);assert.equal(r.credits,1);
 r=(await consume('match')).rows[0].r;assert.equal(r.allowed,false);assert.equal((await db.query('select credits from public.profiles where id=$1',[uid])).rows[0].credits,1);
 r=(await consume('ask_ai')).rows[0].r;assert.equal(r.allowed,true);assert.equal(r.credits,0);assert.equal((await consume('ask_ai')).rows[0].r.allowed,false);
 await db.exec('reset role');assert.deepEqual((await db.query('select reason from public.credit_ledger')).rows.map(r=>r.reason),['ask_ai','ask_ai']);
 await db.exec(`set role authenticated;set request.jwt.claim.sub='${other}'`);await assert.rejects(db.query("insert into public.profiles(id,credits,is_vip) values('00000000-0000-4000-8000-000000000013',999,true)"),/permission denied/);await assert.rejects(db.query("select public.save_locked_identity('Ana','Brazil','31/02/2000','Virgo')"),/Invalid|date|birthdate/);
 await db.exec('reset role;set role anon');await assert.rejects(save(),/permission denied/);
 }finally{await db.close();}
});
