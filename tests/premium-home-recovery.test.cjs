const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('premium Home keeps required product scripts without startup monkey-patching',()=>{
 const html=read('index.html'),build=read('build-meta.js');
 for(const file of ['app.js','criteria.js','lazy.js','tv.js','credits-ui.js','voice-input.js']) assert.match(html,new RegExp('/'+file.replace('.','\\.')+'\\?'));
 assert.doesNotMatch(build,/Document\.prototype\.addEventListener|HOME STARTUP SCHEDULER/);
});
test('premium runtime does not install a document-wide MutationObserver',()=>{assert.doesNotMatch(read('premium-ui.js'),/new MutationObserver/);});

test('Home keeps premium CSS but does not run the redundant premium presentation runtime',()=>{
 const settings=read('settings.js');
 assert.match(settings,/if\(!isKids\)\{css\('\/tokens\.css'\);css\('\/components\.css'\);if\(!isHome\)js\('\/premium-ui\.js'\)\}/);
});
