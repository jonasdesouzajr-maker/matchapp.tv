'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const source=read('supabase/functions/gemini-proxy/groq-backup.ts');
const proxy=read('supabase/functions/gemini-proxy/index.ts');
function boot(fetcher,disabled=false){
 const script=stripTypeScriptTypes(source)
   .replace(/^import \{ schemaFor \} from "\.\/openai-primary\.ts";\s*/m,'')
   .replace(/export async function callGroqBackup/,'async function callGroqBackup');
 const ctx=vm.createContext({fetch:fetcher,Response,Request,AbortController,setTimeout,clearTimeout,
   Deno:{env:{get:name=>name==='GROQ_DISABLED'&&disabled?'true':''}},Date,
   console:{info(){},warn(){}},
   schemaFor:mode=>({name:'matchapp_'+mode,schema:{type:'object',additionalProperties:false}})});
 vm.runInContext(script+'\nglobalThis.callGroq=callGroqBackup;',ctx);
 return ctx.callGroq;
}
const args={req:new Request('https://matchapp.tv'),prompt:'Find a funny film',mode:'discover',
 key:'example-value',cors:()=>({'Access-Control-Allow-Origin':'https://matchapp.tv'}),
 blockXXX:()=>false,explicitXXX:()=>false};
function ok(object,model='openai/gpt-oss-120b'){
 return new Response(JSON.stringify({model,choices:[{
  finish_reason:'stop',message:{content:JSON.stringify(object)}
 }]}),{status:200});
}
test('Groq is adult-only and runs after OpenRouter, OpenAI and Gemini',()=>{
 const router=proxy.indexOf('const answer = await callOpenRouterFirst({');
 const groq=proxy.indexOf('const answer = await callGroqBackup({');
 const openai=proxy.indexOf('const answer = await callOpenAIPrimary({');
 const gemini=proxy.indexOf('const routes = [');
 assert.ok(router>0&&openai>router&&gemini>openai&&groq>gemini);
 assert.match(proxy,/body\?\.kidsMode !== true/);
 assert.match(proxy,/if \(openAiEligible && groqApiKey\)/);
 assert.match(proxy,/Deno\.env\.get\("GROQ_API_KEY"\)/);
});
test('uses strict schema, supported production model and existing frontend contract',async()=>{
 let request,endpoint;
 const groq=boot(async(url,options)=>{
  endpoint=url;request=JSON.parse(options.body);
  return ok({answer:'An animated comedy.',results:[]});
 });
 const res=await groq(args),data=await res.json();
 assert.equal(res.status,200);
 assert.equal(endpoint,'https://api.groq.com/openai/v1/chat/completions');
 assert.equal(request.model,'openai/gpt-oss-120b');
 assert.equal(request.response_format.type,'json_schema');
 assert.equal(request.response_format.json_schema.strict,true);
 assert.equal(request.reasoning_effort,'low');
 assert.deepEqual(JSON.parse(data.candidates[0].content.parts[0].text),
  {answer:'An animated comedy.',results:[]});
 assert.equal(data._servedByTier,'groq');
 assert.equal(JSON.stringify(data).includes(args.key),false);
});
test('one 503 retries once using the separate faster model',async()=>{
 const models=[];
 const groq=boot(async(_,options)=>{
  const model=JSON.parse(options.body).model;models.push(model);
  return model==='openai/gpt-oss-120b'?new Response('{}',{status:503}):
   ok({answer:'Ready.',results:[]},model);
 });
 const res=await groq(args);
 assert.equal((await res.json())._servedByModel,'openai/gpt-oss-20b');
 assert.deepEqual(models,['openai/gpt-oss-120b','openai/gpt-oss-20b']);
});
test('429 cools down same key and yields to OpenAI, without same-account retry',async()=>{
 let calls=0;
 const groq=boot(async()=>{calls++;return new Response('{}',{status:429,headers:{'retry-after':'90'}});});
 assert.equal(await groq(args),null);
 assert.equal(await groq(args),null);
 assert.equal(calls,1);
});
test('402 billing failure does not retry another Groq model',async()=>{
 let calls=0;
 const groq=boot(async()=>{calls++;return new Response('{}',{status:402});});
 assert.equal(await groq(args),null);
 assert.equal(calls,1);
});
test('incomplete output never reaches frontend, even if both models fail',async()=>{
 let calls=0;
 const groq=boot(async()=>{calls++;return new Response(JSON.stringify({choices:[{
  finish_reason:'length',message:{content:'{"answer":"partial"}'}
 }]}),{status:200});});
 assert.equal(await groq(args),null);
 assert.equal(calls,2);
});
test('ranking returns only server-verified candidate IDs',async()=>{
 const groq=boot(async()=>ok({ids:['good1','fake','good1','good2']}));
 const res=await groq({...args,mode:'rank_candidates',allowedCandidateIds:['good1','good2']});
 const data=await res.json();
 assert.deepEqual(JSON.parse(data.candidates[0].content.parts[0].text),{ids:['good1','good2']});
});
test('server-side disable switch avoids upstream calls',async()=>{
 let calls=0;
 const groq=boot(async()=>{calls++;return ok({answer:'anything',results:[]});},true);
 assert.equal(await groq(args),null);
 assert.equal(calls,0);
});
