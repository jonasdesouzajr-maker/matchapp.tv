const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(path.join(__dirname,'..','marquee-autoplay.js'),'utf8');
const build=fs.readFileSync(path.join(__dirname,'..','build-meta.js'),'utf8');

test('Top Titles autoplay fallback is loaded on the homepage and does not treat touch screens as reduced motion',()=>{
  assert.match(build,/marquee-autoplay\.js\?v=20260915b/);
  assert.match(source,/prefers-reduced-motion: reduce/);
  assert.doesNotMatch(source,/max-width:\s*900px/);
  assert.doesNotMatch(source,/pointer:\s*coarse/);
  assert.match(source,/vp\.scrollLeft\+=speed\*dt/);
  assert.match(source,/moved<3/);
  assert.match(source,/pointerdown/);
  assert.match(source,/touchstart/);
});
