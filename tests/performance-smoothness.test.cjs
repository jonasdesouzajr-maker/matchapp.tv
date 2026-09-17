const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const wiring=fs.readFileSync(path.join(root,'final-wiring.js'),'utf8');
const build=fs.readFileSync(path.join(root,'build-meta.js'),'utf8');
const home=fs.readFileSync(path.join(root,'index.html'),'utf8');
test('moving title rails avoid per-poster filter repaint without changing rail controller',()=>{
 assert.match(wiring,/marquee-track\.is-marquee-flowing \.marquee-item img/);
 assert.match(wiring,/animation:none!important;filter:none!important/);
 assert.match(build,/final-wiring\.js\?v=20260918-brandseo1/);
 assert.match(home,/build-meta\.js\?v=201/);
 const rail=fs.readFileSync(path.join(root,'marquee-autoplay.js'),'utf8');
 assert.doesNotMatch(rail,/IntersectionObserver/);
 assert.match(rail,/window\.marqueeNudge/);
});
