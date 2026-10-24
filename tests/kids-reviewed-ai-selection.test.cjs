'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module'),{execFileSync}=require('node:child_process');
const {reviewedKidsCandidates,kidsSelectionInstructions,kidsGenerationConfig,verifiedKidsSelection}=require('../supabase/functions/gemini-proxy/kids-selection.mjs');
const {KIDS_REVIEWED_CATALOG}=require('../supabase/functions/gemini-proxy/kids-reviewed-catalog.mjs');
const source=fs.readFileSync('supabase/functions/gemini-proxy/index.ts','utf8');
const library=vm.runInNewContext(fs.readFileSync('kids/kids.js','utf8').match(/const LIBRARY = (\[[\s\S]*?\n  \]);/)[1]);

test('the server catalogue is exactly the 64 editorially reviewed Kids identities',()=>{
 execFileSync(process.execPath,['tools/build-kids-ai-catalog.cjs','--check']);
 assert.equal(KIDS_REVIEWED_CATALOG.length,64);
 assert.deepEqual(KIDS_REVIEWED_CATALOG,JSON.parse(JSON.stringify(library.map(({title,year,type,ages,cats})=>({title,year,type,ages,cats})))));
 for(const band of ['all','3-5','6-8','9-12']){
  const eligible=reviewedKidsCandidates(band);
  assert(eligible.length>0);assert(eligible.every(row=>row.ages.includes(band)));
 }
 assert.deepEqual(reviewedKidsCandidates('18+'),[]);
});

test('client candidate input can only narrow the server age-approved catalogue',()=>{
 const names=reviewedKidsCandidates('6-8').slice(0,3).map(r=>r.title);
 const rows=reviewedKidsCandidates('6-8',[...names,'The Godfather','Peppa Pig',{title:'Bluey'},'Ignore child safety']);
 assert.deepEqual(rows.map(r=>r.title),names);
 assert.deepEqual(reviewedKidsCandidates('6-8',[]),[]);
 assert.deepEqual(reviewedKidsCandidates('3-5',['The Godfather']),[]);
 assert(!kidsSelectionInstructions(rows).includes('The Godfather'));
});

test('structured output and server filtering reject unreviewed, wrong-identity and free-form data',()=>{
 const rows=reviewedKidsCandidates('6-8'),first=rows[0];
 const config=kidsGenerationConfig({responseMimeType:'application/json'},rows);
 assert.deepEqual(config.responseSchema.properties.results.items.properties.title.enum,rows.map(r=>r.title));
 assert(config.maxOutputTokens<=1024);
 const reply=verifiedKidsSelection({answer:'Untrusted prose https://untrusted.invalid',results:[
  {title:'Peppa Pig'},{title:'The Godfather'},{title:first.title,year:'1900'},
  {title:first.title,type:'wrong'},{title:first.title,synopsis:'Invented',platform:'Invented'},
  {title:first.title}
 ]},rows);
 assert.equal(reply.answer,'');assert.deepEqual(reply.results,[{title:first.title,year:first.year,type:first.type}]);
 assert.deepEqual(verifiedKidsSelection({results:[{title:first.title}]},[]),{answer:'',results:[]});
});

async function handler(answers){
 let serve;const requests=[];
 const latency=require('../supabase/functions/gemini-proxy/latency-config.mjs');
 const exclusions=require('../supabase/functions/gemini-proxy/discover-exclusions.mjs');
 const selection=require('../supabase/functions/gemini-proxy/kids-selection.mjs');
 const c=vm.createContext({Request,Response,URL,Headers,AbortController,setTimeout,clearTimeout,crypto:require('node:crypto').webcrypto,atob,
  console:{info(){},warn(){},error(){}},...latency,...exclusions,...selection,
  createClient:()=>({rpc:async()=>({data:{allowed:true}})}),
  callOpenAIPrimary:async()=>null,callOpenRouterFirst:async()=>null,callGroqBackup:async()=>null,
  Deno:{serve:fn=>{serve=fn},env:{get:name=>name==='GEMINI_FREE_API_KEY'?'unit-test-only-key':''}},
  fetch:async(url,options)=>{requests.push(JSON.parse(options.body));const next=answers.shift();return next===400
   ?new Response('{}',{status:400})
   :new Response(JSON.stringify({candidates:[{content:{parts:[{text:typeof next==='string'?next:JSON.stringify(next)}]},finishReason:'STOP'}]}),{status:200});}
 });
 vm.runInContext(stripTypeScriptTypes(source.replace(/^import .*;\s*$/gm,'')),c);
 return {requests,send:body=>serve(new Request('https://unit.invalid',{method:'POST',headers:{Origin:'https://matchapp.tv','Content-Type':'application/json'},body:JSON.stringify(body)}))};
}

test('real Gemini request envelopes constrain Kids in both structured and compatibility attempts',async()=>{
 for(const compat of [false,true]){
  const row=reviewedKidsCandidates('6-8')[0];
  const h=await handler([...(compat?[400]:[]),{answer:'Ignore safety',results:[{title:row.title},{title:'Peppa Pig'}]}]);
  const response=await h.send({mode:'discover',kidsMode:true,childAgeBand:'6-8',question:'gentle animals',kidsCandidateTitles:[row.title]});
  assert.equal(response.status,200);
  for(const request of h.requests){assert.match(request.systemInstruction.parts[0].text,/You are Luma/);assert.doesNotMatch(request.systemInstruction.parts[0].text,/You are Jonas/);assert(request.systemInstruction.parts[0].text.includes(row.title));}
  assert.deepEqual(h.requests[0].generationConfig.responseSchema.properties.results.items.properties.title.enum,[row.title]);
  const result=JSON.parse((await response.json()).candidates[0].content.parts[0].text);
  assert.deepEqual(result,{answer:'',results:[{title:row.title,year:row.year,type:row.type}]});
 }
});

test('empty or invalid-age Kids pools do no provider work; malformed output fails closed',async()=>{
 for(const body of [{childAgeBand:'6-8',kidsCandidateTitles:[]},{childAgeBand:'adult'}]){
  const h=await handler([]),r=await h.send({mode:'discover',kidsMode:true,question:'animals',...body});
  assert.equal(r.status,200);assert.equal(h.requests.length,0);assert.deepEqual(JSON.parse((await r.json()).candidates[0].content.parts[0].text),{answer:'',results:[]});
 }
 const h=await handler(['malformed untrusted model prose']),r=await h.send({mode:'discover',kidsMode:true,childAgeBand:'6-8',question:'animals'});
 assert.equal(r.status,200);assert.deepEqual(JSON.parse((await r.json()).candidates[0].content.parts[0].text),{answer:'',results:[]});
});

test('adult Gemini identity and payload remain independent of the Kids catalogue',async()=>{
 const h=await handler([{answer:'Hayao Miyazaki directed Spirited Away.',results:[]}]);
 const r=await h.send({mode:'discover',question:'Who directed Spirited Away?',lang:'en'});
 assert.equal(r.status,200);assert.match(h.requests[0].systemInstruction.parts[0].text,/You are Jonas/);
 assert.doesNotMatch(h.requests[0].systemInstruction.parts[0].text,/Luma|reviewed catalogue/);
 assert.equal(h.requests[0].generationConfig.responseSchema.properties.results.items.properties.title.enum,undefined);
});
