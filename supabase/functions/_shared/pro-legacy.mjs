// Read-only protection for existing recurring plans. The profile's service-written
// customer/subscription pair is checked against Stripe before any new Pro sale.
// This helper never changes a legacy plan, a profile, or a paid entitlement.
import {objectId,publicState,validUser} from './pro-core.mjs';

const continuingStatuses=new Set(['active','trialing','past_due','unpaid','incomplete','paused']);
const terminalStatuses=new Set(['canceled','incomplete_expired']);
const empty=()=>({hasLegacySubscription:false,customerId:null,subscriptionId:null,status:null});
const customerId=value=>typeof value==='string'&&/^cus_[A-Za-z0-9]+$/.test(value);
const subscriptionId=value=>typeof value==='string'&&/^sub_[A-Za-z0-9]+$/.test(value);

export function inspectLegacySubscription(profile,customer,subscription,userId){
  if(!validUser(userId)||profile?.id!==userId||!customerId(profile.stripe_customer_id)||
    !subscriptionId(profile.stripe_subscription_id))throw new Error('Legacy billing binding unavailable');
  if(!customer||customer.deleted===true||customer.id!==profile.stripe_customer_id||customer.livemode!==true||
    !subscription||subscription.id!==profile.stripe_subscription_id||subscription.livemode!==true||
    objectId(subscription.customer)!==customer.id)throw new Error('Legacy billing ownership mismatch');
  // Older Payment Links did not always add metadata. Their service-verified
  // profile pair remains authoritative; any conflicting metadata is rejected.
  for(const value of [customer.metadata?.matchapp_user,subscription.metadata?.matchapp_user]){
    if(value!==undefined&&value!==null&&value!==''&&value!==userId)throw new Error('Legacy billing ownership mismatch');
  }
  if(!continuingStatuses.has(subscription.status)&&!terminalStatuses.has(subscription.status))
    throw new Error('Legacy billing status unavailable');
  return {hasLegacySubscription:continuingStatuses.has(subscription.status),
    customerId:customer.id,subscriptionId:subscription.id,status:subscription.status};
}

export async function verifiedLegacySubscription(admin,stripe,userId){
  if(!validUser(userId))throw new Error('Legacy billing owner unavailable');
  const {data:profile,error}=await admin.from('profiles')
    .select('id,stripe_customer_id,stripe_subscription_id').eq('id',userId).maybeSingle();
  if(error)throw new Error('Legacy billing binding unavailable');
  if(!profile)return empty();
  if(profile.id!==userId)throw new Error('Legacy billing ownership mismatch');
  const customer=profile.stripe_customer_id,subscription=profile.stripe_subscription_id;
  if(!customer&&!subscription)return empty();
  if(!customerId(customer)||!subscriptionId(subscription))throw new Error('Legacy billing binding unavailable');
  const [customerObject,subscriptionObject]=await Promise.all([
    stripe.customers.retrieve(customer),stripe.subscriptions.retrieve(subscription)
  ]);
  return inspectLegacySubscription(profile,customerObject,subscriptionObject,userId);
}

// Management follows the currently verified paid provider before historical
// rows. Legacy management uses the account's existing default Stripe portal.
export function proManagementTarget(state,legacy,now=Date.now()){
  const current=publicState(state?.entitlements,now);
  if(current.entitled)return current.provider;
  if(legacy?.hasLegacySubscription===true)return 'legacy_stripe';
  return current.provider;
}

export function publicProBillingState(state,legacy,now=Date.now()){
  const response=publicState(state.entitlements,now);
  const hasLegacySubscription=legacy?.hasLegacySubscription===true;
  return {...response,entitled:state.pro?.active===true,hasLegacySubscription,
    provider:hasLegacySubscription&&state.pro?.active!==true?'stripe':response.provider,
    canManage:hasLegacySubscription||response.canManage,
    expiresAt:state.pro?.active===true?state.pro.expiresAt:null};
}
