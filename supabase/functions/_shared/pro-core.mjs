// New Pro only. These public catalog identifiers never confer an entitlement.
export const PRO_PRODUCT = 'prod_VSP0LagMpQQHIj';
export const PRO_PORTAL = 'bpc_1URUgdFRuUuhrLPGCXsZGeyi';
export const PRO_RETENTION_COUPON = 'matchapp_pro_retention_50_3m_20261017';
export const PRO_PRICE_ROWS = Object.freeze([
  {country:'US',currency:'usd',amount:499,priceId:'price_1URUdyFRuUuhrLPGFwrc0mQU'},
  {country:'BR',currency:'brl',amount:990,priceId:'price_1URUC4FRuUuhrLPGx0fDzrR3'},
  {country:'IN',currency:'inr',amount:9900,priceId:'price_1URUeEFRuUuhrLPGW53PptBI'},
  {country:'MX',currency:'mxn',amount:4900,priceId:'price_1URUeGFRuUuhrLPGH2XmPgS1'},
  {country:'CO',currency:'cop',amount:990000,priceId:'price_1URUeHFRuUuhrLPGc53m45uV'}
].map(row=>Object.freeze(row)));
export const PRO_LANGUAGES = Object.freeze(['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh']);
export function objectId(value) { return typeof value==='string'?value:value?.id||''; }
export function validUser(value) { return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value); }
export function language(value) { return PRO_LANGUAGES.includes(value)?value:'en'; }
export function market(value) {
  const country=typeof value==='string'?value.toUpperCase():'';
  return PRO_PRICE_ROWS.find(row=>row.country===country)||PRO_PRICE_ROWS[0];
}
export function approvedPrice(price,{forSale=false}={}) {
  const row=PRO_PRICE_ROWS.find(row=>row.priceId===price?.id);
  if(!row||objectId(price.product)!==PRO_PRODUCT||price.currency!==row.currency||price.unit_amount!==row.amount||
    price.type!=='recurring'||price.billing_scheme!=='per_unit'||price.recurring?.interval!=='month'||
    price.recurring.interval_count!==1||price.recurring.usage_type!=='licensed'||price.custom_unit_amount||
    price.transform_quantity||price.livemode!==true||(forSale&&price.active!==true)) return null;
  return row;
}
export function catalogOffer(price,country) {
  const row=approvedPrice(price,{forSale:true});
  if(!row||row.country!==market(country).country)return null;
  return {...row,fractionDigits:2,interval:'month',intervalCount:1};
}
export function subscriptionIdentity(sub) {
  if(!sub||!/^sub_[A-Za-z0-9]+$/.test(sub.id||'')||sub.livemode!==true||
    !validUser(sub.metadata?.matchapp_user)||sub.metadata?.matchapp_product!=='pro_monthly'||
    !/^cus_[A-Za-z0-9]+$/.test(objectId(sub.customer))||sub.items?.data?.length!==1)return null;
  const item=sub.items.data[0],price=approvedPrice(item.price);
  if(!price||item.quantity!==1)return null;
  const start=item.current_period_start??sub.current_period_start;
  const end=item.current_period_end??sub.current_period_end;
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<=0||end<=start)return null;
  return {userId:sub.metadata.matchapp_user,externalId:sub.id,customerId:objectId(sub.customer),
    productId:PRO_PRODUCT,priceId:price.priceId,currency:price.currency,amount:price.amount,
    start,end,cancelAtPeriodEnd:sub.cancel_at_period_end===true,status:sub.status};
}
export function verifiedCheckoutIdentity(session,sub,lineItems,userId) {
  const identity=subscriptionIdentity(sub);
  if(!identity||identity.userId!==userId||session?.client_reference_id!==userId||
    session.metadata?.matchapp_user!==userId||session.metadata?.matchapp_product!=='pro_monthly'||
    session.mode!=='subscription'||session.payment_status!=='paid'||session.livemode!==true||
    objectId(session.subscription)!==identity.externalId||objectId(session.customer)!==identity.customerId||
    session.currency!==identity.currency||!Array.isArray(lineItems)||lineItems.length!==1||
    lineItems[0].quantity!==1||approvedPrice(lineItems[0].price)?.priceId!==identity.priceId)return null;
  return identity;
}
export function invoicePaidForPeriod(invoice,identity) {
  if(!invoice||!identity||invoice.livemode!==true||invoice.status!=='paid'||invoice.paid!==true||
    objectId(invoice.subscription)!==identity.externalId||objectId(invoice.customer)!==identity.customerId||
    invoice.currency!==identity.currency||invoice.amount_remaining!==0)return false;
  const charge=typeof invoice.charge==='object'?invoice.charge:invoice.payment_intent?.latest_charge;
  if(charge&&typeof charge==='object'&&(charge.disputed===true||charge.refunded===true))return false;
  return Array.isArray(invoice.lines?.data)&&invoice.lines.data.some(line=>
    objectId(line.price)===identity.priceId&&line.quantity===1&&line.proration!==true&&
    line.period?.start<=identity.start&&line.period?.end>=identity.end);
}
export function retentionEligible(sub,identity,invoice) {
  return !!identity&&sub.status==='active'&&identity.cancelAtPeriodEnd!==true&&
    sub.metadata?.matchapp_pro_retention_used!=='true'&&!sub.discount&&!(sub.discounts?.length)&&
    invoicePaidForPeriod(invoice,identity);
}
export function publicState(rows,now=Date.now()) {
  const entries=Array.isArray(rows)?rows:[];
  const current=entries.filter(row=>row.product_verified===true&&row.paid===true&&['active','canceled'].includes(row.status)&&Date.parse(row.expires_at)>now)
    .sort((a,b)=>Date.parse(b.expires_at)-Date.parse(a.expires_at))[0];
  const manageable=current||entries.filter(row=>['stripe','play'].includes(row.provider))
    .sort((a,b)=>Date.parse(b.verified_at)-Date.parse(a.verified_at))[0];
  return {ok:true,entitled:!!current,provider:manageable?.provider||null,
    expiresAt:current?Date.parse(current.expires_at):null,cancelAtPeriodEnd:manageable?.cancel_at_period_end===true,
    canManage:!!manageable,retentionEligible:false};
}
export function stripeHostedUrl(raw,kind) {
  try { const url=new URL(raw);if(url.protocol!=='https:'||url.username||url.password||url.port)return '';
    if(kind==='checkout'&&url.hostname==='checkout.stripe.com'&&/^\/c\/pay\//.test(url.pathname))return url.href;
    if(kind==='portal'&&url.hostname==='billing.stripe.com'&&/^\/p\//.test(url.pathname))return url.href;
  } catch(_) {} return '';
}
