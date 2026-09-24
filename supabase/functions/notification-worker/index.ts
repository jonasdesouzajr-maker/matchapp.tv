import { createClient } from "npm:@supabase/supabase-js@2.105.0";
import { sendPushNotification, WebPushError } from "npm:@mmmike/web-push@1.0.1/send";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")??"";
const SERVICE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const TMDB_TOKEN=Deno.env.get("TMDB_ACCESS_TOKEN")??Deno.env.get("TMDB_API_KEY")??"";
let RESEND_KEY="";
const VAPID_PUBLIC="BKGucCWkS-YsS6g4HnM9DYTmm1Thj-PxxVkz9hM09tGs29uABDXQgYbnF0Zooi7AnHFv7KlbPSbPErE4J76MOZs";
const db=createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});

type Watch={id:string;tmdbId:number;kind:"movie"|"tv";title:string;year?:number|null;region:string;lastSignature?:string};
type Delivery={id:string;kind:string;title:string;body:string;href:string;payload?:Record<string,unknown>;expiresAt?:string|null;pushSentAt?:string|null;emailSentAt?:string|null;emailAddress?:string|null;preferences?:Record<string,boolean>;pushSubscriptions?:Array<{endpoint:string;p256dh:string;auth:string}>};

function enabled(d:Delivery){
 const p=d.preferences||{};
 if(d.kind==="availability")return p.availability!==false;
 if(d.kind==="purchase")return p.purchases!==false;
 if(d.kind==="friend_request"||d.kind==="match_together")return p.friends!==false;
 if(d.kind==="system")return p.releases!==false;
 if(d.kind==="suggestion")return p.suggestions!==false;
 return true;
}
function country(code:string){
 try{return new Intl.DisplayNames(["en"],{type:"region"}).of(code)||code}catch{return code}
}
function uniqueProviders(row:any){
 const all=[...(Array.isArray(row?.flatrate)?row.flatrate:[]),...(Array.isArray(row?.free)?row.free:[]),...(Array.isArray(row?.ads)?row.ads:[])];
 return [...new Set(all.map((p:any)=>String(p?.provider_name||"").trim()).filter(Boolean))];
}
function safeHttps(value:unknown){
 const s=String(value||"");return /^https:\/\//i.test(s)?s:"";
}
function escapeHtml(v:string){return v.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]||c));}

function deliveryHref(d:Delivery){
 const title=String(d.payload?.title||"").trim();
 if(d.kind==="suggestion"&&title){
  return "/discover.html?title="+encodeURIComponent(title)+"&focus=start&source=taste-dna";
 }
 return d.href||"/";
}

async function secret(name:string){
 const {data,error}=await db.rpc("notification_server_secret",{p_name:name});
 if(error)throw new Error("notification secret unavailable");
 return String(data||"");
}
async function authenticate(req:Request){
 const expected=await secret("notification_cron_secret");
 const got=req.headers.get("x-matchapp-cron")||"";
 return !!expected&&got.length===expected.length&&crypto.subtle
   ? timingSafeText(got,expected)
   : false;
}
async function timingSafeText(a:string,b:string){
 const enc=new TextEncoder(),aa=enc.encode(a),bb=enc.encode(b);
 if(aa.length!==bb.length)return false;
 let diff=0;for(let i=0;i<aa.length;i++)diff|=aa[i]^bb[i];return diff===0;
}

async function broadcastRelease(){
 try{
  const res=await fetch("https://matchapp.tv/release.json?notification-worker=1",{headers:{"cache-control":"no-cache"}});
  if(!res.ok)return 0;
  const rel=await res.json();
  const version=String(rel?.version||"").slice(0,80);
  const body=String(rel?.notes?.en||"").slice(0,1000);
  if(!version||!body)return 0;
  const {data,error}=await db.rpc("notification_broadcast_release",{
   p_version:version,p_title:"MatchApp "+version+" is live",p_body:body,p_href:"/updates.html"
  });
  if(error)throw error;
  return Number(data||0);
 }catch{return 0;}
}

async function checkWatch(w:Watch){
 let signature="",available=false,body="",href="";
 try{
  if(!TMDB_TOKEN)throw new Error("TMDB secret unavailable");
  const res=await fetch(`https://api.themoviedb.org/3/${w.kind}/${w.tmdbId}/watch/providers`,{
   headers:{Authorization:`Bearer ${TMDB_TOKEN}`,accept:"application/json"}
  });
  if(!res.ok)throw new Error("TMDB provider lookup failed");
  const data=await res.json();
  const row=data?.results?.[String(w.region||"").toUpperCase()]||null;
  const providers=uniqueProviders(row);
  signature=JSON.stringify(providers.slice().sort());
  available=providers.length>0;
  if(available){
   const place=country(String(w.region||"").toUpperCase());
   body=`${w.title} is now streaming in ${place} on ${providers.join(", ")}.`;
   href=`/discover.html?title=${encodeURIComponent(w.title)}&focus=start`;
  }
  await db.rpc("notification_watch_checked",{
   p_id:w.id,p_signature:signature,p_available:available,p_body:body,p_href:href,
   p_payload:{tmdbId:w.tmdbId,kind:w.kind,region:w.region,providers}
  });
  return {ok:true,available};
 }catch{
  // A provider outage must never generate a false "available" notification.
  return {ok:false,available:false};
 }
}

async function prune(endpoint:string){
 try{await db.rpc("notification_remove_push",{p_endpoint:endpoint})}catch{}
}
async function pushDelivery(d:Delivery,privateKey:string){
 if(!d.preferences?.device||d.pushSentAt||!enabled(d))return false;
 const subs=Array.isArray(d.pushSubscriptions)?d.pushSubscriptions:[];
 if(!subs.length)return false;
 let delivered=false;
 for(const s of subs){
  try{
   const ok=await sendPushNotification(
    {endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},
    {title:d.title,body:d.body,url:deliveryHref(d),tag:"matchapp-"+d.id},
    {subject:"mailto:support@matchapp.tv",publicKey:VAPID_PUBLIC,privateKey},
    {ttl:86400,timeoutMs:15000}
   );
   if(ok)delivered=true;else await prune(s.endpoint);
  }catch(e){
   if(e instanceof WebPushError&&(e.statusCode===404||e.statusCode===410))await prune(s.endpoint);
  }
 }
 return delivered;
}
async function emailDelivery(d:Delivery){
 if(!RESEND_KEY||!d.preferences?.email||d.emailSentAt||!enabled(d)||!d.emailAddress)return false;
 try{
  const url=new URL(deliveryHref(d),"https://matchapp.tv").href;
  const res=await fetch("https://api.resend.com/emails",{
   method:"POST",
   headers:{Authorization:`Bearer ${RESEND_KEY}`,"Content-Type":"application/json"},
   body:JSON.stringify({
    from:"MatchApp <support@matchapp.tv>",to:[d.emailAddress],subject:d.title,
    html:`<div style="font-family:Inter,Arial,sans-serif;background:#160c2e;color:#fff;padding:28px;border-radius:18px"><h2 style="color:#E5C158">${escapeHtml(d.title)}</h2><p style="line-height:1.6">${escapeHtml(d.body)}</p><p><a href="${escapeHtml(url)}" style="color:#E5C158;font-weight:700">Open MatchApp</a></p><p style="font-size:12px;color:#aaa">You enabled email notifications in MatchApp. Change them anytime from the notification bell.</p></div>`
   })
  });
  return res.ok;
 }catch{return false}
}
async function deliveries(){
 const {data,error}=await db.rpc("notification_server_batch",{p_limit:200});
 if(error)throw error;
 const rows=(data?.deliveries||[]) as Delivery[];
 const privateKey=await secret("notification_vapid_private");
 let push=0,email=0;
 for(const d of rows){
  const pushed=await pushDelivery(d,privateKey);
  const emailed=await emailDelivery(d);
  if(pushed||emailed){
   await db.rpc("notification_mark_delivery",{p_id:d.id,p_push:pushed,p_email:emailed});
   if(pushed)push++;if(emailed)email++;
  }
 }
 return {push,email};
}

Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return new Response("Method not allowed",{status:405});
 if(!(await authenticate(req)))return new Response("Unauthorized",{status:401});
 try{RESEND_KEY=await secret("resend_api_key");}catch{RESEND_KEY="";}
 const releaseRecipients=await broadcastRelease();
 let tasteSuggestions=0;
 try{
  const generated=await db.rpc("notification_generate_taste_suggestions");
  tasteSuggestions=Number(generated.data?.inserted||0);
 }catch{}
 const first=await db.rpc("notification_server_batch",{p_limit:200});
 if(first.error)return new Response("Batch unavailable",{status:500});
 const watches=(first.data?.watches||[]) as Watch[];
 let checked=0,available=0;
 for(const w of watches){
  const r=await checkWatch(w);if(r.ok)checked++;if(r.available)available++;
 }
 const sent=await deliveries();
 return Response.json({ok:true,releaseRecipients,tasteSuggestions,watchesChecked:checked,newlyAvailable:available,pushSent:sent.push,emailSent:sent.email,emailTransportConfigured:!!RESEND_KEY});
});
