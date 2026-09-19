const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const ambient=fs.readFileSync(path.join(root,'ambient.js'),'utf8');
const marquee=fs.readFileSync(path.join(root,'marquee-autoplay.js'),'utf8');

test('startup visuals do not run full-screen animation-frame loops',()=>{
  assert.doesNotMatch(ambient,/requestAnimationFrame\s*\(/,'ambient background must not schedule a continuous frame loop');
  assert.match(ambient,/1920\/cssW/,'ambient backing store must be resolution-capped');
  assert.match(ambient,/1080\/cssH/,'ambient backing store must be resolution-capped');
  assert.match(marquee,/if\(coarse\)\{/,'mobile path must be explicit');
  const mobile=marquee.slice(marquee.indexOf('if(coarse){'),marquee.indexOf("vp.style.overscrollBehaviorX='contain';"));
  assert.doesNotMatch(mobile,/requestAnimationFrame\(/,'mobile rails must not run a continuous frame loop');
  assert.match(mobile,/touchAction='pan-x pan-y'/,'mobile rails remain directly swipeable');
  assert.match(marquee,/Object\.defineProperty\(vp,'_paused'/,'legacy high-frequency rail must be held paused');
  assert.match(marquee,/is-marquee-flowing/,'desktop Top Titles must glide on the compositor');
});
