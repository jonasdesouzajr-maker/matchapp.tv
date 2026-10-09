const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const root=path.join(__dirname,'..','supabase','functions','_shared');
function load(file,exports){
 let code=stripTypeScriptTypes(fs.readFileSync(path.join(root,file),'utf8'),{mode:'transform'});
 code=code.replace(/\bexport\s+(?=(?:async\s+)?function|const|type)/g,'');
 const sandbox={console:{error:()=>{}},Date,Set,Object};
 vm.runInNewContext(code+'\n;globalThis.__tested={'+exports.join(',')+'};',sandbox,{timeout:2500});
 return sandbox.__tested;
}
const owner='12345678-1234-4abc-8123-123456789abc';
const other='87654321-5678-4abc-8123-234567890abc';
const usd='price_1UOci8FRuUuhrLPG5Y6g6ng0';
const brl='price_1UOcmIFRuUuhrLPGShRDWzYn';
const exampleSubscription=(price=usd)=>({
 id:'sub_jonas_test',status:'active',customer:'cus_jonas_test',
 metadata:{matchapp_user:owner,matchapp_product:'jonas_chat_monthly'},
 items:{data:[{price:{id:price},current_period_start:1791500000,current_period_end:1794100000}]},
 cancel_at_period_end:false
});
test('two currency catalog prices validate exact amounts and monthly recurrence',async()=>{
 const {catalog}=load('billing.ts',['catalog']);
 const prices={ [usd]:{id:usd,active:true,currency:'usd',unit_amount:999,recurring:{interval:'month',interval_count:1}},
 [brl]:{id:brl,active:true,currency:'brl',unit_amount:3990,recurring:{interval:'month',interval_count:1}}};
 const stripe={
  paymentLinks:{list:async()=>({data:[],has_more:false})},
  prices:{retrieve:async id=>{if(!prices[id])throw Error('unknown price');return prices[id]}}
 };
 const entries=await catalog(stripe);
 assert.equal(entries.length,2);
 assert.equal(entries.find(x=>x.currency==='usd')?.price,usd);
 assert.equal(entries.find(x=>x.currency==='brl')?.price,brl);
 assert.equal(entries[0].link,null);
 assert.equal(entries[0].mode,'subscription');
});
test('Jonas Checkout receipt requires matching original Stripe session metadata',async()=>{
 const {verifiedCheckout}=load('billing.ts',['verifiedCheckout']);
 const prices={[usd]:{id:usd,active:true,currency:'usd',unit_amount:999,recurring:{interval:'month',interval_count:1}},
 [brl]:{id:brl,active:true,currency:'brl',unit_amount:3990,recurring:{interval:'month',interval_count:1}}};
 const stripe={paymentLinks:{list:async()=>({data:[],has_more:false})},
  prices:{retrieve:async id=>{if(!prices[id])throw Error('other product');return prices[id]}},
  checkout:{sessions:{listLineItems:async()=>({data:[{quantity:1,price:prices[usd]}],has_more:false})}}};
 const session={id:'cs_live_123',status:'complete',payment_status:'paid',mode:'subscription',
  client_reference_id:owner,metadata:{matchapp_product:'jonas_chat_monthly',matchapp_user:owner}};
 const valid=await verifiedCheckout(stripe,session);
 assert.equal(valid?.user,owner);
 assert.equal(valid?.product.key,'jonas_chat_monthly');
 const unsafe=await verifiedCheckout(stripe,{...session,metadata:{matchapp_product:'jonas_chat_monthly',matchapp_user:other}});
 assert.equal(unsafe,null);
 const unbilled=await verifiedCheckout(stripe,{...session,payment_status:'unpaid'});
 assert.equal(unbilled,null);
});
test('subscription delivery uses independent RPC and rejects swapped customer',async()=>{
 const {deliverJonasCheckout,syncJonasSubscription}=load('jonas-billing.ts',['deliverJonasCheckout','syncJonasSubscription']);
 let name='',body;
 const db={rpc:async(n,args)=>{name=n;body=args;return{data:n==='jonas_deliver_checkout'?{delivered:true}:{},error:null}}};
 const sub=exampleSubscription();
 const stripe={subscriptions:{retrieve:async()=>sub}};
 const session={id:'cs_live_AAA',subscription:sub.id};
 const delivered=await deliverJonasCheckout(db,stripe,session,owner);
 assert.equal(delivered.delivered,true);
 assert.equal(name,'jonas_deliver_checkout');
 assert.equal(body.p_user_id,owner);
 assert.equal(body.p_price,usd);
 await assert.rejects(()=>deliverJonasCheckout(db,stripe,session,other),/owner mismatch/i);
 const synced=await syncJonasSubscription({rpc:async()=>({data:true,error:null})},sub,owner);
 assert.equal(synced,true);
});
test('unrecognized prices never grant the Jonas entitlement',async()=>{
 const {jonasPeriod,deliverJonasCheckout}=load('jonas-billing.ts',['jonasPeriod','deliverJonasCheckout']);
 const bad=exampleSubscription('price_wrong');
 assert.equal(jonasPeriod(bad),null);
 await assert.rejects(()=>deliverJonasCheckout({}, {subscriptions:{retrieve:async()=>bad}}, {id:'cs_live_X',subscription:bad.id},owner),/not active/i);
});
