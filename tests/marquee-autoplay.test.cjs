const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(path.join(__dirname,'..','marquee-autoplay.js'),'utf8');
const build=fs.readFileSync(path.join(__dirname,'..','build-meta.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'..','urgent-fixes.css'),'utf8');

test('Top Titles uses compositor flow instead of competing scrollLeft drivers',()=>{
  assert.match(build,/marquee-autoplay\.js\?v=20260916-flow1/);
  assert.match(source,/prefers-reduced-motion: reduce/);
  assert.doesNotMatch(source,/requestAnimationFrame\s*\(/);
  assert.match(source,/Object\.defineProperty\(vp,'_paused'/,'legacy 16ms rail driver must be held paused');
  assert.match(source,/is-marquee-flowing/,'automatic passing is a CSS translate loop');
  assert.match(css,/@keyframes marqueeFlow/);
  assert.doesNotMatch(source,/setTimeout\(step,900\)/);
  assert.match(source,/pointerdown/);
  assert.match(source,/touchstart/);
});
