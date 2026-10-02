const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Top Titles uses one compositor-only seamless flow without per-frame scroll writes',()=>{
 assert.equal(fs.existsSync(path.join(root,'marquee-autoplay.js')),false);
 assert.equal(fs.existsSync(path.join(root,'right-glide-rails.js')),false);
 const base=read('components.css'),home=read('index.html'),app=read('app.js');
 assert.match(base,/min-width:44px/);
 assert.match(home,/@keyframes marqueeFlow/);
 assert.match(home,/#marquee-viewport\[data-matchapp-autoplay-active="1"\]/);
 assert.match(app,/FLOW_SECONDS_PER_TITLE = 6/);
 assert.match(app,/firstClone\.offsetLeft - track\.offsetLeft/);
 assert.doesNotMatch(app,/requestAnimationFrame\([^\n]*scrollLeft/);
});
test('Kids experience has no decorative animation engine',()=>{
 const js=read('kids/kids.js'),css=read('kids/kids.css'),voice=read('kids/voice-feedback.js');
 assert.doesNotMatch(js,/playKidsCelebrate|requestAnimationFrame/);
 assert.doesNotMatch(voice,/@keyframes|animation\s*:|requestAnimationFrame/);
 assert.match(css,/animation:none!important;transition:none!important;scroll-behavior:auto!important/);
});
