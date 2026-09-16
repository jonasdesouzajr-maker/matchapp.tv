const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const build=fs.readFileSync(path.join(root,'build-meta.js'),'utf8');

test('premium homepage is live without static recovery mode',()=>{
  assert.doesNotMatch(html,/Stable mode is active|matchapp-recovery-banner|matchapp-static-recovery/);
  assert.match(html,/\/app\.js\?v=193/);
  for(const file of ['criteria.js','lazy.js','tv.js','credits-ui.js','voice-input.js']) assert.match(html,new RegExp('\/'+file.replace('.','\.')+'\?'));
  assert.match(html,/GTM-M7J3NNBN/);
  assert.match(html,/ca-pub-9541435081010948/);
});

test('homepage startup gate targets only app.js DOMContentLoaded work',()=>{
  assert.match(build,/HOME STARTUP STABILITY GATE/);
  assert.match(build,/document\.currentScript/);
  assert.match(build,/app\\.js/);
  assert.match(build,/hydrateMarqueeCovers/);
  assert.match(build,/initLiveStrip/);
  assert.match(build,/slot\+\+/);
});
