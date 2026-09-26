import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.105.0";
import {verifyPublicSocialPost} from "./verification-core.mjs";

// Public visitors cannot have an authenticated MatchApp JWT. We apply a
// browser-origin + publishable-key request gate and isolate every DB mutation
// inside service-role-only private SQL procedures. Public platform metadata
// (never client confirmation) decides whether a share can earn a reward.
const ORIGINS=new Set(["https://matchapp.tv","https://www.matchapp.tv","http://localhost:3000","http://localhost:8080"]);
const uuid=v=>typeof v==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const SUPABASE_URL=Deno.env.get("SUPABASE_URL")||"";
const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const publicKey=Deno.env.get("SUPABASE_ANON_KEY")||"";
const db=SUPABASE_URL&&service?createClient(SUPABASE_URL,service,{auth:{autoRefreshToken:false,persistSession:false}}):null;
function cors(origin:string|null){return {
 "Access-Control-Allow-Origin":origin&&ORIGINS.has(origin)?origin:"https://matchapp.tv",
 "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
 "Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json; charset=utf-8",
 "Cache-Control":"no-store","Vary":"Origin"
};}
const response=(data:Record<string,unknown>,status=200,origin:string|null=null)=>
 new Response(JSON.stringify(data),{status,headers:cors(origin)});
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("origin");
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(origin)});
 if(req.method!=="POST")return response({ok:false,reason:"method_not_allowed"},405,origin);
 if(!origin||!ORIGINS.has(origin))return response({ok:false,reason:"origin_not_allowed"},403,origin);
 // The anon key is public, not a substitute for identity, but blocks
 // accidental invocation unrelated to the website. Correctness derives
 // from official public post metadata and the private transactional ledger.
 const key=req.headers.get("apikey")||"";
 if(!publicKey||key!==publicKey||!db)return response({ok:false,reason:"service_unavailable"},503,origin);
 try{
  const raw=await req.text();if(raw.length>2800)return response({ok:false,reason:"invalid_request"},400,origin);
  const body=JSON.parse(raw),action=String(body.action||"");
  const guestId=body.guest_id;
  if(!uuid(guestId))return response({ok:false,reason:"invalid_request"},400,origin);
  if(action==="start"){
   const kind=body.kind;
   if(kind!=="match"&&kind!=="ask_ai")return response({ok:false,reason:"invalid_request"},400,origin);
   const {data,error}=await db.rpc("verified_guest_social_gateway",{p_action:"start",p_guest_id:guestId,p_kind:kind});
   if(error){console.error("Guest proof issue failed:",error.code);return response({ok:false,reason:"server_error"},503,origin);}
   return response(data,200,origin);
  }
  if(action!=="verify")return response({ok:false,reason:"invalid_request"},400,origin);
  const proofId=body.proof_id,platform=body.platform,url=body.post_url;
  if(!uuid(proofId)||!["tiktok","bluesky"].includes(platform)||typeof url!=="string"||url.length>700){
   return response({ok:false,reason:"invalid_request"},400,origin);
  }
  // Never fetch user-provided URLs: verification-core builds only official
  // allowlisted, fixed provider URLs from strict parsed post identifiers.
  const {data:proof,error:lookupError}=await db.rpc("verified_guest_social_gateway",{p_action:"get",p_guest_id:guestId,p_proof_id:proofId});
  if(lookupError)return response({ok:false,reason:"server_error"},503,origin);
  if(!proof||proof.status!=="pending")return response({ok:false,reason:"challenge_not_available"},400,origin);
  if(Date.now()-Date.parse(proof.issued_at)>90*60*1000)return response({ok:false,reason:"challenge_expired"},400,origin);
  let result;
  try{
   result=await verifyPublicSocialPost({
    platform,postUrl:url,challenge:proof.challenge,issuedAt:proof.issued_at
   });
  }catch(e){
   const reason=String((e as Error)?.message||"");
   if(["invalid_post_url","unsupported_platform"].includes(reason))return response({ok:false,reason},400,origin);
   return response({ok:false,reason:"provider_unavailable"},503,origin);
  }
  if(!result?.verified)return response({ok:false,reason:result?.reason||"proof_not_found"},422,origin);
  const {data:credited,error:grantError}=await db.rpc("verified_guest_social_gateway",{
   p_action:"complete",p_guest_id:guestId,p_proof_id:proofId,p_platform:result.platform,p_post_id:result.id,p_post_url:result.url
  });
  if(grantError){
   // A unique post cannot credit another guest; fail closed on collisions.
   if(grantError.code==="23505")return response({ok:false,reason:"post_already_used"},409,origin);
   console.error("Guest proof credit failed:",grantError.code);
   return response({ok:false,reason:"server_error"},503,origin);
  }
  return response(credited,credited?.ok?200:409,origin);
 }catch(e){
  console.error("Guest social proof failed:",(e as Error)?.name||"Error");
  return response({ok:false,reason:"server_error"},503,origin);
 }
});
