const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

test('homepage emergency recovery is static and cannot start a JS freeze loop',()=>{
  assert.match(html,/id="matchapp-static-recovery"/);
  assert.match(html,/id="matchapp-recovery-banner"/);
  assert.match(html,/href="\/discover\.html"/);
  const executable=[...html.matchAll(/<script\b([^>]*)>/gi)].filter(m=>!/type=["']application\/ld\+json["']/i.test(m[1]));
  assert.equal(executable.length,0,'homepage must contain zero executable script elements during emergency recovery');
  assert.doesNotMatch(html,/\/app\.js/);
  assert.doesNotMatch(html,/googletagmanager|adsbygoogle\.js|supabase-js/i);
  assert.doesNotMatch(html,/\sautoplay(?:\s|>)/i);
  assert.match(html,/content-visibility:auto/);
});
