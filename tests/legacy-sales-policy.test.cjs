const {describe,test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {createHash}=require('node:crypto');
const helpers=import('../supabase/functions/_shared/legacy-sales-policy.mjs');
const good=enabled=>({data:{ok:true,enabled,policy_version:'match-tokens-v1'},error:null});
function admin(result){const calls=[];return {calls,async rpc(name,...args){calls.push({name,args});assert.equal(name,'get_matchapp_monetization_config');assert.equal(args.length,0);return result;}};}
const independent=['ad_free','credits_25','credits_75','credits_200','credits_500','kids_matches_5','kids_matches_25','kids_matches_50','kids_credits_25','kids_credits_75','kids_credits_200','jonas_chat_monthly'];
describe('superseded Match new-sales policy gate',()=>{
  test('policy off keeps every legacy adult sale eligible',async()=>{
    const h=await helpers,db=admin(good(false)),p=await h.adultSalesPolicy(db,h.RETIRED_ADULT_PRODUCTS);
    assert.deepEqual(p,{known:true,retired:false});assert.equal(db.calls.length,1);
    for(const key of h.RETIRED_ADULT_PRODUCTS)assert.equal(h.legacySaleAllowed(key,p),true);
  });
  test('server enabled policy retires only the six overlapping Match plans and packs',async()=>{
    const h=await helpers,db=admin(good(true)),p=await h.adultSalesPolicy(db,h.RETIRED_ADULT_PRODUCTS);
    assert.deepEqual(h.RETIRED_ADULT_PRODUCTS,['vip_monthly','vip_annual','business','matches_5','matches_25','matches_50']);
    assert.deepEqual(p,{known:true,retired:true});
    for(const key of h.RETIRED_ADULT_PRODUCTS)assert.equal(h.legacySaleAllowed(key,p),false);
    for(const key of independent)assert.equal(h.legacySaleAllowed(key,p),true);
  });
  test('independent ad-free, Ask AI, Kids and Jonas sales never query the new policy RPC',async()=>{
    const h=await helpers,db={rpc(){throw Error('must not touch the new policy');}};
    for(const key of independent){
      assert.deepEqual(await h.adultSalesPolicy(db,[key]),{known:true,retired:false});
      assert.deepEqual(await h.adultSalesPolicy(db,[key],db),{known:true,retired:false});
    }
  });
  test('a config outage closes only overlapping Match new sales, preserving independent availability',async()=>{
    const h=await helpers;
    for(const response of [{error:{message:'offline'},data:null},good('true'),{data:{ok:true,enabled:false},error:null}]){
      const p=await h.adultSalesPolicy(admin(response),['matches_5',...independent]);
      assert.deepEqual(p,{known:false,retired:true});
      assert.equal(h.legacySaleAllowed('matches_5',p),false);
      for(const key of independent)assert.equal(h.legacySaleAllowed(key,p),true);
    }
    assert.deepEqual(await h.adultSalesPolicy({rpc:async()=>{throw Error('offline');}},['vip_monthly']),{known:false,retired:true});
  });
  test('authenticated purchases use their owned wallet, including QA and Pro while global sales are off',async()=>{
    const h=await helpers;
    for(const reason of ['QA cohort','verified Pro']){
      const db=admin(good(false)),calls=[];
      const own={rpc:async name=>{calls.push(name);return {data:{...good(true).data,authenticated:true}};}};
      assert.deepEqual(await h.adultSalesPolicy(db,['vip_monthly'],own),{known:true,retired:true},reason);
      assert.deepEqual(calls,['match_token_status']);assert.equal(db.calls.length,0);
    }
    const own={rpc:async()=>({data:{...good(false).data,authenticated:true}})};
    assert.deepEqual(await h.adultSalesPolicy(admin(good(true)),['matches_25'],own),{known:true,retired:false});
  });
  test('an authenticated wallet outage or anonymous/malformed reply cannot fall back to the public OFF flag',async()=>{
    const h=await helpers;
    for(const response of [good(false),{data:{...good(false).data,authenticated:false}},{data:{...good(false).data,authenticated:'true'}},{error:{message:'unavailable'},data:null}]){
      const db=admin(good(false));
      assert.deepEqual(await h.adultSalesPolicy(db,['matches_50'],{rpc:async()=>response}),{known:false,retired:true});
      assert.equal(db.calls.length,0);
    }
  });
  test('permanent ad-free ownership is read only for the authenticated owner, independent of temporary VIP/Pro',async()=>{
    const h=await helpers;
    for(const owned of [true,false]){
      const calls=[],db={from(name){calls.push(name);return {select(fields){calls.push(fields);return {eq(field,id){calls.push({field,id});return {maybeSingle:async()=>({data:{ad_free_purchased:owned,is_vip:true,is_business:true,pro_active:true}})};}};}};}};
      assert.deepEqual(await h.adFreePurchaseState(db,'verified-user'),{known:true,owned});
      assert.deepEqual(calls,['profiles','ad_free_purchased',{field:'id',id:'verified-user'}]);
    }
  });
  test('unknown permanent ownership never authorizes a duplicate pass checkout',async()=>{
    const h=await helpers;
    for(const response of [{data:null},{data:{ad_free_purchased:'false'}},{data:{ad_free_purchased:false},error:{message:'offline'}}]){
      const db={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>response})})})};
      assert.deepEqual(await h.adFreePurchaseState(db,'verified-user'),{known:false,owned:false});
    }
  });
  test('client-supplied flags and lookalike product names cannot override the server policy',async()=>{
    const h=await helpers,p=await h.adultSalesPolicy(admin(good(true)),['vip_monthly',{enabled:false}]);
    assert.equal(h.legacySaleAllowed('vip_monthly',p),false);
    for(const value of ['kids_vip_monthly','vip_monthly_extra',null,{},42])assert.equal(h.isRetiredAdultProduct(value),false);
  });
  test('the exact pinned live checkout is preserved apart from the two new-sales gates and helper import',()=>{
    let source=readFileSync(require.resolve('../supabase/functions/stripe-checkout/index.ts'),'utf8');
    assert.ok(source.includes('const policy=await adultSalesPolicy(admin,[body.product],auth);'),'sales use the already authenticated client');
    assert.ok(source.indexOf("if(body.action==='status')")<source.indexOf('// Match token-policy sales guard'),'receipt fulfillment remains outside new-sales policy');
    source=source.replace("import {adultSalesPolicy,legacySaleAllowed,adFreePurchaseState} from '../_shared/legacy-sales-policy.mjs';\n",'');
    source=source.replace("const policy=await adultSalesPolicy(admin,requested);const entries=requested.some((k:string)=>legacySaleAllowed(k,policy))?await catalog(stripe):[];",'const entries=await catalog(stripe);');
    source=source.replaceAll('[k,legacySaleAllowed(k,policy)&&entries.some','[k,entries.some');
    source=source.replace(/;\n  \/\/ Match token-policy sales guard:[\s\S]*?\n  const limit=/,';const limit=');
    assert.equal(createHash('sha256').update(source).digest('hex'),'945bc4748bdc22023b72f50a66b3584a7c68fcbff80597893523bce22f095556');
  });
});
