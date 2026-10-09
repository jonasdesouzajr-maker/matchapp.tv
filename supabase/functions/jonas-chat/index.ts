// Jonas Chat Plus: authenticated, capped, separately entitled subscription AI.
// No browser-provided API keys, billing flags, plan labels, or client-supplied user IDs.
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const URL_BASE=Deno.env.get('SUPABASE_URL')||'';
const ANON=Deno.env.get('SUPABASE_ANON_KEY')||'';
const SERVICE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const GROQ=Deno.env.get('GROQ_API_KEY')||'';
const admin=createClient(URL_BASE,SERVICE,{auth:{autoRefreshToken:false,persistSession:false}});
const ORIGINS=new Set(['https://matchapp.tv','https://www.matchapp.tv']);
const model='openai/gpt-oss-20b';
const limits={day:30,week:150,cycle:450};
const TEXT_LIMIT=600;
const HISTORY_LIMIT=8;
const HISTORY_TEXT_LIMIT=350;
const UPSTREAM_TIMEOUT_MS=16000;

const safeText=(value:unknown,max:number)=>typeof value==='string'?value.trim().slice(0,max):'';
const json=(body:unknown,status=200,origin='')=>new Response(JSON.stringify(body),{
 status,headers:{
 'Content-Type':'application/json','Cache-Control':'no-store',
 'Access-Control-Allow-Headers':'authorization,apikey,x-client-info,content-type',
 'Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin',
 ...(ORIGINS.has(origin)?{'Access-Control-Allow-Origin':origin}:{})
 }
});
function statusReason(reason:string){
 const messages:Record<string,string>={
 subscription_required:'Jonas Chat Plus is not active for this account.',
 daily_limit:'Your 30 Jonas chats in the last 24 hours have been used. Try again when your daily allowance refreshes.',
 weekly_limit:'Your 150 Jonas chats in the last seven days have been used. Try again later.',
 billing_cycle_limit:'Your 450 Jonas chats for this billing period have been used. Your allowance returns at the next renewal.',
 cost_budget:'Your Jonas Chat Plus allowance is temporarily used up for this billing period.',
 duplicate_request:'Please wait for your previous message before sending again.'
 };
 return messages[reason]||'Jonas Chat Plus is temporarily unavailable.';
}

Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{
  'Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,x-client-info,content-type',
  'Access-Control-Allow-Methods':'POST,OPTIONS',...(ORIGINS.has(origin)?{'Access-Control-Allow-Origin':origin}:{})
 }});
 if(req.method!=='POST')return json({error:'Method not allowed'},405,origin);
 if(origin&&!ORIGINS.has(origin))return json({error:'Origin not allowed'},403,origin);
 if(!URL_BASE||!ANON||!SERVICE)return json({error:'Service temporarily unavailable'},503,origin);
 const authorization=req.headers.get('authorization')||'';
 const bearer=authorization.startsWith('Bearer ')?authorization.slice(7).trim():'';
 if(!bearer||bearer.length>4096)return json({error:'Sign in to use Jonas Chat Plus.'},401,origin);
 let userId:string;
 try{
  const {data,error}=await admin.auth.getUser(bearer);
  if(error||!data?.user?.id)return json({error:'Sign in to use Jonas Chat Plus.'},401,origin);
  userId=data.user.id;
 }catch{return json({error:'Authentication unavailable'},503,origin);}
 let body:any;
 try{
  const contentLength=Number(req.headers.get('content-length')||'0');
  if(contentLength>16000)return json({error:'Message too large'},413,origin);
  body=await req.json();
 }catch{return json({error:'Invalid message'},400,origin);}
 if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'Invalid message'},400,origin);
 if(body.action==='status'){
  try{
   const {data:sub,error}=await admin.from('jonas_chat_subscriptions')
     .select('status,period_start,period_end,cancel_at_period_end,updated_at')
     .eq('user_id',userId).maybeSingle();
   if(error)throw error;
   const from=new Date(),lastWeek=new Date(from.getTime()-7*86400000),day=new Date(from.getTime()-86400000);
   const {data:rows,error:countsError}=await admin.from('jonas_chat_usage')
    .select('used_at').eq('user_id',userId).gte('used_at',lastWeek.toISOString()).limit(600);
   if(countsError)throw countsError;
   const startsAt=sub?.period_start?Date.parse(sub.period_start):Infinity;
   // Fetch billing-cycle usage separately if the period started over 7 days ago.
   const {count:cycleCount,error:cycleError}=sub?.period_start?
    await admin.from('jonas_chat_usage').select('id',{head:true,count:'exact'}).eq('user_id',userId).gte('used_at',sub.period_start):
    {count:0,error:null};
   if(cycleError)throw cycleError;
   const dayUsed=(rows||[]).filter(row=>Date.parse(row.used_at)>=day.getTime()).length;
   const weekUsed=(rows||[]).length;
   const active=!!sub&&['active','trialing'].includes(sub.status)&&startsAt<=from.getTime()&&Date.parse(sub.period_end)>from.getTime();
   return json({active,status:sub?.status||'none',renewal_at:sub?.period_end||null,
     cancel_at_period_end:sub?.cancel_at_period_end===true,
     remaining:{day:Math.max(0,limits.day-dayUsed),week:Math.max(0,limits.week-weekUsed),
     cycle:Math.max(0,limits.cycle-(cycleCount||0))},limits},200,origin);
  }catch{return json({error:'Usage status unavailable'},503,origin);}
 }
 if(body.action!=='ask')return json({error:'Unsupported request'},400,origin);
 const question=safeText(body.question,TEXT_LIMIT);
 if(!question)return json({error:'Enter a question for Jonas.'},400,origin);
 if(typeof body.question!=='string'||body.question.length>TEXT_LIMIT)return json({error:'Question is too long.'},413,origin);
 const lang=safeText(body.lang,12)||'en';
 const country=safeText(body.country,2).toUpperCase();
 const suppliedHistory=Array.isArray(body.history)?body.history.slice(-HISTORY_LIMIT):[];
 const history=suppliedHistory.filter((m:any)=>m&&['user','assistant'].includes(m.role)&&typeof m.content==='string')
   .map((m:any)=>({role:m.role,content:safeText(m.content,HISTORY_TEXT_LIMIT)}))
   .filter((m:any)=>m.content);
 const requestId=crypto.randomUUID();
 let reserved=false;
 try{
  // Fail CLOSED if PostgreSQL cannot atomically validate entitlement and quota.
  const {data:gate,error}=await admin.rpc('jonas_reserve_chat',{p_user_id:userId,p_request_id:requestId});
  if(error||!gate)return json({error:'Jonas usage limits cannot be verified right now.'},503,origin);
  if(gate.allowed!==true){
   const reason=safeText(gate.reason,55);
   return json({error:statusReason(reason),reason,limits},reason==='subscription_required'?402:429,origin);
  }
  reserved=true;
 }catch{return json({error:'Jonas usage limits cannot be verified right now.'},503,origin);}
 const fail=async(code:number,message:string)=>{
  if(reserved){
   // Never debit an unsuccessful model request.
   try{await admin.rpc('jonas_refund_chat',{p_user_id:userId,p_request_id:requestId});}
   catch{console.error('[jonas-chat] Unable to refund failed request');}
  }
  return json({error:message},code,origin);
 };
 if(!GROQ)return await fail(503,'Jonas conversations are temporarily unavailable.');
 const system=[
  'You are Jonas, the sole adult AI companion of MatchApp Ai. Be warm, human-sounding, concise, useful and truthful.',
  'Answer general questions, entertainment discovery, reading, cooking and day-to-day conversation in the language requested.',
  'Do not claim current streaming availability or specific titles without verified catalog evidence; ask for the country and platform where needed.',
  'Never invent film releases, streaming providers or citations. Do not claim a real body, human identity or private knowledge.',
  'Jonas has a symbolic birthday of October 10. The app creator was born on October 10, 1986.',
  'Do not invent the official Play Store launch date: it is only known once MatchApp Ai actually publishes that release.',
  'This plan includes a strictly limited number of chats. Do not promise unlimited use or extra match credits.',
  country?'User country code: '+country+'.':'',
  'Respond in language tag: '+lang+'.',
 ].filter(Boolean).join(' ');
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),UPSTREAM_TIMEOUT_MS);
 try{
  const upstream=await fetch('https://api.groq.com/openai/v1/chat/completions',{
   method:'POST',signal:controller.signal,headers:{'Authorization':'Bearer '+GROQ,'Content-Type':'application/json'},
   body:JSON.stringify({model,messages:[{role:'system',content:system},...history,{role:'user',content:question}],
     max_completion_tokens:960,reasoning_effort:'low',temperature:0.65,stream:false})
  });
  if(!upstream.ok)return await fail(503,'Jonas is busy right now. Please try again shortly.');
  const result=await upstream.json();
  const answer=safeText(result?.choices?.[0]?.message?.content,3600);
  if(!answer)return await fail(503,'Jonas could not finish the answer. Please try again.');
  return json({answer,provider:'jonas',request_id:requestId,remaining:{
    day:gateValueFallback(body,'day'),week:gateValueFallback(body,'week')
  }},200,origin);
 }catch{return await fail(503,'Jonas cannot connect right now. Please try again shortly.');}
 finally{clearTimeout(timer);}
});
function gateValueFallback(_body:any,_type:string){return null;} // status endpoint gives authoritative usage
