'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../supabase/functions/gemini-proxy/index.ts'),'utf8');
test('adult OpenRouter then Groq then OpenAI then Gemini; Kids retains Gemini key precedence',()=>{
  assert.match(source,/"OPENROUTER_API_KEY"/);
  assert.match(source,/"GEMINI_BACKUP_API_KEY_1"/);
  assert.match(source,/"GEMINI_BACKUP_API_KEY_2"/);
  const router=source.indexOf('const answer = await callOpenRouterFirst({');
  const groq=source.indexOf('const answer = await callGroqBackup({');
  const open=source.indexOf('const answer = await callOpenAIPrimary({');
  const routing=source.indexOf('const routes = [');
  assert.ok(router>=0&&groq>router&&open>groq&&routing>open);
  const fallback=source.slice(routing,source.indexOf('let freeProjectBlocked',routing));
  const free=fallback.indexOf('...(freeApiKey ? FREE_MODEL_CHAIN.map');
  const backup=fallback.indexOf('...backupPaidApiKeys.flatMap');
  const original=fallback.indexOf('...(paidApiKey ? MODEL_CHAIN.map');
  assert.ok(free>=0&&free<backup&&backup<original);
  assert.doesNotMatch(source,/TEMPORARY OWNER ROUTING/);
  assert.doesNotMatch(source,/if \(openAiEligible\) \{\s*return new Response/);
  assert.match(source,/const apiKey = freeApiKey \|\| backupPaidApiKeys\[0\] \|\| paidApiKey/);
});
test('project-wide quota and rejected paid key skip other models on that key',()=>{
  assert.match(source,/const blockedPaidKeys = new Set<string>\(\)/);
  assert.match(source,/if \(route\.tier === "paid" && blockedPaidKeys\.has\(route\.key\)\) continue/);
  assert.match(source,/if\(!projectWide\)continue;\s*blockedPaidKeys\.add\(route\.key\)/);
  assert.match(source,/geminiRes\.status === 402 \|\| geminiRes\.status === 401 \|\| geminiRes\.status === 403/);
  assert.match(source,/if \(backupPaidApiKeys\.length\) continue/);
  assert.doesNotMatch(source,/console\.(?:log|info|warn|error)\([^\n]*route\.key/);
});

test('each billing-failed paid key yields to a different configured paid project instead of aborting early',()=>{
  const failureBlock=source.slice(source.indexOf('// HTTP 402 is a BILLING failure'),source.indexOf('// Reject terminal errors without exposing upstream bodies or secrets.'));
  assert.ok(failureBlock.includes('blockedPaidKeys.add(route.key)'),'project-specific failure blocks only its own key');
  assert.ok(failureBlock.includes('const alternatePaidAvailable = routes.some(next => next.tier === "paid" && !blockedPaidKeys.has(next.key))'));
  assert.ok(failureBlock.includes('if (alternatePaidAvailable) continue;'));
  assert.ok(failureBlock.includes('geminiRes.status === 402'));
  assert.doesNotMatch(failureBlock,/console\.(?:warn|log|info|error)\([^\n]*route\.key/,'never log credential material');
});

test('OpenAI daily ceiling is independent; Gemini is available if preceding tiers fail',()=>{
  const router=source.indexOf('const answer = await callOpenRouterFirst({');
  const groq=source.indexOf('const answer = await callGroqBackup({');
  const primary=source.indexOf('const answer = await callOpenAIPrimary({');
  const route=source.indexOf('const routes = [');
  assert.ok(router>=0&&groq>router&&primary>groq&&route>primary);
  assert.match(source.slice(primary,route),/claim_openai_primary_slot/);
  assert.match(source.slice(primary,route),/if \(answer\) return answer/);
  assert.match(source,/body\?\.kidsMode !== true/);
});
