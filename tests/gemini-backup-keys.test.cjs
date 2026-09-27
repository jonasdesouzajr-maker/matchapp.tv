'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../supabase/functions/gemini-proxy/index.ts'),'utf8');
test('Gemini backups remain optional server secrets and OpenAI stays primary',()=>{
  assert.match(source,/Deno\.env\.get\("GEMINI_BACKUP_API_KEY_1"\)|"GEMINI_BACKUP_API_KEY_1"/);
  assert.match(source,/"GEMINI_BACKUP_API_KEY_2"/);
  assert.ok(source.indexOf('callOpenAIPrimary({')<source.indexOf('const routes = ['),'do not change OpenAI-first priority');
  assert.match(source,/\.\.\.\(paidApiKey \? MODEL_CHAIN\.map[\s\S]*\.\.\.backupPaidApiKeys\.flatMap/);
  assert.match(source,/\.filter\(\(key, index, keys\) => !!key && key !== freeApiKey && key !== paidApiKey && keys.indexOf\(key\) === index\)/);
});
test('project-wide quota and rejected paid key skip other models on that key',()=>{
  assert.match(source,/const blockedPaidKeys = new Set<string>\(\)/);
  assert.match(source,/if \(route\.tier === "paid" && blockedPaidKeys\.has\(route\.key\)\) continue/);
  assert.match(source,/if\(!projectWide\)continue;\s*blockedPaidKeys\.add\(route\.key\)/);
  assert.match(source,/\(geminiRes\.status === 401 \|\| geminiRes\.status === 403\)/);
  assert.match(source,/if \(backupPaidApiKeys\.length\) continue/);
  assert.doesNotMatch(source,/console\.(?:log|info|warn|error)\([^\n]*route\.key/);
});
