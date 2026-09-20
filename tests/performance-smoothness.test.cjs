const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('rail motion avoids deleted competing autoplay engines',()=>{
 assert.equal(fs.existsSync(path.join(root,'marquee-autoplay.js')),false);
 assert.equal(fs.existsSync(path.join(root,'right-glide-rails.js')),false);
 const components=read('components.css'),app=read('app.js');
 assert.match(components,/scroll-snap-type:x mandatory/);
 assert.doesNotMatch(app,/requestAnimationFrame\([^\n]*scrollLeft/);
});
test('premium runtime uses bounded observers rather than document mutation loops',()=>{
 const runtime=read('premium-ui.js');
 assert.match(runtime,/IntersectionObserver/);
 assert.doesNotMatch(runtime,/new MutationObserver/);
});
