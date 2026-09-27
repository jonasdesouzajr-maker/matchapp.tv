'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
function boot(invoke){
 const win={supabaseClient:{functions:{invoke}}};
 const ctx=vm.createContext({window:win,Date,Math,Promise,JSON,setTimeout,clearTimeout});
 vm.runInContext(read('match-ai-rank.js'),ctx);
 return win;
}
const entries=[{title:'Verified A',format:'movie',genres:'comedy',mood:'funny'}, 
               {title:'Verified B',format:'movie',genres:'comedy',mood:'funny'}];
test('one matching title is selected locally without billing AI or changing its metadata',async()=>{
 let calls=0;
 const w=boot(async()=>{calls++;throw new Error('AI should not be called for one choice')});
 const item=await w.MatchAppAIRank.rank([entries[0]],{format:'movie'});
 assert.equal(item.title,entries[0].title);
 assert.equal(calls,0);
});
test('actual 429 cools down optional AI ranking without relaxing the eligible catalog',async()=>{
 let calls=0;
 const w=boot(async()=>{calls++;return{data:null,error:{context:{status:429}}}});
 const first=await w.MatchAppAIRank.rank(entries,{format:'movie'});
 assert.equal(first,null);
 assert.ok(w.__matchappAIDownUntil>Date.now());
 const second=await w.MatchAppAIRank.rank(entries,{format:'movie'});
 assert.equal(second,null);
 assert.equal(calls,1,'do not retry exhausted provider');
});
test('matching and Ask AI share only the real upstream quota cooldown, not an arbitrary no-result cache',()=>{
 const app=read('app.js'),chat=read('discover.js');
 assert.match(app,/async function fetchGeminiData\([\s\S]*?__matchappAIDownUntil/);
 assert.match(app,/if\(Number\(error\?\.context\?\.status\|\|data\?\.status\|\|0\)===429\)/);
 assert.match(chat,/if\(Date\.now\(\)<Number\(window\.__matchappAIDownUntil\|\|0\)\)/);
 assert.match(chat,/if\(status===429\)window\.__matchappAIDownUntil/);
 assert.match(chat,/await fallbackSearch\(question, !!e\.aiUnavailable\)/);
});
test('provider routes keep existing daily cost ceiling and protect conversational capacity',()=>{
 const proxy=read('supabase/functions/gemini-proxy/index.ts');
 const primary=read('supabase/functions/gemini-proxy/openai-primary.ts');
 assert.match(proxy,/OPENAI_DAILY_CALL_LIMIT/);
 assert.match(proxy,/Math\.min\(desiredLimit,200\)/);
 assert.match(proxy,/isRankMode \? Math\.max\(1,dailyLimit-Math\.min\(20,Math\.floor\(dailyLimit\*\.2\)\)\) : dailyLimit/);
 assert.match(proxy,/if\(geminiRes\.status>=500\)/);
 assert.match(proxy,/temporary model overload tier=/);
 assert.match(proxy,/project_spend_cap/);
 assert.doesNotMatch(proxy,/errBody\.slice\(0, 500\)/,'never log raw quota bodies');
 assert.match(primary,/OpenAI primary daily budget gate closed/);
});
