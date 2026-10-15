'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
function service(upstream,allowed=true){
 let handler,reservations=0;const calls=[];
 const ctx={Response,Request,ReadableStream,AbortSignal,TextEncoder,Uint8Array,DataView,atob,btoa,crypto:require('node:crypto').webcrypto,console:{error(){}},
  createClient:()=>({rpc:async()=>{reservations++;return{data:allowed,error:null}}}),
  Deno:{env:{get:key=>({SUPABASE_URL:'https://example.test',SUPABASE_SERVICE_ROLE_KEY:'server-only',OPENAI_API_KEY:'test-openai',GEMINI_API_KEY:'test-gemini'})[key]},serve:fn=>handler=fn},
  fetch:async(url,opts)=>{calls.push(JSON.parse(opts.body));return upstream(url)}};
 vm.runInNewContext(stripTypeScriptTypes(read('supabase/functions/jonas-speech/index.ts').replace(/^import .*;\s*$/gm,'')),ctx);
 return{calls,reservations:()=>reservations,request:(options={})=>handler(new Request('https://example.test',{method:'POST',headers:{Origin:'https://matchapp.tv','Content-Type':'application/json'},body:JSON.stringify({text:'A verified answer.',lang:'en',stream:true,...options})}))};
}
test('Cedar PCM returns its first chunk before synthesis completes and keeps one reservation',async()=>{
 let push,closed=false;const stream=new ReadableStream({start(c){push=c;c.enqueue(new Uint8Array(4800))}});
 const s=service(()=>new Response(stream)),response=await s.request();
 assert.equal(response.headers.get('X-Jonas-Voice'),'male-cedar');
 assert.match(response.headers.get('Content-Type'),/audio\/pcm/);assert.equal(response.headers.get('Content-Length'),null);
 const reader=response.body.getReader();assert.equal((await reader.read()).value.length,4800);assert.equal(closed,false);
 push.enqueue(new Uint8Array(2400));push.close();closed=true;
 assert.equal((await reader.read()).value.length,2400);assert.equal((await reader.read()).done,true);
 assert.equal(s.calls[0].voice,'cedar');assert.equal(s.calls[0].response_format,'pcm');assert.equal(s.reservations(),1);
});
test('stream cancellation reaches the upstream generator',async()=>{
 let cancelled=false;const s=service(()=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(4800))},cancel(){cancelled=true}})));
 const response=await s.request();await response.body.cancel();assert.equal(cancelled,true);
});
test('streaming retains the speech cap and never calls a provider when allowance is denied',async()=>{
 const s=service(()=>{throw Error('must not call')},false),r=await s.request();assert.equal(r.status,429);assert.equal(s.calls.length,0);
});
test('streaming falls back to truthful Charon WAV if Cedar fails before audio',async()=>{
 const s=service(url=>url.includes('openai')?new Response('',{status:503}):new Response(JSON.stringify({candidates:[{content:{parts:[{inlineData:{data:btoa('a'.repeat(400))}}]}}]})));
 const r=await s.request();assert.equal(r.headers.get('X-Jonas-Voice'),'male-charon');assert.equal(r.headers.get('Content-Type'),'audio/wav');assert.equal(s.calls.length,2);
});
test('every supported greeting is a small verified Cedar recording with exact integrity',()=>{
 const m=JSON.parse(read('jonas/greetings/manifest.json')),crypto=require('node:crypto');assert.equal(Object.keys(m.clips).length,14);
 for(const clip of Object.values(m.clips)){
  const bytes=fs.readFileSync(path.join(root,'jonas/greetings',clip.file));assert.ok(bytes.length>100&&bytes.length<200000);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),clip.sha256);assert.equal(clip.voice,'cedar');assert.equal(clip.provider,'openai');
 }
});
