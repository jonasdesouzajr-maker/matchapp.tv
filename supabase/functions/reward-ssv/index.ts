// Public Google callback: cryptographic signature + atomic server ledger only.
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.105.0';
import {createGoogleKeyCache,dispatchRewardCallback,RewardVerificationError} from '../_shared/reward-ssv.mjs';
const keyCache=createGoogleKeyCache();
Deno.serve(async(req:Request)=>{
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(req.method!=='GET')return reply({ok:false,error:'method_not_allowed'},405);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{
  // Never parse/reserialize the signed query before signature verification.
  const result=await dispatchRewardCallback(req.url,{keyCache},async(reward:{claimNonce:string;userId:string;transactionId:string;adUnitId:string;rewardAmount:number;rewardItem:string;eventAt:string})=>{
  const url=Deno.env.get('SUPABASE_URL'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!service)throw new RewardVerificationError('configuration_unavailable',503);
  const boundedFetch:typeof fetch=(input,init)=>fetch(input,{...init,signal:controller.signal});
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:boundedFetch}});
  const {data,error}=await admin.rpc('credit_match_reward',{
   p_claim_nonce:reward.claimNonce,p_user_id:reward.userId,p_transaction_id:reward.transactionId,
   p_ad_unit:reward.adUnitId,p_reward_amount:reward.rewardAmount,p_reward_item:reward.rewardItem,p_event_at:reward.eventAt
  });
  if(error||!data)throw new RewardVerificationError('verification_unavailable',503);
  if(data.ok!==true)throw new RewardVerificationError('reward_not_verified',403);
  return {ok:true,credited:true,duplicate:data.duplicate===true};
  });
  return reply(result);
 }catch(error){
  if(error instanceof RewardVerificationError)return reply({ok:false,error:error.code},error.status);
  return reply({ok:false,error:'verification_unavailable'},503);
 }finally{clearTimeout(timer);}
});
