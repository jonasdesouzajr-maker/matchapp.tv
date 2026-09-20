const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('startup has no scroll polling, prototype monkey-patches or per-frame rail writers',()=>{
 const origin=read('page-origin.js'),build=read('build-meta.js'),app=read('app.js');
 assert.doesNotMatch(origin,/setInterval\(|Element\.prototype\.scrollIntoView|HTMLElement\.prototype\.focus|DOMContentLoaded|pageshow|requestAnimationFrame\(top\)/);
 assert.doesNotMatch(build,/Document\.prototype\.addEventListener|HOME STARTUP SCHEDULER/);
 assert.doesNotMatch(app,/requestAnimationFrame\([^\n]*scrollLeft/);
});
test('premium media motion is bounded and reduced on handhelds',()=>{
 const css=read('components.css'),runtime=read('premium-ui.js');
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/Handset\/tablet stability/);
 assert.doesNotMatch(runtime,/new MutationObserver/);
});

test('Home startup avoids delayed boot locks, stale cache keys and duplicate header owners',()=>{
 const html=read('index.html'),settings=read('settings.js'),wiring=read('final-wiring.js');
 assert.doesNotMatch(html,/ma-ui-preparing|MATCHAPP_UI_FAILSAFE/);
 for(const file of ['page-origin.js','build-meta.js','matchapp-ia.js','settings.js','app.js','catalog-media.js','title-experience.js','lazy.js','app-updates.js']){
  assert.match(html,new RegExp('/'+file.replace('.','\\.')+'\\?v=20260920-freeze2'));
 }
 assert.match(settings,/if\(!isHome\)js\('\/experience-v2\.js'\)/);
 assert.match(wiring,/if\(!isHome\)\{js\('\/install-corner\.js'\);js\('\/install-device-choice\.js'\);\}/);
 assert.match(wiring,/IntersectionObserver/);
});
