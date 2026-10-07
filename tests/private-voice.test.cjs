const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('private voice stays private, compact and independent from public branding chrome',()=>{
  const html=read('private-voice/index.html');
  assert.match(html,/noindex,nofollow,noarchive,nosnippet,noimageindex/);
  assert.doesNotMatch(html,/matchapp-brand-bar|brand\.css/);
  assert.match(html,/width:min\(440px,100%\)/);
  assert.match(html,/Open in Chrome/);
  assert.match(html,/Sign in securely/);
  assert.match(html,/waitForIce/);
  assert.match(html,/10000/);
  assert.match(html,/private-voice-call/);
  const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length,'inline private voice script exists');
  assert.doesNotThrow(()=>new Function(scripts.at(-1)[1]));
});

test('brand normalizer deliberately excludes private voice',()=>{
  const src=read('tools/finalize-brand.js');
  assert.match(src,/rel\.startsWith\('private-voice\/'\)/);
});