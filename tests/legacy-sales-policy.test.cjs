const {describe,test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {createHash}=require('node:crypto');
const helpers=import('../supabase/functions/_shared/legacy-sales-policy.mjs');
const good=enabled=>({data:{ok:true,enabled,policy_version:'match-tokens-v1'},error:null});
function admin(result){const calls=[];return {calls,async rpc(name,...args){calls.push({name,args});assert.equal(name,'get_matchapp_monetization_config');assert.equal(args.length,0);return result;}};}
describe('legacy adult new-sales policy gate',()=>{
  test('policy off keeps every legacy adult sale eligible',async()=>{
    const h=await helpers,db=admin(good(false)),p=await h.adultSalesPolicy(db,h.RETIRED_ADULT_PRODUCTS);
    assert.deepEqual(p,{known:true,retired:false});assert.equal(db.calls.length,1);
    for(const key of h.RETIRED_ADULT_PRODUCTS)assert.equal(h.legacySaleAllowed(key,p),true);
  });
  test('server enabled policy retires only the exact adult plans and packs',async()=>{
    const h=await helpers,db=admin(good(true)),p=await h.adultSalesPolicy(db,h.RETIRED_ADULT_PRODUCTS);
    assert.deepEqual(p,{known:true,retired:true});
    for(const key of h.RETIRED_ADULT_PRODUCTS)assert.equal(h.legacySaleAllowed(key,p),false);
    for(const key of ['kids_matches_5','kids_matches_25','kids_matches_50','kids_credits_25','kids_credits_75',
      'kids_credits_200','jonas_chat_monthly'])assert.equal(h.legacySaleAllowed(key,p),true);
  });
  test('independent Kids and Jonas sales never query the new policy RPC',async()=>{
    const h=await helpers,db={rpc(){throw Error('must not touch the new policy');}};
    for(const key of ['kids_matches_5','kids_credits_200','jonas_chat_monthly'])
      assert.deepEqual(await h.adultSalesPolicy(db,[key]),{known:true,retired:false});
  });
  test('a config outage fails only adult new sales closed, preserving independent availability',async()=>{
    const h=await helpers;
    for(const response of [{error:{message:'offline'},data:null},good('true'),{data:{ok:true,enabled:false},error:null}]){
      const p=await h.adultSalesPolicy(admin(response),['credits_25','kids_credits_25']);
      assert.deepEqual(p,{known:false,retired:true});
      assert.equal(h.legacySaleAllowed('credits_25',p),false);assert.equal(h.legacySaleAllowed('kids_credits_25',p),true);
    }
    assert.deepEqual(await h.adultSalesPolicy({rpc:async()=>{throw Error('offline');}},['vip_monthly']),{known:false,retired:true});
  });
  test('client-supplied flags and lookalike product names cannot override the server policy',async()=>{
    const h=await helpers,p=await h.adultSalesPolicy(admin(good(true)),['vip_monthly',{enabled:false}]);
    assert.equal(h.legacySaleAllowed('vip_monthly',p),false);
    for(const value of ['kids_vip_monthly','vip_monthly_extra',null,{},42])assert.equal(h.isRetiredAdultProduct(value),false);
  });
  test('the exact pinned live checkout is preserved apart from the two new-sales gates and helper import',()=>{
    let source=readFileSync(require.resolve('../supabase/functions/stripe-checkout/index.ts'),'utf8');
    source=source.replace("import {adultSalesPolicy,legacySaleAllowed} from '../_shared/legacy-sales-policy.mjs';\n",'');
    source=source.replace("const policy=await adultSalesPolicy(admin,requested);const entries=requested.some((k:string)=>legacySaleAllowed(k,policy))?await catalog(stripe):[];",'const entries=await catalog(stripe);');
    source=source.replaceAll('[k,legacySaleAllowed(k,policy)&&entries.some','[k,entries.some');
    source=source.replace(";\n  // Adult token-policy sales guard: receipts and independent products are above this gate.\n  const policy=await adultSalesPolicy(admin,[body.product]);\n  if(!policy.known)return reply({error:'Payment temporarily unavailable'},503);\n  if(!legacySaleAllowed(body.product,policy))return reply({error:'This product is no longer offered',code:'adult_product_retired'},409);\n  const limit=",';const limit=');
    assert.equal(createHash('sha256').update(source).digest('hex'),'945bc4748bdc22023b72f50a66b3584a7c68fcbff80597893523bce22f095556');
  });
});
