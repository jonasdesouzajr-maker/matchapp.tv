const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const src=fs.readFileSync(path.join(__dirname,'../supabase/functions/support-agent/index.ts'),'utf8');
const cfg=fs.readFileSync(path.join(__dirname,'../supabase/config.toml'),'utf8');

test('support agent is webhook-authenticated and safety-bounded',()=>{
  assert.match(src,/svix-signature/);
  assert.match(src,/x-hub-signature-256/);
  assert.match(src,/NEVER ask for or expose passwords, one-time codes/);
  assert.match(src,/needs_human=true/);
  assert.match(src,/support_escalations|support_update_thread/);
  assert.match(src,/npm:resend@6\.32\.0/);
  assert.match(src,/META_GRAPH_VERSION="v26\.0"/);
  assert.doesNotMatch(src,/Access-Control-Allow-Origin\s*:\s*["']\*["']/);
});

test('support webhook bypasses legacy JWT gateway only because it authenticates providers itself',()=>{
  assert.match(cfg,/\[functions\.support-agent\][\s\S]*?verify_jwt\s*=\s*false/);
});
