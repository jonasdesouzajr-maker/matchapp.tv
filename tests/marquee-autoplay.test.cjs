const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Home rails use native scroll-snap and no dedicated perpetual autoplay engine',()=>{
 assert.equal(fs.existsSync(path.join(root,'marquee-autoplay.js')),false);
 assert.equal(fs.existsSync(path.join(root,'right-glide-rails.js')),false);
 const css=read('components.css'),app=read('app.js');
 assert.match(css,/scroll-snap-type:x mandatory/);
 assert.match(css,/min-width:44px/);
 assert.doesNotMatch(app,/requestAnimationFrame\([^\n]*scrollLeft/);
});
test('Kids celebration remains decorative and bounded',()=>{
 const js=read('kids/kids.js'),css=read('kids/kids.css');
 assert.match(js,/playKidsCelebrate/);assert.doesNotMatch(js,/await playKidsCelebrate\(\)/);
 assert.match(js,/setTimeout\(clearKidsCelebrate,900\)/);
 assert.match(css,/prefers-reduced-motion/);
});
