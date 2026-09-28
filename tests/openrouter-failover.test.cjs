'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const file=fs.readFileSync(path.join(__dirname,'../supabase/functions/gemini-proxy/openrouter-backup.ts'),'utf8');
const proxy=fs.readFileSync(path.join(__dirname,'../supabase/functions/gemini-proxy/index.ts'),'utf8');
function boot(fetcher){
 const src=stripTypeScriptTypes(file)
   .replace(/^import \{ schemaFor \} from "\.\/openai-primary\.ts";\s*/m,'')
   .replace(/export async function callOpenRouterFirst/,'async function callOpenRouterFirst');
 const context=vm.createContext({fetch:fetcher,Response,Request,AbortController,setTimeout,clearTimeout,
  Deno:{env:{get:()=>''}},Date,console:{info(){},warn(){}},
  schemaFor:(mode)=>({name:'matchapp_'+mode,schema:{type:'object'}})});
 vm.runInContext(src+'\nglobalThis.callRouter=callOpenRouterFirst;',context);
 return context.callRouter;
}
const args={req:new Request('https://matchapp.tv'),prompt:'recommend a film',mode:'discover',
 key:'secret-not-to-leak',cors:()=>({'Access-Control-Allow-Origin':'https://matchapp.tv'}),
 blockXXX:()=>false,explicitXXX:()=>false};
function ok(content,model='anthropic/claude-haiku-4.5'){
 return new Response(JSON.stringify({model,choices:[{finish_reason:'stop',message:{content:JSON.stringify(content)}}]}),
  {status:200,headers:{'Content-Type':'application/json'}});
}
test('adult-only routing has four independent provider tiers',()=>{
 const router=proxy.indexOf('const answer = await callOpenRouterFirst({');
 const groq=proxy.indexOf('const answer = await callGroqBackup({');
 const openai=proxy.indexOf('const answer = await callOpenAIPrimary({');
 const gemini=proxy.indexOf('const routes = [');
 assert.ok(router>0&&groq>router&&openai>groq&&gemini>openai);
 assert.match(proxy,/if \(openAiEligible && openRouterApiKey\)/);
 assert.match(proxy,/body\?\.kidsMode !== true/);
 assert.match(proxy,/if \(openAiEligible && groqApiKey\)/);
 assert.match(proxy,/if \(!apiKey && !openAiApiKey && !openRouterApiKey && !groqApiKey\)/);
});
test('JSON response preserves frontend contract and models are ordered',async()=>{
 let request;
 const router=boot(async(_,options)=>{request=JSON.parse(options.body);return ok({answer:'Try this.',results:[]});});
 const res=await router(args),body=await res.json();
 assert.equal(res.status,200);
 assert.equal(body._servedByTier,'openrouter');
 assert.deepEqual(JSON.parse(body.candidates[0].content.parts[0].text),{answer:'Try this.',results:[]});
 assert.equal(request.models[0],'anthropic/claude-haiku-4.5');
 assert.equal(request.models[1],'meta-llama/llama-3.3-70b-instruct');
 assert.equal(request.provider.require_parameters,true);
 assert.equal(request.response_format.type,'json_schema');
 assert.equal(JSON.stringify(body).includes(args.key),false);
});
test('402 immediately fails over to OpenAI and cools repeated attempts',async()=>{
 let calls=0;const router=boot(async()=>{calls++;return new Response('{}',{status:402});});
 assert.equal(await router(args),null);
 assert.equal(await router(args),null);
 assert.equal(calls,1);
});
test('invalid JSON and incomplete output fail over',async()=>{
 const router=boot(async()=>ok({answer:5,results:[]}));
 assert.equal(await router(args),null);
 const incomplete=boot(async()=>new Response(JSON.stringify({choices:[{
  finish_reason:'length',message:{content:'{"answer":"partial"}'}
 }]}),{status:200}));
 assert.equal(await incomplete(args),null);
});
test('ranking allows only verified server-side candidate IDs',async()=>{
 const router=boot(async()=>ok({ids:['a','bad','a','b']}));
 const res=await router({...args,mode:'rank_candidates',allowedCandidateIds:['a','b']});
 const payload=await res.json();
 assert.deepEqual(JSON.parse(payload.candidates[0].content.parts[0].text),{ids:['a','b']});
});
