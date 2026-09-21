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
test('Kids experience has no decorative animation engine',()=>{
 const js=read('kids/kids.js'),css=read('kids/kids.css'),voice=read('kids/voice-feedback.js');
 assert.doesNotMatch(js,/playKidsCelebrate|requestAnimationFrame/);
 assert.doesNotMatch(voice,/@keyframes|animation\s*:|requestAnimationFrame/);
 assert.match(css,/animation:none!important;transition:none!important;scroll-behavior:auto!important/);
});
