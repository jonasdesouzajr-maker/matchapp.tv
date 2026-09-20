const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('startup has no scroll polling, prototype monkey-patches or per-frame rail writers',()=>{
 const origin=read('page-origin.js'),build=read('build-meta.js'),app=read('app.js');
 assert.doesNotMatch(origin,/setInterval\(|Element\.prototype\.scrollIntoView|HTMLElement\.prototype\.focus/);
 assert.doesNotMatch(build,/Document\.prototype\.addEventListener|HOME STARTUP SCHEDULER/);
 assert.doesNotMatch(app,/requestAnimationFrame\([^\n]*scrollLeft/);
});
test('premium media motion is bounded and reduced on handhelds',()=>{
 const css=read('components.css'),runtime=read('premium-ui.js');
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/Handset\/tablet stability/);
 assert.doesNotMatch(runtime,/new MutationObserver/);
});
