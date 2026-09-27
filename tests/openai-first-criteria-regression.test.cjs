const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const proxy=read('supabase/functions/gemini-proxy/index.ts');
const openai=read('supabase/functions/gemini-proxy/openai-primary.ts');
const sql=read('supabase/security/openai-primary-daily-gate.sql');
const app=read('app.js'),home=read('index.html');

test('OpenAI primary is eligible only for adult Ask AI or explicitly tagged adult match',()=>{
  assert.match(proxy,/import \{ callOpenAIPrimary \} from "\.\/openai-primary\.ts"/);
  assert.match(proxy,/const openAiEligible = body\?\.kidsMode !== true/);
  assert.match(proxy,/isDiscoverMode \|\| \(body\?\.adultMatch === true/);
  assert.match(app,/body: \{ prompt: promptText, adultMatch: true/);
  assert.match(openai,/store:false/);
  assert.match(openai,/model:OPENAI_MODEL/);
  assert.match(openai,/OPENAI_MODEL = "gpt-5\.6-luna"/);
  const primary=proxy.indexOf('const answer = await callOpenAIPrimary({');
  const gemini=proxy.indexOf('const routes = [',primary);
  assert(primary>0 && gemini>primary,'OpenAI must run before any Gemini request');
});

test('the distinct AI candidate-list schema is used end-to-end, never legacy one-title schema',()=>{
  assert.match(app,/fetchGeminiData\(prompt, true\)/);
  assert.match(app,/mode: 'match_proposals'/);
  assert.match(proxy,/isProposalMode = body\.mode === "match_proposals" && body\.adultMatch === true/);
  assert.match(proxy,/generationConfig: buildGenerationConfig\(isDiscoverMode,isProposalMode\)/);
  assert.match(proxy,/if \(isProposals\)/);
  assert.match(proxy,/required: \["title","year","kind"\]/);
  assert.match(openai,/mode==="match_proposals"\?proposals:legacy/);
  assert.match(openai,/kind:\{type:"string",enum:\["movie","tv"\]\}/);
  assert.match(app,/discoverVerifiedExactTMDB\(requested\)/);
  assert.match(app,/aiProposedVerifiedExact\(requested\)/);
});

test('provider failover is finite, guarded, reversible and cannot silently change Kids or ads',()=>{
  assert.match(openai,/OPENAI_TIMEOUT_MS = 16000/);
  assert.match(openai,/if\(!result\.ok\)/);
  assert.match(openai,/return null;/);
  assert.match(proxy,/if \(answer\) return answer;\s*\}\s*\/\/ The existing Gemini fallback/);
  assert.match(proxy,/FREE_MODEL_CHAIN\.map/);
  assert.match(proxy,/MODEL_CHAIN\.map/);
  assert.match(proxy,/OPENAI_DAILY_CALL_LIMIT/);
  assert.match(sql,/enable row level security/i);
  assert.match(sql,/revoke all on function public\.claim_openai_primary_slot\(integer\)/);
  assert.match(sql,/grant execute on function public\.claim_openai_primary_slot\(integer\) to service_role/);
  assert.match(openai,/!explicitXXX/);
  assert.match(openai,/!blockXXX/);
  assert.match(home,/app\.js\?v=20260927-openai-criteria1/);
  assert.doesNotMatch(home,/sk-[a-zA-Z0-9_-]{10,}/);
});
