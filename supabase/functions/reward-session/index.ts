// User JWT is verified with Auth getUser. The gateway is not this authority.
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.105.0';
import {rewardRequest,RewardVerificationError} from '../_shared/reward-ssv.mjs';
import {REWARD_ORIGINS,rewardJson,rewardErrorStatus} from '../_shared/reward-http.ts';
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'';
 const headers:Record<string,string>={
  'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin',
  'Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'authorization,apikey,x-client-info,content-type',
  ...(REWARD_ORIGINS.has(origin)?{'Access-Control-Allow-Origin':origin}:{})
 };
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(origin&&!REWARD_ORIGINS.has(origin))return reply({ok:false,error:'origin_not_allowed'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply({ok:false,error:'method_not_allowed'},405);
 if(new URL(req.url).search)return reply({ok:false,error:'invalid_request'},400);
 const authorization=req.headers.get('authorization')||'';
 if(!/^Bearer [A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+$/.test(authorization)||authorization.length>8192)return reply({ok:false,error:'authentication_required'},401);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{
  const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!anon||!service)return reply({ok:false,error:'configuration_unavailable'},503);
  const boundedFetch:typeof fetch=(input,init)=>fetch(input,{...init,signal:controller.signal});
  const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:boundedFetch}};
  const authClient=createClient(url,anon,options);
  const {data:user,error:authError}=await authClient.auth.getUser(authorization.slice(7));
  // Anonymous Auth sessions are not registered wallets and cannot earn rewards.
  if(authError||!user.user?.id||user.user.is_anonymous===true)return reply({ok:false,error:'authentication_required'},401);
  const body=rewardRequest(await rewardJson(req,controller.signal));
  const nonce=body.action==='create'?Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join(''):body.claimNonce??null;
  const admin=createClient(url,service,options);
  const {data,error}=await admin.rpc('reward_session_service',{
   p_action:body.action,p_user_id:user.user.id,p_request_id:body.requestId??null,
   p_claim_nonce:nonce,p_surface:body.surface??'one_match'
  });
  if(error||!data)return reply({ok:false,error:'reward_service_unavailable'},503);
  if(data.ok!==true)return reply({ok:false,error:data.reason??'reward_unavailable'},rewardErrorStatus(String(data.reason)));
  return reply(data);
 }catch(error){
  if(error instanceof RewardVerificationError)return reply({ok:false,error:error.code},error.status);
  return reply({ok:false,error:'reward_service_unavailable'},503);
 }finally{clearTimeout(timer);}
});
