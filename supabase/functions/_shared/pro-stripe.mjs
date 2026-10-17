// Additive verifier for the new Pro product. Legacy billing delivery stays separate.
import {PRO_PRODUCT,objectId,validUser,subscriptionIdentity,verifiedCheckoutIdentity,
  invoicePaidForPeriod,retentionEligible} from './pro-core.mjs';

const iso=(seconds)=>new Date(seconds*1000).toISOString();
export async function proBillingState(db,userId){
  const {data,error}=await db.rpc('get_pro_billing_state',{p_user_id:userId});
  if(error||data?.ok!==true||!Array.isArray(data.entitlements))throw new Error('Pro state unavailable');
  return data;
}
export async function readProSubscription(stripe,subscriptionId){
  const sub=await stripe.subscriptions.retrieve(subscriptionId,{expand:['items.data.price','latest_invoice.payment_intent.latest_charge']});
  const identity=subscriptionIdentity(sub);
  if(!identity)throw new Error('Pro subscription identity unavailable');
  let invoice=typeof sub.latest_invoice==='object'?sub.latest_invoice:null;
  if(!invoice&&typeof sub.latest_invoice==='string')invoice=await stripe.invoices.retrieve(sub.latest_invoice,{expand:['payment_intent.latest_charge']});
  if(invoice){
    let charge=typeof invoice.charge==='object'?invoice.charge:invoice.payment_intent?.latest_charge;
    if(typeof charge==='string')charge=await stripe.charges.retrieve(charge);
    if(!charge&&typeof invoice.charge==='string')charge=await stripe.charges.retrieve(invoice.charge);
    if(charge?.disputed===true){
      const disputes=await stripe.disputes.list({charge:charge.id,limit:10});
      // A won dispute may restore access; an open/lost dispute never grants it.
      const restored=disputes.has_more===false&&disputes.data.length>0&&disputes.data.every((row)=>row.status==='won'||row.status==='warning_closed');
      charge={...charge,disputed:!restored};
    }
    invoice={...invoice,charge};
  }
  return {sub,identity,invoice};
}
export async function syncProSubscription(db,stripe,subscriptionId,expectedUser,eventAt){
  const observedAt=new Date();
  const existing=await db.rpc('get_pro_entitlement_by_external_id',{p_provider:'stripe',p_external_id:subscriptionId});
  if(existing.error)throw new Error('Pro ownership lookup pending');
  const current=await readProSubscription(stripe,subscriptionId);
  const {sub,identity,invoice}=current;
  if(expectedUser&&identity.userId!==expectedUser)throw new Error('Pro ownership mismatch');
  if(existing.data&&existing.data.user_id!==identity.userId)throw new Error('Pro ownership mismatch');
  const paid=invoicePaidForPeriod(invoice,identity);
  const status=({active:'active',trialing:'trialing',past_due:'past_due',canceled:'canceled',unpaid:'past_due',
    incomplete:'pending',incomplete_expired:'expired',paused:'paused'})[sub.status];
  if(!status)throw new Error('Unknown Pro subscription state');
  // A status request is not a new Stripe event. Preserve the last real event
  // time and order concurrent reads by when verification began, so a slow
  // older fetch cannot overwrite a later verified refund or cancellation.
  const providerAt=eventAt?iso(eventAt):existing.data?.provider_event_at||
    iso(Number.isSafeInteger(sub.created)&&sub.created>0?sub.created:identity.start);
  // Play cancellation may retain paid access to period end. An immediately
  // terminated Stripe subscription ends at its actual provider ended_at.
  const end=sub.status==='canceled'&&Number.isSafeInteger(sub.ended_at)&&sub.ended_at>0
    ?Math.min(identity.end,sub.ended_at):identity.end;
  const {data,error}=await db.rpc('upsert_pro_entitlement',{
    p_user_id:identity.userId,p_provider:'stripe',p_external_id:sub.id,p_product_id:PRO_PRODUCT,
    p_status:status,p_paid:paid,p_expires_at:iso(end),p_verified_at:observedAt.toISOString(),
    p_provider_event_at:providerAt,p_customer_id:identity.customerId,
    p_cancel_at_period_end:identity.cancelAtPeriodEnd,p_auto_renew:!identity.cancelAtPeriodEnd&&sub.status!=='canceled'
  });
  if(error||data?.ok!==true)throw new Error('Pro delivery pending');
  return {...current,stored:data,retentionEligible:retentionEligible(sub,identity,invoice)};
}
export async function confirmProCheckout(db,stripe,sessionId,userId,eventAt){
  if(!validUser(userId)||!/^cs_(live_)?[A-Za-z0-9]+$/.test(sessionId))throw new Error('Invalid Pro receipt');
  const session=await stripe.checkout.sessions.retrieve(sessionId);
  if(session.client_reference_id!==userId||session.metadata?.matchapp_user!==userId||
    session.metadata?.matchapp_product!=='pro_monthly'||session.livemode!==true)throw new Error('Pro receipt ownership mismatch');
  if(session.payment_status!=='paid')return {delivered:false,pending:session.status!=='expired'};
  const subscriptionId=objectId(session.subscription);
  const sub=await stripe.subscriptions.retrieve(subscriptionId,{expand:['items.data.price']});
  const lines=await stripe.checkout.sessions.listLineItems(sessionId,{limit:2,expand:['data.price']});
  if(lines.has_more||!verifiedCheckoutIdentity(session,sub,lines.data,userId))throw new Error('Pro receipt not verified');
  const result=await syncProSubscription(db,stripe,subscriptionId,userId,eventAt);
  return {delivered:result.stored.active===true,pending:result.stored.active!==true};
}
export async function handleProStripeEvent(db,stripe,event){
  let subscriptionId='',userId='';
  if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)){
    if(event.data.object.metadata?.matchapp_product!=='pro_monthly')return {handled:false};
    const session=await stripe.checkout.sessions.retrieve(event.data.object.id);
    if(session.metadata?.matchapp_product!=='pro_monthly')return {handled:false};
    if(!validUser(session.client_reference_id))throw new Error('Pro checkout owner unavailable');
    await confirmProCheckout(db,stripe,session.id,session.client_reference_id,event.created);
    return {handled:true,userId:session.client_reference_id};
  }
  if(['customer.subscription.created','customer.subscription.updated','customer.subscription.deleted'].includes(event.type)){
    if(event.data.object.metadata?.matchapp_product!=='pro_monthly')return {handled:false};
    subscriptionId=event.data.object.id;
  }else if(['invoice.payment_succeeded','invoice.paid','invoice.payment_failed','invoice.voided','invoice.marked_uncollectible'].includes(event.type)){
    const raw=event.data.object;
    const hinted=raw.subscription_details?.metadata?.matchapp_product==='pro_monthly'||raw.parent?.subscription_details?.metadata?.matchapp_product==='pro_monthly';
    if(!hinted){
      const candidate=objectId(raw.subscription)||objectId(raw.parent?.subscription_details?.subscription);
      if(!candidate)return {handled:false};
      const known=await db.rpc('get_pro_entitlement_by_external_id',{p_provider:'stripe',p_external_id:candidate});
      if(known.error)throw new Error('Pro invoice lookup pending');
      if(!known.data)return {handled:false};
    }
    const invoice=await stripe.invoices.retrieve(event.data.object.id);
    subscriptionId=objectId(invoice.subscription);
  }else if(['charge.refunded','charge.dispute.created','charge.dispute.closed'].includes(event.type)){
    // Charge events lack subscription metadata. Read the new Pro ownership table
    // before making any provider request for an otherwise unrelated charge.
    const customer=objectId(event.data.object.customer);
    if(event.type==='charge.refunded'){
      if(!customer)return {handled:false};
      const known=await db.rpc('get_pro_entitlements_by_customer',{p_customer_id:customer});
      if(known.error)throw new Error('Pro refund lookup pending');
      if(!Array.isArray(known.data)||known.data.length===0)return {handled:false};
    }
    const chargeId=event.type==='charge.refunded'?event.data.object.id:objectId(event.data.object.charge);
    const charge=await stripe.charges.retrieve(chargeId);
    if(!objectId(charge.invoice))return {handled:false};
    const invoice=await stripe.invoices.retrieve(objectId(charge.invoice));
    subscriptionId=objectId(invoice.subscription);
  }else return {handled:false};
  if(!subscriptionId)return {handled:false};
  const sub=await stripe.subscriptions.retrieve(subscriptionId);
  if(sub.metadata?.matchapp_product!=='pro_monthly')return {handled:false};
  userId=sub.metadata?.matchapp_user;
  await syncProSubscription(db,stripe,subscriptionId,userId,event.created);
  return {handled:true,userId};
}
