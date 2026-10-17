import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';
import { validatePrefs,cleanExclusions,metadataKey,selectResult,LANGUAGES } from './eligibility.mjs';

// Public invite capabilities are validated here. Creating an invite additionally
// requires a verified registered user JWT. verify_jwt=false is intentional for
// recipients who have no account; it never grants a caller service-role access.
const ORIGINS=new Set(['https://matchapp.tv','https://www.matchapp.tv']);
const URL_BASE=Deno.env.get('SUPABASE_URL')||'';
const SERVICE_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const PUBLIC_KEY=Deno.env.get('SUPABASE_ANON_KEY')||'';
const admin=createClient(URL_BASE,SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init={})=>fetch(input,{...init,signal:init.signal||AbortSignal.timeout(10000)})}});
const rate=new Map<string,{count:number,until:number}>();
let snapshotCache:{value:any;fetchedAt:number}|null=null;
let snapshotFlight:Promise<any>|null=null;
const tokenPattern=/^[a-f0-9]{64}$/;
function headers(origin:string|null){return {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Pragma':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Vary':'Origin',...(origin&&ORIGINS.has(origin)?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,x-client-info,content-type','Access-Control-Allow-Methods':'POST, OPTIONS'}:{})};}
async function hash(value:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');}
function randomToken(){return [...crypto.getRandomValues(new Uint8Array(32))].map(n=>n.toString(16).padStart(2,'0')).join('');}
async function boundedText(req:Request,limit=96000){
  if(!req.body)return '';
  const reader=req.body.getReader(),chunks:Uint8Array[]=[];let size=0;
  try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>limit){await reader.cancel();throw Error('invalid_request');}chunks.push(part.value);}}
  finally{reader.releaseLock();}
  const all=new Uint8Array(size);let offset=0;for(const chunk of chunks){all.set(chunk,offset);offset+=chunk.byteLength;}
  return new TextDecoder().decode(all);
}
async function rpc(action:string,payload:any){
  const {data,error}=await admin.rpc('growth_together_service',{p_action:action,p_payload:payload});
  if(error)throw Error('service_unavailable');
  return data;
}
async function loadSnapshot(){
  if(snapshotCache&&Date.now()-snapshotCache.fetchedAt<300000)return snapshotCache.value;
  if(snapshotFlight)return snapshotFlight;
  snapshotFlight=(async()=>{
    try{
      const response=await fetch('https://matchapp.tv/data/availability.json',{headers:{Accept:'application/json'},signal:AbortSignal.timeout(4500)});
      if(!response.ok)throw Error('snapshot_unavailable');
      const text=await response.text();if(text.length>1500000)throw Error('snapshot_too_large');
      const value=JSON.parse(text);if(!value?.titles||typeof value.titles!=='object'||Array.isArray(value.titles))throw Error('invalid_snapshot');
      snapshotCache={value,fetchedAt:Date.now()};return value;
    }catch{return snapshotCache?.value||{titles:{}};}
  })();
  try{return await snapshotFlight;}finally{snapshotFlight=null;}
}
async function resolve(payload:any){
  const prepared=await rpc('prepare',payload);
  if(!prepared?.ok||prepared.status!=='resolve')return prepared;
  const candidates=Array.isArray(prepared.candidates)?prepared.candidates.slice(0,300):[];
  try{
    const normalized=Object.fromEntries(candidates.map((c:any)=>[c.key,metadataKey(c.entry?.title)]));
    const [metadata,snapshot]=await Promise.all([
      rpc('metadata',{...payload,keys:candidates.map((c:any)=>c.key),normalized}).catch(()=>({rows:[]})),
      loadSnapshot()
    ]);
    const selected=selectResult({candidates,metadataRows:metadata?.rows||[],hostPrefs:prepared.hostPrefs,guestPrefs:prepared.guestPrefs,snapshot,random:()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296});
    const done=await rpc('commit',{...payload,revision:prepared.revision,...selected,outcome:selected.outcome==='matched'?'matched':'no_match'});
    if(done?.ok&&done.status==='no_match')done.reason=selected.outcome;
    return done;
  }catch{
    await rpc('commit',{...payload,revision:prepared.revision,outcome:'unavailable'}).catch(()=>{});
    return {ok:false,error:'service_unavailable'};
  }
}

Deno.serve(async(req:Request)=>{
  const origin=req.headers.get('origin');
  const reply=(data:any,status=200)=>new Response(JSON.stringify(data),{status,headers:headers(origin)});
  if(origin&&!ORIGINS.has(origin))return reply({ok:false,error:'origin_not_allowed'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:headers(origin)});
  if(req.method!=='POST')return reply({ok:false,error:'method_not_allowed'},405);
  try{
    const raw=await boundedText(req);
    let body:any;try{body=JSON.parse(raw);}catch{return reply({ok:false,error:'invalid_request'},400);}
    if(!body||typeof body!=='object'||Array.isArray(body))return reply({ok:false,error:'invalid_request'},400);
    const action=String(body.action||'');
    if(!['create','preview','join','update','status','resolve','handoff','resume'].includes(action))return reply({ok:false,error:'invalid_action'},400);
    const token=String(body.token||'');
    if(!tokenPattern.test(token))return reply({ok:false,error:'invalid_invite'},400);
    const token_hash=await hash(token);
    const now=Date.now();
    for(const [key,value]of rate)if(value.until<now)rate.delete(key);
    if(rate.size>2000)rate.delete(rate.keys().next().value as string);
    const bucket=rate.get(token_hash)||{count:0,until:now+60000};bucket.count++;rate.set(token_hash,bucket);
    if(bucket.count>90)return reply({ok:false,error:'try_later'},429);
    let actor_id:string|null=null;
    const bearer=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
    if(bearer&&bearer!==PUBLIC_KEY){
      const {data,error}=await admin.auth.getUser(bearer);
      if(error||!data?.user)return reply({ok:false,error:'sign_in_required'},401);
      if(!data.user.is_anonymous)actor_id=data.user.id;
    }
    if(action==='create'&&!actor_id)return reply({ok:false,error:'sign_in_required'},401);
    const guestKey=String(body.guestKey||'');
    if(guestKey&&!tokenPattern.test(guestKey))return reply({ok:false,error:'invalid_request'},400);
    const payload:any={token_hash,actor_id,...(guestKey?{guest_key_hash:await hash(guestKey)}:{})};
    if(action==='create'||action==='join'||action==='update'){
      payload.prefs=validatePrefs(body.prefs);
      payload.exclusions=cleanExclusions(body.exclusions||[]);
      if(action==='create')payload.name=String(body.name||'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,40);
    }
    if(action==='resolve')return reply(await resolve(payload));
    if(action==='handoff'){
      const resumeToken=randomToken();
      const language=LANGUAGES.includes(body.language)?body.language:'en';
      const result=await rpc('handoff',{...payload,resume_hash:await hash(resumeToken),language});
      return reply(result?.ok?{...result,resumeToken}:result);
    }
    const result=await rpc(action,payload);
    if((action==='join'||action==='update')&&result?.ok&&result.status==='ready')return reply(await resolve(payload));
    return reply(result);
  }catch(error){
    const allowed=new Set(['invalid_prefs','invalid_exclusions','invalid_request','country_required']);
    const code=error instanceof Error&&allowed.has(error.message)?error.message:'service_unavailable';
    // No token, request body, auth record, API response or secret is logged.
    return reply({ok:false,error:code},code==='service_unavailable'?503:400);
  }
});
