// Recover only this account's verified Pro Checkout. No legacy customer,
// subscription, payment, or entitlement is changed by this helper.
import {PRO_LANGUAGES,PRO_PRICE_ROWS,approvedPrice,objectId,stripeHostedUrl,validUser} from './pro-core.mjs';

export class ProCheckoutError extends Error {
  constructor(code,status=409){super(code);this.code=code;this.status=status;}
}
/** @returns {never} */
const fail=code=>{throw new ProCheckoutError(code||'checkout_reconciliation_required');};
const isoMillis=value=>typeof value==='string'?Date.parse(value):NaN;
const locale=lang=>['ar','hi'].includes(lang)?'auto':lang;
const successUrl=lang=>'https://matchapp.tv/pricing/pricing.html?pro_return=1&session_id={CHECKOUT_SESSION_ID}&lang='+encodeURIComponent(lang);
const cancelUrl=lang=>'https://matchapp.tv/pricing/pricing.html?pro_return=cancelled&lang='+encodeURIComponent(lang);
function owner(session,userId,customerId){
  return !!session&&/^cs_live_[A-Za-z0-9]+$/.test(session.id||'')&&session.livemode===true&&
    session.mode==='subscription'&&objectId(session.customer)===customerId&&session.client_reference_id===userId&&
    session.metadata?.matchapp_user===userId&&session.metadata?.matchapp_product==='pro_monthly';
}
function boundedList(result,limit){
  if(!result||result.has_more!==false||!Array.isArray(result.data)||result.data.length>limit)fail();
  return result.data;
}
function selectedQuote(request){
  const {userId,customerId,intent,offer,lang}=request;
  const price=PRO_PRICE_ROWS.find(row=>row.priceId===intent?.price_id);
  if(!validUser(userId)||!/^cus_[A-Za-z0-9]+$/.test(customerId||'')||!validUser(intent?.request_id)||
    !price||!PRO_LANGUAGES.includes(lang)||intent.lang!==lang||offer?.priceId!==price.priceId||
    offer.currency!==price.currency||offer.amount!==price.amount||offer.country!==price.country||
    !Number.isFinite(isoMillis(intent.expires_at)))fail('checkout_quote_unavailable');
  return price;
}
export function proCheckoutBody(request){
  const {userId,customerId,intent,lang}=request,price=selectedQuote(request);
  return {
    mode:'subscription',customer:customerId,line_items:[{price:price.priceId,quantity:1}],client_reference_id:userId,
    metadata:{matchapp_user:userId,matchapp_product:'pro_monthly',matchapp_market:price.country,
      matchapp_lang:lang,matchapp_checkout_request:intent.request_id,
      matchapp_quote_expires_at:String(isoMillis(intent.expires_at))},
    subscription_data:{metadata:{matchapp_user:userId,matchapp_product:'pro_monthly',matchapp_market:price.country}},
    success_url:successUrl(lang),cancel_url:cancelUrl(lang),locale:locale(lang),
    billing_address_collection:'auto',phone_number_collection:{enabled:false},automatic_tax:{enabled:false},tax_id_collection:{enabled:false},
    allow_promotion_codes:false
  };
}
async function inspectOpenSession(stripe,session,request,now){
  if(!owner(session,request.userId,request.customerId)||session.status!=='open'||session.payment_status!=='unpaid'||
    objectId(session.subscription)||!Number.isSafeInteger(session.expires_at)||session.expires_at*1000<=now)fail();
  const lang=PRO_LANGUAGES.find(value=>session.success_url===successUrl(value)&&session.cancel_url===cancelUrl(value));
  if(!lang||session.locale!==locale(lang)||(session.metadata.matchapp_lang!==undefined&&session.metadata.matchapp_lang!==lang))fail();
  const items=boundedList(await stripe.checkout.sessions.listLineItems(session.id,{limit:2}),2);
  const row=items.length===1&&items[0].quantity===1?approvedPrice(items[0].price):null;
  if(!row||session.currency!==row.currency||items[0].currency!==row.currency||session.metadata.matchapp_market!==row.country)fail();
  const quoteRequest=session.metadata.matchapp_checkout_request;
  if(quoteRequest!==undefined&&!validUser(quoteRequest))fail();
  const rawExpiry=session.metadata.matchapp_quote_expires_at;
  const quoteExpiresAt=rawExpiry===undefined?session.expires_at*1000:
    typeof rawExpiry==='string'&&/^[1-9][0-9]{12}$/.test(rawExpiry)?Number(rawExpiry):NaN;
  if(!Number.isSafeInteger(quoteExpiresAt)||quoteExpiresAt<=0)fail();
  const matching=row.priceId===request.intent.price_id&&lang===request.lang;
  if(quoteRequest===request.intent.request_id&&!matching)fail();
  if(!stripeHostedUrl(session.url,'checkout'))fail();
  return {session,matching,quoteExpiresAt};
}
async function noOngoingSubscription(stripe,request){
  const subscriptions=boundedList(await stripe.subscriptions.list({customer:request.customerId,status:'all',limit:100}),100);
  for(const sub of subscriptions){
    if(objectId(sub.customer)!==request.customerId||sub.livemode!==true)fail();
    if(sub.metadata?.matchapp_product==='pro_monthly'&&!['canceled','incomplete_expired'].includes(sub.status))
      fail('manage_existing_subscription');
  }
}
/** @returns {Promise<never>} */
async function reconcileAndStop(id,dependencies){
  // This callback verifies an owned receipt using the existing Pro fulfillment
  // path; a timeout or an unpaid receipt cannot cause a second checkout.
  try{await dependencies.reconcileSession(id);}catch(_){}
  throw new ProCheckoutError('checkout_reconciliation_required');
}
async function currentIntent(request,dependencies){
  // Avoid starting a provider mutation as the private quote rolls over. The
  // existing Stripe client has a 10-second timeout and one bounded retry.
  if(isoMillis(request.intent.expires_at)-dependencies.now()<30000)fail('checkout_quote_expired');
  if(await dependencies.assertIntent(request.intent.request_id,request.customerId)!==true)fail('checkout_quote_expired');
  if(isoMillis(request.intent.expires_at)-dependencies.now()<30000)fail('checkout_quote_expired');
}

export async function recoverProCheckout(stripe,request,dependencies){
  selectedQuote(request);
  if(!dependencies||typeof dependencies.now!=='function'||typeof dependencies.assertIntent!=='function'||
    typeof dependencies.reconcileSession!=='function')throw new Error('Checkout recovery dependency unavailable');
  await noOngoingSubscription(stripe,request);
  const opened=boundedList(await stripe.checkout.sessions.list({customer:request.customerId,status:'open',limit:10}),10);
  // More than one live payment page violates our invariant; do not guess which
  // page to retire or create a third while the provider state is ambiguous.
  if(opened.length>1)fail();
  if(opened.length===1){
    const old=await inspectOpenSession(stripe,opened[0],request,dependencies.now());
    if(old.matching)return {session:old.session,reused:true};
    // The service reservation admits a different quote only after expiration.
    // New sessions also carry that old private expiry for an explicit check.
    if(old.quoteExpiresAt>dependencies.now())fail('checkout_already_open');
    await currentIntent(request,dependencies);
    let expired;
    try{
      expired=await stripe.checkout.sessions.expire(old.session.id,{},
        {idempotencyKey:'matchapp-pro-expire-'+old.session.id});
    }catch(_){return reconcileAndStop(old.session.id,dependencies);}
    if(!owner(expired,request.userId,request.customerId)||expired.id!==old.session.id||expired.status!=='expired'||
      objectId(expired.subscription)||expired.payment_status!=='unpaid')return reconcileAndStop(old.session.id,dependencies);
    const after=boundedList(await stripe.checkout.sessions.list({customer:request.customerId,status:'open',limit:10}),10);
    if(after.length!==0)fail();
  }
  // Re-check after the list/expiration so a completed payment discovered during
  // recovery blocks replacement even if the initial subscription read was empty.
  await noOngoingSubscription(stripe,request);
  await currentIntent(request,dependencies);
  const session=await stripe.checkout.sessions.create(proCheckoutBody(request),
    {idempotencyKey:'matchapp-pro-'+request.intent.request_id});
  if(!owner(session,request.userId,request.customerId)||session.status!=='open')
    return reconcileAndStop(session?.id,dependencies);
  const created=await inspectOpenSession(stripe,session,request,dependencies.now());
  if(!created.matching||session.metadata.matchapp_checkout_request!==request.intent.request_id||
    created.quoteExpiresAt!==isoMillis(request.intent.expires_at))return reconcileAndStop(session.id,dependencies);
  return {session,reused:false};
}
