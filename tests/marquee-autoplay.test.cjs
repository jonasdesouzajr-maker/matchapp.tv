const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('path');

const source=fs.readFileSync(path.join(__dirname,'..','marquee-autoplay.js'),'utf8');
const build=fs.readFileSync(path.join(__dirname,'..','build-meta.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'..','urgent-fixes.css'),'utf8');
const kidsJs=fs.readFileSync(path.join(__dirname,'..','kids/kids.js'),'utf8');
const kidsCss=fs.readFileSync(path.join(__dirname,'..','kids/kids.css'),'utf8');

test('Top Titles auto-swipes until a poster is pointed at',()=>{
  assert.match(build,/marquee-autoplay\.js\?v=20260916-flow2/);
  assert.match(source,/prefers-reduced-motion: reduce/);
  assert.doesNotMatch(source,/requestAnimationFrame\s*\(/);
  assert.match(source,/Object\.defineProperty\(vp,'_paused'/,'legacy 16ms rail driver must be held paused');
  assert.match(source,/is-marquee-flowing/,'automatic passing is a CSS translate loop');
  assert.match(source,/pauseOn/,'pointing at a title freezes the strip');
  assert.match(source,/pointerleave/,'leaving a title resumes the glide');
  assert.doesNotMatch(source,/wrap\.addEventListener\('mouseenter'/,'the heading must not freeze the strip');
  assert.doesNotMatch(source,/\(hover: hover\) and \(min-width: 761px\)/);
  assert.match(css,/@keyframes marqueeFlow/);
  assert.match(css,/:has\(\.marquee-item:hover\)/);
  assert.doesNotMatch(css,/\.marquee-wrapper:hover \.is-marquee-flowing/);
  assert.doesNotMatch(css,/@media \(max-width: 760px\), \(pointer: coarse\)/);
  assert.doesNotMatch(source,/setTimeout\(step,900\)/);
});

test('Kids match celebrates with confetti and popping balloons before the result',()=>{
  assert.match(kidsJs,/playKidsCelebrate/);
  assert.match(kidsJs,/await playKidsCelebrate\(\)/);
  assert.match(kidsJs,/kids-balloon/);
  assert.match(kidsJs,/kids-confetti/);
  assert.match(kidsJs,/if\(reducedMotion\(\)\)\{resolve\(\);return;\}/);
  assert.match(kidsCss,/@keyframes kidsConfetti/);
  assert.match(kidsCss,/@keyframes kidsBalloonUp/);
  assert.match(kidsCss,/@keyframes kidsBalloonPop/);
  assert.match(kidsCss,/\.kids-celebrate\.is-popping/);
});
