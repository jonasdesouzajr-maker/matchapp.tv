'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{randomUUID}=require('node:crypto');
const {JSDOM}=require('jsdom'),{PGlite}=require('@electric-sql/pglite');
const root=path.join(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
const base='supabase/migrations/20261017105237_match_tokens_pro_verified_rewards.sql',followup='supabase/migrations/20261017134014_match_tokens_first_core_value.sql';
let db;
const rpc=async(name,args=[])=> (await db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) as value`,args)).rows[0].value;
test.before(async()=>{
  db=new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
    create table auth.users(id uuid primary key,created_at timestamptz default now(),email_confirmed_at timestamptz default now(),phone_confirmed_at timestamptz,is_anonymous boolean default false);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create table public.profiles(id uuid primary key,is_vip bool default false,is_business bool default false,is_ad_free bool default false,ad_free_purchased bool default false,daily_match_count int default 4,daily_match_date date default current_date,purchased_matches int default 0,credits int default 19,kids_purchased_matches int default 8,kids_credits int default 13,kids_daily_action_count int default 2);
    create table public.match_pack_ledger(user_id uuid,delta int,balance int,pack text,created_at timestamptz default now());
    create table public.credit_ledger(user_id uuid,delta int,balance int,reason text,pack text,created_at timestamptz default now());`);
  await db.exec(read(base));
  const sql=read(followup);assert.ok(sql.length>500,'the real first-core-value follow-up must be implemented, not an empty migration');await db.exec(sql);
  await rpc('set_matchapp_monetization_config',[true,false,['prod_VSP0LagMpQQHIj'],['matchapp_pro']]);
});
test.after(async()=>{if(db)await db.close();});
async function user(){
  await db.exec('reset role');const id=randomUUID();await db.query('insert into auth.users(id) values($1)',[id]);await db.query('insert into public.profiles(id) values($1)',[id]);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);return id;
}
async function client(id,{found=true,route='/ebooks/'}={}){
  const w=new JSDOM('<html lang="en"><body><section id="reading"><button data-ebook-match>Match</button><div data-ebook-note></div><div data-ebook-result></div></section><div id="locked-ad"><ins data-ad-slot="2595698117"></ins></div></body></html>',{url:'https://matchapp.tv'+route,runScripts:'outside-only',pretendToBeVisual:true}).window;
  const calls=[],order=[],toasts=[],rootNode=w.document.getElementById('reading');let sourceFound=found,rendered=0;
  w.MATCH_LANG='en';w.__matchappMatchRunId=1;w.showToast=(...args)=>toasts.push(args);
  w.supabaseClient={auth:{getSession:async()=>({data:{session:{user:{id},access_token:'local-sql-fixture'}}})},rpc:async(name,args)=>{
    assert.ok(['match_token_status','consume_match_token'].includes(name),'unexpected client authority: '+name);calls.push({name,args});
    if(name==='consume_match_token')order.push('debit');
    return {data:await rpc(name,name==='consume_match_token'?[args.p_request_id,args.p_surface]:[])};
  }};
  await db.exec('set role authenticated');w.eval(read('match-tokens.js'));await w.MatchAppTokens.refresh();w.eval(read('ebooks/catalog.js'));
  const book=w.MATCHAPP_EBOOK_CATALOG.find(item=>item.id==='pride-prejudice'),bookPick={book,relaxed:false};
  assert.ok(book);
  const shared={window:w,console,supabaseClient:w.supabaseClient,anonLimitCheck:()=>{throw Error('signed-in policy must not use a guest debit');},updateQuotaBadge:()=>{},showQuotaMessage:()=>{},lastQuotaStatus:null,isUserLoggedIn:false};
  const app=read('app.js'),quotaStart=app.indexOf("async function checkDailyLimit(action = 'match', tokenContext) {"),quotaEnd=app.indexOf('window.checkDailyLimit = checkDailyLimit;',quotaStart)+'window.checkDailyLimit = checkDailyLimit;'.length;
  assert.ok(quotaStart>=0&&quotaEnd>quotaStart);vm.createContext(shared);vm.runInContext(app.slice(quotaStart,quotaEnd),shared);const originalQuota=w.checkDailyLimit;
  const context={window:w,console,prefs:()=>({format:'ebook',access:'free'}),bestBookChoices:()=>{order.push('source');return sourceFound?[bookPick]:[];},choose:()=>sourceFound?bookPick:null,matchNote:()=>'',uniq:values=>[...new Set(values)],read:()=>[],write:()=>order.push('history'),K:{seen:'existing-seen'},
    renderResult:(host,chosen)=>{order.push('reveal');rendered++;assert.equal(chosen,book);const result=host.querySelector('[data-ebook-result]');result.hidden=false;result.innerHTML='<h3></h3><a data-original-book-source href="https://www.gutenberg.org/ebooks/1342">Project Gutenberg</a>';result.querySelector('h3').textContent=chosen.title;},
    renderReadingDiscovery:()=>order.push('source-fallback')};
  const match=read('ebooks/ebook-matcher.js'),start=match.indexOf('async function doMatch(root){'),end=match.indexOf('\nfunction syncBookControls',start);
  assert.ok(start>=0&&end>start);vm.createContext(context);vm.runInContext(match.slice(start,end)+'\nthis.runMatch=doMatch;',context);
  return {w,calls,order,toasts,rootNode,originalQuota,run:()=>context.runMatch(rootNode),rendered:()=>rendered,setFound:value=>{sourceFound=value;},close:()=>w.close()};
}

test('actual Bookworms orchestration and shared quota use SQL first-value state, then gate the fourth lookup before any debit',async()=>{
  const id=await user(),f=await client(id,{route:'/'});
  try{
    assert.equal(f.w.MatchAppTokens.hasValue,false);assert.equal((await rpc('match_token_status')).first_match_pending,true);
    for(let count=1;count<=3;count++){
      f.order.length=0;await f.run();assert.deepEqual(f.order,['source','debit','history','reveal']);assert.equal(f.rendered(),count);
      const wallet=await rpc('match_token_status');assert.equal(wallet.first_match_pending,false);assert.equal(wallet.daily_remaining,3-count);assert.equal(wallet.available_total,3-count);
      assert.equal(f.w.MatchAppTokens.hasValue,true);assert.equal(f.w.document.querySelector('.ma-token-scrim'),null,'a successful result never opens the depletion panel by itself');assert.equal(f.rootNode.querySelectorAll('[data-match-token-balance]').length,1);
    }
    const source=f.rootNode.querySelector('[data-original-book-source]'),href=source.href,ids=f.calls.filter(call=>call.name==='consume_match_token').map(call=>call.args);
    assert.equal(ids.length,3);assert.equal(new Set(ids.map(args=>args.p_request_id)).size,3);assert.ok(ids.every(args=>args.p_surface==='ebook'));
    f.order.length=0;await f.run();assert.deepEqual(f.order,[],'the later depleted attempt stops before source lookup, history and reveal');assert.equal(f.calls.filter(call=>call.name==='consume_match_token').length,3);
    assert.equal(f.w.document.querySelector('.ma-token-scrim').hidden,false);assert.equal(f.rendered(),3);assert.equal(f.rootNode.querySelector('[data-original-book-source]'),source);assert.equal(source.href,href);assert.equal(f.w.checkDailyLimit,f.originalQuota);assert.equal(f.w.__matchappMatchRunId,1);assert.deepEqual(f.toasts,[]);
    assert.equal(await f.w.MatchAppTokens.beforeLookup('match',{surface:'one_match',runId:1}),false,'ebooks also establish first core value for the ordinary One Match gate');assert.equal(f.calls.filter(call=>call.name==='consume_match_token').length,3);
  }finally{f.close();}
  await db.exec('reset role');
  assert.deepEqual((await db.query('select daily_match_count,credits,kids_purchased_matches,kids_credits,kids_daily_action_count from public.profiles where id=$1',[id])).rows[0],{daily_match_count:4,credits:19,kids_purchased_matches:8,kids_credits:13,kids_daily_action_count:2});
  assert.equal((await db.query('select count(*)::int n from matchapp_private.token_uses where user_id=$1',[id])).rows[0].n,3);
  const reloaded=await client(id);
  try{assert.equal(reloaded.w.MatchAppTokens.hasValue,true);await reloaded.run();assert.deepEqual(reloaded.order,[]);assert.equal(reloaded.w.document.querySelector('.ma-token-scrim').hidden,false);assert.equal(reloaded.calls.filter(call=>call.name==='consume_match_token').length,0);}finally{reloaded.close();}
});

test('an unsuccessful reading source leaves the actual SQL first-value promise and all tokens untouched',async()=>{
  const id=await user(),f=await client(id,{found:false});
  try{
    await f.run();assert.deepEqual(f.order,['source','source-fallback']);assert.equal(f.rendered(),0);assert.equal(f.calls.filter(call=>call.name==='consume_match_token').length,0);assert.equal(f.w.MatchAppTokens.hasValue,false);assert.equal(f.w.document.querySelector('.ma-token-scrim'),null);
    const wallet=await rpc('match_token_status');assert.equal(wallet.first_match_pending,true);assert.equal(wallet.available_total,3);assert.equal(f.rootNode.dataset.audioBusy,'0');assert.equal(f.rootNode.querySelector('button').disabled,false);
    f.setFound(true);await f.run();assert.equal(f.rendered(),1);assert.equal((await rpc('match_token_status')).first_match_pending,false);assert.equal((await rpc('match_token_status')).available_total,2);
  }finally{f.close();}
});

test('a server-verified unlimited ebook result establishes core value without consuming a daily or purchased token',async()=>{
  const id=await user(),now=new Date(),expiry=new Date(now.getTime()+86400000);
  await rpc('upsert_pro_entitlement',[id,'stripe','sub_fixture_'+randomUUID().replaceAll('-',''),'prod_VSP0LagMpQQHIj','active',true,expiry.toISOString(),now.toISOString(),now.toISOString(),null,false,true,null,null]);
  const f=await client(id);
  try{
    assert.equal(f.w.MatchAppTokens.hasValue,false);await f.run();const wallet=await rpc('match_token_status');assert.equal(wallet.unlimited,true);assert.equal(wallet.first_match_pending,false);assert.equal(wallet.daily_remaining,3);assert.equal(wallet.purchased_matches,0);assert.equal(wallet.available_total,null);assert.equal(f.w.MatchAppTokens.hasValue,true);assert.equal(f.w.document.querySelector('.ma-token-scrim'),null);
  }finally{f.close();}
  await db.exec('reset role');assert.equal((await db.query('select source from matchapp_private.token_uses where user_id=$1',[id])).rows[0].source,'pro');
});
