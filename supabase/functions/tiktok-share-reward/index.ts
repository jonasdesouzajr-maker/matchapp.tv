import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {adultPromotionPolicy} from "../_shared/adult-promotion-policy.mjs";

const MAX_REWARDS = 5;
const ALLOWED = new Set(["instagram","facebook","tiktok"]);
const ORIGINS = new Set(["https://matchapp.tv","https://www.matchapp.tv","http://localhost:3000","http://localhost:8080"]);

const cors = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && ORIGINS.has(origin) ? origin : "https://matchapp.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
});

const uuid = (v: unknown) => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

Deno.serve(async (req: Request) => {
  const origin=req.headers.get("origin");
  if(req.method==="OPTIONS") return new Response(null,{status:204,headers:cors(origin)});
  if(req.method!=="POST") return new Response(JSON.stringify({ok:false,error:"method_not_allowed"}),{status:405,headers:cors(origin)});

  try{
    const body=await req.json();
    const browserId=body?.browser_id;
    const eventId=body?.event_id;
    const platform=String(body?.platform||"").toLowerCase();
    if(!uuid(browserId)||!uuid(eventId)||!ALLOWED.has(platform)){
      return new Response(JSON.stringify({ok:false,error:"invalid_request"}),{status:400,headers:cors(origin)});
    }

    const supabase=createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {auth:{persistSession:false,autoRefreshToken:false}}
    );

    // No server-issued pending promise exists in this legacy handoff protocol.
    const policy=await adultPromotionPolicy(supabase);
    if(!policy.known)return new Response(JSON.stringify({ok:false,error:"service_unavailable"}),{status:503,headers:cors(origin)});
    if(policy.retired)return new Response(JSON.stringify({ok:false,granted:false,reason:"monetization_policy_changed"}),{status:409,headers:cors(origin)});

    const {count,error:countErr}=await supabase
      .schema("match_private")
      .from("tiktok_ad_share_rewards")
      .select("event_id",{count:"exact",head:true})
      .eq("browser_id",browserId);
    if(countErr) throw countErr;

    const used=Number(count||0);
    if(used>=MAX_REWARDS){
      return new Response(JSON.stringify({ok:true,granted:false,used,remaining:0,proof:"browser_share_handoff"}),{status:200,headers:cors(origin)});
    }

    const {error:insertErr}=await supabase
      .schema("match_private")
      .from("tiktok_ad_share_rewards")
      .insert({event_id:eventId,browser_id:browserId,platform});
    if(insertErr){
      if(String(insertErr.code)==="23505"){
        const remaining=Math.max(0,MAX_REWARDS-used);
        return new Response(JSON.stringify({ok:true,granted:false,duplicate:true,used,remaining,proof:"browser_share_handoff"}),{status:200,headers:cors(origin)});
      }
      throw insertErr;
    }

    const nextUsed=used+1;
    return new Response(JSON.stringify({
      ok:true,
      granted:true,
      used:nextUsed,
      remaining:Math.max(0,MAX_REWARDS-nextUsed),
      proof:"browser_share_handoff"
    }),{status:200,headers:cors(origin)});
  }catch(error){
    return new Response(JSON.stringify({ok:false,error:"server_error"}),{status:500,headers:cors(origin)});
  }
});