const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(path.join(__dirname,'..','marquee-autoplay.js'),'utf8');
const build=fs.readFileSync(path.join(__dirname,'..','build-meta.js'),'utf8');

test('Top Titles uses one low-duty controller instead of competing 60 FPS drivers',()=>{
  assert.match(build,/marquee-autoplay\.js\?v=20260915c/);
  assert.match(source,/prefers-reduced-motion: reduce/);
  assert.doesNotMatch(source,/requestAnimationFrame\(frame\)/);
  assert.match(source,/Object\.defineProperty\(vp,'_paused'/,'legacy 16ms rail driver must be held paused');
  assert.match(source,/setTimeout\(step,900\)/,'automatic passing must run at a low duty cycle');
  assert.match(source,/pointerdown/);
  assert.match(source,/touchstart/);
});
