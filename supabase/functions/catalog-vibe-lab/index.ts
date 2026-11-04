import { createRemoteJWKSet, jwtVerify } from "npm:jose@6.1.0";

const issuer = "https://token.actions.githubusercontent.com";
const keys = createRemoteJWKSet(new URL(issuer + "/.well-known/jwks"));
const repo = "jonasdesouzajr-maker/matchapp.tv";
const model = "nvidia/nemotron-3-embed-1b";
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {status, headers: {"content-type":"application/json", "cache-control":"no-store"}});

// Hand-authored notes about public works in channels/shelves.json. No user prompts or account data enter this lab.
const works = [
  {format:"screen", title:"The Playlist", note:"A startup team builds a music streaming service while engineers, artists and labels disagree about its future."},
  {format:"screen", title:"Girls from Ipanema / Coisa Mais Linda", note:"A woman sets out to open a music club in Rio de Janeiro as bossa nova takes shape."},
  {format:"screen", title:"The Sea Beast", note:"An ocean adventure where a young stowaway questions what monster hunters believe."},
  {format:"album", title:"Computer World (Remastered)", note:"Kraftwerk turns electronic rhythms and synthetic voices into the sound of everyday computing."},
  {format:"album", title:"Getz/Gilberto", note:"Brazilian bossa nova meets jazz. João Gilberto's quiet guitar and voice share space with Stan Getz's saxophone."},
  {format:"reading", title:"The Soul of a New Machine", note:"Tracy Kidder follows engineers trying to build a computer together under deadline pressure. Available as an audiobook."},
  {format:"reading", title:"The Enchanted April", note:"Four women share an Italian holiday villa. An unfamiliar garden and a slower pace change how they see each other."}
];
const briefs = [
  {en:"Take me inside a team building new technology, then give me music that sounds like machines.",
   pt:"Quero acompanhar uma equipe criando tecnologia e depois ouvir música que lembre o som de máquinas.",
   expected:{screen:"The Playlist", album:"Computer World (Remastered)", reading:"The Soul of a New Machine"}},
  {en:"Give me an evening in a Rio music club, then a record with Brazilian guitar and jazz saxophone.",
   pt:"Quero passar a noite em um clube de música no Rio e depois ouvir um disco com violão brasileiro e sax de jazz.",
   expected:{screen:"Girls from Ipanema / Coisa Mais Linda", album:"Getz/Gilberto"}}
];
async function authorized(req: Request) {
  const bearer = req.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if (!bearer) return false;
  try {
    const {payload:p} = await jwtVerify(bearer, keys, {issuer, audience:"matchapp-catalog-vibe-lab", algorithms:["RS256"]});
    const ref = String(p.ref);
    const allowed = (ref === "refs/heads/labs/catalog-vibe" && p.event_name === "push") ||
      (ref === "refs/heads/main" && p.event_name === "workflow_dispatch");
    return allowed && p.repository_id === "1335327466" && p.repository === repo &&
      p.workflow_ref === repo + "/.github/workflows/catalog-vibe-lab.yml@" + ref;
  } catch { return false; }
}
async function embeddings(apiKey: string, input: string[], type: "passage" | "query"): Promise<number[][]> {
  const response = await fetch("https://integrate.api.nvidia.com/v1/embeddings", {
    method:"POST", redirect:"error", signal:AbortSignal.timeout(35000),
    headers:{authorization:"Bearer " + apiKey, "content-type":"application/json"},
    body:JSON.stringify({model,input,input_type:type,encoding_format:"float",truncate:"NONE"})
  });
  if(!response.ok) throw Error("NVIDIA HTTP " + response.status);
  const {data} = await response.json();
  if(!Array.isArray(data) || data.length !== input.length) throw Error("Incomplete embeddings");
  const vectors = Array.from({length:input.length},(_,index)=>{
    const row=data.find(item=>item.index===index);
    if(!Array.isArray(row?.embedding)||!row.embedding.length||!row.embedding.every(Number.isFinite))throw Error("Invalid embedding");
    const norm=Math.hypot(...row.embedding);
    if(!Number.isFinite(norm)||!norm)throw Error("Invalid norm");
    return row.embedding.map((n:number)=>n/norm);
  });
  if(vectors.some(v=>v.length!==vectors[0].length))throw Error("Inconsistent dimensions");
  return vectors;
}
Deno.serve(async (req:Request)=>{
  if(req.method!=="POST")return json({error:"POST required"},405);
  if(!await authorized(req))return json({error:"Private evaluation"},403);
  const key=Deno.env.get("NVIDIA_API_KEY");
  if(!key)return json({error:"NVIDIA_API_KEY unavailable"},503);
  try {
    const catalog=await embeddings(key, works.map(w=>w.title+". "+w.note), "passage");
    const queries=await embeddings(key,briefs.flatMap(b=>[b.en,b.pt]),"query");
    if(catalog[0].length!==queries[0].length)throw Error("Inconsistent dimensions");
    const results=briefs.map((b,i)=>Object.entries(b.expected).map(([format,expected])=>{
      const ranked=[0,1].map(lang=>{
        const v=queries[2*i+lang];
        return works.flatMap((w,k)=>w.format===format ? [{title:w.title,score:catalog[k].reduce((sum,x,d)=>sum+x*v[d],0)}] : [])
          .sort((a,b)=>b.score-a.score)[0].title;
      });
      return {format,expected,en:ranked[0],ptBR:ranked[1],agree:ranked[0]===ranked[1],bothExpected:ranked.every(t=>t===expected)};
    }));
    return json({model,works:works.length,briefs:briefs.map((b,i)=>({en:b.en,ptBR:b.pt,results:results[i]}))});
  } catch(error) {
    // Only controlled diagnostics can leave the function; never log headers, vectors or upstream bodies.
    const msg = error instanceof Error ? error.message : "";
    return json({error:/^(NVIDIA HTTP \d{3}|Invalid embedding|Invalid norm|Incomplete embeddings|Inconsistent dimensions)$/.test(msg)?msg:"Provider unavailable"},502);
  }
});
