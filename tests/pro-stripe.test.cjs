const test=require('node:test');
const assert=require('node:assert/strict');
let core,service;
test.before(async()=>{core=await import('../supabase/functions/_shared/pro-core.mjs');service=await import('../supabase/functions/_shared/pro-stripe.mjs');});
const user='01234567-89ab-4cde-8fab-0123456789ab';
const other='11234567-89ab-4cde-8fab-0123456789ab';
function fixture(country='BR'){
  const row=core.market(country);
  const price={id:row.priceId,active:true,product:core.PRO_PRODUCT,currency:row.currency,unit_amount:row.amount,
    livemode:true,type:'recurring',billing_scheme:'per_unit',recurring:{interval:'month',interval_count:1,usage_type:'licensed'}};
  const start=1792232100,end=1794910500;
  const invoice={id:'in_pro',livemode:true,status:'paid',paid:true,subscription:'sub_pro',customer:'cus_pro',currency:row.currency,
    amount_remaining:0,charge:{id:'ch_pro',refunded:false,disputed:false},lines:{data:[{price,quantity:1,proration:false,period:{start,end}}]}};
  const sub={id:'sub_pro',livemode:true,customer:'cus_pro',status:'active',metadata:{matchapp_user:user,matchapp_product:'pro_monthly'},
    items:{data:[{price,quantity:1,current_period_start:start,current_period_end:end}]},latest_invoice:invoice,cancel_at_period_end:false};
  const session={id:'cs_live_pro',livemode:true,client_reference_id:user,metadata:{matchapp_user:user,matchapp_product:'pro_monthly'},
    mode:'subscription',payment_status:'paid',status:'complete',subscription:'sub_pro',customer:'cus_pro',currency:row.currency};
  return {row,price,sub,invoice,session,lines:[{price,quantity:1}]};
}
function fakeProvider(f){
  const calls=[];
  const stripe={subscriptions:{retrieve:async id=>{calls.push(['subscription',id]);return f.sub;}},
    checkout:{sessions:{retrieve:async id=>{calls.push(['checkout',id]);return f.session;},listLineItems:async()=>({has_more:false,data:f.lines})}},
    invoices:{retrieve:async()=>f.invoice},disputes:{list:async()=>({has_more:false,data:[{status:'won'}]})},charges:{retrieve:async()=>f.invoice.charge}};
  return {stripe,calls};
}
test('Pro catalog uses five exact live monthly prices and integer minor units',()=>{
  for(const row of core.PRO_PRICE_ROWS){const f=fixture(row.country);assert.deepEqual(core.catalogOffer(f.price,row.country),{...row,fractionDigits:2,interval:'month',intervalCount:1});}
  assert.equal(core.market('pt-BR').country,'US');assert.equal(core.market('BR').amount,990);assert.equal(core.market('IN').amount,9900);
});
test('edited price, arbitrary product, test price and yearly terms cannot pass paid identity',()=>{
  const f=fixture();
  for(const change of [{unit_amount:99000},{currency:'usd'},{product:'prod_other'},{livemode:false},{transform_quantity:{divide_by:2}},
    {recurring:{interval:'year',interval_count:1,usage_type:'licensed'}}])assert.equal(core.approvedPrice({...f.price,...change}),null);
  assert.equal(core.catalogOffer({...f.price,active:false},'BR'),null);
  assert.ok(core.approvedPrice({...f.price,active:false}),'an archived price must not remove an existing paid benefit');
});
test('checkout binds receipt, customer, subscription, quantity, exact product and authenticated owner',()=>{
  const f=fixture();assert.ok(core.verifiedCheckoutIdentity(f.session,f.sub,f.lines,user));
  for(const change of [{client_reference_id:other},{customer:'cus_other'},{subscription:'sub_other'},{payment_status:'unpaid'},
    {metadata:{matchapp_user:other,matchapp_product:'pro_monthly'}},{currency:'usd'}])
    assert.equal(core.verifiedCheckoutIdentity({...f.session,...change},f.sub,f.lines,user),null);
  assert.equal(core.verifiedCheckoutIdentity(f.session,f.sub,[{price:f.price,quantity:2}],user),null);
  assert.equal(core.verifiedCheckoutIdentity(f.session,f.sub,f.lines,other),null);
});
test('only a paid invoice covering this period can grant Pro; failed, refunded, disputed and old periods cannot',()=>{
  const f=fixture(),identity=core.subscriptionIdentity(f.sub);assert.ok(core.invoicePaidForPeriod(f.invoice,identity));
  for(const change of [{status:'open'},{paid:false},{amount_remaining:1},{subscription:'sub_other'},
    {charge:{refunded:true}},{charge:{disputed:true}},{lines:{data:[{price:f.price,quantity:1,period:{start:1,end:2}}]}}])
    assert.equal(core.invoicePaidForPeriod({...f.invoice,...change},identity),false);
});
test('legacy checkout and subscription notifications bypass the new Stripe verifier entirely',async()=>{
  let called=false;const unavailable=new Proxy({}, {get(){called=true;throw Error('must not access provider');}});
  for(const type of ['checkout.session.completed','checkout.session.async_payment_succeeded','customer.subscription.updated','customer.subscription.deleted'])
    assert.deepEqual(await service.handleProStripeEvent(unavailable,unavailable,{type,data:{object:{id:'old',metadata:{matchapp_product:'vip_monthly'}}}}),{handled:false});
  assert.equal(called,false);
});
test('verified Pro writes only the owner-bound service entitlement RPC',async()=>{
  const f=fixture(),{stripe}=fakeProvider(f),writes=[];
  const db={rpc:async(name,args)=>{writes.push({name,args});return {data:name==='upsert_pro_entitlement'?{ok:true,active:true}:null,error:null};}};
  const result=await service.syncProSubscription(db,stripe,'sub_pro',user,1792232150);
  assert.equal(result.stored.active,true);
  const write=writes.find(x=>x.name==='upsert_pro_entitlement');
  assert.equal(write.args.p_user_id,user);assert.equal(write.args.p_provider,'stripe');assert.equal(write.args.p_paid,true);
  assert.equal(write.args.p_product_id,core.PRO_PRODUCT);assert.equal(write.args.p_provider_event_at,new Date(1792232150000).toISOString());
  assert.equal(writes.some(x=>/legacy|profile|credits|kids|jonas/.test(x.name)),false);
});
test('cross-account subscription or receipt never reaches entitlement upsert',async()=>{
  const f=fixture(),{stripe}=fakeProvider(f);let writes=0;
  const db={rpc:async name=>{if(name==='upsert_pro_entitlement')writes++;return {data:{user_id:other},error:null};}};
  await assert.rejects(()=>service.syncProSubscription(db,stripe,'sub_pro',user),/ownership mismatch/);
  await assert.rejects(()=>service.confirmProCheckout(db,stripe,'cs_live_pro',other),/ownership mismatch/);
  assert.equal(writes,0);
});
test('unpaid return remains pending without an entitlement mutation',async()=>{
  const f=fixture();f.session.payment_status='unpaid';const {stripe}=fakeProvider(f);let touched=false;
  const db={rpc:async()=>{touched=true;throw Error('not expected');}};
  assert.deepEqual(await service.confirmProCheckout(db,stripe,'cs_live_pro',user),{delivered:false,pending:true});assert.equal(touched,false);
});
test('retention is optional, once per subscription, and never stacked on an existing discount',()=>{
  const f=fixture(),identity=core.subscriptionIdentity(f.sub);assert.equal(core.retentionEligible(f.sub,identity,f.invoice),true);
  for(const sub of [{...f.sub,metadata:{...f.sub.metadata,matchapp_pro_retention_used:'true'}},{...f.sub,discount:{id:'di_existing'}},
    {...f.sub,discounts:['di_existing']},{...f.sub,status:'past_due'}])assert.equal(core.retentionEligible(sub,identity,f.invoice),false);
});
test('billing redirects accept only actual Stripe hosted HTTPS destinations',()=>{
  assert.ok(core.stripeHostedUrl('https://checkout.stripe.com/c/pay/cs_live_test#opaque','checkout'));
  assert.ok(core.stripeHostedUrl('https://billing.stripe.com/p/session/test','portal'));
  for(const raw of ['javascript:alert(1)','https://billing.stripe.com.evil.example/p/session/x','https://user@billing.stripe.com/p/x',
    'https://checkout.stripe.com:8443/c/pay/x','https://matchapp.tv/?next=billing.stripe.com'])assert.equal(core.stripeHostedUrl(raw,'portal'),'');
});
test('public Pro access requires the verified paid product and honors only eligible unexpired states',()=>{
  const now=Date.now(),row={provider:'play',product_verified:true,paid:true,status:'canceled',
    expires_at:new Date(now+86400000).toISOString(),verified_at:new Date(now).toISOString()};
  assert.equal(core.publicState([row],now).entitled,true);
  for(const patch of [{product_verified:false},{paid:false},{status:'trialing'},{status:'past_due'},
    {status:'revoked'},{expires_at:new Date(now-1).toISOString()}])
    assert.equal(core.publicState([{...row,...patch}],now).entitled,false);
});
test('an immediately canceled Stripe subscription cannot retain access beyond its actual ended_at',async()=>{
  const f=fixture();f.sub.status='canceled';f.sub.ended_at=f.sub.items.data[0].current_period_start+60;
  const {stripe}=fakeProvider(f),writes=[];
  const db={rpc:async(name,args)=>{
    if(name==='get_pro_entitlement_by_external_id')return {data:null,error:null};
    writes.push(args);return {data:{ok:true,active:false},error:null};
  }};
  await service.syncProSubscription(db,stripe,'sub_pro',user);
  assert.equal(writes.length,1);assert.equal(writes[0].p_expires_at,new Date(f.sub.ended_at*1000).toISOString());
  assert.equal(writes[0].p_status,'canceled');
});
