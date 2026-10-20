// New Pro endpoints; does not replace the existing Stripe/Kids/Jonas checkout.
import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.105.0';
import {PRO_PRODUCT,PRO_PORTAL,PRO_RETENTION_COUPON,PRO_PRICE_ROWS,language,market,
  catalogOffer,stripeHostedUrl} from '../_shared/pro-core.mjs';
import {proBillingState,syncProSubscription,confirmProCheckout} from '../_shared/pro-stripe.mjs';
import {verifiedLegacySubscription,proManagementTarget,publicProBillingState} from '../_shared/pro-legacy.mjs';
import {ProCheckoutError,recoverProCheckout} from '../_shared/pro-checkout.mjs';

const stripe=new Stripe(Deno.env.get('STRIPE_SECRET_KEY')??'',{apiVersion:'2025-01-27.acacia',
  httpClient:Stripe.createFetchHttpClient(),maxNetworkRetries:1,timeout:10000});
const url=Deno.env.get('SUPABASE_URL')??'',anon=Deno.env.get('SUPABASE_ANON_KEY')??'';
const db=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'',{auth:{persistSession:false,autoRefreshToken:false}});
const origins=new Set(['https://matchapp.tv','https://www.matchapp.tv','http://127.0.0.1:8899','http://localhost:8899']);
let quotes:{at:number;offers:any[]}|null=null;
async function settings(){
  const {data,error}=await db.rpc('get_matchapp_monetization_config');
  if(error||data?.ok!==true)throw new Error('Pro configuration unavailable');
  return data;
}
async function offers(){
  if(quotes&&Date.now()-quotes.at<300000)return quotes.offers;
  const product=await stripe.products.retrieve(PRO_PRODUCT);
  if(!product.active||product.livemode!==true)throw new Error('Pro product unavailable');
  const values=await Promise.all(PRO_PRICE_ROWS.map(async(row:any)=>{
    const price=await stripe.prices.retrieve(row.priceId);
    return catalogOffer(price,row.country);
  }));
  quotes={at:Date.now(),offers:values.filter(Boolean)};
  return quotes.offers;
}
async function limited(userId:string){
  const {data,error}=await db.rpc('reserve_pro_billing_request',{p_user_id:userId});
  if(error||data!==true)throw new Error('Billing rate limit');
}
function latestStripe(state:any){
  return state.entitlements.filter((row:any)=>row.provider==='stripe'&&row.product_id===PRO_PRODUCT)
    .sort((a:any,b:any)=>Date.parse(b.expires_at)-Date.parse(a.expires_at))[0]||null;
}
const returnUrl=(lang:string)=>'https://matchapp.tv/pricing/pricing.html?pro_return=managed&lang='+encodeURIComponent(lang);
async function requestBody(req:Request){
  const declared=Number(req.headers.get('content-length')||0);
  if(declared>8192)throw new RangeError('request_too_large');
  if(!req.body)throw new SyntaxError('invalid_request');
  const reader=req.body.getReader(),parts:Uint8Array[]=[];
  let size=0;
  try{
    while(true){
      const {value,done}=await reader.read();if(done)break;
      size+=value.byteLength;
      if(size>8192){await reader.cancel();throw new RangeError('request_too_large');}
      parts.push(value);
    }
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;
  for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}
  const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(!value||Array.isArray(value)||typeof value!=='object')throw new SyntaxError('invalid_request');
  return value;
}
Deno.serve(async(req:Request)=>{
  const origin=req.headers.get('origin')||'';
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',
    'Access-Control-Allow-Headers':'authorization,apikey,x-client-info,content-type','Access-Control-Allow-Methods':'POST,OPTIONS',
    ...(origins.has(origin)?{'Access-Control-Allow-Origin':origin}:{})};
  const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return reply({ok:false,error:'method_not_allowed'},405);
  if(origin&&!origins.has(origin))return reply({ok:false,error:'origin_not_allowed'},403);
  try{
    let body;
    try{body=await requestBody(req);}
    catch(error){return reply({ok:false,error:error instanceof RangeError?'request_too_large':'invalid_request'},error instanceof RangeError?413:400);}
    const action=body.action,lang=language(body.lang);
    if(action==='catalog'){
      const config=await settings();
      const enabled=config.enabled===true&&config.stripe_product_ids?.includes(PRO_PRODUCT);
      if(!enabled)return reply({ok:true,enabled:false,productName:'MatchApp Ai Pro',offer:null,availableCountries:[]});
      const list=await offers(),selected=market(body.country);
      const offer=list.find((row:any)=>row.country===selected.country)||null;
      return reply({ok:true,enabled:!!offer,productName:'MatchApp Ai Pro',offer,availableCountries:list.map((row:any)=>row.country)});
    }
    const token=(req.headers.get('authorization')||'').replace(/^Bearer /i,'');
    if(!token)return reply({ok:false,error:'sign_in_required'},401);
    const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:'Bearer '+token}}});
    const {data:{user},error}=await auth.auth.getUser(token);
    if(error||!user)return reply({ok:false,error:'sign_in_required'},401);
    if(!['status','checkout','manage','retain'].includes(action))return reply({ok:false,error:'unknown_action'},400);
    await limited(user.id);
    let state=await proBillingState(db,user.id);
    const legacy=await verifiedLegacySubscription(db,stripe,user.id);
    if(action==='status'){
      let checkoutDelivered=false;
      if(body.sessionId!==undefined){
        const delivery=await confirmProCheckout(db,stripe,String(body.sessionId),user.id);
        checkoutDelivered=delivery.delivered===true;
        state=await proBillingState(db,user.id);
      }
      const checkoutFeedback=body.sessionId!==undefined?{checkoutDelivered}:{};
      let result={...publicProBillingState(state,legacy),...checkoutFeedback};
      const entry=latestStripe(state);
      if(entry&&result.provider==='stripe'&&!legacy.hasLegacySubscription){
        // Read current provider state before offering retention. Status failures
        // never manufacture an offer or a paid entitlement.
        const current=await syncProSubscription(db,stripe,entry.external_id,user.id);
        state=await proBillingState(db,user.id);result={...publicProBillingState(state,legacy),...checkoutFeedback};
        if(current.retentionEligible&&result.entitled&&result.provider==='stripe')return reply({...result,retentionEligible:true,
          retentionOffer:{percentOff:50,months:3}});
      }
      return reply(result);
    }
    if(action==='checkout'){
      if(/MatchApp(?:TV|Ai)Android/i.test(req.headers.get('user-agent')||''))return reply({ok:false,error:'use_google_play'},403);
      const config=await settings();
      if(config.enabled!==true||!config.stripe_product_ids?.includes(PRO_PRODUCT))return reply({ok:false,error:'sales_unavailable'},503);
      if(legacy.hasLegacySubscription)return reply({ok:false,error:'legacy_subscription_active',
        hasLegacySubscription:true,canManage:true,provider:'stripe'},409);
      if(state.pro?.active===true)return reply({ok:false,error:'already_subscribed'},409);
      const entry=latestStripe(state);
      if(entry){
        const checked=await syncProSubscription(db,stripe,entry.external_id,user.id);
        if(!['canceled','incomplete_expired'].includes(checked.sub.status))return reply({ok:false,error:'manage_existing_subscription'},409);
      }
      const selected=market(body.country),offer=(await offers()).find((row:any)=>row.country===selected.country);
      if(!offer)return reply({ok:false,error:'price_unavailable'},503);
      const reserved=await db.rpc('reserve_pro_checkout',{p_user_id:user.id,p_price_id:offer.priceId,p_lang:lang});
      const intent=reserved.data;
      if(reserved.error||intent?.ok!==true||typeof intent.request_id!=='string'||
        !Number.isFinite(Date.parse(intent.expires_at)))throw new Error('Checkout reservation unavailable');
      // Every tab shares one immutable quote during the private reservation.
      // A new country or language cannot create another simultaneous purchase.
      if(intent.price_id!==offer.priceId||intent.lang!==lang)return reply({ok:false,error:'checkout_already_open'},409);
      const customerId=intent.customer_id||entry?.customer_id;
      const customer=customerId?await stripe.customers.retrieve(customerId):await stripe.customers.create({
        metadata:{matchapp_user:user.id,matchapp_product:'pro_customer'}
      },{idempotencyKey:'matchapp-pro-customer-'+user.id});
      if(customer.deleted||customer.livemode!==true||customer.metadata?.matchapp_user!==user.id||
        customer.metadata?.matchapp_product!=='pro_customer')return reply({ok:false,error:'customer_unavailable'},503);
      const binding=await db.rpc('bind_pro_checkout_customer',{p_user_id:user.id,p_request_id:intent.request_id,p_customer_id:customer.id});
      if(binding.error||binding.data?.ok!==true)throw new Error('Checkout customer binding unavailable');
      // A lost response can leave an open provider session after the private
      // quote expires. Recover it before creating or replacing any payment page.
      const {session}=await recoverProCheckout(stripe,{userId:user.id,customerId:customer.id,offer,intent,lang},{
        now:Date.now,
        assertIntent:async(requestId:string,boundCustomerId:string)=>{
          const current=await db.rpc('bind_pro_checkout_customer',{
            p_user_id:user.id,p_request_id:requestId,p_customer_id:boundCustomerId});
          return !current.error&&current.data?.ok===true;
        },
        reconcileSession:(sessionId:string)=>confirmProCheckout(db,stripe,sessionId,user.id)
      });
      const redirect=stripeHostedUrl(session.url,'checkout');
      if(!redirect)throw new Error('Untrusted checkout URL');
      return reply({ok:true,url:redirect});
    }
    // Management and restore remain available when new sales are paused.
    // An active Play plan wins over an expired Stripe history; its cancellation
    // and retention must stay with the provider that owns the current plan.
    const target=proManagementTarget(state,legacy);
    if(target==='play'){
      if(action==='retain')return reply({ok:false,error:'offer_unavailable'},409);
      return reply({ok:true,url:'https://play.google.com/store/account/subscriptions?package=com.jonas.papercup'});
    }
    if(target==='legacy_stripe'){
      if(action==='retain')return reply({ok:false,error:'offer_unavailable'},409);
      // Omit the new Pro configuration: existing subscribers retain their
      // original account portal and make any plan changes there themselves.
      const portal=await stripe.billingPortal.sessions.create({customer:legacy.customerId,return_url:returnUrl(lang)});
      const redirect=stripeHostedUrl(portal.url,'portal');
      if(!redirect)throw new Error('Untrusted portal URL');
      return reply({ok:true,url:redirect,hasLegacySubscription:true});
    }
    if(action==='retain'&&legacy.hasLegacySubscription)return reply({ok:false,error:'offer_unavailable'},409);
    const entry=latestStripe(state);
    if(!entry){
      if(action==='manage'&&state.entitlements.some((row:any)=>row.provider==='play'))
        return reply({ok:true,url:'https://play.google.com/store/account/subscriptions?package=com.jonas.papercup'});
      return reply({ok:false,error:'no_subscription'},404);
    }
    const current=await syncProSubscription(db,stripe,entry.external_id,user.id);
    if(action==='retain'){
      if(current.sub.metadata?.matchapp_pro_retention_used==='true')return reply({ok:true,applied:false,alreadyApplied:true});
      if(!current.retentionEligible||current.stored.active!==true)return reply({ok:false,error:'offer_unavailable'},409);
      const coupon=await stripe.coupons.retrieve(PRO_RETENTION_COUPON);
      if(!coupon.valid||coupon.percent_off!==50||coupon.duration!=='repeating'||coupon.duration_in_months!==3||
        !coupon.applies_to?.products?.includes(PRO_PRODUCT))throw new Error('Retention coupon unavailable');
      await stripe.subscriptions.update(current.sub.id,{discounts:[{coupon:PRO_RETENTION_COUPON}],
        metadata:{...current.sub.metadata,matchapp_pro_retention_used:'true'},proration_behavior:'none'
      },{idempotencyKey:'matchapp-pro-retain-'+current.sub.id});
      await syncProSubscription(db,stripe,current.sub.id,user.id);
      return reply({ok:true,applied:true,percentOff:50,months:3});
    }
    const params:any={customer:current.identity.customerId,configuration:PRO_PORTAL,return_url:returnUrl(lang)};
    if(body.intent==='cancel'&&current.sub.status!=='canceled')params.flow_data={type:'subscription_cancel',
      subscription_cancel:{subscription:current.sub.id},after_completion:{type:'redirect',redirect:{return_url:returnUrl(lang)}}};
    const portal=await stripe.billingPortal.sessions.create(params);
    const redirect=stripeHostedUrl(portal.url,'portal');if(!redirect)throw new Error('Untrusted portal URL');
    return reply({ok:true,url:redirect});
  }catch(error){
    if(error instanceof ProCheckoutError)return reply({ok:false,error:error.code},error.status);
    console.error('[pro-billing] Verified billing operation temporarily unavailable');
    return reply({ok:false,error:'billing_temporarily_unavailable'},503);
  }
});
