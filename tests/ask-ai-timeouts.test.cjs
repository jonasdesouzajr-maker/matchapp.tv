const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'discover.js'),'utf8');
const proxy=fs.readFileSync(path.join(root,'supabase/functions/gemini-proxy/index.ts'),'utf8');
const kids=fs.readFileSync(path.join(root,'kids/kids.js'),'utf8');
const aiBlock=source.slice(source.indexOf('function repairTruncatedJSON('),source.indexOf('/* ---------- Keyless fallback'));

function harness(response){
 let calls=0, scheduled=[],cleared=[];
 const window={MATCH_LANG:'en',supabaseClient:{functions:{invoke:async()=>{calls++;return response;}}}};
 const ctx=vm.createContext({window,localStorage:{getItem:()=>null},console,
    setTimeout:(_fn,ms)=>{scheduled.push(ms);return scheduled.length;},
    clearTimeout:id=>{cleared.push(id);}});
 vm.runInContext(aiBlock,ctx);
 return {ctx,scheduled,cleared,calls:()=>calls};
}

test('Ask AI browser timeout exceeds the longest four-model upstream budget and cleans timers',async()=>{
 const perModel=Number(proxy.match(/PER_MODEL_TIMEOUT_MS = (\d+)/)?.[1]);
 const h=harness({data:{candidates:[{content:{parts:[{text:'{"answer":"A helpful '},{text:'response","results":[]}'}]}}]},error:null});
 const answer=await h.ctx.askAIConversational('Tell me about a director',[]);
 assert.equal(answer.answer,'A helpful response');
 assert.equal(answer._live,true);
 assert.equal(h.calls(),1);
 assert(h.scheduled[0]>=perModel*4+5000,'client must allow full fallback chain');
 assert.deepEqual(h.cleared,[1],'deadline timer must be cleaned after success');
});

test('a rate-limited Ask AI response must never fire a second request',async()=>{
 const h=harness({data:null,error:{context:{status:429},message:'Rate limited'}});
 await assert.rejects(h.ctx.askAIConversational('A funny film',[]),/busy/);
 assert.equal(h.calls(),1);
 assert.deepEqual(h.cleared,[1]);
});

test('Ask AI does not replace legitimate conversational answers with unrelated movies',()=>{
 assert.match(source,/!payload\?\._live \|\| !String\(payload\.answer \|\| ''\)\.trim\(\)/);
 assert.match(source,/wantsTitleRecommendations && !newItems\.length/);
 assert.match(source,/let askInFlight = null/);
 assert.match(source,/if \(askInFlight\) return askInFlight/);
});

test('Kids Ask AI waits beyond a normal model attempt but remains age-verified and bounded',()=>{
 assert.match(kids,/const KIDS_AI_TIMEOUT_MS = 60000/);
 assert.match(kids,/allowedForAge\(approved, age\)/);
 assert.match(kids,/byTitle\.get\(normalizeTitle\(r\.title\)\)/);
 assert.match(kids,/clearTimeout\(timer\)/);
});

test('new Ask AI code is cache-busted on desktop, phones, tablets and Android WebViews',()=>{
 const html=fs.readFileSync(path.join(root,'discover.html'),'utf8');
 const kidsHtml=fs.readFileSync(path.join(root,'kids/index.html'),'utf8');
 assert.match(html,/discover\.js\?v=20260925-intent1/);
 assert.match(kidsHtml,/kids\/kids\.js\?v=20260925-intent1/);
});
