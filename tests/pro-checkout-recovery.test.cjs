const {test,describe}=require('node:test');
const assert=require('node:assert/strict');
const modules=Promise.all([import('../supabase/functions/_shared/pro-checkout.mjs'),import('../supabase/functions/_shared/pro-core.mjs')]);
const user='01234567-89ab-4cde-8fab-0123456789ab',other='11234567-89ab-4cde-8fab-0123456789ab';
const intentId='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',oldIntentId='bbbbbbbb-cccc-4ddd-8eee-ffffffffffff';
const now=1792232100000;
async function fixture({country='BR',lang='pt-BR',expiresAt=now+31*60000}={}){
  const [recovery,core]=await modules,offer=core.market(country);
  return {recovery,core,request:{userId:user,customerId:'cus_pro',offer,lang,
    intent:{request_id:intentId,price_id:offer.priceId,lang,expires_at:new Date(expiresAt).toISOString()}}};
}
function provider(f,initial=[],options={}){
  const sessions=new Map(),events=[],idempotent=new Map(),reconciled=[];
  let sequence=0,subscriptionReads=0;
  function session(request,id='cs_live_open'){
    const body=f.recovery.proCheckoutBody(request),price=request.offer;
    const itemPrice={id:price.priceId,product:f.core.PRO_PRODUCT,currency:price.currency,unit_amount:price.amount,
      livemode:true,type:'recurring',billing_scheme:'per_unit',recurring:{interval:'month',interval_count:1,usage_type:'licensed'}};
    const value={...body,id,object:'checkout.session',livemode:true,status:'open',payment_status:'unpaid',subscription:null,
      currency:price.currency,created:Math.floor(now/1000),expires_at:Math.floor(now/1000)+86400,
      url:'https://checkout.stripe.com/c/pay/'+id,
      testLines:[{quantity:1,currency:price.currency,price:itemPrice}]};
    sessions.set(id,value);return value;
  }
  for(const value of initial)session(value.request,value.id);
  const stripe={subscriptions:{async list(params){
    assert.deepEqual(params,{customer:'cus_pro',status:'all',limit:100});events.push('subscriptions');subscriptionReads++;
    return options.subscriptions?options.subscriptions(subscriptionReads):{data:[],has_more:false};
  }},checkout:{sessions:{
    async list(params){assert.deepEqual(params,{customer:'cus_pro',status:'open',limit:10});events.push('list');
      return {data:[...sessions.values()].filter(value=>value.status==='open').map(value=>structuredClone(value)),has_more:options.hasMore===true};},
    async listLineItems(id,params){assert.deepEqual(params,{limit:2});events.push('lines:'+id);
      return {data:structuredClone(sessions.get(id).testLines),has_more:options.linesMore===true};},
    async expire(id,params,requestOptions){
      assert.deepEqual(params,{});assert.equal(requestOptions.idempotencyKey,'matchapp-pro-expire-'+id);events.push('expire:'+id);
      if(options.expireFails){if(options.completeDuringExpire)sessions.get(id).status='complete';throw Error('provider race or timeout');}
      const value=sessions.get(id);value.status=options.expireReturnsComplete?'complete':'expired';
      value.url=null;return structuredClone(value);
    },
    async create(body,requestOptions){
      events.push('create');assert.equal('expires_at' in body,false);
      const key=requestOptions.idempotencyKey;
      if(idempotent.has(key)){
        assert.deepEqual(body,idempotent.get(key).body);return structuredClone(idempotent.get(key).session);
      }
      const selected=f.core.PRO_PRICE_ROWS.find(row=>row.priceId===body.line_items[0].price);
      const request={userId:body.client_reference_id,customerId:body.customer,offer:selected,lang:body.metadata.matchapp_lang,
        intent:{request_id:body.metadata.matchapp_checkout_request,price_id:selected.priceId,lang:body.metadata.matchapp_lang,
          expires_at:new Date(Number(body.metadata.matchapp_quote_expires_at)).toISOString()}};
      const value=session(request,'cs_live_created'+(++sequence));
      idempotent.set(key,{body:structuredClone(body),session:structuredClone(value)});
      if(options.loseCreateResponse){options.loseCreateResponse=false;throw Error('response lost after creation');}
      return structuredClone(value);
    }
  }}};
  const dependencies={now:()=>now,
    async assertIntent(id,customer){events.push('intent');assert.equal(id,f.request.intent.request_id);assert.equal(customer,'cus_pro');return options.currentIntent!==false;},
    async reconcileSession(id){events.push('reconcile:'+id);reconciled.push(id);if(options.reconcileFails)throw Error('pending');return {delivered:options.completeDuringExpire===true};}};
  return {stripe,dependencies,events,sessions,idempotent,reconciled,session};
}
function previousRequest(f,{country='US',lang='en',expired=true}={}){
  const offer=f.core.market(country);
  return {...f.request,offer,lang,intent:{request_id:oldIntentId,price_id:offer.priceId,lang,
    expires_at:new Date(now+(expired?-60000:60000)).toISOString()}};
}
describe('Pro hosted checkout recovery',()=>{
  test('first creation succeeds after a delayed pre-creation retry with less than Stripe 30-minute minimum left',async()=>{
    const f=await fixture({expiresAt:now+5*60000}),p=provider(f);
    const result=await f.recovery.recoverProCheckout(p.stripe,f.request,p.dependencies);
    assert.equal(result.reused,false);assert.equal(p.idempotent.size,1);
    const [key,value]=[...p.idempotent][0];assert.equal(key,'matchapp-pro-'+intentId);
    assert.equal('expires_at' in value.body,false);assert.equal(value.body.metadata.matchapp_quote_expires_at,String(now+5*60000));
  });
  test('a lost creation response recovers the same owned open session without creating or expiring another',async()=>{
    const f=await fixture(),p=provider(f,[],{loseCreateResponse:true});
    await assert.rejects(()=>f.recovery.recoverProCheckout(p.stripe,f.request,p.dependencies),/response lost/);
    const result=await f.recovery.recoverProCheckout(p.stripe,f.request,p.dependencies);
    assert.equal(result.reused,true);assert.equal(result.session.id,'cs_live_created1');
    assert.equal(p.idempotent.size,1);assert.equal(p.events.filter(x=>x==='create').length,1);
    assert.equal(p.events.some(x=>x.startsWith('expire:')),false);
  });
  test('a matching orphan from an expired private reservation is reused across an intent renewal',async()=>{
    const f=await fixture(),old=previousRequest(f,{country:'BR',lang:'pt-BR'}),p=provider(f,[{request:old,id:'cs_live_orphan'}]);
    const result=await f.recovery.recoverProCheckout(p.stripe,f.request,p.dependencies);
    assert.equal(result.reused,true);assert.equal(result.session.id,'cs_live_orphan');assert.equal(p.idempotent.size,0);
  });
  test('an older matching session without new quote metadata is still recovered through exact owned price and return locale',async()=>{
    const f=await fixture(),p=provider(f,[{request:f.request,id:'cs_live_oldbuild'}]);
    const stored=p.sessions.get('cs_live_oldbuild');
    delete stored.metadata.matchapp_lang;delete stored.metadata.matchapp_checkout_request;delete stored.metadata.matchapp_quote_expires_at;
    const result=await f.recovery.recoverProCheckout(p.stripe,f.request,p.dependencies);
    assert.equal(result.reused,true);assert.equal(p.idempotent.size,0);
  });
  test('a changed regional price expires the owned old quote before checking again and creating its replacement',async()=>{
    const f=await fixture(),p=provider(f,[{request:previousRequest(f),id:'cs_live_oldquote'}]);
    const result=await f.recovery.recoverProCheckout(p.stripe,f.request,p.dependencies);
    assert.equal(result.reused,false);assert.equal(p.sessions.get('cs_live_oldquote').status,'expired');
    const expiry=p.events.indexOf('expire:cs_live_oldquote'),create=p.events.indexOf('create');
    assert.ok(expiry>=0&&create>expiry);assert.ok(p.events.slice(expiry+1,create).includes('subscriptions'));
    assert.equal([...p.idempotent.values()][0].body.line_items[0].price,f.request.offer.priceId);
  });
  test('a changed locale with the same Stripe auto locale is still a different quote',async()=>{
    const f=await fixture({lang:'hi'}),p=provider(f,[{request:previousRequest(f,{country:'BR',lang:'ar'}),id:'cs_live_arabic'}]);
    await f.recovery.recoverProCheckout(p.stripe,f.request,p.dependencies);
    assert.equal(p.sessions.get('cs_live_arabic').status,'expired');
    assert.equal([...p.idempotent.values()][0].body.metadata.matchapp_lang,'hi');
  });
  test('an old quote that has not reached its private expiry is neither expired nor replaced',async()=>{
    const f=await fixture(),p=provider(f,[{request:previousRequest(f,{expired:false}),id:'cs_live_held'}]);
    await assert.rejects(()=>f.recovery.recoverProCheckout(p.stripe,f.request,p.dependencies),{code:'checkout_already_open'});
    assert.equal(p.events.some(x=>x.startsWith('expire:')||x==='create'),false);
  });
  test('expiration failures, completion races, and unavailable reconciliation never create a replacement',async()=>{
    for(const options of [{expireFails:true},{expireFails:true,completeDuringExpire:true},
      {expireFails:true,reconcileFails:true},{expireReturnsComplete:true}]){
      const f=await fixture(),p=provider(f,[{request:previousRequest(f),id:'cs_live_race'}],options);
      await assert.rejects(()=>f.recovery.recoverProCheckout(p.stripe,f.request,p.dependencies),{code:'checkout_reconciliation_required'});
      assert.deepEqual(p.reconciled,['cs_live_race']);assert.equal(p.idempotent.size,0);
    }
  });
  test('a subscription appearing during expiration blocks replacement',async()=>{
    const f=await fixture(),p=provider(f,[{request:previousRequest(f),id:'cs_live_pending'}],{
      subscriptions:call=>({data:call>1?[{id:'sub_paid',customer:'cus_pro',livemode:true,status:'active',metadata:{matchapp_product:'pro_monthly'}}]:[],has_more:false})});
    await assert.rejects(()=>f.recovery.recoverProCheckout(p.stripe,f.request,p.dependencies),{code:'manage_existing_subscription'});
    assert.equal(p.events.includes('create'),false);
  });
  test('bounded lists and duplicate open sessions fail closed without provider mutations',async()=>{
    for(const options of [{hasMore:true},{linesMore:true}]){
      const f=await fixture(),p=provider(f,[{request:f.request,id:'cs_live_one'}],options);
      await assert.rejects(()=>f.recovery.recoverProCheckout(p.stripe,f.request,p.dependencies));
      assert.equal(p.events.some(x=>x.startsWith('expire:')||x==='create'),false);
    }
    const f=await fixture(),p=provider(f,[{request:f.request,id:'cs_live_one'},{request:f.request,id:'cs_live_two'}]);
    await assert.rejects(()=>f.recovery.recoverProCheckout(p.stripe,f.request,p.dependencies));assert.equal(p.idempotent.size,0);
  });
  test('foreign ownership, product, price, currency, quantity and locale mismatches never reach expiry or creation',async()=>{
    const changes=[s=>s.customer='cus_other',s=>s.client_reference_id=other,s=>s.metadata.matchapp_user=other,
      s=>s.metadata.matchapp_product='vip_monthly',s=>s.mode='payment',s=>s.livemode=false,
      s=>s.testLines[0].price.product='prod_other',s=>s.testLines[0].price.unit_amount=1,
      s=>s.currency='usd',s=>s.testLines[0].currency='usd',s=>s.testLines[0].quantity=2,
      s=>s.locale='en',s=>s.metadata.matchapp_lang='en',s=>s.success_url='https://evil.example/pay'];
    for(const change of changes){
      const f=await fixture(),p=provider(f,[{request:f.request,id:'cs_live_wrong'}]);change(p.sessions.get('cs_live_wrong'));
      await assert.rejects(()=>f.recovery.recoverProCheckout(p.stripe,f.request,p.dependencies));
      assert.equal(p.events.some(x=>x.startsWith('expire:')||x==='create'),false);
    }
  });
  test('same-intent concurrent requests retain an identical creation body and provider idempotency key',async()=>{
    const f=await fixture(),p=provider(f);
    const results=await Promise.all([f.recovery.recoverProCheckout(p.stripe,f.request,p.dependencies),
      f.recovery.recoverProCheckout(p.stripe,f.request,p.dependencies)]);
    assert.equal(results[0].session.id,results[1].session.id);assert.equal(p.idempotent.size,1);
    assert.deepEqual(f.recovery.proCheckoutBody(f.request),[...p.idempotent.values()][0].body);
  });
  test('a create response for a different owned quote is reconciled and never returned as the selected price',async()=>{
    const f=await fixture(),p=provider(f);
    p.stripe.checkout.sessions.create=async()=>p.session(previousRequest(f),'cs_live_wrongcreated');
    await assert.rejects(()=>f.recovery.recoverProCheckout(p.stripe,f.request,p.dependencies),{code:'checkout_reconciliation_required'});
    assert.deepEqual(p.reconciled,['cs_live_wrongcreated']);
  });
  test('a replaced private intent or imminent rollover cannot start a provider mutation',async()=>{
    for(const options of [{currentIntent:false},{currentIntent:true,expiresAt:now+29000}]){
      const f=await fixture({expiresAt:options.expiresAt||now+31*60000}),p=provider(f,[],options);
      await assert.rejects(()=>f.recovery.recoverProCheckout(p.stripe,f.request,p.dependencies),{code:'checkout_quote_expired'});
      assert.equal(p.events.includes('create'),false);
    }
  });
});
