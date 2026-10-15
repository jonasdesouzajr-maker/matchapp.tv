'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const source=fs.readFileSync(require('node:path').join(__dirname,'../supabase/functions/jonas-speech/index.ts'),'utf8');
function server(openStatus=200,geminiStatus=200){
 const calls=[];let handler;
 const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-service-role',OPENAI_API_KEY:'test-openai',GEMINI_API_KEY:'test-gemini'};
 const context=vm.createContext({Response,Request,AbortSignal,TextEncoder,Uint8Array,DataView,atob,btoa,crypto:require('node:crypto').webcrypto,console:{error(){}},
  createClient:()=>({rpc:async()=>({data:true,error:null})}),
  Deno:{env:{get:name=>env[name]},serve:fn=>handler=fn},
  fetch:async(url,options)=>{
   calls.push({url,body:JSON.parse(options.body)});
   if(new URL(url).origin==='https://api.openai.com')return new Response(openStatus===200?new Uint8Array(400):'',{status:openStatus});
   return new Response(JSON.stringify({candidates:[{content:{parts:[{inlineData:{data:btoa('a'.repeat(400))}}]}}]}),{status:geminiStatus});
  }});
 vm.runInContext(stripTypeScriptTypes(source.replace(/^import .*;\s*$/gm,'')),context);
 return {calls,request:()=>handler(new Request('https://example.test',{method:'POST',headers:{Origin:'https://matchapp.tv','Content-Type':'application/json'},body:JSON.stringify({text:'Olá, sou o Jonas.',lang:'pt-BR',voice:'female'})}))};
}
test('OpenAI always uses Cedar and refuses client voice overrides',async()=>{
 const s=server(),r=await s.request();assert.equal(r.status,200);
 assert.equal(s.calls.length,1);assert.equal(s.calls[0].body.voice,'cedar');
 assert.match(s.calls[0].body.instructions,/pt-BR/);
 assert.equal(r.headers.get('X-Jonas-Voice'),'male-cedar');
 assert.equal(r.headers.get('Access-Control-Expose-Headers'),'X-Jonas-Voice');
});
test('Gemini male Charon is only used after OpenAI fails, with truthful identity metadata',async()=>{
 const s=server(503),r=await s.request();assert.equal(r.status,200);
 assert.equal(s.calls.length,2);assert.equal(s.calls[1].body.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName,'Charon');
 assert.match(s.calls[1].body.contents[0].parts[0].text,/pt-BR/);
 assert.equal(r.headers.get('X-Jonas-Voice'),'male-charon');
 assert.equal(r.headers.get('Content-Type'),'audio/wav');
});
test('failure of both approved voices produces text-only recovery, never another provider',async()=>{
 const s=server(503,503),r=await s.request();assert.equal(r.status,503);
 assert.equal(s.calls.length,2);assert.equal(r.headers.get('X-Jonas-Voice'),null);
});
