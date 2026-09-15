// Verified MatchApp billing catalog. USD Payment Links are canonical; BRL Price IDs are
// server-side identifiers. Environment values can override the built-in IDs without
// exposing Stripe secret keys to the browser.
type BillingProduct={url:string;mode:'payment'|'subscription';amount:number;brl:number;interval?:'month'|'year'};
export const PRODUCTS:Record<string,BillingProduct>={
 ad_free:{url:'https://buy.stripe.com/dRmeVd4O58po8068c9cfK0j',mode:'payment',amount:199,brl:490},
 vip_monthly:{url:'https://buy.stripe.com/bJe7sL6WdfRQ94adwtcfK08',mode:'subscription',amount:499,brl:990,interval:'month'},
 vip_annual:{url:'https://buy.stripe.com/6oU6oH2FX8po1BI9gdcfK0f',mode:'subscription',amount:3999,brl:7990,interval:'year'},
 business:{url:'https://buy.stripe.com/4gM00ja8peNMdkq641cfK0e',mode:'subscription',amount:4900,brl:14990,interval:'month'},
 credits_25:{url:'https://buy.stripe.com/14A9ATdkB8po4NU641cfK0a',mode:'payment',amount:299,brl:490},
 credits_75:{url:'https://buy.stripe.com/aFaeVdeoF9ts4NU9gdcfK0b',mode:'payment',amount:699,brl:990},
 credits_200:{url:'https://buy.stripe.com/8x2aEXgwN5dc4NUakhcfK0c',mode:'payment',amount:1499,brl:1990},
 credits_500:{url:'https://buy.stripe.com/5kQcN50xP35494afEBcfK0d',mode:'payment',amount:2999,brl:3490},
 matches_5:{url:'https://buy.stripe.com/eVq6oH2FX6hg1BIbolcfK0g',mode:'payment',amount:99,brl:190},
 matches_25:{url:'https://buy.stripe.com/28E4gz0xP210gwCdwtcfK0h',mode:'payment',amount:299,brl:490},
 matches_50:{url:'https://buy.stripe.com/dRm5kDcgxcFEcgmcspcfK0i',mode:'payment',amount:499,brl:790}
};
const BRL_PRICES:Record<string,string>={
 ad_free:'price_1UG14OFRuUuhrLPGZBiUsKMc',
 vip_monthly:'price_1UG14UFRuUuhrLPGSsGvVZiL',
 vip_annual:'price_1UG14ZFRuUuhrLPGROre5ieP',
 business:'price_1UG14fFRuUuhrLPGuRXlPHP6',
 credits_25:'price_1UG14kFRuUuhrLPGMRpkVSga',
 credits_75:'price_1UG14qFRuUuhrLPGpGkli5vO',
 credits_200:'price_1UG14vFRuUuhrLPGMEJbIth1',
 credits_500:'price_1UG152FRuUuhrLPGP9TeC2r8',
 matches_5:'price_1UG15AFRuUuhrLPGMqz4oEtq',
 matches_25:'price_1UG15GFRuUuhrLPGIuFHwGVN',
 matches_50:'price_1UG15LFRuUuhrLPGtV0czK4N'
};
type CatalogEntry={key:string;link:string|null;price:string;currency:'usd'|'brl';mode:'payment'|'subscription';active:boolean};
let cached:CatalogEntry[]|null=null;let cacheAt=0;
const envKey=(key:string)=>'STRIPE_BRL_PRICE_'+key.toUpperCase();
const env=(key:string)=>typeof Deno!=='undefined'&&Deno.env?Deno.env.get(key):undefined;
const cadenceOk=(price:any,product:BillingProduct)=>product.mode==='subscription'
 ? !!price?.recurring&&price.recurring.interval===product.interval&&price.recurring.interval_count===1
 : !price?.recurring;
export async function catalog(stripe:any):Promise<CatalogEntry[]>{
 if(cached&&Date.now()-cacheAt<300000)return cached;
 const links=[];let after:string|undefined;
 for(let page=0;page<20;page++){
  const r=await stripe.paymentLinks.list({limit:100,...(after?{starting_after:after}:{})});links.push(...r.data);
  if(!r.has_more)break;after=r.data.at(-1)?.id;
 }
 const result:CatalogEntry[]=[];
 for(const [key,product] of Object.entries(PRODUCTS)){
  const link=links.find((l:any)=>l.url===product.url);
  if(link){
   const items=await stripe.paymentLinks.listLineItems(link.id,{limit:2,expand:['data.price']});
   if(!items.has_more&&items.data.length===1&&items.data[0].quantity===1){
    const price=items.data[0].price;
    if(price&&price.unit_amount===product.amount&&price.currency==='usd'&&cadenceOk(price,product))
     result.push({key,link:link.id,price:price.id,currency:'usd',mode:product.mode,active:link.active!==false&&price.active!==false});
   }
  }
  const brlId=env(envKey(key))||BRL_PRICES[key];
  if(brlId&&/^price_[A-Za-z0-9]+$/.test(brlId)){
   try{
    const price=await stripe.prices.retrieve(brlId);
    if(price.active!==false&&price.currency==='brl'&&price.unit_amount===product.brl&&cadenceOk(price,product))
     result.push({key,link:null,price:price.id,currency:'brl',mode:product.mode,active:true});
   }catch(_){console.error('[billing] Invalid BRL price for '+key);}
  }
 }
 cached=result;cacheAt=Date.now();return result;
}
export async function verifiedCheckout(stripe:any,session:any):Promise<{user:string;product:CatalogEntry}|null>{
 if(session.status!=='complete'||session.payment_status!=='paid'||!session.client_reference_id)return null;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(session.client_reference_id))return null;
 const allowed=await catalog(stripe);const items=await stripe.checkout.sessions.listLineItems(session.id,{limit:2,expand:['data.price']});
 if(items.has_more||items.data.length!==1||items.data[0].quantity!==1)return null;
 const price=items.data[0].price;const product=allowed.find(p=>p.price===price?.id&&p.mode===session.mode&&p.currency===price.currency);
 if(!product)return null;
 const link=typeof session.payment_link==='string'?session.payment_link:session.payment_link?.id;
 if(product.link&&link!==product.link&&!(session.metadata?.matchapp_product===product.key&&session.metadata?.matchapp_user===session.client_reference_id))return null;
 if(!product.link&&!(session.metadata?.matchapp_product===product.key&&session.metadata?.matchapp_user===session.client_reference_id))return null;
 return{user:session.client_reference_id,product};
}
export async function deliver(db:any,session:any,verified:{user:string;product:CatalogEntry}){
 const {data,error}=await db.rpc('fulfill_stripe_checkout',{p_session_id:session.id,p_user_id:verified.user,p_plan:verified.product.key,p_customer_id:typeof session.customer==='string'?session.customer:null,p_subscription_id:typeof session.subscription==='string'?session.subscription:null});
 if(error||data?.delivered!==true)throw new Error('Delivery pending');return data;
}
