const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Home startup no longer monkey-patches document listeners or polls scroll position',()=>{
 const build=read('build-meta.js'),origin=read('page-origin.js');
 assert.doesNotMatch(build,/Document\.prototype\.addEventListener|HOME STARTUP SCHEDULER/);
 assert.match(origin,/scrollRestoration='manual'/);
 assert.doesNotMatch(origin,/setInterval\(|Element\.prototype\.scrollIntoView|HTMLElement\.prototype\.focus/);
});
test('non-Home fluidity layer remains scoped away from Home',()=>{
 const settings=read('settings.js');
 assert.match(settings,/if\(!isHome\)js\('\/page-fluidity\.js'\)/);
 assert.match(settings,/if\(!isHome\).*page-fluidity\.css/);
});
test('reduced-motion remains supported',()=>{assert.match(read('components.css'),/prefers-reduced-motion:reduce/);});
