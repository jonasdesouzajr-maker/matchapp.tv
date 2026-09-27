'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../supabase/functions/gemini-proxy/index.ts'),'utf8');
test('only original paid Gemini key backs up adult OpenAI, while legacy/ Kids retain existing other keys',()=>{
  assert.match(source,/Deno\\.env\\.get\\(\"GEMINI_BACKUP_API_KEY_1\"\\)|\"GEMINI_BACKUP_API_KEY_1\"/);
  assert.match(source,/\"GEMINI_BACKUP_API_KEY_2\"/);
  const open=source.indexOf('const answer = await callOpenAIPrimary({');
  const routing=source.indexOf('const routes = openAiEligible');
  assert.ok(open>=0&&open<routing,'OpenAI must always get first attempt');
  const branch=source.slice(routing,source.indexOf('let freeProjectBlocked',routing));
  const [adult,legacy]=branch.split('      : [');
  assert.ok(adult.includes('? (paidApiKey ? MODEL_CHAIN.map'),'adult fallback uses ONLY original GEMINI_API_KEY');
  assert.doesNotMatch(adult,/freeApiKey|backupPaidApiKeys/,'unused Gemini keys must not serve adult AI');
  const free=legacy.indexOf('...(freeApiKey ? FREE_MODEL_CHAIN.map');
  const backup=legacy.indexOf('...backupPaidApiKeys.flatMap');
  const oldPaid=legacy.indexOf('...(paidApiKey ? MODEL_CHAIN.map');
  assert.ok(free>=0&&free<backup&&backup<oldPaid,'protected Kids/legacy chain unchanged');
  assert.match(source,/const apiKey = freeApiKey \\|\\| backupPaidApiKeys\\[0\\] \\|\\| paidApiKey/);
  assert.match(source,/\\.filter\\(\\(key, index, keys\\) => !!key && key !== freeApiKey && key !== paidApiKey && keys.indexOf\\(key\\) === index\\)/);
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

test('OpenAI daily reservation and original Gemini fallback preserve strict adult routing',()=>{
  const idx=source.indexOf('const routes = openAiEligible');
  const nearby=source.slice(Math.max(0,idx-1900),idx);
  assert.match(nearby,/claim_openai_primary_slot/);
  assert.match(nearby,/if \(answer\) return answer/);
  assert.match(source.slice(idx,idx+230),/paidApiKey \? MODEL_CHAIN\.map/);
  assert.doesNotMatch(source.slice(idx,idx+230),/backupPaidApiKeys|freeApiKey/);
  assert.match(source,/body\?\.kidsMode !== true/);
});
