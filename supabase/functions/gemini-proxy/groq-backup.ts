// Independent GroqCloud tier for adult Ask AI and verified Matching.
// The parent Edge Function owns authorization, rate metering and prompts.
// All credentials stay in Supabase Edge Function secrets.
import { schemaFor } from "./openai-primary.ts";

type GroqMode = "discover" | "match_proposals" | "rank_candidates" | "legacy";
type GroqArgs = {
  req: Request; prompt: string; mode: GroqMode; key: string;
  cors: (req: Request) => Record<string,string>;
  blockXXX: (row: Record<string,unknown>) => boolean;
  explicitXXX: (text: string) => boolean;
  allowedCandidateIds?: string[];
};

// Both current production models support strict JSON-schema responses.
const GROQ_MODEL_CHAIN = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];
const GROQ_MODEL_TIMEOUT_MS = 10_000;
let unavailableUntil = 0; // Per-isolate circuit breaker only.

export async function callGroqBackup(args: GroqArgs): Promise<Response|null> {
  const {req,prompt,mode,key,cors,blockXXX,explicitXXX}=args;
  if (!key || Deno.env.get("GROQ_DISABLED")==="true" || Date.now()<unavailableUntil) return null;
  const format = schemaFor(mode);
  for (const model of GROQ_MODEL_CHAIN) {
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),GROQ_MODEL_TIMEOUT_MS);
    try {
      const result=await fetch("https://api.groq.com/openai/v1/chat/completions",{
        method:"POST",signal:controller.signal,
        headers:{"Content-Type":"application/json","Authorization":"Bearer "+key},
        body:JSON.stringify({
          model,messages:[{role:"user",content:prompt}],
          response_format:{type:"json_schema",json_schema:{
            name:format.name,strict:true,schema:format.schema
          }},
          reasoning_effort:"low",temperature:0.25,stream:false,
          max_completion_tokens:mode==="legacy"?1800:mode==="discover"?4000:mode==="rank_candidates"?500:2600
        })
      });
      if(!result.ok){
        // Never log the raw provider body, credentials or user prompt.
        console.warn("[gemini-proxy] Groq unavailable status="+result.status+" model="+model);
        if([401,402,403].includes(result.status)){
          unavailableUntil=Date.now()+300_000;
          return null;
        }
        if(result.status===429){
          const retry=Number(result.headers.get("retry-after")||"60");
          unavailableUntil=Date.now()+(Number.isFinite(retry)?
            Math.max(5,Math.min(120,retry))*1000:60_000);
          return null; // Shared account limit: yield immediately to OpenAI.
        }
        if(result.status===400||result.status===404||result.status>=500)continue;
        return null;
      }
      const data=await result.json();
      const choice=data?.choices?.[0];
      if(choice?.finish_reason!=="stop"||choice?.message?.refusal)continue;
      const raw=choice?.message?.content;
      if(typeof raw!=="string"||!raw.trim())continue;
      let parsed:Record<string,unknown>;
      try{parsed=JSON.parse(raw);}catch{continue;}
      if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))continue;
      if(mode==="discover"){
        if(typeof parsed.answer!=="string"||!Array.isArray(parsed.results))continue;
        const urls=[...parsed.answer.matchAll(/https?:\/\/[^\s)>\]]+/g)];
        if(explicitXXX(parsed.answer)||urls.some((m:RegExpMatchArray)=>blockXXX({url:m[0]}))){
          parsed.answer="MatchApp helps with mainstream, non-explicit entertainment.";
          parsed.results=[];
        }else{
          parsed.results=parsed.results.slice(0,12).filter((r:Record<string,unknown>)=>
            r&&typeof r.title==="string"&&!explicitXXX([r.title,r.type,r.synopsis].join(" "))&&!blockXXX(r));
        }
      }else if(mode==="rank_candidates"){
        if(!Array.isArray(parsed.ids))continue;
        const allowed=new Set(Array.isArray(args.allowedCandidateIds)?args.allowedCandidateIds:[]);
        parsed.ids=[...new Set(parsed.ids)].filter((id:unknown)=>
          typeof id==="string"&&allowed.has(id)).slice(0,12);
        if(!parsed.ids.length)continue;
      }else if(mode==="match_proposals"){
        if(!Array.isArray(parsed.results))continue;
        parsed.results=parsed.results.slice(0,16).filter((r:Record<string,unknown>)=>
          r&&typeof r.title==="string"&&r.title.trim().length>0&&
          !explicitXXX(r.title)&&["movie","tv"].includes(String(r.kind))&&
          Number.isInteger(r.year)&&Number(r.year)>1880);
        if(!parsed.results.length)continue;
      }else{
        if(typeof parsed.title!=="string"||!parsed.title.trim()||
          explicitXXX([parsed.title,parsed.synopsis,parsed.platform].join(" "))||blockXXX(parsed))continue;
      }
      console.info("[gemini-proxy] served tier=groq model="+model);
      // Existing frontend contract: Gemini-shaped candidates with provider metadata.
      return new Response(JSON.stringify({
        candidates:[{content:{parts:[{text:JSON.stringify(parsed)}]},finishReason:"STOP"}],
        _servedByModel:model,_servedByTier:"groq",_finishReason:"STOP"
      }),{headers:{...cors(req),"Content-Type":"application/json"}});
    }catch(_){
      console.warn("[gemini-proxy] Groq request failed model="+model);
    }finally{clearTimeout(timer);}
  }
  unavailableUntil=Date.now()+15_000; // Skip back-to-back double failures.
  return null;
}
