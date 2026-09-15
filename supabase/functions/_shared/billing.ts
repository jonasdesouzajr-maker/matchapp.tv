// Products are resolved from the exact merchant Payment Links, never from amount alone.
export const PRODUCTS: Record<string,{url:string;mode:'payment'|'subscription';amount:number}> = {
 ad_free:{url:'https://buy.stripe.com/bJe8wP94lfRQfsycspcfK07',mode:'payment',amount:199},
 vip_monthly:{url:'https://buy.stripe.com/bJe7sL6WdfRQ94adwtcfK08',mode:'subscription',amount:499},
 vip_annual:{url:'https://buy.stripe.com/8x29ATdkB5dcgwCdwtcfK09',mode:'subscription',amount:3999},
 business:{url:'https://buy.stripe.com/4gM00ja8peNMdkq641cfK0e',mode:'subscription',amount:4900},
 credits_25:{url:'https://buy.stripe.com/14A9ATdkB8po4NU641cfK0a',mode:'payment',amount:299},
 credits_75:{url:'https://buy.stripe.com/aFaeVdeoF9ts4NU9gdcfK0b',mode:'payment',amount:699},
 credits_200:{url:'https://buy.stripe.com/8x2aEXgwN5dc4NUakhcfK0c',mode:'payment',amount:1499},
 credits_500:{url:'https://buy.stripe.com/5kQcN50xP35494afEBcfK0d',mode:'payment',amount:2999},
 matches_5:{url:'https://buy.stripe.com/28EbJ14fwdPT0Lk9s8gEg05',mode:'payment',amount:99},
 matches_25:{url:'https://buy.stripe.com/9B65kDdQ67rvdy68o4gEg06',mode:'payment',amount:299},
 matches_50:{url:'https://buy.stripe.com/6oU4gzbHY5jn0Lk5bSgEg07',mode:'payment',amount:499}
};
type CatalogEntry={key:string;link:string;price:string;currency:string;mode:'payment'|'subscription';active:boolean};
let cached:CatalogEntry[]|null=null;let cacheAt=0;
export async function catalog(stripe:any):Promise<CatalogEntry[]> {
 if(cached&&Date.now()-cacheAt<300000)return cached;
 const links=[];let after:string|undefined;
 for(let page=0;page<20;page++){
  const result=await stripe.paymentLinks.list({limit:100,...(after?{starting_after:after}:{})});links.push(...result.data);
  if(!result.has_more)break;after=result.data.at(-1)?.id;
 }
 const result:CatalogEntry[]=[];
 for(const [key,product] of Object.entries(PRODUCTS)){
  const link=links.find((l:any)=>l.url===product.url);if(!link)continue;
  const items=await stripe.paymentLinks.listLineItems(link.id,{limit:2,expand:['data.price']});
  if(items.has_more||items.data.length!==1||items.data[0].quantity!==1)continue;
  const price=items.data[0].price;
  if(!price||price.unit_amount!==product.amount||price.currency!=='usd')continue;
  if((!!price.recurring)!==(product.mode==='subscription'))continue;
  result.push({key,link:link.id,price:price.id,currency:price.currency,mode:product.mode,active:link.active!==false&&price.active!==false});
 }
 cached=result;cacheAt=Date.now();return result;
}
export async function verifiedCheckout(stripe:any,session:any):Promise<{user:string;product:CatalogEntry}|null>{
 if(session.status!=='complete'||session.payment_status!=='paid'||!session.client_reference_id)return null;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(session.client_reference_id))return null;
 const allowed=await catalog(stripe);
 const items=await stripe.checkout.sessions.listLineItems(session.id,{limit:2,expand:['data.price']});
 if(items.has_more||items.data.length!==1||items.data[0].quantity!==1)return null;
 const price=items.data[0].price;
 const product=allowed.find(p=>p.price===price?.id&&p.mode===session.mode&&p.currency===price.currency);
 if(!product)return null;
 const link=typeof session.payment_link==='string'?session.payment_link:session.payment_link?.id;
 if(link!==product.link&&!(session.metadata?.matchapp_product===product.key&&session.metadata?.matchapp_user===session.client_reference_id))return null;
 return {user:session.client_reference_id,product};
}
export async function deliver(db:any,session:any,verified:{user:string;product:CatalogEntry}){
 const {data,error}=await db.rpc('fulfill_stripe_checkout',{p_session_id:session.id,p_user_id:verified.user,p_plan:verified.product.key,p_customer_id:typeof session.customer==='string'?session.customer:null,p_subscription_id:typeof session.subscription==='string'?session.subscription:null});
 if(error||data?.delivered!==true)throw new Error('Delivery pending');return data;
}
