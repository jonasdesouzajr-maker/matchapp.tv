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
 const versions={'build-meta.js':'20260920-freeze6','settings.js':'20260920-freeze8','catalog-media.js':'20260920-crash4'};
 for(const file of ['page-origin.js','build-meta.js','matchapp-ia.js','settings.js','app.js','catalog-media.js','title-experience.js','lazy.js','app-updates.js']){
  const version=versions[file]||'20260920-freeze2';
  assert.match(html,new RegExp('/'+file.replace('.','\\.')+'\\?v='+version));
 }
 assert.match(settings,/if\(!isHome\)js\('\/experience-v2\.js'\)/);
 assert.match(wiring,/if\(!isHome\)\{js\('\/install-corner\.js'\);js\('\/install-device-choice\.js'\);\}/);
 assert.match(wiring,/IntersectionObserver/);
});


test('Home noncritical enrichment is staggered instead of timing out together',()=>{
 const html=read('index.html'),poster=read('poster-wall.js'),captions=read('title-captions.js'),media=read('catalog-media.js');
 assert.match(html,/\/poster-wall\.js\?v=20260920-homeoff1/);
 assert.match(html,/\/title-captions\.js\?v=20260920-crash4/);
 assert.match(html,/\/catalog-media\.js\?v=20260920-crash4/);
 assert.match(html,/\/poster-wall\.css\?v=20260920-crash4/);
 assert.match(poster,/setTimeout\(\(\)=>\{[\s\S]*requestIdleCallback\(run\)[\s\S]*\},900\)/);
 assert.match(captions,/setTimeout\(\(\)=>\{[\s\S]*requestIdleCallback\(\(\)=>paint\(\)\)[\s\S]*\},2200\)/);
 assert.match(captions,/requestIdleCallback\(loadAudit\)[\s\S]*\},5200\)/);
 assert.match(media,/requestIdleCallback\(later\)[\s\S]*\},3600\)/);
});

test('poster wall cannot promote dozens of animated compositor layers',()=>{
 const css=read('poster-wall.css');
 assert.match(css,/2026-09-20 renderer crash guard/);
 assert.match(css,/\.poster-wall-grid,[\s\S]*\.poster-wall-tile,[\s\S]*\.poster-wall::before\{[\s\S]*animation:none!important;[\s\S]*will-change:auto!important/);
});


test('Home header is visible without JavaScript and avoids filtered 8K SVGs',()=>{
 const html=read('index.html'),css=read('matchapp-ia.css');
 assert.match(html,/\/matchapp-ia\.css\?v=20260920-stability6/);
 assert.match(html,/class="ma-brand-orb" src="\/assets\/brand\/matchapp-official-icon-512\.webp\?v=20260920-official1"/);
 assert.doesNotMatch(css,/header-cosmic-8k\.svg/);
 assert.doesNotMatch(css,/#mh-topbox\.app-header\{\s*visibility:hidden!important;\s*opacity:0!important;/);
 assert.match(css,/2026-09-20 renderer root guard/);
 assert.match(css,/#mh-topbox\.ma-home-header \.ma-brand-orb\{[\s\S]*animation:none!important;[\s\S]*will-change:auto!important/);
 assert.match(css,/Home compositor stability guard/);
 assert.match(css,/backdrop-filter:none!important/);
});

test('Home never constructs the decorative fixed poster wall',()=>{
 const wall=read('poster-wall.js'),html=read('index.html');
 assert.match(wall,/function home\(\).*location\.pathname==='\/'/s);
 assert.match(wall,/if\(home\(\)\|\|kids\(\)\|\|document\.querySelector\('\.poster-wall'\)\)return/);
 assert.match(html,/poster-wall\.js\?v=20260920-homeoff1/);
});
