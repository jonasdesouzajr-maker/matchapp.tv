// Public Stripe endpoint: the raw-body Stripe signature is mandatory authentication.
import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.105.0';
import {verifiedCheckout,deliver,catalog} from '../_shared/billing.ts';
const stripe=new Stripe(Deno.env.get('STRIPE_SECRET_KEY')??'',{apiVersion:'2025-01-27.acacia',httpClient:Stripe.createFetchHttpClient()});
const cryptoProvider=Stripe.createSubtleCryptoProvider();
const db=createClient(Deno.env.get('SUPABASE_URL')??'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'');
async function record(id:string,type:string,user:string|null,plan:string|null){
 const {error}=await db.from('stripe_events').insert({id,type,user_id:user,plan});
 if(error&&error.code!=='23505')throw new Error('Audit recording pending');
}
Deno.serve(async(req:Request)=>{
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const signature=req.headers.get('stripe-signature'),secret=Deno.env.get('STRIPE_WEBHOOK_SECRET');
 if(!signature||!secret)return new Response('Missing signature',{status:400});
 let event:Stripe.Event;
 try{event=await stripe.webhooks.constructEventAsync(await req.text(),signature,secret,undefined,cryptoProvider);}
 catch(_){return new Response('Invalid signature',{status:400});}
 try{
  const prior=await db.from('stripe_events').select('id').eq('id',event.id).maybeSingle();
  if(prior.error)throw new Error('Audit unavailable');
  if(prior.data)return new Response(JSON.stringify({received:true,duplicate:true}),{headers:{'Content-Type':'application/json'}});
  let uid:string|null=null,plan:string|null=null;
  if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)){
   const session=await stripe.checkout.sessions.retrieve((event.data.object as Stripe.Checkout.Session).id);
   if(session.payment_status==='paid'){
    const verified=await verifiedCheckout(stripe,session);
    if(!verified)throw new Error('Paid checkout requires reconciliation');
    await deliver(db,session,verified);uid=verified.user;plan=verified.product.key;
   }
  }else if(['customer.subscription.updated','customer.subscription.deleted'].includes(event.type)){
   const id=(event.data.object as Stripe.Subscription).id;
   const sub=await stripe.subscriptions.retrieve(id);
   const customer=typeof sub.customer==='string'?sub.customer:sub.customer.id;
   // Ignore stale notifications belonging to a different subscription.
   const result=await db.from('profiles').select('id,ad_free_purchased').eq('stripe_customer_id',customer).eq('stripe_subscription_id',sub.id).maybeSingle();
   if(result.error)throw new Error('Account lookup pending');
   if(result.data){
    uid=result.data.id;
    const dead=['canceled','unpaid','incomplete_expired'].includes(sub.status);
    const price=sub.items.data[0]?.price?.id;
    const product=(await catalog(stripe)).find(p=>p.price===price&&p.mode==='subscription');
    const patch:Record<string,unknown>={subscription_status:sub.status,subscription_updated_at:new Date().toISOString()};
    if(dead){Object.assign(patch,{is_vip:false,is_business:false,is_ad_free:result.data.ad_free_purchased===true,subscription_plan:null});}
    else if(sub.status==='active'&&product){Object.assign(patch,{is_vip:true,is_business:product.key==='business',is_ad_free:true,subscription_plan:product.key});}
    const update=await db.from('profiles').update(patch).eq('id',uid).eq('stripe_subscription_id',sub.id);if(update.error)throw new Error('Subscription delivery pending');
   }
  }else if(event.type==='invoice.payment_succeeded'){
   const invoice=event.data.object as Stripe.Invoice;
   if(typeof invoice.customer==='string'){
    const result=await db.from('profiles').select('id').eq('stripe_customer_id',invoice.customer).maybeSingle();if(result.error)throw new Error('Account lookup pending');uid=result.data?.id||null;
   }
  }
  await record(event.id,event.type,uid,plan);
  return new Response(JSON.stringify({received:true}),{headers:{'Content-Type':'application/json'}});
 }catch(_){console.error('[stripe-webhook] Verified event needs retry/reconciliation');return new Response('Delivery pending',{status:500});}
});
