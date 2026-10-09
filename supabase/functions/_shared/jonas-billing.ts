// Verified, independently entitled Jonas Chat Plus subscription lifecycle.
// The Stripe Checkout session/price is verified in billing.ts before delivery.
// Never alter profiles.subscription_plan (VIP / Business are independent).
export const JONAS_CHAT_PRICE_IDS = new Set([
 "price_1UOci8FRuUuhrLPG5Y6g6ng0", // USD 9.99/mo
 "price_1UOcmIFRuUuhrLPGShRDWzYn", // BRL 39.90/mo
]);
const unixToISO = (value:unknown):string|null =>
 typeof value==="number"&&Number.isFinite(value)&&value>0?new Date(value*1000).toISOString():null;
export function jonasPeriod(sub:any):{start:string;end:string}|null{
 const item=sub.items?.data?.find((row:any)=>JONAS_CHAT_PRICE_IDS.has(row.price?.id));
 if(!item)return null;
 const start=unixToISO(item.current_period_start??sub.current_period_start);
 const end=unixToISO(item.current_period_end??sub.current_period_end);
 return start&&end&&Date.parse(end)>Date.parse(start)?{start,end}:null;
}
export async function syncJonasSubscription(db:any,sub:any,userId:string,forceNew=false):Promise<boolean>{
 const item=sub.items?.data?.find((row:any)=>JONAS_CHAT_PRICE_IDS.has(row.price?.id));
 const period=jonasPeriod(sub);
 if(!period||!item||!userId||!['active','trialing','past_due','canceled','unpaid','incomplete','incomplete_expired','paused'].includes(sub.status))return false;
 const customer=typeof sub.customer==='string'?sub.customer:sub.customer?.id||null;
 const {data,error}=await db.rpc('jonas_set_subscription',{
  p_user_id:userId,p_customer:customer,p_subscription:sub.id,p_status:sub.status,
  p_price:item.price.id,p_period_start:period.start,p_period_end:period.end,
  p_cancel_at_period_end:sub.cancel_at_period_end===true,p_force_new:forceNew
 });
 if(error)throw new Error('Jonas subscription synchronization pending');
 return data===true;
}
export async function deliverJonasCheckout(db:any,stripe:any,session:any,user:string){
 const subscriptionId=typeof session.subscription==='string'?session.subscription:session.subscription?.id;
 if(!subscriptionId)throw new Error('Missing subscription for Jonas paid checkout');
 const sub=await stripe.subscriptions.retrieve(subscriptionId,{expand:['items.data.price']});
 const period=jonasPeriod(sub);
 if(!period||!['active','trialing'].includes(sub.status))throw new Error('Jonas subscription not active');
 const item=sub.items.data.find((row:any)=>JONAS_CHAT_PRICE_IDS.has(row.price?.id));
 if(!item)throw new Error('Unexpected Jonas subscription price');
 if(sub.metadata?.matchapp_user&&sub.metadata.matchapp_user!==user)
  throw new Error('Subscription owner mismatch');
 const customer=typeof sub.customer==='string'?sub.customer:sub.customer?.id||null;
 const {data,error}=await db.rpc('jonas_deliver_checkout',{
  p_session_id:session.id,p_user_id:user,p_customer:customer,
  p_subscription:sub.id,p_status:sub.status,p_price:item.price.id,
  p_period_start:period.start,p_period_end:period.end,
  p_cancel_at_period_end:sub.cancel_at_period_end===true
 });
 if(error||data?.delivered!==true)throw new Error('Jonas paid entitlement delivery pending');
 return data;
}
