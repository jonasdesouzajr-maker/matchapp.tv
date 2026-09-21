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
 const versions={'build-meta.js':'20260920-design4','matchapp-ia.js':'20260920-homebrand4','settings.js':'20260920-freeze8','app.js':'20260920-speed2','catalog-media.js':'20260920-freeze-final1','lazy.js':'20260920-design4'};
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
 assert.match(html,/\/poster-wall\.js\?v=20260921-wall3/);
 assert.match(html,/\/title-captions\.js\?v=20260921-ui2/);
 assert.match(html,/\/catalog-media\.js\?v=20260920-freeze-final1/);
 assert.match(html,/\/poster-wall\.css\?v=20260921-wall3/);
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
 assert.match(html,/\/matchapp-ia\.css\?v=20260921-ui2/);
 assert.match(html,/class="ma-brand-orb" src="\/assets\/brand\/matchapp-home-orb-transparent\.webp\?v=20260920-homebrand4"/);
 assert.doesNotMatch(css,/header-cosmic-8k\.svg/);
 assert.doesNotMatch(css,/#mh-topbox\.app-header\{\s*visibility:hidden!important;\s*opacity:0!important;/);
 assert.match(css,/2026-09-20 renderer root guard/);
 assert.match(css,/#mh-topbox\.ma-home-header \.ma-brand-orb\{[\s\S]*animation:none!important;[\s\S]*will-change:auto!important/);
 assert.match(css,/Home compositor stability guard/);
 assert.match(css,/\.lazy-head:has\(\+ #trending-rail\)\{display:none!important\}/);
 assert.match(ia,/const HOME_ICON='\/assets\/brand\/matchapp-home-orb-transparent\.webp\?v=20260920-homebrand4'/);
 assert.match(css,/backdrop-filter:none!important/);
});

test('Home poster wall stays lightweight, static and cache-busted',()=>{
 const wall=read('poster-wall.js'),html=read('index.html'),css=read('poster-wall.css');
 assert.match(wall,/if\(kids\(\)\|\|document\.querySelector\('\.poster-wall'\)\)return/);
 // Tiles fill in bounded batches rather than one decode-heavy burst.
 assert.match(wall,/const CHUNK=10;/);
 assert.match(wall,/requestIdleCallback\(fillChunk\)/);
 assert.match(wall,/cursor<posters\.length/);
 assert.match(html,/poster-wall\.js\?v=20260921-wall3/);
 assert.match(html,/poster-wall\.css\?v=20260921-wall3/);
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
 assert.match(lazy,/nextElementSibling[\s\S]*id!=='trending-rail'/);
 assert.match(css,/#trending-rail>h4\{display:none!important\}/);
 assert.match(app,/autoDelay = vp\.id === 'marquee-viewport' \? 1050 : 6500/);
 assert.match(news,/AUTO_FIRST_MS=700/);
 assert.match(news,/AUTO_MS=1050/);
 assert.doesNotMatch(read('index.html'),/data-i18n="marquee\.title"/);
 assert.match(read('index.html'),/id="trending-rail" aria-label="Latest titles trending right now"/);
});
test('2026-09-21 tilted collage fills every viewport and stays completely static',()=>{
 const css=read('poster-wall.css'),js=read('poster-wall.js');
 assert.match(css,/2026-09-21 tilted key-art collage — EVERY viewport/);
 // The 2026-09-20 renderer crash guard must survive the new pass.
 assert.match(css,/2026-09-20 renderer crash guard/);
 const pass=css.slice(css.indexOf('2026-09-21 tilted key-art collage'));
 // Static at every width: no motion, no promoted layers, no rasterising filters.
 assert.doesNotMatch(pass,/animation\s*:/);
 assert.doesNotMatch(pass,/will-change\s*:/);
 assert.doesNotMatch(pass,/backdrop-filter\s*:/);
 assert.doesNotMatch(pass,/filter\s*:/);
 // Pinned to the viewport, so one screenful of art covers every device.
 assert.match(pass,/html body\.page-home \.poster-wall\{[\s\S]*position:fixed!important/);
 // A real grid, tilted once on the container rather than per tile.
 assert.match(pass,/\.poster-wall-grid\{[\s\S]*display:grid!important/);
 assert.match(pass,/\.poster-wall-grid\{[\s\S]*transform:rotate\(-12deg\)!important/);
 // Every breakpoint gets its own column count; a desktop-only wall is a regression.
 for(const bp of ['@media(max-width:700px){','@media(min-width:701px) and (max-width:1099px){','@media(min-width:1100px){']){
  const block=pass.slice(pass.indexOf(bp));
  assert.ok(pass.includes(bp),'missing breakpoint '+bp);
  assert.match(block,/grid-template-columns:repeat\(\d+,minmax\(0,1fr\)\)!important/,'breakpoint '+bp+' must set a column count');
 }
 // Artwork is pooled from MatchApp's own reviewed catalogue and requested at
 // background renditions, never the rail's w500.
 assert.match(js,/data\/poster-identities\.json/);
 assert.match(js,/VERIFIED_POSTERS/);
 assert.match(js,/w154\//);
 assert.doesNotMatch(js,/w500\/|w780\//);
 // Tile count is sized to the screen instead of a fixed number.
 assert.match(js,/function tileTarget\(\)/);
 assert.match(js,/Math\.min\(cols\*rows,96\)/);
 // Kids is still never decorated, and the boot stays idle-deferred.
 assert.match(js,/if\(kids\(\)\|\|document\.querySelector\('\.poster-wall'\)\)return/);
 assert.doesNotMatch(js,/new MutationObserver|setInterval/);
});

test('2026-09-21 Home brand mark stays inside the top box on every viewport',()=>{
 const css=read('matchapp-ia.css');
 assert.match(css,/2026-09-21 Home logo containment fix/);
 const fix=css.slice(css.indexOf('2026-09-21 Home logo containment fix'),css.indexOf('2026-09-21 desktop cinematic landing polish'));
 // Anchored at the stage origin, because the transparent-logo guard forces
 // transform:none and the old left:50%/top:50% offsets had nothing to cancel them.
 assert.match(fix,/\.ma-brand-orb\{[\s\S]*left:0!important;[\s\S]*top:0!important/);
 // Must NOT be gated: the defect reaches handsets, tablets and both Android modules.
 assert.doesNotMatch(fix,/@media/);
 // The guard that caused it stays in place rather than being unpicked.
 assert.match(css,/Home transparent-logo guard/);
 assert.match(css,/transform:none!important/);
});

test('2026-09-21 auth-card glass is scoped to the modal and leaves the Home guards intact',()=>{
 const css=read('matchapp-ia.css'),html=read('index.html');
 assert.match(css,/2026-09-21 desktop cinematic landing polish/);
 // The Home compositor guard and the transparent-logo guard are preserved, not lifted.
 assert.match(css,/Home compositor stability guard/);
 assert.match(css,/Home transparent-logo guard/);
 assert.match(css,/html body\.page-home #mh-topbox\.ma-home-header \.ma-brand-orb\{[\s\S]*filter:none!important/);
 const pass=css.slice(css.indexOf('2026-09-21 desktop cinematic landing polish'));
 assert.match(pass,/@media\(min-width:1100px\)\{/);
 // backdrop-filter is re-enabled for the sign-in card and nothing else: walk
 // every rule in the pass and require that any blur belongs to #main-auth-modal.
 const rules=pass.match(/[^{}]+\{[^{}]*\}/g)||[];
 const blurred=rules.filter(r=>/backdrop-filter\s*:\s*blur/.test(r));
 assert.ok(blurred.length>0,'expected the sign-in card to declare backdrop-filter');
 for(const rule of blurred){
  const selector=rule.slice(0,rule.indexOf('{'));
  assert.match(selector,/#main-auth-modal/,'backdrop-filter escaped the sign-in card: '+selector.trim());
 }
 assert.match(pass,/html body\.page-home #main-auth-modal>\.premium-card\{[\s\S]*backdrop-filter:blur\(16px\)/);
 // The orb glow is painted by the stage, never by a filter on the image.
 assert.match(pass,/\.ma-brand-orb-stage::before/);
 assert.doesNotMatch(pass,/\.ma-brand-orb\{[^}]*filter:/);
 // Decorative lockup ships hidden so handsets render exactly as before.
 assert.match(html,/class="auth-brand" aria-hidden="true" style="display:none"/);
 assert.match(pass,/prefers-reduced-motion:reduce|reduce-motion/);
});

test('2026-09-21 rail covers always get a caption element created for them',()=>{
 const captions=read('title-captions.js');
 // The original pass only filled an existing .marquee-title, and the rail ships
 // image-only tiles, so no cover ever showed a title.
 assert.match(captions,/function captionFor\(tile\)/);
 assert.match(captions,/createElement\('span'\)[\s\S]*className='marquee-title'/);
 assert.match(captions,/const caption=captionFor\(tile\)/);
 assert.doesNotMatch(captions,/const caption=tile\.querySelector\('\.marquee-title'\)/);
 // Still inside the existing bounded pass: no observer, no polling.
 assert.doesNotMatch(captions,/MutationObserver|setInterval/);
});

test('2026-09-21 golden sheen is bounded and never animates the whole page',()=>{
 const js=read('gold-sheen.js'),css=read('matchapp-ia.css'),html=read('index.html');
 assert.match(html,/\/gold-sheen\.js\?v=20260921-ui2/);
 // Hard cap on simultaneously animated elements.
 assert.match(js,/LIVE_CAP\s*=\s*12\b/);
 assert.match(js,/live\.slice\(0,LIVE_CAP\)/);
 // Bounded observation only: no document-wide MutationObserver, no polling.
 assert.doesNotMatch(js,/new MutationObserver/);
 assert.doesNotMatch(js,/setInterval/);
 assert.match(js,/new IntersectionObserver/);
 // Nothing runs at all under either reduced-motion signal.
 assert.match(js,/prefers-reduced-motion: reduce/);
 assert.match(js,/reduce-motion/);
 assert.match(js,/if\(reduced\(\)\)return/);
 // Kids is never decorated by this runtime.
 assert.match(js,/kids-body/);
 // The ring itself is pure CSS, so it does not depend on the runtime reaching
 // an element; only the sweep is class-driven.
 assert.match(css,/\.ma-sheen-live::after\{[\s\S]*animation:maSheenSweep/);
 assert.match(css,/:is\(\.marquee-item,\.ma-news-card,[^)]*\)::after\{/);
 // And the sweep stops under both reduced-motion signals.
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{[\s\S]*\.ma-sheen-live::after\{animation:none!important\}/);
 assert.match(css,/html\.reduce-motion body\.page-home \.ma-sheen-live::after\{animation:none!important\}/);
});

test('2026-09-21 Home control bar keeps every control and packs it into rows',()=>{
 const css=read('matchapp-ia.css'),html=read('index.html');
 assert.match(css,/2026-09-21 Home top-box control bar/);
 // Every control the header shipped is still present in the markup.
 for(const id of ['nav-reg-btn','nav-logout-btn','profile-link-tab','quota-badge','lang-switcher-host']){
  assert.match(html,new RegExp('id="'+id+'"'),'control '+id+' must not be removed from the header');
 }
 // Packing is done with order and sizing, never by hiding a control.
 const bar=css.slice(css.indexOf('2026-09-21 Home top-box control bar'));
 assert.match(bar,/order:1!important/);
 assert.match(bar,/order:11!important/);
 assert.doesNotMatch(bar,/\.ma-kids-mode-entry\{display:none/);
 // The only thing allowed to disappear is the credits badge while it is empty.
 assert.match(css,/#quota-badge:empty\{display:none!important\}/);
});
