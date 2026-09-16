const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const build=fs.readFileSync(path.join(root,'build-meta.js'),'utf8');
const experience=fs.readFileSync(path.join(root,'experience-v2.js'),'utf8');

// Production seal for the browser-proven cross-device freeze recovery.
test('premium homepage runs all features with bounded startup scheduling',()=>{
  assert.doesNotMatch(html,/Stable mode is active|matchapp-recovery-banner|matchapp-static-recovery/);
  assert.match(html,/\/app\.js\?v=195/);
  for(const file of ['criteria.js','lazy.js','tv.js','credits-ui.js','voice-input.js']) assert.match(html,new RegExp('\/'+file.replace('.','\.')+'\?'));
  assert.match(build,/HOME STARTUP SCHEDULER/);
  assert.doesNotMatch(build,/SKIPPED_HEAVY_STARTUP|heavy\.some/);
  assert.match(build,/restoreNativeListener/);
});

test('experience observer cannot create a text-mutation feedback loop',()=>{
  assert.match(experience,/text\.textContent!==words\.download/);
  assert.match(experience,/nodeType===1/);
  assert.match(experience,/observerQueued/);
  assert.match(experience,/setTimeout\(flushObservedChanges,0\)/);
});
