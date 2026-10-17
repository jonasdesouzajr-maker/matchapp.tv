const {test,describe}=require('node:test');
const assert=require('node:assert/strict');
const modulePromise=import('../supabase/functions/_shared/pro-legacy.mjs');
const user='01234567-89ab-4cde-8fab-0123456789ab';
const other='11234567-89ab-4cde-8fab-0123456789ab';
function fixture(status='active'){
  return {profile:{id:user,stripe_customer_id:'cus_legacy',stripe_subscription_id:'sub_legacy'},
    customer:{id:'cus_legacy',livemode:true,metadata:{}},
    subscription:{id:'sub_legacy',livemode:true,customer:'cus_legacy',status,metadata:{}}};
}
function dependencies(f,{databaseError=null,providerError=null}={}){
  const calls=[];
  const admin={from(table){assert.equal(table,'profiles');return {
    select(columns){assert.equal(columns,'id,stripe_customer_id,stripe_subscription_id');return this;},
    eq(column,value){assert.equal(column,'id');assert.equal(value,user);return this;},
    async maybeSingle(){calls.push('profile');return {data:f.profile,error:databaseError};}
  };}};
  const stripe={customers:{async retrieve(id){calls.push(['customer',id]);if(providerError)throw providerError;return f.customer;}},
    subscriptions:{async retrieve(id){calls.push(['subscription',id]);if(providerError)throw providerError;return f.subscription;}}};
  return {admin,stripe,calls};
}
describe('verified existing recurring subscription protection',()=>{
  test('empty profiles and legacy ad-free flags cannot fabricate a recurring plan or call Stripe',async()=>{
    const {verifiedLegacySubscription}=await modulePromise;
    for(const profile of [null,{id:user,is_vip:true,is_business:true,is_ad_free:true},
      {id:user,stripe_customer_id:null,stripe_subscription_id:null}]){
      const dep=dependencies({profile});
      assert.deepEqual(await verifiedLegacySubscription(dep.admin,dep.stripe,user),
        {hasLegacySubscription:false,customerId:null,subscriptionId:null,status:null});
      assert.deepEqual(dep.calls,['profile']);
    }
  });
  test('each continuing provider state blocks a second plan using the verified pair, including old metadata-free Payment Links',async()=>{
    const {verifiedLegacySubscription}=await modulePromise;
    for(const status of ['active','trialing','past_due','unpaid','incomplete','paused']){
      const f=fixture(status),dep=dependencies(f);
      assert.deepEqual(await verifiedLegacySubscription(dep.admin,dep.stripe,user),
        {hasLegacySubscription:true,customerId:'cus_legacy',subscriptionId:'sub_legacy',status});
      assert.equal(dep.calls.length,3,'guard reads only one owned profile and its actual Stripe pair');
    }
  });
  test('canceled and incomplete-expired recurring subscriptions do not block a new purchase',async()=>{
    const {verifiedLegacySubscription}=await modulePromise;
    for(const status of ['canceled','incomplete_expired']){
      const f=fixture(status),dep=dependencies(f);
      const state=await verifiedLegacySubscription(dep.admin,dep.stripe,user);
      assert.equal(state.hasLegacySubscription,false);assert.equal(state.status,status);
    }
  });
  test('customer, subscription, live environment, and optional metadata ownership must all agree',async()=>{
    const {inspectLegacySubscription}=await modulePromise;
    const f=fixture();
    for(const customer of [{...f.customer,id:'cus_other'},{...f.customer,deleted:true},{...f.customer,livemode:false},
      {...f.customer,metadata:{matchapp_user:other}}])
      assert.throws(()=>inspectLegacySubscription(f.profile,customer,f.subscription,user),/ownership mismatch/);
    for(const subscription of [{...f.subscription,id:'sub_other'},{...f.subscription,customer:'cus_other'},
      {...f.subscription,livemode:false},{...f.subscription,metadata:{matchapp_user:other}}])
      assert.throws(()=>inspectLegacySubscription(f.profile,f.customer,subscription,user),/ownership mismatch/);
    assert.equal(inspectLegacySubscription(f.profile,{...f.customer,metadata:{matchapp_user:user}},
      {...f.subscription,customer:{id:'cus_legacy'},metadata:{matchapp_user:user}},user).hasLegacySubscription,true);
  });
  test('database failures, partial bindings, wrong owners, unknown states, and provider failures fail closed',async()=>{
    const {verifiedLegacySubscription}=await modulePromise;
    for(const profile of [{...fixture().profile,id:other},{id:user,stripe_customer_id:'cus_legacy'},
      {id:user,stripe_subscription_id:'sub_legacy'}]){
      const dep=dependencies({profile});await assert.rejects(()=>verifiedLegacySubscription(dep.admin,dep.stripe,user));
      assert.deepEqual(dep.calls,['profile']);
    }
    for(const options of [{databaseError:{message:'unavailable'}},{providerError:Error('timeout')}]){
      const dep=dependencies(fixture(),options);await assert.rejects(()=>verifiedLegacySubscription(dep.admin,dep.stripe,user));
    }
    const dep=dependencies(fixture('unknown'));
    await assert.rejects(()=>verifiedLegacySubscription(dep.admin,dep.stripe,user),/status unavailable/);
  });
  test('legacy status offers management without converting existing VIP/Business benefits into unlimited Pro',async()=>{
    const {publicProBillingState,proManagementTarget}=await modulePromise;
    const state={entitlements:[],pro:{active:false,expiresAt:null,adFree:true}};
    const legacy={hasLegacySubscription:true};
    const response=publicProBillingState(state,legacy);
    assert.equal(response.entitled,false);assert.equal(response.hasLegacySubscription,true);
    assert.equal(response.canManage,true);assert.equal(response.provider,'stripe');
    assert.equal(response.retentionEligible,false);assert.equal(response.expiresAt,null);
    assert.equal(proManagementTarget(state,legacy),'legacy_stripe');
  });
  test('current verified Play management wins over later-verified but expired Stripe history',async()=>{
    const {publicProBillingState,proManagementTarget}=await modulePromise;
    const now=Date.now(),iso=offset=>new Date(now+offset).toISOString();
    const state={pro:{active:true,expiresAt:now+86400000},entitlements:[
      {provider:'stripe',product_verified:true,paid:true,status:'canceled',expires_at:iso(-1),verified_at:iso(0)},
      {provider:'play',product_verified:true,paid:true,status:'active',expires_at:iso(86400000),verified_at:iso(-60000)}
    ]};
    const legacy={hasLegacySubscription:false};
    assert.equal(proManagementTarget(state,legacy,now),'play');
    const response=publicProBillingState(state,legacy,now);
    assert.equal(response.provider,'play');assert.equal(response.retentionEligible,false);assert.equal(response.entitled,true);
  });
  test('an unpaid or unverified Play row cannot divert an existing legacy subscriber from Stripe management',async()=>{
    const {proManagementTarget}=await modulePromise;
    const now=Date.now(),row={provider:'play',product_verified:true,paid:true,status:'active',
      expires_at:new Date(now+86400000).toISOString(),verified_at:new Date(now).toISOString()};
    for(const patch of [{paid:false},{product_verified:false},{status:'pending'},{status:'past_due'}]){
      const state={pro:{active:false},entitlements:[{...row,...patch}]};
      assert.equal(proManagementTarget(state,{hasLegacySubscription:true},now),'legacy_stripe');
    }
  });
});
