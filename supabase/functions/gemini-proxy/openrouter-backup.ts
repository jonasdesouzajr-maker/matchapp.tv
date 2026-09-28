// Independent OpenRouter route for adult Ask AI and verified Matching.
// Supabase gemini-proxy retains authentication, rate metering and prompt creation.
import { schemaFor } from "./openai-primary.ts";

type RouterMode = "discover" | "match_proposals" | "rank_candidates" | "legacy";
type RouterArgs = {
  req: Request; prompt: string; mode: RouterMode; key: string;
  cors: (req: Request) => Record<string,string>;
  blockXXX: (row: Record<string,unknown>) => boolean;
  explicitXXX: (text: string) => boolean;
  allowedCandidateIds?: string[];
};

// OpenRouter itself fails over between different model providers.
const OPENROUTER_MODELS = [
  "anthropic/claude-haiku-4.5",
  "meta-llama/llama-3.3-70b-instruct",
];
const OPENROUTER_TIMEOUT_MS = 16_000;
let unavailableUntil = 0; // Per-isolate cooldown for exhausted upstream credentials.

export async function callOpenRouterFirst(args: RouterArgs): Promise<Response|null> {
  const {req,prompt,mode,key,cors,blockXXX,explicitXXX}=args;
  if (!key || Deno.env.get("OPENROUTER_DISABLED")==="true" || Date.now()<unavailableUntil) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(),OPENROUTER_TIMEOUT_MS);
  try {
    const format = schemaFor(mode);
    const result = await fetch("https://openrouter.ai/api/v1/chat/completions",{
      method:"POST",signal:controller.signal,
      headers:{
        "Content-Type":"application/json",
        "Authorization":"Bearer "+key,
        "HTTP-Referer":"https://matchapp.tv",
        "X-Title":"MatchApp TV Ai"
      },
      body:JSON.stringify({
        models:OPENROUTER_MODELS,
        messages:[{role:"user",content:prompt}],
        provider:{require_parameters:true},
        response_format:{type:"json_schema",json_schema:{
          name:format.name,strict:true,schema:format.schema
        }},
        temperature:0.25,
        max_tokens:mode==="legacy"?900:mode==="discover"?2600:mode==="rank_candidates"?350:1500
      })
    });
    if(!result.ok){
      // Never log upstream bodies, keys, or user prompts.
      console.warn("[gemini-proxy] OpenRouter unavailable status="+result.status);
      if([401,402,403].includes(result.status)) unavailableUntil=Date.now()+300_000;
      else if(result.status===429) unavailableUntil=Date.now()+60_000;
      else if(result.status>=500) unavailableUntil=Date.now()+15_000;
      return null;
    }
    const data=await result.json();
    if(!data?.choices?.length || !["stop","end_turn"].includes(String(data.choices[0]?.finish_reason||""))) return null;
    const raw=data.choices[0]?.message?.content;
    if(typeof raw!=="string" || !raw.trim())return null;
    const parsed=JSON.parse(raw);
    if(!parsed || typeof parsed!=="object" || Array.isArray(parsed))return null;
    if(mode==="discover"){
      if(typeof parsed.answer!=="string" || !Array.isArray(parsed.results))return null;
      const urls=[...parsed.answer.matchAll(/https?:\/\/[^\s)>\]]+/g)];
      if(explicitXXX(parsed.answer)||urls.some((m:RegExpMatchArray)=>blockXXX({url:m[0]}))){
        parsed.answer="MatchApp helps with mainstream, non-explicit entertainment.";
        parsed.results=[];
      }else{
        parsed.results=parsed.results.slice(0,12).filter((r:Record<string,unknown>)=>
          r&&typeof r.title==="string"&&!explicitXXX([r.title,r.type,r.synopsis].join(" "))&&!blockXXX(r));
      }
    }else if(mode==="rank_candidates"){
      if(!Array.isArray(parsed.ids))return null;
      const allowed=new Set(Array.isArray(args.allowedCandidateIds)?args.allowedCandidateIds:[]);
      parsed.ids=[...new Set(parsed.ids)].filter((id:unknown)=>
        typeof id==="string" && allowed.has(id)).slice(0,12);
      if(!parsed.ids.length)return null;
    }else if(mode==="match_proposals"){
      if(!Array.isArray(parsed.results))return null;
      parsed.results=parsed.results.slice(0,16).filter((r:Record<string,unknown>)=>
        r&&typeof r.title==="string"&&r.title.trim().length>0&&
        !explicitXXX(r.title)&&["movie","tv"].includes(String(r.kind))&&
        Number.isInteger(r.year)&&Number(r.year)>1880);
      if(!parsed.results.length)return null;
    }else{
      if(typeof parsed.title!=="string"||!parsed.title.trim()||
         explicitXXX([parsed.title,parsed.synopsis,parsed.platform].join(" "))||
         blockXXX(parsed))return null;
    }
    const model=String(data.model||OPENROUTER_MODELS[0]).slice(0,100);
    console.info("[gemini-proxy] served tier=openrouter model="+model);
    // Existing frontend contract: Gemini-format content and nonsecret tier metadata.
    return new Response(JSON.stringify({
      candidates:[{content:{parts:[{text:JSON.stringify(parsed)}]},finishReason:"STOP"}],
      _servedByModel:model,_servedByTier:"openrouter",_finishReason:"STOP"
    }),{headers:{...cors(req),"Content-Type":"application/json"}});
  }catch(_){
    console.warn("[gemini-proxy] OpenRouter request failed or returned invalid JSON");
    return null;
  }finally{clearTimeout(timer);}
}
