const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
test('weekly rail defines its label before use and keeps auto-swipe',()=>{
  const src=fs.readFileSync('trending-rail.js','utf8');
  const shown=src.indexOf('const shown=');
  const use=src.indexOf("setAttribute('aria-label',shown)");
  assert.ok(shown>0&&use>shown,'label is defined before it is used');
  assert.match(src,/vp\.scrollLeft\+=1\.1/);
  assert.match(src,/start\(document\.getElementById\('marquee-viewport'\)\)/);
  assert.match(src,/reduce-motion/);
});
