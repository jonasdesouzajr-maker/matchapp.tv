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
 const versions={'build-meta.js':'20260920-design4','matchapp-ia.js':'20260920-homebrand2','settings.js':'20260920-freeze8','app.js':'20260920-design4','catalog-media.js':'20260920-freeze-final1','lazy.js':'20260920-design2'};
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
 assert.match(html,/\/poster-wall\.js\?v=20260920-home9/);
 assert.match(html,/\/title-captions\.js\?v=20260920-crash4/);
 assert.match(html,/\/catalog-media\.js\?v=20260920-freeze-final1/);
 assert.match(html,/\/poster-wall\.css\?v=20260920-design4/);
 assert.match(poster,/setTimeout\(\(\)=>\{[\s\S]*requestIdleCallback\(run\)[\s\S]*\},900\)/);
 assert.match(captions,/setTimeout\(\(\)=>\{[\s\S]*requestIdleCallback\(\(\)=>paint\(\)\)[\s\S]*\},2200\)/);
 assert.match(captions,/requestIdleCallback\(loadAudit\)[\s\S]*\},5200\)/);
 assert.match(media,/TRENDING_CONCURRENCY=2/);
 assert.match(media,/IntersectionObserver[\s\S]*rootMargin:'0px'/);
});

test('poster wall cannot promote dozens of animated compositor layers',()=>{
 const css=read('poster-wall.css');
 assert.match(css,/2026-09-20 renderer crash guard/);
 assert.match(css,/\.poster-wall-grid,[\s\S]*\.poster-wall-tile,[\s\S]*\.poster-wall::before\{[\s\S]*animation:none!important;[\s\S]*will-change:auto!important/);
});


test('Home header is visible without JavaScript and avoids filtered 8K SVGs',()=>{
 const html=read('index.html'),css=read('matchapp-ia.css'),ia=read('matchapp-ia.js');
 assert.match(html,/\/matchapp-ia\.css\?v=20260920-design4/);
 assert.match(html,/class="ma-brand-orb" src="\/assets\/brand\/matchapp-home-orb-transparent\.webp\?v=20260920-homebrand2"/);
 assert.doesNotMatch(css,/header-cosmic-8k\.svg/);
 assert.doesNotMatch(css,/#mh-topbox\.app-header\{\s*visibility:hidden!important;\s*opacity:0!important;/);
 assert.match(css,/2026-09-20 renderer root guard/);
 assert.match(css,/#mh-topbox\.ma-home-header \.ma-brand-orb\{[\s\S]*animation:none!important;[\s\S]*will-change:auto!important/);
 assert.match(css,/Home compositor stability guard/);
 assert.match(css,/\.lazy-head:has\(\+ #trending-rail\)\{display:none!important\}/);
 assert.match(ia,/const HOME_ICON='\/assets\/brand\/matchapp-home-orb-transparent\.webp\?v=20260920-homebrand2'/);
 assert.match(css,/backdrop-filter:none!important/);
});

test('Home poster wall stays lightweight, static and cache-busted',()=>{
 const wall=read('poster-wall.js'),html=read('index.html'),css=read('poster-wall.css');
 assert.match(wall,/if\(kids\(\)\|\|document\.querySelector\('\.poster-wall'\)\)return/);
 assert.match(wall,/for\(let i=0;i<posters\.length;i\+\+\)/);
 assert.match(html,/poster-wall\.js\?v=20260920-home9/);
 assert.match(html,/poster-wall\.css\?v=20260920-design4/);
 assert.match(css,/Home poster-wall restore/);
 assert.match(css,/2026-09-20 scattered static poster background/);
 assert.match(css,/final scattered-cover visibility pass/);
 assert.match(css,/\.poster-wall-tile\{[\s\S]*position:absolute!important/);
 assert.match(css,/\.poster-wall-tile:nth-child\(16\)/);
 assert.match(css,/@media\(max-width:700px\)/);
});

test('Home never rewrites viewport scale from visualViewport resize',()=>{
 const html=read('index.html');
 assert.doesNotMatch(html,/id="mh-pinch"/);
 assert.doesNotMatch(html,/visualViewport[\s\S]{0,900}maximum-scale=1/);
});

test('catalog-media main result does not observe its own render subtree',()=>{
 const media=read('catalog-media.js');
 assert.doesNotMatch(media,/observeSurface\(result,enrichMain\)/);
 assert.match(media,/resultRoot\.style\.display==='none'/);
 assert.match(media,/title==='Title'/);
 assert.match(media,/document\.addEventListener\('matchapp:newmatch',[\s\S]*enrichMain\(\)/);
});


test('Home top box cannot run continuous compositor animation or scroll-anchor during DOM rehome',()=>{
 const css=read('matchapp-ia.css'),ia=read('matchapp-ia.js');
 assert.match(css,/Home top-box final freeze guard/);
 assert.match(css,/#mh-topbox :is\(\.ma-brand-orb,\.ma-ai-letters,\.ma-ai-star\)[\s\S]*animation:none!important;[\s\S]*will-change:auto!important/);
 assert.match(css,/#mh-topbox \.ma-ai-brand-button::before,[\s\S]*#mh-topbox \.ma-ai-brand-button::after\{[\s\S]*filter:none!important/);
 assert.match(ia,/root\.style\.overflowAnchor='none'/);
 assert.match(ia,/root\.style\.removeProperty\('overflow-anchor'\)/);
});

test('Home defers cross-origin Spotify players until the section is near view',()=>{
 const lazy=read('lazy.js');
 assert.match(lazy,/function hydrateSwift\(section\)/);
 assert.match(lazy,/function armSwiftHydration\(section\)/);
 assert.match(lazy,/IntersectionObserver[\s\S]*rootMargin:'120px 0px'/);
 assert.doesNotMatch(lazy,/if\(open\)body\.querySelectorAll\('iframe\[data-src\]'\)/);
});

test('Home editorial scripts do not preload hundreds of pixels before view',()=>{
 const wiring=read('final-wiring.js'),meta=read('build-meta.js');
 assert.match(wiring,/rootMargin:'0px'/);
 assert.doesNotMatch(wiring,/rootMargin:'700px 0px'/);
 assert.match(meta,/final-wiring\.js\?v=20260920-design4/);
});


test('Home removes the nonfunctional trending fold bar and keeps autoplay bounded',()=>{
 const lazy=read('lazy.js'),app=read('app.js'),news=read('latest-news.js'),css=read('matchapp-ia.css');
 assert.doesNotMatch(lazy,/key:'trending'/);
 assert.match(lazy,/RETIRED_GENERIC_KEYS=new Set\(\[[^\]]*'trending'/);
 assert.match(css,/#trending-rail>h4\{display:none!important\}/);
 assert.match(app,/autoDelay = vp\.id === 'marquee-viewport' \? 1800 : 6500/);
 assert.match(news,/AUTO_FIRST_MS=1100/);
 assert.match(news,/AUTO_MS=1800/);
});