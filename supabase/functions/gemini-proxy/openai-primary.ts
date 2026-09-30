// One scoped OpenAI provider for adult Match and Ask AI; no client secrets.
// Adult fallback order: OpenRouter, this OpenAI provider, then Gemini and Groq. Never use this module for Kids Mode.
const OPENAI_MODEL = "gpt-5.6-luna";
const OPENAI_TIMEOUT_MS = 16000;
type SchemaMode = "discover" | "match_proposals" | "rank_candidates" | "legacy";
type OpenAIArgs = {
  req: Request; prompt: string; mode: SchemaMode; key: string;
  reserve: () => Promise<boolean>; cors: (req: Request) => Record<string,string>;
  blockXXX: (row: Record<string,unknown>) => boolean; explicitXXX: (text: string) => boolean;
  allowedCandidateIds?: string[];
  acceptDiscoverAnswer?: (answer: string) => boolean;
};
export function schemaFor(mode: SchemaMode) {
  const str = { type: "string" };
  const legacy = {
    type:"object",additionalProperties:false,
    properties:{title:str,synopsis:str,platform:str},
    required:["title","synopsis","platform"]
  };
  const discover = {
    type:"object",additionalProperties:false,
    properties:{ answer:str,results:{type:"array",items:{
      type:"object",additionalProperties:false,
      properties:{title:str,year:str,type:str,platform:str,synopsis:str},
      required:["title","year","type","platform","synopsis"]
    }}},required:["answer","results"]
  };
  const proposals = {
    type:"object",additionalProperties:false,
    properties:{results:{type:"array",items:{
      type:"object",additionalProperties:false,
      properties:{title:str,year:{type:"integer"},kind:{type:"string",enum:["movie","tv"]}},
      required:["title","year","kind"]
    }}},required:["results"]
  };
  const rank = {
    type:"object", additionalProperties:false,
    properties:{ ids:{type:"array",items:str} }, required:["ids"]
  };
  return {type:"json_schema",name:"matchapp_"+mode,strict:true,
          schema:mode==="discover"?discover:mode==="match_proposals"?proposals:mode==="rank_candidates"?rank:legacy};
}
export async function callOpenAIPrimary(args: OpenAIArgs): Promise<Response|null> {
  const {req,prompt,mode,key,reserve,cors,blockXXX,explicitXXX}=args;
  if (!key || Deno.env.get("OPENAI_PRIMARY_DISABLED")==="true") return null;
  // Fail closed if the atomic daily reservation RPC is missing or times out.
  try { if (!(await reserve())) { console.warn("[gemini-proxy] OpenAI primary daily budget gate closed"); return null; } }
  catch (_) { console.warn("[gemini-proxy] OpenAI budget gate unavailable"); return null; }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(),OPENAI_TIMEOUT_MS);
  try {
    const result = await fetch("https://api.openai.com/v1/responses",{
      method:"POST",signal:controller.signal,
      headers:{"Content-Type":"application/json","Authorization":"Bearer "+key},
      body:JSON.stringify({
        model:OPENAI_MODEL,input:prompt,store:false,reasoning:{effort:"none"},
        max_output_tokens:mode==="legacy"?900:mode==="discover"?2600:mode==="rank_candidates"?350:1500,
        text:{format:schemaFor(mode)}
      })
    });
    if (!result.ok) {
      // Never log provider response bodies, the API key or the user's prompt.
      console.warn("[gemini-proxy] OpenAI unavailable status="+result.status);
      return null;
    }
    const data=await result.json();
    if(data?.status!=="completed")return null;
    const output=Array.isArray(data.output)?data.output:[];
    const raw=output.flatMap((m: {type?:string;content?:Array<{type?:string;text?:string}>})=>
      m.type==="message"&&Array.isArray(m.content)?m.content:[])
      .filter((c:{type?:string;text?:string})=>c.type==="output_text")
      .map((c:{text?:string})=>c.text||"").join("");
    if(!raw)return null;
    const parsed=JSON.parse(raw);
    if(!parsed||typeof parsed!=="object")return null;
    if(mode==="discover"){
      if(typeof parsed.answer!=="string"||!Array.isArray(parsed.results))return null;
      if(args.acceptDiscoverAnswer && !args.acceptDiscoverAnswer(parsed.answer))return null;
      const urls=[...parsed.answer.matchAll(/https?:\/\/[^\s)>\]]+/g)];
      if(explicitXXX(parsed.answer)||urls.some((m:RegExpMatchArray)=>blockXXX({url:m[0]}))){
        parsed.answer="MatchApp helps with mainstream, non-explicit entertainment.";
        parsed.results=[];
      } else {
        parsed.results=parsed.results.slice(0,12).filter((r:Record<string,unknown>)=>
          r&&typeof r.title==="string"&&!explicitXXX([r.title,r.type,r.synopsis].join(" "))&&!blockXXX(r));
      }
    }else if(mode==="rank_candidates"){
      if(!Array.isArray(parsed.ids))return null;
      const allowed=new Set(
        Array.isArray(args.allowedCandidateIds)?args.allowedCandidateIds:[]);
      parsed.ids=[...new Set(parsed.ids)].filter((id:unknown)=>
        typeof id==="string"&&allowed.has(id)).slice(0,12);
      if(!parsed.ids.length)return null;
    }else if(mode==="match_proposals"){
      if(!Array.isArray(parsed.results))return null;
      parsed.results=parsed.results.slice(0,16).filter((r:Record<string,unknown>)=>
        r&&typeof r.title==="string"&&r.title.trim().length>0&&
        !explicitXXX(r.title)&&["movie","tv"].includes(String(r.kind))&&
        Number.isInteger(r.year)&&Number(r.year)>1880);
    }else{
      if(typeof parsed.title!=="string"||!parsed.title.trim()||
         explicitXXX([parsed.title,parsed.synopsis,parsed.platform].join(" "))||
         blockXXX(parsed))return null;
    }
    // Client contract is unchanged: Gemini-format candidates plus private tier metadata.
    console.info("[gemini-proxy] served tier=openai");
    return new Response(JSON.stringify({
      candidates:[{content:{parts:[{text:JSON.stringify(parsed)}]},finishReason:"STOP"}],
      _servedByModel:OPENAI_MODEL,_servedByTier:"openai",_finishReason:"STOP"
    }),{headers:{...cors(req),"Content-Type":"application/json"}});
  }catch(_){
    console.warn("[gemini-proxy] OpenAI primary request failed");
    return null;
  }finally{clearTimeout(timer);}
}
