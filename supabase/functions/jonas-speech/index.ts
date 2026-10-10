import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.105.0";
const PROJECT = Deno.env.get("SUPABASE_URL") || "";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const admin = createClient(PROJECT,SERVICE,{auth:{persistSession:false,autoRefreshToken:false}});
const ALLOWED = new Set(["https://matchapp.tv","https://www.matchapp.tv"]);
const languages = new Set(["en","pt-BR","es","fr","de","it","tr","ru","ar","hi","id","ja","ko","zh"]);
const localeMap:Record<string,string>={"en":"en-US","pt-BR":"pt-BR","es":"es-ES","fr":"fr-FR","de":"de-DE","it":"it-IT","tr":"tr-TR","ru":"ru-RU","ar":"ar-SA","hi":"hi-IN","id":"id-ID","ja":"ja-JP","ko":"ko-KR","zh":"zh-CN"};
const result=(body:unknown,status:number,origin:string)=>Response.json(body,{status,headers:{"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"content-type,authorization,apikey","Access-Control-Allow-Methods":"POST,OPTIONS","Vary":"Origin","Cache-Control":"no-store"}});
async function fingerprint(value:string){
 const secret=SERVICE.slice(-40);
 const raw=new TextEncoder().encode(secret+":"+value);
 return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",raw))).map(b=>b.toString(16).padStart(2,"0")).join("");
}
async function synth(text:string,locale:string):Promise<{audio:Uint8Array,provider:string,mime:string}|null>{
 const openai=Deno.env.get("OPENAI_API_KEY")?.trim();
 if(openai){
  try{
   const resp=await fetch("https://api.openai.com/v1/audio/speech",{
    method:"POST",headers:{"Authorization":"Bearer "+openai,"Content-Type":"application/json"},
    signal:AbortSignal.timeout(18000),
    body:JSON.stringify({
     model:"gpt-4o-mini-tts",voice:"cedar",response_format:"mp3",speed:1,
     input:text,
     instructions:"Speak ONLY the supplied text in its original language ("+locale+"). A warm, confident, distinctly masculine, mid-low baritone voice for Jonas, an adult entertainment concierge. Clear, naturally paced, articulate, not robotic. Never change the meaning, add speech or switch language."
    })
   });
   if(resp.ok){const data=new Uint8Array(await resp.arrayBuffer());if(data.length>100&&data.length<4_000_000)return {audio:data,provider:"openai",mime:"audio/mpeg"};}
   else console.error("[jonas-speech] OpenAI HTTP",resp.status);
  }catch(error){console.error("[jonas-speech] OpenAI unavailable",String(error).slice(0,80));}
 }
 const google=Deno.env.get("GEMINI_API_KEY")?.trim()||Deno.env.get("GEMINI_FREE_API_KEY")?.trim();
 if(google){
  try{
   const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent",{
    method:"POST",signal:AbortSignal.timeout(18000),
    headers:{"x-goog-api-key":google,"Content-Type":"application/json"},
    body:JSON.stringify({
     contents:[{parts:[{text:"Speak verbatim in "+locale+" with a warm deep masculine voice. Do not add, omit or translate words.\\n"+text}]}],
     generationConfig:{responseModalities:["AUDIO"],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:"Charon"}}}}
    })
   });
   if(response.ok){
    const data=await response.json();
    const payload=data?.candidates?.[0]?.content?.parts?.find((p:any)=>p.inlineData?.data)?.inlineData;
    if(payload?.data&&typeof payload.data==="string"&&payload.data.length<5_000_000){
     const raw=atob(payload.data);
     const pcm=new Uint8Array(raw.length);
     for(let i=0;i<raw.length;i++)pcm[i]=raw.charCodeAt(i);
     if(pcm.length>200&&pcm.length<4_000_000){
      const wav=new Uint8Array(44+pcm.length),dv=new DataView(wav.buffer);
      const ascii=(off:number,value:string)=>{for(let i=0;i<value.length;i++)wav[off+i]=value.charCodeAt(i)};
      ascii(0,"RIFF");dv.setUint32(4,36+pcm.length,true);ascii(8,"WAVE");ascii(12,"fmt ");
      dv.setUint32(16,16,true);dv.setUint16(20,1,true);dv.setUint16(22,1,true);
      dv.setUint32(24,24000,true);dv.setUint32(28,48000,true);dv.setUint16(32,2,true);dv.setUint16(34,16,true);
      ascii(36,"data");dv.setUint32(40,pcm.length,true);wav.set(pcm,44);
      return {audio:wav,provider:"gemini",mime:"audio/wav"};
     }
    }
   } else console.error("[jonas-speech] Gemini TTS HTTP",response.status);
  }catch(error){console.error("[jonas-speech] Gemini TTS unavailable",String(error).slice(0,90));}
 }
 // Never substitute an unverified voice provider; fail closed. 
 return null;
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("origin")||"";
 const headers={"Access-Control-Allow-Origin":ALLOWED.has(origin)?origin:"https://matchapp.tv","Access-Control-Allow-Headers":"content-type,authorization,apikey","Access-Control-Allow-Methods":"POST,OPTIONS","Vary":"Origin"};
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(!ALLOWED.has(origin))return result({error:"origin_denied"},403,"https://matchapp.tv");
 if(req.method!=="POST")return result({error:"method_not_allowed"},405,origin);
 if(!PROJECT||!SERVICE)return result({error:"service_not_ready"},503,origin);
 let body:any;
 try{if(Number(req.headers.get("content-length")||0)>3500)return result({error:"too_long"},413,origin);body=await req.json();}catch{return result({error:"invalid_json"},400,origin)}
 const text=typeof body?.text==="string"?body.text.trim():"";
 const language=typeof body?.lang==="string"&&languages.has(body.lang)?body.lang:"en";
 if(!text||text.length>650||/[\u0000-\u0008\u000b\u000e-\u001f]/.test(text))return result({error:"invalid_text"},400,origin);
 const bearer=String(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"").trim();
 let userId="";
 if(bearer&&bearer.length<4096){
  try{const {data}=await admin.auth.getUser(bearer);userId=data.user?.id||"";}catch{}
 }
 // Server-enforced cost caps, including anonymous requests. No browser flag
 // or client-issued credit claim can raise these limits.
 const trustedIp=(req.headers.get("cf-connecting-ip")||req.headers.get("x-forwarded-for")||"unknown").split(",").slice(-1)[0].trim().slice(0,120);
 const bucket=await fingerprint(userId?"user:"+userId:"guest:"+trustedIp);
 const {data:allowed,error:limitError}=await admin.rpc("jonas_speech_reserve",{p_bucket:bucket,p_limit:userId?35:12,p_global_limit:700});
 if(limitError||allowed!==true)return result({error:"speech_limit_reached"},429,origin);
 const speech=await synth(text,localeMap[language]);
 if(!speech)return result({error:"speech_provider_unavailable"},503,origin);
 return new Response(speech.audio,{status:200,headers:{...headers,"Content-Type":speech.mime,"X-Jonas-Voice":"male-cedar","Cache-Control":"private,no-store","Content-Length":String(speech.audio.length)}});
});
