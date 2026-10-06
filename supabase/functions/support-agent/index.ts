import { createClient } from "npm:@supabase/supabase-js@2.105.0";
import { Resend } from "npm:resend@6.32.0";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")??"";
const SERVICE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const db=createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});

const OPENROUTER_MODELS=["anthropic/claude-haiku-4.5","meta-llama/llama-3.3-70b-instruct"];
const OPENAI_MODEL="gpt-5.6-luna";
const GROQ_MODELS=["openai/gpt-oss-120b","openai/gpt-oss-20b"];
const META_GRAPH_VERSION="v26.0";
const MAX_BODY=12000;

type SupportDecision={
  reply:string;
  category:string;
  severity:"low"|"normal"|"high"|"urgent";
  language:string;
  summary:string;
  needs_human:boolean;
  escalation_reason:string;
  resolution_type:"guidance"|"clarification"|"account_explanation"|"human_review";
};
type ProviderResult={decision:SupportDecision;provider:string;model:string};
type Inbound={
  channel:"email"|"whatsapp";
  sender:string;
  threadKey:string;
  messageId:string;
  subject:string;
  body:string;
  metadata:Record<string,unknown>;
  replyRef?:string;
};

const SUPPORT_SCHEMA={
  type:"object",additionalProperties:false,
  properties:{
    reply:{type:"string"},
    category:{type:"string",enum:["account","login","billing","subscription","credits","technical","content","privacy","safety","feedback","other"]},
    severity:{type:"string",enum:["low","normal","high","urgent"]},
    language:{type:"string"},
    summary:{type:"string"},
    needs_human:{type:"boolean"},
    escalation_reason:{type:"string"},
    resolution_type:{type:"string",enum:["guidance","clarification","account_explanation","human_review"]}
  },
  required:["reply","category","severity","language","summary","needs_human","escalation_reason","resolution_type"]
};

function clamp(v:unknown,n:number){return String(v??"").trim().slice(0,n)}
function stripHtml(html:string){
  return html.replace(/<style[\s\S]*?<\/style>/gi," ")
    .replace(/<script[\s\S]*?<\/script>/gi," ")
    .replace(/<br\s*\/?>/gi,"\n").replace(/<\/p>/gi,"\n")
    .replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ")
    .replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")
    .replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n").trim();
}
function extractEmail(v:string){
  const m=v.match(/<([^<>\s]+@[^<>\s]+)>/);
  if(m)return m[1].toLowerCase();
  const m2=v.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return (m2?.[0]||"").toLowerCase();
}
function normalizedSubject(v:string){return v.replace(/^\s*((re|fw|fwd)\s*:\s*)+/i,"").trim().toLowerCase().slice(0,180)}
function automatedEmail(sender:string,subject:string){
  const s=(sender+" "+subject).toLowerCase();
  return /(no-?reply|mailer-daemon|postmaster|dmarc|aggregate report|verification code|6-digit code|one-time code|otp|security code)/.test(s);
}
async function secret(name:string){
  const {data,error}=await db.rpc("support_server_secret",{p_name:name});
  if(error)throw new Error("support secret unavailable");
  return String(data||"");
}
function validDecision(v:any):v is SupportDecision{
  return !!v&&typeof v.reply==="string"&&v.reply.trim().length>0&&
    typeof v.category==="string"&&["low","normal","high","urgent"].includes(v.severity)&&
    typeof v.language==="string"&&typeof v.summary==="string"&&typeof v.needs_human==="boolean"&&
    typeof v.escalation_reason==="string"&&
    ["guidance","clarification","account_explanation","human_review"].includes(v.resolution_type);
}
function supportPrompt(message:string,subject:string,account:any,history:any[]){
  const safeAccount={
    found:!!account?.found,
    country:account?.country||null,
    language:account?.language||null,
    region:account?.region||null,
    is_vip:!!account?.is_vip,
    is_business:!!account?.is_business,
    subscription_status:account?.subscription_status||null,
    subscription_plan:account?.subscription_plan||null,
    credits:Number.isFinite(Number(account?.credits))?Number(account.credits):null,
    profile_locked:!!account?.profile_locked
  };
  const hist=(Array.isArray(history)?history:[]).slice(-8).map((x:any)=>({
    direction:x?.direction==="outbound"?"support":"customer",
    body:clamp(x?.body,2500)
  }));
  return `You are MatchApp Ai Support, the dedicated customer-support agent for https://matchapp.tv.
Reply in the customer's language. Be concise, calm, practical and specific.

Your job is to solve safe, ordinary support issues when you can, using only the facts provided.
NEVER ask for or expose passwords, one-time codes, full card data, API keys or secret tokens.
NEVER claim that a refund, subscription change, account deletion, credit adjustment, payment reversal, security reset or other admin mutation was completed. You do not have permission to perform those mutations.
Set needs_human=true for: refunds/charge disputes/payment failures needing intervention; account deletion/privacy-rights requests; suspected account compromise; legal threats or formal complaints; safety emergencies; requests requiring admin/database mutation; unclear cases where guessing could harm the customer.
For a human-review case, explain that it has been escalated for human review, do not promise an exact response time, and still provide any safe immediate steps.
For login issues, never request an OTP or password. Point to the official sign-in/recovery flow on matchapp.tv and ask only for non-secret diagnostic details if needed.
For app/browser technical issues, offer the smallest useful troubleshooting steps first. Do not tell users to erase app data unless necessary and clearly warn about local data effects.
For billing/subscription, you may explain the read-only account status supplied below, but never invent prices, charges, refund eligibility or transaction details.
If the user reports a service outage, do not claim the service is globally up/down unless that status is supplied.
Do not answer automated vendor notifications, authentication codes, marketing mail, or DMARC reports.

Read-only account context:
${JSON.stringify(safeAccount)}

Recent support conversation:
${JSON.stringify(hist)}

Current subject:
${clamp(subject,300)}

Current customer message:
${clamp(message,MAX_BODY)}

Return only the required JSON object.`;
}
async function callOpenRouter(prompt:string,key:string):Promise<ProviderResult|null>{
  if(!key)return null;
  const c=new AbortController(),timer=setTimeout(()=>c.abort(),18000);
  try{
    const r=await fetch("https://openrouter.ai/api/v1/chat/completions",{
      method:"POST",signal:c.signal,
      headers:{"Content-Type":"application/json","Authorization":"Bearer "+key,"HTTP-Referer":"https://matchapp.tv","X-Title":"MatchApp Ai Support"},
      body:JSON.stringify({
        models:OPENROUTER_MODELS,
        messages:[{role:"user",content:prompt}],
        provider:{require_parameters:true},
        response_format:{type:"json_schema",json_schema:{name:"matchapp_support",strict:true,schema:SUPPORT_SCHEMA}},
        temperature:0.15,max_tokens:1100
      })
    });
    if(!r.ok)return null;
    const data=await r.json(),raw=data?.choices?.[0]?.message?.content;
    if(typeof raw!=="string")return null;
    const decision=JSON.parse(raw);
    if(!validDecision(decision))return null;
    return {decision,provider:"openrouter",model:clamp(data?.model||OPENROUTER_MODELS[0],100)};
  }catch{return null}finally{clearTimeout(timer)}
}
async function callOpenAI(prompt:string,key:string):Promise<ProviderResult|null>{
  if(!key)return null;
  const c=new AbortController(),timer=setTimeout(()=>c.abort(),18000);
  try{
    const r=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",signal:c.signal,
      headers:{"Content-Type":"application/json","Authorization":"Bearer "+key},
      body:JSON.stringify({
        model:OPENAI_MODEL,input:prompt,store:false,reasoning:{effort:"none"},max_output_tokens:1200,
        text:{format:{type:"json_schema",name:"matchapp_support",strict:true,schema:SUPPORT_SCHEMA}}
      })
    });
    if(!r.ok)return null;
    const data=await r.json();
    const raw=(Array.isArray(data?.output)?data.output:[]).flatMap((m:any)=>Array.isArray(m?.content)?m.content:[])
      .filter((x:any)=>x?.type==="output_text").map((x:any)=>x?.text||"").join("");
    if(!raw)return null;
    const decision=JSON.parse(raw);
    if(!validDecision(decision))return null;
    return {decision,provider:"openai",model:OPENAI_MODEL};
  }catch{return null}finally{clearTimeout(timer)}
}
async function callGroq(prompt:string,key:string):Promise<ProviderResult|null>{
  if(!key)return null;
  for(const model of GROQ_MODELS){
    const c=new AbortController(),timer=setTimeout(()=>c.abort(),12000);
    try{
      const r=await fetch("https://api.groq.com/openai/v1/chat/completions",{
        method:"POST",signal:c.signal,
        headers:{"Content-Type":"application/json","Authorization":"Bearer "+key},
        body:JSON.stringify({
          model,messages:[{role:"user",content:prompt}],stream:false,temperature:0.15,reasoning_effort:"low",
          response_format:{type:"json_schema",json_schema:{name:"matchapp_support",strict:true,schema:SUPPORT_SCHEMA}},
          max_completion_tokens:1800
        })
      });
      if(!r.ok)continue;
      const data=await r.json(),raw=data?.choices?.[0]?.message?.content;
      if(typeof raw!=="string")continue;
      const decision=JSON.parse(raw);
      if(!validDecision(decision))continue;
      return {decision,provider:"groq",model};
    }catch{}finally{clearTimeout(timer)}
  }
  return null;
}
async function decide(prompt:string):Promise<ProviderResult>{
  const [routerKey,openAiKey,groqKey]=[
    Deno.env.get("OPENROUTER_API_KEY")?.trim()||"",
    Deno.env.get("OPENAI_API_KEY")?.trim()||"",
    Deno.env.get("GROQ_API_KEY")?.trim()||""
  ];
  return await callOpenRouter(prompt,routerKey)
    || await callOpenAI(prompt,openAiKey)
    || await callGroq(prompt,groqKey)
    || {provider:"fallback",model:"deterministic",decision:{
      reply:"Thanks for contacting MatchApp Ai Support. I couldn't safely resolve this automatically, so your message has been queued for human review. Please do not send passwords, one-time codes, or full payment-card details.",
      category:"other",severity:"normal",language:"en",summary:"Automatic support providers were unavailable.",
      needs_human:true,escalation_reason:"AI support providers unavailable",resolution_type:"human_review"
    }};
}
async function ingest(m:Inbound){
  const {data,error}=await db.rpc("support_ingest_inbound",{
    p_channel:m.channel,p_external_thread_key:m.threadKey,p_sender:m.sender,
    p_external_message_id:m.messageId,p_subject:m.subject,p_body:m.body,p_metadata:m.metadata
  });
  if(error)throw new Error("support ingest failed");
  return data as {thread_id:string;inserted:boolean;account:any};
}
async function history(threadId:string){
  const {data}=await db.rpc("support_thread_history",{p_thread_id:threadId,p_limit:8});
  return Array.isArray(data)?data:[];
}
async function updateThread(threadId:string,d:SupportDecision){
  await db.rpc("support_update_thread",{
    p_thread_id:threadId,p_category:d.category,p_severity:d.severity,p_language:d.language,
    p_summary:d.summary,p_needs_human:d.needs_human,p_escalation_reason:d.escalation_reason
  });
}
async function recordOutbound(threadId:string,m:Inbound,r:ProviderResult,externalId:string,metadata:Record<string,unknown>={}){
  await db.rpc("support_record_outbound",{
    p_thread_id:threadId,p_channel:m.channel,p_external_message_id:externalId||null,
    p_body:r.decision.reply,p_ai_provider:r.provider,p_ai_model:r.model,p_metadata:metadata
  });
}
async function sendEmail(resend:Resend,m:Inbound,text:string){
  const to=extractEmail(m.sender);
  if(!to)throw new Error("invalid support email sender");
  const subject=/^\s*re:/i.test(m.subject)?m.subject:"Re: "+(m.subject||"MatchApp Ai Support");
  const payload:any={
    from:"MatchApp Ai Support <support@matchapp.tv>",to:[to],subject,text,
    replyTo:"support@matchapp.tv"
  };
  if(m.replyRef)payload.headers={"In-Reply-To":m.replyRef,"References":m.replyRef};
  const {data,error}=await resend.emails.send(payload);
  if(error)throw new Error("support email send failed");
  return String((data as any)?.id||"");
}
async function sendHumanAlert(resend:Resend,m:Inbound,d:SupportDecision,threadId:string){
  let human="";
  try{human=await secret("support_human_email")}catch{}
  if(!human||!human.includes("@"))return;
  try{
    await resend.emails.send({
      from:"MatchApp Ai Support <support@matchapp.tv>",to:[human],
      subject:"[Human review] "+clamp(m.subject||d.category,160),
      text:`A MatchApp Ai support conversation needs human review.

Channel: ${m.channel}
Category: ${d.category}
Severity: ${d.severity}
Reason: ${d.escalation_reason}
Summary: ${d.summary}
Thread: ${threadId}

The customer's full message remains in the private support queue.`
    });
  }catch{}
}
async function hmacSha256(secretText:string,body:string){
  const enc=new TextEncoder();
  const key=await crypto.subtle.importKey("raw",enc.encode(secretText),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const sig=new Uint8Array(await crypto.subtle.sign("HMAC",key,enc.encode(body)));
  return "sha256="+[...sig].map(b=>b.toString(16).padStart(2,"0")).join("");
}
function timingSafe(a:string,b:string){
  if(a.length!==b.length)return false;
  let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);
  return d===0;
}
async function sendWhatsApp(to:string,text:string){
  const [token,phoneId]=await Promise.all([
    secret("whatsapp_support_access_token").catch(()=>""),secret("whatsapp_support_phone_number_id").catch(()=>"")
  ]);
  if(!token||!phoneId)throw new Error("whatsapp support not configured");
  const r=await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/${phoneId}/messages`,{
    method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},
    body:JSON.stringify({messaging_product:"whatsapp",to,type:"text",text:{body:text.slice(0,4000)}})
  });
  if(!r.ok)throw new Error("whatsapp send failed");
  const data=await r.json();
  return String(data?.messages?.[0]?.id||"");
}
async function processInbound(m:Inbound,resend?:Resend){
  if(!m.body.trim())return {ignored:true,reason:"empty"};
  const stored=await ingest(m);
  if(!stored?.inserted)return {ok:true,duplicate:true};
  const hist=await history(stored.thread_id);
  const result=await decide(supportPrompt(m.body,m.subject,stored.account,hist));
  await updateThread(stored.thread_id,result.decision);
  let externalId="";
  if(m.channel==="email"){
    if(!resend)throw new Error("email transport unavailable");
    externalId=await sendEmail(resend,m,result.decision.reply);
    if(result.decision.needs_human)await sendHumanAlert(resend,m,result.decision,stored.thread_id);
  }else{
    externalId=await sendWhatsApp(m.sender,result.decision.reply);
  }
  await recordOutbound(stored.thread_id,m,result,externalId,{needs_human:result.decision.needs_human});
  return {ok:true,thread_id:stored.thread_id,needs_human:result.decision.needs_human,category:result.decision.category};
}
async function verifyResend(resend:Resend,raw:string,secretValue:string,req:Request){
  const verify:any=(resend.webhooks as any).verify.bind(resend.webhooks);
  const id=req.headers.get("svix-id")||"",timestamp=req.headers.get("svix-timestamp")||"",signature=req.headers.get("svix-signature")||"";
  try{
    return await verify({payload:raw,headers:{id,timestamp,signature},webhookSecret:secretValue});
  }catch{
    return await verify({payload:raw,headers:{"svix-id":id,"svix-timestamp":timestamp,"svix-signature":signature},secret:secretValue});
  }
}
async function handleEmailWebhook(req:Request,raw:string){
  const [resendKey,webhookSecret]=await Promise.all([
    secret("resend_api_key").catch(()=>""),secret("resend_support_webhook_secret").catch(()=>"")
  ]);
  if(!resendKey||!webhookSecret)return new Response("Email support webhook not configured",{status:503});
  const resend=new Resend(resendKey);
  let event:any;
  try{event=await verifyResend(resend,raw,webhookSecret,req)}catch{return new Response("Invalid webhook",{status:401})}
  if(event?.type!=="email.received")return Response.json({ok:true,ignored:true});
  const eventData=event.data||{};
  const sender=extractEmail(String(eventData.from||""));
  const subject=clamp(eventData.subject,300);
  if(!sender||sender==="support@matchapp.tv"||automatedEmail(sender,subject))return Response.json({ok:true,ignored:true});
  const emailId=String(eventData.email_id||"");
  if(!emailId)return new Response("Missing email id",{status:400});
  const {data:email,error}=await resend.emails.receiving.get(emailId);
  if(error||!email)return new Response("Unable to retrieve email",{status:502});
  const anyEmail:any=email;
  const body=clamp(anyEmail.text||stripHtml(anyEmail.html||""),MAX_BODY);
  const messageId=String(eventData.message_id||anyEmail.message_id||emailId);
  const threadKey=sender+"|"+normalizedSubject(subject||"support");
  const m:Inbound={
    channel:"email",sender,threadKey,messageId,subject,body,
    replyRef:String(eventData.message_id||anyEmail.message_id||""),
    metadata:{email_id:emailId,received_for:anyEmail.received_for||null,has_attachments:Array.isArray(anyEmail.attachments)&&anyEmail.attachments.length>0}
  };
  const result=await processInbound(m,resend);
  return Response.json(result);
}
function whatsappMessages(payload:any){
  const out:any[]=[];
  for(const e of Array.isArray(payload?.entry)?payload.entry:[])
    for(const c of Array.isArray(e?.changes)?e.changes:[])
      for(const m of Array.isArray(c?.value?.messages)?c.value.messages:[])
        out.push(m);
  return out;
}
async function handleWhatsAppWebhook(req:Request,raw:string){
  const appSecret=await secret("whatsapp_support_app_secret").catch(()=>"");
  if(!appSecret)return new Response("WhatsApp support not configured",{status:503});
  const got=req.headers.get("x-hub-signature-256")||"";
  const expected=await hmacSha256(appSecret,raw);
  if(!got||!timingSafe(got,expected))return new Response("Invalid signature",{status:401});
  let payload:any;try{payload=JSON.parse(raw)}catch{return new Response("Invalid JSON",{status:400})}
  const msgs=whatsappMessages(payload);
  for(const msg of msgs){
    const sender=String(msg?.from||"").replace(/[^0-9]/g,"");
    const messageId=String(msg?.id||"");
    if(!sender||!messageId)continue;
    if(msg?.type!=="text"){
      const m:Inbound={channel:"whatsapp",sender,threadKey:sender,messageId,subject:"WhatsApp support",body:"[Unsupported non-text message]",metadata:{type:msg?.type||"unknown"}};
      const stored=await ingest(m);
      if(stored?.inserted){
        const reply="I can currently handle support messages sent as text. Please describe the issue in a text message, and do not include passwords or one-time codes.";
        const externalId=await sendWhatsApp(sender,reply);
        const result:ProviderResult={provider:"system",model:"non-text-guard",decision:{reply,category:"technical",severity:"low",language:"en",summary:"Customer sent a non-text WhatsApp message.",needs_human:false,escalation_reason:"",resolution_type:"clarification"}};
        await updateThread(stored.thread_id,result.decision);
        await recordOutbound(stored.thread_id,m,result,externalId);
      }
      continue;
    }
    const m:Inbound={
      channel:"whatsapp",sender,threadKey:sender,messageId,subject:"WhatsApp support",
      body:clamp(msg?.text?.body,MAX_BODY),metadata:{timestamp:msg?.timestamp||null}
    };
    await processInbound(m);
  }
  return Response.json({ok:true,processed:msgs.length});
}

Deno.serve(async(req:Request)=>{
  if(req.method==="GET"){
    const url=new URL(req.url);
    if(url.searchParams.get("hub.mode")==="subscribe"){
      const expected=await secret("whatsapp_support_verify_token").catch(()=>"");
      const got=url.searchParams.get("hub.verify_token")||"";
      if(expected&&got&&timingSafe(expected,got))return new Response(url.searchParams.get("hub.challenge")||"",{status:200});
      return new Response("Verification failed",{status:403});
    }
    return new Response("MatchApp Ai Support",{status:200});
  }
  if(req.method!=="POST")return new Response("Method not allowed",{status:405});
  const raw=await req.text();
  if(req.headers.has("svix-signature"))return await handleEmailWebhook(req,raw);
  if(req.headers.has("x-hub-signature-256"))return await handleWhatsAppWebhook(req,raw);
  return new Response("Unsupported webhook",{status:400});
});
