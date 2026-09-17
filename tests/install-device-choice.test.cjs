const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('mobile install chooser keeps existing install engine and separates app from shortcut guidance',()=>{
  const src=read('install-device-choice.js');
  const wiring=read('final-wiring.js');
  assert.match(wiring,/js\('\/install-device-choice\.js'\)/);
  assert.match(src,/Add to phone/);
  assert.match(src,/Add to tablet/);
  assert.match(src,/Install MatchApp Ai/);
  assert.match(src,/Create shortcut/);
  assert.match(src,/window\.installMatchApp\?\.\(\)/);
  assert.match(src,/stopImmediatePropagation/);
  assert.match(src,/isTablet/);
  assert.match(src,/pointerdown/);
  assert.match(src,/prefers-reduced-motion/);
  assert.match(src,/install_device_choice/);
  assert.doesNotMatch(src,/Play Protect/);
});
